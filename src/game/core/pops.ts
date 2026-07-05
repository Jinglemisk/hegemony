import type { PopType, Pops } from "../types";

export const POP_TYPES: PopType[] = ["citizens", "freemen", "slaves"];

export const EMPTY_POPS: Pops = {
  citizens: 0,
  freemen: 0,
  slaves: 0
};

export const PLACEMENT_POP_COUNTS = {
  city: 3,
  capital: 3,
  colony: 1
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
