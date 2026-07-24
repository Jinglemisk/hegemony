import { describe, expect, it } from "vitest";

import { applyMove, enumerateLegalMoves } from "../game/legalMoves";
import { scenario } from "../game/testing/scenario";
import { endTurn } from "../game/turn";
import type { HegemonyState } from "../game/types";
import {
  beamPolicy,
  greedyPolicy,
  masterPolicy,
  politicalPolicy,
  settlerPolicy,
  smartPolicy,
} from "./policies";
import { createSimRng } from "./rng";
import { runGame } from "./runner";

/** Cycle whole turns until the agora convenes (spring of Year 2+). Unattended seats can
 *  pick up an event or riot on the way; both are dismissed exactly as the engine suites do. */
function playUntilAssembly(G: HegemonyState, limit = 40): void {
  let turns = 0;
  while (!G.assembly && G.phase === "gameplay" && turns < limit) {
    G.pendingPlayerEvent = null;
    G.pendingRiot = null;
    endTurn(G);
    turns += 1;
  }
}

/** Recursively freeze, approximating immer's deep-frozen committed UI state. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

describe("policy evaluation is side-effect-free", () => {
  it("greedy and smart choose on a deep-frozen state without throwing (immer-safe)", () => {
    const rng = createSimRng(4);
    const G = runGame({ seed: 4, mode: "standard", policy: greedyPolicy, turns: 8 });
    const moves = enumerateLegalMoves(G, G.currentPlayer);
    expect(moves.length).toBeGreaterThan(0);

    deepFreeze(G);

    // The old evaluator mutated G.players[x].resources in place then restored it —
    // which throws on frozen state. The projection now runs on a copy.
    expect(() => greedyPolicy.choose(G, moves, rng)).not.toThrow();
    expect(() => smartPolicy.choose(G, moves, rng)).not.toThrow();
    // The beam searches on clones only, so a frozen committed state is safe too.
    expect(() => beamPolicy.choose(G, moves, rng)).not.toThrow();
    // The political bot evaluates on structuredClones too — never mutates the passed G.
    expect(() => politicalPolicy.choose(G, moves, rng)).not.toThrow();
    // The settler bot's frontier term only READS the board (canPlaceColonyOnTile) — safe on frozen state.
    expect(() => settlerPolicy.choose(G, moves, rng)).not.toThrow();
    // Master composes the beam with the political + frontier score and is equally safe.
    expect(() => masterPolicy.choose(G, moves, rng)).not.toThrow();
  });
});

// The settler bot adds map/expansion foresight — a frontier term over the same smart
// evaluation — so like the others it must stay deterministic and complete games (its
// one-ply search still meets the agora, where it passes like smart).
describe("settler policy", () => {
  it("is deterministic: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 31, mode: "standard", policy: settlerPolicy, turns: 60 });
    const b = runGame({ seed: 31, mode: "standard", policy: settlerPolicy, turns: 60 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 60000);

  it("plays complete games across seeds without deadlocking", () => {
    for (const seed of [1, 2, 3]) {
      const G = runGame({ seed, mode: "standard", policy: settlerPolicy, turns: 80 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    }
  }, 90000);
});

describe("master policy", () => {
  it("is deterministic: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 17, mode: "standard", policy: masterPolicy, turns: 8 });
    const b = runGame({ seed: 17, mode: "standard", policy: masterPolicy, turns: 8 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 30000);

  it("uses the political Assembly strategy and carries the session to completion", () => {
    const G = scenario({ seed: 23 }).opening().build();
    playUntilAssembly(G);
    expect(G.assembly).toBeTruthy();

    const masterRng = createSimRng(1);
    const politicalRng = createSimRng(1);
    let steps = 0;

    while (G.assembly && steps < 500) {
      const player = G.currentPlayer;
      const moves = enumerateLegalMoves(G, player);
      expect(moves.length).toBeGreaterThan(0);

      const choice = masterPolicy.choose(G, moves, masterRng);
      // The Assembly half of master is deliberately the proven political heuristic.
      expect(choice).toEqual(politicalPolicy.choose(G, moves, politicalRng));
      expect(applyMove(G, player, choice).ok).toBe(true);
      steps += 1;
    }

    expect(G.assembly).toBeNull();
    expect(steps).toBeLessThan(500);
  });
});

// The political bot plays the Assembly (Phase 3-C). Its heuristics score hypothetical
// enactments on clones, so — like the beam — they must be deterministic, RNG-free, and
// side-effect-free even mid-agora. And a fully-engaged assembly must never deadlock the
// runner (it once did: an engaged agora blew past the single-turn action cap and the
// force-end tried an endTurn that is illegal while the agora stands).
describe("political policy", () => {
  it("is deterministic across assemblies: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 21, mode: "standard", policy: politicalPolicy, turns: 60 });
    const b = runGame({ seed: 21, mode: "standard", policy: politicalPolicy, turns: 60 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 60000);

  it("plays complete games across seeds without deadlocking through the agora", () => {
    for (const seed of [1, 2, 3]) {
      const G = runGame({ seed, mode: "standard", policy: politicalPolicy, turns: 80 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    }
  }, 90000);

  it("chooses at an OPEN assembly without advancing game RNG or mutating (anti-peek)", () => {
    const G = scenario({ seed: 7 }).opening().build();
    playUntilAssembly(G);
    expect(G.assembly).toBeTruthy(); // the agora convened

    const moves = enumerateLegalMoves(G, G.currentPlayer);
    expect(moves.length).toBeGreaterThan(0);

    const rngBefore = G.rng;
    const snapshot = JSON.stringify(G);
    politicalPolicy.choose(G, moves, createSimRng(1));

    // The seeded stream never advanced, and the evaluation ran only on clones.
    expect(G.rng).toBe(rngBefore);
    expect(JSON.stringify(G)).toBe(snapshot);
  });

  it("passes in the proposal round when it cannot afford to fish or repeal", () => {
    const G = scenario({ seed: 5 }).opening().build();
    playUntilAssembly(G);
    if (!G.assembly || G.assembly.phase !== "proposal") {
      return; // reached voting straight away this seed — the gate is exercised elsewhere
    }
    const me = G.currentPlayer;
    G.players[me].resources.influence = 0; // nothing to spend

    const choice = politicalPolicy.choose(G, enumerateLegalMoves(G, me), createSimRng(1));
    expect(choice.type).toBe("assemblyPass");
  });
});

// The beam search is compute-heavy, so these run short games and lift vitest's default
// 5s per-test timeout (they can exceed it on slower CI hardware).
describe("beam policy", () => {
  it("is deterministic: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 13, mode: "standard", policy: beamPolicy, turns: 8 });
    const b = runGame({ seed: 13, mode: "standard", policy: beamPolicy, turns: 8 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 30000);

  it("consumes no game RNG and never mutates the passed state (anti-peek)", () => {
    const G = runGame({ seed: 8, mode: "standard", policy: beamPolicy, turns: 5 });
    const moves = enumerateLegalMoves(G, G.currentPlayer);
    if (moves.length === 0) return; // gameOver — nothing to choose

    const rngBefore = G.rng;
    const snapshot = JSON.stringify(G);
    beamPolicy.choose(G, moves, createSimRng(1));

    // The seeded stream never advanced, and the search ran only on clones.
    expect(G.rng).toBe(rngBefore);
    expect(JSON.stringify(G)).toBe(snapshot);
  }, 30000);

  it("plays complete turns across seeds without tripping the anti-peek assertion", () => {
    for (const seed of [1, 2, 3]) {
      const G = runGame({ seed, mode: "standard", policy: beamPolicy, turns: 5 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    }
  }, 30000);
});
