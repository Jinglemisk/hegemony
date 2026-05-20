import type { CSSProperties } from "react";
import type { Resource } from "../game/types";

export const RESOURCE_ORDER: Resource[] = ["wood", "stone", "gold", "food", "influence", "unrest"];

type ResourceVisual = {
  color: string;
  soft: string;
  line: string;
  shadow: string;
};

export const RESOURCE_VISUALS = {
  wood: {
    color: "#354927",
    soft: "rgb(53 73 39 / 17%)",
    line: "rgb(53 73 39 / 48%)",
    shadow: "rgb(53 73 39 / 26%)"
  },
  stone: {
    color: "#8f8571",
    soft: "rgb(143 133 113 / 16%)",
    line: "rgb(143 133 113 / 48%)",
    shadow: "rgb(143 133 113 / 24%)"
  },
  gold: {
    color: "#d98a35",
    soft: "rgb(217 138 53 / 15%)",
    line: "rgb(217 138 53 / 46%)",
    shadow: "rgb(217 138 53 / 24%)"
  },
  food: {
    color: "#9bbf52",
    soft: "rgb(155 191 82 / 17%)",
    line: "rgb(155 191 82 / 46%)",
    shadow: "rgb(155 191 82 / 24%)"
  },
  influence: {
    color: "#1f6977",
    soft: "rgb(31 105 119 / 14%)",
    line: "rgb(31 105 119 / 44%)",
    shadow: "rgb(31 105 119 / 24%)"
  },
  unrest: {
    color: "#b13a28",
    soft: "rgb(177 58 40 / 14%)",
    line: "rgb(177 58 40 / 46%)",
    shadow: "rgb(177 58 40 / 24%)"
  }
} satisfies Record<Resource, ResourceVisual>;

export type ResourceCssVars = CSSProperties & {
  "--resource-color": string;
  "--resource-soft": string;
  "--resource-line": string;
  "--resource-shadow": string;
};

export function resourceCssVars(resource: Resource): ResourceCssVars {
  const visual = RESOURCE_VISUALS[resource];

  return {
    "--resource-color": visual.color,
    "--resource-soft": visual.soft,
    "--resource-line": visual.line,
    "--resource-shadow": visual.shadow
  };
}
