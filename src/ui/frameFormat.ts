import type { NationalIdeaId } from "../game/ideaTypes";
import type { Resource, Resources, Stat, VictoryMetric, YearCard, YearTerm } from "../game/types";

/** The frame's number and icon vocabulary, shared by its components. */

export const RESOURCE_ICON: Record<Stat, string> = {
  wood: "resources/wood",
  stone: "resources/stone",
  food: "resources/food",
  gold: "resources/gold",
  influence: "resources/influence",
  happiness: "resources/happiness",
};

/** −3, 0, +2 — with a true minus sign. */
export const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
export const tone = (n: number) => (n > 0 ? "pos" : n < 0 ? "neg" : "");

/** The consult pages the bar opens, in order. */
export const CONSULT: Array<{
  tab: "chronicle" | "codex" | "victory" | "agora";
  label: string;
  icon: string;
  blurb: string;
}> = [
  {
    tab: "chronicle",
    label: "Chronicle",
    icon: "chrome/chronicle",
    blurb: "Every event, newest first.",
  },
  {
    tab: "codex",
    label: "Codex",
    icon: "chrome/codex",
    blurb: "The rules, generated from the engine.",
  },
  {
    tab: "victory",
    label: "Victory",
    icon: "victory/laurel",
    blurb: "The victory cards and who holds them.",
  },
  {
    tab: "agora",
    label: "Agora",
    icon: "assembly/agora",
    blurb: "The standing Laws and the Assembly's calendar.",
  },
];

/** Each building's raster; the Port is the voyage until it has its own. */
export const BUILDING_ICON: Record<string, string> = {
  marketplace: "buildings/marketplace",
  temple: "buildings/temple",
  granary: "buildings/granary",
  forum: "buildings/forum",
  estate: "buildings/villa",
  port: "events/voyage",
};

/** Each National Idea's raster: the thing it gives. */
export const IDEA_ICON: Record<NationalIdeaId, string> = {
  "good-harvest": "resources/food",
  "public-dole": "resources/influence",
  "urban-planning": "settlements/city",
  "capital-works": "settlements/capital",
  "civic-tradition": "resources/influence",
  "frontier-charter": "settlements/colony",
  "new-settlers": "pops/freemen",
  "city-pioneers": "settlements/upgrade",
  "slave-colonies": "pops/slaves",
  "harbour-planning": "resources/luxury",
  "treasury-grant": "resources/gold",
  "assembly-brokers": "assembly/bribe",
};

/** Whether a store covers a price: a price is short only when it cannot be paid. */
export function canPay(store: Resources, amounts: Partial<Resources>) {
  return (Object.entries(amounts) as Array<[Resource, number]>).every(
    ([resource, n]) => store[resource] >= n,
  );
}

/** A title's number as its toast and panel read it: "31 gold", "happiness +4". */
export function titleValue(metric: VictoryMetric, value: number): string {
  switch (metric) {
    case "happiness":
      return `happiness ${sign(value)}`;
    case "voice":
      return `${value} standing ${value === 1 ? "Law" : "Laws"}`;
    case "cities":
      return `${value} ${value === 1 ? "city" : "cities"}`;
    case "pops":
      return `${value} ${value === 1 ? "pop" : "pops"}`;
    case "citizens":
      return `${value} ${value === 1 ? "citizen" : "citizens"}`;
    case "gold":
      return `${value} gold`;
  }
}

/** A title's short name, for rows that list several. */
export const TITLE_SHORT: Record<string, string> = {
  "polis-builder": "Polis Builder",
  demos: "Demos",
  "civic-elite": "Civic Elite",
  treasurer: "Treasurer",
  beloved: "Beloved",
  voice: "Voice",
};

const TERM_ICON: Record<YearTerm, string> = {
  plainsFood: "terrain/plains",
  forestWood: "terrain/forest",
  mountainStone: "terrain/mountain",
  freemenGold: "pops/freemen",
  citizenInfluence: "pops/citizens",
  luxuryHappiness: "resources/luxury",
};

/** What a year card strikes, as the badge on its alarm disc and its blow's icon. */
export function yearCardIcon(card: YearCard): string {
  if (card.effect.type === "zeroTerm") return TERM_ICON[card.effect.term];
  return card.effect.change === "placeOne" ? "unrest/unrest" : "unrest/calm";
}

const NUMBER_WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
/** Small counts as words, larger ones as numerals. */
export const numberWord = (n: number) => NUMBER_WORD[n] ?? String(n);
