import type {
  BuildingId,
  GrowablePop,
  HegemonyState,
  PlayerId,
  Resources,
  Resource,
} from "../types";
import { GROWABLE_POPS } from "../core/pops";
import { applyLawActionCost } from "../assembly/laws";

export type CostedAction = "buildBuilding" | "foundColony" | "upgradeColonyToCity";

export function getAdjustedActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: CostedAction,
  baseCost: Partial<Resources>,
  buildingId?: BuildingId,
): Partial<Resources> {
  return applyLawActionCost(G, playerID, action, { ...baseCost }, { buildingId });
}

export function getGrowPopCost(
  G: HegemonyState,
  playerID: PlayerId,
  pop: GrowablePop,
): Partial<Resources> {
  return applyLawActionCost(G, playerID, "growPop", { ...G.ruleset.growPopCosts[pop] }, { pop });
}

/** The pre-target growth quote, retaining a Law's resulting payment resource. */
export function getGrowPopPriceSpans(G: HegemonyState, playerID: PlayerId) {
  const costs = GROWABLE_POPS.map((pop) => getGrowPopCost(G, playerID, pop));
  const resources = [...new Set(costs.flatMap((cost) => Object.keys(cost)))] as Resource[];
  return resources.map((resource) => {
    const amounts = costs.map((cost) => cost[resource] ?? 0);
    return { resource, min: Math.min(...amounts), max: Math.max(...amounts) };
  });
}
