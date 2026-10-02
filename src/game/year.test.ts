import { describe, expect, it } from "vitest";

import { civicCalm } from "./civic";
import { calculateIncome, settlementNextYield } from "./economy/income";
import { happinessLevel } from "./happiness";
import { owned, scenario, tile } from "./testing/scenario";
import { endTurn } from "./turn";
import type { HegemonyState, YearCard } from "./types";
import { unrestStatus } from "./unrest";
import { victoryMetricValue, victoryStandings } from "./victory";
import { revealYearCard } from "./year";

/** A game mid-year with no Assembly, nothing pending and no card in play. */
function game(): HegemonyState {
  const G = scenario({ patch: { assembly: { firstYear: 0 } } })
    .opening()
    .build();
  G.pendingPlayerEvent = null;
  G.activeYearCard = null;

  return G;
}

function yearCard(G: HegemonyState, id: string): YearCard {
  const card = G.definition.content.yearCards.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`no year card ${id}`);
  return card;
}

/** Stand a card as this year's, for seats that have not yet collected. */
function standCard(G: HegemonyState, id: string) {
  G.activeYearCard = yearCard(G, id);
  for (const player of Object.values(G.players)) player.collectedThisTurn = false;
}

describe("year cards that zero a term", () => {
  it("Drought takes the whole plains column, the Estate's raise included", () => {
    const G = game();
    const capital = G.players["0"].settlements[0];
    const land = tile(G, capital);
    land.terrain = "plains";
    land.resource = { type: "food" };
    land.slots = 7;
    const settlement = owned(G, capital, "0");
    settlement.pops = { citizens: 0, freemen: 0, slaves: 3 };
    settlement.buildings = ["estate"];
    for (const other of G.players["0"].settlements.slice(1)) {
      owned(G, other, "0").pops = { citizens: 0, freemen: 0, slaves: 0 };
    }
    G.players["0"].collectedThisTurn = false;

    expect(calculateIncome(G, "0").food).toBe(6);

    standCard(G, "year-drought");

    expect(calculateIncome(G, "0").food).toBe(0);
    expect(settlementNextYield(G, land, settlement).food).toBe(0);
  });

  it("Piracy and Ostracism leave the mouths to feed", () => {
    const G = game();
    for (const tileId of G.players["0"].settlements) {
      owned(G, tileId, "0").pops = { citizens: 0, freemen: 0, slaves: 0 };
    }
    owned(G, G.players["0"].settlements[0], "0").pops = { citizens: 2, freemen: 3, slaves: 0 };
    G.players["0"].collectedThisTurn = false;

    expect(calculateIncome(G, "0")).toMatchObject({ gold: 3, influence: 2, food: -5 });

    standCard(G, "year-piracy");
    expect(calculateIncome(G, "0")).toMatchObject({ gold: 0, influence: 2, food: -5 });

    standCard(G, "year-ostracism");
    expect(calculateIncome(G, "0")).toMatchObject({ gold: 3, influence: 0, food: -5 });
  });

  it("bites only the income a seat has not yet collected this year", () => {
    const G = game();
    for (const tileId of G.players["0"].settlements) {
      owned(G, tileId, "0").pops = { citizens: 0, freemen: 0, slaves: 0 };
    }
    owned(G, G.players["0"].settlements[0], "0").pops = { citizens: 0, freemen: 2, slaves: 0 };
    standCard(G, "year-piracy");
    expect(calculateIncome(G, "0").gold).toBe(0);

    // Their next income falls under next year's card, which nobody has seen.
    G.players["0"].collectedThisTurn = true;
    expect(calculateIncome(G, "0").gold).toBe(2);
  });

  it("Blockade takes the luxuries out of the level", () => {
    const G = game();
    const asset = G.board.luxuries[0];
    asset.owner = "0";
    const before = happinessLevel(G, "0");

    standCard(G, "year-blockade");

    expect(happinessLevel(G, "0")).toBe(before - G.ruleset.economy.luxury.happinessPerGood);
  });
});

describe("Plague and Festival", () => {
  it("place one Unrest token on every realm, and clear them all", () => {
    const G = game();
    G.players["2"].unrestTokens = 2;

    G.yearDrawPile.unshift(yearCard(G, "year-plague"));
    revealYearCard(G);
    expect(Object.values(G.players).map((player) => player.unrestTokens)).toEqual([1, 1, 3, 1]);

    G.yearDrawPile.unshift(yearCard(G, "year-festival"));
    revealYearCard(G);
    expect(Object.values(G.players).map((player) => player.unrestTokens)).toEqual([0, 0, 0, 0]);
  });
});

describe("calm lasts a year", () => {
  it("is still counted at the riot test that opens the buyer's next turn", () => {
    const G = game();
    const player = G.players["0"];
    player.resources.gold = 10;
    // Exactly on the riot line without calm.
    player.unrestTokens = happinessLevel(G, "0") - G.ruleset.economy.unrest.riotThreshold;
    expect(unrestStatus(G, "0").tier).toBe("unrest");

    expect(civicCalm(G, "0", "gold").ok).toBe(true);
    expect(unrestStatus(G, "0").tier).toBe("discontent");

    // Seat 0 opened Year 1 and plays last in Year 2: the year card turns in between.
    let turns = 0;
    do {
      G.pendingPlayerEvent = null;
      G.pendingRiot = null;
      // Keep the year's card from moving tokens under the test.
      G.yearDrawPile = G.yearDrawPile.map(() => yearCard(G, "year-piracy"));
      expect(endTurn(G).ok).toBe(true);
      turns += 1;
    } while ((G.currentPlayer as string) !== "0");

    expect(turns).toBe(7);
    expect(G.year).toBe(2);
    // The turn opened with calm counted, so no riot, and then the calm was spent.
    expect(G.pendingRiot).toBeNull();
    expect(player.calmActive).toBe(false);
    expect(unrestStatus(G, "0").tier).toBe("unrest");
  });
});

describe("victory by the paper's minimums", () => {
  it("Treasurer counts gold only", () => {
    const G = game();
    Object.assign(G.players["0"].resources, { wood: 200, stone: 200, food: 200, gold: 29 });
    const treasurer = () => victoryStandings(G).find((standing) => standing.card.metric === "gold");

    expect(victoryMetricValue(G, "0", "gold")).toBe(29);
    expect(treasurer()?.holder).toBeNull();

    G.players["0"].resources.gold = 30;
    expect(treasurer()?.holder).toBe("0");
  });

  it("uses the paper's minimums", () => {
    expect(game().ruleset.victory.minimums).toEqual({
      cities: 3,
      pops: 14,
      citizens: 5,
      gold: 30,
      happiness: 4,
      voice: 2,
    });
  });
});
