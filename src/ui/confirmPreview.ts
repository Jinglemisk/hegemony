import { currentVoteWeight } from "../game/assembly";
import { capitalize } from "../game/core/format";
import { POP_TYPES } from "../game/core/pops";
import { realmPops } from "../game/core/query";
import type { EconomyPreview } from "../game/economy/preview";
import { happinessLevel, standingHappiness } from "../game/happiness";
import { transition, type GameCommand } from "../game/legalMoves";
import { tradePreview } from "../game/trade";
import { unrestOutcome } from "../game/unrest";
import type { HegemonyState, PlayerId, Resources, TradeBundle } from "../game/types";
import { formatPopLabel, RESOURCE_LABELS, formatSignedNumber } from "./formatters";
import { POP_RASTERS, RESOURCE_RASTERS } from "./iconRegistry";
import { RESOURCE_ORDER } from "./resourceVisuals";

/*
 * What a confirm bar says a spend does, read off the engine. `ConfirmDetail`
 * (components/chrome/confirmDetail.tsx) prints it in the one format.
 */

/** One "Label x → y" of a confirm's detail line; y is a `Delta`, green if it helps. */
export type ConfirmChange = {
  label: string;
  from: number;
  to: number;
  higherIsBetter?: boolean;
  format?: (n: number) => string;
  /** An `Ico` path, where a line is drawn with icons (a trade card's foot). */
  icon?: string;
};

/** What the confirm reads off the engine for a spend: each changed store, happiness when
 *  it moves, and a warning when it crosses the Riot or Revolt line. */
export type SpendPreview = { changes: ConfirmChange[]; warn: string | null };

const TIER_WORDS = {
  riot: "This takes you to the Riot line: a Riot starts when your turn ends",
  revolt: "This takes you to the Revolt line: a Revolt starts when your turn ends",
} as const;

/** The happiness line and, when the move crosses the Riot or Revolt line, its warning. */
function happinessChange(
  G: HegemonyState,
  seat: PlayerId,
  level: number,
  then: number,
): SpendPreview {
  if (then === level) return { changes: [], warn: null };
  const was = unrestOutcome(G, seat, level).tier;
  const now = unrestOutcome(G, seat, then).tier;
  return {
    changes: [
      {
        label: "Happiness",
        from: level,
        to: then,
        format: formatSignedNumber,
        icon: RESOURCE_RASTERS.happiness,
      },
    ],
    warn: now !== "none" && now !== was ? TIER_WORDS[now] : null,
  };
}

/**
 * The engine playing `commands` in order on a copy (`transition`): the state after, or
 * null when it refuses one. Only for commands whose result is known before they run,
 * never a draw from a deck: a copy would turn the card.
 */
export function playOnCopy(
  G: HegemonyState,
  viewerId: PlayerId,
  commands: readonly GameCommand[],
): HegemonyState | null {
  let state = G;
  for (const command of commands) {
    try {
      const result = transition(G.definition, state, viewerId, command);
      if (!result.ok) return null;
      state = result.state;
    } catch {
      return null;
    }
  }
  return state;
}

/**
 * The spend as the engine plays it on a copy ({@link playOnCopy}). Without a command,
 * or when the copy refuses it, the store less `cost` plus `gets`.
 */
export function previewSpend(
  G: HegemonyState,
  viewerId: PlayerId,
  {
    command,
    cost = {},
    gets = {},
  }: {
    command?: GameCommand | readonly GameCommand[];
    cost?: Partial<Resources>;
    gets?: Partial<Resources>;
  },
): SpendPreview {
  const before = G.players[viewerId].resources;
  const commands = command === undefined ? [] : Array.isArray(command) ? command : [command];
  const after = commands.length ? playOnCopy(G, viewerId, commands as GameCommand[]) : null;
  const store = after
    ? after.players[viewerId].resources
    : Object.fromEntries(
        RESOURCE_ORDER.map((r) => [r, before[r] - (cost[r] ?? 0) + (gets[r] ?? 0)]),
      );
  const changes: ConfirmChange[] = RESOURCE_ORDER.filter(
    (r) => store[r] !== before[r] || (cost[r] ?? 0) > 0,
  ).map((r) => ({ label: RESOURCE_LABELS[r], from: before[r], to: store[r] ?? before[r] }));
  if (!after) return { changes, warn: null };
  // A pop promoted or demoted moves the seat's votes.
  const votes = currentVoteWeight(G, viewerId);
  const votesAfter = currentVoteWeight(after, viewerId);
  if (votesAfter !== votes) changes.push({ label: "Votes", from: votes, to: votesAfter });
  const mood = happinessChange(
    G,
    viewerId,
    happinessLevel(G, viewerId),
    happinessLevel(after, viewerId),
  );
  return { changes: [...changes, ...mood.changes], warn: mood.warn };
}

/**
 * What a trade leaves `seat` holding, giving `gives` and getting `gets`: each changed
 * store and happiness as the engine previews it (`tradePreview`), the pops by class and
 * the held cards the terms move, and the line warning.
 */
export function previewTrade(
  G: HegemonyState,
  seat: PlayerId,
  gives: TradeBundle,
  gets: TradeBundle,
): SpendPreview {
  const before = G.players[seat].resources;
  const after = tradePreview(G, seat, gives, gets);
  const changes: ConfirmChange[] = RESOURCE_ORDER.filter(
    (r) => after.resources[r] !== before[r],
  ).map((r) => ({
    label: RESOURCE_LABELS[r],
    from: before[r],
    to: after.resources[r],
    icon: RESOURCE_RASTERS[r],
  }));
  const pops = realmPops(G, seat);
  for (const pop of POP_TYPES) {
    const moved = gets.pops[pop] - gives.pops[pop];
    if (moved !== 0)
      changes.push({
        label: capitalize(formatPopLabel(pop, 2)),
        from: pops[pop],
        to: pops[pop] + moved,
        icon: POP_RASTERS[pop],
      });
  }
  const held = G.devHands[seat]?.length ?? 0;
  if (gets.cards !== gives.cards)
    changes.push({
      label: "Cards",
      from: held,
      to: held + gets.cards - gives.cards,
      icon: "events/convoy",
    });
  const mood = happinessChange(G, seat, standingHappiness(G, seat), after.happiness);
  return { changes: [...changes, ...mood.changes], warn: mood.warn };
}

/** A place's room and yield before and after, from an engine economy preview
 *  (`previewUpgradeColonyToCity`, `previewBuildBuilding`): "Room 3 → 5, Food a turn +1 → +2". */
export function placeChanges(preview: EconomyPreview | null, tileId: string): ConfirmChange[] {
  const place = preview?.settlements.find((settlement) => settlement.tileId === tileId);
  if (!place) return [];
  const room: ConfirmChange[] = place.capacityDelta
    ? [{ label: "Room", from: place.capacity - place.capacityDelta, to: place.capacity }]
    : [];
  return [
    ...room,
    ...RESOURCE_ORDER.filter((r) => place.incomeDelta[r] !== 0).map((r) => ({
      label: `${RESOURCE_LABELS[r]} a turn`,
      from: place.income[r] - place.incomeDelta[r],
      to: place.income[r],
      format: formatSignedNumber,
    })),
  ];
}
