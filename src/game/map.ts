import { getTerrainDeck } from "./content";
import type { TerrainDeck } from "./content";
import type { HexTile } from "./types";

/** The board is a hex of this radius. Both the tile layout ({@link createInitialMap}) and
 *  the shoreline test ({@link isCoastalTile}) read it, so changing the board size stays a
 *  one-line edit — writing the two independently once silently made every tile coastal or
 *  none of them, breaking coastal leapfrog and the founding voyage (post-sprint-debt §2.4). */
export const BOARD_RADIUS = 3;

/** Lay a terrain deck onto the board. Defaults to the terrain deck in effect
 *  (the authored order, or a dev override); pass a shuffled copy for a randomized board. */
export function createInitialMap(deck: TerrainDeck = getTerrainDeck()): HexTile[] {
  const coordinates = axialRadius(BOARD_RADIUS);

  return coordinates.map(({ q, r }, index) => {
    const terrain = deck[index];
    return {
      id: `${q},${r}`,
      q,
      r,
      terrain: terrain.terrain,
      buildingSlots: terrain.buildingSlots,
      resource: terrain.resource,
      settlements: []
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

/** The island's shoreline: the outermost ring of the board. Coastal tiles
 *  are connected by sea — the coastal-leapfrog placement rule (roadmap-appendix Q13a)
 *  and the founding colony's voyage (Q12) both read this. */
export function isCoastalTile(tile: { q: number; r: number }) {
  return Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(tile.q + tile.r)) === BOARD_RADIUS;
}

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }) {
  const aS = -a.q - a.r;
  const bS = -b.q - b.r;
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(aS - bS)) / 2;
}
