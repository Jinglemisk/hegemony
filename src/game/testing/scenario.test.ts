import { describe, expect, it } from "vitest";

import { endTurn } from "../turn";
import { owned, scenario, tile } from "./scenario";

describe("scenario builder", () => {
  it("replays the scripted opening into gameplay with player 0 bootstrapped", () => {
    const G = scenario().opening().build();

    expect(G.phase).toBe("gameplay");
    expect(G.currentPlayer).toBe("0");
    for (const player of Object.values(G.players)) {
      expect(player.settlements).toHaveLength(2);
    }
    // beginGameplayTurn auto-collected player 0's income and drew a player event.
    expect(G.players["0"].collectedThisTurn).toBe(true);
    expect(G.lastPlayerEvent).not.toBeNull();
  });

  it("stacked player card is the next draw", () => {
    // Stack before opening() so player 0's bootstrap income draws it.
    const G = scenario().stackPlayerEvent("player-new-citizen").opening().build();

    expect(G.lastPlayerEvent?.id).toBe("player-new-citizen");
    // An addPops card with capacity available blocks as a pending choice.
    expect(G.pendingPlayerEvent?.card.id).toBe("player-new-citizen");
    expect(G.pendingPlayerEvent?.playerID).toBe("0");
  });

  it("stacked seasonal card is revealed by the opening when it suits the season", () => {
    // timber-levies is spring-suited, so stacking it wins the opening's spring draw.
    const G = scenario().stackSeasonalEvent("season-timber-levies").opening().build();

    expect(G.activeSeasonEvent?.card.id).toBe("season-timber-levies");
  });

  it("pokes state directly: settlements, pops, resources, happiness", () => {
    const G = scenario()
      .withSettlement("2", "0,0", "city", { citizens: 2, freemen: 1, slaves: 0 })
      .setPops("2", "0,0", { citizens: 4, freemen: 0, slaves: 1 })
      .withResources("2", "wealthy")
      .withHappiness("2", -7)
      .build();

    expect(G.players["2"].settlements).toEqual(["0,0"]);
    expect(owned(G, "0,0", "2").pops).toEqual({ citizens: 4, freemen: 0, slaves: 1 });
    expect(G.players["2"].resources.wood).toBe(200);
    expect(G.players["2"].resources.happiness).toBe(-7);
  });

  it("applies mode and ruleset patch", () => {
    const G = scenario({ mode: "fastStart", patch: { placementPopCounts: { colony: 2 } } }).build();

    expect(G.players["0"].resources.wood).toBe(40);
    expect(G.ruleset.placementPopCounts.colony).toBe(2);
    // Untouched values survive the patch.
    expect(G.ruleset.placementPopCounts.city).toBe(3);
  });

  it("rejects the scripted opening outside the standard setup", () => {
    expect(() => scenario({ mode: "deathmatch" }).opening()).toThrow(/capital\+colony/);
  });

  it("helpers throw on missing entities", () => {
    const G = scenario().build();

    expect(() => tile(G, "9,9")).toThrow(/no tile/);
    expect(() => owned(G, "0,0", "0")).toThrow(/no 0 settlement/);
  });

  it("endTurn works on a built opening once the pending event is out of the way", () => {
    const G = scenario().stackPlayerEvent("player-good-stores").opening().build();

    // Immediate-effect cards still arrive as a pending "reveal", so endTurn is
    // blocked until it is resolved — the invariant the sim loop leans on.
    expect(endTurn(G).ok).toBe(false);
  });
});
