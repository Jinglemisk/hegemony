// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAssembly, RESOLUTION_CARDS } from "../../../game/assembly";
import { scenario } from "../../../game/testing/scenario";
import type { GameUi } from "../GameUiContext";
import { GameUiProvider } from "../GameUiProvider";
import { AssemblyBema } from "./AssemblyBema";
import { AssemblyFoot, type AssemblyMenu } from "./AssemblyFoot";
import { AssemblyAction, ResolutionDetails } from "./AssemblyPresentation";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 640 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 480 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains("sharedTooltip")) return domRect(0, 0, 260, 160);
    if (this.classList.contains("sharedPopover")) return domRect(0, 0, 320, 180);
    return domRect(120, 180, 100, 30);
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Assembly explanations", () => {
  it("keeps a blocked action button-semantic, focusable, and mechanically described", () => {
    const onClick = vi.fn();
    act(() => {
      root.render(
        <AssemblyAction
          blockedReason="Requires 3 influence."
          className="bemaVeto"
          effectiveCost={{ influence: 3 }}
          enabled={false}
          explanation="Strike this resolution outright."
          heading="Veto"
          onClick={onClick}
        >
          Veto
        </AssemblyAction>,
      );
    });

    const button = container.querySelector<HTMLButtonElement>("button")!;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("title")).toBe(false);

    act(() => button.focus());

    const tooltip = document.body.querySelector<HTMLElement>("[role=tooltip]")!;
    expect(tooltip.textContent).toContain("Veto");
    expect(tooltip.textContent).toContain("Effective cost");
    expect(tooltip.textContent).toContain("Influence");
    expect(tooltip.textContent).toContain("Blocked");
    expect(tooltip.textContent).toContain("Requires 3 influence");
    expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);

    act(() => button.click());
    expect(onClick).not.toHaveBeenCalled();

    act(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(document.body.querySelector("[role=tooltip]")).toBeNull();
  });

  it("uses the first emulated touch to explain and the second to activate", () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    act(() => {
      root.render(
        <AssemblyAction
          className="mb yea"
          enabled
          explanation="Cast your votes in favor."
          heading="Vote Yea"
          onClick={onClick}
        >
          Yea
        </AssemblyAction>,
      );
    });

    const button = container.querySelector<HTMLButtonElement>("button")!;
    act(() => dispatchTouchPointerEvent(button, "pointerdown"));
    act(() => vi.advanceTimersByTime(10));
    act(() => button.click());

    expect(document.body.querySelector("[role=tooltip]")?.textContent).toContain("Vote Yea");
    expect(onClick).not.toHaveBeenCalled();

    act(() => dispatchTouchPointerEvent(button, "pointerdown"));
    act(() => button.click());

    expect(onClick).toHaveBeenCalledOnce();
    expect(document.body.querySelector("[role=tooltip]")).toBeNull();
  });

  it("renders canonical Law and Directive presentations as non-interactive details", () => {
    const law = RESOLUTION_CARDS.find((card) => card.kind === "law")!;
    const directive = RESOLUTION_CARDS.find((card) => card.kind === "directive")!;

    act(() => {
      root.render(
        <>
          <ResolutionDetails card={law} duration="Until repealed" source="Assembly" />
          <ResolutionDetails card={directive} duration="Resolves once" source="Assembly" />
        </>,
      );
    });

    expect(container.textContent).toContain(law.name);
    expect(container.textContent).toContain("Political trade-off");
    expect(container.textContent).toContain(directive.name);
    expect(container.querySelectorAll('[aria-label="Effects"]')).toHaveLength(2);
    expect(container.querySelector("button")).toBeNull();
  });
});

describe("Assembly pickers", () => {
  it("opens the repeal picker as a labelled dialog and restores keyboard focus on Escape", () => {
    const G = scenario().build();
    G.players["0"].resources.influence = 20;
    G.activeLaws.push({ cardId: "grain-dole", author: "0", enactedSeason: G.season, order: 0 });
    openAssembly(G, "0");
    const proposeRepeal = vi.fn();
    const value = {
      G,
      viewerId: "0",
      moves: {
        assemblyPass: vi.fn(),
        assemblyProposeRepeal: proposeRepeal,
      },
    } as unknown as GameUi;

    act(() => {
      root.render(
        <GameUiProvider value={value}>
          <FootHarness value={value} />
        </GameUiProvider>,
      );
    });

    const opener = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Repeal"),
    )!;
    act(() => {
      opener.focus();
      opener.click();
    });

    const dialog = document.body.querySelector<HTMLElement>("[role=dialog]")!;
    expect(dialog.getAttribute("aria-label")).toBe("Choose a standing Law to repeal");
    const choices = dialog.querySelector<HTMLUListElement>(
      'ul[aria-label="Standing Laws available to repeal"]',
    )!;
    const choice = choices.querySelector<HTMLButtonElement>("button")!;
    expect(dialog.querySelector('[role="menu"]')).toBeNull();
    expect(dialog.querySelector('[role="menuitem"]')).toBeNull();
    expect(choice.textContent).toContain("Grain Dole");
    expect(choice.tabIndex).toBe(0);
    expect(document.activeElement).toBe(dialog);

    act(() => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));

    expect(document.body.querySelector("[role=dialog]")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(proposeRepeal).not.toHaveBeenCalled();
  });

  it("uses a labelled native-button list for a full-board replacement", () => {
    const G = scenario().build();
    const laws = RESOLUTION_CARDS.filter((card) => card.kind === "law");
    const standing = laws.slice(0, G.ruleset.assembly.lawCap);
    const candidate = laws[G.ruleset.assembly.lawCap];
    standing.forEach((card, index) => {
      G.activeLaws.push({
        cardId: card.id,
        author: "0",
        enactedSeason: G.season,
        order: index,
      });
    });
    openAssembly(G, "0");
    G.assembly!.held["0"] = { card: candidate, draws: 1 };
    const propose = vi.fn();
    const value = {
      G,
      viewerId: "0",
      moves: {
        assemblyDiscardHeld: vi.fn(),
        assemblyPropose: propose,
      },
    } as unknown as GameUi;

    act(() => {
      root.render(
        <GameUiProvider value={value}>
          <AssemblyBema G={G} session={G.assembly!} />
        </GameUiProvider>,
      );
    });

    const opener = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Propose"),
    )!;
    act(() => {
      opener.focus();
      opener.click();
    });

    const dialog = document.body.querySelector<HTMLElement>("[role=dialog]")!;
    const choices = dialog.querySelector<HTMLUListElement>(
      'ul[aria-label="Standing Laws available for replacement"]',
    )!;
    const buttons = [...choices.querySelectorAll<HTMLButtonElement>("button")];
    const houseItem = G.assembly!.houseItem;
    const houseReservation = houseItem?.kind === "enact" ? houseItem.replaces : undefined;
    expect(dialog.querySelector('[role="menu"]')).toBeNull();
    expect(dialog.querySelector('[role="menuitem"]')).toBeNull();
    expect(houseReservation).toBeTruthy();
    expect(buttons).toHaveLength(G.ruleset.assembly.lawCap - 1);
    expect(buttons.map((button) => button.textContent)).not.toContain(
      RESOLUTION_CARDS.find((card) => card.id === houseReservation)?.name,
    );
    expect(buttons.every((button) => button.tabIndex === 0)).toBe(true);
    expect(document.activeElement).toBe(dialog);
    expect(propose).not.toHaveBeenCalled();
  });

  it("requires a labelled rival choice before sealing a Directive", () => {
    const G = scenario().build();
    const directive = RESOLUTION_CARDS.find((card) => card.kind === "directive")!;
    openAssembly(G, "0");
    G.assembly!.held["0"] = { card: directive, draws: 1 };
    const propose = vi.fn();
    const value = {
      G,
      viewerId: "0",
      moves: {
        assemblyDiscardHeld: vi.fn(),
        assemblyPropose: propose,
      },
    } as unknown as GameUi;

    act(() => {
      root.render(
        <GameUiProvider value={value}>
          <AssemblyBema G={G} session={G.assembly!} />
        </GameUiProvider>,
      );
    });

    const opener = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Choose rival"),
    )!;
    act(() => opener.click());

    const dialog = document.body.querySelector<HTMLElement>("[role=dialog]")!;
    expect(dialog.getAttribute("aria-label")).toContain("Choose the rival targeted by");
    const choices = dialog.querySelector<HTMLUListElement>(
      'ul[aria-label="Rivals available as Directive targets"]',
    )!;
    const buttons = [...choices.querySelectorAll<HTMLButtonElement>("button")];
    expect(buttons).toHaveLength(3);
    expect(buttons.some((button) => button.textContent?.includes("Damon"))).toBe(false);

    const rival = buttons.find((button) => button.textContent?.includes("Nikos"))!;
    act(() => rival.click());
    expect(propose).toHaveBeenCalledWith("0", undefined, "1");
  });
});

function FootHarness({ value }: { value: GameUi }) {
  const [menu, setMenu] = useState<AssemblyMenu>(null);
  return <AssemblyFoot G={value.G} menu={menu} onMenu={setMenu} session={value.G.assembly!} />;
}

function dispatchTouchPointerEvent(target: Element, type: "pointerdown") {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "pointerType", { value: "touch" });
  Object.defineProperty(event, "pointerId", { value: 1 });
  target.dispatchEvent(event);
}

function domRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  };
}

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
