import type { Resource, Resources, VictoryMetric } from "../game/types";
import { formatSignedNumber } from "./formatters";

/** The frame's number vocabulary, shared by its components. Per-ID icons are in `iconRegistry`. */

/** −3, 0, +2 — with a true minus sign. */
export const sign = formatSignedNumber;
export const tone = (n: number) => (n > 0 ? "pos" : n < 0 ? "neg" : "");

/** The consult pages the right strip opens, in order. The Chronicle is the ticker's. */
export const CONSULT: Array<{ tab: "codex" | "victory" | "agora"; label: string; icon: string }> = [
  { tab: "codex", label: "Codex", icon: "chrome/codex" },
  { tab: "victory", label: "Victory", icon: "victory/laurel" },
  { tab: "agora", label: "Agora", icon: "assembly/agora" },
];

/** Whether a store covers a price: a price is short only when it cannot be paid. */
export function canPay(store: Resources, amounts: Partial<Resources>) {
  return (Object.entries(amounts) as Array<[Resource, number]>).every(
    ([resource, n]) => store[resource] >= n,
  );
}

const units = (cost: Partial<Resources>) =>
  Object.values(cost).reduce((sum: number, n) => sum + (n ?? 0), 0);

/** The cheapest of an act's prices where it depends on the settlement: the fewest units. */
export function cheapestCost(costs: Array<Partial<Resources>>): Partial<Resources> {
  return costs.reduce((best, cost) => (units(cost) < units(best) ? cost : best), costs[0] ?? {});
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
