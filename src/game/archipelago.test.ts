import { describe, expect, it } from "vitest";

import { ARCHIPELAGO_LIMITS, checkArchipelago, generateArchipelago } from "./archipelago";
import { deriveBankRates } from "./bank";
import { getTerrainDeck } from "./content";
import { mulberry32 } from "./core/rng";
import { createModeDefinition } from "./definition";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { createLuxuryAssets } from "./luxury";
import { canPlaceColonyOnTile } from "./settlement";
import { createInitialStateFromDefinition } from "./state";
import type { HegemonyState, HexTile, PlayerId } from "./types";

const DEFINITION = createModeDefinition("standard");
const DECK = getTerrainDeck(DEFINITION.content);
const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

const cardsOf = (tiles: readonly Pick<HexTile, "terrain" | "slots">[]) =>
  tiles.map(({ terrain, slots }) => `${terrain}:${slots}`).sort();

/** A new match with the generated board in place of the disc, its goods and bank rates
 *  derived from it the way match creation derives them. */
function matchOn(tiles: HexTile[], seed: number): HegemonyState {
  const G = createInitialStateFromDefinition(DEFINITION, seed, "continental");
  const identity = { nextEntityId: 1 };
  const luxuries = createLuxuryAssets(identity, tiles, G.ruleset, G.definition.content, seed);
  return {
    ...G,
    nextEntityId: identity.nextEntityId,
    board: { tiles, luxuries },
    bank: deriveBankRates(tiles, G.ruleset.economy.bank),
  };
}

describe("archipelago generator", () => {
  it("meets every limit and lays the whole deck on 200 seeds", () => {
    for (const seed of SEEDS) {
      const board = generateArchipelago(seed, DECK);
      expect(checkArchipelago(board.tiles, ARCHIPELAGO_LIMITS), `seed ${seed}`).toEqual([]);
      expect(cardsOf(board.tiles)).toEqual(cardsOf(DECK));
      expect(new Set(board.tiles.map((tile) => tile.id)).size).toBe(DECK.length);
    }
  });

  it("gives four legal starts with room to grow on 200 seeds", () => {
    for (const seed of SEEDS) {
      let G = matchOn(generateArchipelago(seed, DECK).tiles, seed);
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

      for (const player of ["0", "1", "2", "3"] as PlayerId[]) {
        expect(G.players[player].settlements).toHaveLength(2);
        const room = G.board.tiles.filter(
          (tile) => canPlaceColonyOnTile(G, player, tile).can && tile.slots > 0,
        );
        expect(room.length, `seed ${seed}, seat ${player}`).toBeGreaterThan(0);
      }
    }
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
