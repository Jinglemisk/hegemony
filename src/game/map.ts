import { TERRAIN_DECK } from "./data";
import type { HexTile } from "./types";

/** Lay a terrain deck onto the radius-3 board. Defaults to the authored "classic"
 *  order; pass a shuffled copy of {@link TERRAIN_DECK} for a randomized board. */
export function createInitialMap(deck: typeof TERRAIN_DECK = TERRAIN_DECK): HexTile[] {
  const coordinates = axialRadius(3);

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

/** The island's shoreline: the outermost ring of the radius-3 board. Coastal tiles
 *  are connected by sea — the coastal-leapfrog placement rule (roadmap-appendix Q13a)
 *  and the founding colony's voyage (Q12) both read this. */
export function isCoastalTile(tile: { q: number; r: number }) {
  return Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(tile.q + tile.r)) === 3;
}

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }) {
  const aS = -a.q - a.r;
  const bS = -b.q - b.r;
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(aS - bS)) / 2;
}
