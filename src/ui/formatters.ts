import { getAuthoredGameContent, getBuilding } from "../game/content";
import type { GameContent } from "../game/content";
import { seasonName, yearOf } from "../game/core/calendar";
import { formatPopName, formatRuleNumber } from "../game/core/format";
import type { BuildingId, PopType, Resource, Resources, SeasonName } from "../game/types";

export const RESOURCE_LABELS: Record<Resource, string> = {
  wood: "Wood",
  stone: "Stone",
  gold: "Gold",
  food: "Food",
  influence: "Influence",
  happiness: "Happiness",
};

export const SEASON_LABELS: Record<SeasonName, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

/** "Spring" — the season a given season index falls in. */
export function seasonLabel(seasonIndex: number) {
  return SEASON_LABELS[seasonName(seasonIndex)];
}

/** "Year 1" — the year a given season index falls in. */
export function yearLabel(seasonIndex: number) {
  return `Year ${yearOf(seasonIndex)}`;
}

export function formatResourceCost(cost: Partial<Resources>) {
  const entries = (Object.entries(cost) as Array<[Resource, number | undefined]>).filter(
    ([, amount]) => (amount ?? 0) > 0,
  );

  if (entries.length === 0) {
    return "Free";
  }

  return entries
    .map(([resource, amount]) => `${formatNumber(amount ?? 0)} ${RESOURCE_LABELS[resource]}`)
    .join(", ");
}

export function formatResourceDelta(resources: Resources) {
  const entries = (Object.entries(resources) as Array<[Resource, number]>).filter(
    ([, amount]) => amount !== 0,
  );

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

/** UI-facing alias for the engine's numeric formatter — one rounding/trim rule for the
 *  whole app (post-sprint-debt §5.2). Title-Case labels are this module's job; the
 *  arithmetic is not, so it delegates. */
export function formatNumber(amount: number) {
  return formatRuleNumber(amount);
}

export function formatPopLabel(pop: PopType, amount: number) {
  return formatPopName(pop, amount);
}

export function buildingName(
  buildingId: BuildingId,
  content: GameContent = getAuthoredGameContent(),
) {
  return getBuilding(content, buildingId)?.name ?? buildingId;
}
