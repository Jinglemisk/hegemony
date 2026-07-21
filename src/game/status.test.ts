import { describe, expect, it } from "vitest";
import {
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getMovePopsStatus,
  getUpgradeColonyToCityStatus
} from "./status";
import { materialTile, owned, scenario, tile } from "./testing/scenario";
import { PLAYER_EVENT_CARDS } from "./data";
import type { HegemonyState, Pops } from "./types";

/**
 * status.ts is the legality authority every UI glow and every bot reads through
 * (post-sprint-debt §6.3). The five validators here return a reason list, not a
 * boolean — the reasons ARE the contract (they surface as tooltips and drive the
 * bots' move filtering), so each test asserts the specific reason, not just can.
 */

const pops = (citizens = 0, freemen = 0, slaves = 0): Pops => ({ citizens, freemen, slaves });

/** A pending player event blocks every action — the shared first gate. */
function withPendingEvent(G: HegemonyState): HegemonyState {
  G.pendingPlayerEvent = { card: PLAYER_EVENT_CARDS[0], playerID: "0" };
  return G;
}

const PENDING_REASON = "Resolve the pending player event first.";

describe("getMovePopsStatus", () => {
  const twoSettlements = () =>
    scenario()
      .withResources("0", "wealthy")
      .withSettlement("0", "1,0", "city", pops(2, 2, 2))
      .withSettlement("0", "-1,0", "city", pops(0, 0, 0))
      .build();

  it("passes a legal move and reports no reasons", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "1,0", "-1,0", pops(1, 0, 0));
    expect(status.can).toBe(true);
    expect(status.reasons).toEqual([]);
  });

  it("requires a source settlement", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "", "-1,0", pops(1, 0, 0));
    expect(status.can).toBe(false);
    expect(status.reasons).toContain("Choose a source settlement.");
  });

  it("rejects a source the player does not own", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "3,0", "-1,0", pops(1, 0, 0));
    expect(status.reasons).toContain("Source must be one of your settlements.");
  });

  it("requires a target settlement", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "1,0", "", pops(1, 0, 0));
    expect(status.reasons).toContain("Choose a target settlement.");
  });

  it("rejects a target the player does not own", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "1,0", "3,0", pops(1, 0, 0));
    expect(status.reasons).toContain("Target must be one of your settlements.");
  });

  it("rejects moving onto the same settlement", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "1,0", "1,0", pops(1, 0, 0));
    expect(status.reasons).toContain("Source and target must be different.");
  });

  it("requires at least one pop", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "1,0", "-1,0", pops(0, 0, 0));
    expect(status.reasons).toContain("Move at least one pop.");
  });

  it("rejects moving pops the source does not have", () => {
    const status = getMovePopsStatus(twoSettlements(), "0", "1,0", "-1,0", pops(9, 0, 0));
    expect(status.reasons).toContain("Source does not have those pops.");
  });

  it("blocks on a pending player event", () => {
    const status = getMovePopsStatus(withPendingEvent(twoSettlements()), "0", "1,0", "-1,0", pops(1, 0, 0));
    expect(status.reasons).toContain(PENDING_REASON);
  });
});

describe("getGrowPopStatus", () => {
  const cityWith = (settlementPops: Pops) => {
    const G = scenario().withResources("0", "wealthy").build();
    const id = materialTile(G).id;
    return { G: scenario().withResources("0", "wealthy").withSettlement("0", id, "city", settlementPops).build(), id };
  };

  it("passes a legal grow and sets a discounted cost", () => {
    const { G, id } = cityWith(pops(1, 0, 0));
    const status = getGrowPopStatus(G, "0", id, "freemen");
    expect(status.can).toBe(true);
    expect(status.reasons).toEqual([]);
    expect(status.cost).toBeDefined();
  });

  it("wants a selection when no tile is given, and still quotes the base cost", () => {
    const { G } = cityWith(pops(1, 0, 0));
    const status = getGrowPopStatus(G, "0", "", "freemen");
    expect(status.reasons).toContain("Select a settlement.");
    expect(status.cost).toEqual(G.ruleset.growPopCosts.freemen);
  });

  it("requires the player to own the tile", () => {
    const { G, id } = cityWith(pops(1, 0, 0));
    const unowned = G.board.tiles.find((candidate) => candidate.id !== id && candidate.settlements.length === 0);
    if (!unowned) throw new Error("expected an empty tile on the board");
    const status = getGrowPopStatus(G, "0", unowned.id, "freemen");
    expect(status.reasons).toContain("Requires your settlement on this tile.");
  });

  it("blocks a second grow on the same settlement in one turn", () => {
    const { G, id } = cityWith(pops(1, 0, 0));
    G.players["0"].grownSettlementsThisTurn = [id];
    const status = getGrowPopStatus(G, "0", id, "freemen");
    expect(status.reasons).toContain("Already grew a pop here this turn.");
  });

  it("blocks growth past the settlement's capacity", () => {
    const { G, id } = cityWith(pops(40, 40, 40));
    const status = getGrowPopStatus(G, "0", id, "freemen");
    expect(status.reasons).toContain("Settlement is at population capacity.");
  });

  it("blocks growth the player cannot afford", () => {
    const G = scenario().build();
    const id = materialTile(G).id;
    scenario().build(); // isolate
    const poor = scenario()
      .withSettlement("0", id, "city", pops(1, 0, 0))
      .withResources("0", { wood: 0, stone: 0, gold: 0, food: 0 })
      .build();
    const status = getGrowPopStatus(poor, "0", id, "freemen");
    expect(status.reasons).toContain("Not enough resources.");
  });
});

describe("getBuildBuildingStatus", () => {
  const cityForBuild = () => {
    const probe = scenario().build();
    const id = materialTile(probe).id;
    const G = scenario().withResources("0", "wealthy").withSettlement("0", id, "city", pops(1, 1, 1)).build();
    return { G, id };
  };

  it("passes a legal build and sets the adjusted cost", () => {
    const { G, id } = cityForBuild();
    const status = getBuildBuildingStatus(G, "0", id, "marketplace");
    expect(status.can).toBe(true);
    expect(status.reasons).toEqual([]);
    expect(status.cost).toBeDefined();
  });

  it("wants a tile when none is selected", () => {
    const { G } = cityForBuild();
    const status = getBuildBuildingStatus(G, "0", "", "marketplace");
    expect(status.reasons).toContain("Select a tile.");
  });

  it("requires a city on the tile", () => {
    const { G } = cityForBuild();
    // A tile the player owns nothing on.
    const status = getBuildBuildingStatus(G, "0", "0,0", "marketplace");
    expect(status.reasons).toContain("Requires your city on this tile.");
  });

  it("refuses to exceed a single-level building's cap", () => {
    const probe = scenario().build();
    const id = materialTile(probe).id;
    const G = scenario().withResources("0", "wealthy").withSettlement("0", id, "city", pops(1, 1, 1)).build();
    owned(G, id, "0").buildings = ["gymnasion"];
    const status = getBuildBuildingStatus(G, "0", id, "gymnasion");
    expect(status.reasons).toContain("Gymnasion is already built here.");
  });

  it("refuses to exceed a multi-level building's cap", () => {
    const probe = scenario().build();
    const id = materialTile(probe).id;
    const G = scenario().withResources("0", "wealthy").withSettlement("0", id, "city", pops(1, 1, 1)).build();
    owned(G, id, "0").buildings = ["marketplace", "marketplace"];
    const status = getBuildBuildingStatus(G, "0", id, "marketplace");
    expect(status.reasons.some((reason) => reason.includes("maximum level"))).toBe(true);
  });

  it("blocks a build the player cannot afford", () => {
    const probe = scenario().build();
    const id = materialTile(probe).id;
    const G = scenario()
      .withSettlement("0", id, "city", pops(1, 1, 1))
      .withResources("0", { wood: 0, stone: 0, gold: 0, food: 0 })
      .build();
    const status = getBuildBuildingStatus(G, "0", id, "marketplace");
    expect(status.reasons).toContain("Not enough resources.");
  });

  it("blocks on a pending player event", () => {
    const { G, id } = cityForBuild();
    const status = getBuildBuildingStatus(withPendingEvent(G), "0", id, "marketplace");
    expect(status.reasons).toContain(PENDING_REASON);
  });
});

describe("getUpgradeColonyToCityStatus", () => {
  it("passes an isolated colony the player can afford", () => {
    const probe = scenario().build();
    const id = materialTile(probe).id;
    const G = scenario().withResources("0", "wealthy").withSettlement("0", id, "colony", pops(0, 1, 1)).build();
    const status = getUpgradeColonyToCityStatus(G, "0", id);
    expect(status.can).toBe(true);
    expect(status.reasons).toEqual([]);
  });

  it("wants a tile when none is selected", () => {
    const G = scenario().build();
    const status = getUpgradeColonyToCityStatus(G, "0", "");
    expect(status.reasons).toContain("Select a tile.");
  });

  it("requires the player's colony on the tile", () => {
    const G = scenario().withResources("0", "wealthy").withSettlement("0", "1,0", "city", pops(1, 0, 0)).build();
    const status = getUpgradeColonyToCityStatus(G, "0", "1,0");
    expect(status.reasons).toContain("Requires your colony on this tile.");
    expect(status.reasons).toContain("Tile already has a city.");
  });

  it("refuses to seat a city adjacent to another city", () => {
    const G = scenario()
      .withResources("0", "wealthy")
      .withSettlement("0", "1,0", "colony", pops(0, 1, 1))
      .withSettlement("0", "2,0", "city", pops(1, 0, 0))
      .build();
    const status = getUpgradeColonyToCityStatus(G, "0", "1,0");
    expect(status.reasons).toContain("Cities cannot be adjacent.");
  });

  it("blocks an upgrade the player cannot afford", () => {
    const G = scenario()
      .withSettlement("0", "1,0", "colony", pops(0, 1, 1))
      .withResources("0", { wood: 0, stone: 0, gold: 0, food: 0 })
      .build();
    const status = getUpgradeColonyToCityStatus(G, "0", "1,0");
    expect(status.reasons).toContain("Not enough resources.");
  });
});

describe("getFoundColonyStatus", () => {
  it("wants a tile when none is selected", () => {
    const G = scenario().withResources("0", "wealthy").build();
    const status = getFoundColonyStatus(G, "0", "");
    expect(status.can).toBe(false);
    expect(status.reasons).toContain("Select a tile.");
  });

  it("always quotes the found-colony cost even before a tile is chosen", () => {
    const G = scenario().build();
    const status = getFoundColonyStatus(G, "0", "");
    expect(status.cost).toBeDefined();
  });

  it("blocks on a pending player event", () => {
    const G = withPendingEvent(scenario().withResources("0", "wealthy").withSettlement("0", "1,0", "city", pops(2, 2, 2)).build());
    const status = getFoundColonyStatus(G, "0", tile(G, "0,0").id);
    expect(status.reasons).toContain(PENDING_REASON);
  });
});
