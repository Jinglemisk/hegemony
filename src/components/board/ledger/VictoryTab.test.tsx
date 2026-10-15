// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLAYER_IDS } from "../../../game/data";
import { scenario } from "../../../game/testing/scenario";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { VictoryTab } from "./VictoryTab";

/**
 * The victory ledger is the one panel that answers "is anyone about to win", so
 * the only thing worth pinning about it is that it cannot say something the rules
 * do not. It once named a sole leader on a tie, because its own tiebreak started
 * from seat 0. Marks are read off the DOM here rather than off a helper's return
 * value: the defect lived in what the panel PAINTED.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(G: HegemonyState) {
  act(() => root.render(<VictoryTab G={G} playerID={PLAYER_IDS[0]} />));
  return [...container.querySelectorAll("[data-title]")];
}

/** The seat whose cell the row marks, and how: held, leading, or nothing (a tie). */
function markOf(row: Element): string {
  const cells = [...row.querySelectorAll(".r-a .cell")];
  const held = cells.findIndex((cell) => cell.classList.contains("is-held"));
  const lead = cells.findIndex((cell) => cell.classList.contains("is-lead"));
  return held >= 0 ? `held:${PLAYER_IDS[held]}` : lead >= 0 ? `lead:${PLAYER_IDS[lead]}` : "none";
}

describe("the victory ledger against the rules", () => {
  it("marks a seat only where the engine has a sole leader, and nobody on a tie", () => {
    const G = scenario().opening().build();
    const standings = victoryStandings(G);
    const rows = render(G);

    expect(rows).toHaveLength(standings.length);
    standings.forEach(({ holder, leader }, index) => {
      expect(markOf(rows[index])).toBe(
        holder ? `held:${holder}` : leader ? `lead:${leader}` : "none",
      );
    });

    // The opening deals every seat the same board, so metrics are tied by
    // construction: the state the old seat-0 tiebreak read as "Damon".
    expect(standings.some(({ leader }) => leader === null)).toBe(true);
  });

  const authoredLaws = (author: PlayerId, cardIds: string[]) =>
    cardIds.map((cardId, order) => ({ cardId, author, enactedYear: 1, order }));

  it("leaves Voice unheld while a rival leads the count below the minimum", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        state.activeLaws = authoredLaws(PLAYER_IDS[1], ["land-reform"]);
      })
      .build();

    const voice = render(G)[victoryStandings(G).findIndex((s) => s.card.metric === "voice")];

    expect(markOf(voice)).toBe(`lead:${PLAYER_IDS[1]}`);
  });

  it("gives Voice to the sole leader in standing authored Laws", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        state.activeLaws = [
          ...authoredLaws(PLAYER_IDS[1], ["land-reform", "public-works"]),
          ...authoredLaws(PLAYER_IDS[2], ["sacred-fields"]),
        ];
      })
      .build();

    const voice = render(G)[victoryStandings(G).findIndex((s) => s.card.metric === "voice")];

    expect(markOf(voice)).toBe(`held:${PLAYER_IDS[1]}`);
  });
});
