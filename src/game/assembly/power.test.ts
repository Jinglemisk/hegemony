import { describe, expect, it } from "vitest";

import { getBuildBuildingStatus } from "../status";
import { calculateIncomeBreakdown } from "../economy/income";
import { scenario } from "../testing/scenario";
import { checkStratoklesCoup, victoryStandings } from "../victory";
import type { HegemonyState, PlayerId } from "../types";
import { authoredSteleCount, patronCount, politicianStandings, stratoklesCoupStatus } from "./power";
import type { PoliticianId } from "./types";

/**
 * Power, patrons and the coup — all READ OFF THE BOARD (design §1.6).
 *
 * There is no power counter anywhere in this subsystem: a politician's power *is* the
 * height of their stele stack. So every test here works by putting stelae on the board
 * and asking the derived questions, and the repeal case works by taking one off — if
 * any of these numbers were tracked rather than derived, that is exactly where a
 * tracked counter would drift.
 */

const DEMOSTHENES_LAWS = ["land-reform", "sacred-fields", "festival-calendar", "tenant-rights"];
const PERDICCAS_LAWS = ["guild-charter", "forum-rites", "civic-pride", "census-rolls"];

function plantLaws(G: HegemonyState, cardIds: string[], author: PlayerId) {
  for (const cardId of cardIds) {
    G.activeLaws.push({ cardId, author, enactedSeason: G.season, order: G.lawOrder++ });
  }
}

/** Stratokles's stack is monuments, not Laws — a separate ledger with its own rules. */
function plantMonuments(G: HegemonyState, count: number, author: PlayerId) {
  for (let index = 0; index < count; index += 1) {
    G.tallyMonuments.push({
      cardId: "the-streets-burn",
      author,
      enactedSeason: G.season,
      order: G.lawOrder++
    });
  }
}

function standingOf(G: HegemonyState, politician: PoliticianId) {
  return politicianStandings(G).find((standing) => standing.politician.id === politician)!;
}

describe("power is the height of the stele stack", () => {
  it("counts active Laws bearing a politician's name, and nobody else's", () => {
    const G = scenario().opening().build();
    expect(standingOf(G, "demosthenes").power).toBe(0);

    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 2), "0");
    plantLaws(G, PERDICCAS_LAWS.slice(0, 1), "1");

    expect(standingOf(G, "demosthenes").power).toBe(2);
    expect(standingOf(G, "perdiccas").power).toBe(1);
    expect(standingOf(G, "kleistophenes").power).toBe(0);
  });

  it("falls again when a Law leaves the board — repeal replaces decay", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 3), "0");
    expect(standingOf(G, "demosthenes").power).toBe(3);

    // Whatever took it off the board — a repeal vote, a broken stele — power is
    // derived, so there is no second counter that could disagree with the agora.
    G.activeLaws.splice(0, 1);

    expect(standingOf(G, "demosthenes").power).toBe(2);
    expect(standingOf(G, "demosthenes").dominant).toBe(false);
  });

  it("counts Stratokles in tally monuments instead, and they are permanent", () => {
    const G = scenario().opening().build();
    plantMonuments(G, 2, "3");
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 1), "0");

    expect(standingOf(G, "stratokles").power).toBe(2);

    // Tearing the whole agora down leaves the demagogue's track untouched: his stack
    // only ever rises, which is what makes it a doomsday clock.
    G.activeLaws = [];
    expect(standingOf(G, "stratokles").power).toBe(2);
    expect(standingOf(G, "demosthenes").power).toBe(0);
  });
});

describe("patronage", () => {
  it("crowns the sole author of the most stelae", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 2), "0");
    plantLaws(G, DEMOSTHENES_LAWS.slice(2, 3), "1");

    const standing = standingOf(G, "demosthenes");
    expect(standing.patron).toBe("0");
    expect(standing.authored).toMatchObject({ "0": 2, "1": 1, "2": 0, "3": 0 });
  });

  it("leaves a politician unpatroned on a tie, the same tie→null rule the victory cards use", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 1), "0");
    plantLaws(G, DEMOSTHENES_LAWS.slice(1, 2), "2");

    expect(standingOf(G, "demosthenes").patron).toBeNull();

    // One more stele breaks the tie without any other change.
    plantLaws(G, DEMOSTHENES_LAWS.slice(2, 3), "2");
    expect(standingOf(G, "demosthenes").patron).toBe("2");
  });

  it("leaves an empty stack unpatroned", () => {
    const G = scenario().opening().build();
    expect(standingOf(G, "kleistophenes").patron).toBeNull();
    expect(patronCount(G, "0")).toBe(0);
  });
});

describe("dominance switches on the patron buff", () => {
  it("needs the threshold before the buff exists at all", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 2), "0");

    expect(G.ruleset.assembly.dominanceThreshold).toBe(3);
    expect(standingOf(G, "demosthenes").dominant).toBe(false);
    expect(calculateIncomeBreakdown(G, "0").some((line) => line.source.includes("patronage"))).toBe(false);

    plantLaws(G, DEMOSTHENES_LAWS.slice(2, 3), "0");
    expect(standingOf(G, "demosthenes").dominant).toBe(true);
  });

  it("pays the buff into the patron's income and nobody else's", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 3), "0");

    // Demosthenes's patron eats better: a flat +1 food, named on the breakdown so the
    // player can trace it. The Laws themselves are table-wide; the buff is not.
    const patronLine = calculateIncomeBreakdown(G, "0").find(
      (line) => line.source === "Demosthenes's patronage"
    );
    expect(patronLine).toMatchObject({ resource: "food", amount: 1 });
    expect(calculateIncomeBreakdown(G, "1").some((line) => line.source.includes("patronage"))).toBe(false);
  });

  it("pays a cost-shaped buff into the patron's action prices", () => {
    const G = scenario().opening().build();
    plantLaws(G, PERDICCAS_LAWS.slice(0, 3), "0");

    // Perdiccas's patron builds 1 stone cheaper — a patron buff is just another
    // standing effect, so it reaches the cost pipeline with no second code path.
    expect(getBuildBuildingStatus(G, "0", "-2,0", "temple").cost).toMatchObject({ stone: 5 });
    expect(getBuildBuildingStatus(G, "1", "0,-2", "temple").cost).toMatchObject({ stone: 6 });
  });

  it("withdraws the buff the moment the patronage is lost", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 3), "0");
    expect(calculateIncomeBreakdown(G, "0").some((line) => line.source.includes("patronage"))).toBe(true);

    // Player 1 matches the stack: a tie unpatrons the politician, and the buff goes
    // with it even though Demosthenes is still dominant.
    plantLaws(G, DEMOSTHENES_LAWS.slice(3, 4), "1");
    G.activeLaws.push({ cardId: "manumission-law", author: "1", enactedSeason: G.season, order: G.lawOrder++ });
    G.activeLaws.push({ cardId: "grain-dole", author: "1", enactedSeason: G.season, order: G.lawOrder++ });

    expect(standingOf(G, "demosthenes").patron).toBeNull();
    expect(standingOf(G, "demosthenes").dominant).toBe(true);
    expect(calculateIncomeBreakdown(G, "0").some((line) => line.source.includes("patronage"))).toBe(false);
  });
});

describe("Stratokles's coup", () => {
  it("fires when he leads, hits the threshold, and has a patron — and crowns that patron", () => {
    const G = scenario().opening().build();
    plantMonuments(G, G.ruleset.assembly.coupThreshold, "2");

    const status = stratoklesCoupStatus(G);
    expect(status).toMatchObject({ tallies: 3, threshold: 3, leads: true, patron: "2", triggered: true });

    checkStratoklesCoup(G);

    // A win, not an everybody-loses cap: crowning the patron is what gives a trailing
    // seat a reason to feed the chaos and everyone else a reason to vote it down.
    expect(G.phase).toBe("gameOver");
    expect(G.winner).toBe("2");
    expect(G.gameOverReason).toBe("stratoklesCoup");
  });

  it("does not fire below the tally threshold", () => {
    const G = scenario().opening().build();
    plantMonuments(G, 2, "2");

    expect(stratoklesCoupStatus(G).triggered).toBe(false);
    checkStratoklesCoup(G);
    expect(G.phase).toBe("gameplay");
  });

  it("does not fire while another politician matches his stack", () => {
    const G = scenario().opening().build();
    plantMonuments(G, 3, "2");
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 3), "0");

    // `leads` is strict: an agora that still argues about laws has not been seized.
    expect(stratoklesCoupStatus(G).leads).toBe(false);
    expect(stratoklesCoupStatus(G).triggered).toBe(false);
    checkStratoklesCoup(G);
    expect(G.phase).toBe("gameplay");
  });

  it("does not fire while his stack is unpatroned — nobody is there to be crowned", () => {
    const G = scenario().opening().build();
    plantMonuments(G, 2, "2");
    plantMonuments(G, 2, "3");

    const status = stratoklesCoupStatus(G);
    expect(status).toMatchObject({ tallies: 4, leads: true, patron: null, triggered: false });
    checkStratoklesCoup(G);
    expect(G.phase).toBe("gameplay");
  });
});

describe("Voice of the Assembly (the 6th victory card)", () => {
  const voiceOf = (G: HegemonyState) =>
    victoryStandings(G).find((standing) => standing.card.metric === "voice");

  it("is a sixth card in the standings, measured in patronages", () => {
    const G = scenario().opening().build();
    const standings = victoryStandings(G);

    expect(standings).toHaveLength(6);
    expect(standings.map((standing) => standing.card.id)).toContain("voice");
    expect(voiceOf(G)?.values).toMatchObject({ "0": 0, "1": 0, "2": 0, "3": 0 });
  });

  it("applies its minimum: patronising a single politician is not a claim on the Assembly", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 2), "0");

    expect(patronCount(G, "0")).toBe(1);
    expect(voiceOf(G)?.minimum).toBe(2);
    expect(voiceOf(G)?.holder).toBeNull();

    plantLaws(G, PERDICCAS_LAWS.slice(0, 2), "0");
    expect(patronCount(G, "0")).toBe(2);
    expect(voiceOf(G)?.holder).toBe("0");
  });

  it("separates seats tied on patronages by total stelae authored", () => {
    const G = scenario().opening().build();
    // Player 0 patrons two politicians off four stelae...
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 2), "0");
    plantLaws(G, PERDICCAS_LAWS.slice(0, 2), "0");
    // ...player 1 patrons two off two — the same voice, a smaller agora.
    plantLaws(G, ["homestead-act"], "1");
    plantMonuments(G, 1, "1");

    expect(patronCount(G, "0")).toBe(2);
    expect(patronCount(G, "1")).toBe(2);
    expect(authoredSteleCount(G, "0")).toBe(4);
    expect(authoredSteleCount(G, "1")).toBe(2);
    expect(voiceOf(G)?.holder).toBe("0");

    // Patronage is coarse (0–4), so without the tiebreak this card would sit unheld
    // most of the game. Push player 1 past player 0 and the card changes hands.
    plantLaws(G, ["colonial-charter", "pioneer-levy", "land-rush"], "1");
    expect(authoredSteleCount(G, "1")).toBe(5);
    expect(voiceOf(G)?.holder).toBe("1");
  });

  it("leaves the card unheld when the tiebreak ties too", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 2), "0");
    plantLaws(G, PERDICCAS_LAWS.slice(0, 2), "0");
    plantLaws(G, ["homestead-act", "colonial-charter"], "1");
    plantMonuments(G, 2, "1");

    expect(patronCount(G, "0")).toBe(2);
    expect(patronCount(G, "1")).toBe(2);
    expect(authoredSteleCount(G, "0")).toBe(authoredSteleCount(G, "1"));
    expect(voiceOf(G)?.holder).toBeNull();
  });
});
