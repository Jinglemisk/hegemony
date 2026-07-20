import { BUILDINGS } from "../data";
import type { ActionCostDiscountTarget, BuildingId, HegemonyState, PlayerId, PopType, Resource, Resources, Settlement } from "../types";
import { addLog, getPlayerName } from "../core/query";
import { clonePartialResources } from "../core/resources";
import { DEFAULT_RULESET } from "../ruleset";
import type { Ruleset } from "../ruleset";
import { applyLawActionCost } from "../assembly/laws";

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

  // Standing Laws reprice last, over the seasonal multiplier and event discounts —
  // a Law is the most permanent modifier in the game, so it gets the final word.
  return applyLawActionCost(G, playerID, action, adjusted, { buildingId });
}

export function getGrowPopCost(
  settlement: Settlement,
  pop: PopType,
  ruleset: Ruleset = DEFAULT_RULESET
): Partial<Resources> {
  const baseCost = ruleset.growPopCosts[pop];
  const discountedFood = Math.max(0, (baseCost.food ?? 0) - getGrowPopFoodDiscount(settlement));

  return {
    ...baseCost,
    food: discountedFood
  };
}

/**
 * Grow cost after event grow-coupons (deck overhaul, ledger issue 5) on top of the
 * building discount. Grow coupons never ride the seasonal building-cost multiplier —
 * that lever prices construction, not mouths.
 */
export function getDiscountedGrowPopCost(
  G: HegemonyState,
  playerID: PlayerId,
  settlement: Settlement,
  pop: PopType
): Partial<Resources> {
  const adjusted = clonePartialResources(getGrowPopCost(settlement, pop, G.ruleset));

  for (const discount of getMatchingActionCostDiscounts(G, playerID, "growPop", undefined, pop)) {
    adjusted[discount.resource] = Math.max(0, (adjusted[discount.resource] ?? 0) - discount.amount);
  }

  // Several Laws price growth differently in cities and colonies (Guild Charter,
  // Manifest Destiny), so the settlement's own kind is part of the question.
  return applyLawActionCost(G, playerID, "growPop", adjusted, {
    scope: settlement.kind === "colony" ? "colony" : "city",
    pop
  });
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
  buildingId?: BuildingId,
  pop?: PopType
) {
  return G.players[playerID].actionCostDiscounts.filter(
    (discount) =>
      discount.action === action &&
      (!discount.buildingId || discount.buildingId === buildingId) &&
      (!discount.pop || discount.pop === pop)
  );
}

export function consumeActionCostDiscounts(
  G: HegemonyState,
  playerID: PlayerId,
  action: ActionCostDiscountTarget,
  buildingId?: BuildingId,
  pop?: PopType
) {
  const matching = getMatchingActionCostDiscounts(G, playerID, action, buildingId, pop);

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
