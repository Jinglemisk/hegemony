import type { GrowablePop, PopType, Pops } from "../types";

export const POP_TYPES: PopType[] = ["citizens", "freemen", "slaves"];

/** The pops Grow can add. Citizens come only by promotion. */
export const GROWABLE_POPS: GrowablePop[] = ["freemen", "slaves"];

export function isGrowablePop(pop: PopType): pop is GrowablePop {
  return pop !== "citizens";
}

export const EMPTY_POPS: Pops = {
  citizens: 0,
  freemen: 0,
  slaves: 0,
};

export const PLACEMENT_POP_COUNTS = {
  city: 3,
  capital: 4,
  colony: 2,
};

export function totalPops(pops: Pops) {
  return pops.citizens + pops.freemen + pops.slaves;
}

export function clonePops(pops: Pops): Pops {
  return { citizens: pops.citizens, freemen: pops.freemen, slaves: pops.slaves };
}

export function isExactPopSelection(pops: Pops, requiredTotal: number) {
  return isValidPopSelection(pops) && totalPops(pops) === requiredTotal;
}

/** A setup placement: exactly `requiredTotal` pops, exactly `requiredCitizens` of
 *  them citizens; the rest are slaves or freemen as the player chooses. */
export function isSetupPopSelection(pops: Pops, requiredTotal: number, requiredCitizens: number) {
  return isExactPopSelection(pops, requiredTotal) && pops.citizens === requiredCitizens;
}

export function isPositivePopSelection(pops: Pops) {
  return isValidPopSelection(pops) && totalPops(pops) > 0;
}

export function isValidPopSelection(pops: Pops) {
  return POP_TYPES.every((pop) => Number.isInteger(pops[pop]) && pops[pop] >= 0);
}

export function hasPops(source: Pops, requested: Pops) {
  return POP_TYPES.every((pop) => source[pop] >= requested[pop]);
}

export function addPops(target: Pops, pops: Pops) {
  for (const pop of POP_TYPES) {
    target[pop] += pops[pop];
  }
}

export function subtractPops(target: Pops, pops: Pops) {
  for (const pop of POP_TYPES) {
    target[pop] -= pops[pop];
  }
}
