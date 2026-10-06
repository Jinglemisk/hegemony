// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createCommandEvents,
  createCommandMoves,
  reduceGameCommand,
} from "../client/commandAdapter";
import type { GameCommand } from "../game/legalMoves";
import type { PlayerId } from "../game/types";
import { createSimRng, deriveBotSeed } from "../sim/rng";
import { buildNewGame } from "../sim/setup";
import { HegemonyBoard } from "./HegemonyBoard";

// The island's SVG measurements need a browser; this test exercises the dialogs.
vi.mock("./frame/island/Island", () => ({ Island: () => null }));

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

it("queues Damon's riot result, then the pass-the-seat cover, before Nikos's event", () => {
  vi.useFakeTimers();
  let G = buildNewGame({
    seed: 42,
    mode: "standard",
    boardLayout: "classic",
    opening: "fixed",
    simRng: createSimRng(deriveBotSeed(42)),
  });
  expect(G.pendingPlayerEvent?.card.name).toBe("Local Unrest");
  G = reduceGameCommand(G, "0", { type: "resolveEvent" });
  G = reduceGameCommand(G, "0", { type: "endTurn" });
  expect(G.pendingRiot?.playerID).toBe("0");

  const dispatch = (command: GameCommand, actor?: PlayerId) => {
    G = reduceGameCommand(G, actor ?? G.currentPlayer, command);
    renderBoard();
  };
  const moves = createCommandMoves(dispatch);
  const events = createCommandEvents(dispatch);
  function renderBoard() {
    root.render(
      <HegemonyBoard
        G={G}
        ctx={{ phase: G.phase, currentPlayer: G.currentPlayer, turn: G.turn }}
        moves={moves}
        events={events}
        playerID={G.currentPlayer}
        onPlayerIDChange={() => {}}
        isActive
        hotseat
      />,
    );
  }
  act(renderBoard);
  const dialog = () => container.querySelector<HTMLElement>('[role="dialog"]')!;
  const button = (name: string) =>
    [...dialog().querySelectorAll("button")].find((candidate) => candidate.textContent === name)!;

  expect(dialog().querySelector("h2")?.textContent).toBe("Riot");
  act(() => button("Roll the Die").click());

  expect(G.currentPlayer).toBe("1");
  expect(G.pendingPlayerEvent?.card.name).toBe("Shipment");
  // The die lands on the sheet, then the result card says what it cost.
  expect(dialog().querySelector("h2")?.textContent).toBe("Riot");
  act(() => vi.advanceTimersByTime(2000));
  expect(dialog().querySelector("h2")?.textContent).toBe("Bribe demanded");
  expect(dialog().textContent).toContain("Lost 3 gold.");
  expect(dialog().textContent).toContain("Then: Nikos’s turn");
  act(() => button("Endure It").click());

  // Nikos's turn is private: it waits behind the cover, and his fate card behind that.
  expect(dialog().querySelector("h1")?.textContent).toBe("Nikos’s seat");
  expect(container.textContent).not.toContain("Shipment");
  act(() => button("I am Nikos · show my seat").click());
  expect(dialog().querySelector("h2")?.textContent).toBe("Shipment");
  expect(container.querySelector('[role="img"][aria-label="Nikos is acting."]')).not.toBeNull();
  vi.useRealTimers();
});
