import { ACTION_COSTS, GROW_POP_COSTS, SETTLEMENT_RULES, STARTING_RESOURCES } from "./data";
import { PLACEMENT_POP_COUNTS } from "./core/pops";
import type { PopType, Resource, Resources, SettlementKind } from "./types";

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
  /** Suppress food-shortage happiness pressure until a player's first gameplay income. */
  firstIncomeFoodGrace: boolean;
}

export interface Ruleset {
  startingResources: Resources;
  placementPopCounts: Record<"city" | "capital" | "colony", number>;
  settlements: Record<SettlementKind, SettlementRule>;
  actionCosts: {
    foundColony: Partial<Resources>;
    upgradeColonyToCity: Partial<Resources>;
  };
  growPopCosts: Record<PopType, Partial<Resources>>;
  popIncome: Record<PopType, PopIncomeRule>;
  economy: EconomyRules;
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
    firstIncomeFoodGrace: true
  }
};
