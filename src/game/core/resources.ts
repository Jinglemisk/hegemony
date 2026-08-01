import { EMPTY_RESOURCES } from "../data";
import type { Resource, Resources } from "../types";

export function canAfford(resources: Resources, cost: Partial<Resources>) {
  return Object.entries(cost).every(
    ([resource, amount]) => resources[resource as Resource] >= (amount ?? 0),
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
    resources[resource] = floor === undefined ? next : Math.max(floor, next);
  }
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

export function clonePartialResources(resources: Partial<Resources>): Partial<Resources> {
  return { ...resources };
}

export function createResourceDelta(resource: Resource, amount: number): Resources {
  return {
    ...EMPTY_RESOURCES,
    [resource]: amount,
  };
}
