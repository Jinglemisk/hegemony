import { getAuthoredGameContent, getTerrainDeck } from "./content";
import type { TerrainDeck } from "./content";
import type { HexTile } from "./types";

/** The map builder's input: the board is a hex of this radius. Nothing else reads
 *  it — every question about the board's shape goes to the topology
 *  (game/mapTopology.ts), which asks the actual tiles where the sea is. */
export const BOARD_RADIUS = 3;

/** Lay a terrain deck onto the board. Direct callers default to authored terrain;
 *  match creation always passes the terrain from its pinned definition. */
export function createInitialMap(
  deck: TerrainDeck = getTerrainDeck(getAuthoredGameContent()),
): HexTile[] {
  const coordinates = axialRadius(BOARD_RADIUS);

  return coordinates.map(({ q, r }, index) => {
    const terrain = deck[index];
    return {
      id: `${q},${r}`,
      q,
      r,
      terrain: terrain.terrain,
      slots: terrain.slots,
      resource: terrain.resource,
      settlements: [],
    };
  });
}

export function axialRadius(radius: number) {
  const coordinates: Array<{ q: number; r: number }> = [];

  for (let q = -radius; q <= radius; q += 1) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);

    for (let r = r1; r <= r2; r += 1) {
      coordinates.push({ q, r });
    }
  }

  return coordinates;
}
