import { TERRAIN_DECK } from "./data";
import type { HexTile } from "./types";

export function createInitialMap(): HexTile[] {
  const coordinates = axialRadius(3);

  return coordinates.map(({ q, r }, index) => {
    const terrain = TERRAIN_DECK[index];
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

export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }) {
  const aS = -a.q - a.r;
  const bS = -b.q - b.r;
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(aS - bS)) / 2;
}
