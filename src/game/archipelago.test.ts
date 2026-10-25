import { describe, expect, it } from "vitest";

import { ARCHIPELAGO_LIMITS, checkArchipelago, generateArchipelago } from "./archipelago";
import { deriveBankRates } from "./bank";
import { getTerrainDeck } from "./content";
import { mulberry32 } from "./core/rng";
import { createGameDefinition, createModeDefinition } from "./definition";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { assertGameInvariants } from "./invariants";
import { hexDistance } from "./mapTopology";
import { deriveRuleset } from "./ruleset";
import { canPlaceColonyOnTile } from "./settlement";
import { createInitialStateFromDefinition } from "./state";
import type { HexTile, PlayerId } from "./types";

const DEFINITION = createModeDefinition("standard");
const DECK = getTerrainDeck(DEFINITION.content);
const HOP_4 = createGameDefinition({
  ruleset: deriveRuleset(DEFINITION.ruleset, { placement: { seaReach: 4 } }),
  content: DEFINITION.content,
});
const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

const cardsOf = (tiles: readonly Pick<HexTile, "terrain" | "slots">[]) =>
  tiles.map(({ terrain, slots }) => `${terrain}:${slots}`).sort();

describe("archipelago generator", () => {
  it("meets every limit and lays the whole deck on 200 seeds", () => {
    for (const seed of SEEDS) {
      const board = generateArchipelago(seed, DECK);
      expect(checkArchipelago(board.tiles, ARCHIPELAGO_LIMITS), `seed ${seed}`).toEqual([]);
      expect(cardsOf(board.tiles)).toEqual(cardsOf(DECK));
      expect(new Set(board.tiles.map((tile) => tile.id)).size).toBe(DECK.length);
    }
  });

  it("lays a match's board from its seed, goods and bank rates included", () => {
    const G = createInitialStateFromDefinition(DEFINITION, 7, "archipelago");
    expect(createInitialStateFromDefinition(DEFINITION, 7, "archipelago")).toEqual(G);
    expect(checkArchipelago(G.board.tiles, ARCHIPELAGO_LIMITS)).toEqual([]);
    expect(G.board.luxuries).toHaveLength(G.ruleset.economy.luxury.coastalGoods);
    expect(G.bank).toEqual(deriveBankRates(G.board.tiles, G.ruleset.economy.bank));
    expect(createInitialStateFromDefinition(DEFINITION, 8, "archipelago").board.tiles).not.toEqual(
      G.board.tiles,
    );
    assertGameInvariants(G, { strictCardConservation: true });
  });

  it.each([
    ["any shore", DEFINITION],
    ["hop 4", HOP_4],
  ])("gives four legal starts with room to grow on 200 matches, %s", (_, definition) => {
    for (const seed of SEEDS) {
      let G = createInitialStateFromDefinition(definition, seed, "archipelago");
      let pick = seed;
      while (G.phase === "setupCapital" || G.phase === "setupColony") {
        const commands = enumerateLegalCommands(G, G.currentPlayer);
        expect(commands.length, `seed ${seed}, ${G.phase}`).toBeGreaterThan(0);
        const draw = mulberry32(pick);
        pick = draw.state;
        const result = transition(
          G.definition,
          G,
          G.currentPlayer,
          commands[Math.floor(draw.value * commands.length)],
        );
        expect(result.ok).toBe(true);
        if (result.ok) G = result.state;
      }
      assertGameInvariants(G);

      for (const player of ["0", "1", "2", "3"] as PlayerId[]) {
        expect(G.players[player].settlements).toHaveLength(2);
        const room = G.board.tiles.filter(
          (tile) => canPlaceColonyOnTile(G, player, tile).can && tile.slots > 0,
        );
        expect(room.length, `seed ${seed}, seat ${player}`).toBeGreaterThan(0);
      }
    }
  });

  it("holds every island within the span and draws all three shapes on 200 seeds", () => {
    const shapes = new Set<string>();
    for (const seed of SEEDS) {
      const board = generateArchipelago(seed, DECK);
      const byId = new Map(board.tiles.map((tile) => [tile.id, tile]));
      board.shapes.forEach((shape) => shapes.add(shape));
      for (const island of board.layout.islands) {
        const cells = island.map((id) => byId.get(id)!);
        const span = Math.max(...cells.flatMap((a) => cells.map((b) => hexDistance(a, b))));
        expect(span, `seed ${seed}`).toBeLessThanOrEqual(ARCHIPELAGO_LIMITS.islandSpan);
      }
    }
    expect([...shapes].sort()).toEqual(["bent", "line", "round"]);
  });

  it("flags an island wider than the span", () => {
    const board = generateArchipelago(1, DECK);
    expect(checkArchipelago(board.tiles, { ...ARCHIPELAGO_LIMITS, islandSpan: 1 })).toContainEqual(
      expect.stringMatching(/^an island spanning/),
    );
  });

  it("draws the same board from the same seed", () => {
    expect(generateArchipelago(42, DECK)).toEqual(generateArchipelago(42, DECK));
    expect(generateArchipelago(42, DECK).tiles).not.toEqual(generateArchipelago(43, DECK).tiles);
  });

  it("deals a fallback board that passes when every draw fails", () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const board = generateArchipelago(seed, DECK, { ...ARCHIPELAGO_LIMITS, draws: 0 });
      expect(board.fallback).toBe(true);
      expect(checkArchipelago(board.tiles, ARCHIPELAGO_LIMITS), `seed ${seed}`).toEqual([]);
      expect(cardsOf(board.tiles)).toEqual(cardsOf(DECK));
    }
  });
});
