import { describe, expect, it } from "vitest";

import {
  LOW_NUMBER_BUILDINGS,
  LOW_NUMBER_RULESET_PATCH,
  LOW_NUMBER_TERRAIN_DECK,
} from "./lowNumberEconomy";

describe("low-number economy study invariants", () => {
  it("keeps every printed tile yield in the 1–3 band", () => {
    const amounts = LOW_NUMBER_TERRAIN_DECK.flatMap((tile) =>
      tile.resource ? [tile.resource.amount] : [],
    );
    expect(Math.min(...amounts)).toBe(1);
    expect(Math.max(...amounts)).toBe(3);
  });

  it("provides 16 total food without increasing the three-food ceiling", () => {
    const food = LOW_NUMBER_TERRAIN_DECK.filter((tile) => tile.resource?.type === "food");
    expect(food.reduce((total, tile) => total + (tile.resource?.amount ?? 0), 0)).toBe(16);
    expect(food.map((tile) => tile.resource?.amount).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([
      1, 2, 2, 2, 2, 2, 2, 3,
    ]);
  });

  it("keeps every individual action and building cost below 10", () => {
    const amounts = [
      ...Object.values(LOW_NUMBER_RULESET_PATCH.actionCosts).flatMap((cost) => Object.values(cost)),
      ...Object.values(LOW_NUMBER_RULESET_PATCH.growPopCosts).flatMap((cost) =>
        Object.values(cost),
      ),
      ...LOW_NUMBER_BUILDINGS.flatMap((building) => Object.values(building.cost)),
    ];
    expect(Math.max(...amounts)).toBeLessThan(10);
  });

  it("starts below every compressed resource/pop victory minimum", () => {
    const start = LOW_NUMBER_RULESET_PATCH.startingResources;
    const stockpile = start.wood + start.stone + start.gold + start.food;
    const setupPops =
      LOW_NUMBER_RULESET_PATCH.placementPopCounts.capital +
      LOW_NUMBER_RULESET_PATCH.placementPopCounts.colony;
    expect(stockpile).toBeLessThan(LOW_NUMBER_RULESET_PATCH.victory.minimums.stockpile);
    expect(setupPops).toBeLessThan(LOW_NUMBER_RULESET_PATCH.victory.minimums.pops);
    expect(setupPops).toBeLessThan(LOW_NUMBER_RULESET_PATCH.victory.minimums.citizens);
  });
});
