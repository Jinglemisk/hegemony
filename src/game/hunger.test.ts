import { describe, expect, it } from "vitest";

import { collectIncome } from "./actions";
import { getActiveEffects } from "./activeEffects";
import { calculateIncome, getHungerStatus } from "./economy/income";
import { collectInvariantViolations } from "./invariants";
import { owned, scenario } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState } from "./types";

// Hunger (paper 5.3, ruled 2026-09-28): free pops eat 1 food each at income. One pop
// leaves per unfed mouth and the granary stays at zero: no debt, no counter.

const CAPITAL = TEST_OPENING_SETUP[0].capital.tileId;
const COLONY = TEST_OPENING_SETUP[0].colony.tileId;
const NONE = { citizens: 0, freemen: 0, slaves: 0 };

/** Player 0 in gameplay, income not yet collected, with nothing pending. */
function beforeIncome(mutate: (G: HegemonyState) => void = () => {}): HegemonyState {
  return scenario()
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      draft.players["0"].collectedThisTurn = false;
      draft.players["0"].resources.happiness = 0;
      mutate(draft);
    })
    .build();
}

/** Stored food that leaves exactly `unfed` mouths hungry at the next income. */
function foodShortBy(G: HegemonyState, unfed: number) {
  G.players["0"].resources.food = -calculateIncome(G, "0").food - unfed;
}

describe("hunger", () => {
  it("one pop leaves per unfed mouth and food stays at zero", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 1, freemen: 5, slaves: 0 };
      owned(draft, COLONY, "0").pops = { ...NONE };
      foodShortBy(draft, 2);
    });

    expect(getHungerStatus(G, "0", calculateIncome(G, "0").food)).toMatchObject({
      unfed: 2,
      projectedStockpile: 0,
    });
    expect(collectIncome(G, "0").ok).toBe(true);

    expect(owned(G, CAPITAL, "0").pops).toEqual({ citizens: 1, freemen: 3, slaves: 0 });
    expect(G.players["0"].resources.food).toBe(0);
    expect(G.players["0"].popsLostToHunger).toBe(2);
    expect(collectInvariantViolations(G)).toEqual([]);
  });

  it("takes freemen before citizens, from the settlement holding the most", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 2, freemen: 1, slaves: 0 };
      owned(draft, COLONY, "0").pops = { citizens: 0, freemen: 2, slaves: 0 };
      foodShortBy(draft, 4);
    });

    collectIncome(G, "0");

    // Three freemen go first (the colony's two, then the capital's one), then a citizen.
    expect(owned(G, COLONY, "0").pops.freemen).toBe(0);
    expect(owned(G, CAPITAL, "0").pops).toEqual({ citizens: 1, freemen: 0, slaves: 0 });
  });

  it("never touches slaves: they eat nothing", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 0, freemen: 0, slaves: 6 };
      owned(draft, COLONY, "0").pops = { citizens: 0, freemen: 0, slaves: 2 };
      draft.players["0"].resources.food = 0;
    });

    expect(getHungerStatus(G, "0", calculateIncome(G, "0").food).unfed).toBe(0);
    collectIncome(G, "0");

    expect(owned(G, CAPITAL, "0").pops.slaves).toBe(6);
    expect(G.players["0"].popsLostToHunger).toBe(0);
  });

  it("warns while the granary drains, counting the incomes the food still covers", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 1, freemen: 5, slaves: 0 };
      owned(draft, COLONY, "0").pops = { ...NONE };
    });
    const netFood = calculateIncome(G, "0").food;
    G.players["0"].resources.food = -netFood * 2;

    const warning = getActiveEffects(G, "0").find((effect) => effect.kind === "hunger");
    expect(netFood).toBeLessThan(0);
    expect(warning?.duration).toMatchObject({ remaining: 2, expiry: "whenFed" });
    expect(warning?.mechanics).toEqual([
      { type: "hunger", netFood, stockpile: -netFood * 2, unfed: 0 },
    ]);
  });
});
