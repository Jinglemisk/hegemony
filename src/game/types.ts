export type PlayerId = "0" | "1" | "2" | "3";

export type Terrain = "mountain" | "hill" | "forest" | "plains";

export type Resource = "wood" | "stone" | "gold" | "food" | "influence" | "happiness";

export type MaterialResource = Exclude<Resource, "influence" | "happiness">;

export type PopType = "citizens" | "freemen" | "slaves";

export type SettlementKind = "capital" | "city" | "colony";

export type BuildingId = "marketplace" | "temple" | "workshop" | "granary";

export type Resources = Record<Resource, number>;

export type Pops = Record<PopType, number>;

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
  grownSettlementsThisTurn: string[];
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
  board: HegemonyBoard;
  players: Record<PlayerId, PlayerState>;
  transfers: PopulationTransfer[];
  season: number;
  log: LogEntry[];
}
