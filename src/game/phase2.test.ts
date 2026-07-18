import { describe, expect, it } from "vitest";

import { buildBuilding, placeCapital } from "./actions";
import { getBuildBuildingStatus } from "./status";
import { promotePop, getPromotePopStatus } from "./civic";
import { settlementNetYield } from "./economy/income";
import { settlementTileYield } from "./settlement";
import { enumerateLegalMoves } from "./legalMoves";
import { createInitialState } from "./state";
import { DEFAULT_RULESET } from "./ruleset";
import { scenario, owned } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState, HexTile, Settlement } from "./types";

// Phase 2 "The land repriced" — terrain-economy.md. The land yields wood/stone/food
// only; gold is second-order; hills and the oracle are yield-less; two new buildings
// (Villa, Gymnasion); every building capped by maxLevel.

const SEED = 0xc0ffee;
const clearPending = (draft: HegemonyState) => {
  draft.pendingPlayerEvent = null;
};

/** A bare owned city, for driving settlementNetYield directly. */
const city = (pops: Settlement["pops"], buildings: Settlement["buildings"] = []): Settlement => ({
  owner: "0",
  kind: "city",
  buildings,
  pops
});

function findTile(G: HegemonyState, predicate: (tile: HexTile) => boolean): HexTile {
  const found = G.board.tiles.find(predicate);
  if (!found) throw new Error("no matching tile");
  return found;
}

describe("the oracle (Phase 2)", () => {
  it("is a single unsettleable hole with no resource and no slots", () => {
    const G = createInitialState(SEED);
    const oracles = G.board.tiles.filter((tile) => tile.terrain === "oracle");

    expect(oracles).toHaveLength(1);
    expect(oracles[0].resource).toBeNull();
    expect(oracles[0].buildingSlots).toBe(0);
  });

  it("rejects a capital, and never appears in the setup enumeration", () => {
    const G = createInitialState(SEED);
    const oracle = findTile(G, (tile) => tile.terrain === "oracle");

    expect(placeCapital(G, "0", oracle.id, { citizens: 1, freemen: 2, slaves: 1 }).ok).toBe(false);

    const offered = new Set(
      enumerateLegalMoves(G, "0").map((move) => ("tileId" in move ? move.tileId : ""))
    );
    expect(offered.has(oracle.id)).toBe(false);
  });
});

describe("yield-less hills (Phase 2)", () => {
  it("gives slaves nothing to work — no tile yield, no slave production", () => {
    const G = createInitialState(SEED);
    const hill = findTile(G, (tile) => tile.terrain === "hill");
    expect(hill.resource).toBeNull();

    const settlement = city({ citizens: 0, freemen: 0, slaves: 3 });
    expect(settlementTileYield(hill, settlement, DEFAULT_RULESET)).toBe(0);

    const income = settlementNetYield(hill, settlement, DEFAULT_RULESET);
    // Slaves are inert on the hill: only their upkeep and unrest register.
    expect(income.wood + income.stone + income.food + income.gold).toBe(-3); // 3 slaves × −1 food
    expect(income.food).toBe(-3);
    expect(income.happiness).toBe(-1.5);
  });

  it("still lets citizens and freemen produce, fed from the shared pool", () => {
    const G = createInitialState(SEED);
    const hill = findTile(G, (tile) => tile.terrain === "hill");

    const income = settlementNetYield(hill, city({ citizens: 1, freemen: 1, slaves: 0 }), DEFAULT_RULESET);
    // Citizen: +1 influence, +2 gold, −2 food. Freeman: +2 gold, −1 food.
    expect(income.influence).toBe(1);
    expect(income.gold).toBe(4);
    expect(income.food).toBe(-3);
  });
});

describe("maxLevel caps (Phase 2)", () => {
  it("refuses a copy past a building's maxLevel", () => {
    const hill = createInitialState(SEED).board.tiles.find((tile) => tile.terrain === "hill")!;
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .withSettlement("0", hill.id, "city", { citizens: 0, freemen: 0, slaves: 0 })
      .withResources("0", "wealthy")
      .build();

    // Odeon is capped at maxLevel 2: two are legal, the third is not.
    expect(buildBuilding(G, "0", hill.id, "odeon").ok).toBe(true);
    expect(buildBuilding(G, "0", hill.id, "odeon").ok).toBe(true);

    const third = getBuildBuildingStatus(G, "0", hill.id, "odeon");
    expect(third.can).toBe(false);
    expect(third.reasons.join(" ")).toMatch(/maximum level/i);

    // A different building still fits the slot-rich hill — diversify, don't stack.
    expect(buildBuilding(G, "0", hill.id, "forum").ok).toBe(true);
  });
});

describe("the Villa (Phase 2)", () => {
  it("adds its bonus to the tile's own material, and stacks to maxLevel 2", () => {
    const G = createInitialState(SEED);
    const stoneTile = findTile(G, (tile) => tile.resource?.type === "stone");
    const pops = { citizens: 0, freemen: 0, slaves: 0 };

    const base = settlementNetYield(stoneTile, city(pops), DEFAULT_RULESET).stone;
    const oneVilla = settlementNetYield(stoneTile, city(pops, ["villa"]), DEFAULT_RULESET).stone;
    const twoVillas = settlementNetYield(stoneTile, city(pops, ["villa", "villa"]), DEFAULT_RULESET).stone;

    expect(oneVilla).toBe(base + 2);
    expect(twoVillas).toBe(base + 4);
  });

  it("caps at two copies via maxLevel", () => {
    const stoneTile = createInitialState(SEED).board.tiles.find((tile) => tile.resource?.type === "stone")!;
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .withSettlement("0", stoneTile.id, "city", { citizens: 0, freemen: 0, slaves: 0 })
      .withResources("0", "wealthy")
      .build();

    expect(buildBuilding(G, "0", stoneTile.id, "villa").ok).toBe(true);
    expect(buildBuilding(G, "0", stoneTile.id, "villa").ok).toBe(true);
    expect(getBuildBuildingStatus(G, "0", stoneTile.id, "villa").can).toBe(false);
  });

  it("is worthless on a yield-less hill", () => {
    const G = createInitialState(SEED);
    const hill = findTile(G, (tile) => tile.terrain === "hill");
    const pops = { citizens: 0, freemen: 0, slaves: 2 };

    const withoutVilla = settlementNetYield(hill, city(pops), DEFAULT_RULESET);
    const withVilla = settlementNetYield(hill, city(pops, ["villa"]), DEFAULT_RULESET);

    expect(withVilla).toEqual(withoutVilla);
  });
});

describe("the Gymnasion (Phase 2)", () => {
  const P0_CAPITAL = TEST_OPENING_SETUP[0].capital.tileId;

  it("cuts a promotion's cost by 2 in its settlement", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 0, freemen: 0, slaves: 2 })
      .mutate((draft) => owned(draft, P0_CAPITAL, "0").buildings.push("gymnasion"))
      .withResources("0", { food: 2, gold: 0 })
      .build();

    // Base slave→freeman promotion is 4 food; the Gymnasion cuts it to 2.
    expect(getPromotePopStatus(G, "0", P0_CAPITAL, "slaves").cost).toEqual({ food: 2 });
    expect(promotePop(G, "0", P0_CAPITAL, "slaves").ok).toBe(true);
    expect(owned(G, P0_CAPITAL, "0").pops).toEqual({ citizens: 0, freemen: 1, slaves: 1 });
    expect(G.players["0"].resources.food).toBe(0);
  });

  it("only discounts promotions in the settlement that holds it", () => {
    const G = scenario()
      .opening()
      .mutate(clearPending)
      .setPops("0", P0_CAPITAL, { citizens: 0, freemen: 0, slaves: 1 })
      .build();

    // No Gymnasion here — the base 4-food cost stands.
    expect(getPromotePopStatus(G, "0", P0_CAPITAL, "slaves").cost).toEqual({ food: 4 });
  });
});
