import type { BuildingDefinition, PlayerId, PopType, Resources, SettlementKind, Terrain, Yield } from "./types";

export const PLAYER_IDS: PlayerId[] = ["0", "1", "2", "3"];

export const PLAYER_COLORS: Record<PlayerId, string> = {
  "0": "#c2410c",
  "1": "#0f766e",
  "2": "#7c3aed",
  "3": "#b45309"
};

export const STARTING_RESOURCES: Resources = {
  wood: 20,
  stone: 10,
  gold: 10,
  food: 12,
  influence: 0,
  happiness: 0
};

export const EMPTY_RESOURCES: Resources = {
  wood: 0,
  stone: 0,
  gold: 0,
  food: 0,
  influence: 0,
  happiness: 0
};

export const ACTION_COSTS = {
  foundColony: {
    wood: 20,
    food: 2
  },
  upgradeColonyToCity: {
    wood: 30,
    stone: 10,
    food: 5
  }
} satisfies Record<string, Partial<Resources>>;

export const GROW_POP_COSTS: Record<PopType, Partial<Resources>> = {
  slaves: {
    food: 5
  },
  freemen: {
    food: 7
  },
  citizens: {
    food: 9,
    gold: 2
  }
};

export const SETTLEMENT_RULES: Record<
  SettlementKind,
  {
    popCapacity: number;
    buildingSlotBonus: number;
    canBuildBuildings: boolean;
  }
> = {
  capital: {
    popCapacity: 20,
    buildingSlotBonus: 4,
    canBuildBuildings: true
  },
  city: {
    popCapacity: 10,
    buildingSlotBonus: 2,
    canBuildBuildings: true
  },
  colony: {
    popCapacity: 4,
    buildingSlotBonus: 0,
    canBuildBuildings: false
  }
};

export const BUILDINGS: BuildingDefinition[] = [
  {
    id: "marketplace",
    name: "Marketplace",
    cost: { wood: 12 },
    effects: [{ type: "freemanGoldBonus", amount: 2, supportedPops: 3 }]
  },
  {
    id: "temple",
    name: "Temple",
    cost: { stone: 6 },
    effects: [
      { type: "happiness", amount: 1 },
      { type: "citizenInfluenceBonus", amount: 1, supportedPops: 2 }
    ]
  },
  {
    id: "workshop",
    name: "Workshop",
    cost: { wood: 12 },
    effects: [{ type: "slavePrimaryResourceBonus", amount: 1, supportedPops: 3 }]
  },
  {
    id: "granary",
    name: "Granary",
    cost: { wood: 12, stone: 2 },
    effects: [
      { type: "income", resource: "food", amount: 2 },
      { type: "growPopFoodDiscount", amount: 2 }
    ]
  }
];

export const TERRAIN_DECK: Array<{ terrain: Terrain; buildingSlots: number; resource: Yield }> = [
  { terrain: "forest", buildingSlots: 2, resource: { type: "wood", amount: 4 } },
  { terrain: "hill", buildingSlots: 3, resource: { type: "gold", amount: 4 } },
  { terrain: "plains", buildingSlots: 4, resource: { type: "food", amount: 10 } },
  { terrain: "forest", buildingSlots: 2, resource: { type: "wood", amount: 4 } },
  { terrain: "plains", buildingSlots: 3, resource: { type: "food", amount: 8 } },
  { terrain: "mountain", buildingSlots: 2, resource: { type: "stone", amount: 6 } },
  { terrain: "forest", buildingSlots: 2, resource: { type: "wood", amount: 3 } },
  { terrain: "mountain", buildingSlots: 2, resource: { type: "stone", amount: 4 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 3 } },
  { terrain: "hill", buildingSlots: 3, resource: { type: "gold", amount: 2 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 3 } },
  { terrain: "plains", buildingSlots: 3, resource: { type: "food", amount: 6 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "gold", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 3 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 4 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "gold", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 2 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "gold", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "gold", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 2 } },
  { terrain: "hill", buildingSlots: 1, resource: { type: "gold", amount: 2 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 1 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "hill", buildingSlots: 1, resource: { type: "gold", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 1 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 2 } },
  { terrain: "hill", buildingSlots: 1, resource: { type: "gold", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 1 } }
];
