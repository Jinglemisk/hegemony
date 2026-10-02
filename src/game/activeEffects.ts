import { getResolutionCard } from "./content";
import { getStandingEffectSources } from "./assembly/laws";
import type { LawEffect } from "./assembly/types";
import { calculateIncome, getHungerStatus } from "./economy/income";
import type { HegemonyState, PlayerId, Resources, YearTerm } from "./types";

/** Closed vocabulary used by frontend presentation and simulation telemetry. */
export const ACTIVE_EFFECT_KINDS = [
  "incomeSuppression",
  "hunger",
  "yearCard",
  "standingLaw",
  "nextAssembly",
] as const;

export type ActiveEffectKind = (typeof ACTIVE_EFFECT_KINDS)[number];

export type ActiveEffectSource = {
  kind: "directive" | "unrest" | "yearCard" | "law";
  id: string;
  label: string;
};

export type ActiveEffectScope = { kind: "player"; playerID: PlayerId } | { kind: "allPlayers" };

export type ActiveEffectExpiry =
  "afterIncomeCollections" | "whenFed" | "atYearEnd" | "whenRepealed" | "atNextAssembly";

export type ActiveEffectDuration = {
  unit: "incomeCollections" | "year" | "standing" | "assembly";
  /** Null means the effect is conditional/standing rather than countdown-based. */
  remaining: number | null;
  expiry: ActiveEffectExpiry;
};

export type ActiveEffectMechanic =
  | { type: "suppressIncome"; turns: number }
  | {
      /** Free pops eat more than comes in. `unfed` mouths go hungry at the next
       *  income, and one pop leaves for each. */
      type: "hunger";
      netFood: number;
      stockpile: number;
      unfed: number;
    }
  | { type: "zeroTerm"; term: YearTerm }
  | { type: "standingLaw"; effect: LawEffect }
  | { type: "equalVotesNextAssembly"; votes: number };

export type ActiveEffectDescriptor = {
  id: string;
  kind: ActiveEffectKind;
  source: ActiveEffectSource;
  scope: ActiveEffectScope;
  duration: ActiveEffectDuration;
  mechanics: ActiveEffectMechanic[];
};

/**
 * Canonical, read-only description of every persistent mechanical effect currently
 * bearing on one player. Calculators remain authoritative for the numbers; this
 * selector projects their state into a typed explanation shared by UI and sim/AI.
 */
export function getActiveEffects(
  G: HegemonyState,
  playerID: PlayerId,
  context: { income?: Resources } = {},
): ActiveEffectDescriptor[] {
  const player = G.players[playerID];
  const effects: ActiveEffectDescriptor[] = [];

  if (player.incomeSuppressedTurns > 0) {
    effects.push({
      id: "income-suppression:" + playerID,
      kind: "incomeSuppression",
      source: {
        kind: "directive",
        id: "general-strike",
        label: getResolutionCard(G.definition.content, "general-strike")?.name ?? "General Strike",
      },
      scope: { kind: "player", playerID },
      duration: {
        unit: "incomeCollections",
        remaining: player.incomeSuppressedTurns,
        expiry: "afterIncomeCollections",
      },
      mechanics: [{ type: "suppressIncome", turns: player.incomeSuppressedTurns }],
    });
  }

  // Hunger warns as soon as the granary drains, and counts the incomes it still
  // covers; at zero the next income leaves `unfed` mouths and that many pops go. A
  // strike collects nothing and eats nothing, so the warning waits for it to end.
  const hunger = getHungerStatus(
    G,
    playerID,
    (context.income ?? calculateIncome(G, playerID)).food,
  );
  if (hunger.income < 0 && player.incomeSuppressedTurns === 0) {
    effects.push({
      id: "hunger:" + playerID,
      kind: "hunger",
      source: { kind: "unrest", id: "hunger", label: "Hunger" },
      scope: { kind: "player", playerID },
      duration: {
        unit: "incomeCollections",
        remaining: Math.floor(hunger.stockpile / -hunger.income),
        expiry: "whenFed",
      },
      mechanics: [
        {
          type: "hunger",
          netFood: hunger.income,
          stockpile: hunger.stockpile,
          unfed: hunger.unfed,
        },
      ],
    });
  }

  addYearCardEffect(G, effects);

  for (const source of getStandingEffectSources(G, playerID)) {
    effects.push({
      id: source.kind + ":" + source.id,
      kind: "standingLaw",
      source: { kind: "law", id: source.id, label: source.label },
      scope: { kind: "allPlayers" },
      duration: { unit: "standing", remaining: null, expiry: "whenRepealed" },
      mechanics: source.effects.map((effect) => ({ type: "standingLaw", effect })),
    });
  }

  if (G.pendingIsonomiaTarget === playerID) {
    effects.push({
      id: "next-assembly:isonomia",
      kind: "nextAssembly",
      source: {
        kind: "directive",
        id: "isonomia",
        label: getResolutionCard(G.definition.content, "isonomia")?.name ?? "Isonomia",
      },
      scope: { kind: "player", playerID },
      duration: {
        unit: "assembly",
        remaining: 1,
        expiry: "atNextAssembly",
      },
      mechanics: [{ type: "equalVotesNextAssembly", votes: 1 }],
    });
  }

  return effects;
}

/** The year's card, while it zeroes a term. Plague and Festival act once when revealed
 *  and leave nothing standing. */
function addYearCardEffect(G: HegemonyState, effects: ActiveEffectDescriptor[]) {
  const card = G.activeYearCard;

  if (card?.effect.type !== "zeroTerm") {
    return;
  }

  effects.push({
    id: "year:" + G.year + ":" + card.id,
    kind: "yearCard",
    source: { kind: "yearCard", id: card.id, label: card.name },
    scope: { kind: "allPlayers" },
    duration: { unit: "year", remaining: 1, expiry: "atYearEnd" },
    mechanics: [{ type: "zeroTerm", term: card.effect.term }],
  });
}

export function countActiveEffectsByKind(
  effects: readonly ActiveEffectDescriptor[],
): Record<ActiveEffectKind, number> {
  return Object.fromEntries(
    ACTIVE_EFFECT_KINDS.map((kind) => [
      kind,
      effects.filter((effect) => effect.kind === kind).length,
    ]),
  ) as Record<ActiveEffectKind, number>;
}
