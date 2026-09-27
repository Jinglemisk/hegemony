// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scenario } from "../../../game/testing/scenario";
import type { HegemonyState } from "../../../game/types";
import type { GameUi } from "../GameUiContext";
import { GameUiProvider } from "../GameUiProvider";
import { ConsultDrawer } from "./ConsultDrawer";
import { SeatHandoff } from "./SeatHandoff";
import { TurnDocket } from "./TurnDocket";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("turn handoff", () => {
  it("covers the next seat, switches the viewer, then reveals the digest", () => {
    const initial = playableGame();
    const onTakeSeat = vi.fn();

    act(() => root.render(<SeatHandoff G={initial} onTakeSeat={onTakeSeat} />));
    expect(container.querySelector("[role=dialog]")).toBeNull();

    const next = structuredClone(initial);
    next.currentPlayer = "1";
    act(() => root.render(<SeatHandoff G={next} onTakeSeat={onTakeSeat} />));

    expect(container.querySelector("[role=dialog]")?.getAttribute("aria-label")).toBe(
      "Pass the table to Nikos",
    );
    const takeSeat = buttonNamed("I am Nikos");
    act(() => takeSeat.click());

    expect(onTakeSeat).toHaveBeenCalledWith("1");
    expect(container.textContent).toContain("Since your last turn");
    expect(container.textContent).toContain("This is your first seat at the table");

    act(() => buttonNamed("Begin turn").click());
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });
});

describe("turn docket", () => {
  it("offers a labelled, single-click commit path beside the hold dial", () => {
    const G = playableGame();
    const onEndTurn = vi.fn();

    act(() =>
      root.render(
        <TurnDocket G={G} actingPlayerId={G.currentPlayer} canEndTurn onEndTurn={onEndTurn} />,
      ),
    );

    act(() => container.querySelector<HTMLButtonElement>(".turnDocketToggle")!.click());
    expect(container.querySelector('[aria-label="End-turn review"]')).not.toBeNull();
    expect(container.textContent).toContain("Next income");

    act(() => buttonNamed("End turn now").click());
    expect(onEndTurn).toHaveBeenCalledOnce();
  });
});

describe("consult drawer", () => {
  it("returns focus to the page trigger when its covering drawer closes", () => {
    const G = playableGame();
    const value = {
      G,
      viewerId: "0",
      viewer: G.players["0"],
      currentPlayerId: G.currentPlayer,
      phase: G.phase,
      isActive: true,
      hasPendingPlayerEvent: false,
      activeEffects: [],
      moves: {},
      events: {},
    } as unknown as GameUi;

    act(() =>
      root.render(
        <GameUiProvider value={value}>
          <DrawerHarness />
        </GameUiProvider>,
      ),
    );

    act(() => buttonNamed("Close ×").click());

    expect(document.activeElement?.textContent?.trim()).toBe("Agora");
    expect(container.querySelector('[aria-label="Agora drawer"]')).toBeNull();
  });
});

function playableGame(): HegemonyState {
  const G = scenario().opening().build();
  G.pendingPlayerEvent = null;
  return G;
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!button) throw new Error(`missing button ${name}`);
  return button;
}

function DrawerHarness() {
  const [open, setOpen] = useState(true);
  return (
    <ConsultDrawer
      activeTab="agora"
      isOpen={open}
      onClose={() => setOpen(false)}
      onSelectTab={() => undefined}
    />
  );
}
