import { describe, expect, it } from "vitest";
import { getAuthoredGameContent } from "../game/content";
import { projectForPlayer } from "../game/projection";
import { DEFAULT_RULESET } from "../game/ruleset";
import { scenario } from "../game/testing/scenario";
import {
  deckLine,
  faceIcons,
  fateCardFace,
  ideaCardFace,
  resolutionCardFace,
  yearCardFace,
} from "./cardFace";
import type { CardFace, EqRow } from "./cardFace";
import { rasterIcon } from "./icons/placeholders";

const content = getAuthoredGameContent();

/** Every card in the game today, through its deck's presenter. */
const FACES: CardFace[] = [
  ...content.yearCards.map((card) => yearCardFace(card, 2)),
  ...content.playerEvents.map((card) => fateCardFace(card)),
  ...content.resolutions.map((card) => resolutionCardFace(card, DEFAULT_RULESET, content)),
  ...content.nationalIdeas.map((idea) => ideaCardFace(idea, DEFAULT_RULESET, content)),
];

/** An equation read back in the study's own mini-syntax, icons by their file name. */
function spell(rows: EqRow[]): string {
  return rows
    .map((row) =>
      row.tokens
        .map((token) =>
          "icon" in token
            ? `[${token.struck ? "!" : ""}${token.icon.split("/").pop()}]`
            : "n" in token
              ? token.n
              : "op" in token
                ? token.op
                : `^${token.cond}`,
        )
        .join(" "),
    )
    .join(" | ");
}

const face = (name: string) => FACES.find((card) => card.name === name)!;

describe("every card of every deck has a face", () => {
  it.each(FACES.map((card) => [card.name, card] as const))("%s", (_name, card) => {
    const rows = [...card.equation.rows, ...card.equation.but];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(3);
    expect(rows.every((row) => row.tokens.length > 0)).toBe(true);
    // Each icon it names is a picture this build ships.
    for (const icon of faceIcons(card)) expect(rasterIcon(icon), icon).toBeDefined();
    expect(card.sentence.length).toBeGreaterThan(0);
  });
});

describe("the equation reads the card's typed effects", () => {
  it("prints the year's struck term", () => {
    expect(spell(face("Drought").equation.rows)).toBe("[plains] [food] = 0");
    expect(face("Drought").equation.rows[0].tone).toBe("cost");
    expect(face("Festival").equation.rows[0].tone).toBe("gain");
  });

  it("puts a Law's costs under the rule, and its prices against the base", () => {
    const works = face("Public Works").equation;
    expect(spell(works.rows)).toBe(
      "[build] [estate] [granary] = 3 [wood] | [build] [marketplace] = 2 [wood] 2 [gold]",
    );
    expect(spell(works.but)).toBe("[colony] [capacity] = 3");
    const dues = face("Harbour Dues").equation;
    expect(dues.rows.map((row) => row.tone)).toEqual(["gain"]);
    expect(dues.but.map((row) => row.tone)).toEqual(["cost"]);
  });

  it("aims a Directive at the rival its author picks", () => {
    expect(spell(face("Grain Riot").equation.rows)).toBe("−3 [food] → [dossier]");
    expect(face("General Strike").duration.label).toBe("Duration: Next turn");
    expect(face("Isonomia").duration.label).toBe("Duration: Till the next sitting");
  });
});

describe("the deck line says only what the table knows", () => {
  it("counts what is left of each kind from the cards turned, under the projection", () => {
    const G = scenario().opening().build();
    // The seat holding the fate sees it; the piles' order and identities stay hidden.
    const viewer = G.pendingPlayerEvent?.playerID ?? G.currentPlayer;
    const seen = projectForPlayer(G.definition, G, viewer).state;
    for (const deck of [{ kind: "year" }, { kind: "fate" }] as const) {
      const line = deckLine(seen, deck);
      expect(line.left).toBe(deckLine(G, deck).left);
      expect(line.kinds.reduce((sum, kind) => sum + kind.left, 0)).toBe(line.left);
    }
  });
});
