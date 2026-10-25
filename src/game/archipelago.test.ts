import { describe, expect, it } from "vitest";

import { ARCHIPELAGO_LIMITS, checkArchipelago, generateArchipelago } from "./archipelago";
import { deriveBankRates } from "./bank";
import { getTerrainDeck } from "./content";
import { mulberry32 } from "./core/rng";
import { createGameDefinition, createModeDefinition } from "./definition";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { assertGameInvariants } from "./invariants";
import { hexDistance } from "./mapTopology";
import { boardRulesetPatch, deriveRuleset } from "./ruleset";
import { canPlaceColonyOnTile } from "./settlement";
import { createInitialStateFromDefinition } from "./state";
import type { HexTile, PlayerId } from "./types";

const DEFINITION = createModeDefinition("standard");
const DECK = getTerrainDeck(DEFINITION.content);
/** The rules a game on the Archipelago board plays by: the board's own patch. */
const ARCHIPELAGO_RULES = createGameDefinition({
  ruleset: deriveRuleset(DEFINITION.ruleset, boardRulesetPatch("archipelago")!),
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

  it("deals the oracle onto an island with two settleable tiles beside it, on 200 seeds", () => {
    const cells = new Set<string>();
    for (const seed of SEEDS) {
      const board = generateArchipelago(seed, DECK);
      const oracle = board.tiles.find((tile) => tile.terrain === "oracle")!;
      const byId = new Map(board.tiles.map((tile) => [tile.id, tile]));
      const holding = board.layout.islands.filter((island) => island.includes(oracle.id));
      expect(holding, `seed ${seed}`).toHaveLength(1);
      const settleable = holding[0].filter((id) => byId.get(id)!.terrain !== "oracle");
      expect(settleable.length, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      cells.add(oracle.id);
    }
    // Dealt like any card, not set at the centre.
    expect(cells.size).toBeGreaterThan(50);
  });

  it("flags an island with fewer than two settleable tiles", () => {
    const tiles = generateArchipelago(1, DECK).tiles;
    const oracle = tiles.find((tile) => tile.terrain === "oracle")!;
    const beside = tiles.find((tile) => hexDistance(tile, oracle) === 1)!;
    // The oracle and one neighbour, cut off from the rest of their island.
    const cut = tiles.filter(
      (tile) =>
        tile === oracle ||
        tile === beside ||
        (hexDistance(tile, oracle) > 1 && hexDistance(tile, beside) > 1),
    );
    expect(checkArchipelago(cut, ARCHIPELAGO_LIMITS)).toContainEqual(
      "an island with fewer than two settleable tiles",
    );
  });

  it("lays a match's board from its seed, goods and bank rates included", () => {
    const G = createInitialStateFromDefinition(DEFINITION, 7, "archipelago");
    expect(createInitialStateFromDefinition(DEFINITION, 7, "archipelago")).toEqual(G);
    expect(checkArchipelago(G.board.tiles, ARCHIPELAGO_LIMITS)).toEqual([]);
    expect(G.board.luxuries).toHaveLength(7);
    expect(G.bank).toEqual(deriveBankRates(G.board.tiles, G.ruleset.economy.bank));
    expect(createInitialStateFromDefinition(DEFINITION, 8, "archipelago").board.tiles).not.toEqual(
      G.board.tiles,
    );
    assertGameInvariants(G, { strictCardConservation: true });
  });

  it.each([
    ["the board's hop 3", ARCHIPELAGO_RULES],
    ["any shore", DEFINITION],
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

describe("the Archipelago board's settings", () => {
  it("hops 3 hexes across water unless the patch given sets the reach", () => {
    expect(boardRulesetPatch("archipelago")).toEqual({ placement: { seaReach: 3 } });
    expect(boardRulesetPatch("archipelago", { victory: { years: 6 } })).toEqual({
      placement: { seaReach: 3 },
      victory: { years: 6 },
    });
    expect(boardRulesetPatch("archipelago", { placement: { seaReach: 4 } })).toEqual({
      placement: { seaReach: 4 },
    });
    expect(boardRulesetPatch("archipelago", { placement: { seaReach: null } })).toEqual({
      placement: { seaReach: null },
    });
    expect(ARCHIPELAGO_RULES.ruleset.placement.seaReach).toBe(3);
  });

  it("leaves Continental and Scenario with any shore", () => {
    for (const board of ["continental", "scenario"] as const) {
      expect(boardRulesetPatch(board)).toBeNull();
      expect(boardRulesetPatch(board, { victory: { years: 6 } })).toEqual({
        victory: { years: 6 },
      });
    }
    expect(DEFINITION.ruleset.placement.seaReach).toBeNull();
  });
});
