import { describe, expect, it } from "vitest";

import { collectIncome } from "./actions";
import { getActiveEffects } from "./activeEffects";
import { calculateIncome, getHungerStatus } from "./economy/income";
import { defaultHungerLeave, getResolveHungerStatus, hungerLeaveOptions } from "./hunger";
import { collectInvariantViolations } from "./invariants";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { owned, scenario } from "./testing/scenario";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState } from "./types";

// Hunger (paper 5.3, ruled 2026-09-28): free pops eat 1 food each at income. One pop
// leaves per unfed mouth and the granary stays at zero: no debt, no counter. The seat
// chooses who leaves (owner ruling, 2026-10-06).

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
      mutate(draft);
    })
    .build();
}

/** Stored food that leaves exactly `unfed` mouths hungry at the next income. */
function foodShortBy(G: HegemonyState, unfed: number) {
  G.players["0"].resources.food = -calculateIncome(G, "0").food - unfed;
}

describe("hunger", () => {
  it("waits for the seat to choose who leaves, keeps food at zero, then draws the fate card", () => {
    let G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 2, freemen: 5, slaves: 0 };
      owned(draft, COLONY, "0").pops = { ...NONE };
      foodShortBy(draft, 2);
    });

    expect(getHungerStatus(G, "0", calculateIncome(G, "0").food)).toMatchObject({
      unfed: 2,
      projectedStockpile: 0,
    });
    const deck = G.playerDrawPile.length;
    expect(collectIncome(G, "0").ok).toBe(true);
    expect(G.pendingHunger).toEqual({ playerID: "0", unfed: 2 });
    expect(G.players["0"].resources.food).toBe(0);
    expect(G.playerDrawPile).toHaveLength(deck);
    expect(owned(G, CAPITAL, "0").pops).toEqual({ citizens: 2, freemen: 5, slaves: 0 });
    // Nothing else is legal until the choice is made, and no other seat may make it.
    expect(new Set(enumerateLegalCommands(G, "0").map((c) => c.type))).toEqual(
      new Set(["resolveHunger"]),
    );
    expect(enumerateLegalCommands(G, "1")).toEqual([]);

    const leave = [
      { tileId: CAPITAL, pop: "citizens" as const },
      { tileId: CAPITAL, pop: "freemen" as const },
    ];
    const result = transition(G.definition, G, "0", { type: "resolveHunger", leave });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    G = result.state;
    expect(owned(G, CAPITAL, "0").pops).toEqual({ citizens: 1, freemen: 4, slaves: 0 });
    expect(G.pendingHunger).toBeNull();
    expect(G.players["0"].popsLostToHunger).toBe(2);
    expect(G.playerDrawPile).toHaveLength(deck - 1);
    expect(G.log.find((entry) => entry.moment?.kind === "hunger")?.moment).toEqual({
      kind: "hunger",
      leave,
    });
    expect(collectInvariantViolations(G)).toEqual([]);
  });

  it("refuses the wrong count, slaves, and pops the seat does not have", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 1, freemen: 1, slaves: 3 };
      owned(draft, COLONY, "0").pops = { ...NONE };
      foodShortBy(draft, 1);
    });
    collectIncome(G, "0");

    expect(getResolveHungerStatus(G, "0", []).can).toBe(false);
    expect(getResolveHungerStatus(G, "0", [{ tileId: CAPITAL, pop: "slaves" as never }]).can).toBe(
      false,
    );
    expect(getResolveHungerStatus(G, "0", [{ tileId: COLONY, pop: "freemen" }]).can).toBe(false);
    expect(getResolveHungerStatus(G, "1", [{ tileId: CAPITAL, pop: "freemen" }]).can).toBe(false);
    expect(getResolveHungerStatus(G, "0", [{ tileId: CAPITAL, pop: "citizens" }]).can).toBe(true);
  });

  it("preselects freemen before citizens, from the settlement holding the most", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 2, freemen: 1, slaves: 0 };
      owned(draft, COLONY, "0").pops = { citizens: 0, freemen: 2, slaves: 0 };
    });

    // Three freemen go first, each from the fullest (the earliest founded on a tie),
    // then a citizen.
    expect(defaultHungerLeave(G, "0", 4)).toEqual([
      { tileId: COLONY, pop: "freemen" },
      { tileId: CAPITAL, pop: "freemen" },
      { tileId: COLONY, pop: "freemen" },
      { tileId: CAPITAL, pop: "citizens" },
    ]);
  });

  it("offers bots every split between the classes, the freemen-first default first", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 1, freemen: 3, slaves: 0 };
      owned(draft, COLONY, "0").pops = { ...NONE };
      foodShortBy(draft, 2);
    });
    collectIncome(G, "0");

    expect(hungerLeaveOptions(G, "0").map((leave) => leave.map((l) => l.pop).join(","))).toEqual([
      "freemen,freemen",
      "freemen,citizens",
    ]);
  });

  it("never touches slaves: they eat nothing", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 0, freemen: 0, slaves: 6 };
      owned(draft, COLONY, "0").pops = { citizens: 0, freemen: 0, slaves: 2 };
      draft.players["0"].resources.food = 0;
    });

    expect(getHungerStatus(G, "0", calculateIncome(G, "0").food).unfed).toBe(0);
    collectIncome(G, "0");
    expect(G.pendingHunger).toBeNull();

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
