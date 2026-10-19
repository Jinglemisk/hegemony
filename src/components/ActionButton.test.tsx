// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ActionButton } from "./ActionButton";

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
  document.body.replaceChildren();
});

it("keeps a blocked act focusable, refuses the click and says why with its cost", () => {
  const onClick = vi.fn();
  act(() => {
    root.render(
      <ActionButton
        blockedReason="Requires 2 influence."
        effectiveCost={{ influence: 2 }}
        enabled={false}
        heading="Draw from Kleon"
        onClick={onClick}
      >
        Draw
      </ActionButton>,
    );
  });

  const button = container.querySelector("button")!;
  expect(button.disabled).toBe(false);
  expect(button.getAttribute("aria-disabled")).toBe("true");

  act(() => button.click());
  expect(onClick).not.toHaveBeenCalled();

  act(() => button.focus());
  const tooltip = document.body.querySelector<HTMLElement>("[role=tooltip]")!;
  expect(button.getAttribute("aria-describedby")).toBe(tooltip.id);
  expect(tooltip.textContent).toContain("Draw from Kleon");
  expect(tooltip.textContent).toContain("Requires 2 influence.");
  expect(tooltip.textContent).toContain("2 Influence");
});
