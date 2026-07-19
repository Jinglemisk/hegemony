import { describe, expect, it } from "vitest";

import { enumerateLegalMoves } from "../game/legalMoves";
import { beamPolicy, greedyPolicy, smartPolicy } from "./policies";
import { createSimRng } from "./rng";
import { runGame } from "./runner";

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
  });
});

describe("beam policy", () => {
  it("is deterministic: same seed twice → byte-identical game", () => {
    const a = runGame({ seed: 13, mode: "standard", policy: beamPolicy, turns: 16 });
    const b = runGame({ seed: 13, mode: "standard", policy: beamPolicy, turns: 16 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("consumes no game RNG and never mutates the passed state (anti-peek)", () => {
    const G = runGame({ seed: 8, mode: "standard", policy: beamPolicy, turns: 6 });
    const moves = enumerateLegalMoves(G, G.currentPlayer);
    if (moves.length === 0) return; // gameOver — nothing to choose

    const rngBefore = G.rng;
    const snapshot = JSON.stringify(G);
    beamPolicy.choose(G, moves, createSimRng(1));

    // The seeded stream never advanced, and the search ran only on clones.
    expect(G.rng).toBe(rngBefore);
    expect(JSON.stringify(G)).toBe(snapshot);
  });

  it("plays complete turns across seeds without tripping the anti-peek assertion", () => {
    for (const seed of [1, 2, 3, 21, 99]) {
      const G = runGame({ seed, mode: "standard", policy: beamPolicy, turns: 8 });
      expect(["gameplay", "gameOver"]).toContain(G.phase);
    }
  });
});
