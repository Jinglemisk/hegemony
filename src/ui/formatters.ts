import { BUILDINGS } from "../game/data";
import type { BuildingEffect, BuildingId, PopType, Resource, Resources } from "../game/types";
import type { Phase } from "../game/controller";

export const RESOURCE_LABELS: Record<Resource, string> = {
  wood: "Wood",
  stone: "Stone",
  gold: "Gold",
  food: "Food",
  influence: "Influence",
  unrest: "Unrest"
};

const POP_LABELS: Record<PopType, { singular: string; plural: string }> = {
  citizens: { singular: "citizen", plural: "citizens" },
  freemen: { singular: "freeman", plural: "freemen" },
  slaves: { singular: "slave", plural: "slaves" }
};

export function formatResourceCost(cost: Partial<Resources>) {
  const entries = (Object.entries(cost) as Array<[Resource, number | undefined]>).filter(
    ([, amount]) => (amount ?? 0) > 0
  );

  if (entries.length === 0) {
    return "Free";
  }

  return entries
    .map(([resource, amount]) => `${amount ?? 0} ${RESOURCE_LABELS[resource]}`)
    .join(", ");
}

export function formatResourceDelta(resources: Resources) {
  const entries = (Object.entries(resources) as Array<[Resource, number]>).filter(([, amount]) => amount !== 0);

  if (entries.length === 0) {
    return "none";
  }

  return entries
    .map(([resource, amount]) => `${amount > 0 ? "+" : ""}${amount} ${RESOURCE_LABELS[resource]}`)
    .join(", ");
}

export function formatBuildingEffects(effects: BuildingEffect[]) {
  if (effects.length === 0) {
    return "No effect";
  }

  return effects
    .map((effect) => {
      if (effect.type === "addPop") {
        return `+${effect.amount} ${formatPopLabel(effect.pop, effect.amount)}`;
      }

      return `+${effect.amount} ${RESOURCE_LABELS[effect.resource]} income`;
    })
    .join(", ");
}

export function formatPopLabel(pop: PopType, amount: number) {
  return amount === 1 ? POP_LABELS[pop].singular : POP_LABELS[pop].plural;
}

export function formatPopShort(pop: PopType) {
  return POP_LABELS[pop].singular.slice(0, 1).toUpperCase();
}

export function buildingName(buildingId: BuildingId) {
  return BUILDINGS.find((building) => building.id === buildingId)?.name ?? buildingId;
}

export function phaseLabel(phase: Phase) {
  if (phase === "setupCapital") {
    return "Capital placement";
  }

  if (phase === "setupColony") {
    return "Colony placement";
  }

  return "Turn actions";
}

export function phaseHint(phase: Phase) {
  if (phase === "setupCapital") {
    return "Place a capital on an open hex";
  }

  if (phase === "setupColony") {
    return "Place a colony next to your capital";
  }

  return "Collect income, build, then end turn";
}
