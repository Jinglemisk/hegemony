import type { LawEffect, Politician, ResolutionCard } from "./types";

/** Appendix B, read under section 5.9's global limits. */
export const RESOLUTION_CARDS: ResolutionCard[] = [
  {
    kind: "law",
    politician: "demosthenes",
    id: "land-reform",
    name: "Land Reform",
    text: "Slaves grow food on any terrain, but Estates may not be built.",
    effects: [
      { type: "slaveResource", resource: "food" },
      { type: "buildingForbidden", building: "estate" },
    ],
  },
  {
    kind: "law",
    politician: "demosthenes",
    id: "sacred-fields",
    name: "Sacred Fields",
    text: "Temples also grow 2 food, but cost 6 stone.",
    effects: [
      { type: "buildingFood", building: "temple", amount: 2 },
      { type: "actionCost", action: "buildBuilding", buildingIds: ["temple"], cost: { stone: 6 } },
    ],
  },
  {
    kind: "law",
    politician: "demosthenes",
    id: "manumission",
    name: "Manumission",
    text: "Promoting a slave is free, but slaves count three times for unrest.",
    effects: [
      { type: "actionCost", action: "promotePop", pop: "slaves", cost: {} },
      { type: "slaveUnrestWeight", amount: 3 },
    ],
  },
  {
    kind: "law",
    politician: "demosthenes",
    id: "tenant-rights",
    name: "Tenant Rights",
    text: "Growing a slave costs 2 gold; growing a freeman costs 3 gold.",
    effects: [
      { type: "actionCost", action: "growPop", pop: "slaves", cost: { gold: 2 } },
      { type: "actionCost", action: "growPop", pop: "freemen", cost: { gold: 3 } },
    ],
  },
  {
    kind: "law",
    politician: "demosthenes",
    id: "grain-levy",
    name: "Grain Levy",
    text: "Freemen eat no food, but Marketplaces do nothing.",
    effects: [
      { type: "popIncome", pop: "freemen", resource: "food", amount: 0 },
      { type: "buildingIdle", building: "marketplace" },
    ],
  },
  {
    kind: "law",
    politician: "demosthenes",
    id: "festival-calendar",
    name: "Festival Calendar",
    text: "Civic calm costs 2 food or 2 influence.",
    effects: [{ type: "calmPayment", resource: "food", amount: 2 }],
  },
  {
    kind: "law",
    politician: "perdiccas",
    id: "public-works",
    name: "Public Works",
    text: "Estates and Granaries cost 3 wood; Marketplaces cost 2 wood and 2 gold. Colonies hold 3 pops.",
    effects: [
      {
        type: "actionCost",
        action: "buildBuilding",
        buildingIds: ["estate", "granary"],
        cost: { wood: 3 },
      },
      {
        type: "actionCost",
        action: "buildBuilding",
        buildingIds: ["marketplace"],
        cost: { wood: 2, gold: 2 },
      },
      { type: "colonyCapacity", amount: 3 },
    ],
  },
  {
    kind: "law",
    politician: "perdiccas",
    id: "guild-charter",
    name: "Guild Charter",
    text: "Your capital may grow twice per turn, but colonies may not grow.",
    effects: [
      { type: "growLimit", scope: "capital", amount: 2 },
      { type: "growLimit", scope: "colony", amount: 0 },
    ],
  },
  {
    kind: "law",
    politician: "perdiccas",
    id: "forum-rites",
    name: "Forum Rites",
    text: "Citizens produce 2 influence everywhere, but freemen produce nothing in colonies.",
    effects: [
      { type: "popIncome", pop: "citizens", resource: "influence", amount: 2 },
      { type: "popIncome", pop: "freemen", resource: "gold", amount: 0, scope: "colony" },
    ],
  },
  {
    kind: "law",
    politician: "perdiccas",
    id: "civic-pride",
    name: "Civic Pride",
    text: "Your realm gains 1 happiness, but each city pays 1 gold a year.",
    effects: [
      { type: "happiness", amount: 1 },
      { type: "settlementIncome", scope: "city", resource: "gold", amount: -1 },
    ],
  },
  {
    kind: "law",
    politician: "perdiccas",
    id: "master-builders",
    name: "Master Builders",
    text: "Cities gain one building slot, but you may place one fewer colony piece.",
    effects: [
      { type: "extraSlots", scope: "city", amount: 1 },
      { type: "colonyLimit", amount: -1 },
    ],
  },
  {
    kind: "law",
    politician: "kleistophenes",
    id: "homestead-act",
    name: "Homestead Act",
    text: "Colonies may hold one building, but cities lose one slot.",
    effects: [
      { type: "colonyBuildings", amount: 1 },
      { type: "extraSlots", scope: "city", amount: -1 },
    ],
  },
  {
    kind: "law",
    politician: "kleistophenes",
    id: "colonial-charter",
    name: "Colonial Charter",
    text: "Founding a colony costs 1 food and a pop; upgrading one costs 6 stone.",
    effects: [
      { type: "actionCost", action: "foundColony", cost: { food: 1 } },
      { type: "actionCost", action: "upgradeColonyToCity", cost: { stone: 6 } },
    ],
  },
  {
    kind: "law",
    politician: "kleistophenes",
    id: "frontier-spirit",
    name: "Frontier Spirit",
    text: "Founding a colony grants a free slave, but colonies hold 3 pops.",
    effects: [
      { type: "onFoundColony", grantPop: "slaves" },
      { type: "colonyCapacity", amount: 3 },
    ],
  },
  {
    kind: "law",
    politician: "kleistophenes",
    id: "harbour-dues",
    name: "Harbour Dues",
    text: "Ports cost 2 stone; Marketplaces cost 3 wood and 4 gold.",
    effects: [
      { type: "actionCost", action: "buildBuilding", buildingIds: ["port"], cost: { stone: 2 } },
      {
        type: "actionCost",
        action: "buildBuilding",
        buildingIds: ["marketplace"],
        cost: { wood: 3, gold: 4 },
      },
    ],
  },
  {
    kind: "law",
    politician: "kleistophenes",
    id: "rural-bloc",
    name: "Rural Bloc",
    text: "Each colony casts one vote, but each city casts one fewer.",
    effects: [
      { type: "settlementVotes", scope: "colony", amount: 1 },
      { type: "settlementVotes", scope: "city", amount: -1 },
    ],
  },
  {
    kind: "directive",
    politician: "stratokles",
    faction: "mob",
    id: "grain-riot",
    name: "Grain Riot",
    text: "Choose a rival. They lose 3 food.",
    effects: [{ type: "resourceDelta", resource: "food", amount: -3 }],
  },
  {
    kind: "directive",
    politician: "stratokles",
    faction: "mob",
    id: "the-streets-burn",
    name: "The Streets Burn",
    text: "Choose a rival. They place an Unrest token.",
    effects: [{ type: "unrestTokens", change: "placeOne" }],
  },
  {
    kind: "directive",
    politician: "stratokles",
    faction: "mob",
    id: "general-strike",
    name: "General Strike",
    text: "Choose a rival. They collect no income next turn.",
    effects: [{ type: "suppressIncome", turns: 1 }],
  },
  {
    kind: "directive",
    politician: "stratokles",
    faction: "mob",
    id: "the-mob-rises",
    name: "The Mob Rises",
    text: "Choose a rival. They lose a pop from their largest settlement.",
    effects: [{ type: "losePopFromLargest", count: 1 }],
  },
  {
    kind: "directive",
    politician: "stratokles",
    faction: "mob",
    id: "the-stele-is-broken",
    name: "The Stele Is Broken",
    text: "Choose a rival. Their newest authored Law is repealed if its minimum tenure has ended.",
    effects: [{ type: "repealNewestTargetLaw" }],
  },
  {
    kind: "directive",
    politician: "stratokles",
    faction: "mob",
    id: "isonomia",
    name: "Isonomia",
    text: "Choose a rival. They have one base vote at the next Assembly.",
    effects: [{ type: "equalVotesNextAssembly" }],
  },
];
/** A Law's own effects, so a politician's tendency is the card and cannot go stale. */
function lawEffects(cardId: string): LawEffect[] {
  const card = RESOLUTION_CARDS.find((c) => c.id === cardId);
  if (card?.kind !== "law") throw new Error(`No Law ${cardId}`);
  return card.effects;
}
export const POLITICIANS: Politician[] = [
  {
    id: "demosthenes",
    name: "Demosthenes",
    epithet: "Agricultural Reformer",
    creed: "Food, labour and the social ladder.",
    kind: "law",
    tendency: lawEffects("land-reform"),
  },
  {
    id: "perdiccas",
    name: "Perdiccas",
    epithet: "Urban Planner",
    creed: "Capital growth and city buildings.",
    kind: "law",
    tendency: lawEffects("guild-charter"),
  },
  {
    id: "kleistophenes",
    name: "Kleistophenes",
    epithet: "Rural Expansionist",
    creed: "Colonies, their buildings and their votes.",
    kind: "law",
    tendency: lawEffects("homestead-act"),
  },
  {
    id: "stratokles",
    name: "Stratokles",
    epithet: "Cunning Populist",
    creed: "Directives aimed at a rival.",
    kind: "directive",
    tendency: [{ type: "resourceDelta", resource: "food", amount: -3 }],
  },
];
export function getAuthoredResolutionCard(cardId: string): ResolutionCard | null {
  return RESOLUTION_CARDS.find((c) => c.id === cardId) ?? null;
}
