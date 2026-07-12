import type {
  BuildingDefinition,
  EventCard,
  EventTableDefinition,
  PlayerId,
  PopType,
  Resources,
  SettlementKind,
  Terrain,
  Yield
} from "./types";

export const PLAYER_IDS: PlayerId[] = ["0", "1", "2", "3"];

export const PLAYER_NAMES: Record<PlayerId, string> = {
  "0": "Damon",
  "1": "Nikos",
  "2": "Theron",
  "3": "Kyros"
};

export const PLAYER_COLORS: Record<PlayerId, string> = {
  "0": "#1e3a8a",
  "1": "#eab308",
  "2": "#7c3aed",
  "3": "#c1121f"
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
    popCapacity: 10,
    buildingSlotBonus: 2,
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

// ── Event tables (docs/feat/event-tables.md) ────────────────────────────────────────
//
// Content data for the dice-table component. Adding a table here (plus a trigger)
// is the whole cost of a new one — the engine seam and the modal are shared.

/** The riot table (roadmap-appendix D9, rows 1–2 swapped per Q15 so severity falls
 *  monotonically — building destruction is worse than two pops, so it sits on the 1). */
export const RIOT_TABLE: EventTableDefinition = {
  id: "riot",
  name: "Riot",
  flavor: "The agora fills with angry voices. Declare your concessions before the dice decide.",
  rows: [
    {
      roll: 1,
      label: "The mob torches the works",
      effects: [
        { type: "losePops", count: 1 },
        { type: "destroyBuilding", popLossFallback: 1 }
      ]
    },
    { roll: 2, label: "Revolt spreads", effects: [{ type: "losePops", count: 2 }] },
    { roll: 3, label: "Blood in the streets", effects: [{ type: "losePops", count: 1 }] },
    { roll: 4, label: "Granary sacked", effects: [{ type: "loseResource", resource: "food", amount: 6 }] },
    {
      roll: 5,
      label: "Bribe demanded",
      effects: [{ type: "loseResource", resource: "gold", amount: 6, popLossIfShort: 1 }]
    },
    { roll: 6, label: "The mob disperses", effects: [{ type: "none" }] }
  ],
  // All three may each be bought once per riot (Q15) — full insurance shifts every
  // mild-tier roll to 4+, converting catastrophe into taxation. Severe (−2) still bites.
  insurance: [
    { id: "breadDole", label: "Bread dole", cost: { food: 4 }, modifier: 1 },
    { id: "concession", label: "Concession", cost: {}, demotesPop: true, modifier: 1 },
    { id: "patronage", label: "Patronage", cost: { influence: 3 }, modifier: 1 }
  ]
};

/** The three expeditions (D10/Q16): player picks one per venture, each ~−7% EV in
 *  gold-equivalents. The Colonists' pop payout is deliberately a jackpot (a 6 only) —
 *  it is a second pop faucet around the grow-pop throttle, so it must stay rare. */
export const EXPEDITION_TABLES: EventTableDefinition[] = [
  {
    id: "merchantConvoy",
    name: "Merchant Convoy",
    flavor: "Amphorae for the Tyrrhenian markets — if the sea allows.",
    rows: [
      { roll: 1, label: "Lost at sea", effects: [{ type: "none" }] },
      { roll: 2, label: "Pirates take the cargo", effects: [{ type: "none" }] },
      { roll: 3, label: "Modest profits", effects: [{ type: "gainResource", resource: "gold", amount: 5 }] },
      { roll: 4, label: "Modest profits", effects: [{ type: "gainResource", resource: "gold", amount: 5 }] },
      { roll: 5, label: "Rich cargo returns", effects: [{ type: "gainResource", resource: "gold", amount: 9 }] },
      { roll: 6, label: "Rich cargo returns", effects: [{ type: "gainResource", resource: "gold", amount: 9 }] }
    ]
  },
  {
    id: "grandEmbassy",
    name: "Grand Embassy",
    flavor: "Envoys and gifts to a distant court.",
    rows: [
      { roll: 1, label: "Rebuffed at court", effects: [{ type: "none" }] },
      { roll: 2, label: "Rebuffed at court", effects: [{ type: "none" }] },
      { roll: 3, label: "A polite hearing", effects: [{ type: "gainResource", resource: "influence", amount: 3 }] },
      { roll: 4, label: "A polite hearing", effects: [{ type: "gainResource", resource: "influence", amount: 3 }] },
      { roll: 5, label: "An alliance of guest-friendship", effects: [{ type: "gainResource", resource: "influence", amount: 6 }] },
      { roll: 6, label: "An alliance of guest-friendship", effects: [{ type: "gainResource", resource: "influence", amount: 6 }] }
    ]
  },
  {
    id: "colonistsVoyage",
    name: "Colonists' Voyage",
    flavor: "Families and seed-grain aboard — seeking a kinder shore.",
    rows: [
      { roll: 1, label: "Storms scatter the ships", effects: [{ type: "none" }] },
      { roll: 2, label: "Storms scatter the ships", effects: [{ type: "none" }] },
      { roll: 3, label: "Provisions salvaged", effects: [{ type: "gainResource", resource: "food", amount: 5 }] },
      { roll: 4, label: "Provisions salvaged", effects: [{ type: "gainResource", resource: "food", amount: 5 }] },
      { roll: 5, label: "A bountiful landfall", effects: [{ type: "gainResource", resource: "food", amount: 8 }] },
      {
        roll: 6,
        label: "Settlers arrive",
        effects: [
          { type: "gainPop", pop: "freemen", foodFallback: 2 },
          { type: "gainResource", resource: "food", amount: 2 }
        ]
      }
    ]
  }
];

/** Either stake funds any expedition (D10). Gold-rich players pay more for the same
 *  lottery — that asymmetry IS the catch-up mechanism, watch it in the ledger. */
export const VENTURE_STAKES: Record<"gold" | "wood", Partial<Resources>> = {
  gold: { gold: 5 },
  wood: { wood: 8 }
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
    seasons: ["autumn", "winter"],
    timing: "season",
    effects: [{ type: "incomeModifier", scope: "allPlayers", resource: "food", amount: -2, duration: "season" }]
  },
  {
    id: "season-bountiful-harvest",
    deck: "seasonal",
    name: "Bountiful Harvest",
    count: 4,
    text: "All players get +2 Food income this season.",
    seasons: ["summer", "autumn"],
    timing: "season",
    effects: [{ type: "incomeModifier", scope: "allPlayers", resource: "food", amount: 2, duration: "season" }]
  },
  {
    id: "season-timber-levies",
    deck: "seasonal",
    name: "Timber Levies",
    count: 3,
    text: "Each player gains 2 Wood per 6 pops, minimum 4 Wood.",
    seasons: ["spring", "summer", "winter"],
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
    seasons: ["summer", "autumn"],
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
    seasons: ["spring", "autumn", "winter"],
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
    seasons: ["winter"],
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
    seasons: ["spring", "summer"],
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
    seasons: ["autumn", "winter"],
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
    seasons: ["spring", "summer"],
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
    seasons: ["summer", "autumn"],
    timing: "season",
    effects: [{ type: "incomeModifier", scope: "allPlayers", resource: "gold", amount: 2, duration: "season" }]
  },
  {
    id: "season-plague",
    deck: "seasonal",
    name: "Plague",
    count: 2,
    text: "Sickness spreads: every player loses 2 Happiness at the start of each of their next 3 turns.",
    seasons: ["autumn", "winter"],
    timing: "immediate",
    effects: [{ type: "timedHappinessDelta", scope: "allPlayers", amountPerTurn: -2, turns: 3 }]
  },
  {
    // Ledger issue 10: no season is auto-safe. Spring keeps its boon tendency — this
    // is the one cloud in it.
    id: "season-spring-floods",
    deck: "seasonal",
    name: "Spring Floods",
    count: 2,
    text: "The rivers burst their banks: all players lose 3 Food.",
    seasons: ["spring"],
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "allPlayers", resource: "food", amount: -3 }]
  },
  {
    id: "season-wildfire",
    deck: "seasonal",
    name: "Wildfire",
    count: 2,
    text: "Tinder-dry groves burn: all players get -2 Wood income this season.",
    seasons: ["summer"],
    timing: "season",
    effects: [{ type: "incomeModifier", scope: "allPlayers", resource: "wood", amount: -2, duration: "season" }]
  }
];

// ── Player deck (deck overhaul, ledger issues 5/10/12) ──────────────────────────────
//
// Tuning contract, guarded by src/game/deck.test.ts: EV ≈ +2 resource-equivalents
// per draw and ~25% harm copies. Free-pop copies were halved into grow coupons
// (half-cost `actionCostDiscount` on growPop) so windfall population re-couples to
// food and capacity instead of bypassing both.

export const PLAYER_EVENT_CARDS: EventCard[] = [
  {
    id: "player-new-citizen",
    deck: "player",
    name: "New Citizen",
    count: 4,
    text: "Add 1 citizen to one owned settlement with available capacity.",
    timing: "pendingChoice",
    effects: [{ type: "addPops", pop: "citizens", amount: 1, target: "ownedSettlementWithCapacity" }]
  },
  {
    id: "player-free-settlers",
    deck: "player",
    name: "Free Settlers",
    count: 4,
    text: "Add 1 freeman to one owned settlement with available capacity.",
    timing: "pendingChoice",
    effects: [{ type: "addPops", pop: "freemen", amount: 1, target: "ownedSettlementWithCapacity" }]
  },
  {
    id: "player-captured-laborers",
    deck: "player",
    name: "Captured Laborers",
    count: 3,
    text: "Add 2 slaves to one owned settlement with available capacity.",
    timing: "pendingChoice",
    effects: [{ type: "addPops", pop: "slaves", amount: 2, target: "ownedSettlementWithCapacity" }]
  },
  {
    id: "player-citizenship-rolls",
    deck: "player",
    name: "Citizenship Rolls",
    count: 4,
    text: "The archon opens the rolls: the next citizen grown this turn costs -5 Food and -1 Gold.",
    timing: "immediate",
    effects: [
      {
        type: "actionCostDiscount",
        action: "growPop",
        pop: "citizens",
        resource: "food",
        amount: 5,
        duration: "turn",
        consume: "nextMatchingAction"
      },
      {
        type: "actionCostDiscount",
        action: "growPop",
        pop: "citizens",
        resource: "gold",
        amount: 1,
        duration: "turn",
        consume: "nextMatchingAction"
      }
    ]
  },
  {
    id: "player-willing-hands",
    deck: "player",
    name: "Willing Hands",
    count: 4,
    text: "Landless families seek a plot: the next freeman grown this turn costs -4 Food.",
    timing: "immediate",
    effects: [
      {
        type: "actionCostDiscount",
        action: "growPop",
        pop: "freemen",
        resource: "food",
        amount: 4,
        duration: "turn",
        consume: "nextMatchingAction"
      }
    ]
  },
  {
    id: "player-slave-auction",
    deck: "player",
    name: "Slave Auction",
    count: 3,
    text: "The block clears cheap: the next slave grown this turn costs -3 Food.",
    timing: "immediate",
    effects: [
      {
        type: "actionCostDiscount",
        action: "growPop",
        pop: "slaves",
        resource: "food",
        amount: 3,
        duration: "turn",
        consume: "nextMatchingAction"
      }
    ]
  },
  {
    id: "player-good-stores",
    deck: "player",
    name: "Good Stores",
    count: 4,
    text: "Gain 3 Food.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "food", amount: 3 }]
  },
  {
    id: "player-timber-windfall",
    deck: "player",
    name: "Timber Windfall",
    count: 4,
    text: "Gain 3 Wood.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 3 }]
  },
  {
    id: "player-merchant-profit",
    deck: "player",
    name: "Merchant Profit",
    count: 4,
    text: "Gain 3 Gold.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 3 }]
  },
  {
    id: "player-stone-shipment",
    deck: "player",
    name: "Stone Shipment",
    count: 4,
    text: "Gain 3 Stone.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "stone", amount: 3 }]
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
    id: "player-civil-discord",
    deck: "player",
    name: "Civil Discord",
    count: 3,
    text: "Lose 2 Happiness at the start of each of your next 3 turns.",
    timing: "immediate",
    effects: [{ type: "timedHappinessDelta", scope: "activePlayer", amountPerTurn: -2, turns: 3 }]
  },
  {
    id: "player-granary-rats",
    deck: "player",
    name: "Granary Rats",
    count: 5,
    text: "Rats find the grain stores. Lose 3 Food.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "food", amount: -3 }]
  },
  {
    id: "player-banditry",
    deck: "player",
    name: "Banditry",
    count: 3,
    text: "Bandits prey on the mountain roads. Lose 4 Gold.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: -4 }]
  },
  {
    id: "player-warehouse-fire",
    deck: "player",
    name: "Warehouse Fire",
    count: 4,
    text: "Fire guts a waterfront warehouse. Lose 5 Wood.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: -5 }]
  },
  {
    id: "player-quarry-collapse",
    deck: "player",
    name: "Quarry Collapse",
    count: 2,
    text: "A gallery falls in. Lose 3 Stone and 1 Happiness.",
    timing: "immediate",
    effects: [
      { type: "resourceDelta", scope: "activePlayer", resource: "stone", amount: -3 },
      { type: "happinessDelta", scope: "activePlayer", amount: -1 }
    ]
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
    text: "Gain 4 Stone, or the next building built this turn costs -5 Stone.",
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
              amount: 5,
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
    text: "Gain 4 Gold, or exchange up to 4 Wood for 6 Gold.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 4 }],
          [{ type: "resourceExchange", from: "wood", to: "gold", maxAmount: 4, ratio: 1.5 }]
        ]
      }
    ]
  },
  {
    id: "player-forest-crews",
    deck: "player",
    name: "Forest Crews",
    count: 2,
    text: "Gain 4 Wood, or the next colony founded this turn costs -6 Wood.",
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
              amount: 6,
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
    text: "Gain 3 Happiness, or the next Temple built this turn costs -5 Stone.",
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
              amount: 5,
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
