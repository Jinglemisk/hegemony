import { describe, expect, it } from "vitest";

import { placeCapital } from "./actions";
import { settlementNetYield } from "./economy/income";
import { settlementIdleSlaves, settlementWorkingSlaves } from "./settlement";
import { enumerateLegalCommands } from "./legalMoves";
import { createInitialState } from "./state";
import { DEFAULT_RULESET } from "./ruleset";
import type { HegemonyState, HexTile, Settlement } from "./types";

// Phase 2 "The land repriced" — terrain-economy.md. The land yields wood/stone/food
// only; gold is second-order; hills and the oracle are yield-less.

const SEED = 0xc0ffee;
/** A bare owned city, for driving settlementNetYield directly. */
const city = (pops: Settlement["pops"], buildings: Settlement["buildings"] = []): Settlement => ({
  id: "fixture-city",
  tileId: "fixture-tile",
  owner: "0",
  kind: "city",
  buildings,
  pops,
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
    expect(oracles[0].slots).toBe(0);
  });

  it("rejects a capital, and never appears in the setup enumeration", () => {
    const G = createInitialState(SEED);
    const oracle = findTile(G, (tile) => tile.terrain === "oracle");

    expect(placeCapital(G, "0", oracle.id, { citizens: 1, freemen: 2, slaves: 1 }).ok).toBe(false);

    const offered = new Set(
      enumerateLegalCommands(G, "0").map((command) => ("tileId" in command ? command.tileId : "")),
    );
    expect(offered.has(oracle.id)).toBe(false);
  });
});

describe("yield-less hills (Phase 2)", () => {
  it("gives slaves nothing to work — every hill slave is idle", () => {
    const G = createInitialState(SEED);
    const hill = findTile(G, (tile) => tile.terrain === "hill");
    expect(hill.resource).toBeNull();

    const settlement = city({ citizens: 0, freemen: 0, slaves: 3 });
    expect(settlementWorkingSlaves(hill, settlement)).toBe(0);
    expect(settlementIdleSlaves(hill, settlement)).toBe(3);

    const income = settlementNetYield(hill, settlement, DEFAULT_RULESET);
    // Slaves make nothing on the hill and eat nothing.
    expect(income.wood + income.stone + income.food + income.gold).toBe(0);
  });

  it("still lets citizens and freemen produce, fed from the shared pool", () => {
    const G = createInitialState(SEED);
    const hill = findTile(G, (tile) => tile.terrain === "hill");

    const income = settlementNetYield(
      hill,
      city({ citizens: 1, freemen: 1, slaves: 0 }),
      DEFAULT_RULESET,
    );
    // Citizen: +1 influence, −1 food. Freeman: +1 gold, −1 food.
    expect(income.influence).toBe(1);
    expect(income.gold).toBe(1);
    expect(income.food).toBe(-2);
  });
});
