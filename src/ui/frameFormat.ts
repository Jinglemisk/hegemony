import type { Resource } from "../game/types";

/** The frame's number and icon vocabulary, shared by its components. */

export const RESOURCE_ICON: Record<Resource, string> = {
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
  workshop: "buildings/workshop",
  granary: "buildings/granary",
  forum: "buildings/forum",
  aqueduct: "buildings/aqueduct",
  odeon: "buildings/odeon",
  villa: "buildings/villa",
  gymnasion: "buildings/gymnasion",
  port: "events/voyage",
};
