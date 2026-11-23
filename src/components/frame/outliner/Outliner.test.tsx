// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCommandEvents, reduceGameCommand } from "../../../client/commandAdapter";
import type { GameMoves } from "../../../client/controller";
import { projectForPlayer } from "../../../game/projection";
import { luxuryName } from "../../../game/rules";
import type { Deal } from "../../../game/types";
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

/** Let a focus hand-off scheduled for after the render (focusSoon) land. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

it("keeps every outliner header's words through folds and a tuck, and asks before the Dole spends", async () => {
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
  // Tucked, it folds up to its head: the same title and knobs, the body gone. The knob
  // that tucks it brings it back, and keeps the focus both ways.
  const tuck = button("Tuck the outliner away");
  tuck.focus();
  act(() => tuck.click());
  expect(container.querySelector(".rd-outl")?.classList.contains("is-tucked")).toBe(true);
  expect(container.querySelector(".rd-outl-body")).toBeNull();
  expect(container.querySelector(".rd-outl-title")?.textContent).toBe("Outliner");
  expect(button("Show the outliner")).toBe(tuck);
  expect(document.activeElement).toBe(tuck);
  act(() => button("Show the outliner").click());
  expect(heads()).toEqual(before);
  expect(document.activeElement).toBe(button("Tuck the outliner away"));

  // The Dole names its price from the engine, and spends only on yes.
  const dole = [...container.querySelectorAll<HTMLButtonElement>(".rd-act")].find((el) =>
    el.textContent?.startsWith("The Dole"),
  )!;
  act(() => dole.click());
  expect(sent).toEqual([]);
  const confirm = container.querySelector('[role="alertdialog"]')!;
  expect(confirm.textContent).toContain("This will cost 3 influence: Food 10→11, Influence 9→6.");
  act(() => button("Buy food").click());
  expect(sent).toEqual(["dole"]);
});

it("names two deals with one seat by their terms, marks a lent good and counts pops on the way", async () => {
  let G = buildNewGame({
    seed: 42,
    mode: "standard",
    boardLayout: "scenario",
    opening: "fixed",
    simRng: createSimRng(deriveBotSeed(42)),
  });
  G = reduceGameCommand(G, "0", { type: "resolveEvent" });
  G = structuredClone(G);
  const good = G.board.luxuries[0]!;
  good.owner = "0";
  const deal = (id: string, yearly: Deal["yearly"], loans: Deal["loans"] = []): Deal => ({
    id,
    seats: ["0", "1"],
    yearly,
    loans,
    madeYear: G.year,
    endsYear: null,
    short: {},
  });
  G.deals = [
    deal("d1", { "0": { stone: 3 }, "1": { food: 2 } }),
    deal("d2", { "1": { gold: 1 } }, [
      { assetId: good.id, borrower: "1", length: "standing", turn: null },
    ]),
  ];
  const home = G.board.tiles.find((tile) => tile.settlements.some((s) => s.owner === "0"))!;
  const place = home.settlements.find((s) => s.owner === "0")!;
  G.transfers = [
    {
      id: "t1",
      owner: "0",
      fromSettlementId: place.id,
      toSettlementId: place.id,
      fromTileId: home.id,
      toTileId: home.id,
      pops: { citizens: 0, freemen: 0, slaves: 1 },
    },
  ];
  act(() =>
    root.render(
      <HegemonyBoard
        G={projectForPlayer(G.definition, G, "0").state}
        ctx={{ phase: G.phase, currentPlayer: G.currentPlayer, turn: G.turn }}
        events={createCommandEvents(() => {})}
        hotseat
        isActive
        moves={{} as GameMoves}
        onPlayerIDChange={() => {}}
        playerID="0"
      />,
    ),
  );
  const rows = [...container.querySelectorAll(".rd-row")].map((row) =>
    row.getAttribute("aria-label"),
  );

  // Two deals with Nikos: each named by its terms, the seat's side first.
  expect(rows).toContain("Deal with Nikos: 3 stone for 2 food, yearly");
  expect(rows).toContain(`Deal with Nikos: ${luxuryName(G, good)} for 1 gold, yearly`);
  // The good lent to Nikos reads as lent, not as held by its owner.
  expect(rows.find((name) => name?.startsWith(luxuryName(G, good)))).toMatch(/lent to Nikos/);
  // The slave on its way in shows beside the place's count.
  expect(rows.find((name) => name?.includes("1 arriving next turn"))).toBeTruthy();
  expect(container.querySelector(".rd-row-coming")?.textContent).toContain("(+1)");
  // The top bar's room counts it the same way: in its place next turn, at sea now.
  const room = container.querySelector(".bar-cell.room")!;
  expect(room.textContent).toContain("(+1)");
  expect(room.getAttribute("aria-label")).toMatch(/1 more at sea$/);

  // A place's name is in capitals by the stylesheet only; read, it is "Sikyon".
  const placeRow = container.querySelector<HTMLButtonElement>(".rd-row-name.is-place")!;
  expect(placeRow.textContent).toMatch(/^[A-Z][a-z]+$/);
  // Opened from the keyboard, the focus follows into the place (LeftShell moves it).
  act(() => {
    const row = placeRow.closest("button")!;
    row.focus();
    row.click();
  });
  await settle();
  expect(container.querySelector(".pp")?.contains(document.activeElement)).toBe(true);
});
