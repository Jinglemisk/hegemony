import { getResolutionCard } from "./content";
import { getStandingEffectSources } from "./assembly/laws";
import type { LawEffect } from "./assembly/types";
import { calculateIncome, getHungerStatus } from "./economy/income";
import { scaledByPops } from "./settlement";
import type {
  ActionCostDiscountTarget,
  BuildingId,
  EventEffect,
  HegemonyState,
  PlayerId,
  PopType,
  Resource,
  Resources,
  Stat,
} from "./types";

/** Closed vocabulary used by frontend presentation and simulation telemetry. */
export const ACTIVE_EFFECT_KINDS = [
  "incomeSuppression",
  "hunger",
  "seasonalModifier",
  "yearlyOmen",
  "actionDiscount",
  "standingLaw",
  "nextAssembly",
] as const;

export type ActiveEffectKind = (typeof ACTIVE_EFFECT_KINDS)[number];

export type EventEffectActiveEffectHandling =
  | "immediate"
  | "materializedActionDiscount"
  | "activeSeason"
  | "activeSeasonWhenMarked"
  | "container";

/**
 * Exhaustive inventory of how every event-effect variant reaches active status.
 * Adding a new EventEffect is a type error until its parity path is classified.
 */
export const EVENT_EFFECT_ACTIVE_EFFECT_HANDLING = {
  resourceDelta: "immediate",
  scaledResourceDelta: "immediate",
  happinessDelta: "immediate",
  scaledHappinessDelta: "activeSeasonWhenMarked",
  timedHappinessDelta: "immediate",
  incomeModifier: "activeSeasonWhenMarked",
  buildingCostMultiplier: "activeSeason",
  addPops: "immediate",
  actionCostDiscount: "materializedActionDiscount",
  resourceExchange: "immediate",
  resourceDeltaPerPop: "immediate",
  choice: "container",
} as const satisfies Record<EventEffect["type"], EventEffectActiveEffectHandling>;

export type ActiveEffectSource = {
  kind: "directive" | "unrest" | "seasonalEvent" | "omen" | "playerEvent" | "law";
  id: string;
  label: string;
};

export type ActiveEffectScope =
  | { kind: "player"; playerID: PlayerId }
  | { kind: "allPlayers" }
  | { kind: "activePlayer"; playerID: PlayerId };

export type ActiveEffectExpiry =
  | "afterIncomeCollections"
  | "afterPlayerUpkeeps"
  | "whenFed"
  | "atSeasonEnd"
  | "atYearEnd"
  | "afterMatchingActionOrTurnEnd"
  | "afterMatchingLawActionOrYearEnd"
  | "whenRepealed"
  | "atNextAssembly";

export type ActiveEffectDuration = {
  unit:
    | "incomeCollections"
    | "playerUpkeeps"
    | "season"
    | "year"
    | "standing"
    | "matchingAction"
    | "assembly";
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
  | { type: "resourceIncome"; resource: Stat; amount: number }
  | {
      type: "buildingCostMultiplier";
      multiplier: number;
      excludes: Array<"foundColony" | "upgradeColonyToCity">;
    }
  | {
      type: "actionCostDiscount";
      action: ActionCostDiscountTarget;
      buildingId?: BuildingId;
      pop?: PopType;
      resource: Resource;
      amount: number;
    }
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

  addSeasonalEffects(G, playerID, effects);
  addOmenEffects(G, effects);

  for (const discount of player.actionCostDiscounts) {
    effects.push({
      id: "action-discount:" + discount.id,
      kind: "actionDiscount",
      source: {
        kind: "playerEvent",
        id: discount.sourceCardId,
        label: discount.label,
      },
      scope: { kind: "player", playerID },
      duration: {
        unit: "matchingAction",
        remaining: 1,
        expiry: "afterMatchingActionOrTurnEnd",
      },
      mechanics: [
        {
          type: "actionCostDiscount",
          action: discount.action,
          buildingId: discount.buildingId,
          pop: discount.pop,
          resource: discount.resource,
          amount: discount.amount,
        },
      ],
    });
  }

  for (const source of getStandingEffectSources(G, playerID)) {
    const standingEffects = source.effects.filter((effect) => effect.type !== "yearlyFreeAction");

    if (standingEffects.length > 0) {
      effects.push({
        id: source.kind + ":" + source.id,
        kind: "standingLaw",
        source: {
          kind: "law",
          id: source.id,
          label: source.label,
        },
        scope: { kind: "allPlayers" },
        duration: {
          unit: "standing",
          remaining: null,
          expiry: "whenRepealed",
        },
        mechanics: standingEffects.map((effect) => ({ type: "standingLaw", effect })),
      });
    }

    for (const effect of source.effects) {
      if (
        effect.type !== "yearlyFreeAction" ||
        player.lawFreeActionsUsedThisYear.includes(effect.action)
      ) {
        continue;
      }

      effects.push({
        id: source.kind + ":" + source.id + ":annual:" + effect.action,
        kind: "standingLaw",
        source: { kind: "law", id: source.id, label: source.label },
        scope: { kind: "player", playerID },
        duration: {
          unit: "matchingAction",
          remaining: 1,
          expiry: "afterMatchingLawActionOrYearEnd",
        },
        mechanics: [{ type: "standingLaw", effect }],
      });
    }
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

function addSeasonalEffects(
  G: HegemonyState,
  playerID: PlayerId,
  effects: ActiveEffectDescriptor[],
) {
  const active = G.activeSeasonEvent;
  if (!active) return;

  const scopeFor = (scope: "activePlayer" | "allPlayers"): ActiveEffectScope =>
    scope === "allPlayers"
      ? { kind: "allPlayers" }
      : { kind: "activePlayer", playerID: active.playerID };

  for (const [index, effect] of active.card.effects.entries()) {
    const handling = EVENT_EFFECT_ACTIVE_EFFECT_HANDLING[effect.type];

    if (handling !== "activeSeason" && handling !== "activeSeasonWhenMarked") {
      continue;
    }

    if (
      effect.type === "incomeModifier" &&
      effect.duration === "season" &&
      (effect.scope === "allPlayers" || active.playerID === playerID)
    ) {
      effects.push({
        id: "season:" + active.season + ":" + active.card.id + ":" + index,
        kind: "seasonalModifier",
        source: {
          kind: "seasonalEvent",
          id: active.card.id,
          label: active.card.name,
        },
        scope: scopeFor(effect.scope),
        duration: { unit: "season", remaining: 1, expiry: "atSeasonEnd" },
        mechanics: [{ type: "resourceIncome", resource: effect.resource, amount: effect.amount }],
      });
    } else if (
      effect.type === "scaledHappinessDelta" &&
      effect.duration === "season" &&
      (effect.scope === "allPlayers" || active.playerID === playerID)
    ) {
      effects.push({
        id: "season:" + active.season + ":" + active.card.id + ":" + index,
        kind: "seasonalModifier",
        source: {
          kind: "seasonalEvent",
          id: active.card.id,
          label: active.card.name,
        },
        scope: scopeFor(effect.scope),
        duration: { unit: "season", remaining: 1, expiry: "atSeasonEnd" },
        mechanics: [
          {
            type: "resourceIncome",
            resource: "happiness",
            amount: scaledByPops(
              G,
              playerID,
              effect.amountPerPops,
              effect.popStep,
              effect.minimumMagnitude,
            ),
          },
        ],
      });
    } else if (effect.type === "buildingCostMultiplier" && effect.duration === "season") {
      effects.push({
        id: "season:" + active.season + ":" + active.card.id + ":" + index,
        kind: "seasonalModifier",
        source: {
          kind: "seasonalEvent",
          id: active.card.id,
          label: active.card.name,
        },
        scope: { kind: "allPlayers" },
        duration: { unit: "season", remaining: 1, expiry: "atSeasonEnd" },
        mechanics: [
          {
            type: "buildingCostMultiplier",
            multiplier: effect.multiplier,
            excludes: effect.excludes,
          },
        ],
      });
    }
  }
}

function addOmenEffects(G: HegemonyState, effects: ActiveEffectDescriptor[]) {
  const omen = G.yearOmen;
  if (!omen) return;

  for (const [index, effect] of omen.effects.entries()) {
    if (effect.type !== "yearIncomeModifier") continue;

    effects.push({
      id: "omen:" + omen.year + ":" + omen.record.roll + ":" + index,
      kind: "yearlyOmen",
      source: { kind: "omen", id: String(omen.record.roll), label: omen.label },
      scope: { kind: "allPlayers" },
      duration: { unit: "year", remaining: 1, expiry: "atYearEnd" },
      mechanics: [{ type: "resourceIncome", resource: effect.resource, amount: effect.amount }],
    });
  }
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
