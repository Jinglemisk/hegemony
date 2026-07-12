import { ACTION_COSTS, GROW_POP_COSTS, SETTLEMENT_RULES, STARTING_RESOURCES } from "./data";
import { PLACEMENT_POP_COUNTS } from "./core/pops";
import type { PopType, Resource, Resources, SettlementKind, VictoryMetric } from "./types";

/**
 * The Ruleset is every tunable balance value for a single game, gathered into one
 * serializable object. It is the "how much" of the game — capacities, costs, the
 * per-pop income formula, economy scalars — as opposed to the "what exists"
 * (buildings, terrain, event cards), which stays in the {@link ./data} content
 * tables.
 *
 * It lives on {@link HegemonyState.ruleset} so it travels with the game and can be
 * swapped per session: a difficulty mode is a different Ruleset, a handicap is a
 * per-player override, and a "module" is a Ruleset patch plus extra content rows.
 * {@link DEFAULT_RULESET} reproduces the historical hardcoded values exactly, so
 * introducing this seam changes no behavior.
 */

/** Per-pop base income: flat yields into named resources, plus a yield into the
 *  settlement tile's own (material) resource. The data form of {@link popIncome}. */
export interface PopIncomeRule {
  /** Flat per-pop yield into fixed resources (negative = upkeep). */
  flat: Partial<Record<Resource, number>>;
  /** Per-pop yield into the settlement tile's primary material resource. */
  primaryResource: number;
}

export interface SettlementRule {
  popCapacity: number;
  buildingSlotBonus: number;
  canBuildBuildings: boolean;
}

export interface EconomyRules {
  /** Fraction of tile yield a colony keeps while sharing its tile with another colony. */
  colonySharedTileYieldShare: number;
  /** Happiness lost per pop above a settlement's capacity. */
  overCapacityHappinessPerPop: number;
  /** Every N stored food grants +1 happiness at income time (0 disables). */
  foodStockpileHappinessDivisor: number;
  /** Ceiling on the food-stockpile happiness bonus, so hoards can't buy unlimited calm
   *  (roadmap-appendix D4). 0 disables the bonus outright. */
  foodStockpileHappinessCap: number;
  /** Suppress food-shortage happiness pressure until a player's first gameplay income. */
  firstIncomeFoodGrace: boolean;
  /** Unrest thresholds & penalties (mapped from the rulebook's positive "Unrest N"
   *  onto negative happiness). All evaluated in the start-of-turn unrest upkeep. */
  unrest: UnrestRules;
}

/** Tunables for the unrest (negative-happiness) consequence system. */
export interface UnrestRules {
  /** Happiness at/below this removes `popLossCount` pops each turn (no rebound). */
  popLossThreshold: number;
  popLossCount: number;
  /** Happiness at/below this removes `severePopLossCount` pops, then happiness is
   *  reset to `severeRebound`. Checked before the milder threshold. */
  severeThreshold: number;
  severePopLossCount: number;
  severeRebound: number;
  /** Net food income at/below this counts as a deficit turn. */
  foodDeficitThreshold: number;
  /** Consecutive deficit turns that trigger a starvation pop loss (then the counter resets). */
  foodDeficitTurnsToStarve: number;
  /** Pops removed when the starvation counter fires. */
  foodDeficitStarvePopLoss: number;
}

/** The victory race (roadmap-appendix D1): five public "Most X, minimum Y" cards; the
 *  sole leader above the minimum holds a card, and holding `cardsToWin` at the start of
 *  your own turn wins the game. Minimums are the game-length dial. */
export interface VictoryRules {
  cardsToWin: number;
  minimums: Record<VictoryMetric, number>;
}

export interface Ruleset {
  startingResources: Resources;
  placementPopCounts: Record<"city" | "capital" | "colony", number>;
  settlements: Record<SettlementKind, SettlementRule>;
  victory: VictoryRules;
  actionCosts: {
    foundColony: Partial<Resources>;
    upgradeColonyToCity: Partial<Resources>;
  };
  growPopCosts: Record<PopType, Partial<Resources>>;
  popIncome: Record<PopType, PopIncomeRule>;
  economy: EconomyRules;
  /**
   * The settlements each player places during setup, in round order — capitals
   * first, then colonies. Length = settlements per player before gameplay begins.
   * Standard is one capital then one colony; a deathmatch mode makes it three
   * colonies. The turn machine derives the setup phase targets from this list.
   */
  setup: SettlementKind[];
}

/**
 * The baseline ruleset. Tables that already lived in {@link ./data} are referenced
 * here so there is still a single source; the per-pop formula and economy scalars
 * (previously hardcoded inside the engine) are made explicit. Every value equals
 * what the engine used before the Ruleset seam existed.
 */
export const DEFAULT_RULESET: Ruleset = {
  startingResources: STARTING_RESOURCES,
  placementPopCounts: PLACEMENT_POP_COUNTS,
  settlements: SETTLEMENT_RULES,
  victory: {
    // Design rule (roadmap-appendix D1, 2026-07-12): no card may be holdable at game
    // start or on the first turn — every minimum sits above anything a legal setup
    // plus one lucky opening turn can produce (start: 2 cities, 6 pops, ≤6 citizens,
    // 52 banked materials, 0 happiness).
    cardsToWin: 3,
    minimums: { cities: 3, pops: 16, citizens: 8, stockpile: 80, happiness: 10 }
  },
  actionCosts: ACTION_COSTS,
  growPopCosts: GROW_POP_COSTS,
  popIncome: {
    citizens: { flat: { influence: 1, gold: 2, food: -2 }, primaryResource: 0 },
    freemen: { flat: { gold: 2, food: -1 }, primaryResource: 0 },
    slaves: { flat: { food: -1, happiness: -0.5 }, primaryResource: 1 }
  },
  economy: {
    colonySharedTileYieldShare: 0.5,
    overCapacityHappinessPerPop: 1,
    foodStockpileHappinessDivisor: 5,
    foodStockpileHappinessCap: 2,
    firstIncomeFoodGrace: true,
    unrest: {
      popLossThreshold: -5,
      popLossCount: 2,
      severeThreshold: -10,
      severePopLossCount: 4,
      severeRebound: -4,
      foodDeficitThreshold: -2,
      foodDeficitTurnsToStarve: 2,
      foodDeficitStarvePopLoss: 1
    }
  },
  setup: ["capital", "city"]
};

/** Recursively merge a partial patch onto a base value; arrays and primitives replace, plain objects merge. */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : patch) as T;
  }

  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }
    out[key] = deepMerge((base as Record<string, unknown>)[key], value);
  }
  return out as T;
}

/**
 * Author a game mode as `standard + a small patch`, instead of restating the whole
 * ruleset. `deriveRuleset(DEFAULT_RULESET, { startingResources: { wood: 40 } })`
 * keeps every other value and overrides only what the patch names.
 */
export function deriveRuleset(base: Ruleset, patch: DeepPartial<Ruleset>): Ruleset {
  return deepMerge(base, patch);
}

/** How many capitals lead the setup sequence — the settlement count that ends the setupCapital phase. */
export function setupCapitalCount(ruleset: Ruleset): number {
  return ruleset.setup.filter((kind) => kind === "capital").length;
}

export type GameModeId = "standard" | "fastStart" | "deathmatch";

/**
 * The mode registry: each entry is a ruleset (usually a {@link deriveRuleset} patch
 * over {@link DEFAULT_RULESET}) plus display copy. Adding a mode is a new entry here;
 * `createGame` selects one via {@link ./config.GAME_CONFIG.mode}. This is the "tracks"
 * for difficulty / handicaps / future modules — no plugin loader, just data.
 */
export const GAME_MODES: Record<GameModeId, { label: string; description: string; ruleset: Ruleset }> = {
  standard: {
    label: "Standard",
    description: "The baseline economy: two starting cities (capital first), snake order.",
    ruleset: DEFAULT_RULESET
  },
  fastStart: {
    label: "Fast Start",
    description: "Open with a richer treasury so expansion comes sooner.",
    ruleset: deriveRuleset(DEFAULT_RULESET, {
      startingResources: { wood: 40, stone: 20, gold: 20, food: 30 }
    })
  },
  deathmatch: {
    label: "Deathmatch",
    description: "Each player founds three colonies at setup instead of one.",
    ruleset: deriveRuleset(DEFAULT_RULESET, {
      setup: ["capital", "colony", "colony", "colony"]
    })
  }
};
