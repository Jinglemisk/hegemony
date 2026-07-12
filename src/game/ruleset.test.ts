import { describe, expect, it } from "vitest";

import { calculateIncome, createInitialState, placeCapital, settlementPopCapacity } from "./rules";
import { DEFAULT_RULESET } from "./ruleset";
import type { Ruleset } from "./ruleset";
import type { HegemonyState } from "./types";

// Fixed seed so any deck draws during setup are reproducible.
const SEED = 0xc0ffee;

/** Place a metropolis of 3 citizens + 1 slave on the first wood tile. The slave's
 *  yield lands in wood, so the gold column stays a pure citizen readout. */
function capitalOfThreeCitizens(ruleset?: Ruleset): { G: HegemonyState; tileId: string } {
  const G = createInitialState(SEED, ruleset);
  const tile = G.board.tiles.find((candidate) => candidate.resource.type === "wood");
  if (!tile) throw new Error("no wood tile on the board");
  const result = placeCapital(G, "0", tile.id, { citizens: 3, freemen: 0, slaves: 1 });
  expect(result.ok).toBe(true);
  return { G, tileId: tile.id };
}

describe("ruleset seam", () => {
  it("stores the ruleset on state and defaults to DEFAULT_RULESET", () => {
    const G = createInitialState(SEED);
    expect(G.ruleset).toBe(DEFAULT_RULESET);
  });

  it("seeds starting resources from the ruleset", () => {
    const rich: Ruleset = {
      ...DEFAULT_RULESET,
      startingResources: { ...DEFAULT_RULESET.startingResources, gold: 999 }
    };
    const G = createInitialState(SEED, rich);
    expect(G.players["0"].resources.gold).toBe(999);
  });

  it("drives per-pop income from the ruleset (citizens' gold coefficient)", () => {
    // Default: 3 citizens * 2 gold each = 6.
    expect(calculateIncome(capitalOfThreeCitizens().G, "0").gold).toBe(6);

    // A mode that doubles citizen gold to 4 each => 12.
    const goldRush: Ruleset = {
      ...DEFAULT_RULESET,
      popIncome: {
        ...DEFAULT_RULESET.popIncome,
        citizens: { flat: { influence: 1, gold: 4, food: -2 }, primaryResource: 0 }
      }
    };
    expect(calculateIncome(capitalOfThreeCitizens(goldRush).G, "0").gold).toBe(12);
  });

  it("reads settlement pop capacity from the ruleset", () => {
    expect(settlementPopCapacity("capital")).toBe(10);

    const spacious: Ruleset = {
      ...DEFAULT_RULESET,
      settlements: {
        ...DEFAULT_RULESET.settlements,
        capital: { ...DEFAULT_RULESET.settlements.capital, popCapacity: 20 }
      }
    };
    expect(settlementPopCapacity("capital", spacious)).toBe(20);
  });
});
