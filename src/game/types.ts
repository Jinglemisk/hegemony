import type { Ruleset } from "./ruleset";

export type PlayerId = "0" | "1" | "2" | "3";

export type Terrain = "mountain" | "hill" | "forest" | "plains";

export type Resource = "wood" | "stone" | "gold" | "food" | "influence" | "happiness";

export type MaterialResource = Exclude<Resource, "influence" | "happiness">;

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

export type ActionCostDiscountTarget = "buildBuilding" | "foundColony";

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
  resource: Resource;
  amount: number;
  consume: "nextMatchingAction";
}

export interface Yield {
  type: MaterialResource;
  amount: number;
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
  season: number;
  /** Serialized mulberry32 PRNG state; advanced on each deck shuffle so draws are reproducible from the initial seed. */
  rng: number;
  log: LogEntry[];
}
