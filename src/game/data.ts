import type { BuildingDefinition, EventCard, PlayerId, PopType, Resources, SettlementKind, Terrain, Yield } from "./types";

export const PLAYER_IDS: PlayerId[] = ["0", "1", "2", "3"];

export const PLAYER_NAMES: Record<PlayerId, string> = {
  "0": "Damon",
  "1": "Nikos",
  "2": "Theron",
  "3": "Kyros"
};

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

export const SEASONAL_EVENT_CARDS: EventCard[] = [
  {
    id: "season-drought",
    deck: "seasonal",
    name: "Drought",
    count: 4,
    text: "All players get -2 Food income this season.",
    timing: "season",
    effects: [{ type: "incomeModifier", scope: "allPlayers", resource: "food", amount: -2, duration: "season" }]
  },
  {
    id: "season-bountiful-harvest",
    deck: "seasonal",
    name: "Bountiful Harvest",
    count: 4,
    text: "All players get +2 Food income this season.",
    timing: "season",
    effects: [{ type: "incomeModifier", scope: "allPlayers", resource: "food", amount: 2, duration: "season" }]
  },
  {
    id: "season-timber-levies",
    deck: "seasonal",
    name: "Timber Levies",
    count: 3,
    text: "Each player gains 2 Wood per 6 pops, minimum 4 Wood.",
    timing: "immediate",
    effects: [
      { type: "scaledResourceDelta", scope: "allPlayers", resource: "wood", amountPerPops: 2, popStep: 6, minimum: 4 }
    ]
  },
  {
    id: "season-quarry-contracts",
    deck: "seasonal",
    name: "Quarry Contracts",
    count: 3,
    text: "Each player gains 2 Stone per 6 pops, minimum 4 Stone.",
    timing: "immediate",
    effects: [
      { type: "scaledResourceDelta", scope: "allPlayers", resource: "stone", amountPerPops: 2, popStep: 6, minimum: 4 }
    ]
  },
  {
    id: "season-grain-tithe",
    deck: "seasonal",
    name: "Grain Tithe",
    count: 3,
    text: "Each player gains 2 Food per 6 pops, minimum 4 Food.",
    timing: "immediate",
    effects: [
      { type: "scaledResourceDelta", scope: "allPlayers", resource: "food", amountPerPops: 2, popStep: 6, minimum: 4 }
    ]
  },
  {
    id: "season-civic-anxiety",
    deck: "seasonal",
    name: "Civic Anxiety",
    count: 2,
    text: "Each player suffers -2 Happiness per 10 pops, minimum -2, during income collection this season.",
    timing: "season",
    effects: [
      {
        type: "scaledHappinessDelta",
        scope: "allPlayers",
        amountPerPops: -2,
        popStep: 10,
        minimumMagnitude: 2,
        duration: "season"
      }
    ]
  },
  {
    id: "season-festival-games",
    deck: "seasonal",
    name: "Festival Games",
    count: 2,
    text: "Each player gains 2 Happiness per 10 pops, minimum 2 Happiness.",
    timing: "immediate",
    effects: [
      { type: "scaledHappinessDelta", scope: "allPlayers", amountPerPops: 2, popStep: 10, minimumMagnitude: 2 }
    ]
  },
  {
    id: "season-scarce-labor",
    deck: "seasonal",
    name: "Scarce Labor",
    count: 2,
    text: "Building costs, excluding colony founding and city upgrades, are doubled this season.",
    timing: "season",
    effects: [
      {
        type: "buildingCostMultiplier",
        multiplier: 2,
        duration: "season",
        excludes: ["foundColony", "upgradeColonyToCity"]
      }
    ]
  },
  {
    id: "season-skilled-artisans",
    deck: "seasonal",
    name: "Skilled Artisans",
    count: 2,
    text: "Building costs, excluding colony founding and city upgrades, are halved this season, rounded up.",
    timing: "season",
    effects: [
      {
        type: "buildingCostMultiplier",
        multiplier: 0.5,
        duration: "season",
        excludes: ["foundColony", "upgradeColonyToCity"]
      }
    ]
  },
  {
    id: "season-open-markets",
    deck: "seasonal",
    name: "Open Markets",
    count: 2,
    text: "All players get +2 Gold income this season.",
    timing: "season",
    effects: [{ type: "incomeModifier", scope: "allPlayers", resource: "gold", amount: 2, duration: "season" }]
  }
];

export const PLAYER_EVENT_CARDS: EventCard[] = [
  {
    id: "player-new-citizen",
    deck: "player",
    name: "New Citizen",
    count: 8,
    text: "Add 1 citizen to one owned settlement with available capacity.",
    timing: "pendingChoice",
    effects: [{ type: "addPops", pop: "citizens", amount: 1, target: "ownedSettlementWithCapacity" }]
  },
  {
    id: "player-free-settlers",
    deck: "player",
    name: "Free Settlers",
    count: 8,
    text: "Add 1 freeman to one owned settlement with available capacity.",
    timing: "pendingChoice",
    effects: [{ type: "addPops", pop: "freemen", amount: 1, target: "ownedSettlementWithCapacity" }]
  },
  {
    id: "player-captured-laborers",
    deck: "player",
    name: "Captured Laborers",
    count: 6,
    text: "Add 2 slaves to one owned settlement with available capacity.",
    timing: "pendingChoice",
    effects: [{ type: "addPops", pop: "slaves", amount: 2, target: "ownedSettlementWithCapacity" }]
  },
  {
    id: "player-good-stores",
    deck: "player",
    name: "Good Stores",
    count: 6,
    text: "Gain 3 Food.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "food", amount: 3 }]
  },
  {
    id: "player-timber-windfall",
    deck: "player",
    name: "Timber Windfall",
    count: 6,
    text: "Gain 5 Wood.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 5 }]
  },
  {
    id: "player-merchant-profit",
    deck: "player",
    name: "Merchant Profit",
    count: 5,
    text: "Gain 5 Gold.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 5 }]
  },
  {
    id: "player-stone-shipment",
    deck: "player",
    name: "Stone Shipment",
    count: 5,
    text: "Gain 5 Stone.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "stone", amount: 5 }]
  },
  {
    id: "player-local-unrest",
    deck: "player",
    name: "Local Unrest",
    count: 4,
    text: "Lose 2 Happiness.",
    timing: "immediate",
    effects: [{ type: "happinessDelta", scope: "activePlayer", amount: -2 }]
  },
  {
    id: "player-public-calm",
    deck: "player",
    name: "Public Calm",
    count: 4,
    text: "Gain 2 Happiness.",
    timing: "immediate",
    effects: [{ type: "happinessDelta", scope: "activePlayer", amount: 2 }]
  },
  {
    id: "player-patronage-network",
    deck: "player",
    name: "Patronage Network",
    count: 3,
    text: "Gain 3 Influence.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "influence", amount: 3 }]
  },
  {
    id: "player-emergency-labor",
    deck: "player",
    name: "Emergency Labor",
    count: 3,
    text: "Gain 6 Wood and lose 1 Happiness, or gain 2 Wood with no penalty.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [
            { type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 6 },
            { type: "happinessDelta", scope: "activePlayer", amount: -1 }
          ],
          [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 2 }]
        ]
      }
    ]
  },
  {
    id: "player-granary-surplus",
    deck: "player",
    name: "Granary Surplus",
    count: 3,
    text: "Gain 4 Food, or add 1 freeman to a settlement with available capacity.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "food", amount: 4 }],
          [{ type: "addPops", pop: "freemen", amount: 1, target: "ownedSettlementWithCapacity" }]
        ]
      }
    ]
  },
  {
    id: "player-civic-petition",
    deck: "player",
    name: "Civic Petition",
    count: 3,
    text: "Gain 2 Influence, or gain 2 Happiness.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "influence", amount: 2 }],
          [{ type: "happinessDelta", scope: "activePlayer", amount: 2 }]
        ]
      }
    ]
  },
  {
    id: "player-skilled-mason",
    deck: "player",
    name: "Skilled Mason",
    count: 2,
    text: "Gain 4 Stone, or the next building built this turn costs -3 Stone.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "stone", amount: 4 }],
          [
            {
              type: "actionCostDiscount",
              action: "buildBuilding",
              resource: "stone",
              amount: 3,
              duration: "turn",
              consume: "nextMatchingAction"
            }
          ]
        ]
      }
    ]
  },
  {
    id: "player-caravan-contacts",
    deck: "player",
    name: "Caravan Contacts",
    count: 2,
    text: "Gain 4 Gold, or exchange up to 4 Wood for 4 Gold.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 4 }],
          [{ type: "resourceExchange", from: "wood", to: "gold", maxAmount: 4, ratio: 1 }]
        ]
      }
    ]
  },
  {
    id: "player-forest-crews",
    deck: "player",
    name: "Forest Crews",
    count: 2,
    text: "Gain 4 Wood, or the next colony founded this turn costs -4 Wood.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 4 }],
          [
            {
              type: "actionCostDiscount",
              action: "foundColony",
              resource: "wood",
              amount: 4,
              duration: "turn",
              consume: "nextMatchingAction"
            }
          ]
        ]
      }
    ]
  },
  {
    id: "player-temple-donation",
    deck: "player",
    name: "Temple Donation",
    count: 1,
    text: "Gain 3 Happiness, or the next Temple built this turn costs -3 Stone.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "happinessDelta", scope: "activePlayer", amount: 3 }],
          [
            {
              type: "actionCostDiscount",
              action: "buildBuilding",
              buildingId: "temple",
              resource: "stone",
              amount: 3,
              duration: "turn",
              consume: "nextMatchingAction"
            }
          ]
        ]
      }
    ]
  },
  {
    id: "player-market-day",
    deck: "player",
    name: "Market Day",
    count: 1,
    text: "Gain 3 Gold, or gain 1 Gold per freeman, minimum 2 Gold.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 3 }],
          [
            {
              type: "resourceDeltaPerPop",
              scope: "activePlayer",
              resource: "gold",
              pop: "freemen",
              amountPerPop: 1,
              minimum: 2
            }
          ]
        ]
      }
    ]
  }
];
