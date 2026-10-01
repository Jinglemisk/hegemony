import type { BuildingDefinition, BuildingEffect, Terrain } from "../game/types";
import type { TerrainDeck } from "../game/content";

/**
 * Read-only glance statistics computed from the content tables in effect. These answer
 * the "at a glance" questions the tuning panel exists to kill — slots per terrain, what
 * a building actually does — without the human eyeballing the raw data tables.
 */

export type TerrainStat = {
  terrain: Terrain;
  tiles: number;
  /** Sum of the terrain's slots: the most slaves it can put to work, or buildings hold. */
  slots: number;
  /** The biggest single tile of this terrain (the landmark). */
  maxSlots: number;
};

const TERRAIN_ORDER: Terrain[] = ["forest", "mountain", "plains", "hill", "oracle"];

export function terrainStats(deck: TerrainDeck): TerrainStat[] {
  const byTerrain = new Map<Terrain, TerrainStat>();

  for (const tile of deck) {
    const stat = byTerrain.get(tile.terrain) ?? {
      terrain: tile.terrain,
      tiles: 0,
      slots: 0,
      maxSlots: 0,
    };
    stat.tiles += 1;
    stat.slots += tile.slots;
    stat.maxSlots = Math.max(stat.maxSlots, tile.slots);
    byTerrain.set(tile.terrain, stat);
  }

  return [...byTerrain.values()].sort(
    (a, b) => TERRAIN_ORDER.indexOf(a.terrain) - TERRAIN_ORDER.indexOf(b.terrain),
  );
}

// ── Building effect descriptions ─────────────────────────────────────────────────────

/** A one-line, human-readable summary of a single building effect — the "what does it do". */
export function describeBuildingEffect(effect: BuildingEffect): string {
  switch (effect.type) {
    case "income":
      return `+${effect.amount} ${effect.resource}/turn`;
    case "happiness":
      return `+${effect.amount} happiness`;
    case "classOutput":
      return `${effect.pop} here make ${effect.amount}`;
  }
}

export function buildingSummary(building: BuildingDefinition): string {
  return building.effects.map(describeBuildingEffect).join("  ·  ");
}
