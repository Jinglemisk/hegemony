import { BUILDINGS, GROW_POP_COSTS } from "../data";
import type { ActionCostDiscountTarget, BuildingId, HegemonyState, PlayerId, PopType, Resource, Resources, Settlement } from "../types";
import { addLog, getPlayerName } from "../core/query";
import { clonePartialResources } from "../core/resources";

/** Actions whose base cost can be modified by seasonal multipliers or event discounts. */
export type CostedAction = ActionCostDiscountTarget | "upgradeColonyToCity";

export function getAdjustedActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: CostedAction,
  baseCost: Partial<Resources>,
  buildingId?: BuildingId
): Partial<Resources> {
  const adjusted = clonePartialResources(baseCost);
  const multiplier = getSeasonBuildingCostMultiplier(G, action);

  if (multiplier !== 1) {
    for (const [resource, amount] of Object.entries(adjusted) as Array<[Resource, number | undefined]>) {
      adjusted[resource] = Math.ceil((amount ?? 0) * multiplier);
    }
  }

  if (action === "buildBuilding" || action === "foundColony") {
    for (const discount of getMatchingActionCostDiscounts(G, playerID, action, buildingId)) {
      adjusted[discount.resource] = Math.max(0, (adjusted[discount.resource] ?? 0) - discount.amount);
    }
  }

  return adjusted;
}

export function getGrowPopCost(settlement: Settlement, pop: PopType): Partial<Resources> {
  const baseCost = GROW_POP_COSTS[pop];
  const discountedFood = Math.max(0, (baseCost.food ?? 0) - getGrowPopFoodDiscount(settlement));

  return {
    ...baseCost,
    food: discountedFood
  };
}

function getGrowPopFoodDiscount(settlement: Settlement) {
  return settlement.buildings.reduce((discount, buildingId) => {
    const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

    return (
      discount +
      (building?.effects ?? []).reduce(
        (effectDiscount, effect) =>
          effect.type === "growPopFoodDiscount" ? effectDiscount + effect.amount : effectDiscount,
        0
      )
    );
  }, 0);
}

function getSeasonBuildingCostMultiplier(G: HegemonyState, action: CostedAction) {
  const card = G.activeSeasonEvent?.card;

  if (!card) {
    return 1;
  }

  return card.effects.reduce((multiplier, effect) => {
    if (effect.type !== "buildingCostMultiplier" || effect.duration !== "season") {
      return multiplier;
    }

    if (action === "foundColony" && effect.excludes.includes("foundColony")) {
      return multiplier;
    }

    if (action === "upgradeColonyToCity" && effect.excludes.includes("upgradeColonyToCity")) {
      return multiplier;
    }

    return multiplier * effect.multiplier;
  }, 1);
}

function getMatchingActionCostDiscounts(
  G: HegemonyState,
  playerID: PlayerId,
  action: ActionCostDiscountTarget,
  buildingId?: BuildingId
) {
  return G.players[playerID].actionCostDiscounts.filter(
    (discount) => discount.action === action && (!discount.buildingId || discount.buildingId === buildingId)
  );
}

export function consumeActionCostDiscounts(
  G: HegemonyState,
  playerID: PlayerId,
  action: ActionCostDiscountTarget,
  buildingId?: BuildingId
) {
  const matching = getMatchingActionCostDiscounts(G, playerID, action, buildingId);

  if (matching.length === 0) {
    return;
  }

  const consumedIds = new Set(matching.map((discount) => discount.id));
  G.players[playerID].actionCostDiscounts = G.players[playerID].actionCostDiscounts.filter(
    (discount) => !consumedIds.has(discount.id)
  );
  addLog(
    G,
    `${getPlayerName(G, playerID)} used ${matching.map((discount) => discount.label).join(", ")} event discount${
      matching.length === 1 ? "" : "s"
    }.`
  );
}
