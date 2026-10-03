import type { NationalIdeaDefinition } from "./ideaTypes";

export const NATIONAL_IDEAS: NationalIdeaDefinition[] = [
  {
    id: "good-harvest",
    name: "Good Harvest",
    text: "Your realm gains 2 food at each year's income.",
    effects: [{ type: "realmIncome", resource: "food", amount: 2 }],
  },
  {
    id: "public-dole",
    name: "Public Dole",
    text: "Your Dole buys 1 food for 2 influence.",
    effects: [{ type: "dolePrice", amount: 2 }],
  },
  {
    id: "urban-planning",
    name: "Urban Planning",
    text: "Each of your cities has one extra work slot.",
    effects: [{ type: "extraSlots", scope: "city", amount: 1 }],
  },
  {
    id: "capital-works",
    name: "Capital Works",
    text: "Your capital has one extra work slot.",
    effects: [{ type: "extraSlots", scope: "capital", amount: 1 }],
  },
  {
    id: "civic-tradition",
    name: "Civic Tradition",
    text: "Your realm gains 2 influence at each year's income.",
    effects: [{ type: "realmIncome", resource: "influence", amount: 2 }],
  },
  {
    id: "frontier-charter",
    name: "Frontier Charter",
    text: "You have one extra colony piece.",
    effects: [{ type: "colonyPieces", amount: 1 }],
  },
  {
    id: "new-settlers",
    name: "New Settlers",
    text: "When you take this Idea, add one slave or freeman to an owned settlement with room.",
    effects: [{ type: "acquirePop" }],
  },
  {
    id: "city-pioneers",
    name: "City Pioneers",
    text: "Upgrading a colony adds one freeman to that city if it has room.",
    effects: [{ type: "onUpgradeCity", grantPop: "freemen" }],
  },
  {
    id: "slave-colonies",
    name: "Slave Colonies",
    text: "Add two slaves to your colonies when you take this Idea and when you found a colony, as room allows.",
    effects: [{ type: "onFoundColony", grantPop: "slaves", amount: 2 }],
  },
  {
    id: "harbour-planning",
    name: "Harbour Planning",
    text: "Your Ports take no work slot.",
    effects: [{ type: "slotExempt", building: "port" }],
  },
  {
    id: "treasury-grant",
    name: "Treasury Grant",
    text: "When you take this Idea, gain 4 gold.",
    effects: [{ type: "acquireResource", resource: "gold", amount: 4 }],
  },
  {
    id: "assembly-brokers",
    name: "Assembly Brokers",
    text: "You may buy a third vote at each Assembly.",
    effects: [{ type: "votePurchaseLimit", amount: 3 }],
  },
];
