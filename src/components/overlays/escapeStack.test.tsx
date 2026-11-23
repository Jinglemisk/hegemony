// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ESCAPE, useEscapeLayer } from "./escapeStack";

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
  container.remove();
});

const escape = () =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

/** One surface on the escape stack: open until Escape closes it, then it says so. */
function Layer({ name, rank, closed }: { name: string; rank: number; closed: string[] }) {
  const [open, setOpen] = useState(true);
  useEscapeLayer(
    rank,
    () => {
      closed.push(name);
      setOpen(false);
    },
    open,
  );
  return null;
}

describe("the escape stack", () => {
  it("closes one surface a press, in the shell's order, whatever order they opened in", () => {
    const closed: string[] = [];
    const order: Array<[string, number]> = [
      ["place panel", ESCAPE.left],
      ["confirm", ESCAPE.confirm],
      ["menu window", ESCAPE.window],
      ["happiness card", ESCAPE.card],
      ["chronicle", ESCAPE.chronicle],
      ["grow pop", ESCAPE.pop],
      ["menu", ESCAPE.menu],
    ];
    act(() =>
      root.render(
        <>
          {order.map(([name, rank]) => (
            <Layer closed={closed} key={name} name={name} rank={rank} />
          ))}
        </>,
      ),
    );

    for (let press = 1; press <= order.length; press++) {
      escape();
      expect(closed).toHaveLength(press);
    }
    expect(closed).toEqual([
      "confirm",
      "grow pop",
      "happiness card",
      "menu",
      "chronicle",
      "menu window",
      "place panel",
    ]);
  });

  it("stops at a dialog: what opened before it waits, what opened over it closes first", () => {
    const closed: string[] = [];
    act(() => root.render(<Layer closed={closed} name="drawer" rank={ESCAPE.left} />));
    act(() =>
      root.render(
        <>
          <Layer closed={closed} name="drawer" rank={ESCAPE.left} />
          <Layer closed={closed} name="card picker" rank={ESCAPE.dialog} />
        </>,
      ),
    );
    act(() =>
      root.render(
        <>
          <Layer closed={closed} name="drawer" rank={ESCAPE.left} />
          <Layer closed={closed} name="card picker" rank={ESCAPE.dialog} />
          <Layer closed={closed} name="card over it" rank={ESCAPE.card} />
        </>,
      ),
    );

    escape();
    escape();
    expect(closed).toEqual(["card over it", "card picker"]);
    escape();
    expect(closed).toEqual(["card over it", "card picker", "drawer"]);
  });

  it("leaves a key a field has already used (a search clearing its words)", () => {
    const closed: string[] = [];
    act(() => root.render(<Layer closed={closed} name="codex" rank={ESCAPE.window} />));
    const typed = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    typed.preventDefault();
    act(() => {
      window.dispatchEvent(typed);
    });
    expect(closed).toEqual([]);
    escape();
    expect(closed).toEqual(["codex"]);
  });
});

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
