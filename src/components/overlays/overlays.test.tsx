// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MechanicsDetails } from "../MechanicsDetails";
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
    expect(tooltip.textContent).toContain("Not enough stone");
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

  it("uses the first touch to explain and the second touch to activate", () => {
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

    act(() => dispatchTouchPointerDown(button));
    act(() => button.click());

    expect(document.body.querySelector("[role=tooltip]")?.textContent).toContain(
      "Build a workshop",
    );
    expect(onAction).not.toHaveBeenCalled();

    act(() => dispatchTouchPointerDown(button));
    act(() => button.click());

    expect(onAction).toHaveBeenCalledOnce();
    expect(document.body.querySelector("[role=tooltip]")).toBeNull();
    expect(trigger.contains(button)).toBe(true);
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

function dispatchTouchPointerDown(target: Element) {
  const event = new Event("pointerdown", { bubbles: true });
  Object.defineProperty(event, "pointerType", { value: "touch" });
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
