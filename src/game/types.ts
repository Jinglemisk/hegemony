import type { Ruleset } from "./ruleset";

export type PlayerId = "0" | "1" | "2" | "3";

export type Terrain = "mountain" | "hill" | "forest" | "plains";

export type Resource = "wood" | "stone" | "gold" | "food" | "influence" | "happiness";

export type MaterialResource = Exclude<Resource, "influence" | "happiness">;

/** What the bank exchanges against gold (roadmap-appendix D6/Q14): the tile-yield
 *  materials. Gold is the unit of account, influence/happiness are civic — never traded. */
export type TradableMaterial = Exclude<MaterialResource, "gold">;

export type PopType = "citizens" | "freemen" | "slaves";

export type SettlementKind = "capital" | "city" | "colony";

export type Phase = "setupCapital" | "setupCity" | "setupColony" | "gameplay" | "gameOver";

/** How the terrain deck is laid onto the board: the fixed authored layout, or a seeded shuffle. */
export type BoardLayout = "classic" | "shuffled";

/** The scoreboard metrics victory cards race on (see game/victory.ts). */
export type VictoryMetric = "cities" | "pops" | "citizens" | "stockpile" | "happiness";

/** Why the game ended: a player held enough victory cards, or the seasonal deck (the clock) ran out. */
export type GameOverReason = "victoryRace" | "deckExhausted";

/** The four seasons, in the order they cycle each year (a year always opens on spring). */
export type SeasonName = "spring" | "summer" | "autumn" | "winter";

export type BuildingId = "marketplace" | "temple" | "workshop" | "granary";

export type Resources = Record<Resource, number>;

export type Pops = Record<PopType, number>;

export type EventDeckKind = "seasonal" | "player";

export type EventTiming = "immediate" | "season" | "pendingChoice" | "turn";

export type EventScope = "activePlayer" | "allPlayers";

export type ActionCostDiscountTarget = "buildBuilding" | "foundColony" | "growPop";

export type EventEffect =
  | {
      type: "resourceDelta";
      scope: EventScope;
      resource: Resource;
      amount: number;
    }
  | {
      type: "scaledResourceDelta";
      scope: EventScope;
      resource: Resource;
      amountPerPops: number;
      popStep: number;
      minimum: number;
    }
  | {
      type: "happinessDelta";
      scope: EventScope;
      amount: number;
    }
  | {
      type: "scaledHappinessDelta";
      scope: EventScope;
      amountPerPops: number;
      popStep: number;
      minimumMagnitude: number;
      duration?: "season";
    }
  | {
      /**
       * Unrest that bites for a fixed number of the affected player's turns: it
       * pushes `amountPerTurn` onto happiness during each of that player's next
       * `turns` upkeeps, then expires. Stored as a {@link TimedHappinessModifier}
       * on the player and ticked in the unrest upkeep — see `game/unrest.ts`.
       */
      type: "timedHappinessDelta";
      scope: EventScope;
      amountPerTurn: number;
      turns: number;
    }
  | {
      type: "incomeModifier";
      scope: EventScope;
      resource: Resource;
      amount: number;
      duration: "season" | "turn";
    }
  | {
      type: "buildingCostMultiplier";
      multiplier: number;
      duration: "season";
      excludes: Array<"foundColony" | "upgradeColonyToCity">;
    }
  | {
      type: "addPops";
      pop: PopType;
      amount: number;
      target: "ownedSettlementWithCapacity";
    }
  | {
      type: "actionCostDiscount";
      action: ActionCostDiscountTarget;
      buildingId?: BuildingId;
      /** For `growPop` discounts: only grows of this pop type match (grow coupons). */
      pop?: PopType;
      resource: Resource;
      amount: number;
      duration: "turn";
      consume: "nextMatchingAction";
    }
  | {
      type: "resourceExchange";
      from: Resource;
      to: Resource;
      maxAmount: number;
      ratio: number;
    }
  | {
      type: "resourceDeltaPerPop";
      scope: EventScope;
      resource: Resource;
      pop: PopType;
      amountPerPop: number;
      minimum: number;
    }
  | {
      type: "choice";
      options: EventEffect[][];
    };

export interface EventCard {
  id: string;
  deck: EventDeckKind;
  name: string;
  count: number;
  text: string;
  timing: EventTiming;
  effects: EventEffect[];
  /**
   * Seasons this card may surface in (seasonal deck only). The seasonal draw
   * prefers cards that suit the current season, so tagging weights the deck —
   * e.g. tagging the harsh cards to winter makes winter draw *more* of them
   * without ever guaranteeing them. Omitted / empty means "any season".
   */
  seasons?: SeasonName[];
}

export type EventDeck = EventCard[];

export interface ActiveSeasonEvent {
  card: EventCard;
  season: number;
}

export interface PendingPlayerEvent {
  card: EventCard;
  playerID: PlayerId;
}

export interface ActiveActionCostDiscount {
  id: string;
  sourceCardId: string;
  label: string;
  action: ActionCostDiscountTarget;
  buildingId?: BuildingId;
  pop?: PopType;
  resource: Resource;
  amount: number;
  consume: "nextMatchingAction";
}

export interface Yield {
  type: MaterialResource;
  amount: number;
}

// ── Event tables (roadmap-appendix D9/D10 · docs/feat/event-tables.md) ─────────────
//
// Dice-and-table as one reusable, data-driven component: a table is content data,
// `rollOnTable` (game/tables.ts) is the only engine seam, and every instance — riot,
// the expeditions, future omens — shares the same UI modal.

export type EventTableId = "riot" | "merchantConvoy" | "grandEmbassy" | "colonistsVoyage" | "omen";

/** The closed effect vocabulary a table row may apply. Each effect with an impossible
 *  happy path carries its explicit fallback (no building → pops, no room → food). */
export type TableEffect =
  | { type: "losePops"; count: number }
  | { type: "loseResource"; resource: Resource; amount: number; popLossIfShort?: number }
  | { type: "destroyBuilding"; popLossFallback: number }
  | { type: "gainResource"; resource: Resource; amount: number }
  | { type: "gainPop"; pop: PopType; foodFallback: number }
  /** Year-long, table-wide income modifier — the omen's vocabulary. Applying the
   *  effect is a no-op at roll time; the income engine reads it off G.yearOmen. */
  | { type: "yearIncomeModifier"; resource: Resource; amount: number }
  | { type: "none" };

export interface EventTableRow {
  /** The die face this row answers to (1–6; modified rolls clamp into this range). */
  roll: number;
  label: string;
  effects: TableEffect[];
}

export type RiotInsuranceId = "breadDole" | "concession" | "patronage";

/** A pre-roll insurance slot: pay the cost before the die, add +1 to the roll.
 *  The concession is special — its price is a forced demotion, not resources. */
export interface TableInsuranceOption {
  id: RiotInsuranceId;
  label: string;
  cost: Partial<Resources>;
  /** The concession: buying it demotes one pop (free — the mob forces it). */
  demotesPop?: boolean;
  modifier: number;
}

export interface EventTableDefinition {
  id: EventTableId;
  name: string;
  flavor: string;
  /** Die size — table data, defaulting to 6. Modified rolls clamp into 1..die. */
  die?: number;
  rows: EventTableRow[];
  insurance?: TableInsuranceOption[];
}

/** Escalation tier of a pending riot — maps the unrest thresholds (≤ −5 / ≤ −10). */
export type RiotTier = "unrest" | "revolt";

/** A riot waiting on the table: blocks the turn (income deferred, endTurn illegal)
 *  until the player rolls. Insurance is declared here, before the die. */
export interface PendingRiot {
  playerID: PlayerId;
  tier: RiotTier;
  boughtInsurance: RiotInsuranceId[];
}

/** The last table roll, kept on state so the UI can show the outcome after the move
 *  resolves (moves are synchronous — the modal reads this, never re-rolls). */
export interface TableRollRecord {
  tableId: EventTableId;
  playerID: PlayerId;
  /** Natural d6. */
  roll: number;
  /** After insurance/tier modifiers, clamped to 1–6 — the row that landed. */
  modified: number;
  modifier: number;
  rowLabel: string;
  /** Human-readable lines for each applied effect. */
  outcomes: string[];
  season: number;
}

/** Per-material bank rates: `sell` materials buy 1 gold; 1 material costs `buy` gold.
 *  Derived once at game creation (roadmap-appendix Q14) and static all game. */
export type BankRates = Record<TradableMaterial, { sell: number; buy: number }>;

/** The year's standing omen (PROVISIONAL, 2026-07-13): rolled publicly by the year's
 *  opener each spring, one modest symmetric modifier hanging over the whole table
 *  until the year turns. The record keeps the roll for the announcement modal. */
export interface YearOmen {
  record: TableRollRecord;
  label: string;
  year: number;
  effects: TableEffect[];
}

export interface Settlement {
  owner: PlayerId;
  kind: SettlementKind;
  buildings: BuildingId[];
  pops: Pops;
}

export type BuildingEffect =
  | {
      type: "freemanGoldBonus";
      amount: number;
      supportedPops: number;
    }
  | {
      type: "citizenInfluenceBonus";
      amount: number;
      supportedPops: number;
    }
  | {
      type: "slavePrimaryResourceBonus";
      amount: number;
      supportedPops: number;
    }
  | {
      type: "income";
      resource: Resource;
      amount: number;
    }
  | {
      type: "happiness";
      amount: number;
    }
  | {
      type: "growPopFoodDiscount";
      amount: number;
    };

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  cost: Partial<Resources>;
  effects: BuildingEffect[];
}

export interface HexTile {
  id: string;
  q: number;
  r: number;
  terrain: Terrain;
  buildingSlots: number;
  resource: Yield;
  settlements: Settlement[];
}

export interface HegemonyBoard {
  tiles: HexTile[];
}

/** A happiness penalty (or bonus) that applies for a fixed number of the owning
 *  player's turns, then expires. Created by the `timedHappinessDelta` event
 *  effect and ticked down in the unrest upkeep. */
export interface TimedHappinessModifier {
  amountPerTurn: number;
  turnsRemaining: number;
  source: string;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  resources: Resources;
  settlements: string[];
  collectedThisTurn: boolean;
  hasCollectedGameplayIncome: boolean;
  grownSettlementsThisTurn: string[];
  actionCostDiscounts: ActiveActionCostDiscount[];
  /** Consecutive turns this player has collected income at or below the food-deficit
   *  threshold; drives the starvation pop-loss in the unrest upkeep. */
  consecutiveFoodDeficitTurns: number;
  /** Active timed happiness penalties/bonuses, ticked down each of the player's turns. */
  timedHappinessModifiers: TimedHappinessModifier[];
  /** Running total of pops lost to unrest & starvation — surfaced in the ledger. */
  popsLostToUnrest: number;
  /** Running total of pops gained inorganically from event cards (the `addPops`
   *  effect) — the ledger's "Gained" stat, paired with deaths. */
  popsGainedFromEvents: number;
  /** Once-per-turn throttles for the Phase 1 currency verbs (roadmap-appendix D7/D8/D10):
   *  one civic-calm action, one ladder move, one venture. Reset with the turn flags. */
  civicCalmUsedThisTurn: boolean;
  ladderUsedThisTurn: boolean;
  ventureUsedThisTurn: boolean;
}

export interface PopulationTransfer {
  id: string;
  owner: PlayerId;
  fromTileId: string;
  toTileId: string;
  pops: Pops;
}

export interface LogEntry {
  id: string;
  season: number;
  message: string;
}

export interface HegemonyState {
  phase: Phase;
  currentPlayer: PlayerId;
  turn: number;
  /** The seed this game was created from — shown in the UI, embedded in bug reports. */
  seed: number;
  /** The player who opens the current season; rotates one seat every new year (spring). */
  seasonOpener: PlayerId;
  /** Set when the game ends — the victor of the race, or the exhaustion tally. */
  winner: PlayerId | null;
  gameOverReason: GameOverReason | null;
  /** How the board was generated, so the UI can say so. */
  boardLayout: BoardLayout;
  /** Tunable balance values for this game (difficulty / handicaps / modules). */
  ruleset: Ruleset;
  board: HegemonyBoard;
  players: Record<PlayerId, PlayerState>;
  transfers: PopulationTransfer[];
  seasonalDrawPile: EventDeck;
  seasonalDiscardPile: EventDeck;
  playerDrawPile: EventDeck;
  playerDiscardPile: EventDeck;
  activeSeasonEvent: ActiveSeasonEvent | null;
  lastPlayerEvent: EventCard | null;
  pendingPlayerEvent: PendingPlayerEvent | null;
  /** A riot blocking the current turn (income deferred until it resolves). */
  pendingRiot: PendingRiot | null;
  /** The most recent event-table roll, for the UI's outcome display. */
  lastTableRoll: TableRollRecord | null;
  /** The standing yearly omen — rolled each spring, cleared by the next roll. */
  yearOmen: YearOmen | null;
  /** This game's bank rates — derived from the board at creation, static after. */
  bank: BankRates;
  season: number;
  /** Serialized mulberry32 PRNG state; advanced on each deck shuffle so draws are reproducible from the initial seed. */
  rng: number;
  log: LogEntry[];
}
