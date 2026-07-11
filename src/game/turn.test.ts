import { describe, expect, it } from "vitest";

import { createGame, endTurn, nextPlayer } from "./turn";
import type { HegemonyState } from "./types";

// Opt into the scripted 4-player two-city opening (dev preload, off by default).
const preloadedGame = (seed: number) => createGame(seed, undefined, "classic", true);

// A player event drawn during income collection blocks endTurn; clear it first to
// exercise the turn transition itself (as resolving the event would in the UI).
function advanceTurn(G: HegemonyState) {
  G.pendingPlayerEvent = null;
  return endTurn(G);
}

describe("turn machine", () => {
  it("boots the preloaded opening into gameplay for player 0", () => {
    const G = preloadedGame(1);
    expect(G.phase).toBe("gameplay");
    expect(G.currentPlayer).toBe("0");
    for (const id of ["0", "1", "2", "3"] as const) {
      expect(G.players[id].settlements).toHaveLength(2);
    }
    // Player 0's turn-start income was auto-collected.
    expect(G.players["0"].hasCollectedGameplayIncome).toBe(true);
  });

  it("wraps the active player 0 -> 1 -> 2 -> 3 -> 0", () => {
    expect(nextPlayer("0")).toBe("1");
    expect(nextPlayer("1")).toBe("2");
    expect(nextPlayer("3")).toBe("0");
  });

  it("ends a turn: advances to the next player and increments the turn counter", () => {
    const G = preloadedGame(1);
    const turnBefore = G.turn;

    const result = advanceTurn(G);

    expect(result.ok).toBe(true);
    expect(G.currentPlayer).toBe("1");
    expect(G.turn).toBe(turnBefore + 1);
  });

  it("starts a new season when play wraps back to player 0", () => {
    const G = preloadedGame(1);
    const seasonBefore = G.season;

    advanceTurn(G); // 0 -> 1
    advanceTurn(G); // 1 -> 2
    advanceTurn(G); // 2 -> 3
    advanceTurn(G); // 3 -> 0 : new season

    expect(G.currentPlayer).toBe("0");
    expect(G.season).toBe(seasonBefore + 1);
  });

  it("refuses to end a turn while a player event is pending", () => {
    const G = preloadedGame(1);
    G.pendingPlayerEvent = { card: G.playerDrawPile[0], playerID: "0" };
    expect(endTurn(G).ok).toBe(false);
  });
});
