import { describe, expect, it } from "vitest";
import { growPop } from "./actions";
import { dole } from "./bank";
import { civicCalm, demotePop, promotePop } from "./civic";
import { TEST_OPENING_SETUP } from "./config";
import { usesLeft } from "./core/query";
import { happinessLevel, standingHappiness } from "./happiness";
import type { RulesetPatch } from "./ruleset";
import { getGrowPopStatus, growUsesLeft } from "./status";
import { owned, scenario } from "./testing/scenario";
import type { HegemonyState } from "./types";
import { startNewYear } from "./year";

/**
 * The per-turn caps on the utility actions (docs/plans/agency-package.md, ruling 8): each
 * use is one unit at the usual price, three a turn, growing counted per settlement.
 */

/** The comparison switch: the limits from before the agency package. */
const BEFORE_CAPS: RulesetPatch = { turnCaps: { dole: null, calm: 1, ladder: 1, grow: 1 } };

const CAPITAL = TEST_OPENING_SETUP[0].capital.tileId;
const COLONY = TEST_OPENING_SETUP[0].colony.tileId;

/** Seat 0 at its first turn with plenty to pay, a nearly empty capital and the colony as
 *  dealt (two pops, room for two). */
function table(patch?: RulesetPatch) {
  return scenario({ patch })
    .opening()
    .withResources("0", { wood: 100, stone: 100, food: 100, gold: 100, influence: 100 })
    .setPops("0", CAPITAL, { citizens: 1, freemen: 1, slaves: 1 })
    .mutate((G) => {
      G.pendingPlayerEvent = null;
    })
    .build();
}

function law(G: HegemonyState, cardId: string) {
  G.activeLaws.push({ cardId, author: "0", enactedYear: G.year, order: G.lawOrder++ });
}

/** Whether each of `n` uses in a row went through. */
const uses = (n: number, use: () => { ok: boolean }) => Array.from({ length: n }, () => use().ok);

describe("per-turn caps", () => {
  it("the Dole buys one food a use, three times a turn", () => {
    const G = table();
    const food = G.players["0"].resources.food;

    expect(uses(4, () => dole(G, "0"))).toEqual([true, true, true, false]);
    expect(G.players["0"].resources.food).toBe(food + 3);
    expect(usesLeft(G, "0", "dole")).toBe(0);
  });

  it("calm stacks to +6 over three uses of either payment, and Beloved still leaves it out", () => {
    const G = table();
    const level = happinessLevel(G, "0");

    expect(civicCalm(G, "0", "influence").ok).toBe(true);
    expect(civicCalm(G, "0", "gold").ok).toBe(true);
    expect(civicCalm(G, "0", "gold").ok).toBe(true);
    expect(civicCalm(G, "0", "influence").ok).toBe(false);
    expect(happinessLevel(G, "0")).toBe(level + 6);
    expect(standingHappiness(G, "0")).toBe(level);
  });

  it("promotions and demotions share the ladder's cap", () => {
    const G = table();

    expect(promotePop(G, "0", CAPITAL, "slaves").ok).toBe(true);
    expect(demotePop(G, "0", CAPITAL, "citizens").ok).toBe(true);
    expect(promotePop(G, "0", CAPITAL, "freemen").ok).toBe(true);
    expect(demotePop(G, "0", CAPITAL, "freemen").ok).toBe(false);
    expect(promotePop(G, "0", CAPITAL, "freemen").ok).toBe(false);
  });

  it("Manumission's free promotion counts within the cap", () => {
    const G = table();
    law(G, "manumission");
    owned(G, CAPITAL, "0").pops.slaves = 4;
    const food = G.players["0"].resources.food;

    expect(uses(4, () => promotePop(G, "0", CAPITAL, "slaves"))).toEqual([true, true, true, false]);
    expect(G.players["0"].resources.food).toBe(food);
  });

  it("growing counts per settlement", () => {
    const G = table();

    expect(uses(4, () => growPop(G, "0", CAPITAL, "slaves"))).toEqual([true, true, true, false]);
    expect(getGrowPopStatus(G, "0", CAPITAL, "slaves").reasons).toContain(
      "No growth left here this turn: 3 a turn.",
    );
    // The colony has its own three; its room of two stops it first.
    expect(growUsesLeft(G, "0", COLONY)).toBe(3);
    expect(uses(3, () => growPop(G, "0", COLONY, "slaves"))).toEqual([true, true, false]);
    expect(getGrowPopStatus(G, "0", COLONY, "slaves").reasons).toEqual([
      "Settlement is at population capacity.",
    ]);
  });

  it("gives every use back when the turn starts", () => {
    const G = table();
    owned(G, CAPITAL, "0").pops.slaves = 3;
    uses(3, () => dole(G, "0"));
    uses(3, () => civicCalm(G, "0", "gold"));
    uses(3, () => promotePop(G, "0", CAPITAL, "slaves"));
    uses(3, () => growPop(G, "0", CAPITAL, "slaves"));

    // A turn is a seat's play in a year: the year boundary clears the counts.
    startNewYear(G);

    for (const action of ["dole", "calm", "ladder"] as const)
      expect(usesLeft(G, "0", action)).toBe(3);
    expect(growUsesLeft(G, "0", CAPITAL)).toBe(3);
    expect(happinessLevel(G, "0")).toBe(standingHappiness(G, "0"));
  });

  it("the comparison switch restores the limits from before the package", () => {
    const G = table(BEFORE_CAPS);

    expect(usesLeft(G, "0", "dole")).toBeNull();
    expect(uses(5, () => dole(G, "0"))).toEqual(Array<boolean>(5).fill(true));
    expect(uses(2, () => civicCalm(G, "0", "gold"))).toEqual([true, false]);
    expect(promotePop(G, "0", CAPITAL, "slaves").ok).toBe(true);
    expect(demotePop(G, "0", CAPITAL, "citizens").ok).toBe(false);
    expect(uses(2, () => growPop(G, "0", COLONY, "slaves"))).toEqual([true, false]);

    // Guild Charter as before: the capital twice, colonies never.
    const charter = table(BEFORE_CAPS);
    law(charter, "guild-charter");
    expect(uses(3, () => growPop(charter, "0", CAPITAL, "slaves"))).toEqual([true, true, false]);
    expect(getGrowPopStatus(charter, "0", COLONY, "slaves").can).toBe(false);
  });
});
