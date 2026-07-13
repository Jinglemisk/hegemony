import { BUILDINGS } from "../game/data";
import { seasonName, yearOf } from "../game/core/calendar";
import type { BuildingEffect, BuildingId, PopType, Resource, Resources, SeasonName } from "../game/types";
import type { Phase } from "../game/controller";

export const RESOURCE_LABELS: Record<Resource, string> = {
  wood: "Wood",
  stone: "Stone",
  gold: "Gold",
  food: "Food",
  influence: "Influence",
  happiness: "Happiness"
};

export const SEASON_LABELS: Record<SeasonName, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter"
};

/** "Spring" — the season a given season index falls in. */
export function seasonLabel(seasonIndex: number) {
  return SEASON_LABELS[seasonName(seasonIndex)];
}

/** "Year 1" — the year a given season index falls in. */
export function yearLabel(seasonIndex: number) {
  return `Year ${yearOf(seasonIndex)}`;
}

/** Compact chronicle tag, e.g. "Y1·Sp". */
export function seasonTag(seasonIndex: number) {
  return `Y${yearOf(seasonIndex)}·${SEASON_LABELS[seasonName(seasonIndex)].slice(0, 2)}`;
}

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
    .map(([resource, amount]) => `${formatNumber(amount ?? 0)} ${RESOURCE_LABELS[resource]}`)
    .join(", ");
}

export function formatResourceDelta(resources: Resources) {
  const entries = (Object.entries(resources) as Array<[Resource, number]>).filter(([, amount]) => amount !== 0);

  if (entries.length === 0) {
    return "none";
  }

  return entries
    .map(([resource, amount]) => `${formatSignedNumber(amount)} ${RESOURCE_LABELS[resource]}`)
    .join(", ");
}

export function formatSignedNumber(amount: number) {
  return amount > 0 ? `+${formatNumber(amount)}` : formatNumber(amount);
}

export function formatNumber(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatBuildingEffects(effects: BuildingEffect[]) {
  if (effects.length === 0) {
    return "No effect";
  }

  return effects
    .map((effect) => {
      if (effect.type === "freemanGoldBonus") {
        return `+${effect.amount} Gold per freeman, up to ${effect.supportedPops} ${formatPopLabel("freemen", effect.supportedPops)}`;
      }

      if (effect.type === "citizenInfluenceBonus") {
        return `+${effect.amount} Influence per citizen, up to ${effect.supportedPops} ${formatPopLabel("citizens", effect.supportedPops)}`;
      }

      if (effect.type === "slavePrimaryResourceBonus") {
        return `+${effect.amount} tile primary resource per slave, up to ${effect.supportedPops} ${formatPopLabel("slaves", effect.supportedPops)}`;
      }

      if (effect.type === "happiness") {
        return `+${effect.amount} ${RESOURCE_LABELS.happiness}`;
      }

      if (effect.type === "growPopFoodDiscount") {
        return `local Grow Pop costs -${effect.amount} Food`;
      }

      if (effect.type === "popCapacityBonus") {
        return `+${effect.amount} pop capacity`;
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
    return "City placement";
  }

  if (phase === "setupColony") {
    return "Colony placement";
  }

  return "Turn actions";
}

export function phaseHint(phase: Phase) {
  if (phase === "setupCapital") {
    return "Place a starting city on an open hex";
  }

  if (phase === "setupColony") {
    return "Place a colony on an open colony site";
  }

  return "Income collects automatically; expand, build, then end turn";
}
