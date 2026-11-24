// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createCommandEvents,
  createCommandMoves,
  reduceGameCommand,
} from "../../../client/commandAdapter";
import { mulberry32 } from "../../../game/core/rng";
import { happinessLevel } from "../../../game/happiness";
import type { GameCommand } from "../../../game/legalMoves";
import { scenario } from "../../../game/testing/scenario";
import { endTurn } from "../../../game/turn";
import type { DevCardId, HegemonyState, PlayerId } from "../../../game/types";
import { ConfirmProvider } from "../../chrome/Confirm";
import { GameUiContext } from "../GameUiContext";
import { RiotModal } from "./RiotModal";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

/** Seat 0 at its committed turn end, rioting, holding `cards`, its die set on `face`. */
function riot(face: number, cards: DevCardId[] = []) {
  const build = scenario().opening();
  for (const card of cards) build.withDevCard("0", card);
  const G = build
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      draft.players["0"].resources.food = 10;
      draft.players["0"].unrestTokens =
        happinessLevel(draft, "0") - draft.ruleset.economy.unrest.riotThreshold;
    })
    .build();
  expect(endTurn(G).ok).toBe(true);
  for (let state = 1; ; state += 1)
    if (1 + Math.floor(mulberry32(state).value * 6) === face) {
      G.rng = state;
      return G;
    }
}

/** The riot sheet over a live game: each command it sends goes through the engine. */
function mount(start: HegemonyState) {
  let G = start;
  const dismissed = vi.fn();
  const dispatch = (command: GameCommand, actor?: PlayerId) => {
    G = reduceGameCommand(G, actor ?? G.currentPlayer, command);
    render();
  };
  const moves = createCommandMoves(dispatch);
  const events = createCommandEvents(dispatch);
  function render() {
    root.render(
      <GameUiContext.Provider
        value={{
          G,
          currentPlayerId: "0",
          viewerId: "0",
          viewer: G.players["0"],
          activeEffects: [],
          phase: G.phase,
          isActive: true,
          turnBlocked: null,
          humans: ["0", "1", "2", "3"],
          moves,
          events,
        }}
      >
        <ConfirmProvider>
          <RiotModal onDismissResult={dismissed} onRolled={() => {}} />
        </ConfirmProvider>
      </GameUiContext.Provider>,
    );
  }
  act(render);
  return { dismissed };
}

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const name = () => document.getElementById(dialog().getAttribute("aria-labelledby")!)?.textContent;
const button = (label: string | RegExp) =>
  [...dialog().querySelectorAll("button")].find((candidate) =>
    typeof label === "string"
      ? candidate.textContent === label
      : label.test(candidate.textContent ?? ""),
  )!;
const lines = () => [...dialog().querySelectorAll(".lossLines li")].map((line) => line.textContent);

it("seals a card per insurance, rolls, and reads the rolled card's losses from the engine", () => {
  // Granary sacked: 3 food.
  const { dismissed } = mount(riot(4));
  expect(name()).toBe("Riot");
  expect(dialog().querySelectorAll(".riotFace")).toHaveLength(6);

  // The bread dole seals the lowest card, and shows the food it would take.
  act(() => button(/^Bread dole/).click());
  const sealed = dialog().querySelectorAll(".riotFace.is-sealed");
  expect(sealed).toHaveLength(1);
  expect(sealed[0].textContent).toContain("Sealed by Bread dole");
  expect(dialog().querySelector(".riotTileFoot")?.textContent).toBe("Food10→6");
  act(() => button(/^Bread dole/).click());
  expect(dialog().querySelectorAll(".riotFace.is-sealed")).toHaveLength(0);

  // The die tumbles on the sheet, lights its card, then the card is read.
  act(() => button("Roll the die").click());
  expect(name()).toBe("Riot");
  act(() => vi.advanceTimersByTime(1100));
  expect(dialog().querySelector(".riotFace.is-hit")?.textContent).toContain("Granary sacked");
  act(() => vi.advanceTimersByTime(1000));
  expect(name()).toBe("Granary sacked");
  expect(lines()[0]).toBe("Food10→7");
  expect(lines().at(-1)).toMatch(/^Unrest tokens · happiness now .+→0$/);

  act(() => button("So be it").click());
  expect(dismissed).toHaveBeenCalled();
});

it("asks pops or cards on the rolled card, a line for each answer", () => {
  // Revolt spreads: two pops, and the seat holds two cards.
  const G = riot(2, ["caravan", "settlers"]);
  mount(reduceGameCommand(G, "0", { type: "resolveRiot" }));
  expect(dialog().querySelector(".riotChoice")?.textContent).toMatch(/2 pops to answer/i);
  expect(dialog().querySelector(".gc-name")?.textContent).toBe("Revolt spreads");

  act(() => button("Give up a card").click());
  expect(lines()).toEqual(["Held cards, given up for pops2→1"]);
  expect(dialog().querySelector(".riotChoice")?.textContent).toContain("1 in hand, 1 given up");

  act(() => button(/^Lose the slave/).click());
  expect(name()).toBe("Revolt spreads");
  expect(lines()[0]).toBe("Held cards, given up for pops2→1");
  expect(lines()[1]).toMatch(/^Slaves in .+\d→\d$/);
});
