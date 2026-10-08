// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createCommandEvents,
  createCommandMoves,
  reduceGameCommand,
} from "../client/commandAdapter";
import { openAssembly } from "../game/assembly";
import type { GameCommand } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
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

it("queues Damon's riot result, then the turn notice, before Nikos's event", () => {
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
  // As in the app: the screen stays with the last seat until the next one begins.
  let viewer: PlayerId = "0";
  function renderBoard() {
    root.render(
      <HegemonyBoard
        G={projectForPlayer(G.definition, structuredClone(G), viewer).state}
        ctx={{ phase: G.phase, currentPlayer: G.currentPlayer, turn: G.turn }}
        moves={moves}
        events={events}
        playerID={viewer}
        onPlayerIDChange={(next) => {
          viewer = next;
          renderBoard();
        }}
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

  // The turn notice names Nikos's turn; the fate card drawn for it waits behind it.
  expect(dialog().querySelector("h2")?.textContent).toBe("Nikos’s turn");
  expect(dialog().textContent).toContain("Pass the screen");
  expect(container.textContent).not.toContain("Shipment");
  act(() => button("Begin").click());
  expect(dialog().querySelector("h2")?.textContent).toBe("Shipment");
  expect(container.querySelector('[role="img"][aria-label="Nikos is acting."]')).not.toBeNull();
  vi.useRealTimers();
});

it("seats the Assembly in a modal that folds to a read-only dock and keeps a draw private", () => {
  const start = buildNewGame({
    seed: 42,
    mode: "standard",
    boardLayout: "classic",
    opening: "fixed",
    simRng: createSimRng(deriveBotSeed(42)),
  });
  let G = structuredClone(start);
  G.pendingPlayerEvent = null;
  G.year = 2;
  openAssembly(G, G.currentPlayer);
  G.players[G.currentPlayer].resources.influence = 5;
  const seat = G.currentPlayer;
  const dispatch = (command: GameCommand, actor?: PlayerId) => {
    G = reduceGameCommand(G, actor ?? G.currentPlayer, command);
    render(seat);
  };
  const moves = createCommandMoves(dispatch);
  const events = createCommandEvents(dispatch);
  function render(viewer: PlayerId) {
    root.render(
      <HegemonyBoard
        G={projectForPlayer(G.definition, structuredClone(G), viewer).state}
        ctx={{ phase: G.phase, currentPlayer: G.currentPlayer, turn: G.turn }}
        moves={moves}
        events={events}
        playerID={viewer}
        onPlayerIDChange={() => {}}
        isActive
        hotseat
      />,
    );
  }
  const button = (name: string | RegExp) =>
    [...container.querySelectorAll("button")].find((candidate) =>
      typeof name === "string"
        ? candidate.textContent === name || candidate.getAttribute("aria-label") === name
        : name.test(candidate.textContent ?? ""),
    )!;
  act(() => render(seat));

  expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe("The Assembly");
  // Behind the sitting the shell reads, and end turn says why it is locked.
  expect(container.querySelector(".endturn-label")?.textContent).toBe("In Assembly");

  act(() => button(/Minimise/).click());
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(container.querySelector(".sit-dock")).not.toBeNull();
  act(() => container.querySelector<HTMLButtonElement>(".sit-dock")!.click());
  expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe("The Assembly");

  act(() => button("Draw from Perdiccas").click());
  const drawn = G.assembly!.held[seat]!.card.name;
  expect(container.textContent).toContain(drawn);
  expect(container.textContent).toContain("Only you can see this card");
  // Another seat reads only that this one is still deciding.
  const rival = seat === "1" ? "2" : "1";
  act(() => render(rival));
  expect(container.textContent).not.toContain(drawn);
});
