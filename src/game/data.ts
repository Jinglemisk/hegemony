import type {
  BuildingDefinition,
  EventCard,
  EventTableDefinition,
  GrowablePop,
  LuxuryGoodDefinition,
  PlayerId,
  Resources,
  SettlementKind,
  Terrain,
  TileResource,
} from "./types";

export const PLAYER_IDS: PlayerId[] = ["0", "1", "2", "3"];

export const PLAYER_NAMES: Record<PlayerId, string> = {
  "0": "Damon",
  "1": "Nikos",
  "2": "Theron",
  "3": "Kyros",
};

/** Food is Step 3's 12. Wood, stone and gold are v1's 20, 10 and 10 scaled by the
 *  same two fifths the grow price fell by. */
export const STARTING_RESOURCES: Resources = {
  wood: 8,
  stone: 4,
  gold: 4,
  food: 12,
  influence: 0,
};

export const EMPTY_RESOURCES: Resources = {
  wood: 0,
  stone: 0,
  gold: 0,
  food: 0,
  influence: 0,
};

export const ACTION_COSTS = {
  foundColony: {
    wood: 4,
    food: 1,
  },
  upgradeColonyToCity: {
    wood: 3,
    stone: 3,
  },
} satisfies Record<string, Partial<Resources>>;

/** Citizens are never grown: every citizen after setup is a promoted freeman. */
export const GROW_POP_COSTS: Record<GrowablePop, Partial<Resources>> = {
  slaves: {
    food: 2,
  },
  freemen: {
    food: 3,
  },
};

export const SETTLEMENT_RULES: Record<
  SettlementKind,
  {
    popCapacity: number;
    canBuildBuildings: boolean;
  }
> = {
  capital: {
    popCapacity: 8,
    canBuildBuildings: true,
  },
  city: {
    popCapacity: 8,
    canBuildBuildings: true,
  },
  colony: {
    popCapacity: 4,
    canBuildBuildings: false,
  },
};

// ── Event tables (docs/archive/plans/event-tables.md) ────────────────────────────────────────
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
        { type: "destroyBuilding", popLossFallback: 1 },
      ],
    },
    { roll: 2, label: "Revolt spreads", effects: [{ type: "losePops", count: 2 }] },
    { roll: 3, label: "Blood in the streets", effects: [{ type: "losePops", count: 1 }] },
    {
      roll: 4,
      label: "Granary sacked",
      effects: [{ type: "loseResource", resource: "food", amount: 3 }],
    },
    {
      roll: 5,
      label: "Bribe demanded",
      effects: [{ type: "loseResource", resource: "gold", amount: 3, popLossIfShort: 1 }],
    },
    { roll: 6, label: "The mob disperses", effects: [{ type: "none" }] },
  ],
  // All three may each be bought once per riot (Q15) — full insurance shifts every
  // roll to 4+, converting catastrophe into taxation.
  insurance: [
    { id: "breadDole", label: "Bread dole", cost: { food: 4 }, modifier: 1 },
    { id: "concession", label: "Concession", cost: {}, demotesPop: true, modifier: 1 },
    { id: "patronage", label: "Patronage", cost: { influence: 3 }, modifier: 1 },
  ],
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
      {
        roll: 3,
        label: "Modest profits",
        effects: [{ type: "gainResource", resource: "gold", amount: 5 }],
      },
      {
        roll: 4,
        label: "Modest profits",
        effects: [{ type: "gainResource", resource: "gold", amount: 5 }],
      },
      {
        roll: 5,
        label: "Rich cargo returns",
        effects: [{ type: "gainResource", resource: "gold", amount: 9 }],
      },
      {
        roll: 6,
        label: "Rich cargo returns",
        effects: [{ type: "gainResource", resource: "gold", amount: 9 }],
      },
    ],
  },
  {
    id: "grandEmbassy",
    name: "Grand Embassy",
    flavor: "Envoys and gifts to a distant court.",
    rows: [
      { roll: 1, label: "Rebuffed at court", effects: [{ type: "none" }] },
      { roll: 2, label: "Rebuffed at court", effects: [{ type: "none" }] },
      {
        roll: 3,
        label: "A polite hearing",
        effects: [{ type: "gainResource", resource: "influence", amount: 3 }],
      },
      {
        roll: 4,
        label: "A polite hearing",
        effects: [{ type: "gainResource", resource: "influence", amount: 3 }],
      },
      {
        roll: 5,
        label: "An alliance of guest-friendship",
        effects: [{ type: "gainResource", resource: "influence", amount: 6 }],
      },
      {
        roll: 6,
        label: "An alliance of guest-friendship",
        effects: [{ type: "gainResource", resource: "influence", amount: 6 }],
      },
    ],
  },
  {
    id: "colonistsVoyage",
    name: "Colonists' Voyage",
    flavor: "Families and seed-grain aboard — seeking a kinder shore.",
    rows: [
      { roll: 1, label: "Storms scatter the ships", effects: [{ type: "none" }] },
      { roll: 2, label: "Storms scatter the ships", effects: [{ type: "none" }] },
      {
        roll: 3,
        label: "Provisions salvaged",
        effects: [{ type: "gainResource", resource: "food", amount: 5 }],
      },
      {
        roll: 4,
        label: "Provisions salvaged",
        effects: [{ type: "gainResource", resource: "food", amount: 5 }],
      },
      {
        roll: 5,
        label: "A bountiful landfall",
        effects: [{ type: "gainResource", resource: "food", amount: 8 }],
      },
      {
        roll: 6,
        label: "Settlers arrive",
        effects: [
          { type: "gainPop", pop: "freemen", foodFallback: 2 },
          { type: "gainResource", resource: "food", amount: 2 },
        ],
      },
    ],
  },
];

/** Either stake funds any expedition (D10). Gold-rich players pay more for the same
 *  lottery — that asymmetry IS the catch-up mechanism, watch it in the ledger. */
export const VENTURE_STAKES: Record<"gold" | "wood", Partial<Resources>> = {
  gold: { gold: 5 },
  wood: { wood: 8 },
};

/** The yearly omen (PROVISIONAL, 2026-07-13 — numbers await the user's eyes): rolled
 *  publicly by the year's opener each spring. Symmetric, modest, year-long: ±1 of one
 *  resource per income, all players — drama and table texture, never a swing. Three
 *  ill signs, three fair, so the table EV sits at ~0. */
export const OMEN_TABLE: EventTableDefinition = {
  id: "omen",
  name: "Yearly Omen",
  flavor:
    "At the year's first light the auspices are taken — one sign hangs over every polis until winter's end.",
  die: 6,
  rows: [
    {
      roll: 1,
      label: "Lean kine",
      effects: [{ type: "yearIncomeModifier", resource: "food", amount: -1 }],
    },
    {
      roll: 2,
      label: "Silent mines",
      effects: [{ type: "yearIncomeModifier", resource: "gold", amount: -1 }],
    },
    {
      roll: 3,
      label: "Blighted groves",
      effects: [{ type: "yearIncomeModifier", resource: "wood", amount: -1 }],
    },
    {
      roll: 4,
      label: "Kind rains",
      effects: [{ type: "yearIncomeModifier", resource: "food", amount: 1 }],
    },
    {
      roll: 5,
      label: "Rich seams",
      effects: [{ type: "yearIncomeModifier", resource: "stone", amount: 1 }],
    },
    {
      roll: 6,
      label: "A golden age",
      effects: [{ type: "yearIncomeModifier", resource: "gold", amount: 1 }],
    },
  ],
};

// One of each per settlement. Marketplace, Estate and Forum raise their class column
// from 1 to 2; Temple and Granary state one flat fact; the Port's fact is its claim on
// one adjacent luxury, so its effects are empty. Wood buys the economic buildings and
// stone the civic ones.
export const BUILDINGS: BuildingDefinition[] = [
  {
    id: "marketplace",
    name: "Marketplace",
    cost: { wood: 3, gold: 2 },
    effects: [{ type: "classOutput", pop: "freemen", amount: 2 }],
  },
  {
    id: "estate",
    name: "Estate",
    cost: { wood: 4 },
    effects: [{ type: "classOutput", pop: "slaves", amount: 2 }],
    needsYield: true,
  },
  {
    id: "forum",
    name: "Forum",
    cost: { stone: 3 },
    effects: [{ type: "classOutput", pop: "citizens", amount: 2 }],
  },
  {
    id: "temple",
    name: "Temple",
    cost: { stone: 3 },
    effects: [{ type: "happiness", amount: 1 }],
  },
  {
    id: "granary",
    name: "Granary",
    cost: { wood: 4 },
    effects: [{ type: "income", resource: "food", amount: 2 }],
  },
  {
    id: "port",
    name: "Port",
    cost: { gold: 4, stone: 2 },
    effects: [],
    colony: true,
  },
];

/** The six coastal luxury goods (luxury-goods.md §6, Q32 accepted). Order is the
 *  authored seating order onto the board's selected moorings. */
export const LUXURY_GOODS: LuxuryGoodDefinition[] = [
  { id: "tyrian-dye", name: "Tyrian Dye", flavour: "the murex trade" },
  { id: "pearls", name: "Pearls", flavour: "deep-water diving" },
  { id: "coral", name: "Coral", flavour: "reef harvest" },
  { id: "glassware", name: "Glassware", flavour: "eastern kilns" },
  { id: "incense", name: "Incense", flavour: "the southern routes" },
  { id: "fine-linen", name: "Fine Linen", flavour: "riverine weaving" },
];

// ── Terrain deck (v2 work slots, ruled 2026-10-01) ──────────────────────────────────
//
// 37 tiles laid onto axialRadius(3) in this authoring order (index → coord in
// `createInitialMap`). A tile prints its terrain and a slot count, nothing else. The
// slots are one pool shared by buildings and working slaves: each open slot holds one
// slave making 1 of the terrain's resource, each building takes a slot.
//
// Slot counts run 2 to 7 and follow the yields the old deck printed, so the old rich
// tiles are the big ones: plains 10→7, 8→6, 6→5, 4→4, 2→3 (38 slots); mountain
// 6→6, 4→4, 3→3, 2→3 (29); forest 4→5, 3→4, 2→3, 1→2 (51). Hills keep 3, 3, 4, 3, 3:
// their slots hold buildings and their slaves make nothing (`resource: null`). The
// oracle has no slots and cannot be settled. Landmarks (breadbasket, quarry, two
// old-growth forests) are pairwise non-adjacent on this authored "classic" board; the
// live game shuffles by default (GAME_CONFIG).
export const TERRAIN_DECK: Array<{
  terrain: Terrain;
  slots: number;
  resource: TileResource | null;
}> = [
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (-3,0)
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (-3,1)
  { terrain: "plains", slots: 3, resource: { type: "food" } }, // (-3,2)
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (-3,3)
  { terrain: "mountain", slots: 3, resource: { type: "stone" } }, // (-2,-1)
  { terrain: "mountain", slots: 4, resource: { type: "stone" } }, // (-2,0)
  { terrain: "plains", slots: 6, resource: { type: "food" } }, // (-2,1)
  { terrain: "forest", slots: 5, resource: { type: "wood" } }, // (-2,2) old-growth
  { terrain: "hill", slots: 3, resource: null }, // (-2,3)
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (-1,-2)
  { terrain: "forest", slots: 4, resource: { type: "wood" } }, // (-1,-1)
  { terrain: "hill", slots: 3, resource: null }, // (-1,0)
  { terrain: "forest", slots: 4, resource: { type: "wood" } }, // (-1,1)
  { terrain: "mountain", slots: 3, resource: { type: "stone" } }, // (-1,2)
  { terrain: "forest", slots: 2, resource: { type: "wood" } }, // (-1,3)
  { terrain: "plains", slots: 4, resource: { type: "food" } }, // (0,-3)
  { terrain: "plains", slots: 5, resource: { type: "food" } }, // (0,-2)
  { terrain: "forest", slots: 5, resource: { type: "wood" } }, // (0,-1) old-growth
  { terrain: "hill", slots: 4, resource: null }, // (0,0) — the 4-slot hill, contested centre
  { terrain: "oracle", slots: 0, resource: null }, // (0,1) — the oracle, unsettleable
  { terrain: "mountain", slots: 4, resource: { type: "stone" } }, // (0,2)
  { terrain: "plains", slots: 4, resource: { type: "food" } }, // (0,3)
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (1,-3)
  { terrain: "mountain", slots: 3, resource: { type: "stone" } }, // (1,-2)
  { terrain: "hill", slots: 3, resource: null }, // (1,-1)
  { terrain: "plains", slots: 7, resource: { type: "food" } }, // (1,0) breadbasket
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (1,1)
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (1,2)
  { terrain: "mountain", slots: 3, resource: { type: "stone" } }, // (2,-3)
  { terrain: "mountain", slots: 6, resource: { type: "stone" } }, // (2,-2) quarry
  { terrain: "forest", slots: 4, resource: { type: "wood" } }, // (2,-1)
  { terrain: "plains", slots: 5, resource: { type: "food" } }, // (2,0)
  { terrain: "hill", slots: 3, resource: null }, // (2,1)
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (3,-3)
  { terrain: "mountain", slots: 3, resource: { type: "stone" } }, // (3,-2)
  { terrain: "forest", slots: 3, resource: { type: "wood" } }, // (3,-1)
  { terrain: "plains", slots: 4, resource: { type: "food" } }, // (3,0)
];

export const SEASONAL_EVENT_CARDS: EventCard[] = [
  {
    id: "season-drought",
    deck: "seasonal",
    name: "Drought",
    count: 4,
    text: "All players get -2 Food income this season.",
    flavor: "The riverbed shows its stones, and the sky stays white.",
    seasons: ["autumn", "winter"],
    timing: "season",
    effects: [
      {
        type: "incomeModifier",
        scope: "allPlayers",
        resource: "food",
        amount: -2,
        duration: "season",
      },
    ],
  },
  {
    id: "season-bountiful-harvest",
    deck: "seasonal",
    name: "Bountiful Harvest",
    count: 4,
    text: "All players get +2 Food income this season.",
    flavor: "The carts come in loaded. The threshing floors do not empty.",
    seasons: ["summer", "autumn"],
    timing: "season",
    effects: [
      {
        type: "incomeModifier",
        scope: "allPlayers",
        resource: "food",
        amount: 2,
        duration: "season",
      },
    ],
  },
  {
    id: "season-timber-levies",
    deck: "seasonal",
    name: "Timber Levies",
    count: 3,
    text: "Each player gains 2 Wood per 6 pops, minimum 4 Wood.",
    flavor: "Every village sends its share of timber down to the yards.",
    seasons: ["spring", "summer", "winter"],
    timing: "immediate",
    effects: [
      {
        type: "scaledResourceDelta",
        scope: "allPlayers",
        resource: "wood",
        amountPerPops: 2,
        popStep: 6,
        minimum: 4,
      },
    ],
  },
  {
    id: "season-quarry-contracts",
    deck: "seasonal",
    name: "Quarry Contracts",
    count: 3,
    text: "Each player gains 2 Stone per 6 pops, minimum 4 Stone.",
    flavor: "The quarries are let out for the season, and the dust never settles.",
    seasons: ["summer", "autumn"],
    timing: "immediate",
    effects: [
      {
        type: "scaledResourceDelta",
        scope: "allPlayers",
        resource: "stone",
        amountPerPops: 2,
        popStep: 6,
        minimum: 4,
      },
    ],
  },
  {
    id: "season-grain-tithe",
    deck: "seasonal",
    name: "Grain Tithe",
    count: 3,
    text: "Each player gains 2 Food per 6 pops, minimum 4 Food.",
    flavor: "A measure from every household, sealed and counted at the gate.",
    seasons: ["spring", "autumn", "winter"],
    timing: "immediate",
    effects: [
      {
        type: "scaledResourceDelta",
        scope: "allPlayers",
        resource: "food",
        amountPerPops: 2,
        popStep: 6,
        minimum: 4,
      },
    ],
  },
  {
    id: "season-civic-anxiety",
    deck: "seasonal",
    name: "Civic Anxiety",
    count: 2,
    text: "Each player's happiness is 2 lower per 10 pops, at least 2 lower, this season.",
    flavor: "Something is wrong and nobody can name it. The porticoes stay crowded late.",
    seasons: ["winter"],
    timing: "season",
    effects: [
      {
        type: "scaledHappinessDelta",
        scope: "allPlayers",
        amountPerPops: -2,
        popStep: 10,
        minimumMagnitude: 2,
        duration: "season",
      },
    ],
  },
  {
    id: "season-festival-games",
    deck: "seasonal",
    name: "Festival Games",
    count: 2,
    text: "Each player clears an Unrest token.",
    flavor: "Oil, sand, and a whole city on the banking, shouting.",
    seasons: ["spring", "summer"],
    timing: "immediate",
    effects: [
      {
        type: "scaledHappinessDelta",
        scope: "allPlayers",
        amountPerPops: 2,
        popStep: 10,
        minimumMagnitude: 2,
      },
    ],
  },
  {
    id: "season-scarce-labor",
    deck: "seasonal",
    name: "Scarce Labor",
    count: 2,
    text: "Building costs, excluding colony founding and city upgrades, are doubled this season.",
    flavor: "The good crews are all promised elsewhere.",
    seasons: ["autumn", "winter"],
    timing: "season",
    effects: [
      {
        type: "buildingCostMultiplier",
        multiplier: 2,
        duration: "season",
        excludes: ["foundColony", "upgradeColonyToCity"],
      },
    ],
  },
  {
    id: "season-skilled-artisans",
    deck: "seasonal",
    name: "Skilled Artisans",
    count: 2,
    text: "Building costs, excluding colony founding and city upgrades, are halved this season, rounded up.",
    flavor: "Workshops full of men who have done this a hundred times.",
    seasons: ["spring", "summer"],
    timing: "season",
    effects: [
      {
        type: "buildingCostMultiplier",
        multiplier: 0.5,
        duration: "season",
        excludes: ["foundColony", "upgradeColonyToCity"],
      },
    ],
  },
  {
    id: "season-open-markets",
    deck: "seasonal",
    name: "Open Markets",
    count: 2,
    text: "All players get +2 Gold income this season.",
    flavor: "Foreign sails in the harbour, and the quays stay busy past dusk.",
    seasons: ["summer", "autumn"],
    timing: "season",
    effects: [
      {
        type: "incomeModifier",
        scope: "allPlayers",
        resource: "gold",
        amount: 2,
        duration: "season",
      },
    ],
  },
  {
    id: "season-plague",
    deck: "seasonal",
    name: "Plague",
    count: 2,
    text: "Every player places an Unrest token.",
    flavor: "Sickness spreads.",
    seasons: ["autumn", "winter"],
    timing: "immediate",
    effects: [{ type: "timedHappinessDelta", scope: "allPlayers", amountPerTurn: -2, turns: 3 }],
  },
  {
    // Ledger issue 10: no season is auto-safe. Spring keeps its boon tendency — this
    // is the one cloud in it.
    id: "season-spring-floods",
    deck: "seasonal",
    name: "Spring Floods",
    count: 2,
    text: "All players lose 3 Food.",
    flavor: "The rivers burst their banks.",
    seasons: ["spring"],
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "allPlayers", resource: "food", amount: -3 }],
  },
  {
    id: "season-wildfire",
    deck: "seasonal",
    name: "Wildfire",
    count: 2,
    text: "All players get -2 Wood income this season.",
    flavor: "Tinder-dry groves burn.",
    seasons: ["summer"],
    timing: "season",
    effects: [
      {
        type: "incomeModifier",
        scope: "allPlayers",
        resource: "wood",
        amount: -2,
        duration: "season",
      },
    ],
  },
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
    flavor: "A name goes onto the roll. The neighbours stand witness.",
    timing: "pendingChoice",
    effects: [
      { type: "addPops", pop: "citizens", amount: 1, target: "ownedSettlementWithCapacity" },
    ],
  },
  {
    id: "player-free-settlers",
    deck: "player",
    name: "Free Settlers",
    count: 4,
    text: "Add 1 freeman to one owned settlement with available capacity.",
    flavor: "They came over the pass with their tools on their backs.",
    timing: "pendingChoice",
    effects: [
      { type: "addPops", pop: "freemen", amount: 1, target: "ownedSettlementWithCapacity" },
    ],
  },
  {
    id: "player-captured-laborers",
    deck: "player",
    name: "Captured Laborers",
    count: 3,
    text: "Add 2 slaves to one owned settlement with available capacity.",
    flavor: "A column comes up from the harbour, roped at the wrist.",
    timing: "pendingChoice",
    effects: [{ type: "addPops", pop: "slaves", amount: 2, target: "ownedSettlementWithCapacity" }],
  },
  {
    id: "player-willing-hands",
    deck: "player",
    name: "Willing Hands",
    count: 4,
    text: "The next freeman grown this turn costs -4 Food.",
    flavor: "Landless families seek a plot.",
    timing: "immediate",
    effects: [
      {
        type: "actionCostDiscount",
        action: "growPop",
        pop: "freemen",
        resource: "food",
        amount: 4,
        duration: "turn",
        consume: "nextMatchingAction",
      },
    ],
  },
  {
    id: "player-slave-auction",
    deck: "player",
    name: "Slave Auction",
    count: 3,
    text: "The next slave grown this turn costs -3 Food.",
    flavor: "The block clears cheap.",
    timing: "immediate",
    effects: [
      {
        type: "actionCostDiscount",
        action: "growPop",
        pop: "slaves",
        resource: "food",
        amount: 3,
        duration: "turn",
        consume: "nextMatchingAction",
      },
    ],
  },
  {
    id: "player-good-stores",
    deck: "player",
    name: "Good Stores",
    count: 4,
    text: "Gain 3 Food.",
    flavor: "The jars in the cellar are heavier than anyone remembered.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "food", amount: 3 }],
  },
  {
    id: "player-timber-windfall",
    deck: "player",
    name: "Timber Windfall",
    count: 4,
    text: "Gain 3 Wood.",
    flavor: "The storm felled the ridge pines. The crews only had to haul.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 3 }],
  },
  {
    id: "player-merchant-profit",
    deck: "player",
    name: "Merchant Profit",
    count: 4,
    text: "Gain 3 Gold.",
    flavor: "A ship comes in early, and the price holds.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 3 }],
  },
  {
    id: "player-stone-shipment",
    deck: "player",
    name: "Stone Shipment",
    count: 4,
    text: "Gain 3 Stone.",
    flavor: "Ox-carts grind up from the quarry road all morning.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "stone", amount: 3 }],
  },
  {
    id: "player-local-unrest",
    deck: "player",
    name: "Local Unrest",
    count: 4,
    text: "Place an Unrest token.",
    flavor: "Voices in the agora, and none of them yours.",
    timing: "immediate",
    effects: [{ type: "happinessDelta", scope: "activePlayer", amount: -2 }],
  },
  {
    id: "player-public-calm",
    deck: "player",
    name: "Public Calm",
    count: 4,
    text: "Clear an Unrest token.",
    flavor: "Quiet streets. The market keeps its ordinary hours.",
    timing: "immediate",
    effects: [{ type: "happinessDelta", scope: "activePlayer", amount: 2 }],
  },
  {
    id: "player-civil-discord",
    deck: "player",
    name: "Civil Discord",
    count: 3,
    text: "Place an Unrest token.",
    flavor: "The wells crack. The assembly mutters.",
    timing: "immediate",
    effects: [{ type: "timedHappinessDelta", scope: "activePlayer", amountPerTurn: -2, turns: 3 }],
  },
  {
    id: "player-granary-rats",
    deck: "player",
    name: "Granary Rats",
    count: 5,
    text: "Lose 3 Food.",
    flavor: "Rats find the grain stores.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "food", amount: -3 }],
  },
  {
    id: "player-banditry",
    deck: "player",
    name: "Banditry",
    count: 3,
    text: "Lose 4 Gold.",
    flavor: "Bandits prey on the mountain roads.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: -4 }],
  },
  {
    id: "player-warehouse-fire",
    deck: "player",
    name: "Warehouse Fire",
    count: 4,
    text: "Lose 5 Wood.",
    flavor: "Fire guts a waterfront warehouse.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: -5 }],
  },
  {
    id: "player-quarry-collapse",
    deck: "player",
    name: "Quarry Collapse",
    count: 2,
    text: "Lose 3 Stone and place an Unrest token.",
    flavor: "A gallery falls in.",
    timing: "immediate",
    effects: [
      { type: "resourceDelta", scope: "activePlayer", resource: "stone", amount: -3 },
      { type: "happinessDelta", scope: "activePlayer", amount: -1 },
    ],
  },
  {
    id: "player-patronage-network",
    deck: "player",
    name: "Patronage Network",
    count: 3,
    text: "Gain 3 Influence.",
    flavor: "Favours owed, and the right men remember them.",
    timing: "immediate",
    effects: [{ type: "resourceDelta", scope: "activePlayer", resource: "influence", amount: 3 }],
  },
  {
    id: "player-emergency-labor",
    deck: "player",
    name: "Emergency Labor",
    count: 3,
    text: "Gain 6 Wood and place an Unrest token, or gain 2 Wood with no penalty.",
    flavor: "Every hand that can hold an axe is sent up to the trees.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [
            { type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 6 },
            { type: "happinessDelta", scope: "activePlayer", amount: -1 },
          ],
          [{ type: "resourceDelta", scope: "activePlayer", resource: "wood", amount: 2 }],
        ],
      },
    ],
  },
  {
    id: "player-granary-surplus",
    deck: "player",
    name: "Granary Surplus",
    count: 3,
    text: "Gain 4 Food, or add 1 freeman to a settlement with available capacity.",
    flavor: "The threshing floor is still full at the end of the day.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "food", amount: 4 }],
          [{ type: "addPops", pop: "freemen", amount: 1, target: "ownedSettlementWithCapacity" }],
        ],
      },
    ],
  },
  {
    id: "player-civic-petition",
    deck: "player",
    name: "Civic Petition",
    count: 3,
    text: "Gain 2 Influence, or clear an Unrest token.",
    flavor: "A wax tablet passes down the benches, gathering names.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "influence", amount: 2 }],
          [{ type: "happinessDelta", scope: "activePlayer", amount: 2 }],
        ],
      },
    ],
  },
  {
    id: "player-skilled-mason",
    deck: "player",
    name: "Skilled Mason",
    count: 2,
    text: "Gain 4 Stone, or the next building built this turn costs -5 Stone.",
    flavor: "He squints along the course, and the stones go true.",
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
              consume: "nextMatchingAction",
            },
          ],
        ],
      },
    ],
  },
  {
    id: "player-caravan-contacts",
    deck: "player",
    name: "Caravan Contacts",
    count: 2,
    text: "Gain 4 Gold, or exchange up to 4 Wood for 6 Gold.",
    flavor: "Dust on the inland road. They know your name at the far end of it.",
    timing: "pendingChoice",
    effects: [
      {
        type: "choice",
        options: [
          [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 4 }],
          [{ type: "resourceExchange", from: "wood", to: "gold", maxAmount: 4, ratio: 1.5 }],
        ],
      },
    ],
  },
  {
    id: "player-forest-crews",
    deck: "player",
    name: "Forest Crews",
    count: 2,
    text: "Gain 4 Wood, or the next colony founded this turn costs -6 Wood.",
    flavor: "Axes ring on the slope from first light.",
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
              consume: "nextMatchingAction",
            },
          ],
        ],
      },
    ],
  },
  {
    id: "player-temple-donation",
    deck: "player",
    name: "Temple Donation",
    count: 1,
    text: "Clear an Unrest token, or the next Temple built this turn costs -5 Stone.",
    flavor: "The god's house gets its share, and the city watches you give it.",
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
              consume: "nextMatchingAction",
            },
          ],
        ],
      },
    ],
  },
  {
    id: "player-market-day",
    deck: "player",
    name: "Market Day",
    count: 1,
    text: "Gain 3 Gold, or gain 1 Gold per freeman, minimum 2 Gold.",
    flavor: "Awnings up before dawn, and the whole town smelling of fish and oil.",
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
              minimum: 2,
            },
          ],
        ],
      },
    ],
  },
];
