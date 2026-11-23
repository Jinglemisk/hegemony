import type { CSSProperties } from "react";
import type { Resource, Stat } from "../game/types";

export const RESOURCE_ORDER: Resource[] = ["wood", "stone", "gold", "food", "influence"];

type ResourceVisual = {
  color: string;
  tile: string;
  soft: string;
  line: string;
  shadow: string;
};

// Tile fills soften to the KYKLOS terrain palette (DECIDED-UI-LAYOUT.html GND):
// forest→wood, mountain→stone, hill→gold, plains→food. Only `tile` (the hex
// fill) changes — `color` etc. still drive the top-bar pills/glyphs, which the
// user keeps. Tiles only ever carry these four resources (data.ts TERRAIN_DECK).
export const RESOURCE_VISUALS = {
  wood: {
    color: "#354927",
    // Forests read as timber-brown on the map (was olive-green — too close to plains).
    tile: "#8c6a3e",
    soft: "rgb(140 106 62 / 18%)",
    line: "rgb(140 106 62 / 54%)",
    shadow: "rgb(140 106 62 / 30%)",
  },
  stone: {
    color: "#8f8571",
    tile: "#a8a290",
    soft: "rgb(143 133 113 / 18%)",
    line: "rgb(143 133 113 / 56%)",
    shadow: "rgb(143 133 113 / 28%)",
  },
  gold: {
    color: "#d98a35",
    tile: "#c68038",
    soft: "rgb(217 138 53 / 17%)",
    line: "rgb(217 138 53 / 54%)",
    shadow: "rgb(217 138 53 / 28%)",
  },
  food: {
    color: "#9bbf52",
    // Plains read as field-green on the map (was wheat-gold — now that wood is brown,
    // food takes the green the two used to share).
    tile: "#9fbb55",
    soft: "rgb(159 187 85 / 19%)",
    line: "rgb(159 187 85 / 56%)",
    shadow: "rgb(159 187 85 / 28%)",
  },
  influence: {
    color: "#1f6977",
    tile: "#1f6977",
    soft: "rgb(31 105 119 / 15%)",
    line: "rgb(31 105 119 / 48%)",
    shadow: "rgb(31 105 119 / 26%)",
  },
  happiness: {
    color: "#2f7d46",
    tile: "#2f7d46",
    soft: "rgb(47 125 70 / 15%)",
    line: "rgb(47 125 70 / 50%)",
    shadow: "rgb(47 125 70 / 26%)",
  },
} satisfies Record<Stat, ResourceVisual>;

export type ResourceCssVars = CSSProperties & {
  "--resource-color": string;
  "--resource-tile": string;
  "--resource-soft": string;
  "--resource-line": string;
  "--resource-shadow": string;
};

function toCssVars(visual: ResourceVisual): ResourceCssVars {
  return {
    "--resource-color": visual.color,
    "--resource-tile": visual.tile,
    "--resource-soft": visual.soft,
    "--resource-line": visual.line,
    "--resource-shadow": visual.shadow,
  };
}

export function resourceCssVars(resource: Stat): ResourceCssVars {
  return toCssVars(RESOURCE_VISUALS[resource]);
}
