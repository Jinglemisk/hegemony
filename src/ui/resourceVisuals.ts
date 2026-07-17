import type { CSSProperties } from "react";
import type { Resource } from "../game/types";

export const RESOURCE_ORDER: Resource[] = ["wood", "stone", "gold", "food", "influence", "happiness"];

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
    tile: "#758542",
    soft: "rgb(53 73 39 / 18%)",
    line: "rgb(53 73 39 / 56%)",
    shadow: "rgb(53 73 39 / 30%)"
  },
  stone: {
    color: "#8f8571",
    tile: "#a8a290",
    soft: "rgb(143 133 113 / 18%)",
    line: "rgb(143 133 113 / 56%)",
    shadow: "rgb(143 133 113 / 28%)"
  },
  gold: {
    color: "#d98a35",
    tile: "#c68038",
    soft: "rgb(217 138 53 / 17%)",
    line: "rgb(217 138 53 / 54%)",
    shadow: "rgb(217 138 53 / 28%)"
  },
  food: {
    color: "#9bbf52",
    tile: "#dcbf69",
    soft: "rgb(155 191 82 / 19%)",
    line: "rgb(155 191 82 / 56%)",
    shadow: "rgb(155 191 82 / 28%)"
  },
  influence: {
    color: "#1f6977",
    tile: "#1f6977",
    soft: "rgb(31 105 119 / 15%)",
    line: "rgb(31 105 119 / 48%)",
    shadow: "rgb(31 105 119 / 26%)"
  },
  happiness: {
    color: "#2f7d46",
    tile: "#2f7d46",
    soft: "rgb(47 125 70 / 15%)",
    line: "rgb(47 125 70 / 50%)",
    shadow: "rgb(47 125 70 / 26%)"
  }
} satisfies Record<Resource, ResourceVisual>;

export type ResourceCssVars = CSSProperties & {
  "--resource-color": string;
  "--resource-tile": string;
  "--resource-soft": string;
  "--resource-line": string;
  "--resource-shadow": string;
};

export function resourceCssVars(resource: Resource): ResourceCssVars {
  const visual = RESOURCE_VISUALS[resource];

  return {
    "--resource-color": visual.color,
    "--resource-tile": visual.tile,
    "--resource-soft": visual.soft,
    "--resource-line": visual.line,
    "--resource-shadow": visual.shadow
  };
}
