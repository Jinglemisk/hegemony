import { describe, expect, it } from "vitest";

import { buyRiotInsurance, resolveRiot } from "./riot";
import { endTurn } from "./turn";
import { applyUnrestUpkeep } from "./unrest";
import { happinessLevel } from "./happiness";
import { removePops } from "./tables";
import { scenario } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState } from "./types";

const P0_CAPITAL = TEST_OPENING_SETUP[0].capital.tileId;

function totalPopsOf(G: HegemonyState, playerID: "0"): number {
  return G.players[playerID].settlements.reduce((sum, tileId) => {
    const settlement = G.board.tiles
      .find((tile) => tile.id === tileId)!
      .settlements.find((candidate) => candidate.owner === playerID)!;
    return sum + settlement.pops.citizens + settlement.pops.freemen + settlement.pops.slaves;
  }, 0);
}

/** Enough Unrest tokens to put player 0's level exactly on the riot line. */
function tokensForRiot(G: HegemonyState): number {
  return happinessLevel(G, "0") - G.ruleset.economy.unrest.riotThreshold;
}

/** An opening where player 0 is mid-riot: tokens placed, upkeep run. */
function riotingGame() {
  const G = scenario()
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      draft.players["0"].unrestTokens = tokensForRiot(draft);
    })
    .build();
  applyUnrestUpkeep(G, "0");
  return G;
}

describe("the riot blocks the turn (D9)", () => {
  it("endTurn is illegal while the riot stands; resolving unblocks it", () => {
    const G = riotingGame();

    expect(G.pendingRiot).not.toBeNull();
    expect(endTurn(G).ok).toBe(false);

    expect(resolveRiot(G, "0").ok).toBe(true);
    expect(G.pendingRiot).toBeNull();
  });

  it("defers income until the table has spoken, then collects it", () => {
    const G = scenario()
      .opening()
      .mutate((draft) => {
        draft.pendingPlayerEvent = null;
      })
      .build();
    // Simulate the next upkeep finding a riot: flags as at turn start.
    G.players["0"].collectedThisTurn = false;
    G.players["0"].unrestTokens = tokensForRiot(G);
    applyUnrestUpkeep(G, "0");

    expect(G.players["0"].collectedThisTurn).toBe(false);

    expect(resolveRiot(G, "0").ok).toBe(true);

    // resolveRiot runs the deferred automatic collection.
    expect(G.players["0"].collectedThisTurn).toBe(true);
  });
});

describe("riot insurance", () => {
  it("each option once per riot, all three stack to +3", () => {
    const G = riotingGame();
    G.players["0"].resources.food = 4;
    G.players["0"].resources.influence = 3;

    expect(buyRiotInsurance(G, "0", "breadDole").ok).toBe(true);
    expect(buyRiotInsurance(G, "0", "breadDole").ok).toBe(false);
    expect(buyRiotInsurance(G, "0", "patronage").ok).toBe(true);
    expect(
      buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" }).ok,
    ).toBe(true);

    expect(G.pendingRiot?.boughtInsurance).toHaveLength(3);
    expect(G.players["0"].resources.food).toBe(0);
    expect(G.players["0"].resources.influence).toBe(0);
  });

  it("the concession demotes the named pop for free", () => {
    const G = riotingGame();
    const capital = G.board.tiles
      .find((tile) => tile.id === P0_CAPITAL)!
      .settlements.find((candidate) => candidate.owner === "0")!;
    capital.pops = { citizens: 2, freemen: 1, slaves: 0 };
    G.players["0"].resources.influence = 0;

    expect(
      buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" }).ok,
    ).toBe(true);

    expect(capital.pops).toEqual({ citizens: 1, freemen: 2, slaves: 0 });
    expect(
      buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" }).ok,
    ).toBe(false);
  });

  it("the concession takes a citizen and nobody else", () => {
    const G = riotingGame();

    expect(buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "freemen" }).ok).toBe(
      false,
    );
    expect(G.pendingRiot?.boughtInsurance).toEqual([]);
  });

  it("full insurance makes pop loss impossible (worst case is food or gold)", () => {
    // Deliberate design (Q15): min roll 1 + 3 = 4 — granary (row 4) is the floor.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const G = riotingGame();
      G.players["0"].resources.food = 20;
      G.players["0"].resources.influence = 10;
      G.players["0"].resources.gold = 20;
      buyRiotInsurance(G, "0", "breadDole");
      buyRiotInsurance(G, "0", "patronage");
      buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" });
      const before = totalPopsOf(G, "0");

      // Different rng path per attempt: burn a different number of pre-rolls.
      for (let burn = 0; burn < attempt; burn += 1) {
        G.rng = (G.rng + 1) >>> 0;
      }
      resolveRiot(G, "0");

      expect(G.lastTableRoll?.modified).toBeGreaterThanOrEqual(4);
      // The concession's demotion happened at purchase; the roll itself takes no pops.
      expect(totalPopsOf(G, "0")).toBe(before);
    }
  });
});

describe("the roll", () => {
  it("clears the tokens that caused it, so the same riot does not fire again", () => {
    const G = riotingGame();

    expect(G.players["0"].unrestTokens).toBe(0);
    resolveRiot(G, "0");
    G.players["0"].collectedThisTurn = false;
    applyUnrestUpkeep(G, "0");

    expect(G.pendingRiot).toBeNull();
  });

  it("takes slaves before freemen and freemen before citizens", () => {
    const G = scenario().opening().build();
    const capital = G.board.tiles
      .find((tile) => tile.id === P0_CAPITAL)!
      .settlements.find((candidate) => candidate.owner === "0")!;
    capital.pops = { citizens: 2, freemen: 2, slaves: 1 };
    const slaves = G.players["0"].settlements.reduce(
      (sum, tileId) =>
        sum +
        G.board.tiles
          .find((tile) => tile.id === tileId)!
          .settlements.find((candidate) => candidate.owner === "0")!.pops.slaves,
      0,
    );

    // One more than every slave in the realm: the last loss falls on a freeman.
    expect(removePops(G, "0", slaves + 1).byType).toEqual({ citizens: 0, freemen: 1, slaves });
  });

  it("is deterministic for a fixed seed", () => {
    const run = () => {
      const G = riotingGame();
      resolveRiot(G, "0");
      return { roll: G.lastTableRoll?.roll, pops: totalPopsOf(G, "0"), log: G.log.length };
    };

    expect(run()).toEqual(run());
  });
});
