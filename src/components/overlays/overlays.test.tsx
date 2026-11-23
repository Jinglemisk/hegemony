// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scenario } from "../../game/testing/scenario";
import { turnEndUnrest } from "../../game/unrest";
import { EndTurn } from "../frame/EndTurn";
import { MechanicsDetails } from "../MechanicsDetails";
import { ModalShell } from "../board/modals/ModalShell";
import { Popover } from "./Popover";
import { Tooltip } from "./Tooltip";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 240 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.classList.contains("sharedTooltip")) return domRect(0, 0, 180, 90);
    if (this.classList.contains("sharedPopover")) return domRect(0, 0, 220, 120);
    return domRect(285, 205, 24, 20);
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

describe("Tooltip", () => {
  it("keeps an unavailable control focusable, button-semantic, and described", () => {
    act(() => {
      root.render(
        <Tooltip content={<MechanicsDetails blockedReason="Not enough stone." heading="Build" />}>
          <button aria-disabled="true" type="button">
            Build
          </button>
        </Tooltip>,
      );
    });

    const trigger = container.querySelector<HTMLElement>(".tooltipTrigger")!;
    const button = container.querySelector<HTMLButtonElement>("button")!;
    expect(trigger.tabIndex).toBe(-1);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.tagName).toBe("BUTTON");

    act(() => button.focus());

    const tooltip = document.body.querySelector<HTMLElement>("[role=tooltip]")!;
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toContain("Blocked");
    expect(tooltip.textContent).toContain("Not enough Stone");
    expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(Number.parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(10);
    expect(Number.parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(10);
    expect(tooltip.classList).toContain("placement-above");
  });

  it("opens from keyboard focus and dismisses with Escape", () => {
    act(() => {
      root.render(
        <Tooltip content="Projected income details">
          <button type="button">Income</button>
        </Tooltip>,
      );
    });

    const button = container.querySelector("button")!;
    act(() => button.focus());
    expect(document.body.querySelector("[role=tooltip]")?.textContent).toContain(
      "Projected income",
    );

    act(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(document.body.querySelector("[role=tooltip]")).toBeNull();
  });

  it("takes one Escape for itself, leaving the layer under it open", () => {
    const onDismiss = vi.fn();
    act(() => {
      root.render(
        <Popover anchor={domRect(280, 205, 20, 20)} ariaLabel="Card" onDismiss={onDismiss}>
          <Tooltip content="Gold you hold">
            <button type="button">Gold</button>
          </Tooltip>
        </Popover>,
      );
    });
    const gold = document.body.querySelector<HTMLButtonElement>("[role=dialog] button")!;
    act(() => gold.focus());
    expect(document.body.querySelector("[role=tooltip]")).not.toBeNull();

    // Dispatched where the key lands: the focused control, bubbling to the window.
    act(() =>
      gold.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      ),
    );
    expect(document.body.querySelector("[role=tooltip]")).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();

    act(() =>
      gold.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      ),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("closes on a press and stays shut until the pointer leaves and comes back", () => {
    act(() => {
      root.render(
        <Tooltip content="Ideas">
          <button type="button">Ideas</button>
        </Tooltip>,
      );
    });
    const button = container.querySelector("button")!;
    const tip = () => document.body.querySelector("[role=tooltip]");
    const pointer = (type: string, relatedTarget: Element | null = null) =>
      act(() => {
        const event = new MouseEvent(type, { bubbles: true, relatedTarget });
        if (type === "pointerdown") Object.defineProperty(event, "pointerType", { value: "mouse" });
        button.dispatchEvent(event);
      });

    pointer("mouseover", document.body);
    expect(tip()).not.toBeNull();
    pointer("pointerdown");
    expect(tip()).toBeNull();
    // The drawer it opened hands the focus back by script: no tip over it.
    act(() => button.focus());
    expect(tip()).toBeNull();
    act(() => button.blur());

    act(() => {
      button.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
      );
    });
    pointer("mouseover", document.body);
    expect(tip()).not.toBeNull();
  });

  it("supports a block trigger without nesting block content inside a span", () => {
    act(() => {
      root.render(
        <Tooltip content="Standing Law details" focusable triggerAs="div">
          <div className="blockTooltipContent">
            <div>Grain Dole</div>
          </div>
        </Tooltip>,
      );
    });

    const trigger = container.querySelector<HTMLElement>(".tooltipTrigger")!;
    expect(trigger.tagName).toBe("DIV");
    expect(trigger.firstElementChild?.tagName).toBe("DIV");
    expect(trigger.querySelector("span > .blockTooltipContent")).toBeNull();

    act(() => trigger.focus());
    expect(document.body.querySelector("[role=tooltip]")?.textContent).toContain(
      "Standing Law details",
    );
  });

  it("uses the first touch to explain and the second touch to activate", () => {
    vi.useFakeTimers();
    const onAction = vi.fn();
    act(() => {
      root.render(
        <Tooltip content="Build a workshop">
          <button onClick={onAction} type="button">
            Build
          </button>
        </Tooltip>,
      );
    });

    const trigger = container.querySelector<HTMLElement>(".tooltipTrigger")!;
    const button = container.querySelector<HTMLButtonElement>("button")!;

    act(() => dispatchTouchPointerEvent(button, "pointerdown"));
    act(() => vi.runAllTimers());
    act(() => button.click());

    expect(document.body.querySelector("[role=tooltip]")?.textContent).toContain(
      "Build a workshop",
    );
    expect(onAction).not.toHaveBeenCalled();

    act(() => dispatchTouchPointerEvent(button, "pointerdown"));
    act(() => button.click());

    expect(onAction).toHaveBeenCalledOnce();
    expect(document.body.querySelector("[role=tooltip]")).toBeNull();
    expect(trigger.contains(button)).toBe(true);
  });

  it("clears touch suppression when the pointer is cancelled", () => {
    const onAction = vi.fn();
    act(() => {
      root.render(
        <Tooltip content="Build a workshop">
          <button onClick={onAction} type="button">
            Build
          </button>
        </Tooltip>,
      );
    });

    const button = container.querySelector<HTMLButtonElement>("button")!;
    act(() => dispatchTouchPointerEvent(button, "pointerdown"));
    expect(document.body.querySelector("[role=tooltip]")).not.toBeNull();

    act(() => dispatchTouchPointerEvent(button, "pointercancel"));
    expect(document.body.querySelector("[role=tooltip]")).toBeNull();

    act(() => button.click());
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("subscribes to viewport changes only while the tooltip is open", () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const removeListener = vi.spyOn(window, "removeEventListener");

    act(() => {
      root.render(
        <Tooltip content="Details">
          <button type="button">Inspect</button>
        </Tooltip>,
      );
    });

    expect(addListener.mock.calls.some(([type]) => type === "resize")).toBe(false);
    expect(addListener.mock.calls.some(([type]) => type === "scroll")).toBe(false);

    const button = container.querySelector<HTMLButtonElement>("button")!;
    act(() => button.focus());

    expect(addListener.mock.calls.some(([type]) => type === "resize")).toBe(true);
    expect(addListener.mock.calls.some(([type]) => type === "scroll")).toBe(true);

    act(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );

    expect(removeListener.mock.calls.some(([type]) => type === "resize")).toBe(true);
    expect(removeListener.mock.calls.some(([type]) => type === "scroll")).toBe(true);
  });
});

describe("Popover", () => {
  it("portals, flips, focuses, dismisses, and restores focus to its opener", () => {
    const onDismiss = vi.fn();
    const anchor = domRect(280, 205, 20, 20);

    act(() => {
      root.render(<PopoverHarness anchor={anchor} onDismiss={onDismiss} />);
    });

    const opener = container.querySelector<HTMLButtonElement>(".popoverOpener")!;
    act(() => {
      opener.focus();
      opener.click();
    });

    const dialog = document.body.querySelector<HTMLElement>("[role=dialog]")!;
    expect(dialog).not.toBeNull();
    expect(container.contains(dialog)).toBe(false);
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    expect(dialog.classList).toContain("placement-above");
    expect(Number.parseFloat(dialog.style.left)).toBeGreaterThanOrEqual(12);
    expect(Number.parseFloat(dialog.style.left) + 220).toBeLessThanOrEqual(320 - 12);
    expect(document.activeElement).toBe(dialog);

    act(() => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(document.body.querySelector("[role=dialog]")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe("A placed popover", () => {
  it("holds Tab: off its last control the focus comes round to its first", () => {
    vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(document.body);
    act(() => {
      root.render(
        <>
          <button type="button">Table</button>
          <Popover anchor={domRect(0, 0, 1, 1)} ariaLabel="Offer" centre onDismiss={() => {}}>
            <button type="button">Damon</button>
            <button type="button">Send</button>
          </Popover>
        </>,
      );
    });
    const [damon, send] = document.body.querySelectorAll<HTMLButtonElement>("[role=dialog] button");
    const tab = (shiftKey = false) => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      document.activeElement!.dispatchEvent(event);
      return event.defaultPrevented;
    };
    act(() => send!.focus());
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(damon);
    expect(tab(true)).toBe(true);
    expect(document.activeElement).toBe(send);
  });
});

describe("ModalShell", () => {
  it("makes the frame behind it inert, all but the overlay layer, until it closes", () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <main className="frame">
          <button type="button">Table</button>
          {open ? (
            <ModalShell label="Ideas" onDismiss={() => {}}>
              <button type="button">Buy</button>
            </ModalShell>
          ) : null}
          <div id="hud-overlays" />
        </main>
      );
    }
    act(() => root.render(<Harness open />));
    const table = container.querySelector<HTMLButtonElement>("button")!;
    expect(table.inert).toBe(true);
    expect(container.querySelector<HTMLElement>("#hud-overlays")!.inert).toBeFalsy();

    act(() => root.render(<Harness open={false} />));
    expect(table.inert).toBe(false);
  });
});

describe("End turn's confirm", () => {
  it.each([
    [-3, "Ending your turn starts a riot", "Riot at turn end", "Face the riot"],
    [-6, "Ending your turn now means revolt", "Revolt at turn end", "Revolt"],
  ] as const)(
    "opens at %s as a popover a press outside closes",
    (level, consequence, head, face) => {
      const G = scenario().opening().withHappiness("0", level).build();

      act(() => {
        root.render(
          <EndTurn
            actingId="0"
            canEndTurn
            confirmOpen
            onCalm={() => {}}
            onEndTurn={() => {}}
            ruleset={G.ruleset}
            title="Press and hold to end your turn."
            unrest={turnEndUnrest(G, "0")}
            warning={null}
          />,
        );
      });

      // The hold opens the confirm at the line, focused on the plain choice to face it.
      const dialog = document.body.querySelector<HTMLElement>("[role=dialog]")!;
      // Docked above the dock in its slot, its one-line head beside a close disc.
      expect(dialog.getAttribute("aria-label")).toBe(consequence);
      expect(dialog.classList).toContain("is-slot");
      expect(dialog.querySelector("h2")?.textContent).toBe(head);
      expect(dialog.querySelector('[aria-label="Close the warning"]')).not.toBeNull();
      expect(document.activeElement?.textContent).toBe(face);

      act(() => document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })));
      expect(document.body.querySelector("[role=dialog]")).toBeNull();
    },
  );
});

function PopoverHarness({ anchor, onDismiss }: { anchor: DOMRect; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="popoverOpener" onClick={() => setOpen(true)} type="button">
        Choose building
      </button>
      {open ? (
        <Popover
          anchor={anchor}
          ariaLabel="Choose a building"
          onDismiss={() => {
            onDismiss();
            setOpen(false);
          }}
        >
          <button type="button">Workshop</button>
        </Popover>
      ) : null}
    </>
  );
}

function dispatchTouchPointerEvent(target: Element, type: "pointerdown" | "pointercancel") {
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
