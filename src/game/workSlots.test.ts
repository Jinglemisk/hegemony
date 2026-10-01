import { describe, expect, it } from "vitest";

import { buildBuilding, growPop, upgradeColonyToCity } from "./actions";
import { calculateIncomeBreakdown, settlementNetYield } from "./economy/income";
import { enumerateLegalCommands } from "./legalMoves";
import { DEFAULT_RULESET } from "./ruleset";
import {
  settlementIdleSlaves,
  settlementOpenSlots,
  settlementSlots,
  settlementWorkingSlaves,
} from "./settlement";
import { buildingGround, getBuildBuildingStatus, getGrowPopStatus } from "./status";
import { owned, scenario, tile } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState } from "./types";

// v2 work slots (ruled 2026-10-01): a tile prints terrain and slots only. The slots
// are one pool shared by buildings and working slaves.

const NONE = { citizens: 0, freemen: 0, slaves: 0 };
const clearPending = (draft: HegemonyState) => {
  draft.pendingPlayerEvent = null;
};

/** The classic board's first forest: three slots, wood. */
const FOREST = "-3,0";
/** A three-slot hill. */
const HILL = "-2,3";
/** The classic breadbasket: seven slots, food. */
const BREADBASKET = "1,0";

describe("work slots", () => {
  it("a slave makes 1 of the terrain's resource from an open slot and nothing without one", () => {
    const G = scenario()
      .withSettlement("0", FOREST, "city", { citizens: 0, freemen: 0, slaves: 5 })
      .build();
    const forest = tile(G, FOREST);
    const city = owned(G, FOREST, "0");

    expect(forest.slots).toBe(3);
    expect(settlementWorkingSlaves(forest, city)).toBe(3);
    expect(settlementIdleSlaves(forest, city)).toBe(2);

    const income = settlementNetYield(forest, city, DEFAULT_RULESET);
    expect(income.wood).toBe(3);
    // Slaves eat nothing. Their unrest is the realm's line, idle ones included.
    expect(income.food).toBe(0);
    expect(
      calculateIncomeBreakdown(G, "0").find((line) => line.resource === "happiness")?.amount,
    ).toBe(-2);
  });

  it("prints no yield on the tile: an empty settlement makes nothing", () => {
    const G = scenario().withSettlement("0", BREADBASKET, "city", NONE).build();

    expect(tile(G, BREADBASKET).slots).toBe(7);
    expect(calculateIncomeBreakdown(G, "0").filter((line) => line.resource === "food")).toEqual([]);
  });

  it("a building takes a slot from the slaves", () => {
    const G = scenario()
      .withSettlement("0", FOREST, "city", { citizens: 0, freemen: 0, slaves: 3 })
      .withResources("0", "wealthy")
      .mutate((draft) => {
        draft.phase = "gameplay";
      })
      .build();
    const forest = tile(G, FOREST);
    const city = owned(G, FOREST, "0");

    expect(settlementOpenSlots(forest, city)).toBe(3);
    expect(buildBuilding(G, "0", FOREST, "forum").ok).toBe(true);
    expect(settlementOpenSlots(forest, city)).toBe(2);
    expect(settlementWorkingSlaves(forest, city)).toBe(2);
    expect(settlementNetYield(forest, city, G.ruleset).wood).toBe(2);
  });

  it("a city, the capital included, builds on its tile's slots and no more", () => {
    const capitalTile = TEST_OPENING_SETUP[0].capital.tileId;
    const G = scenario().opening().mutate(clearPending).withResources("0", "wealthy").build();
    const land = tile(G, capitalTile);
    const capital = owned(G, capitalTile, "0");

    expect(buildingGround(G, "0", capitalTile).slots).toBe(land.slots);

    for (const building of ["forum", "temple", "granary", "marketplace"].slice(0, land.slots)) {
      expect(buildBuilding(G, "0", capitalTile, building as "forum").ok).toBe(true);
    }

    expect(getBuildBuildingStatus(G, "0", capitalTile, "estate").reasons).toContain(
      "No slots available.",
    );
    expect(settlementOpenSlots(land, capital)).toBe(0);
  });

  it("a colony cannot build, so every slot is a work slot", () => {
    const G = scenario()
      .withSettlement("0", BREADBASKET, "colony", { citizens: 0, freemen: 0, slaves: 4 })
      .build();
    const land = tile(G, BREADBASKET);
    const colony = owned(G, BREADBASKET, "0");

    expect(buildingGround(G, "0", BREADBASKET).slots).toBe(0);
    expect(settlementWorkingSlaves(land, colony)).toBe(4);
    expect(settlementNetYield(land, colony, G.ruleset).food).toBe(4);
  });

  it("two colonies split a tile's slots, and the one founded first takes the odd slot", () => {
    const slaves = { citizens: 0, freemen: 0, slaves: 4 };
    const G = scenario()
      .withSettlement("0", BREADBASKET, "colony", slaves)
      .withSettlement("1", BREADBASKET, "colony", slaves)
      .build();
    const land = tile(G, BREADBASKET);
    const first = owned(G, BREADBASKET, "0");
    const second = owned(G, BREADBASKET, "1");

    expect(settlementSlots(land, first)).toBe(4);
    expect(settlementSlots(land, second)).toBe(3);
    expect(settlementNetYield(land, first, G.ruleset).food).toBe(4);
    expect(settlementNetYield(land, second, G.ruleset).food).toBe(3);
    expect(settlementIdleSlaves(land, second)).toBe(1);
  });

  it("an upgrade evicts the other colony and takes every slot", () => {
    const slaves = { citizens: 0, freemen: 0, slaves: 4 };
    const G = scenario()
      .withSettlement("0", "3,0", "colony", slaves)
      .withSettlement("1", "3,0", "colony", slaves)
      .withResources("1", "wealthy")
      .mutate((draft) => {
        draft.phase = "gameplay";
      })
      .build();
    const land = tile(G, "3,0");

    expect(upgradeColonyToCity(G, "1", "3,0").ok).toBe(true);
    expect(land.settlements).toHaveLength(1);
    expect(settlementSlots(land, owned(G, "3,0", "1"))).toBe(land.slots);
  });

  it("hill slots hold buildings and hill slaves make nothing", () => {
    const G = scenario()
      .withSettlement("0", HILL, "city", { citizens: 0, freemen: 0, slaves: 3 })
      .build();
    const hill = tile(G, HILL);
    const city = owned(G, HILL, "0");

    expect(buildingGround(G, "0", HILL).slots).toBe(3);
    expect(settlementWorkingSlaves(hill, city)).toBe(0);
    expect(settlementIdleSlaves(hill, city)).toBe(3);
  });
});

describe("citizens come only by promotion", () => {
  it("refuses to grow a citizen and never offers it", () => {
    const capitalTile = TEST_OPENING_SETUP[0].capital.tileId;
    const G = scenario().opening().mutate(clearPending).withResources("0", "wealthy").build();

    expect(getGrowPopStatus(G, "0", capitalTile, "citizens").reasons).toEqual([
      "Citizens come only by promotion.",
    ]);
    expect(growPop(G, "0", capitalTile, "citizens").ok).toBe(false);
    expect(growPop(G, "0", capitalTile, "freemen").ok).toBe(true);

    const grows = enumerateLegalCommands(G, "0").filter((command) => command.type === "growPop");
    expect(grows.some((command) => command.type === "growPop" && command.pop === "citizens")).toBe(
      false,
    );
  });
});
