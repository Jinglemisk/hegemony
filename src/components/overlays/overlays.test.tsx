// @vitest-environment jsdom

import { act } from "react";
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
  it("makes a disabled control's reason focusable and described through a portal", () => {
    act(() => {
      root.render(
        <Tooltip
          ariaLabel="Build. Not enough stone."
          content={<MechanicsDetails blockedReason="Not enough stone." heading="Build" />}
          disabled
        >
          <button disabled type="button">
            Build
          </button>
        </Tooltip>,
      );
    });

    const trigger = container.querySelector<HTMLElement>(".tooltipTrigger")!;
    expect(trigger.tabIndex).toBe(0);
    expect(trigger.getAttribute("aria-label")).toContain("Not enough stone");

    act(() => trigger.focus());

    const tooltip = document.body.querySelector<HTMLElement>("[role=tooltip]")!;
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toContain("Blocked");
    expect(tooltip.textContent).toContain("Not enough stone");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(Number.parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(10);
    expect(Number.parseFloat(tooltip.style.top)).toBeGreaterThanOrEqual(10);
    expect(tooltip.classList).toContain("placement-above");
  });

  it("opens from keyboard focus, toggles for touch, and dismisses with Escape", () => {
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

    const trigger = container.querySelector<HTMLElement>(".tooltipTrigger")!;
    act(() => {
      const event = new Event("pointerdown", { bubbles: true });
      Object.defineProperty(event, "pointerType", { value: "touch" });
      trigger.dispatchEvent(event);
    });
    expect(document.body.querySelector("[role=tooltip]")).not.toBeNull();
  });
});

describe("Popover", () => {
  it("portals an interactive dialog, flips within bounds, focuses it, and handles Escape", () => {
    const onDismiss = vi.fn();
    const anchor = domRect(280, 205, 20, 20);

    act(() => {
      root.render(
        <Popover anchor={anchor} ariaLabel="Choose a building" onDismiss={onDismiss}>
          <button type="button">Workshop</button>
        </Popover>,
      );
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
  });
});

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
