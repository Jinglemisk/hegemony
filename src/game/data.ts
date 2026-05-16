import type { BuildingId, PlayerId, Resources, Terrain, Yield } from "./types";

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
  unrest: 0
};

export const EMPTY_RESOURCES: Resources = {
  wood: 0,
  stone: 0,
  gold: 0,
  food: 0,
  influence: 0,
  unrest: 0
};

export const BUILDINGS: Array<{
  id: BuildingId;
  name: string;
  cost: Partial<Resources>;
  description: string;
}> = [
  {
    id: "marketplace",
    name: "Marketplace",
    cost: { wood: 12 },
    description: "Adds 1 freeman to the city."
  },
  {
    id: "temple",
    name: "Temple",
    cost: { stone: 6 },
    description: "Adds 1 citizen to the city."
  },
  {
    id: "workshop",
    name: "Workshop",
    cost: { wood: 12 },
    description: "Adds 2 slaves to the city."
  },
  {
    id: "granary",
    name: "Granary",
    cost: { wood: 12, stone: 2 },
    description: "Adds 2 food income to the city."
  }
];

export const TERRAIN_DECK: Array<{ terrain: Terrain; buildingSlots: number; resource: Yield }> = [
  { terrain: "mountain", buildingSlots: 2, resource: { type: "stone", amount: 6 } },
  { terrain: "mountain", buildingSlots: 2, resource: { type: "stone", amount: 4 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 4 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 2 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 2 } },
  { terrain: "mountain", buildingSlots: 1, resource: { type: "stone", amount: 2 } },
  { terrain: "hill", buildingSlots: 3, resource: { type: "stone", amount: 4 } },
  { terrain: "hill", buildingSlots: 3, resource: { type: "food", amount: 2 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "stone", amount: 1 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "stone", amount: 1 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "food", amount: 1 } },
  { terrain: "hill", buildingSlots: 2, resource: { type: "food", amount: 1 } },
  { terrain: "hill", buildingSlots: 1, resource: { type: "stone", amount: 2 } },
  { terrain: "hill", buildingSlots: 1, resource: { type: "food", amount: 1 } },
  { terrain: "hill", buildingSlots: 1, resource: { type: "food", amount: 1 } },
  { terrain: "forest", buildingSlots: 2, resource: { type: "wood", amount: 4 } },
  { terrain: "forest", buildingSlots: 2, resource: { type: "wood", amount: 4 } },
  { terrain: "forest", buildingSlots: 2, resource: { type: "wood", amount: 3 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 3 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 3 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 3 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "wood", amount: 2 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "food", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "food", amount: 1 } },
  { terrain: "forest", buildingSlots: 1, resource: { type: "food", amount: 1 } },
  { terrain: "plains", buildingSlots: 4, resource: { type: "food", amount: 10 } },
  { terrain: "plains", buildingSlots: 3, resource: { type: "food", amount: 8 } },
  { terrain: "plains", buildingSlots: 3, resource: { type: "food", amount: 6 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } },
  { terrain: "plains", buildingSlots: 2, resource: { type: "food", amount: 4 } }
];
