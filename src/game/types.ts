export type PlayerId = "0" | "1" | "2" | "3";

export type Terrain = "mountain" | "hill" | "forest" | "plains";

export type Resource = "wood" | "stone" | "gold" | "food" | "influence" | "happiness";

export type MaterialResource = Exclude<Resource, "influence" | "happiness">;

export type PopType = "citizens" | "freemen" | "slaves";

export type SettlementKind = "capital" | "city" | "colony";

export type Phase = "setupCapital" | "setupColony" | "gameplay";

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

export interface PlayerState {
  id: PlayerId;
  name: string;
  resources: Resources;
  settlements: string[];
  collectedThisTurn: boolean;
  hasCollectedGameplayIncome: boolean;
  grownSettlementsThisTurn: string[];
  actionCostDiscounts: ActiveActionCostDiscount[];
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
