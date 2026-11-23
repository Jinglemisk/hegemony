// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lendFocus, trapTab } from "./focus";

/** A surface of buttons, appended to the body. */
function surface(...names: string[]) {
  const root = document.createElement("section");
  root.tabIndex = -1;
  for (const name of names) {
    const button = document.createElement("button");
    button.textContent = name;
    root.append(button);
  }
  document.body.append(root);
  return root;
}
const button = (name: string) =>
  [...document.querySelectorAll("button")].find((element) => element.textContent === name)!;
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

beforeEach(() => {
  // jsdom lays nothing out: every control counts as shown.
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
});
afterEach(() => {
  document.body.innerHTML = "";
  delete (HTMLElement.prototype as { offsetParent?: unknown }).offsetParent;
});

describe("Tab traps", () => {
  it("lets only the top-most trap act: a confirm over a sheet keeps its focus", () => {
    const sheet = surface("Draw", "Bribe");
    const confirm = surface("Cancel", "Yes");
    const untrapSheet = trapTab(sheet);
    const untrapConfirm = trapTab(confirm);

    button("Cancel").focus();
    expect(tab()).toBe(false);
    button("Yes").focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(button("Cancel"));

    // The confirm closes: the sheet's trap is the top one again.
    untrapConfirm();
    button("Bribe").focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(button("Draw"));
    untrapSheet();
  });

  it("counts a popover the dialog opened as inside it, and returns off its edge", () => {
    const dialog = surface("Pay", "Close");
    const popover = surface("Gold", "Grain");
    const untrap = trapTab(dialog);
    const unlend = lendFocus(popover, button("Pay"));

    button("Gold").focus();
    expect(tab()).toBe(false); // on to Grain, the browser's own move
    button("Grain").focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(button("Pay"));

    // Once it closes, focus found there is pulled back in.
    unlend();
    button("Gold").focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(button("Pay"));
    untrap();
  });
});
