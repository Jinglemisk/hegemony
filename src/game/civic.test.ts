import { describe, expect, it } from "vitest";

import { civicCalm, demotePop, promotePop } from "./civic";
import { scenario, owned } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState } from "./types";

/** The 0xc0ffee bootstrap leaves a pending player event; clear it so it never blocks the verbs under test. */
const clearPending = (draft: HegemonyState) => {
  draft.pendingPlayerEvent = null;
};

const P0_CAPITAL = TEST_OPENING_SETUP[0].capital.tileId;

describe("civic calm (D7)", () => {
  it("stabilize province: 4 influence buys +3 happiness", () => {
    const G = scenario().opening().mutate(clearPending).withResources("0", { influence: 4 }).build();
    const happiness = G.players["0"].resources.happiness;

    expect(civicCalm(G, "0", "influence").ok).toBe(true);

    expect(G.players["0"].resources.happiness).toBe(happiness + 3);
    expect(G.players["0"].resources.influence).toBe(0);
  });

  it("bread & circuses: 6 gold buys the same +3", () => {
    const G = scenario().opening().mutate(clearPending).withResources("0", { gold: 6 }).build();
    const happiness = G.players["0"].resources.happiness;

    expect(civicCalm(G, "0", "gold").ok).toBe(true);

    expect(G.players["0"].resources.happiness).toBe(happiness + 3);
    expect(G.players["0"].resources.gold).toBe(0);
  });

  it("shares one throttle across both payments — calm must not stack", () => {
    const G = scenario().opening().mutate(clearPending).withResources("0", { influence: 8, gold: 12 }).build();

    expect(civicCalm(G, "0", "influence").ok).toBe(true);
    expect(civicCalm(G, "0", "gold").ok).toBe(false);
    expect(civicCalm(G, "0", "influence").ok).toBe(false);
  });
});

describe("the social ladder (D8)", () => {
  it("promotes a slave to freeman for 4 food", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 1, slaves: 2 })
      .withResources("0", { food: 4 })
      .build();

    expect(promotePop(G, "0", P0_CAPITAL, "slaves").ok).toBe(true);

    expect(owned(G, P0_CAPITAL, "0").pops).toEqual({ citizens: 1, freemen: 2, slaves: 1 });
    expect(G.players["0"].resources.food).toBe(0);
  });

  it("promotes a freeman to citizen for 4 gold", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 1, slaves: 2 })
      .withResources("0", { gold: 4 })
      .build();

    expect(promotePop(G, "0", P0_CAPITAL, "freemen").ok).toBe(true);

    expect(owned(G, P0_CAPITAL, "0").pops).toEqual({ citizens: 2, freemen: 0, slaves: 2 });
  });

  it("demotes a freeman to slave for 3 influence and -1 happiness", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 0, freemen: 2, slaves: 0 })
      .withResources("0", { influence: 3 })
      .build();
    const happiness = G.players["0"].resources.happiness;

    expect(demotePop(G, "0", P0_CAPITAL, "freemen").ok).toBe(true);

    expect(owned(G, P0_CAPITAL, "0").pops).toEqual({ citizens: 0, freemen: 1, slaves: 1 });
    expect(G.players["0"].resources.influence).toBe(0);
    expect(G.players["0"].resources.happiness).toBe(happiness - 1);
  });

  it("one ladder move per turn, shared between promote and demote", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 1, slaves: 2 })
      .withResources("0", { food: 20, gold: 20, influence: 20 })
      .build();

    expect(promotePop(G, "0", P0_CAPITAL, "slaves").ok).toBe(true);
    expect(promotePop(G, "0", P0_CAPITAL, "slaves").ok).toBe(false);
    expect(demotePop(G, "0", P0_CAPITAL, "citizens").ok).toBe(false);
  });

  it("demotion is free — and throttle-exempt — during your own riot (the mob forces it)", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 2, freemen: 1, slaves: 0 })
      .withResources("0", { influence: 0 })
      .build();
    G.pendingRiot = { playerID: "0", tier: "unrest", boughtInsurance: [] };
    const happiness = G.players["0"].resources.happiness;

    // No influence, still legal; freeman demote skips the happiness penalty too.
    expect(demotePop(G, "0", P0_CAPITAL, "freemen").ok).toBe(true);
    expect(G.players["0"].resources.happiness).toBe(happiness);
    expect(G.players["0"].ladderUsedThisTurn).toBe(false);

    // But only for the rioting player — everyone else waits out the blockade.
    expect(demotePop(G, "1", TEST_OPENING_SETUP[1].capital.tileId, "citizens").ok).toBe(false);
  });
});
