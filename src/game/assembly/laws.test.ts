import { describe, expect, it } from "vitest";

import { EMPTY_RESOURCES } from "../data";
import { foundColony } from "../actions";
import { getPlayerBankRate } from "../bank";
import { getPromotePopStatus } from "../civic";
import { calculateIncome, calculateIncomeBreakdown } from "../economy/income";
import { startNewSeason } from "../season";
import {
  getBuildBuildingStatus,
  getFoundColonyStatus,
  getGrowPopStatus,
  getUpgradeColonyToCityStatus
} from "../status";
import { owned, scenario } from "../testing/scenario";
import type { HegemonyState, PlayerId } from "../types";
import { getLawIncomeContributions, hasLawFreeAction } from "./laws";

/**
 * The standing-modifier layer — the one genuinely new engine seam the Assembly needs.
 *
 * Every other content system applies its effect once, when a card resolves; a Law is a
 * patch that hangs over the ruleset until it is repealed, so the income, cost, bank and
 * happiness pipelines have to CONSULT it every time they compute. These tests all ask
 * the same question in different pipelines: does the stele in the agora actually reach
 * the number the player reads?
 *
 * Laws are planted straight onto `G.activeLaws` here rather than voted in — the
 * enactment path has its own suite in assembly.test.ts, and going through a whole
 * ballot to test an income formula would be testing the ballot twice.
 */

const P0_CAPITAL = "-2,0"; // mountain, stone 4 — a yielding tile
const P0_COLONY = "3,0"; // plains, food 4
const HILL = "-1,0"; // yield-less, and adjacent to P0's capital so it is legally settleable

/** Plant a standing Law exactly as {@link enact} would, minus the vote. */
function plantLaw(G: HegemonyState, cardId: string, author: PlayerId = "0") {
  G.activeLaws.push({ cardId, author, enactedSeason: G.season, order: G.lawOrder++ });
}

/** An opening with no pending event in the way of the action verbs under test. */
function opening(patch?: Parameters<typeof scenario>[0]) {
  return scenario(patch)
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
    });
}

describe("standing laws reach the income pipeline", () => {
  it("settlementIncome pays per settlement in its scope", () => {
    // Player 0 opens with a metropolis and a colony: 2 settlements, 1 of them a city.
    // Land Reform is +1 food on `all` and -1 gold on `city`, so the two scopes must
    // count differently off the same board.
    const G = opening().withResources("0", { food: 100 }).build();
    const before = calculateIncome(G, "0");

    plantLaw(G, "land-reform");
    const after = calculateIncome(G, "0");

    expect(after.food - before.food).toBe(2);
    expect(after.gold - before.gold).toBe(-1);
  });

  it("popIncome scales with `step` — 'every 3 citizens' is floored, not rounded", () => {
    // Sacred Fields: +1 food per citizen, -1 happiness per 3 citizens. With 7 citizens
    // that is +7 food and floor(7/3) = -2 happiness, not -2.33.
    const G = opening()
      .setPops("0", P0_CAPITAL, { citizens: 7, freemen: 0, slaves: 0 })
      .withResources("0", { food: 100 })
      .build();
    const before = calculateIncome(G, "0");

    plantLaw(G, "sacred-fields");
    const after = calculateIncome(G, "0");

    expect(after.food - before.food).toBe(7);
    expect(after.happiness - before.happiness).toBe(-2);
  });

  it("popPrimaryIncome is dead on a yield-less hill and live on a yielding tile", () => {
    // Grain Dole's -1 per slave is paid into the settlement TILE's own material, so it
    // is inert on a hill for exactly the same reason the base slave coefficient is.
    const G = opening()
      .setPops("0", P0_CAPITAL, { citizens: 1, freemen: 0, slaves: 2 })
      .setPops("0", P0_COLONY, { citizens: 0, freemen: 1, slaves: 0 })
      .withSettlement("0", HILL, "colony", { citizens: 0, freemen: 0, slaves: 3 })
      .build();
    const before = calculateIncome(G, "0");

    plantLaw(G, "grain-dole");
    const after = calculateIncome(G, "0");

    // The capital's 2 slaves cost 2 stone; the hill's 3 slaves cost nothing at all.
    expect(after.stone - before.stone).toBe(-2);

    const lines = getLawIncomeContributions(G, "0", { ...EMPTY_RESOURCES }).filter(
      (contribution) => contribution.label === "Grain Dole"
    );
    // One line per settlement that HAS a primary resource — the hill produces none.
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.resource).sort()).toEqual(["food", "stone"]);
  });

  it("thresholdHappiness flips at the threshold", () => {
    const G = opening().build();
    plantLaw(G, "cult-of-demeter"); // hold 15+ food for +2 happiness, below it -2

    G.players["0"].resources.food = 15;
    const atThreshold = getLawIncomeContributions(G, "0", { ...EMPTY_RESOURCES });
    expect(atThreshold.find((line) => line.label === "Cult of Demeter")?.amount).toBe(2);
    const secure = calculateIncome(G, "0").happiness;

    G.players["0"].resources.food = 14;
    const below = getLawIncomeContributions(G, "0", { ...EMPTY_RESOURCES });
    expect(below.find((line) => line.label === "Cult of Demeter")?.amount).toBe(-2);

    // And the flip survives the full pipeline, not just the layer's own accounting.
    expect(calculateIncome(G, "0").happiness).toBeLessThan(secure);
  });

  it("surplusConversion (Agrarian Tariff) only pays above the floor", () => {
    // "Every 2 food gathered above 10 pays 1 gold". The tariff reads the income as it
    // stands, so the test feeds the pipeline a known harvest rather than guessing one.
    const G = opening().build();
    plantLaw(G, "agrarian-tariff");

    const rich = getLawIncomeContributions(G, "0", { ...EMPTY_RESOURCES, food: 16 });
    expect(rich.find((line) => line.resource === "gold")?.amount).toBe(3); // floor(6 / 2)

    const atFloor = getLawIncomeContributions(G, "0", { ...EMPTY_RESOURCES, food: 10 });
    expect(atFloor.find((line) => line.resource === "gold")).toBeUndefined();

    const lean = getLawIncomeContributions(G, "0", { ...EMPTY_RESOURCES, food: 4 });
    expect(lean.find((line) => line.resource === "gold")).toBeUndefined();

    // The trade-off half of the card is unconditional either way.
    expect(lean.find((line) => line.resource === "wood")?.amount).toBe(-1);
  });
});

describe("standing laws reprice actions", () => {
  it("actionCostDelta reaches found-colony", () => {
    const G = opening().build();
    expect(getFoundColonyStatus(G, "0", HILL).cost).toMatchObject({ wood: 20, food: 2 });

    plantLaw(G, "colonial-charter"); // founding -10 wood
    expect(getFoundColonyStatus(G, "0", HILL).cost).toMatchObject({ wood: 10, food: 2 });
  });

  it("actionCostDelta reaches build-building — and never drives a cost below zero", () => {
    const G = opening().build();
    expect(getBuildBuildingStatus(G, "0", P0_CAPITAL, "temple").cost).toMatchObject({ stone: 6 });

    plantLaw(G, "public-works"); // buildings -3 wood AND -3 stone
    const cost = getBuildBuildingStatus(G, "0", P0_CAPITAL, "temple").cost;

    expect(cost).toMatchObject({ stone: 3 });
    // The Temple costs no wood at all, so the -3 wood clamps at 0 rather than paying out.
    expect(cost?.wood ?? 0).toBe(0);
  });

  it("actionCostDelta reaches grow-pop, in both directions at once", () => {
    const G = opening().build();
    expect(getGrowPopStatus(G, "0", P0_CAPITAL, "citizens").cost).toMatchObject({ food: 9, gold: 2 });

    plantLaw(G, "tenant-rights"); // growing costs 3 less food but 2 more gold
    expect(getGrowPopStatus(G, "0", P0_CAPITAL, "citizens").cost).toMatchObject({ food: 6, gold: 4 });
  });

  it("actionCostDelta narrowed by settlement scope only bites in that scope", () => {
    // Guild Charter is the tall/wide axis: -3 food in cities, +2 in colonies.
    const G = opening().build();
    plantLaw(G, "guild-charter");

    expect(getGrowPopStatus(G, "0", P0_CAPITAL, "citizens").cost).toMatchObject({ food: 6 });
    expect(getGrowPopStatus(G, "0", P0_COLONY, "citizens").cost).toMatchObject({ food: 11 });
  });

  it("actionCostDelta reaches promote-pop, and a narrowed one only touches its own pop", () => {
    const G = opening().build();
    expect(getPromotePopStatus(G, "0", P0_CAPITAL, "slaves").cost).toEqual({ food: 4 });

    plantLaw(G, "grain-dole"); // every promotion is 1 food cheaper
    expect(getPromotePopStatus(G, "0", P0_CAPITAL, "slaves").cost).toEqual({ food: 3 });

    plantLaw(G, "manumission-law"); // ...and freeing a SLAVE specifically, 2 more
    expect(getPromotePopStatus(G, "0", P0_CAPITAL, "slaves").cost).toEqual({ food: 1 });

    // The freeman's climb costs gold, which the slave-narrowed Law never touches. Grain
    // Dole is unnarrowed so it DOES reach this promotion, but a -1 food on a cost with
    // no food line clamps to a harmless zero rather than discounting the gold.
    const freeman = getPromotePopStatus(G, "0", P0_CAPITAL, "freemen").cost;
    expect(freeman).toMatchObject({ gold: 4 });
    expect(freeman?.food ?? 0).toBe(0);
  });

  it("clamps a repriced cost at zero rather than paying the player to act", () => {
    // A cheap ruleset plus Manumission Law's -2 food would take the promotion to -1.
    const G = opening({ patch: { ladder: { promoteCosts: { slaves: { food: 1 } } } } }).build();
    plantLaw(G, "manumission-law");

    expect(getPromotePopStatus(G, "0", P0_CAPITAL, "slaves").cost).toEqual({ food: 0 });
  });

  it("actionCostMultiplier halves the colony upgrade (Enfranchise the Colonies)", () => {
    const G = opening().build();
    expect(getUpgradeColonyToCityStatus(G, "0", P0_COLONY).cost).toMatchObject({
      wood: 30,
      stone: 10,
      food: 5
    });

    plantLaw(G, "enfranchise-the-colonies");
    // Halved and rounded UP — 5 food becomes 3, never 2.5.
    expect(getUpgradeColonyToCityStatus(G, "0", P0_COLONY).cost).toMatchObject({
      wood: 15,
      stone: 5,
      food: 3
    });
  });
});

describe("standing laws reach the bank and the colony charter", () => {
  it("bankRateStep shifts the rate one whole step in the trader's favour", () => {
    const G = opening().build();
    const board = G.bank.stone;
    expect(getPlayerBankRate(G, "0", "stone")).toEqual(board);

    plantLaw(G, "aqueduct-levy"); // stone improves one step
    expect(getPlayerBankRate(G, "0", "stone")).toEqual({
      sell: Math.max(1, board.sell - 1),
      buy: Math.max(1, board.buy - 1)
    });
    // Only the material the Law names moves.
    expect(getPlayerBankRate(G, "0", "wood")).toEqual(G.bank.wood);
  });

  it("yearlyFreeAction is spent once and refreshes when the year turns", () => {
    const G = opening().build();
    plantLaw(G, "land-rush"); // your first colony each year is founded free of wood

    expect(hasLawFreeAction(G, "0", "foundColony")).toBe(true);
    expect(getFoundColonyStatus(G, "0", HILL).cost).toMatchObject({ wood: 0, food: 2 });

    expect(foundColony(G, "0", HILL, P0_CAPITAL, "slaves").ok).toBe(true);

    // The coupon burns on the founding that commits, so the next colony pays in full.
    expect(hasLawFreeAction(G, "0", "foundColony")).toBe(false);
    expect(G.players["0"].lawFreeActionsUsedThisYear).toContain("foundColony");

    // Roll into spring of Year 2 — a once-a-year coupon refreshes with the year.
    G.season = 4;
    startNewSeason(G);

    expect(G.season).toBe(5);
    expect(hasLawFreeAction(G, "0", "foundColony")).toBe(true);
  });

  it("onFoundColony grants the pop and takes the happiness (Frontier Spirit)", () => {
    const G = opening().withResources("0", "wealthy").build();
    plantLaw(G, "frontier-spirit");
    const happiness = G.players["0"].resources.happiness;

    expect(foundColony(G, "0", HILL, P0_CAPITAL, "slaves").ok).toBe(true);

    // The seed pop is still in transit; the freeman the charter grants is already there.
    expect(owned(G, HILL, "0").pops.freemen).toBe(1);
    expect(G.players["0"].resources.happiness).toBe(happiness - 2);
  });
});

describe("a Law is table-wide", () => {
  it("binds a seat that never authored it and never voted for it", () => {
    // The whole point of a vote is that the loser lives under the result: player 2's
    // board is the same shape as player 0's (a metropolis and a colony), so the same
    // Law pays them the same way.
    const G = opening().withResources("2", { food: 100 }).build();
    const before = calculateIncome(G, "2");

    plantLaw(G, "land-reform", "0");
    const after = calculateIncome(G, "2");

    expect(after.food - before.food).toBe(2);
    expect(after.gold - before.gold).toBe(-1);
    // ...and it is named on their breakdown, so they can see whose stele is doing it.
    expect(calculateIncomeBreakdown(G, "2").some((line) => line.source === "Land Reform")).toBe(true);
  });

  it("reprices actions for every seat, not just the author's", () => {
    const G = opening().build();
    plantLaw(G, "colonial-charter", "0");

    // Player 3's capital sits at 0,2; -1,2 is the mountain next door.
    expect(getFoundColonyStatus(G, "3", "-1,2").cost).toMatchObject({ wood: 10 });
  });
});
