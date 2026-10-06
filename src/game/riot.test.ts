import { describe, expect, it } from "vitest";

import { buyRiotInsurance, resolveRiot, riotRollReach } from "./riot";
import { beginTurnFor, endTurn } from "./turn";
import { applyUnrestAtTurnEnd } from "./unrest";
import { happinessLevel } from "./happiness";
import { civicCalm } from "./civic";
import { buildBuilding } from "./actions";
import { removePops } from "./tables";
import { owned, scenario } from "./testing/scenario";
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

/** An opening where player 0 has committed to ending in a riot. */
function riotingGame() {
  const G = scenario()
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      draft.players["0"].unrestTokens = tokensForRiot(draft);
    })
    .build();
  expect(endTurn(G).ok).toBe(true);
  return G;
}

describe("the riot blocks the turn-end handoff", () => {
  it("keeps the acting player until the roll, then passes without another check", () => {
    const G = riotingGame();
    const turn = G.turn;

    expect(G.pendingRiot).not.toBeNull();
    expect(endTurn(G).ok).toBe(false);
    expect(G.currentPlayer).toBe("0");
    expect(G.turn).toBe(turn);

    expect(resolveRiot(G, "0").ok).toBe(true);
    expect(G.pendingRiot).toBeNull();
    expect(G.currentPlayer).toBe("1");
    expect(G.turn).toBe(turn + 1);
    expect(G.players["1"].collectedThisTurn).toBe(true);
  });

  it("collects income and draws before actions, with no second collection after the riot", () => {
    const G = scenario().opening().build();
    G.pendingPlayerEvent = null;
    G.players["0"].collectedThisTurn = false;
    G.players["0"].unrestTokens = tokensForRiot(G);
    beginTurnFor(G, "0");
    expect(G.pendingRiot).toBeNull();
    expect(G.players["0"].collectedThisTurn).toBe(true);
    expect(G.pendingPlayerEvent).toMatchObject({ playerID: "0" });
    G.pendingPlayerEvent = null;
    expect(endTurn(G).ok).toBe(true);
    expect(resolveRiot(G, "0").ok).toBe(true);
    expect(
      G.log.filter((entry) => entry.about === "0" && entry.message.includes("collected")),
    ).toHaveLength(2);
    expect(G.pendingPlayerEvent).toMatchObject({ playerID: "1" });
    expect(
      G.log.some((entry) => entry.message.includes("riot must be faced before the turn passes")),
    ).toBe(true);
  });

  it.each(["calm", "Temple"])("lets %s repair the level before the turn-end check", (repair) => {
    const G = scenario().opening().withHappiness("0", -3).withResources("0", "wealthy").build();
    G.pendingPlayerEvent = null;
    const repaired =
      repair === "calm" ? civicCalm(G, "0", "gold") : buildBuilding(G, "0", P0_CAPITAL, "temple");
    expect(repaired.ok).toBe(true);
    expect(happinessLevel(G, "0")).toBeGreaterThan(-3);
    expect(endTurn(G).ok).toBe(true);
    expect(G.pendingRiot).toBeNull();
    expect(G.currentPlayer).toBe("1");
  });

  it("waits for the last seat's riot before turning the year and opening the Assembly", () => {
    const G = scenario().opening().withHappiness("3", -3).build();
    G.currentPlayer = "3";
    G.pendingPlayerEvent = null;
    const year = G.year;
    expect(endTurn(G).ok).toBe(true);
    expect(G.pendingRiot?.playerID).toBe("3");
    expect(G.year).toBe(year);
    expect(G.assembly).toBeNull();
    expect(resolveRiot(G, "3").ok).toBe(true);
    expect(G.year).toBe(year + 1);
    expect(G.assembly?.resumePlayer).toBe("1");
    expect(G.lastTableRoll).toMatchObject({ playerID: "3", year });
  });

  it("revolts at turn end before the final tally, even if the losses leave a riot level", () => {
    const G = scenario().opening().withResources("0", { food: 100 }).build();
    G.pendingPlayerEvent = null;
    owned(G, P0_CAPITAL, "0").pops = { citizens: 0, freemen: 0, slaves: 8 };
    owned(G, G.players["0"].settlements[1], "0").pops = { citizens: 0, freemen: 0, slaves: 4 };
    G.year = 14;
    G.yearOpener = "1"; // Seat 0 is last.
    G.yearDrawPile = [];
    expect(happinessLevel(G, "0")).toBe(-6);
    expect(endTurn(G).ok).toBe(true);
    expect(G.players["0"]).toMatchObject({ revolts: 1, popsLostToUnrest: 6 });
    expect(happinessLevel(G, "0")).toBe(-3);
    expect(G.pendingRiot).toBeNull();
    expect(G.lastTableRoll).toBeNull();
    expect(G.phase).toBe("gameOver");
    expect(G.gameOverReason).toBe("deckExhausted");
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

  it("the roll's line carries the riot, its insurance and the reach it bought", () => {
    const G = riotingGame();
    const tokens = G.pendingRiot!.tokensCleared;
    expect(tokens).toBeGreaterThan(0);
    const capital = owned(G, P0_CAPITAL, "0");
    capital.pops.citizens = 2;
    expect(
      buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" }).ok,
    ).toBe(true);
    // One insurance strikes the 1 row; the 6 stays the top.
    expect(riotRollReach(G, 1)).toEqual({ lowest: 2, highest: 6 });

    expect(resolveRiot(G, "0").ok).toBe(true);
    const line = G.log.find((entry) => entry.moment?.kind === "riot")!;
    expect(line.about).toBe("0");
    expect(line.moment).toMatchObject({
      kind: "riot",
      roll: G.lastTableRoll!.roll,
      modifier: 1,
      modified: G.lastTableRoll!.modified,
      insurance: ["concession"],
      concessionTileId: P0_CAPITAL,
      tokensCleared: tokens,
    });
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
    applyUnrestAtTurnEnd(G, "0");

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
