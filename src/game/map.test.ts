import { describe, expect, it } from "vitest";

import { axialRadius, createInitialMap, hexDistance } from "./map";

describe("hex map", () => {
  it("generates a radius-3 board of 37 tiles", () => {
    expect(axialRadius(3)).toHaveLength(37);
    expect(createInitialMap()).toHaveLength(37);
  });

  it("gives every tile a unique axial id", () => {
    const tiles = createInitialMap();
    const ids = new Set(tiles.map((tile) => tile.id));
    expect(ids.size).toBe(tiles.length);
  });

  it("lays out the spec terrain deck (6 mountain / 9 hill / 14 forest / 8 plains)", () => {
    const counts = createInitialMap().reduce<Record<string, number>>((acc, tile) => {
      acc[tile.terrain] = (acc[tile.terrain] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ mountain: 6, hill: 9, forest: 14, plains: 8 });
  });

  it("measures hex distance symmetrically from the center", () => {
    const center = { q: 0, r: 0 };
    expect(hexDistance(center, center)).toBe(0);
    expect(hexDistance(center, { q: 3, r: 0 })).toBe(3);
    expect(hexDistance({ q: 1, r: -1 }, { q: -1, r: 1 })).toBe(
      hexDistance({ q: -1, r: 1 }, { q: 1, r: -1 }),
    );
  });
});
