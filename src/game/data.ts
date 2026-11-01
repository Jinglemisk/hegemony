import type {
  BuildingDefinition,
  DevCard,
  EventCard,
  YearCard,
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
  // All three may each be bought once per riot (Q15). Full insurance shifts every roll
  // to 4+: no pop is lost outright, though row 5 still takes one from a seat that
  // cannot pay its 3 gold.
  insurance: [
    { id: "breadDole", label: "Bread dole", cost: { food: 4 }, modifier: 1 },
    { id: "concession", label: "Concession", cost: {}, demotesPop: true, modifier: 1 },
    { id: "patronage", label: "Patronage", cost: { influence: 3 }, modifier: 1 },
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
    claimsLuxury: true,
  },
];

/** The seven coastal luxury goods (luxury-goods.md §6): 2n − 1 for four seats (owner, Q81).
 *  Order is the authored seating order onto the board's selected moorings. */
export const LUXURY_GOODS: LuxuryGoodDefinition[] = [
  { id: "tyrian-dye", name: "Tyrian Dye", flavour: "the murex trade" },
  { id: "pearls", name: "Pearls", flavour: "deep-water diving" },
  { id: "coral", name: "Coral", flavour: "reef harvest" },
  { id: "glassware", name: "Glassware", flavour: "eastern kilns" },
  { id: "incense", name: "Incense", flavour: "the southern routes" },
  { id: "fine-linen", name: "Fine Linen", flavour: "riverine weaving" },
  { id: "silphium", name: "Silphium", flavour: "the Cyrenaic steppe" },
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
// old-growth forests) are pairwise non-adjacent on this authored "scenario" board; the
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

// ── Year deck (direction paper §6.2) ────────────────────────────────────────────────
//
// Fourteen cards in a seeded order, the next one hidden, one for each year of the
// default game; a longer game reshuffles them. Each card exposes one kind of player by
// zeroing one term for the whole table for the year; Plague and Festival move every
// realm's Unrest tokens once, when revealed.

export const YEAR_CARDS: YearCard[] = [
  {
    id: "year-drought",
    name: "Drought",
    count: 2,
    text: "Plains grow no food this year.",
    flavor: "The fields crack. The granaries are counted twice.",
    effect: { type: "zeroTerm", term: "plainsFood" },
  },
  {
    id: "year-wildfire",
    name: "Wildfire",
    count: 2,
    text: "Forests yield no wood this year.",
    flavor: "Tinder-dry groves burn.",
    effect: { type: "zeroTerm", term: "forestWood" },
  },
  {
    id: "year-silent-mines",
    name: "Silent Mines",
    count: 1,
    text: "Mountains yield no stone this year.",
    flavor: "The galleries are flooded and the picks hang on their pegs.",
    effect: { type: "zeroTerm", term: "mountainStone" },
  },
  {
    id: "year-piracy",
    name: "Piracy",
    count: 2,
    text: "Freemen yield no gold this year.",
    flavor: "No cargo leaves harbour without a second ship to guard it.",
    effect: { type: "zeroTerm", term: "freemenGold" },
  },
  {
    id: "year-ostracism",
    name: "Ostracism",
    count: 2,
    text: "Citizens yield no influence this year.",
    flavor: "The potsherds are counted and the loudest voices sent away.",
    effect: { type: "zeroTerm", term: "citizenInfluence" },
  },
  {
    id: "year-blockade",
    name: "Blockade",
    count: 1,
    text: "Luxuries give no happiness this year.",
    flavor: "The dye and the incense sit in the holds.",
    effect: { type: "zeroTerm", term: "luxuryHappiness" },
  },
  {
    id: "year-plague",
    name: "Plague",
    count: 2,
    text: "Everyone places an Unrest token.",
    flavor: "The sickness comes by sea and spares no quarter of the city.",
    effect: { type: "unrestTokens", change: "placeOne" },
  },
  {
    id: "year-festival",
    name: "Festival",
    count: 2,
    text: "Everyone clears their Unrest tokens.",
    flavor: "Garlands on every door, and old quarrels left at the gate.",
    effect: { type: "unrestTokens", change: "clearAll" },
  },
];

/** Twelve kinds, forty copies, following the paper's explicit copy counts. */
export const PLAYER_EVENT_CARDS: EventCard[] = [
  {
    id: "player-good-stores",
    name: "Good Stores",
    count: 4,
    text: "Gain 2 food.",
    flavor: "The storehouse jars are full to the shoulder.",
    effects: [{ type: "resourceDelta", resource: "food", amount: 2 }],
  },
  {
    id: "player-timber",
    name: "Timber",
    count: 4,
    text: "Gain 2 wood.",
    flavor: "A storm brought down the old oaks on the ridge.",
    effects: [{ type: "resourceDelta", resource: "wood", amount: 2 }],
  },
  {
    id: "player-shipment",
    name: "Shipment",
    count: 4,
    text: "Gain 2 stone.",
    flavor: "The barge from the quarry comes in a day early.",
    effects: [{ type: "resourceDelta", resource: "stone", amount: 2 }],
  },
  {
    id: "player-profit",
    name: "Profit",
    count: 4,
    text: "Gain 2 gold.",
    flavor: "A cargo of oil sold high in the harbour market.",
    effects: [{ type: "resourceDelta", resource: "gold", amount: 2 }],
  },
  {
    id: "player-patronage",
    name: "Patronage",
    count: 4,
    text: "Gain 2 influence.",
    flavor: "A rich family wants its name cut beside yours.",
    effects: [{ type: "resourceDelta", resource: "influence", amount: 2 }],
  },
  {
    id: "player-free-settlers",
    name: "Free Settlers",
    count: 3,
    text: "Gain a freeman in a settlement with room.",
    flavor: "A family from the hills asks for a plot and a hearth.",
    effects: [
      { type: "addPops", pop: "freemen", amount: 1, target: "ownedSettlementWithCapacity" },
    ],
  },
  {
    id: "player-captured-laborers",
    name: "Captured Laborers",
    count: 3,
    text: "Gain a slave in a settlement with room.",
    flavor: "Captives from a border skirmish are led through the gate.",
    effects: [{ type: "addPops", pop: "slaves", amount: 1, target: "ownedSettlementWithCapacity" }],
  },
  {
    id: "player-rats",
    name: "Rats",
    count: 3,
    text: "Lose 2 food.",
    flavor: "Something has been at the grain in the night.",
    effects: [{ type: "resourceDelta", resource: "food", amount: -2 }],
  },
  {
    id: "player-bandits",
    name: "Bandits",
    count: 3,
    text: "Lose 2 gold.",
    flavor: "The tax mule never reached the treasury.",
    effects: [{ type: "resourceDelta", resource: "gold", amount: -2 }],
  },
  {
    id: "player-fire",
    name: "Fire",
    count: 3,
    text: "Lose 2 wood.",
    flavor: "A lamp tipped over in the timber yard.",
    effects: [{ type: "resourceDelta", resource: "wood", amount: -2 }],
  },
  {
    id: "player-local-unrest",
    name: "Local Unrest",
    count: 3,
    text: "Place an Unrest token.",
    flavor: "Angry voices in the market, and a stone through a shutter.",
    effects: [{ type: "unrestTokens", change: "placeOne" }],
  },
  {
    id: "player-public-calm",
    name: "Public Calm",
    count: 2,
    text: "Clear one Unrest token.",
    flavor: "The quarrel is settled over wine, and the street goes quiet.",
    effects: [{ type: "unrestTokens", change: "clearOne" }],
  },
];

// ── The development deck (docs/plans/development-deck.md) ───────────────────────────
//
// Forty cards, signed off by the owner on 2026-10-31: twenty yields that land on the
// draw, twelve held cards a seat plays on itself, and eight it plays on a rival. A yield
// counts the realm or gives 5; no card gives +1 of a resource.

/** One card costs this; a seat buys one a turn. */
export const DEV_CARD_COST: Partial<Resources> = { gold: 2 };

export const DEV_CARDS: DevCard[] = [
  {
    id: "foraging",
    name: "Foraging",
    count: 5,
    kind: "yield",
    text: "Gain 1 food for each of your settlements.",
    flavor: "Every hamlet sends its children out to the hedgerows.",
    effect: { type: "gain", resources: ["food"], amount: 1, per: "settlement" },
  },
  {
    id: "woodcutters",
    name: "Woodcutters",
    count: 5,
    kind: "yield",
    text: "Gain 1 wood for each of your settlements.",
    flavor: "Axes ring in every village wood.",
    effect: { type: "gain", resources: ["wood"], amount: 1, per: "settlement" },
  },
  {
    id: "quarry-gang",
    name: "Quarry Gang",
    count: 5,
    kind: "yield",
    text: "Gain 1 stone for each of your settlements.",
    flavor: "A gang with wedges and rope works each hillside.",
    effect: { type: "gain", resources: ["stone"], amount: 1, per: "settlement" },
  },
  {
    id: "bountiful-harvest",
    name: "Bountiful Harvest",
    count: 1,
    kind: "yield",
    text: "Gain 1 food for each pop in your realm.",
    flavor: "Every hand in the realm brings in a sheaf.",
    effect: { type: "gain", resources: ["food"], amount: 1, per: "pop" },
  },
  {
    id: "civic-feast",
    name: "Civic Feast",
    count: 1,
    kind: "yield",
    text: "Gain 1 influence for each pop in your realm.",
    flavor: "An ox roasts in the agora, and every guest remembers the host.",
    effect: { type: "gain", resources: ["influence"], amount: 1, per: "pop" },
  },
  {
    id: "tunny-run",
    name: "Tunny Run",
    count: 1,
    kind: "yield",
    text: "Gain 5 food.",
    flavor: "The tunny shoals come close inshore, and the nets come up full.",
    effect: { type: "gain", resources: ["food"], amount: 5 },
  },
  {
    id: "timber-raft",
    name: "Timber Raft",
    count: 1,
    kind: "yield",
    text: "Gain 5 wood.",
    flavor: "Logs lashed together ride the river down on the flood.",
    effect: { type: "gain", resources: ["wood"], amount: 5 },
  },
  {
    id: "marble-block",
    name: "Marble Block",
    count: 1,
    kind: "yield",
    text: "Gain 5 stone.",
    flavor: "A flawless block from the new face of the quarry.",
    effect: { type: "gain", resources: ["stone"], amount: 5 },
  },
  {
    id: "caravan",
    name: "Caravan",
    count: 4,
    kind: "held",
    text: "Gain 1 wood, stone or food for each of your settlements: one kind, chosen when you play it.",
    flavor: "Mules loaded at every gate, bound wherever you send them.",
    effect: { type: "gain", resources: ["wood", "stone", "food"], amount: 1, per: "settlement" },
  },
  {
    id: "settlers",
    name: "Settlers",
    count: 3,
    kind: "held",
    text: "Gain a freeman in one of your settlements with room.",
    flavor: "Families and seed-grain, seeking a kinder shore.",
    effect: { type: "addPop", pop: "freemen" },
  },
  {
    id: "captives",
    name: "Captives",
    count: 1,
    kind: "held",
    text: "Gain a slave in one of your settlements with room.",
    flavor: "Prisoners from a border raid, roped at the neck.",
    effect: { type: "addPop", pop: "slaves" },
  },
  {
    id: "master-builder",
    name: "Master Builder",
    count: 1,
    kind: "held",
    text: "Your next building or colony upgrade this turn costs 2 less wood or stone.",
    flavor: "He knows where every block will sit before the first is cut.",
    effect: { type: "buildDiscount", amount: 2 },
  },
  {
    id: "festival-day",
    name: "Festival Day",
    count: 3,
    kind: "held",
    text: "Clear one of your Unrest tokens.",
    flavor: "Garlands, wine, and a day off work.",
    effect: { type: "unrestTokens", change: "clearOne" },
  },
  {
    id: "raiders",
    name: "Raiders",
    count: 4,
    kind: "rival",
    text: "Take up to 3 wood, stone, food or gold from a rival you pick: one kind, and no more than they hold.",
    flavor: "They come at night and are gone before the alarm.",
    effect: { type: "raid", resources: ["wood", "stone", "food", "gold"], amount: 3 },
  },
  {
    id: "agitators",
    name: "Agitators",
    count: 2,
    kind: "rival",
    text: "A rival you pick places an Unrest token.",
    flavor: "Paid voices in a rival's market.",
    effect: { type: "unrestTokens", change: "placeOne" },
  },
  {
    id: "informer",
    name: "Informer",
    count: 2,
    kind: "rival",
    text: "A rival you pick discards a held card, drawn at random.",
    flavor: "A servant who listens at doors, and sells what he hears.",
    effect: { type: "discardHeld" },
  },
];
