import { ACTION_COSTS, GROW_POP_COSTS, SETTLEMENT_RULES, STARTING_RESOURCES, VENTURE_STAKES } from "./data";
import { PLACEMENT_POP_COUNTS } from "./core/pops";
import type { PopType, Resource, Resources, SettlementKind, VictoryMetric } from "./types";

/** One bank rate pair: `sell` materials buy 1 gold; 1 material costs `buy` gold. */
export interface BankRatePair {
  sell: number;
  buy: number;
}

/** Bank exchange tunables (roadmap-appendix D6/Q14). Rates are PROVISIONAL and
 *  expected to move with playtest/sim — that is why they live here, not in code. */
export interface BankRules {
  /** How per-material rates are derived from the board at game creation.
   *  `uniform` prices everything at baseline; `scarcity` classes materials by tile
   *  count (strictly rarest = scarce, strictly most common = abundant). The default
   *  is picked by a sim A/B — both stay available as knobs. */
  derivation: "uniform" | "scarcity";
  baseline: BankRatePair;
  abundant: BankRatePair;
  scarce: BankRatePair;
}

/** Civic calm (D7): one action per turn, two payments, same +happiness. */
export interface CivicCalmRules {
  happiness: number;
  influenceCost: number;
  goldCost: number;
}

/** The social ladder (D8): promote up with food/gold, demote down with influence. */
export interface LadderRules {
  promoteCosts: Record<"slaves" | "freemen", Partial<Resources>>;
  demoteCosts: Record<"citizens" | "freemen", Partial<Resources>>;
  /** Happiness lost on a paid demotion, per source pop (riot demotions skip this). */
  demoteHappinessPenalty: Record<"citizens" | "freemen", number>;
}

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
  /** Bank exchange rates & derivation (D6/Q14). */
  bank: BankRules;
}

/** Tunables for the unrest (negative-happiness) consequence system. Since D9 the
 *  thresholds trigger the riot TABLE (game/riot.ts) rather than flat pop removal;
 *  the old popLossCount/severePopLossCount fields fell away with that change. */
export interface UnrestRules {
  /** Happiness at/below this starts a mild riot at the player's next upkeep (no rebound). */
  popLossThreshold: number;
  /** Happiness at/below this starts a severe riot instead: the roll takes
   *  `severeRollModifier`, pop losses ×`severePopLossMultiplier`, then happiness is
   *  reset to `severeRebound`. Checked before the milder threshold. */
  severeThreshold: number;
  severeRollModifier: number;
  severePopLossMultiplier: number;
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

export interface PlacementRules {
  /** Colonies must border an owned settlement (roadmap-appendix D3). Off = colonies
   *  may be founded anywhere — kept as a knob so sims can A/B the geometry. */
  colonyContiguity: boolean;
  /** Coastal leapfrog (roadmap-appendix Q13a): holding any settlement on a coastal
   *  tile lets you found colonies on any other coastal tile — sailing, not teleporting. */
  coastalLeapfrog: boolean;
}

/**
 * The Assembly's dials (docs/feat/assembly-politicians.md §5). Every number the
 * rivalry layer turns on lives here, because the design's own note is that the
 * *shape* is locked and the *numbers* want the `?tune` panel and the sim — the sink
 * depth in particular is called out as "the most important A/B".
 *
 * The costs reproduce the approved visual reference's own figures
 * (docs/design/showcases/assembly-mode-showcase.html): draw 3, bribe 10 capped at 2,
 * veto 5.
 */
export interface AssemblyRules {
  /** Assemblies convene each spring from this year. **0 disables the subsystem**,
   *  which is how the headless sim and the pre-Assembly fixtures keep running. */
  firstYear: number;
  /** Standing Laws the board holds before a new one must name one to replace (§1.5). */
  lawCap: number;
  /** Stelae that make a politician dominant — the patron's buff switches on here. */
  dominanceThreshold: number;
  /** Tally monuments that trigger Stratokles's coup: his patron wins outright. */
  coupThreshold: number;
  /** Influence for the first draw of your proposal turn. */
  drawCost: number;
  /** Influence for every draw after it — the fishing sink (§1.4). */
  redrawCost: number;
  /** Influence to put a repeal of a standing Law on the ballot. */
  repealCost: number;
  /** Influence per bought vote, and the per-player ceiling for one assembly. */
  briberyCost: number;
  briberyCap: number;
  /** Influence to strike the resolution under vote. */
  vetoCost: number;
  vetoesPerAssembly: number;
  /** Whether a tied vote carries. The design's default is that ties FAIL. */
  tiesPass: boolean;
}

export interface Ruleset {
  startingResources: Resources;
  placementPopCounts: Record<"city" | "capital" | "colony", number>;
  settlements: Record<SettlementKind, SettlementRule>;
  placement: PlacementRules;
  victory: VictoryRules;
  actionCosts: {
    foundColony: Partial<Resources>;
    upgradeColonyToCity: Partial<Resources>;
  };
  growPopCosts: Record<PopType, Partial<Resources>>;
  popIncome: Record<PopType, PopIncomeRule>;
  economy: EconomyRules;
  civicCalm: CivicCalmRules;
  ladder: LadderRules;
  /** Venture stakes (D10) — either posts any expedition. */
  ventureStakes: Record<"gold" | "wood", Partial<Resources>>;
  /** The Assembly & Politicians layer (Phase 3-B). */
  assembly: AssemblyRules;
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
  placement: { colonyContiguity: true, coastalLeapfrog: true },
  victory: {
    // Design rule (roadmap-appendix D1, 2026-07-12): no card may be holdable at game
    // start or on the first turn — every minimum sits above anything a legal setup
    // plus one lucky opening turn can produce (start: 1 city + 1 colony, 6 pops,
    // ≤6 citizens, 52 banked materials, 0 happiness).
    cardsToWin: 3,
    // `voice` is the Assembly's 6th card (§1.7): patron of the most politicians, a
    // live metric that flips hands like the other five. The minimum of 2 keeps it
    // genuinely contested — patronising a single politician is not a claim on the
    // Assembly, and with four politicians and four seats, two is a real bloc.
    minimums: { cities: 3, pops: 16, citizens: 8, stockpile: 80, happiness: 10, voice: 2 }
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
      severeThreshold: -10,
      severeRollModifier: -2,
      severePopLossMultiplier: 2,
      severeRebound: -4,
      foodDeficitThreshold: -2,
      foodDeficitTurnsToStarve: 2,
      foodDeficitStarvePopLoss: 1
    },
    bank: {
      // PROVISIONAL rates (D6): baseline sell 3:1 / buy 2g; scarcity classes sit one
      // step off. The derivation default is the sim A/B's pick (docs/sim/).
      derivation: "scarcity",
      baseline: { sell: 3, buy: 2 },
      abundant: { sell: 4, buy: 2 },
      scarce: { sell: 2, buy: 3 }
    }
  },
  civicCalm: { happiness: 3, influenceCost: 4, goldCost: 6 },
  ladder: {
    promoteCosts: { slaves: { food: 4 }, freemen: { gold: 4 } },
    demoteCosts: { citizens: { influence: 2 }, freemen: { influence: 3 } },
    demoteHappinessPenalty: { citizens: 0, freemen: 1 }
  },
  ventureStakes: VENTURE_STAKES,
  assembly: {
    // Spring of YEAR 2 (appendix Q27, corrected 2026-07-20 — not Year 3). The
    // seasonal deck holds ~8 years and race wins land around Year 5, so a
    // race-decided game sees ~4 assemblies and a grind to exhaustion up to ~7.
    firstYear: 2,
    lawCap: 6,
    dominanceThreshold: 3,
    coupThreshold: 3,
    drawCost: 3,
    redrawCost: 3,
    repealCost: 6,
    briberyCost: 10,
    briberyCap: 2,
    vetoCost: 5,
    vetoesPerAssembly: 1,
    tiesPass: false
  },
  setup: ["capital", "colony"]
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

/** Combine two ruleset patches (b wins on conflicts); null when both are absent. Used to
 *  fold a tune-panel patch into a `--ruleset-patch` file in the headless sim. */
export function mergeRulesetPatches(
  a: DeepPartial<Ruleset> | null,
  b: DeepPartial<Ruleset> | null,
): DeepPartial<Ruleset> | null {
  if (!a) return b;
  if (!b) return a;
  return deepMerge(a, b);
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
    description: "The baseline: a metropolis, then a founding colony on any coast — snake order.",
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
