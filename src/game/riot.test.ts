import { describe, expect, it } from "vitest";

import { buyRiotInsurance, resolveRiot } from "./riot";
import { endTurn } from "./turn";
import { applyUnrestUpkeep } from "./unrest";
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

/** An opening where player 0 is mid-riot: happiness pushed down, upkeep run. */
function riotingGame(happiness: number) {
  const G = scenario()
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      draft.players["0"].resources.happiness = happiness;
    })
    .build();
  applyUnrestUpkeep(G, "0");
  return G;
}

describe("the riot blocks the turn (D9)", () => {
  it("endTurn is illegal while the riot stands; resolving unblocks it", () => {
    const G = riotingGame(-6);

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
    G.players["0"].resources.happiness = -6;
    applyUnrestUpkeep(G, "0");

    expect(G.players["0"].collectedThisTurn).toBe(false);

    expect(resolveRiot(G, "0").ok).toBe(true);

    // resolveRiot runs the deferred automatic collection.
    expect(G.players["0"].collectedThisTurn).toBe(true);
  });
});

describe("riot insurance", () => {
  it("each option once per riot, all three stack to +3", () => {
    const G = riotingGame(-6);
    G.players["0"].resources.food = 4;
    G.players["0"].resources.influence = 3;

    expect(buyRiotInsurance(G, "0", "breadDole").ok).toBe(true);
    expect(buyRiotInsurance(G, "0", "breadDole").ok).toBe(false);
    expect(buyRiotInsurance(G, "0", "patronage").ok).toBe(true);
    expect(buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" }).ok).toBe(true);

    expect(G.pendingRiot?.boughtInsurance).toHaveLength(3);
    expect(G.players["0"].resources.food).toBe(0);
    expect(G.players["0"].resources.influence).toBe(0);
  });

  it("the concession demotes the named pop for free", () => {
    const G = riotingGame(-6);
    const capital = G.board.tiles
      .find((tile) => tile.id === P0_CAPITAL)!
      .settlements.find((candidate) => candidate.owner === "0")!;
    capital.pops = { citizens: 2, freemen: 1, slaves: 0 };
    G.players["0"].resources.influence = 0;

    expect(buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" }).ok).toBe(true);

    expect(capital.pops).toEqual({ citizens: 1, freemen: 2, slaves: 0 });
    expect(buyRiotInsurance(G, "0", "concession", { tileId: P0_CAPITAL, from: "citizens" }).ok).toBe(false);
  });

  it("full insurance makes mild-tier pop loss impossible (worst case is food or gold)", () => {
    // Deliberate design (Q15): min roll 1 + 3 = 4 — granary (row 4) is the floor.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const G = riotingGame(-6);
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

describe("the severe tier", () => {
  it("rolls at -2, doubles pop losses, and rebounds happiness to -4", () => {
    const G = riotingGame(-12);
    expect(G.pendingRiot?.tier).toBe("revolt");
    const before = totalPopsOf(G, "0");

    expect(resolveRiot(G, "0").ok).toBe(true);

    const roll = G.lastTableRoll!;
    expect(roll.modifier).toBe(-2);
    expect(roll.modified).toBe(Math.max(1, roll.roll - 2));
    expect(G.players["0"].resources.happiness).toBe(-4);

    // Doubling: whatever pops the landed row takes, the tally matches and is even
    // when the row is a pure pop-loss row.
    const lost = before - totalPopsOf(G, "0");
    expect(G.players["0"].popsLostToUnrest).toBe(lost);
    if (roll.modified === 2 || roll.modified === 3) {
      expect(lost).toBe(roll.modified === 2 ? 4 : 2);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const run = () => {
      const G = riotingGame(-12);
      resolveRiot(G, "0");
      return { roll: G.lastTableRoll?.roll, pops: totalPopsOf(G, "0"), log: G.log.length };
    };

    expect(run()).toEqual(run());
  });

  it("a mild riot never rebounds — it can re-fire next upkeep (civic calm's job)", () => {
    const G = riotingGame(-6);

    resolveRiot(G, "0");

    // Whatever the roll took, the meter itself was not reset upward.
    expect(G.players["0"].resources.happiness).toBeLessThanOrEqual(-6);
  });
});
