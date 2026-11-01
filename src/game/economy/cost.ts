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

/** What Master builder's discount comes off, in this order. */
const BUILD_DISCOUNT_RESOURCES = ["wood", "stone"] as const;

export function getAdjustedActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: CostedAction,
  baseCost: Partial<Resources>,
  buildingId?: BuildingId,
): Partial<Resources> {
  const cost = applyLawActionCost(G, playerID, action, { ...baseCost }, { buildingId });
  if (action === "foundColony") return cost;
  // Master builder: the next building or colony upgrade this turn costs less wood or
  // stone, wood first. Laws set the price first; the discount comes off what they leave.
  let discount = G.players[playerID].buildDiscount;
  for (const resource of BUILD_DISCOUNT_RESOURCES) {
    const off = Math.min(discount, cost[resource] ?? 0);
    if (off === 0) continue;
    const left = cost[resource]! - off;
    if (left) cost[resource] = left;
    else delete cost[resource];
    discount -= off;
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
