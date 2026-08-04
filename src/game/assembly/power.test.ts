import { describe, expect, it } from "vitest";

import { scenario } from "../testing/scenario";
import { victoryStandings } from "../victory";
import type { HegemonyState, PlayerId } from "../types";
import { authoredSteleCount, patronCount, politicianStandings } from "./power";
import type { PoliticianId } from "./types";

/**
 * Politician power and descriptive patrons are read off the board.
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
      order: G.lawOrder++,
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

describe("Voice of the Assembly (the 6th victory card)", () => {
  const voiceOf = (G: HegemonyState) =>
    victoryStandings(G).find((standing) => standing.card.metric === "voice");

  it("is a sixth card in the standings, measured in permanent authored passes", () => {
    const G = scenario().opening().build();
    const standings = victoryStandings(G);

    expect(standings).toHaveLength(6);
    expect(standings.map((standing) => standing.card.id)).toContain("voice");
    expect(voiceOf(G)?.values).toMatchObject({ "0": 0, "1": 0, "2": 0, "3": 0 });
  });

  it("uses the settled minimum of three", () => {
    const G = scenario().opening().build();
    G.assemblyPassedByPlayer["0"] = 2;
    expect(voiceOf(G)?.minimum).toBe(3);
    expect(voiceOf(G)?.holder).toBeNull();
    G.assemblyPassedByPlayer["0"] = 3;
    G.voiceHolder = "0";
    expect(voiceOf(G)?.holder).toBe("0");
  });

  it("preserves the explicit holder through ties and changes only when the engine transfers it", () => {
    const G = scenario().opening().build();
    G.assemblyPassedByPlayer["0"] = 3;
    G.assemblyPassedByPlayer["1"] = 3;
    G.voiceHolder = "0";
    expect(voiceOf(G)?.holder).toBe("0");
    G.assemblyPassedByPlayer["1"] = 4;
    G.voiceHolder = "1";
    expect(voiceOf(G)?.holder).toBe("1");
  });

  it("does not infer Voice from visible patronage or stelae", () => {
    const G = scenario().opening().build();
    plantLaws(G, DEMOSTHENES_LAWS.slice(0, 2), "0");
    plantLaws(G, PERDICCAS_LAWS.slice(0, 2), "0");
    expect(patronCount(G, "0")).toBe(2);
    expect(authoredSteleCount(G, "0")).toBe(4);
    expect(G.assemblyPassedByPlayer["0"]).toBe(0);
    expect(voiceOf(G)?.holder).toBeNull();
  });
});
