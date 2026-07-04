import type { HegemonyState, PopType, Pops, Resource, Resources } from "../types";
import { POP_TYPES } from "./pops";
import { getTile } from "./query";

export function formatPops(pops: Pops) {
  const entries = POP_TYPES.filter((pop) => pops[pop] > 0);

  if (entries.length === 0) {
    return "no pops";
  }

  return entries.map((pop) => `${pops[pop]} ${formatPopName(pop, pops[pop])}`).join(", ");
}

export function formatPopName(pop: PopType, amount: number) {
  if (pop === "citizens") {
    return amount === 1 ? "citizen" : "citizens";
  }

  if (pop === "freemen") {
    return amount === 1 ? "freeman" : "freemen";
  }

  return amount === 1 ? "slave" : "slaves";
}

export function formatTileLabel(G: HegemonyState, tileId: string) {
  const tile = getTile(G, tileId);

  return tile ? `${tile.terrain} ${tile.id}` : tileId;
}

export function formatRuleResourceDelta(resources: Resources) {
  const entries = (Object.entries(resources) as Array<[Resource, number]>).filter(([, amount]) => amount !== 0);

  if (entries.length === 0) {
    return "no change";
  }

  return entries.map(([resource, amount]) => `${formatRuleNumber(amount, true)} ${resource}`).join(", ");
}

export function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

export function formatRuleNumber(amount: number, signed = false) {
  const rounded = Math.round(amount * 100) / 100;
  const value = Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`;
  return signed && rounded > 0 ? `+${value}` : value;
}
