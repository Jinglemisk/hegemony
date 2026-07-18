import { BUILDINGS, TERRAIN_DECK } from "./data";
import type { BuildingDefinition } from "./types";

/**
 * The content-override seam. The engine's "what exists" tables — {@link BUILDINGS}
 * and the {@link TERRAIN_DECK} — are otherwise module constants read directly by the
 * rules code. Reading them through these accessors instead lets a DEV tuning session
 * swap in patched content (a Villa that yields +3, a richer breadbasket) WITHOUT
 * editing source, exactly as a game mode swaps in a patched {@link Ruleset}.
 *
 * The override is null by default, so `getBuildings()`/`getTerrainDeck()` return the
 * authored constants and every test / sim / production build behaves identically.
 * Only the dev tuning panel (src/dev) ever calls {@link setContentOverrides}, and it
 * does so once before creating a game — the override is fixed for a game's lifetime,
 * keeping the rules engine deterministic just as a plain constant would.
 */

export type TerrainDeck = typeof TERRAIN_DECK;

let buildingOverride: BuildingDefinition[] | null = null;
let terrainOverride: TerrainDeck | null = null;

/** The building roster in effect — the dev override if one is set, else the authored {@link BUILDINGS}. */
export function getBuildings(): BuildingDefinition[] {
  return buildingOverride ?? BUILDINGS;
}

/** The terrain deck in effect — the dev override if one is set, else the authored {@link TERRAIN_DECK}. */
export function getTerrainDeck(): TerrainDeck {
  return terrainOverride ?? TERRAIN_DECK;
}

/**
 * DEV-ONLY. Install (or clear, with null) content overrides for the next game created.
 * A missing key leaves that override untouched; an explicit null clears it back to the
 * authored constant. Call before {@link createGame}; do not mutate mid-game.
 */
export function setContentOverrides(overrides: {
  buildings?: BuildingDefinition[] | null;
  terrain?: TerrainDeck | null;
}): void {
  if ("buildings" in overrides) {
    buildingOverride = overrides.buildings ?? null;
  }
  if ("terrain" in overrides) {
    terrainOverride = overrides.terrain ?? null;
  }
}
