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
  const cost = applyLawActionCost(G, playerID, action, { ...baseCost }, { buildingId });
  if (action === "foundColony") return cost;
  // Master builder: the next building or colony upgrade this turn costs less of the kind
  // picked when it was played, never below 0. Laws set the price first; the discount
  // comes off what they leave.
  const discount = G.players[playerID].buildDiscount;
  for (const resource of Object.keys(discount) as Resource[]) {
    const left = Math.max(0, (cost[resource] ?? 0) - discount[resource]!);
    if (left) cost[resource] = left;
    else delete cost[resource];
  }
  return cost;
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
