import { describe, expect, it } from "vitest";
import { getGrowPopStatus } from "../game/rules";
import { realmPops } from "../game/core/query";
import { happinessLevel } from "../game/happiness";
import { scenario } from "../game/testing/scenario";
import { previewUpgradeColonyToCity } from "../game/economy/preview";
import { currentVoteWeight } from "../game/assembly";
import { emptyBundle } from "../game/trade";
import { placeChanges, previewSpend, previewTrade } from "./confirmPreview";

/** Seat 0's open turn, stocked to grow, with no fate card drawn and an odd count of
 *  slaves, so one more slave costs a point of happiness. */
const openTurn = () =>
  scenario()
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      Object.assign(draft.players["0"].resources, { wood: 20, stone: 20, gold: 20, food: 20 });
      const home = draft.board.tiles.find((tile) => tile.id === draft.players["0"].settlements[0]);
      home!.settlements[0].pops.slaves += 1;
    })
    .build();

describe("a confirm's preview", () => {
  it("reads the store and the level off the engine, and warns at the Riot line", () => {
    const G = openTurn();
    const tileId = G.players["0"].settlements[0];
    const grow = { type: "growPop", tileId, pop: "slaves" } as const;
    expect(getGrowPopStatus(G, "0", tileId, "slaves").can).toBe(true);
    expect(realmPops(G, "0").slaves % G.ruleset.economy.slavesPerUnhappiness).toBe(1);

    const level = happinessLevel(G, "0");
    const calm = previewSpend(G, "0", { command: grow });
    const happiness = calm.changes.find((change) => change.label === "Happiness");
    expect(happiness).toMatchObject({ from: level });
    expect(happiness!.to).toBeLessThan(level);
    expect(calm.changes.some((change) => change.label === "Food" || change.label === "Gold")).toBe(
      true,
    );

    // One step above the Riot line, the same grow crosses it and the confirm says so.
    const edge = openTurn();
    const riotAt = edge.ruleset.economy.unrest.riotThreshold;
    edge.players["0"].unrestTokens += happinessLevel(edge, "0") - (riotAt + 1);
    expect(happinessLevel(edge, "0")).toBe(riotAt + 1);
    expect(previewSpend(edge, "0", { command: grow }).warn).toMatch(/Riot line/);
  });

  it("says what a promotion does to the seat's votes", () => {
    const G = openTurn();
    const tileId = G.players["0"].settlements[0];
    const promote = { type: "promotePop", tileId, from: "freemen" } as const;
    const { changes } = previewSpend(G, "0", { command: promote });
    const votes = currentVoteWeight(G, "0");
    expect(changes).toContainEqual({ label: "Votes", from: votes, to: votes + 1 });
  });

  it("lists every store, class of pops and hand of cards a trade moves", () => {
    const G = openTurn();
    const gives = { ...emptyBundle(), resources: { wood: 2 } };
    gives.pops = { citizens: 0, freemen: 0, slaves: 1 };
    const gets = { ...emptyBundle(), resources: { stone: 1 }, cards: 1 };
    const { changes } = previewTrade(G, "0", gives, gets);
    const slaves = realmPops(G, "0").slaves;
    expect(changes.map(({ label, from, to }) => ({ label, from, to }))).toEqual(
      expect.arrayContaining([
        { label: "Wood", from: 20, to: 18 },
        { label: "Stone", from: 20, to: 21 },
        { label: "Slaves", from: slaves, to: slaves - 1 },
        { label: "Cards", from: G.devHands["0"].length, to: G.devHands["0"].length + 1 },
      ]),
    );
  });

  it("without a command, takes the price and the gain from the store", () => {
    const G = openTurn();
    const { changes, warn } = previewSpend(G, "0", { cost: { gold: 2 }, gets: { food: 1 } });
    expect(warn).toBeNull();
    expect(changes).toEqual([
      { label: "Gold", from: 20, to: 18 },
      { label: "Food", from: 20, to: 21 },
    ]);
  });

  it("names a new city's room from the engine's economy preview", () => {
    const G = scenario()
      .withSettlement("0", "0,0", "city", { citizens: 1, freemen: 2, slaves: 1 })
      .withSettlement("0", "-3,3", "colony", { citizens: 0, freemen: 0, slaves: 1 })
      .withResources("0", "wealthy")
      .mutate((draft) => {
        draft.phase = "gameplay";
        draft.pendingPlayerEvent = null;
      })
      .build();
    const room = placeChanges(previewUpgradeColonyToCity(G, "0", "-3,3"), "-3,3").find(
      (change) => change.label === "Room",
    );
    expect(room).toBeDefined();
    expect(room!.to).toBeGreaterThan(room!.from);
  });
});
