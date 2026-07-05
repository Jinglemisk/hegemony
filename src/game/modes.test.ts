import { describe, expect, it } from "vitest";

import { PLAYER_IDS } from "./data";
import { createInitialState, placeCapital, placeColony } from "./rules";
import { DEFAULT_RULESET, GAME_MODES, deriveRuleset, setupCapitalCount } from "./ruleset";
import { advanceSetupTurn } from "./turn";
import type { HegemonyState, PlayerId, Pops, SettlementKind } from "./types";

// Try each tile until a setup placement succeeds. Safe because placeCapital/placeColony
// validate fully before mutating, so a rejected attempt leaves the state untouched.
function placeAny(G: HegemonyState, playerID: PlayerId, kind: SettlementKind): boolean {
  const pops: Pops =
    kind === "colony" ? { citizens: 0, freemen: 0, slaves: 1 } : { citizens: 1, freemen: 1, slaves: 1 };

  for (const tile of G.board.tiles) {
    const result =
      kind === "colony" ? placeColony(G, playerID, tile.id, pops) : placeCapital(G, playerID, tile.id, pops);
    if (result.ok) {
      return true;
    }
  }
  return false;
}

// Drive a full setup for whatever ruleset the game was created with, one placement per turn.
function runSetup(G: HegemonyState) {
  let guard = 0;
  while (G.phase !== "gameplay" && guard++ < 500) {
    const player = G.currentPlayer;
    const kind = G.ruleset.setup[G.players[player].settlements.length];
    expect(placeAny(G, player, kind)).toBe(true);

    if (G.phase === "setupCapital") {
      advanceSetupTurn(G, setupCapitalCount(G.ruleset), "setupColony");
    } else {
      advanceSetupTurn(G, G.ruleset.setup.length, "gameplay");
    }
  }
}

describe("game modes / ruleset seam", () => {
  it("deriveRuleset overrides only the patched values, deep-merging the rest", () => {
    const derived = deriveRuleset(DEFAULT_RULESET, { startingResources: { wood: 40 } });

    expect(derived.startingResources.wood).toBe(40);
    expect(derived.startingResources.stone).toBe(DEFAULT_RULESET.startingResources.stone);
    expect(derived.setup).toEqual(DEFAULT_RULESET.setup);
    expect(derived.economy).toEqual(DEFAULT_RULESET.economy);
    expect(DEFAULT_RULESET.startingResources.wood).not.toBe(40); // base is untouched
  });

  it("registers standard, fast-start, and deathmatch modes", () => {
    expect(GAME_MODES.standard.ruleset.setup).toEqual(["capital", "colony"]);
    expect(GAME_MODES.fastStart.ruleset.startingResources.wood).toBe(40);
    expect(GAME_MODES.fastStart.ruleset.setup).toEqual(["capital", "colony"]);
    expect(GAME_MODES.deathmatch.ruleset.setup).toEqual(["capital", "colony", "colony", "colony"]);
    expect(setupCapitalCount(GAME_MODES.deathmatch.ruleset)).toBe(1);
  });

  it("standard setup: each player places one capital and one colony, then gameplay begins", () => {
    const G = createInitialState(1, GAME_MODES.standard.ruleset);
    runSetup(G);

    expect(G.phase).toBe("gameplay");
    for (const id of PLAYER_IDS) {
      expect(G.players[id].settlements).toHaveLength(2);
    }
  });

  it("deathmatch setup: the data-driven sequence makes each player place one capital and three colonies", () => {
    const G = createInitialState(1, GAME_MODES.deathmatch.ruleset);
    runSetup(G);

    expect(G.phase).toBe("gameplay");
    for (const id of PLAYER_IDS) {
      expect(G.players[id].settlements).toHaveLength(4);
    }
  });
});
