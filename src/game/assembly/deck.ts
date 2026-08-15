import type { DirectiveCard, LawCard, Politician, PoliticianId, ResolutionCard } from "./types";

/**
 * The Assembly's content tables — the four politicians and the 31-card starter deck
 * (docs/archive/plans/assembly-politicians.md Appendix A).
 *
 * This is CONTENT, not balance: the "what exists". Every magnitude here is a
 * provisional number the `?tune` panel and `npm run sim` are expected to move — the
 * grammar is what is fixed. That grammar, per the design's north star, is that **every
 * Law carries a trade-off**: a "−x, but +y" that favours some builds and hurts others,
 * so a vote is a referendum on which strategy the table backs rather than a rubber
 * stamp. A Law with only upside is a bug in this file.
 *
 * The three regular decks are sets of UNIQUE Laws — a politician's deck size is
 * therefore also their power ceiling. Stratokles alone deals in rival-targeted
 * Directives, which resolve once.
 */

export const POLITICIANS: Politician[] = [
  {
    id: "demosthenes",
    name: "Demosthenes",
    epithet: "Agricultural Reformer",
    creed: "The land feeds the city, and the citizen who works it is owed his place in it.",
    kind: "law",
    // Bread from the whole country, paid for by the crowd it feeds.
    tendency: [
      { type: "settlementIncome", scope: "all", resource: "food", amount: 1 },
      { type: "popIncome", pop: "citizens", resource: "happiness", amount: -1, step: 3 },
    ],
  },
  {
    id: "perdiccas",
    name: "Perdiccas",
    epithet: "Urban Planner",
    creed: "Build upward. A polis is measured in stone, not in miles.",
    kind: "law",
    // Cheap stone in the city, and the countryside pays for it.
    tendency: [
      { type: "actionCostDelta", action: "buildBuilding", resource: "stone", amount: -3 },
      { type: "settlementIncome", scope: "colony", resource: "happiness", amount: -1 },
    ],
  },
  {
    id: "kleistophenes",
    name: "Kleistophenes",
    epithet: "Rural Expansionist",
    creed: "Every horizon is a farm not yet planted. Send them out.",
    kind: "law",
    // Send them out cheaply; the cities carry the cost.
    tendency: [
      { type: "actionCostDelta", action: "foundColony", resource: "wood", amount: -10 },
      { type: "settlementIncome", scope: "city", resource: "gold", amount: -1 },
    ],
  },
  {
    id: "stratokles",
    name: "Stratokles",
    epithet: "Cunning Populist",
    creed: "The demos is patient until it is not. I merely tell them when.",
    kind: "directive",
    // He does not legislate. He points at a rival and the street does the rest.
    tendency: [
      { type: "resourceFraction", resource: "food", fraction: 0.5 },
      { type: "losePopFromLargest", count: 1 },
    ],
  },
];

export const POLITICIANS_BY_ID: Record<PoliticianId, Politician> = POLITICIANS.reduce(
  (all, politician) => ({ ...all, [politician.id]: politician }),
  {} as Record<PoliticianId, Politician>,
);

/** Demosthenes — the agrarian / citizen order. Food, the land, the social ladder. */
const DEMOSTHENES_LAWS: LawCard[] = [
  {
    id: "grain-dole",
    politician: "demosthenes",
    kind: "law",
    name: "Grain Dole",
    text: "Promotions cost 1 less food, but slaves produce 1 less.",
    tradeOff: "citizen-rush vs slave-extraction",
    effects: [
      { type: "actionCostDelta", action: "promotePop", resource: "food", amount: -1 },
      { type: "popPrimaryIncome", pop: "slaves", amount: -1 },
    ],
  },
  {
    id: "land-reform",
    politician: "demosthenes",
    kind: "law",
    name: "Land Reform",
    text: "Every settlement yields 1 more food, but cities yield 1 less gold.",
    tradeOff: "agrarian-wide vs urban-gold",
    effects: [
      { type: "settlementIncome", scope: "all", resource: "food", amount: 1 },
      { type: "settlementIncome", scope: "city", resource: "gold", amount: -1 },
    ],
  },
  {
    id: "sacred-fields",
    politician: "demosthenes",
    kind: "law",
    name: "Sacred Fields",
    text: "Each citizen yields 1 more food, but every 3 citizens cost 1 happiness.",
    tradeOff: "food-growth vs contentment",
    effects: [
      { type: "popIncome", pop: "citizens", resource: "food", amount: 1 },
      { type: "popIncome", pop: "citizens", resource: "happiness", amount: -1, step: 3 },
    ],
  },
  {
    id: "manumission-law",
    politician: "demosthenes",
    kind: "law",
    name: "Manumission Law",
    text: "Freeing a slave costs 2 less food, but every 2 slaves cost 1 happiness.",
    tradeOff: "free labour vs slavery",
    effects: [
      {
        type: "actionCostDelta",
        action: "promotePop",
        pop: "slaves",
        resource: "food",
        amount: -2,
      },
      { type: "popIncome", pop: "slaves", resource: "happiness", amount: -1, step: 2 },
    ],
  },
  {
    id: "festival-calendar",
    politician: "demosthenes",
    kind: "law",
    name: "Festival Calendar",
    text: "Every settlement gains 1 happiness, but loses 1 gold income.",
    tradeOff: "bread over coin",
    effects: [
      { type: "settlementIncome", scope: "all", resource: "happiness", amount: 1 },
      { type: "settlementIncome", scope: "all", resource: "gold", amount: -1 },
    ],
  },
  {
    id: "agrarian-tariff",
    politician: "demosthenes",
    kind: "law",
    name: "Agrarian Tariff",
    text: "Every 2 food gathered above 10 a turn pays 1 gold, but wood income drops 1.",
    tradeOff: "food surplus vs timber",
    effects: [
      { type: "surplusConversion", from: "food", above: 10, per: 2, to: "gold", amount: 1 },
      { type: "flatIncome", resource: "wood", amount: -1 },
    ],
  },
  {
    id: "tenant-rights",
    politician: "demosthenes",
    kind: "law",
    name: "Tenant Rights",
    text: "Growing a pop costs 3 less food, but 2 more gold.",
    tradeOff: "feed mouths, pay in coin",
    effects: [
      { type: "actionCostDelta", action: "growPop", resource: "food", amount: -3 },
      { type: "actionCostDelta", action: "growPop", resource: "gold", amount: 2 },
    ],
  },
  {
    id: "cult-of-demeter",
    politician: "demosthenes",
    kind: "law",
    name: "Cult of Demeter",
    text: "Hold 15 or more food for 2 happiness; fall below it and lose 2.",
    tradeOff: "rewards food security, punishes the hand-to-mouth",
    effects: [
      { type: "thresholdHappiness", resource: "food", threshold: 15, atOrAbove: 2, below: -2 },
    ],
  },
];

/** Perdiccas — tall, dense, built. Kleistophenes's mirror; they clash by design. */
const PERDICCAS_LAWS: LawCard[] = [
  {
    id: "public-works",
    politician: "perdiccas",
    kind: "law",
    name: "Public Works",
    text: "Buildings cost 3 less wood and stone, but every city costs 1 happiness.",
    tradeOff: "builders who eat unhappiness",
    effects: [
      { type: "actionCostDelta", action: "buildBuilding", resource: "wood", amount: -3 },
      { type: "actionCostDelta", action: "buildBuilding", resource: "stone", amount: -3 },
      { type: "settlementIncome", scope: "city", resource: "happiness", amount: -1 },
    ],
  },
  {
    id: "guild-charter",
    politician: "perdiccas",
    kind: "law",
    name: "Guild Charter",
    text: "Growing a pop costs 3 less food in cities, but 2 more in colonies.",
    tradeOff: "tall vs wide",
    effects: [
      { type: "actionCostDelta", action: "growPop", scope: "city", resource: "food", amount: -3 },
      { type: "actionCostDelta", action: "growPop", scope: "colony", resource: "food", amount: 2 },
    ],
  },
  {
    id: "forum-rites",
    politician: "perdiccas",
    kind: "law",
    name: "Forum Rites",
    text: "Every city yields 1 more influence, but 1 less food.",
    tradeOff: "cities as political engines",
    effects: [
      { type: "settlementIncome", scope: "city", resource: "influence", amount: 1 },
      { type: "settlementIncome", scope: "city", resource: "food", amount: -1 },
    ],
  },
  {
    id: "civic-pride",
    politician: "perdiccas",
    kind: "law",
    name: "Civic Pride",
    text: "Every city gains 1 happiness, but every colony loses 1.",
    tradeOff: "urban contentment vs the frontier",
    effects: [
      { type: "settlementIncome", scope: "city", resource: "happiness", amount: 1 },
      { type: "settlementIncome", scope: "colony", resource: "happiness", amount: -1 },
    ],
  },
  {
    id: "aqueduct-levy",
    politician: "perdiccas",
    kind: "law",
    name: "Aqueduct Levy",
    text: "The stone bank rate improves one step, but wood income drops 1.",
    tradeOff: "stone-builders vs timber",
    effects: [
      { type: "bankRateStep", material: "stone", steps: 1 },
      { type: "flatIncome", resource: "wood", amount: -1 },
    ],
  },
  {
    id: "monumental-code",
    politician: "perdiccas",
    kind: "law",
    name: "Monumental Code",
    text: "Your first building each year costs no wood, but every colony loses 1 wood income.",
    tradeOff: "build up, strip the frontier",
    effects: [
      { type: "yearlyFreeAction", action: "buildBuilding", resources: ["wood"] },
      { type: "settlementIncome", scope: "colony", resource: "wood", amount: -1 },
    ],
  },
  {
    id: "census-rolls",
    politician: "perdiccas",
    kind: "law",
    name: "Census Rolls",
    text: "Every city yields 1 more gold, but costs 1 happiness.",
    tradeOff: "urban taxation",
    effects: [
      { type: "settlementIncome", scope: "city", resource: "gold", amount: 1 },
      { type: "settlementIncome", scope: "city", resource: "happiness", amount: -1 },
    ],
  },
  {
    id: "master-builders",
    politician: "perdiccas",
    kind: "law",
    name: "Master Builders",
    text: "Civic buildings cost 4 less stone, but founding a colony costs 5 more wood.",
    tradeOff: "cities over sprawl",
    effects: [
      {
        type: "actionCostDelta",
        action: "buildBuilding",
        // The stone-led roster — the engine's own "wood = economic, stone = civic"
        // grammar (data.ts), so "civic buildings" needs no new classification field.
        buildingIds: ["temple", "forum", "aqueduct", "odeon", "gymnasion"],
        resource: "stone",
        amount: -4,
      },
      { type: "actionCostDelta", action: "foundColony", resource: "wood", amount: 5 },
    ],
  },
];

/** Kleistophenes — wide, frontier, sprawl. Perdiccas's mirror. */
const KLEISTOPHENES_LAWS: LawCard[] = [
  {
    id: "homestead-act",
    politician: "kleistophenes",
    kind: "law",
    name: "Homestead Act",
    text: "Every colony yields 1 more wood, but cities yield 1 less gold.",
    tradeOff: "wide vs tall",
    effects: [
      { type: "settlementIncome", scope: "colony", resource: "wood", amount: 1 },
      { type: "settlementIncome", scope: "city", resource: "gold", amount: -1 },
    ],
  },
  {
    id: "colonial-charter",
    politician: "kleistophenes",
    kind: "law",
    name: "Colonial Charter",
    text: "Founding a colony costs 10 less wood, but upgrading one costs 10 more.",
    tradeOff: "found more, consolidate less",
    effects: [
      { type: "actionCostDelta", action: "foundColony", resource: "wood", amount: -10 },
      { type: "actionCostDelta", action: "upgradeColonyToCity", resource: "wood", amount: 10 },
    ],
  },
  {
    id: "enfranchise-the-colonies",
    politician: "kleistophenes",
    kind: "law",
    name: "Enfranchise the Colonies",
    // The balance experiment the design flags (§5): the greedy-vs-smart sim found
    // NEITHER bot ever upgrades a colony into a city at current pricing. Halving the
    // upgrade is the natural lever to revive that dead path — a resolution doing
    // double duty as a live A/B.
    text: "Upgrading a colony to a city costs half, but every city costs 1 happiness.",
    tradeOff: "revives the dead colony→city path",
    effects: [
      { type: "actionCostMultiplier", action: "upgradeColonyToCity", multiplier: 0.5 },
      { type: "settlementIncome", scope: "city", resource: "happiness", amount: -1 },
    ],
  },
  {
    id: "frontier-spirit",
    politician: "kleistophenes",
    kind: "law",
    name: "Frontier Spirit",
    text: "Founding a colony grants a freeman, but costs 2 happiness.",
    tradeOff: "expansion has a human cost",
    effects: [{ type: "onFoundColony", grantPop: "freemen", happiness: -2 }],
  },
  {
    id: "pioneer-levy",
    politician: "kleistophenes",
    kind: "law",
    name: "Pioneer Levy",
    text: "Every colony yields 1 more food, but every city 1 less.",
    tradeOff: "rural vs urban food",
    effects: [
      { type: "settlementIncome", scope: "colony", resource: "food", amount: 1 },
      { type: "settlementIncome", scope: "city", resource: "food", amount: -1 },
    ],
  },
  {
    id: "manifest-destiny",
    politician: "kleistophenes",
    kind: "law",
    name: "Manifest Destiny",
    text: "Founding a colony costs 5 less food, but growing a pop in a city costs 1 more.",
    tradeOff: "cheap to found, costly to densify",
    effects: [
      { type: "actionCostDelta", action: "foundColony", resource: "food", amount: -5 },
      { type: "actionCostDelta", action: "growPop", scope: "city", resource: "food", amount: 1 },
    ],
  },
  {
    id: "land-rush",
    politician: "kleistophenes",
    kind: "law",
    // DEVIATION from Appendix A, deliberate: the design line reads "first colony/year
    // free of stone & gold", but founding costs neither (ACTION_COSTS.foundColony is
    // wood 20 + food 2) — the line predates the Phase-2 repricing and would have made
    // this card a literal no-op. Retuned to wood, which is what founding actually
    // costs, keeping the card's intent (one free colony a year) intact.
    name: "Land Rush",
    text: "Your first colony each year is founded free of wood, but buildings cost 2 more.",
    tradeOff: "expansion over construction",
    effects: [
      { type: "yearlyFreeAction", action: "foundColony", resources: ["wood"] },
      { type: "actionCostDelta", action: "buildBuilding", resource: "wood", amount: 2 },
    ],
  },
  {
    id: "rural-bloc",
    politician: "kleistophenes",
    kind: "law",
    name: "Rural Bloc",
    text: "Every 2 colonies yield 1 influence, but every city loses 1.",
    tradeOff: "a rural political base against the urban one",
    effects: [
      { type: "settlementIncome", scope: "colony", resource: "influence", amount: 1, step: 2 },
      { type: "settlementIncome", scope: "city", resource: "influence", amount: -1 },
    ],
  },
];

/**
 * Stratokles — one-time upheavals aimed at a rival chosen by the author. The target
 * is revealed with the proposal, before the first vote is cast.
 */
const STRATOKLES_DIRECTIVES: DirectiveCard[] = [
  {
    id: "grain-riot",
    politician: "stratokles",
    kind: "directive",
    faction: "mob",
    name: "Grain Riot",
    text: "Choose a rival. They lose half their stored food, rounded down.",
    effects: [{ type: "resourceFraction", resource: "food", fraction: 0.5 }],
  },
  {
    id: "the-streets-burn",
    politician: "stratokles",
    kind: "directive",
    faction: "mob",
    name: "The Streets Burn",
    text: "Choose a rival. They lose 3 happiness.",
    effects: [{ type: "resourceDelta", resource: "happiness", amount: -3 }],
  },
  {
    id: "general-strike",
    politician: "stratokles",
    kind: "directive",
    faction: "mob",
    name: "General Strike",
    text: "Choose a rival. They collect no income on their next turn.",
    effects: [{ type: "suppressIncome", turns: 1 }],
  },
  {
    id: "the-mob-rises",
    politician: "stratokles",
    kind: "directive",
    faction: "mob",
    name: "The Mob Rises",
    text: "Choose a rival. They lose a pop from their largest settlement.",
    effects: [{ type: "losePopFromLargest", count: 1 }],
  },
  {
    id: "bread-and-circuses",
    politician: "stratokles",
    kind: "directive",
    faction: "mob",
    name: "Bread and Circuses",
    text: "Choose a rival. They gain 3 happiness and lose 5 gold.",
    effects: [
      { type: "resourceDelta", resource: "happiness", amount: 3 },
      { type: "resourceDelta", resource: "gold", amount: -5 },
    ],
  },
  {
    id: "the-stele-is-broken",
    politician: "stratokles",
    kind: "directive",
    faction: "agitator",
    name: "The Stele Is Broken",
    text: "Choose a rival. Their newest standing Law is torn down; if none stands, nothing happens.",
    effects: [{ type: "repealNewestTargetLaw" }],
  },
  {
    id: "isonomia",
    politician: "stratokles",
    kind: "directive",
    faction: "agitator",
    name: "Isonomia",
    text: "Choose a rival. At the next Assembly they have exactly 1 base vote.",
    effects: [{ type: "equalVotesNextAssembly" }],
  },
];

/** The full 31-card deck, by politician. Deck size = that politician's power ceiling. */
export const RESOLUTION_DECKS: Record<PoliticianId, ResolutionCard[]> = {
  demosthenes: DEMOSTHENES_LAWS,
  perdiccas: PERDICCAS_LAWS,
  kleistophenes: KLEISTOPHENES_LAWS,
  stratokles: STRATOKLES_DIRECTIVES,
};

export const RESOLUTION_CARDS: ResolutionCard[] = POLITICIANS.flatMap(
  (politician) => RESOLUTION_DECKS[politician.id],
);

/** Authored-deck lookup for content-definition and deck tests, never runtime resolution. */
export function getAuthoredResolutionCard(cardId: string): ResolutionCard | null {
  return RESOLUTION_CARDS.find((card) => card.id === cardId) ?? null;
}
