// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { useMenuWindows } from "./windowState";
import type { MenuWindows } from "./windowState";

it("opens the first window at the top step and gives each further one the first free step", () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let windows!: MenuWindows;
  function Probe() {
    windows = useMenuWindows();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));

  // Whichever window opens first takes the prototype's spot, the top step.
  act(() => windows.show("costs"));
  act(() => windows.show("codex"));
  expect(windows.steps).toEqual({ costs: 0, codex: 1 });
  // Bringing one to the front keeps its step; a closed one frees its step.
  act(() => windows.show("costs"));
  act(() => windows.close("costs"));
  act(() => windows.show("plates"));
  expect(windows.steps).toEqual({ codex: 1, plates: 0 });
  act(() => root.unmount());
});
