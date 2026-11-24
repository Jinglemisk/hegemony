// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GameEvents, GameMoves } from "../../../client/controller";
import { PLAYER_IDS } from "../../../game/data";
import { scenario } from "../../../game/testing/scenario";
import { victoryStandings } from "../../../game/victory";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { GameUiProvider } from "../../board/GameUiProvider";
import { Drawer } from "../Drawer";

/**
 * The Victory drawer answers "is anyone about to win", so the one thing worth pinning
 * is that it cannot say something the rules do not. Its predecessor once named a sole
 * leader on a tie, because its own tiebreak started from seat 0. Frames and the foot
 * line are read off the DOM: the defect lived in what the panel painted.
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

const noop = () => {};

function render(G: HegemonyState) {
  act(() =>
    root.render(
      <GameUiProvider
        value={{
          G,
          viewerId: "0",
          viewer: G.players["0"],
          activeEffects: [],
          currentPlayerId: "0",
          phase: "gameplay",
          isActive: true,
          turnBlocked: null,
          humans: PLAYER_IDS,
          moves: {} as GameMoves,
          events: {} as GameEvents,
        }}
      >
        <Drawer
          actions={{
            onFound: noop,
            onMoveOut: noop,
            onBuild: noop,
            onOpenHand: noop,
            onBuyCard: noop,
            onCompose: noop,
            onIdeasModal: noop,
          }}
          id="victory"
          income={G.players["0"].resources}
          onClose={noop}
          onPick={noop}
          onTab={noop}
        />
      </GameUiProvider>,
    ),
  );
  return [...container.querySelectorAll<HTMLElement>(".vc-card")];
}

/** The seat whose glaze frames the card and whose count it marks held, and what the
 *  foot line says of it. */
function read(card: HTMLElement) {
  const held = [...card.querySelectorAll(".vc-counts li")].findIndex((count) =>
    count.classList.contains("is-held"),
  );
  act(() => card.focus());
  return {
    held: held >= 0 ? PLAYER_IDS[held] : null,
    frame: card.dataset.held ?? null,
    foot: container.querySelector(".lw-foot")?.textContent ?? "",
  };
}

describe("the Victory drawer against the rules", () => {
  it("marks and names a seat only where the engine has a holder or a sole leader", () => {
    const G = scenario().opening().build();
    const standings = victoryStandings(G);
    const rows = render(G);

    expect(rows).toHaveLength(standings.length);
    standings.forEach(({ holder, leader }, index) => {
      const { held, frame, foot } = read(rows[index]);
      expect(held).toBe(holder);
      expect(frame).toBe(holder ? PLAYER_GLAZES[holder].glaze.toLowerCase() : null);
      if (holder) expect(foot).toContain(`Held by ${G.players[holder].name}.`);
      else if (leader) expect(foot).toContain(`${G.players[leader].name} leads`);
      else expect(foot).toContain("Tied: no one holds it.");
    });

    // The opening deals every seat the same board, so metrics are tied by
    // construction: the state the old seat-0 tiebreak read as "Damon".
    expect(standings.some(({ leader }) => leader === null)).toBe(true);
  });

  const authoredLaws = (author: PlayerId, cardIds: string[]) =>
    cardIds.map((cardId, order) => ({ cardId, author, enactedYear: 1, order }));
  const voiceRow = (G: HegemonyState) =>
    render(G)[victoryStandings(G).findIndex((s) => s.card.metric === "voice")];

  it("leaves Voice unheld while a rival leads the count below the minimum", () => {
    const G = scenario()
      .opening()
      .mutate((state) => {
        state.activeLaws = authoredLaws(PLAYER_IDS[1], ["land-reform"]);
      })
      .build();

    const { held, foot } = read(voiceRow(G));
    expect(held).toBeNull();
    expect(foot).toContain(`${G.players[PLAYER_IDS[1]].name} leads`);
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

    expect(read(voiceRow(G)).held).toBe(PLAYER_IDS[1]);
  });
});
