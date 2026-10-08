import { EMPTY_RESOURCES } from "../data";
import type { Resource, Resources } from "../types";

export function canAfford(resources: Resources, cost: Partial<Resources>) {
  // A cost of nothing is always met, also by food that is short this turn.
  return Object.entries(cost).every(
    ([resource, amount]) => !amount || resources[resource as Resource] >= amount,
  );
}

export function payCost(resources: Resources, cost: Partial<Resources>) {
  for (const [resource, amount] of Object.entries(cost)) {
    resources[resource as Resource] -= amount ?? 0;
  }
}

export function applyResourceDelta(resources: Resources, delta: Resources) {
  for (const [resource, amount] of Object.entries(delta)) {
    resources[resource as Resource] += amount;
  }
}

/** Apply a real state mutation and clamp only resources explicitly configured with
 *  floors. Arithmetic-only callers (income construction and previews) keep using
 *  applyResourceDelta so projected deltas can remain negative. */
export function applyResourceDeltaWithFloors(
  resources: Resources,
  delta: Resources,
  floors: Partial<Record<Resource, number>>,
) {
  for (const [resource, amount] of Object.entries(delta) as Array<[Resource, number]>) {
    const next = resources[resource] + amount;
    const floor = floors[resource];
    // A stock already below its floor (food short during its owner's turn) is not raised.
    resources[resource] =
      floor === undefined ? next : Math.max(Math.min(floor, resources[resource]), next);
  }
}

/** Income is the one delta that takes food below zero: free pops eat what is not there,
 *  and the shortfall stands until its owner's turn ends. */
export function applyIncome(
  resources: Resources,
  income: Resources,
  floors: Partial<Record<Resource, number>>,
) {
  const food = resources.food + income.food;
  applyResourceDeltaWithFloors(resources, income, floors);
  resources.food = food;
}

export function cloneResources(resources: Resources): Resources {
  return { ...resources };
}

export function diffResources(after: Resources, before: Resources): Resources {
  return (Object.keys(EMPTY_RESOURCES) as Resource[]).reduce(
    (delta, resource) => ({
      ...delta,
      [resource]: after[resource] - before[resource],
    }),
    { ...EMPTY_RESOURCES },
  );
}

export function createResourceDelta(resource: Resource, amount: number): Resources {
  return {
    ...EMPTY_RESOURCES,
    [resource]: amount,
  };
}
