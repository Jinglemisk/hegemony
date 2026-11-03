import { describe, expect, it } from "vitest";

import { civicCalm, demotePop, promotePop } from "./civic";
import { happinessLevel, standingHappiness } from "./happiness";
import { applyUnrestAtTurnEnd } from "./unrest";
import { scenario, owned } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState } from "./types";

/** The 0xc0ffee bootstrap leaves a pending player event; clear it so it never blocks the verbs under test. */
const clearPending = (draft: HegemonyState) => {
  draft.pendingPlayerEvent = null;
};

const P0_CAPITAL = TEST_OPENING_SETUP[0].capital.tileId;

describe("civic calm", () => {
  it("2 influence or 2 gold buys +2 that Beloved does not read", () => {
    for (const payment of ["influence", "gold"] as const) {
      const G = scenario()
        .opening()
        .mutate(clearPending)
        .withResources("0", { [payment]: 2 })
        .build();
      const before = happinessLevel(G, "0");

      expect(civicCalm(G, "0", payment).ok).toBe(true);

      expect(G.players["0"].resources[payment]).toBe(0);
      expect(happinessLevel(G, "0")).toBe(before + 2);
      // Beloved reads happiness without it: calm cannot buy a victory card.
      expect(standingHappiness(G, "0")).toBe(before);
    }
  });

  it("counts throughout the current year, including the buyer's turn-end check", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .withResources("0", { gold: 2 })
      .withHappiness("0", -4)
      .build();

    expect(civicCalm(G, "0", "gold").ok).toBe(true);
    applyUnrestAtTurnEnd(G, "0");

    // -4 + 2 stands above the -3 line; turn end does not expire the bonus.
    expect(G.pendingRiot).toBeNull();
    expect(G.players["0"].calmUsesThisTurn).toBe(1);
    expect(happinessLevel(G, "0")).toBe(-2);
  });
});

describe("the social ladder (D8)", () => {
  it("promotes a slave to freeman for 2 food", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 1, slaves: 2 })
      .withResources("0", { food: 2 })
      .build();

    expect(promotePop(G, "0", P0_CAPITAL, "slaves").ok).toBe(true);

    expect(owned(G, P0_CAPITAL, "0").pops).toEqual({ citizens: 1, freemen: 2, slaves: 1 });
    expect(G.players["0"].resources.food).toBe(0);
  });

  it("promotes a freeman to citizen for 2 gold", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 1, slaves: 2 })
      .withResources("0", { gold: 2 })
      .build();

    expect(promotePop(G, "0", P0_CAPITAL, "freemen").ok).toBe(true);

    expect(owned(G, P0_CAPITAL, "0").pops).toEqual({ citizens: 2, freemen: 0, slaves: 2 });
  });

  it("demotes a freeman to slave for 1 influence and nothing else", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 0, freemen: 2, slaves: 0 })
      .withResources("0", { influence: 1 })
      .build();

    expect(demotePop(G, "0", P0_CAPITAL, "freemen").ok).toBe(true);

    expect(owned(G, P0_CAPITAL, "0").pops).toEqual({ citizens: 0, freemen: 1, slaves: 1 });
    expect(G.players["0"].resources.influence).toBe(0);
    expect(G.players["0"].unrestTokens).toBe(0);
  });

  it("demotion is free — and outside the ladder's cap — during your own riot (the mob forces it)", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 2, freemen: 1, slaves: 0 })
      .withResources("0", { influence: 0 })
      .build();
    G.pendingRiot = {
      playerID: "0",
      boughtInsurance: [],
      tokensCleared: 0,
      concessionTileId: null,
      losses: null,
    };

    // No influence, still legal.
    expect(demotePop(G, "0", P0_CAPITAL, "freemen").ok).toBe(true);
    expect(G.players["0"].ladderUsesThisTurn).toBe(0);

    // But only for the rioting player — everyone else waits out the blockade.
    expect(demotePop(G, "1", TEST_OPENING_SETUP[1].capital.tileId, "citizens").ok).toBe(false);
  });
});
