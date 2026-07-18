import type { BuildingDefinition, BuildingEffect, Resources, Terrain } from "../game/types";
import type { TerrainDeck } from "../game/content";

/**
 * Read-only glance statistics computed from the content tables in effect. These answer
 * the "at a glance" questions the tuning panel exists to kill — average stone yield,
 * total slots per terrain, what a building actually does — without the human eyeballing
 * the raw data tables.
 */

export type TerrainStat = {
  terrain: Terrain;
  tiles: number;
  slots: number;
  /** Sum of the terrain's material yield across its tiles (0 for yield-less hills). */
  totalYield: number;
  /** Mean yield over the tiles that actually yield (undefined when none do). */
  avgYield: number | undefined;
  /** The richest single tile of this terrain (the landmark), 0 when yield-less. */
  maxYield: number;
};

const TERRAIN_ORDER: Terrain[] = ["forest", "mountain", "plains", "hill", "oracle"];

export function terrainStats(deck: TerrainDeck): TerrainStat[] {
  const byTerrain = new Map<Terrain, TerrainStat>();

  for (const tile of deck) {
    const stat = byTerrain.get(tile.terrain) ?? {
      terrain: tile.terrain,
      tiles: 0,
      slots: 0,
      totalYield: 0,
      avgYield: undefined,
      maxYield: 0
    };
    stat.tiles += 1;
    stat.slots += tile.buildingSlots;
    const amount = tile.resource?.amount ?? 0;
    stat.totalYield += amount;
    stat.maxYield = Math.max(stat.maxYield, amount);
    byTerrain.set(tile.terrain, stat);
  }

  const rows = [...byTerrain.values()];
  for (const stat of rows) {
    const yielding = deck.filter((tile) => tile.terrain === stat.terrain && (tile.resource?.amount ?? 0) > 0).length;
    stat.avgYield = yielding > 0 ? stat.totalYield / yielding : undefined;
  }

  return rows.sort((a, b) => TERRAIN_ORDER.indexOf(a.terrain) - TERRAIN_ORDER.indexOf(b.terrain));
}

export type TerrainTotals = { tiles: number; slots: number; wood: number; stone: number; food: number };

export function terrainTotals(deck: TerrainDeck): TerrainTotals {
  const totals: TerrainTotals = { tiles: deck.length, slots: 0, wood: 0, stone: 0, food: 0 };
  for (const tile of deck) {
    totals.slots += tile.buildingSlots;
    const resource = tile.resource;
    if (resource && (resource.type === "wood" || resource.type === "stone" || resource.type === "food")) {
      totals[resource.type] += resource.amount;
    }
  }
  return totals;
}

// ── Building effect descriptions ─────────────────────────────────────────────────────

/** A one-line, human-readable summary of a single building effect — the "what does it do". */
export function describeBuildingEffect(effect: BuildingEffect): string {
  switch (effect.type) {
    case "income":
      return `+${effect.amount} ${effect.resource}/turn`;
    case "happiness":
      return `+${effect.amount} happiness`;
    case "freemanGoldBonus":
      return `+${effect.amount} gold to your first ${effect.supportedPops} freemen`;
    case "citizenInfluenceBonus":
      return `+${effect.amount} influence to your first ${effect.supportedPops} citizens`;
    case "slavePrimaryResourceBonus":
      return `+${effect.amount} tile-material to your first ${effect.supportedPops} slaves`;
    case "growPopFoodDiscount":
      return `−${effect.amount} food to grow pops`;
    case "popCapacityBonus":
      return `+${effect.amount} pop capacity`;
    case "tilePrimaryResourceBonus":
      return `+${effect.amount} tile material / level`;
    case "promoteCostReduction":
      return `−${effect.amount} off social-ladder promotions`;
  }
}

export function describeCost(cost: Partial<Resources>): string {
  const parts = Object.entries(cost)
    .filter(([, amount]) => amount)
    .map(([resource, amount]) => `${amount} ${resource}`);
  return parts.length > 0 ? parts.join(" · ") : "free";
}

export function buildingSummary(building: BuildingDefinition): string {
  return building.effects.map(describeBuildingEffect).join("  ·  ");
}
