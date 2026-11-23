// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCommandEvents, reduceGameCommand } from "../../client/commandAdapter";
import type { GameMoves } from "../../client/controller";
import { enumerateLegalCommands } from "../../game/legalMoves";
import type { GameCommand } from "../../game/legalMoves";
import { projectForPlayer } from "../../game/projection";
import type { HegemonyState } from "../../game/types";
import { createSimRng, deriveBotSeed } from "../../sim/rng";
import { buildNewGame } from "../../sim/setup";
import { settlementNames } from "../../ui/settlementNames";
import { HegemonyBoard } from "../HegemonyBoard";
import { titleCase } from "./words";

// The map draws with WebGL, which jsdom lacks.
vi.mock("../frame/map3d/LivingMap", () => ({ default: () => null }));

/**
 * The verb fans used to be pinned to the engine: every legal move offered, nothing it
 * refuses. Their commands now live on the place panel and the dock, so the same
 * promise is pinned there: an act is live exactly when the engine has a legal
 * command for it at that place.
 */

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

function render(G: HegemonyState) {
  act(() =>
    root.render(
      <HegemonyBoard
        G={projectForPlayer(G.definition, G, "0").state}
        ctx={{ phase: G.phase, currentPlayer: G.currentPlayer, turn: G.turn }}
        events={createCommandEvents(() => {})}
        hotseat
        isActive
        moves={new Proxy({} as GameMoves, { get: () => () => {} })}
        onPlayerIDChange={() => {}}
        playerID="0"
      />,
    ),
  );
}

/** A button by the start of its accessible name; live unless aria-disabled. */
function live(scope: Element, label: string) {
  const button = [...scope.querySelectorAll("button")].find((el) =>
    (el.getAttribute("aria-label") ?? el.textContent ?? "").startsWith(label),
  );
  expect(button, label).toBeDefined();
  return button!.getAttribute("aria-disabled") !== "true";
}

it("offers an act on the place panel and the dock exactly when the engine would take it", () => {
  let G = buildNewGame({
    seed: 42,
    mode: "standard",
    boardLayout: "scenario",
    opening: "fixed",
    simRng: createSimRng(deriveBotSeed(42)),
  });
  G = structuredClone(reduceGameCommand(G, "0", { type: "resolveEvent" }));
  // Rich enough that the price is never the only refusal.
  Object.assign(G.players["0"].resources, { wood: 30, stone: 30, food: 30, gold: 30 });
  G.players["0"].resources.influence = 20;
  render(G);

  const legal = enumerateLegalCommands(G, "0");
  // Some acts are live and some refused, so both halves of the promise are tested.
  expect(legal.some((command) => command.type === "growPop")).toBe(true);
  expect(legal.some((command) => command.type === "upgradeColonyToCity")).toBe(false);
  const at = (type: GameCommand["type"], tileId: string) =>
    legal.some(
      (command) =>
        command.type === type &&
        (command.type === "movePops"
          ? command.sourceTileId
          : "tileId" in command && command.tileId) === tileId,
    );
  const names = settlementNames(G.board.tiles);
  const own = G.board.tiles.flatMap((tile) =>
    tile.settlements
      .filter((settlement) => settlement.owner === "0")
      .map((settlement) => ({ tile, settlement, name: titleCase(names.get(settlement.id)!) })),
  );

  // Each of the seat's places, picked from the outliner as the map would pick it.
  const rows = [
    ...container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Your settlements"] .rd-rows button',
    ),
  ];
  expect(rows).toHaveLength(own.length);
  for (const row of rows) {
    act(() => row.click());
    const panel = container.querySelector('[data-c="place"]')!;
    const { tile, settlement } = own.find((o) => o.name === panel.getAttribute("aria-label"))!;
    expect(live(panel, "Grow here"), `grow ${tile.id}`).toBe(at("growPop", tile.id));
    expect(live(panel, "Move a pop out"), `move ${tile.id}`).toBe(at("movePops", tile.id));
    if (settlement.kind === "colony")
      expect(live(panel, "Make it a city"), `upgrade ${tile.id}`).toBe(
        at("upgradeColonyToCity", tile.id),
      );
    else
      expect(live(panel, "Raise a building"), `build ${tile.id}`).toBe(
        at("buildBuilding", tile.id),
      );
  }

  const dock = container.querySelector(".rd-acts")!;
  const has = (type: GameCommand["type"]) => legal.some((command) => command.type === type);
  expect(live(dock, "Buy a card")).toBe(has("buyDevCard"));
  expect(live(dock, "The Dole")).toBe(has("dole"));
});
