import { getAuthoredGameContent, getTerrainDeck } from "./content";
import type { TerrainDeck } from "./content";
import type { HexTile } from "./types";

/** The classic map generator's input: the board is a hex of this radius. Nothing else
 *  reads it any more — the shoreline test ({@link isCoastalTile}) asks the actual board
 *  where the sea is, so an irregular map or an internal inlet has the same coast in
 *  every rule without touching this number. */
export const BOARD_RADIUS = 3;

/** Axial neighbour steps, one per hex edge. Order is arbitrary but fixed. */
export const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
] as const;

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
      buildingSlots: terrain.buildingSlots,
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

/** Cache of "which coordinates hold a tile" per board, so the per-tile shoreline
 *  test doesn't rebuild the set inside the sim's move-enumeration loops. Keyed
 *  weakly on the tiles array itself: coordinates never change within a match, and
 *  a new array simply computes a new set. */
const occupiedByBoard = new WeakMap<readonly { q: number; r: number }[], ReadonlySet<string>>();

export function occupiedCoordinates(
  tiles: readonly { q: number; r: number }[],
): ReadonlySet<string> {
  let occupied = occupiedByBoard.get(tiles);
  if (!occupied) {
    occupied = new Set(tiles.map(({ q, r }) => `${q},${r}`));
    occupiedByBoard.set(tiles, occupied);
  }
  return occupied;
}

/** The island's shoreline: any tile with open sea behind at least one edge. Asked of
 *  the actual board rather than a radius equality, so an irregular map or an internal
 *  inlet is coastal in every rule that reads it — the coastal-leapfrog placement rule
 *  (roadmap-appendix Q13a), the founding colony's voyage (Q12), and the luxury
 *  vertex topology (docs/plans/luxury-goods.md). */
export function isCoastalTile(
  tile: { q: number; r: number },
  tiles: readonly { q: number; r: number }[],
) {
  const occupied = occupiedCoordinates(tiles);
  return AXIAL_DIRECTIONS.some(({ q, r }) => !occupied.has(`${tile.q + q},${tile.r + r}`));
}

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }) {
  const aS = -a.q - a.r;
  const bS = -b.q - b.r;
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(aS - bS)) / 2;
}
