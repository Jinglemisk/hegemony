import type { EconomyPreview } from "../game/economy/preview";
import { happinessLevel } from "../game/happiness";
import { transition, type GameCommand } from "../game/legalMoves";
import { unrestOutcome } from "../game/unrest";
import type { HegemonyState, PlayerId, Resources } from "../game/types";
import { RESOURCE_LABELS } from "./formatters";
import { sign } from "./frameFormat";
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
};

/** What the confirm reads off the engine for a spend: each changed store, happiness when
 *  it moves, and a warning when it crosses the Riot or Revolt line. */
export type SpendPreview = { changes: ConfirmChange[]; warn: string | null };

const TIER_WORDS = {
  riot: "This takes you to the Riot line: a Riot starts when your turn ends",
  revolt: "This takes you to the Revolt line: a Revolt starts when your turn ends",
} as const;

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
  let warn: string | null = null;
  if (after) {
    const level = happinessLevel(G, viewerId);
    const then = happinessLevel(after, viewerId);
    if (then !== level) {
      changes.push({ label: "Happiness", from: level, to: then, format: sign });
      const was = unrestOutcome(G, viewerId, level).tier;
      const now = unrestOutcome(after, viewerId, then).tier;
      if (now !== "none" && now !== was) warn = TIER_WORDS[now];
    }
  }
  return { changes, warn };
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
      format: sign,
    })),
  ];
}
