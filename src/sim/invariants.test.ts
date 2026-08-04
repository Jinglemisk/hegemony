import { describe, expect, it } from "vitest";

import { GameInvariantError, assertGameInvariants } from "../game/invariants";
import { randomPolicy } from "./policies";
import { runGame } from "./runner";

describe("post-transition invariants", () => {
  it("survive deterministic generated command sequences with exact card accounting", () => {
    for (const seed of [11, 29]) {
      const state = runGame({
        seed,
        mode: "standard",
        policy: randomPolicy,
        turns: 24,
        hooks: {
          onMove: (next) => assertGameInvariants(next, { strictCardConservation: true }),
        },
      });
      assertGameInvariants(state, { strictCardConservation: true });
    }
  });

  it("reports stable paths and codes for corrupted identities and player indexes", () => {
    const state = runGame({ seed: 7, mode: "standard", policy: randomPolicy, turns: 1 });
    const corrupted = structuredClone(state);
    corrupted.definition = state.definition;
    corrupted.ruleset = state.definition.ruleset;
    const owned = corrupted.board.tiles.flatMap((tile) => tile.settlements);
    expect(owned.length).toBeGreaterThan(1);
    owned[1].id = owned[0].id;
    corrupted.players[owned[0].owner].settlements = [];

    expect(() => assertGameInvariants(corrupted)).toThrow(GameInvariantError);
    try {
      assertGameInvariants(corrupted);
    } catch (error) {
      expect((error as GameInvariantError).violations.map(({ code }) => code)).toEqual(
        expect.arrayContaining(["identity.duplicate", "settlement.index"]),
      );
    }
  });
});
