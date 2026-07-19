import { describe, expect, it } from "vitest";

import { applyMove, enumerateLegalMoves, popCompositions } from "./legalMoves";
import { totalPops } from "./core/pops";
import { scenario } from "./testing/scenario";
import { applyUnrestUpkeep } from "./unrest";
import type { HegemonyState, PlayerId } from "./types";

/** Every enumerated move must apply cleanly — the load-bearing invariant. */
function expectSound(G: HegemonyState, playerID: PlayerId) {
  const moves = enumerateLegalMoves(G, playerID);

  for (const move of moves) {
    const clone = structuredClone(G);
    const result = applyMove(clone, playerID, move);
    expect(result.ok, `enumerated move failed to apply: ${JSON.stringify(move)}`).toBe(true);
  }

  return moves;
}

/** Drive the game with the first enumerated move until the predicate holds. */
function playUntil(G: HegemonyState, done: (G: HegemonyState) => boolean, maxSteps = 200) {
  for (let step = 0; step < maxSteps; step += 1) {
    if (done(G)) return;
    const moves = enumerateLegalMoves(G, G.currentPlayer);
    expect(moves.length).toBeGreaterThan(0);
    expect(applyMove(G, G.currentPlayer, moves[0]).ok).toBe(true);
  }
  throw new Error("playUntil did not converge");
}

describe("popCompositions", () => {
  it("yields 10 splits of 3 pops and 3 splits of 1, all exact", () => {
    const capital = popCompositions(3);
    expect(capital).toHaveLength(10);
    for (const pops of capital) expect(totalPops(pops)).toBe(3);

    const colony = popCompositions(1);
    expect(colony).toHaveLength(3);
    for (const pops of colony) expect(totalPops(pops)).toBe(1);
  });
});

describe("setup enumeration", () => {
  it("offers every empty non-city-adjacent tile times 10 compositions for the first capital", () => {
    const G = scenario().build();
    const moves = expectSound(G, "0");

    // Empty board: all 36 non-oracle tiles are legal, 15 four-pop splits each
    // (the oracle at 0,1 can never host a settlement).
    expect(moves).toHaveLength(540);
    expect(moves.every((move) => move.type === "placeCapital")).toBe(true);
  });

  it("excludes tiles adjacent to an existing capital", () => {
    const G = scenario().build();
    expect(applyMove(G, "0", { type: "placeCapital", tileId: "0,0", pops: { citizens: 1, freemen: 2, slaves: 1 } }).ok).toBe(true);

    const moves = enumerateLegalMoves(G, "1");
    const offeredTiles = new Set(moves.map((move) => (move.type === "placeCapital" ? move.tileId : "")));

    // 0,0 and its 6 neighbors are gone: 30 tiles * 15 compositions.
    expect(offeredTiles.has("0,0")).toBe(false);
    expect(offeredTiles.has("1,0")).toBe(false);
    expect(offeredTiles.has("-1,1")).toBe(false);
    expect(moves).toHaveLength(450);
  });

  it("returns an empty list for off-turn players", () => {
    const G = scenario().build();
    expect(enumerateLegalMoves(G, "2")).toHaveLength(0);
  });

  it("drives deathmatch setup to gameplay with 4 settlements per player", () => {
    const G = scenario({ mode: "deathmatch" }).build();

    playUntil(G, (state) => state.phase === "gameplay");

    for (const player of Object.values(G.players)) {
      expect(player.settlements).toHaveLength(4);
    }
    // The final placement bootstrapped player 0's first gameplay turn.
    expect(G.players["0"].collectedThisTurn).toBe(true);
  });

  it("is sound mid-deathmatch-setup (colony rounds)", () => {
    const G = scenario({ mode: "deathmatch" }).build();

    playUntil(G, (state) => state.phase === "setupColony");
    playUntil(G, (state) => state.players["3"].settlements.length === 2);

    const moves = expectSound(G, G.currentPlayer);
    expect(moves.every((move) => move.type === "placeColony")).toBe(true);
    // Colony placements carry exactly two pops.
    for (const move of moves) {
      if (move.type === "placeColony") expect(totalPops(move.pops)).toBe(2);
    }
  });
});

describe("pending-event enumeration", () => {
  it("offers only resolveEvent while an addPops card is pending, one per target tile", () => {
    const G = scenario().stackPlayerEvent("player-new-citizen").opening().build();

    expect(G.pendingPlayerEvent?.card.id).toBe("player-new-citizen");
    const moves = expectSound(G, "0");

    // Player 0 owns the metropolis (4/10) and founding colony (2/4) — both have capacity.
    expect(moves).toEqual([
      { type: "resolveEvent", choiceIndex: 0, targetTileId: "-2,0" },
      { type: "resolveEvent", choiceIndex: 0, targetTileId: "3,0" },
    ]);
  });

  it("offers one move per option of a choice card, and blocks endTurn", () => {
    const G = scenario().stackPlayerEvent("player-emergency-labor").opening().build();

    const moves = expectSound(G, "0");

    expect(moves).toEqual([
      { type: "resolveEvent", choiceIndex: 0 },
      { type: "resolveEvent", choiceIndex: 1 },
    ]);
    expect(applyMove(structuredClone(G), "0", { type: "endTurn" }).ok).toBe(false);
  });

  it("skips addPops targets that lack capacity", () => {
    const G = scenario()
      .stackPlayerEvent("player-captured-laborers") // +2 slaves, needs 2 free capacity
      .opening()
      .setPops("0", "3,0", { citizens: 0, freemen: 0, slaves: 3 }) // colony 3/4: only 1 free
      .build();

    const moves = enumerateLegalMoves(G, "0");
    expect(moves).toEqual([{ type: "resolveEvent", choiceIndex: 0, targetTileId: "-2,0" }]);
  });
});

describe("gameplay enumeration", () => {
  function openingInGameplay(rig?: { wealthy?: boolean }) {
    // Stack a no-choice card so player 0's pending "reveal" resolves without a target.
    const G = scenario().stackPlayerEvent("player-good-stores").opening().build();
    expect(applyMove(G, "0", { type: "resolveEvent", choiceIndex: 0 }).ok).toBe(true);
    if (rig?.wealthy) {
      Object.assign(G.players["0"].resources, { wood: 200, stone: 200, gold: 200, food: 200 });
    }
    return G;
  }

  it("is sound for the fresh opening position", () => {
    const G = openingInGameplay();
    const moves = expectSound(G, "0");
    expect(moves.some((move) => move.type === "endTurn")).toBe(true);
  });

  it("is sound for a wealthy player (all costed moves offered)", () => {
    const G = openingInGameplay({ wealthy: true });
    const moves = expectSound(G, "0");

    const types = new Set(moves.map((move) => move.type));
    expect(types.has("foundColony")).toBe(true);
    expect(types.has("buildBuilding")).toBe(true);
    expect(types.has("growPop")).toBe(true);
    expect(types.has("movePops")).toBe(true);
  });

  it("never offers collectIncome and keeps movePops bundles non-empty and bounded", () => {
    const G = openingInGameplay({ wealthy: true });
    const moves = enumerateLegalMoves(G, "0");

    for (const move of moves) {
      expect(move.type).not.toBe("collectIncome");
      // Bundles are always a positive selection (never an empty transfer).
      if (move.type === "movePops") expect(totalPops(move.pops)).toBeGreaterThan(0);
    }
  });

  it("offers multi-pop movePops bundles that apply cleanly", () => {
    const G = scenario()
      .stackPlayerEvent("player-good-stores")
      .opening()
      .setPops("0", "-2,0", { citizens: 1, freemen: 0, slaves: 3 }) // metropolis: a 3-slave surplus
      .setPops("0", "3,0", { citizens: 0, freemen: 0, slaves: 1 }) // colony: room for 3 more
      .build();
    expect(applyMove(G, "0", { type: "resolveEvent", choiceIndex: 0 }).ok).toBe(true);

    // The whole slave stack (3) is a single enumerated move — previously three actions.
    const bundle = enumerateLegalMoves(G, "0").find(
      (move) =>
        move.type === "movePops" &&
        move.sourceTileId === "-2,0" &&
        move.targetTileId === "3,0" &&
        totalPops(move.pops) === 3,
    );
    expect(bundle).toBeDefined();
    expect(applyMove(structuredClone(G), "0", bundle!).ok).toBe(true);
  });

  it("drops every costed move when the player cannot afford anything", () => {
    const G = openingInGameplay();
    Object.assign(G.players["0"].resources, { wood: 0, stone: 0, gold: 0, food: 0 });

    const types = new Set(enumerateLegalMoves(G, "0").map((move) => move.type));

    expect(types.has("foundColony")).toBe(false);
    expect(types.has("buildBuilding")).toBe(false);
    expect(types.has("upgradeColonyToCity")).toBe(false);
    expect(types.has("growPop")).toBe(false);
    // Free actions survive.
    expect(types.has("movePops")).toBe(true);
    expect(types.has("endTurn")).toBe(true);
  });

  it("enumerates deterministically", () => {
    const G = openingInGameplay({ wealthy: true });

    expect(enumerateLegalMoves(G, "0")).toEqual(enumerateLegalMoves(G, "0"));
  });

  it("plays whole turns end-to-end through applyMove", () => {
    const G = openingInGameplay();
    const startTurn = G.turn;

    playUntil(G, (state) => state.turn >= startTurn + 4);

    expect(G.turn).toBe(startTurn + 4);
    expect(G.phase).toBe("gameplay");
  });
});

describe("applyMove boundary guard", () => {
  /** A clean gameplay position for player 0 — no pending event or riot. */
  function cleanGameplay() {
    return scenario()
      .opening()
      .mutate((draft) => {
        draft.pendingPlayerEvent = null;
      })
      .build();
  }

  it("rejects an off-turn move (not the current player)", () => {
    const G = cleanGameplay();
    expect(G.currentPlayer).toBe("0");
    // The engine's public dispatcher must refuse a move from a seat that is not up.
    expect(applyMove(structuredClone(G), "1", { type: "endTurn" }).ok).toBe(false);
    // ...but the seat that IS up can act — the guard never over-rejects.
    expect(applyMove(structuredClone(G), "0", { type: "endTurn" }).ok).toBe(true);
  });

  it("blocks normal moves during a pending riot but allows resolving it", () => {
    const G = scenario()
      .opening()
      .mutate((draft) => {
        draft.pendingPlayerEvent = null;
        draft.players["0"].resources.happiness = -8;
      })
      .build();
    applyUnrestUpkeep(G, "0");
    expect(G.pendingRiot?.playerID).toBe("0");

    expect(applyMove(structuredClone(G), "0", { type: "endTurn" }).ok).toBe(false);
    expect(applyMove(structuredClone(G), "0", { type: "resolveRiot" }).ok).toBe(true);
  });

  it("blocks normal moves during a pending event but allows resolving it", () => {
    const G = scenario().stackPlayerEvent("player-emergency-labor").opening().build();
    expect(G.pendingPlayerEvent?.playerID).toBe("0");

    expect(applyMove(structuredClone(G), "0", { type: "endTurn" }).ok).toBe(false);
    expect(applyMove(structuredClone(G), "0", { type: "resolveEvent", choiceIndex: 0 }).ok).toBe(true);
  });

  it("refuses a gameplay move in setup and a setup move in gameplay", () => {
    const setup = scenario().build(); // setupCapital phase
    expect(applyMove(structuredClone(setup), "0", { type: "endTurn" }).ok).toBe(false);

    const play = cleanGameplay();
    const stray = { type: "placeCapital" as const, tileId: "2,0", pops: { citizens: 1, freemen: 2, slaves: 1 } };
    expect(applyMove(structuredClone(play), "0", stray).ok).toBe(false);
  });
});
