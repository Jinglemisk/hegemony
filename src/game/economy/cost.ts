import type {
  ActionCostDiscountTarget,
  BuildingId,
  GrowablePop,
  HegemonyState,
  PlayerId,
  PopType,
  Resources,
  Settlement,
} from "../types";
import { addLog, getPlayerName } from "../core/query";
import { clonePartialResources } from "../core/resources";
import { applyLawActionCost } from "../assembly/laws";

/** Actions whose base cost can be modified by event discounts or standing Laws. */
export type CostedAction = ActionCostDiscountTarget | "upgradeColonyToCity";

export function getAdjustedActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: CostedAction,
  baseCost: Partial<Resources>,
  buildingId?: BuildingId,
): Partial<Resources> {
  const adjusted = clonePartialResources(baseCost);
  if (action === "buildBuilding" || action === "foundColony") {
    for (const discount of getMatchingActionCostDiscounts(G, playerID, action, buildingId)) {
      adjusted[discount.resource] = Math.max(
        0,
        (adjusted[discount.resource] ?? 0) - discount.amount,
      );
    }
  }

  // Standing Laws reprice last, over event discounts —
  // a Law is the most permanent modifier in the game, so it gets the final word.
  return applyLawActionCost(G, playerID, action, adjusted, { buildingId });
}

/** Grow cost after event grow-coupons and standing Laws. */
export function getDiscountedGrowPopCost(
  G: HegemonyState,
  playerID: PlayerId,
  settlement: Settlement,
  pop: GrowablePop,
): Partial<Resources> {
  const adjusted = clonePartialResources(G.ruleset.growPopCosts[pop]);

  for (const discount of getMatchingActionCostDiscounts(G, playerID, "growPop", undefined, pop)) {
    adjusted[discount.resource] = Math.max(0, (adjusted[discount.resource] ?? 0) - discount.amount);
  }

  // Several Laws price growth differently in cities and colonies (Guild Charter,
  // Manifest Destiny), so the settlement's own kind is part of the question.
  return applyLawActionCost(G, playerID, "growPop", adjusted, {
    scope: settlement.kind === "colony" ? "colony" : "city",
    pop,
  });
}

function getMatchingActionCostDiscounts(
  G: HegemonyState,
  playerID: PlayerId,
  action: ActionCostDiscountTarget,
  buildingId?: BuildingId,
  pop?: PopType,
) {
  return G.players[playerID].actionCostDiscounts.filter(
    (discount) =>
      discount.action === action &&
      (!discount.buildingId || discount.buildingId === buildingId) &&
      (!discount.pop || discount.pop === pop),
  );
}

export function consumeActionCostDiscounts(
  G: HegemonyState,
  playerID: PlayerId,
  action: ActionCostDiscountTarget,
  buildingId?: BuildingId,
  pop?: PopType,
) {
  const matching = getMatchingActionCostDiscounts(G, playerID, action, buildingId, pop);

  if (matching.length === 0) {
    return;
  }

  const consumedIds = new Set(matching.map((discount) => discount.id));
  G.players[playerID].actionCostDiscounts = G.players[playerID].actionCostDiscounts.filter(
    (discount) => !consumedIds.has(discount.id),
  );
  addLog(
    G,
    `${getPlayerName(G, playerID)} used ${matching.map((discount) => discount.label).join(", ")} event discount${
      matching.length === 1 ? "" : "s"
    }.`,
    playerID,
  );
}
