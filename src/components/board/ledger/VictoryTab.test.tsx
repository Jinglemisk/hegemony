// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLAYER_IDS } from "../../../game/data";
import { scenario } from "../../../game/testing/scenario";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { VictoryTab } from "./VictoryTab";

/**
 * The victory ledger is the one panel that answers "is anyone about to win", so
 * the only thing worth pinning about it is that it cannot say something the rules
 * do not. Two ways it did:
 *
 *  · it named a sole leader on a tie, because its own tiebreak started from seat 0;
 *  · it drew a negative metric as a completed meter, because a negative width is
 *    an invalid style and React drops it, leaving the bar at its full-width default.
 *
 * Both are read off the DOM here rather than off a helper's return value: the
 * defect lived in what the panel PAINTED, and a unit test of the maths would have
 * passed through it.
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
  return [...container.querySelectorAll(".vcard")];
}

function markOf(card: Element): string {
  const glaze = card.querySelector(".vcardGlaze");
  return glaze
    ? `glaze:${glaze.textContent}`
    : `none:${card.querySelector(".vcardNobody")?.textContent}`;
}

function meterWidth(card: Element): string | undefined {
  return (card.querySelector(".vcardMeter i") as HTMLElement | null)?.style.width;
}

describe("the victory ledger against the rules", () => {
  it("names a glaze only where the engine has a sole leader, and a tie where it does not", () => {
    const G = scenario().opening().build();
    const standings = victoryStandings(G);
    const cards = render(G);

    expect(cards).toHaveLength(standings.length);

    standings.forEach(({ card, values, holder }, index) => {
      const best = Math.max(...PLAYER_IDS.map((id) => values[id]));
      const atBest = PLAYER_IDS.filter((id) => values[id] === best);
      // Voice belongs to its holder, never to whoever is ahead on the count.
      const named =
        card.metric === "voice" ? holder : (holder ?? (atBest.length === 1 ? atBest[0] : null));

      expect(markOf(cards[index])).toBe(
        named === null
          ? `none:${card.metric === "voice" ? "unheld" : "tied"}`
          : `glaze:${PLAYER_GLAZES[named].blazon}`,
      );
    });

    // The opening deals every seat the same board, so the five board metrics are
    // tied by construction — the state the old seat-0 tiebreak read as "Damon".
    const tied = standings.filter(
      ({ values }) => PLAYER_IDS.filter((id) => values[id] === values[PLAYER_IDS[0]]).length > 1,
    );
    expect(tied.length).toBeGreaterThan(0);
  });

  it("draws an empty meter when the leading value is below zero", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        PLAYER_IDS.forEach((id, seat) => {
          state.players[id].resources.happiness = -1 - seat;
        });
      })
      .build();

    const happiness =
      render(G)[victoryStandings(G).findIndex((s) => s.card.metric === "happiness")];

    expect(happiness.querySelector(".vcardLead")?.textContent).toContain("-1");
    // Not "" and not "-10%": an unset width is what painted the full bar.
    expect(meterWidth(happiness)).toBe("0%");
  });

  it("leaves Voice unheld while a rival leads the count but has not claimed it", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        state.assemblyPassedByPlayer[PLAYER_IDS[1]] = state.ruleset.victory.minimums.voice - 1;
        state.voiceHolder = null;
      })
      .build();

    const voice = render(G)[victoryStandings(G).findIndex((s) => s.card.metric === "voice")];

    expect(markOf(voice)).toBe("none:unheld");
  });

  it("gives Voice to its holder even when a rival has drawn level", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        const minimum = state.ruleset.victory.minimums.voice;
        state.assemblyPassedByPlayer[PLAYER_IDS[1]] = minimum;
        state.assemblyPassedByPlayer[PLAYER_IDS[2]] = minimum;
        state.voiceHolder = PLAYER_IDS[1];
      })
      .build();

    const voice = render(G)[victoryStandings(G).findIndex((s) => s.card.metric === "voice")];

    expect(markOf(voice)).toBe(`glaze:${PLAYER_GLAZES[PLAYER_IDS[1]].blazon}`);
  });
});
