import { describe, expect, it } from "vitest";

import { calculateIncome, createInitialState, startNewSeason } from "./rules";
import { scenario } from "./testing/scenario";
import { createGame, endTurn } from "./turn";
import { checkVictoryAtTurnStart, victoryCardsHeld, victoryStandings } from "./victory";
import type { HegemonyState } from "./types";

const SEED = 0xc0ffee;
const preloadedGame = (seed: number) => createGame(seed, undefined, "classic", true);

function clearPending(G: HegemonyState) {
  G.pendingPlayerEvent = null;
  // These turn-structure tests cycle whole years; a bot-less player can riot along
  // the way (D9) — dismiss it, the riot flow has its own suite (riot.test.ts).
  G.pendingRiot = null;
}

describe("victory card standings", () => {
  it("a card is held only by the sole leader at or above the minimum", () => {
    const G = scenario().opening().build();

    // Everyone starts with 1 city (the metropolis) — tied, so Polis Builder is unheld.
    const cities = victoryStandings(G).find((standing) => standing.card.metric === "cities");
    expect(cities?.holder).toBeNull();

    // Give player 1 two more cities (meets the minimum of 3, sole leader).
    const none = { citizens: 0, freemen: 0, slaves: 0 };
    const G2 = scenario()
      .opening()
      .withSettlement("1", "0,0", "city", none)
      .withSettlement("1", "1,-2", "city", none)
      .build();
    const cities2 = victoryStandings(G2).find((standing) => standing.card.metric === "cities");
    expect(cities2?.holder).toBe("1");
  });

  it("leading below the minimum holds nothing", () => {
    const G = scenario().opening().withHappiness("2", 9).build();

    // Player 2 leads happiness outright, but the minimum is +10.
    const happiness = victoryStandings(G).find((standing) => standing.card.metric === "happiness");
    expect(happiness?.values["2"]).toBe(9);
    expect(happiness?.holder).toBeNull();

    G.players["2"].resources.happiness = 10;
    const after = victoryStandings(G).find((standing) => standing.card.metric === "happiness");
    expect(after?.holder).toBe("2");
  });

  it("no card is holdable from the opening position (design rule: minimums beat the start)", () => {
    const G = scenario().opening().build();

    // Player 0's bootstrap income has already collected — even so, nothing is held.
    for (const standing of victoryStandings(G)) {
      expect(standing.holder, standing.card.id).toBeNull();
    }
  });

  it("ends the game at the start of a turn when the player holds three cards", () => {
    const G = scenario()
      .opening()
      .withSettlement("0", "0,0", "city", { citizens: 6, freemen: 4, slaves: 0 })
      .withSettlement("0", "1,-2", "city", { citizens: 0, freemen: 0, slaves: 0 })
      .withHappiness("0", 12)
      .build();

    // Player 0: 3 cities (min 3) · 16 pops (min 16, sole lead) · happiness 12 (min 10).
    expect(victoryCardsHeld(G, "0")).toBeGreaterThanOrEqual(3);

    checkVictoryAtTurnStart(G);

    expect(G.phase).toBe("gameOver");
    expect(G.winner).toBe("0");
    expect(G.gameOverReason).toBe("victoryRace");
  });

  it("does not end the game below three cards", () => {
    const G = scenario().opening().build();
    checkVictoryAtTurnStart(G);
    expect(G.phase).toBe("gameplay");
    expect(G.winner).toBeNull();
  });
});

describe("the seasonal deck is a finite clock", () => {
  it("never reshuffles the seasonal discard back in", () => {
    const G = scenario().opening().build();
    const total = G.seasonalDrawPile.length;

    for (let i = 0; i < 5; i += 1) {
      startNewSeason(G);
    }

    expect(G.seasonalDrawPile.length).toBe(total - 5);
    expect(G.seasonalDiscardPile.length).toBeGreaterThan(0);
  });

  it("resolves the exhaustion tally when the deck runs out: cards tie at zero, happiness decides", () => {
    // Nobody reaches a minimum from the opening, so cards tie at 0 and the tally
    // falls through to the happiness tiebreak.
    const G = scenario().opening().withHappiness("3", 40).build();
    G.seasonalDrawPile = [];

    startNewSeason(G);

    expect(G.phase).toBe("gameOver");
    expect(G.gameOverReason).toBe("deckExhausted");
    expect(G.winner).toBe("3");
  });
});

describe("phase-0 turn structure", () => {
  it("setup snakes: capitals 0→3, second cities 3→0", () => {
    const preloaded = preloadedGame(SEED);
    expect(preloaded.phase).toBe("gameplay");
    // Snake order is proven by the log: capitals in seat order, second cities reversed.
    const placements = preloaded.log
      .filter((entry) => entry.message.includes("founded"))
      .map((entry) => entry.message.split(" ")[0]);
    expect(placements).toEqual(["Damon", "Nikos", "Theron", "Kyros", "Kyros", "Theron", "Nikos", "Damon"]);
  });

  it("rotates the season opener each new year", () => {
    const G = preloadedGame(SEED);
    expect(G.seasonOpener).toBe("0");

    // Play through year 1 (4 seasons × 4 turns). Season 5 is spring of year 2.
    for (let turn = 0; turn < 16; turn += 1) {
      clearPending(G);
      expect(endTurn(G).ok).toBe(true);
      if (G.phase !== "gameplay") break;
    }

    expect(G.season).toBe(5);
    expect(G.seasonOpener).toBe("1");
    expect(G.currentPlayer).toBe("1");
  });

  it("keeps four turns per season across the rotation boundary", () => {
    const G = preloadedGame(SEED);
    const seasonTurns = new Map<number, number>();
    seasonTurns.set(G.season, 1);

    for (let turn = 0; turn < 24 && G.phase === "gameplay"; turn += 1) {
      clearPending(G);
      expect(endTurn(G).ok).toBe(true);
      seasonTurns.set(G.season, (seasonTurns.get(G.season) ?? 0) + 1);
    }

    for (const [season, turns] of seasonTurns) {
      if (season === [...seasonTurns.keys()].pop()) continue; // last season may be partial
      expect(turns, `season ${season}`).toBe(4);
    }
  });
});

describe("stockpile happiness cap", () => {
  it("caps the food-stockpile bonus at the ruleset cap", () => {
    const G = scenario().opening().build();
    G.players["1"].resources.food = 60; // uncapped would be +12

    const income = calculateIncome(G, "1");
    const uncappedPortion = Math.floor(60 / G.ruleset.economy.foodStockpileHappinessDivisor);
    expect(uncappedPortion).toBeGreaterThan(G.ruleset.economy.foodStockpileHappinessCap);

    // The happiness income contains at most the cap from the stockpile; verify by
    // comparing against the same position with a modest 10-food stockpile (= +2).
    G.players["1"].resources.food = 10;
    const modest = calculateIncome(G, "1");
    expect(income.happiness).toBe(modest.happiness);
  });
});

describe("board layouts", () => {
  it("classic layout is identical across seeds; shuffled differs and is seed-stable", () => {
    const classicA = createInitialState(1).board.tiles.map((tile) => tile.terrain).join();
    const classicB = createInitialState(2).board.tiles.map((tile) => tile.terrain).join();
    expect(classicA).toBe(classicB);

    const shuffledA = createInitialState(7, undefined, "shuffled").board.tiles.map((tile) => tile.terrain).join();
    const shuffledB = createInitialState(7, undefined, "shuffled").board.tiles.map((tile) => tile.terrain).join();
    const shuffledC = createInitialState(8, undefined, "shuffled").board.tiles.map((tile) => tile.terrain).join();
    expect(shuffledA).toBe(shuffledB);
    expect(shuffledA).not.toBe(classicA);
    expect(shuffledA).not.toBe(shuffledC);
  });
});
