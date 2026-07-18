import { describe, expect, it } from "vitest";

import { owned, scenario } from "../testing/scenario";
import { calculateEconomyProjection, previewBuildingIncomeDelta, previewGrowPopIncomeDelta } from "./preview";

/**
 * Guards the "UI never duplicates formulas" invariant (ladder rung R7).
 *
 * The UI used to carry its own copy of these sums so it could show a benefit on a
 * button the player could not yet afford. The copy called `popIncome` without a
 * ruleset, so it silently read DEFAULT_RULESET — meaning under any patched
 * ruleset the screen and the payout disagreed. These tests pin both previews to
 * the engine's own income path, under a patched ruleset specifically.
 */

const FIRST_CITY = "-2,0";

describe("income previews come from the engine", () => {
  it("a grown pop's preview equals the income it actually produces", () => {
    const G = scenario().opening().build();
    const before = calculateEconomyProjection(G, "0", { resolveTransfers: true }).income;

    const predicted = previewGrowPopIncomeDelta(G, "0", FIRST_CITY, "freemen");

    // Apply the same change by hand and measure what income really does.
    const actual = structuredClone(G);
    owned(actual, FIRST_CITY, "0").pops.freemen += 1;
    const after = calculateEconomyProjection(actual, "0", { resolveTransfers: true }).income;

    expect(predicted.gold).toBe(after.gold - before.gold);
    expect(predicted.food).toBe(after.food - before.food);
  });

  it("tracks a PATCHED ruleset — the drift the old UI copy could not see", () => {
    // Double what a freeman earns. The old UI helper read DEFAULT_RULESET and
    // would have kept reporting the unpatched number.
    const G = scenario({ patch: { popIncome: { freemen: { flat: { gold: 4 } } } } }).opening().build();

    expect(G.ruleset.popIncome.freemen.flat.gold).toBe(4);
    expect(previewGrowPopIncomeDelta(G, "0", FIRST_CITY, "freemen").gold).toBe(4);
  });

  it("a building's preview equals the income it actually produces", () => {
    const G = scenario().opening().build();
    const before = calculateEconomyProjection(G, "0", { resolveTransfers: true }).income;

    const predicted = previewBuildingIncomeDelta(G, "0", FIRST_CITY, "granary");

    const actual = structuredClone(G);
    owned(actual, FIRST_CITY, "0").buildings.push("granary");
    const after = calculateEconomyProjection(actual, "0", { resolveTransfers: true }).income;

    expect(predicted.food).toBe(after.food - before.food);
  });

  it("answers even when the action is unaffordable — the whole reason it exists", () => {
    const G = scenario().opening().build();
    // Strip the treasury bare: the player could never pay for this.
    G.players["0"].resources = { wood: 0, stone: 0, gold: 0, food: 0, influence: 0, happiness: 0 };

    // A Granary still yields its food; the preview must say so on a dead button.
    expect(previewBuildingIncomeDelta(G, "0", FIRST_CITY, "granary").food).toBeGreaterThan(0);
  });

  it("is zero for a tile the player does not hold", () => {
    const G = scenario().opening().build();
    const empty = G.board.tiles.find((tile) => tile.settlements.length === 0)!;

    expect(previewGrowPopIncomeDelta(G, "0", empty.id, "citizens").gold).toBe(0);
  });

  it("does not mutate the state it previews", () => {
    const G = scenario().opening().build();
    const snapshot = JSON.stringify(G);

    previewGrowPopIncomeDelta(G, "0", FIRST_CITY, "citizens");
    previewBuildingIncomeDelta(G, "0", FIRST_CITY, "temple");

    expect(JSON.stringify(G)).toBe(snapshot);
  });
});
