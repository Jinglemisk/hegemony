export type PlayerId = "0" | "1" | "2" | "3";

export type Terrain = "mountain" | "hill" | "forest" | "plains";

export type Resource = "wood" | "stone" | "gold" | "food" | "influence" | "unrest";

export type MaterialResource = Exclude<Resource, "influence" | "unrest">;

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
      type: "addPop";
      pop: PopType;
      amount: number;
    }
  | {
      type: "income";
      resource: Resource;
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
}

export interface LogEntry {
  id: string;
  season: number;
  message: string;
}

export interface HegemonyState {
  board: HegemonyBoard;
  players: Record<PlayerId, PlayerState>;
  season: number;
  log: LogEntry[];
}
