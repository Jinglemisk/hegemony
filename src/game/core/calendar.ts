import type { SeasonName } from "../types";

/**
 * The named time model, derived from the raw season counter.
 *
 * `HegemonyState.season` is a 1-based counter that ticks once per round (once
 * per full cycle of all players). That counter already *is* the season index,
 * so the season name and year are exact functions of it — there is no second
 * source of truth to keep in sync:
 *
 *   season 1 → Year 1 Spring     season 5 → Year 2 Spring
 *   season 2 → Year 1 Summer     season 6 → Year 2 Summer
 *   season 3 → Year 1 Autumn     ...
 *   season 4 → Year 1 Winter
 *
 * Everything above the clock (season flavor, yearly cards, the Assembly) reads
 * these helpers rather than doing its own modulo.
 */

/** The four seasons in cycle order. A year always opens on spring. */
export const SEASONS: SeasonName[] = ["spring", "summer", "autumn", "winter"];

/** The season a given 1-based season index falls in. */
export function seasonName(seasonIndex: number): SeasonName {
  const zeroBased = Math.floor(seasonIndex) - 1;
  const wrapped = ((zeroBased % SEASONS.length) + SEASONS.length) % SEASONS.length;
  return SEASONS[wrapped];
}

/** The 1-based year a given season index falls in. */
export function yearOf(seasonIndex: number): number {
  return Math.floor((seasonIndex - 1) / SEASONS.length) + 1;
}

/** True on the first season of a year (spring) — the future hook for yearly cards / the Assembly. */
export function isNewYear(seasonIndex: number): boolean {
  return seasonName(seasonIndex) === "spring";
}
