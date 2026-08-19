// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scenario } from "../../../game/testing/scenario";
import type { BuildingId, HegemonyState } from "../../../game/types";
import type { GameUi } from "../GameUiContext";
import { GameUiProvider } from "../GameUiProvider";
import { getOwnedHoldings } from "../helpers";
import type { OwnedHolding } from "../types";
import { BuildingsTab } from "./BuildingsTab";
import { CitiesTab } from "./CitiesTab";
import { slotsOf } from "./slots";

/**
 * The two doors onto raising a building must not disagree about the same one.
 *
 * The Build page reads the decision building-first — one card per building with
 * its places under it. The Cities page's socket picker reads it settlement-first
 * — one settlement with its buildings under it. A player who is told `AIGAI ·
 * SHORT BY 9 WOOD` on one and something else on the other is entitled to believe
 * the game disagrees with itself, and would be right.
 *
 * They share `buildRefusal`, so the wording cannot drift. What CAN drift is what
 * each hands it: the open-slot count and which settlement's price the shortfall
 * was measured against. Both were restated by hand on one side or the other
 * before, which is exactly the shape of bug that reaches a player as two numbers
 * that cannot both be true. So this reads the refusals off the RENDERED DOM of
 * both pages rather than off the helper they share — a unit test of the wording
 * would pass straight through the defect.
 *
 * One city, on purpose. With two, the Build card honestly prices its row from
 * the first willing settlement while the picker prices the one you opened it on,
 * and a difference there is a design decision rather than a fault. With one,
 * every difference is a fault.
 */

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

function uiFor(G: HegemonyState, isActive = true): GameUi {
  return { G, viewerId: "0", phase: "gameplay", isActive } as unknown as GameUi;
}

/** The scripted opening gives a seat one city and one colony. Only the city has
 *  ground, so it is the only place the two pages can contradict each other. */
function onlyCity(G: HegemonyState): OwnedHolding {
  const city = getOwnedHoldings(G, "0").find(({ settlement }) => settlement.kind !== "colony");

  if (!city) throw new Error("the opening left the seat without a city");

  return city;
}

/** Every "<Building> in <PLACE>: <reason>." the page is currently saying. */
function refusalsOnScreen(): Map<string, string> {
  const spoken = new Map<string, string>();

  for (const button of document.querySelectorAll<HTMLElement>(".bcardTarget, .socketOption")) {
    const label = button.getAttribute("aria-label") ?? "";
    const said = /^(.+?): (.+)\.$/.exec(label);

    if (said) spoken.set(said[1], said[2]);
  }

  return spoken;
}

function buildPage(G: HegemonyState) {
  act(() =>
    root.render(
      <GameUiProvider value={uiFor(G)}>
        <BuildingsTab holdings={getOwnedHoldings(G, "0")} onBuildBuildingRequest={() => {}} />
      </GameUiProvider>,
    ),
  );

  return refusalsOnScreen();
}

/** The Cities page with every socket pressed — the picker's rows only exist once
 *  a gap is opened, so the page has to be driven, not just rendered. */
function citiesPageWithEverySocketOpen(G: HegemonyState) {
  act(() =>
    root.render(
      <GameUiProvider value={uiFor(G)}>
        <CitiesTab holdings={getOwnedHoldings(G, "0")} onBuildBuildingRequest={() => {}} />
      </GameUiProvider>,
    ),
  );

  const spoken = new Map<string, string>();

  for (const socket of container.querySelectorAll<HTMLButtonElement>(".socketAdd")) {
    act(() => socket.click());
    for (const [what, why] of refusalsOnScreen()) spoken.set(what, why);
    act(() => socket.click());
  }

  return spoken;
}

describe("the socket picker and the Build page", () => {
  it("refuse the same building in the same place for the same stated reason", () => {
    // Enough for a Temple and nothing else, so the run covers the refusals the
    // two pages can give — priced out, and a level already reached.
    const G = scenario()
      .opening()
      .withResources("0", { wood: 2, stone: 6, gold: 0, food: 4 })
      .build();
    const city = onlyCity(G);

    // Down to the LAST open slot. The count each page hands `buildRefusal` is
    // the thing most likely to drift — it was restated by hand on the Cities
    // side — and it only changes a word at the boundary, so the boundary is
    // where the two pages have to be stood next to each other.
    const filler: BuildingId[] = ["marketplace", "temple", "workshop", "granary"];
    city.settlement.buildings = filler.slice(0, slotsOf(city, G.ruleset).slots - 1);
    expect(slotsOf(city, G.ruleset).open).toBe(1);

    const fromCities = citiesPageWithEverySocketOpen(G);
    const fromBuild = buildPage(G);

    expect(fromCities.size).toBeGreaterThan(0);

    const disagreements = [...fromCities]
      .filter(([what, why]) => fromBuild.has(what) && fromBuild.get(what) !== why)
      .map(([what, why]) => `${what} — cities: "${why}", build: "${fromBuild.get(what)}"`);

    expect(disagreements).toEqual([]);
    // The comparison is worthless if the pages never name the same thing.
    expect([...fromCities].filter(([what]) => fromBuild.has(what)).length).toBeGreaterThan(0);
  });

  it("says a settlement is out of slots rather than out of money once it is full", () => {
    const G = scenario().opening().withResources("0", "wealthy").build();
    const city = onlyCity(G);

    // Fill the ground. The picker must now stop offering it at all, and the
    // Build page must name the slot — not the price the player can plainly pay.
    city.settlement.buildings = ["marketplace", "temple", "workshop", "granary", "forum"];

    expect(citiesPageWithEverySocketOpen(G).size).toBe(0);
    expect([...buildPage(G).values()]).toContain("no slot");
  });

  it("says a turn that is not yours once, in the head, and not on all nine rows", () => {
    const G = scenario().opening().withResources("0", "wealthy").build();

    act(() =>
      root.render(
        <GameUiProvider value={uiFor(G, false)}>
          <CitiesTab holdings={getOwnedHoldings(G, "0")} onBuildBuildingRequest={() => {}} />
        </GameUiProvider>,
      ),
    );
    act(() => container.querySelector<HTMLButtonElement>(".socketAdd")!.click());

    const spoken = refusalsOnScreen();

    // Every control still carries the reason in its own accessible name — a
    // screen reader lands on one button at a time and cannot see the head.
    expect([...spoken.values()].every((why) => why === "not your turn")).toBe(true);
    expect(spoken.size).toBeGreaterThan(1);

    // But the page says it once. Nine identical lines of it is the noise the
    // head exists to spare, and the printed refusal is reserved for reasons that
    // differ from building to building.
    expect(document.querySelector(".socketPickerHead")?.textContent).toContain("not your turn");
    expect(document.querySelectorAll(".socketOptionBlocker")).toHaveLength(0);
  });
});
