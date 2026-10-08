import { defaultHungerLeave, resolveHunger } from "./hunger";
import { describe, expect, it } from "vitest";

import { createInitialState, startNewYear } from "./rules";
import { scenario } from "./testing/scenario";
import { createGame, endTurn, seatsBefore } from "./turn";
import { DEFAULT_RULESET, deriveRuleset } from "./ruleset";
import {
  ageEndRanking,
  checkVictoryAtTurnStart,
  titleChanges,
  titleHolders,
  victoryCardsHeld,
  victoryStandings,
  victoryThreats,
} from "./victory";
import { resolveRiot } from "./riot";
import type { HegemonyState, PlayerId } from "./types";

const SEED = 0xc0ffee;

/** Hand a player `count` unclaimed luxury goods: +2 happiness each. */
function giveLuxuries(G: HegemonyState, playerID: PlayerId, count: number) {
  G.board.luxuries
    .filter((asset) => asset.owner === null)
    .slice(0, count)
    .forEach((asset) => {
      asset.owner = playerID;
    });
}
const preloadedGame = (seed: number) => createGame(seed, undefined, "classic", true);

/**
 * These turn-structure tests cycle whole years to assert the year/opener machine.
 * From Year 2 the Assembly legitimately SUSPENDS that machine between the
 * year turning and the opener's turn, so running them under the default ruleset would
 * be measuring the agora, not the calendar. `firstYear: 0` disables the subsystem so
 * they keep testing exactly what they were written to test — the Assembly's own
 * cadence has its own suite in assembly/assembly.test.ts.
 */
const assemblyFreeGame = (seed: number) =>
  createGame(seed, deriveRuleset(DEFAULT_RULESET, { assembly: { firstYear: 0 } }), "classic", true);

function advanceTurn(G: HegemonyState) {
  G.pendingPlayerEvent = null;
  // These turn-structure tests cycle whole years; a bot-less player can end short of
  // food or riot along the way. Take the freemen-first default and complete the
  // turn-end roll before counting the next turn.
  let result = endTurn(G);
  if (G.pendingHunger)
    result = resolveHunger(
      G,
      G.currentPlayer,
      defaultHungerLeave(G, G.currentPlayer, G.pendingHunger.unfed),
    );
  if (G.pendingRiot) return resolveRiot(G, G.currentPlayer);
  return result;
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
    const G = scenario()
      .opening()
      .mutate((draft) => giveLuxuries(draft, "2", 3))
      .withHappiness("2", 3)
      .build();

    // Player 2 leads happiness outright, but the minimum is +4.
    const happiness = victoryStandings(G).find((standing) => standing.card.metric === "happiness");
    expect(happiness?.values["2"]).toBe(3);
    expect(happiness?.holder).toBeNull();

    G.players["2"].unrestTokens -= 1;
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
      .mutate((draft) => giveLuxuries(draft, "0", 4))
      .build();

    // Player 0: 3 cities (min 3) · 16 pops (min 16, sole lead) · four luxuries (min 4).
    expect(victoryCardsHeld(G, "0")).toBeGreaterThanOrEqual(3);

    checkVictoryAtTurnStart(G);

    expect(G.phase).toBe("gameOver");
    expect(G.winner).toBe("0");
    expect(G.gameOverReason).toBe("victoryRace");
  });

  it("names the threat, the title changes and who acts before the threat's turn", () => {
    const before = scenario().opening().build();
    const G = scenario()
      .opening()
      .withSettlement("0", "0,0", "city", { citizens: 6, freemen: 4, slaves: 0 })
      .withSettlement("0", "1,-2", "city", { citizens: 0, freemen: 0, slaves: 0 })
      .mutate((draft) => giveLuxuries(draft, "0", 4))
      .build();

    const changes = titleChanges(G, titleHolders(before));
    expect(changes.length).toBe(victoryCardsHeld(G, "0"));
    expect(changes.every((change) => change.from === null && change.to === "0")).toBe(true);

    const [threat] = victoryThreats(G);
    expect(threat.seat).toBe("0");
    expect(threat.titles.map((title) => title.card.id)).toEqual(
      victoryStandings(G)
        .filter((standing) => standing.holder === "0")
        .map((standing) => standing.card.id),
    );
    // Seat 0 is playing now; the other three play before its next turn starts.
    expect(G.currentPlayer).toBe("0");
    expect(seatsBefore(G, "0")).toEqual(["1", "2", "3"]);
    expect(seatsBefore(G, "2")).toEqual(["0", "1"]);
  });

  it("does not end the game below three cards", () => {
    const G = scenario().opening().build();
    checkVictoryAtTurnStart(G);
    expect(G.phase).toBe("gameplay");
    expect(G.winner).toBeNull();
  });
});

describe("the year deck is a finite clock", () => {
  it("never reshuffles the year discard back in", () => {
    const G = scenario().opening().build();
    const total = G.yearDrawPile.length;

    for (let i = 0; i < 5; i += 1) {
      startNewYear(G);
    }

    expect(G.yearDrawPile.length).toBe(total - 5);
    expect(G.yearDiscardPile.length).toBeGreaterThan(0);
  });

  it("resolves the exhaustion tally when the deck runs out: cards tie at zero, happiness decides", () => {
    // Nobody reaches a minimum from the opening, so cards tie at 0 and the tally
    // falls through to the happiness tiebreak.
    const G = scenario()
      .opening()
      .mutate((draft) => {
        for (const rival of ["0", "1", "2"] as const) {
          draft.players[rival].unrestTokens = 5;
        }
      })
      .build();
    G.yearDrawPile = [];
    const yearBefore = G.year;

    startNewYear(G);

    expect(G.phase).toBe("gameOver");
    expect(G.gameOverReason).toBe("deckExhausted");
    expect(G.winner).toBe("3");
    expect(ageEndRanking(G)).toMatchObject({ decidedBy: "happiness" });
    expect(ageEndRanking(G).rows[0].seat).toBe("3");
    // The clock stops on the last year actually played — no phantom increment,
    // which is what kept the sim's turn and year telemetry off by one.
    expect(G.year).toBe(yearBefore);
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
    expect(placements).toEqual([
      "Damon",
      "Nikos",
      "Theron",
      "Kyros",
      "Kyros",
      "Theron",
      "Nikos",
      "Damon",
    ]);
  });

  it("moves the opener on one seat each year", () => {
    const G = assemblyFreeGame(SEED);
    expect(G.yearOpener).toBe("0");

    for (let turn = 0; turn < 4; turn += 1) {
      expect(advanceTurn(G).ok).toBe(true);
    }

    expect(G.year).toBe(2);
    expect(G.yearOpener).toBe("1");
    expect(G.currentPlayer).toBe("1");
  });

  it("gives every seat one turn a year across the rotation", () => {
    const G = assemblyFreeGame(SEED);
    const seatsByYear = new Map<number, string[]>();
    seatsByYear.set(G.year, [G.currentPlayer]);

    for (let turn = 0; turn < 24 && G.phase === "gameplay"; turn += 1) {
      expect(advanceTurn(G).ok).toBe(true);
      seatsByYear.set(G.year, [...(seatsByYear.get(G.year) ?? []), G.currentPlayer]);
    }

    const lastYear = [...seatsByYear.keys()].pop();
    for (const [year, seats] of seatsByYear) {
      if (year === lastYear) continue; // the last year may be partial
      expect([...seats].sort(), `year ${year}`).toEqual(["0", "1", "2", "3"]);
    }
  });

  it("ends the game when the fourteen-card year deck is spent", () => {
    const G = assemblyFreeGame(SEED);
    expect(G.yearDrawPile.length + 1).toBe(14);

    // Nobody may win the race here: the clock alone must end it.
    G.ruleset = { ...G.ruleset, victory: { ...G.ruleset.victory, cardsToWin: 99 } };

    for (let turn = 0; turn < 14 * 4 && G.phase === "gameplay"; turn += 1) {
      expect(advanceTurn(G).ok).toBe(true);
    }

    expect(G.phase).toBe("gameOver");
    expect(G.gameOverReason).toBe("deckExhausted");
    expect(G.year).toBe(14);
  });
});

describe("board layouts", () => {
  it("classic layout is identical across seeds; shuffled differs and is seed-stable", () => {
    const classicA = createInitialState(1)
      .board.tiles.map((tile) => tile.terrain)
      .join();
    const classicB = createInitialState(2)
      .board.tiles.map((tile) => tile.terrain)
      .join();
    expect(classicA).toBe(classicB);

    const shuffledA = createInitialState(7, undefined, "shuffled")
      .board.tiles.map((tile) => tile.terrain)
      .join();
    const shuffledB = createInitialState(7, undefined, "shuffled")
      .board.tiles.map((tile) => tile.terrain)
      .join();
    const shuffledC = createInitialState(8, undefined, "shuffled")
      .board.tiles.map((tile) => tile.terrain)
      .join();
    expect(shuffledA).toBe(shuffledB);
    expect(shuffledA).not.toBe(classicA);
    expect(shuffledA).not.toBe(shuffledC);
  });
});
