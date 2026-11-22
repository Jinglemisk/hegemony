// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCommandEvents, reduceGameCommand } from "../../../client/commandAdapter";
import type { GameMoves } from "../../../client/controller";
import { projectForPlayer } from "../../../game/projection";
import { createSimRng, deriveBotSeed } from "../../../sim/rng";
import { buildNewGame } from "../../../sim/setup";
import { HegemonyBoard } from "../../HegemonyBoard";

// The map draws with WebGL, which jsdom lacks.
vi.mock("../map3d/LivingMap", () => ({ default: () => null }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage?.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("keeps every outliner header's words through folds and a tuck, and asks before the Dole spends", () => {
  let G = buildNewGame({
    seed: 42,
    mode: "standard",
    boardLayout: "scenario",
    opening: "fixed",
    simRng: createSimRng(deriveBotSeed(42)),
  });
  G = reduceGameCommand(G, "0", { type: "resolveEvent" });
  G = structuredClone(G);
  G.players["0"].resources.influence = 9;
  const sent: string[] = [];
  const moves = new Proxy({} as GameMoves, {
    get: (_, name: string) => () => sent.push(name),
  });
  act(() =>
    root.render(
      <HegemonyBoard
        G={projectForPlayer(G.definition, G, "0").state}
        ctx={{ phase: G.phase, currentPlayer: G.currentPlayer, turn: G.turn }}
        events={createCommandEvents(() => {})}
        hotseat
        isActive
        moves={moves}
        onPlayerIDChange={() => {}}
        playerID="0"
      />,
    ),
  );

  const heads = () =>
    [...container.querySelectorAll(".rd-outl-title, .rd-sec-head")].map((el) => el.textContent);
  const button = (name: string) =>
    [...container.querySelectorAll("button")].find(
      (el) => el.getAttribute("aria-label") === name || el.textContent === name,
    )!;
  const before = heads();
  expect(before).toEqual([
    "Outliner",
    "Your settlements2",
    "Tradeno offers",
    "The Assemblyin 1 turn",
  ]);

  // Each section folds under its own head, which keeps its words.
  for (const head of container.querySelectorAll<HTMLButtonElement>(".rd-sec-head")) {
    act(() => head.click());
    expect(head.getAttribute("aria-expanded")).toBe("false");
    expect(heads()).toEqual(before);
  }
  act(() => button("Tuck the outliner away").click());
  expect(container.querySelector(".rd-outl")).toBeNull();
  act(() => button("Show the outliner").click());
  expect(heads()).toEqual(before);

  // The Dole names its price from the engine, and spends only on yes.
  const dole = [...container.querySelectorAll<HTMLButtonElement>(".rd-act")].find((el) =>
    el.textContent?.startsWith("The Dole"),
  )!;
  act(() => dole.click());
  expect(sent).toEqual([]);
  const confirm = container.querySelector('[role="alertdialog"]')!;
  expect(confirm.textContent).toContain("This costs 3 influence for 1 food");
  act(() => button("Buy food").click());
  expect(sent).toEqual(["dole"]);
});
