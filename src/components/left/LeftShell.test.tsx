// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCommandEvents, reduceGameCommand } from "../../client/commandAdapter";
import type { GameMoves } from "../../client/controller";
import { getFoundColonyStatus } from "../../game/rules";
import type { HegemonyState } from "../../game/types";
import { createSimRng, deriveBotSeed } from "../../sim/rng";
import { buildNewGame } from "../../sim/setup";
import { GameUiContext } from "../board/GameUiContext";
import { ConfirmHost, ConfirmProvider } from "../chrome/Confirm";
import { useLeftDrawer } from "./drawerState";
import { LeftShell, type LeftActions } from "./LeftShell";
import type { PlaceSubject } from "./PlacePanel";

/**
 * The left window's logic: a site to found on is confirmed on its own place panel (the
 * map is never armed behind it, so no other tile can take the colony), Realm's tabs
 * move with the arrow keys, and closing a drawer gives focus back to its button.
 */

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

function game(): HegemonyState {
  const G = buildNewGame({
    seed: 42,
    mode: "standard",
    boardLayout: "scenario",
    opening: "fixed",
    simRng: createSimRng(deriveBotSeed(42)),
  });
  return structuredClone(reduceGameCommand(G, "0", { type: "resolveEvent" }));
}

const actions: LeftActions = {
  onFound: vi.fn(),
  onMoveOut: vi.fn(),
  onBuild: vi.fn(),
  onOpenHand: vi.fn(),
  onBuyCard: vi.fn(),
  onCompose: vi.fn(),
  onIdeasModal: vi.fn(),
};

function Harness({
  G,
  moves,
  start,
  blocked = null,
}: {
  G: HegemonyState;
  moves: GameMoves;
  start: PlaceSubject;
  blocked?: string | null;
}) {
  const [subject, setSubject] = useState<PlaceSubject>(start);
  const drawer = useLeftDrawer(subject, setSubject);
  return (
    <GameUiContext.Provider
      value={{
        G,
        viewerId: "0",
        viewer: G.players["0"],
        activeEffects: [],
        currentPlayerId: "0",
        phase: "gameplay",
        isActive: true,
        turnBlocked: blocked,
        humans: ["0"],
        moves,
        events: createCommandEvents(() => {}),
      }}
    >
      <ConfirmProvider>
        <LeftShell
          actions={actions}
          drawer={drawer}
          income={G.players["0"].resources}
          mapArmed={false}
          onPick={setSubject}
          placeable
          subject={subject}
        />
        <ConfirmHost />
      </ConfirmProvider>
    </GameUiContext.Provider>
  );
}

const button = (name: RegExp) => {
  const found = [...document.querySelectorAll<HTMLButtonElement>("button")].find((el) =>
    name.test(el.getAttribute("aria-label") ?? el.textContent ?? ""),
  );
  expect(found, String(name)).toBeDefined();
  return found!;
};

it("founds a colony on the picked land only, after the confirm bar", () => {
  const G = game();
  const site = G.board.tiles.find((tile) => getFoundColonyStatus(G, "0", tile.id).can)!;
  const foundColony = vi.fn();
  const moves = new Proxy({} as GameMoves, {
    get: (_, name) => (name === "foundColony" ? foundColony : () => {}),
  });
  act(() => root.render(<Harness G={G} moves={moves} start={{ kind: "tile", tileId: site.id }} />));

  act(() => button(/^Found a colony here/).click());
  // The Found pop opens beside the panel; the board's map is never armed for it.
  expect(document.querySelector(".pp-pop.is-found")).not.toBeNull();
  expect(actions.onFound).not.toHaveBeenCalled();

  act(() => button(/^Found it/).click());
  // Nothing is spent until the confirm bar is answered.
  expect(foundColony).not.toHaveBeenCalled();
  expect(document.querySelector(".ch-confirm")?.textContent).toMatch(/found a colony/);
  act(() =>
    [...document.querySelectorAll<HTMLButtonElement>(".ch-confirm button")].at(-1)!.click(),
  );
  expect(foundColony).toHaveBeenCalledWith(site.id, expect.any(String), expect.any(String));
});

it("moves between Realm's tabs with the arrow keys and returns focus on close", () => {
  const G = game();
  const moves = new Proxy({} as GameMoves, { get: () => () => {} });
  act(() => root.render(<Harness G={G} moves={moves} start={{ kind: "realm" }} />));

  act(() => button(/^Realm$/).click());
  const tabs = () => [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  expect(document.querySelector('[role="tabpanel"]')).not.toBeNull();

  act(() => {
    tabs()[0].focus();
    tabs()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    vi.runAllTimers();
  });
  expect(tabs()[1].getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(tabs()[1]);

  act(() => {
    button(/^Close Realm$/).click();
    vi.runAllTimers();
  });
  expect(document.querySelector(".lw-drawer")).toBeNull();
  expect(document.activeElement).toBe(button(/^Realm$/));
});

it("locks a place's open slots with the turn gate's reason, like its footer acts", () => {
  const G = game();
  const tile = G.board.tiles.find((candidate) =>
    candidate.settlements.some(
      (settlement) => settlement.owner === "0" && settlement.kind !== "colony",
    ),
  )!;
  const build = vi.fn();
  const moves = new Proxy({} as GameMoves, { get: () => build });
  act(() =>
    root.render(
      <Harness
        G={G}
        blocked="The Assembly is sitting."
        moves={moves}
        start={{ kind: "tile", tileId: tile.id }}
      />,
    ),
  );
  const slots = [...document.querySelectorAll<HTMLButtonElement>(".pp-slots button")];
  expect(slots.length).toBeGreaterThan(0);
  slots.forEach((slot, i) => {
    expect(slot.getAttribute("aria-disabled")).toBe("true");
    expect(slot.getAttribute("aria-label")).toMatch(
      new RegExp(`slot \\d+ of \\d+: The Assembly is sitting\\.$`),
    );
    act(() => slot.click());
    expect(document.querySelector(".pp-pop"), `slot ${i}`).toBeNull();
  });
});
