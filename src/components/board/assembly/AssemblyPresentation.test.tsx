// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openAssembly, RESOLUTION_CARDS } from "../../../game/assembly";
import { getAuthoredGameContent } from "../../../game/content";
import { PLAYER_IDS } from "../../../game/data";
import { scenario } from "../../../game/testing/scenario";
import type { LawCard } from "../../../game/assembly";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import type { GameUi } from "../GameUiContext";
import { GameUiProvider } from "../GameUiProvider";
import { AssemblyFloor, ResolutionEffect } from "./AssemblyFloor";
import { AssemblyFoot, type AssemblyMenu } from "./AssemblyFoot";
import { AssemblyHead } from "./AssemblyHead";
import { AssemblySeats } from "./AssemblySeats";
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
          className="asmButton isYea"
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
          <ResolutionDetails
            card={law}
            content={getAuthoredGameContent()}
            duration="Until repealed"
            source="Assembly"
          />
          <ResolutionDetails
            card={directive}
            content={getAuthoredGameContent()}
            duration="Resolves once"
            source="Assembly"
          />
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
          <AssemblyFloor G={G} session={G.assembly!} />
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
          <AssemblyFloor G={G} session={G.assembly!} />
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

describe("The Assembly scene", () => {
  it("gives a law's trade-off two line-level clauses, with `but` inside the cost", () => {
    const law = RESOLUTION_CARDS.find(
      (card): card is LawCard => card.kind === "law" && card.text.includes(", but "),
    )!;

    act(() => root.render(<ResolutionEffect card={law} />));

    // Three INLINE spans in a narrow column was the bug: each wrapped across
    // several lines and their boxes nested at up to 100% overlap. Two block
    // clauses, and "but" riding inside the cost, is the fix — assert the shape,
    // because jsdom has no layout engine to assert the geometry.
    const clauses = container.querySelectorAll(".asmClause");
    expect(clauses).toHaveLength(2);
    expect(clauses[0].className).toContain("asmClauseGain");
    expect(clauses[1].className).toContain("asmClauseCost");
    expect(container.querySelector(".asmClauseBut")?.closest(".asmClauseCost")).toBe(clauses[1]);
    expect(container.textContent).toContain(law.text.split(", but ")[0]);
  });

  it("hands every seat an ostrakon during proposal — a blazon for spoken, a blank for deliberating", () => {
    const G = scenario().build();
    openAssembly(G, "0");
    G.assembly!.proposalDone["0"] = true;
    const value = { G, viewerId: "0", moves: {} } as unknown as GameUi;

    act(() => {
      root.render(
        <GameUiProvider value={value}>
          <AssemblySeats G={G} onTakeSeat={() => {}} session={G.assembly!} />
        </GameUiProvider>,
      );
    });

    expect(container.querySelectorAll(".asmSherd")).toHaveLength(PLAYER_IDS.length);
    expect(container.querySelector(".asmSherd.is-seat .asmSherdMark")?.textContent).toBe(
      PLAYER_GLAZES["0"].blazon,
    );
    expect(container.querySelectorAll(".asmSherd.is-blank")).toHaveLength(PLAYER_IDS.length - 1);
  });

  it("puts all four choices on the casting seat, bribe included", () => {
    const G = scenario().build();
    G.players["0"].resources.influence = 40;
    openAssembly(G, "0");
    const session = G.assembly!;
    session.phase = "voting";
    session.voteOrder = [...PLAYER_IDS];
    session.voteIndex = 0;
    session.ballot = session.houseItem ? [session.houseItem] : [];
    const value = { G, viewerId: "0", moves: {} } as unknown as GameUi;

    act(() => {
      root.render(
        <GameUiProvider value={value}>
          <AssemblySeats G={G} onTakeSeat={() => {}} session={session} />
        </GameUiProvider>,
      );
    });

    const casting = container.querySelector(".asmSeatCasting")!;
    const choices = [...casting.querySelectorAll("button")].map((b) => b.textContent ?? "");
    expect(choices).toHaveLength(4);
    expect(choices.some((label) => /^Yea/.test(label))).toBe(true);
    expect(choices.some((label) => /^Nay/.test(label))).toBe(true);
    expect(choices.some((label) => /^Veto/.test(label))).toBe(true);
    // Bribe used to live in a dock at the foot, one surface away from the vote
    // it buys. It belongs on the seat that is casting.
    expect(choices.some((label) => /^Bribe/.test(label))).toBe(true);
    expect(container.querySelector(".asmSeatCue")?.textContent).toContain("Casts now");
  });

  it("stands the laws in their own column, with the bare stelae and the monuments apart", () => {
    const G = scenario().build();
    const laws = RESOLUTION_CARDS.filter((card) => card.kind === "law").slice(0, 2);
    laws.forEach((card, index) => {
      G.activeLaws.push({ cardId: card.id, author: "0", enactedSeason: G.season, order: index });
    });
    const directive = RESOLUTION_CARDS.find((card) => card.kind === "directive")!;
    G.tallyMonuments.push({
      cardId: directive.id,
      author: "1",
      enactedSeason: G.season,
      order: 0,
    });
    openAssembly(G, "0");
    const value = { G, viewerId: "0", moves: {} } as unknown as GameUi;

    act(() => {
      root.render(
        <GameUiProvider value={value}>
          <AssemblyFloor G={G} session={G.assembly!} />
        </GameUiProvider>,
      );
    });

    const column = container.querySelector(".asmStanding")!;
    // Laws used to be scattered into per-politician stacks in the colonnade — a
    // different object in a different place. They stand together now.
    expect(column.querySelectorAll(".asmSlabTrigger")).toHaveLength(3);
    expect(column.querySelector(".asmStandingKey")?.textContent).toBe(
      `Standing laws · 2 of ${G.ruleset.assembly.lawCap}`,
    );
    expect(column.querySelector(".asmSlabBare")?.textContent).toContain("stand empty");
    // PAR-ASM-22: a monument is not a rule, and now says so in the markup AND in
    // a stylesheet — `.lawslabMonument` was emitted with no rule anywhere.
    expect(column.querySelectorAll(".lawslabMonument")).toHaveLength(1);
  });

  it("marks a station the house has left as done, not merely not-current", () => {
    const G = scenario().build();
    openAssembly(G, "0");
    G.assembly!.phase = "voting";

    act(() => root.render(<AssemblyHead G={G} session={G.assembly!} />));

    const stations = [...container.querySelectorAll(".asmStation")];
    expect(stations.map((s) => s.className.split(" ").pop())).toEqual([
      "is-done",
      "is-now",
      "is-ahead",
    ]);
    expect(stations[0].querySelector(".asmStationNum")?.textContent).toBe("\u2713");
    expect(container.querySelector(".asmTitle")?.textContent).toBe("The vote");
    expect(container.querySelector(".asmKicker")?.textContent).toBe(
      "\u0395\u039a\u039a\u039b\u0397\u03a3\u0399\u0391",
    );
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
