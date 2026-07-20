import { describe, expect, it } from "vitest";

import { POLITICIANS, POLITICIANS_BY_ID, RESOLUTION_CARDS, RESOLUTION_DECKS, getResolutionCard } from "./deck";
import type { LawCard, LawEffect, PoliticianId, ResolutionCard } from "./types";

/**
 * Deck integrity (docs/feat/assembly-politicians.md Appendix A).
 *
 * These are content assertions, not balance ones: every magnitude in deck.ts is
 * expected to move with `?tune` and the sim, so nothing here pins a number. What it
 * pins is the GRAMMAR the design calls its north star — 8/8/8 Laws + 7 Directives,
 * Stratokles alone dealing in Directives, and above all that every Law carries a
 * trade-off. The file's own header says it: "A Law with only upside is a bug in this
 * file." That line is only enforceable if something enforces it, which is the last
 * test in this suite.
 */

const laws = RESOLUTION_CARDS.filter((card): card is LawCard => card.kind === "law");
const directives = RESOLUTION_CARDS.filter((card) => card.kind === "directive");

/**
 * Which way an effect pushes for the player under it: +1 is an upside, -1 a downside.
 *
 * Sign alone is not enough because the vocabulary mixes ledgers — +1 income is good
 * while +1 cost is bad — so each effect kind declares its own reading. The two
 * inherently two-sided entries (a threshold that pays above and bites below, a colony
 * rider that grants a pop and charges happiness) report BOTH directions from a single
 * effect, which is why Cult of Demeter and Frontier Spirit are legal one-effect Laws.
 */
function directionsOf(effect: LawEffect): number[] {
  switch (effect.type) {
    case "settlementIncome":
    case "popIncome":
    case "popPrimaryIncome":
    case "flatIncome":
      return [Math.sign(effect.amount)];
    case "actionCostDelta":
      // A cheaper action is the upside, so the cost delta reads inverted.
      return [-Math.sign(effect.amount)];
    case "actionCostMultiplier":
      return [effect.multiplier < 1 ? 1 : -1];
    case "bankRateStep":
      return [Math.sign(effect.steps)];
    case "yearlyFreeAction":
      return [1];
    case "surplusConversion":
      return [1];
    case "thresholdHappiness":
      return [Math.sign(effect.atOrAbove), Math.sign(effect.below)];
    case "onFoundColony":
      return [effect.grantPop ? 1 : 0, Math.sign(effect.happiness ?? 0)];
  }
}

describe("the politician roster", () => {
  it("is the four figures of the design, three law-dealers and one demagogue", () => {
    expect(POLITICIANS).toHaveLength(4);
    expect(POLITICIANS.map((politician) => politician.id)).toEqual([
      "demosthenes",
      "perdiccas",
      "kleistophenes",
      "stratokles"
    ]);
    expect(POLITICIANS.filter((politician) => politician.kind === "law")).toHaveLength(3);
    expect(POLITICIANS.filter((politician) => politician.kind === "directive")).toHaveLength(1);
    expect(POLITICIANS_BY_ID.stratokles.kind).toBe("directive");
  });

  it("gives every politician a patron buff with at least one standing effect", () => {
    // The buff rides the same LawEffect vocabulary as the Laws (§1.6), which is what
    // lets the modifier layer serve both from one code path — an empty one would be a
    // dominance that switches nothing on.
    for (const politician of POLITICIANS) {
      expect(politician.patronBuff.label, politician.id).not.toBe("");
      expect(politician.patronBuff.effects.length, politician.id).toBeGreaterThan(0);
    }
  });
});

describe("the 31-card starter deck", () => {
  it("holds exactly 31 cards: 8 Laws each for the three regulars, 7 Directives for Stratokles", () => {
    expect(RESOLUTION_CARDS).toHaveLength(31);
    expect(RESOLUTION_DECKS.demosthenes).toHaveLength(8);
    expect(RESOLUTION_DECKS.perdiccas).toHaveLength(8);
    expect(RESOLUTION_DECKS.kleistophenes).toHaveLength(8);
    expect(RESOLUTION_DECKS.stratokles).toHaveLength(7);
    expect(laws).toHaveLength(24);
    expect(directives).toHaveLength(7);
  });

  it("gives every card a unique id, findable by that id", () => {
    const ids = RESOLUTION_CARDS.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const card of RESOLUTION_CARDS) {
      expect(getResolutionCard(card.id), card.id).toBe(card);
    }

    expect(getResolutionCard("no-such-resolution")).toBeNull();
  });

  it("files every card under the politician it names", () => {
    // The stack a card is drawn from IS the politician whose power it feeds
    // (power.ts reads `card.politician`), so a misfiled card would credit the wrong
    // figure on enactment.
    for (const [politician, deck] of Object.entries(RESOLUTION_DECKS) as Array<[PoliticianId, ResolutionCard[]]>) {
      for (const card of deck) {
        expect(card.politician, card.id).toBe(politician);
      }
    }
  });

  it("keeps the Law/Directive split on politician lines: only Stratokles deals in Directives", () => {
    for (const directive of directives) {
      expect(directive.politician, directive.id).toBe("stratokles");
    }

    for (const law of laws) {
      expect(law.politician, law.id).not.toBe("stratokles");
    }
  });

  it("prints a name and an effect line on every card face", () => {
    for (const card of RESOLUTION_CARDS) {
      expect(card.name, card.id).not.toBe("");
      expect(card.text, card.id).not.toBe("");
      expect(card.effects.length, card.id).toBeGreaterThan(0);
    }
  });

  it("bands every Directive as mob or agitator", () => {
    for (const directive of directives) {
      expect(["mob", "agitator"], directive.id).toContain(
        directive.kind === "directive" ? directive.faction : null
      );
    }
  });
});

describe("every Law carries a trade-off", () => {
  it("states the axis it trades on", () => {
    for (const law of laws) {
      expect(law.tradeOff, law.id).not.toBe("");
    }
  });

  it("carries BOTH an upside and a downside — deck.ts: 'a Law with only upside is a bug in this file'", () => {
    for (const law of laws) {
      const directions = law.effects.flatMap(directionsOf);

      // Either the Law spends two effects to buy one thing with another, or it spends
      // one inherently two-sided effect (a threshold, a colony rider) to do it.
      expect(law.effects.length === 1 ? directions.filter(Boolean).length : law.effects.length, law.id)
        .toBeGreaterThanOrEqual(2);
      expect(directions, `${law.id} has no upside`).toContain(1);
      expect(directions, `${law.id} has no downside`).toContain(-1);
    }
  });
});
