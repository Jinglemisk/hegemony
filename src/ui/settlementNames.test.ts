import { describe, expect, it } from "vitest";
import { formatTileLabel } from "../game/core/format";
import { scenario } from "../game/testing/scenario";
import { namePlaces, settlementNameOf } from "./settlementNames";

describe("namePlaces", () => {
  it("reads a Chronicle line's tiles as the settlements standing on them", () => {
    const G = scenario().opening().build();
    const tile = G.board.tiles.find((candidate) => candidate.settlements.length > 0)!;
    const name = settlementNameOf(G.board.tiles, tile.settlements[0]!.id);
    const line = `Damon grew 1 Slave in ${formatTileLabel(G, tile.id)}.`;

    expect(namePlaces(G.board.tiles, line)).toBe(
      `Damon grew 1 Slave in ${name.charAt(0)}${name.slice(1).toLowerCase()}.`,
    );
    // An empty tile keeps the engine's label.
    const empty = G.board.tiles.find((candidate) => candidate.settlements.length === 0)!;
    const bare = `Settlers reached ${formatTileLabel(G, empty.id)}.`;
    expect(namePlaces(G.board.tiles, bare)).toBe(bare);
  });
});
