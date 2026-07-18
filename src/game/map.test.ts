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

  it("lays out the Phase 2 terrain deck (15 forest / 8 mountain / 8 plains / 5 hill / 1 oracle)", () => {
    const counts = createInitialMap().reduce<Record<string, number>>((acc, tile) => {
      acc[tile.terrain] = (acc[tile.terrain] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ forest: 15, mountain: 8, plains: 8, hill: 5, oracle: 1 });
  });

  it("makes hills and the oracle yield-less, and puts no gold on the map", () => {
    const tiles = createInitialMap();
    for (const tile of tiles) {
      if (tile.terrain === "hill" || tile.terrain === "oracle") {
        expect(tile.resource).toBeNull();
      }
      expect(tile.resource?.type).not.toBe("gold");
    }
    // The oracle is a single unsettleable hole beside the board's centre.
    const oracle = tiles.filter((tile) => tile.terrain === "oracle");
    expect(oracle).toHaveLength(1);
    expect(oracle[0].id).toBe("0,1");
    expect(oracle[0].buildingSlots).toBe(0);
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
