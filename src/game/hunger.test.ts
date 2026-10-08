import { describe, expect, it } from "vitest";

import { collectIncome } from "./actions";
import { bankBuy } from "./bank";
import { applyResourceDeltaWithFloors } from "./core/resources";
import { EMPTY_RESOURCES } from "./data";
import { getActiveEffects } from "./activeEffects";
import { calculateIncome, getHungerStatus } from "./economy/income";
import { defaultHungerLeave, getResolveHungerStatus, hungerLeaveOptions } from "./hunger";
import { collectInvariantViolations } from "./invariants";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { owned, scenario } from "./testing/scenario";
import { endTurn } from "./turn";
import { TEST_OPENING_SETUP } from "./config";
import type { HegemonyState, Pops } from "./types";

// Hunger (paper 5.3; Q79 ruled 2026-10-08): free pops eat 1 food each at income, which
// may take food below zero. The seat has its turn to cover the shortfall. Ending short,
// one pop leaves per missing food and food returns to zero, before the riot check. The
// seat chooses who leaves (owner ruling, 2026-10-06).

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

/** Collect an income that leaves player 0 `unfed` food short, fate card set aside. */
function shortAfterIncome(pops: Pops, unfed: number): HegemonyState {
  const G = beforeIncome((draft) => {
    owned(draft, CAPITAL, "0").pops = pops;
    owned(draft, COLONY, "0").pops = { ...NONE };
    foodShortBy(draft, unfed);
  });
  expect(collectIncome(G, "0").ok).toBe(true);
  G.pendingPlayerEvent = null;
  return G;
}

describe("hunger", () => {
  it("lets income take food below zero without anyone leaving", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 2, freemen: 5, slaves: 0 };
      owned(draft, COLONY, "0").pops = { ...NONE };
      foodShortBy(draft, 2);
    });
    const deck = G.playerDrawPile.length;

    expect(collectIncome(G, "0").ok).toBe(true);
    expect(G.players["0"].resources.food).toBe(-2);
    expect(G.pendingHunger).toBeNull();
    // The fate card is drawn at once, and the turn is the seat's to play.
    expect(G.playerDrawPile).toHaveLength(deck - 1);
    expect(owned(G, CAPITAL, "0").pops).toEqual({ citizens: 2, freemen: 5, slaves: 0 });
    expect(getHungerStatus(G, "0", calculateIncome(G, "0").food).unfed).toBe(2);
    expect(collectInvariantViolations(G)).toEqual([]);
  });

  it("asks who leaves when the turn ends short, then passes the turn with food at zero", () => {
    let G = shortAfterIncome({ citizens: 2, freemen: 5, slaves: 0 }, 2);

    let result = transition(G.definition, G, "0", { type: "endTurn" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    G = result.state;
    expect(G.pendingHunger).toEqual({ playerID: "0", unfed: 2 });
    expect(G.currentPlayer).toBe("0");
    // Nothing else is legal until the choice is made, and no other seat may make it.
    expect(new Set(enumerateLegalCommands(G, "0").map((c) => c.type))).toEqual(
      new Set(["resolveHunger"]),
    );
    expect(enumerateLegalCommands(G, "1")).toEqual([]);

    const leave = [
      { tileId: CAPITAL, pop: "citizens" as const },
      { tileId: CAPITAL, pop: "freemen" as const },
    ];
    result = transition(G.definition, G, "0", { type: "resolveHunger", leave });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    G = result.state;
    expect(owned(G, CAPITAL, "0").pops).toEqual({ citizens: 1, freemen: 4, slaves: 0 });
    expect(G.pendingHunger).toBeNull();
    expect(G.players["0"].resources.food).toBe(0);
    expect(G.players["0"].popsLostToHunger).toBe(2);
    expect(G.currentPlayer).toBe("1");
    expect(G.log.find((entry) => entry.moment?.kind === "hunger")?.moment).toEqual({
      kind: "hunger",
      leave,
    });
    expect(collectInvariantViolations(G)).toEqual([]);
  });

  it("takes no one when the seat buys the shortfall back before ending", () => {
    const G = shortAfterIncome({ citizens: 2, freemen: 5, slaves: 0 }, 2);
    G.players["0"].resources.gold = 99;

    // One food short of even: a food cost is out of reach, a purchase is not.
    expect(bankBuy(G, "0", "food").ok).toBe(true);
    expect(bankBuy(G, "0", "food").ok).toBe(true);
    expect(G.players["0"].resources.food).toBe(0);

    expect(endTurn(G).ok).toBe(true);
    expect(G.pendingHunger).toBeNull();
    expect(G.players["0"].popsLostToHunger).toBe(0);
    expect(G.currentPlayer).toBe("1");
  });

  it("does not let a loss raise a short stock, and counts a gain against it", () => {
    const G = shortAfterIncome({ citizens: 2, freemen: 5, slaves: 0 }, 2);
    const floors = G.ruleset.economy.stockpileFloors;
    const { resources } = G.players["0"];

    applyResourceDeltaWithFloors(resources, { ...EMPTY_RESOURCES, food: -3, gold: 1 }, floors);
    expect(resources.food).toBe(-2);
    applyResourceDeltaWithFloors(resources, { ...EMPTY_RESOURCES, food: 1 }, floors);
    expect(resources.food).toBe(-1);
  });

  it("holds food debt to its owner's own turn", () => {
    const G = shortAfterIncome({ citizens: 2, freemen: 5, slaves: 0 }, 1);
    expect(collectInvariantViolations(G)).toEqual([]);

    G.players["1"].resources.food = -1;
    expect(collectInvariantViolations(G).map((violation) => violation.code)).toEqual([
      "resources.foodDebt",
    ]);
  });

  it("refuses the wrong count, slaves, and pops the seat does not have", () => {
    const G = shortAfterIncome({ citizens: 1, freemen: 1, slaves: 3 }, 1);
    endTurn(G);

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
    const G = shortAfterIncome({ citizens: 1, freemen: 3, slaves: 0 }, 2);
    endTurn(G);

    expect(hungerLeaveOptions(G, "0").map((leave) => leave.map((l) => l.pop).join(","))).toEqual([
      "freemen,freemen",
      "freemen,citizens",
    ]);
  });

  it("never touches slaves: a shortfall with no free pops just returns to zero", () => {
    const G = beforeIncome((draft) => {
      owned(draft, CAPITAL, "0").pops = { citizens: 0, freemen: 0, slaves: 6 };
      owned(draft, COLONY, "0").pops = { citizens: 0, freemen: 0, slaves: 2 };
      draft.players["0"].collectedThisTurn = true;
      draft.players["0"].resources.food = -2;
    });

    expect(getHungerStatus(G, "0", calculateIncome(G, "0").food).unfed).toBe(0);
    expect(endTurn(G).ok).toBe(true);
    expect(G.pendingHunger).toBeNull();
    expect(G.players["0"].resources.food).toBe(0);
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

  it("warns of the pops a short stock takes at turn end", () => {
    const G = shortAfterIncome({ citizens: 1, freemen: 5, slaves: 0 }, 2);

    const warning = getActiveEffects(G, "0").find((effect) => effect.kind === "hunger");
    expect(warning?.duration).toMatchObject({ remaining: 0 });
    expect(warning?.mechanics).toMatchObject([{ type: "hunger", stockpile: -2, unfed: 2 }]);
  });
});
