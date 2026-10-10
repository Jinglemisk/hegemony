import { describe, expect, it } from "vitest";

import type { Policy, PolicyId } from "./policies";
import { greedyPolicy, randomPolicy } from "./policies";
import { createSimRng } from "./rng";
import { playTurn, runGame } from "./runner";
import { scenario } from "../game/testing/scenario";

// Several full games per test; the policy opening costs ~0.4 s of placement search per
// game on top of play, so these get a timeout that survives a loaded machine.

describe("runGame determinism", () => {
  it("random policy: same seed twice → byte-identical state", () => {
    const first = runGame({ seed: 7, mode: "standard", policy: randomPolicy, turns: 24 });
    const second = runGame({ seed: 7, mode: "standard", policy: randomPolicy, turns: 24 });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("greedy policy: same seed twice → byte-identical state", () => {
    const first = runGame({ seed: 11, mode: "standard", policy: greedyPolicy, turns: 8 });
    const second = runGame({ seed: 11, mode: "standard", policy: greedyPolicy, turns: 8 });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  }, 30_000);

  it("different seeds diverge", () => {
    const first = runGame({ seed: 1, mode: "standard", policy: randomPolicy, turns: 8 });
    const second = runGame({ seed: 2, mode: "standard", policy: randomPolicy, turns: 8 });

    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });
});

describe("runGame smoke", () => {
  it("completes across seeds and modes without deadlocks", () => {
    for (const seed of [3, 14, 159, 2653, 58979]) {
      const G = runGame({ seed, mode: "standard", policy: randomPolicy, turns: 16 });
      expect(G.phase).toBe("gameplay");
    }

    const deathmatch = runGame({ seed: 42, mode: "deathmatch", policy: randomPolicy, turns: 8 });
    expect(deathmatch.phase).toBe("gameplay");
    // Four are placed at setup. A rival's upgrade is cheap enough to happen inside
    // eight turns, and it evicts a colony sharing the tile, so one may be gone.
    for (const player of Object.values(deathmatch.players)) {
      expect(player.settlements.length).toBeGreaterThanOrEqual(3);
    }
  }, 30_000);

  it("counts setup placements as turns (runs from a manual opening)", () => {
    const G = runGame({
      seed: 5,
      mode: "standard",
      opening: "manual",
      policy: randomPolicy,
      turns: 12,
    });

    // 8 placements (4 capitals + 4 colonies) + 4 gameplay turns.
    expect(G.phase).toBe("gameplay");
    expect(G.turn).toBe(13);
  });

  it("trims the log when asked", () => {
    const G = runGame({
      seed: 7,
      mode: "standard",
      policy: randomPolicy,
      turns: 16,
      trimLogTo: 10,
    });

    expect(G.log.length).toBeLessThanOrEqual(10);
  });

  it("honours boardLayout: shuffled diverges from classic and is recorded on state", () => {
    const classic = runGame({
      seed: 5,
      mode: "standard",
      boardLayout: "classic",
      policy: randomPolicy,
      turns: 2,
    });
    const shuffled = runGame({
      seed: 5,
      mode: "standard",
      boardLayout: "shuffled",
      policy: randomPolicy,
      turns: 2,
    });

    expect(classic.boardLayout).toBe("classic");
    expect(shuffled.boardLayout).toBe("shuffled");
    // Same seed, different layout → a different terrain arrangement.
    const terrainOf = (G: typeof classic) => G.board.tiles.map((tile) => tile.terrain).join(",");
    expect(terrainOf(shuffled)).not.toBe(terrainOf(classic));

    // Omitting the option keeps the reproducible classic default.
    const defaulted = runGame({ seed: 5, mode: "standard", policy: randomPolicy, turns: 2 });
    expect(defaulted.boardLayout).toBe("classic");
  });

  it("routes each seat to its own policy via seatPolicies", () => {
    const calls: Array<{ seat: string; policy: string }> = [];
    const recorder = (name: PolicyId): Policy => ({
      name,
      choose: (view, moves) => {
        calls.push({ seat: view.state.currentPlayer, policy: name });
        return moves.find((move) => move.type === "endTurn") ?? moves[0];
      },
    });
    const greedy = recorder("greedy");
    const smart = recorder("smart");

    runGame({
      seed: 3,
      mode: "standard",
      policy: greedy, // fallback (unused — every seat is named)
      seatPolicies: { "0": greedy, "1": smart, "2": smart, "3": smart },
      // Include setup picks and a multi-seat Assembly.
      turns: 8,
    });

    const seat0 = calls.filter((call) => call.seat === "0");
    const seat1 = calls.filter((call) => call.seat === "1");
    expect(seat0.length).toBeGreaterThan(0);
    expect(seat0.every((call) => call.policy === "greedy")).toBe(true);
    expect(seat1.length).toBeGreaterThan(0);
    expect(seat1.every((call) => call.policy === "smart")).toBe(true);
  });
});

describe("action cap", () => {
  it.each([false, true])(
    "completes exactly one turn when the cap finds a riot (already pending: %s)",
    (pending) => {
      const G = scenario().opening().withHappiness("0", -3).build();
      G.pendingPlayerEvent = null;
      if (pending) {
        G.players["0"].unrestTokens = 0;
        G.pendingRiot = {
          playerID: "0",
          boughtInsurance: [],
          tokensCleared: 0,
          concessionTileId: null,
        };
      }
      const moves: string[] = [];
      const forced: number[] = [];
      const next = playTurn(
        G,
        randomPolicy,
        createSimRng(1),
        {
          onMove: (_state, _player, command) => moves.push(command.type),
          onForceEndTurn: (_state, count) => forced.push(count),
        },
        { maxActions: 0 },
      );
      expect(next.turn).toBe(G.turn + 1);
      expect(next.currentPlayer).toBe("1");
      expect(next.pendingRiot).toBeNull();
      expect(moves).toEqual(pending ? ["resolveRiot"] : ["endTurn", "resolveRiot"]);
      expect(forced).toEqual([1]);
    },
  );

  it("does not count the riot choices that follow an accepted endTurn", () => {
    const G = scenario().opening().withHappiness("0", -3).build();
    G.pendingPlayerEvent = null;
    Object.assign(G.players["0"].resources, { food: 10, influence: 10 });
    // Ends at once, then takes every insurance on offer before the roll.
    const ender: Policy = {
      name: "random",
      choose: (_view, moves) =>
        moves.find((move) => move.type === "endTurn") ??
        moves.find((move) => move.type === "buyRiotInsurance") ??
        moves[0],
    };
    const moves: string[] = [];
    let forced = 0;
    const next = playTurn(
      G,
      ender,
      createSimRng(1),
      {
        onMove: (_state, _player, command) => moves.push(command.type),
        onForceEndTurn: () => (forced += 1),
      },
      { maxActions: 1 },
    );

    // The one counted action was endTurn. The seat still chose its insurance.
    expect(moves[0]).toBe("endTurn");
    expect(moves.filter((move) => move === "buyRiotInsurance").length).toBeGreaterThan(0);
    expect(moves.at(-1)).toBe("resolveRiot");
    expect(forced).toBe(0);
    expect(next.turn).toBe(G.turn + 1);
  });

  it("force-ends the turn against a policy that never ends it", () => {
    const stubborn: Policy = {
      name: "random",
      choose: (G, moves) => moves.find((move) => move.type !== "endTurn") ?? moves[0],
    };

    const G = runGame({ seed: 9, mode: "standard", policy: randomPolicy, turns: 4 });
    const before = G.turn;

    const forced: number[] = [];
    // A tiny action cap guarantees the force path runs even while moves remain.
    const next = playTurn(
      G,
      stubborn,
      createSimRng(1),
      { onForceEndTurn: (_G, resolutions) => forced.push(resolutions) },
      { maxActions: 2 },
    );

    expect(next.turn).toBe(before + 1);
    // The intervention is surfaced (previously hidden): exactly one force-end fired.
    expect(forced).toHaveLength(1);
    expect(forced[0]).toBeGreaterThanOrEqual(0);
    // Any pending event now belongs to the NEXT player (drawn by their
    // begin-of-turn income) — the stuck player's own pending was force-resolved.
    if (next.pendingPlayerEvent) {
      expect(next.pendingPlayerEvent.playerID).toBe(next.currentPlayer);
    }
  });
});
