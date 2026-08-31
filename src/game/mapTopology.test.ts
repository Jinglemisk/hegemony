import { describe, expect, it } from "vitest";

import { createInitialMap, hexDistance, isCoastalTile } from "./map";
import { boardVertices, luxuryEligibleVertices, selectLuxuryVertices } from "./mapTopology";
import { shuffleWithSeed } from "./core/rng";
import { getAuthoredGameContent, getTerrainDeck } from "./content";

const CLASSIC = createInitialMap();

describe("coastal topology", () => {
  it("finds the classic board's 18 coastal tiles from the board itself", () => {
    expect(CLASSIC.filter((tile) => isCoastalTile(tile, CLASSIC))).toHaveLength(18);
    expect(isCoastalTile({ q: 0, r: 0 }, CLASSIC)).toBe(false);
  });

  it("treats an internal inlet as coast, not just the outer ring", () => {
    // Remove an interior tile: its six neighbours now face open water.
    const inlet = CLASSIC.filter((tile) => tile.id !== "0,0");
    const newlyCoastal = inlet.filter(
      (tile) => hexDistance(tile, { q: 0, r: 0 }) === 1 && isCoastalTile(tile, inlet),
    );
    expect(newlyCoastal).toHaveLength(6);
  });
});

describe("board vertices", () => {
  it("enumerates the classic board's 96 vertices, each exactly once", () => {
    const vertices = boardVertices(CLASSIC);
    expect(vertices).toHaveLength(96);
    expect(new Set(vertices.map((vertex) => vertex.id)).size).toBe(96);
  });

  it("splits vertices into 24 corner / 18 mooring / 54 interior by occupied cells", () => {
    const byCount = boardVertices(CLASSIC).reduce<Record<number, number>>((counts, vertex) => {
      counts[vertex.tileIds.length] = (counts[vertex.tileIds.length] ?? 0) + 1;
      return counts;
    }, {});
    expect(byCount).toEqual({ 1: 24, 2: 18, 3: 54 });
  });

  it("gives every eligible vertex two real, adjacent, coastal tiles and a sea cell", () => {
    const byId = new Map(CLASSIC.map((tile) => [tile.id, tile]));

    for (const vertex of luxuryEligibleVertices(CLASSIC)) {
      const [a, b] = vertex.tileIds.map((id) => byId.get(id));
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(hexDistance(a!, b!)).toBe(1);
      expect(isCoastalTile(a!, CLASSIC)).toBe(true);
      expect(isCoastalTile(b!, CLASSIC)).toBe(true);
      expect(byId.has(`${vertex.seaCell.q},${vertex.seaCell.r}`)).toBe(false);
    }
  });

  it("assigns the same vertex ids whatever order the tiles are iterated in", () => {
    const reversed = [...CLASSIC].reverse();
    const shuffled = shuffleWithSeed([...CLASSIC], 7).cards;

    const ids = boardVertices(CLASSIC).map((vertex) => vertex.id);
    expect(boardVertices(reversed).map((vertex) => vertex.id)).toEqual(ids);
    expect(boardVertices(shuffled).map((vertex) => vertex.id)).toEqual(ids);
  });

  it("keeps the same topology under a shuffled terrain deck", () => {
    const deck = shuffleWithSeed(getTerrainDeck(getAuthoredGameContent()), 99).cards;
    const shuffledBoard = createInitialMap(deck);

    expect(boardVertices(shuffledBoard).map((vertex) => vertex.id)).toEqual(
      boardVertices(CLASSIC).map((vertex) => vertex.id),
    );
  });

  it("opens new moorings on an internal inlet's shore", () => {
    const inlet = CLASSIC.filter((tile) => tile.id !== "0,0");
    expect(luxuryEligibleVertices(inlet)).toHaveLength(24);
  });
});

describe("luxury placement", () => {
  it("seats six distinct moorings deterministically when evenly spaced", () => {
    const picked = selectLuxuryVertices(CLASSIC, { count: 6, random: false, seed: 42 });

    expect(picked).toHaveLength(6);
    expect(new Set(picked.map((vertex) => vertex.id)).size).toBe(6);
    expect(selectLuxuryVertices(CLASSIC, { count: 6, random: false, seed: 42 })).toEqual(picked);

    const eligibleIds = new Set(luxuryEligibleVertices(CLASSIC).map((vertex) => vertex.id));
    for (const vertex of picked) {
      expect(eligibleIds.has(vertex.id)).toBe(true);
    }
  });

  it("spreads an even selection around the whole coast", () => {
    // With 18 eligible moorings and 6 seats, an even spread never puts two goods
    // on the same pair of tiles — every selected vertex touches 2 fresh tiles.
    const picked = selectLuxuryVertices(CLASSIC, { count: 6, random: false, seed: 42 });
    const touched = new Set(picked.flatMap((vertex) => vertex.tileIds));
    expect(touched.size).toBe(12);
  });

  it("draws a seeded random selection reproducibly, and differently across seeds", () => {
    const first = selectLuxuryVertices(CLASSIC, { count: 6, random: true, seed: 42 });
    const again = selectLuxuryVertices(CLASSIC, { count: 6, random: true, seed: 42 });
    const other = selectLuxuryVertices(CLASSIC, { count: 6, random: true, seed: 43 });

    expect(again).toEqual(first);
    expect(new Set(first.map((vertex) => vertex.id)).size).toBe(6);
    expect(other.map((vertex) => vertex.id)).not.toEqual(first.map((vertex) => vertex.id));
  });

  it("clamps the count to the eligible supply", () => {
    expect(selectLuxuryVertices(CLASSIC, { count: 100, random: false, seed: 1 })).toHaveLength(18);
    expect(selectLuxuryVertices(CLASSIC, { count: 0, random: false, seed: 1 })).toHaveLength(0);
  });

  it("selects independently of tile iteration order", () => {
    const shuffledTiles = shuffleWithSeed([...CLASSIC], 5).cards;
    const options = { count: 6, random: false, seed: 42 } as const;

    expect(selectLuxuryVertices(shuffledTiles, options).map((vertex) => vertex.id)).toEqual(
      selectLuxuryVertices(CLASSIC, options).map((vertex) => vertex.id),
    );
  });
});
