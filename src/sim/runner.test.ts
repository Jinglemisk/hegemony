import { describe, expect, it } from "vitest";

import type { Policy, PolicyId } from "./policies";
import { greedyPolicy, randomPolicy } from "./policies";
import { createSimRng } from "./rng";
import { playTurn, runGame } from "./runner";

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
  });

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
    for (const player of Object.values(deathmatch.players)) {
      expect(player.settlements.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("counts setup placements as turns (runs from a manual opening)", () => {
    const G = runGame({ seed: 5, mode: "standard", opening: "manual", policy: randomPolicy, turns: 12 });

    // 8 placements (4 capitals + 4 colonies) + 4 gameplay turns.
    expect(G.phase).toBe("gameplay");
    expect(G.turn).toBe(13);
  });

  it("trims the log when asked", () => {
    const G = runGame({ seed: 7, mode: "standard", policy: randomPolicy, turns: 16, trimLogTo: 10 });

    expect(G.log.length).toBeLessThanOrEqual(10);
  });

  it("honours boardLayout: shuffled diverges from classic and is recorded on state", () => {
    const classic = runGame({ seed: 5, mode: "standard", boardLayout: "classic", policy: randomPolicy, turns: 2 });
    const shuffled = runGame({ seed: 5, mode: "standard", boardLayout: "shuffled", policy: randomPolicy, turns: 2 });

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
      choose: (G, moves) => {
        calls.push({ seat: G.currentPlayer, policy: name });
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
  it("force-ends the turn against a policy that never ends it", () => {
    const stubborn: Policy = {
      name: "random",
      choose: (G, moves) => moves.find((move) => move.type !== "endTurn") ?? moves[0],
    };

    const G = runGame({ seed: 9, mode: "standard", policy: randomPolicy, turns: 4 });
    const before = G.turn;

    const forced: number[] = [];
    // A tiny action cap guarantees the force path runs even while moves remain.
    playTurn(G, stubborn, createSimRng(1), { onForceEndTurn: (_G, resolutions) => forced.push(resolutions) }, { maxActions: 2 });

    expect(G.turn).toBe(before + 1);
    // The intervention is surfaced (previously hidden): exactly one force-end fired.
    expect(forced).toHaveLength(1);
    expect(forced[0]).toBeGreaterThanOrEqual(0);
    // Any pending event now belongs to the NEXT player (drawn by their
    // begin-of-turn income) — the stuck player's own pending was force-resolved.
    if (G.pendingPlayerEvent) {
      expect(G.pendingPlayerEvent.playerID).toBe(G.currentPlayer);
    }
  });
});
