import { describe, expect, it } from "vitest";

import { LOW_NUMBER_RULESET_PATCH, createLowNumberContent } from "../dev/tuningPresets";
import { getAuthoredGameContent } from "../game/content";
import { DEFAULT_RULESET, deriveRuleset } from "../game/ruleset";
import { POLITICIANS, RESOLUTION_CARDS } from "../game/assembly/deck";
import {
  presentBuildingEffect,
  presentDirectiveEffect,
  presentEventEffects,
  presentLawEffect,
  presentTableEffect,
} from "../ui/effects";

const LOW_NUMBER_CONTENT = createLowNumberContent(getAuthoredGameContent());
const LOW_NUMBER_BUILDINGS = LOW_NUMBER_CONTENT.buildings;
const LOW_NUMBER_TERRAIN_DECK = LOW_NUMBER_CONTENT.terrain;

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

  it("locks the terrain totals, deck counts, and building copy limits", () => {
    const totals = LOW_NUMBER_TERRAIN_DECK.reduce(
      (sum, tile) => {
        if (tile.resource && tile.resource.type in sum) {
          sum[tile.resource.type as keyof typeof sum] += tile.resource.amount;
        }
        return sum;
      },
      { wood: 0, stone: 0, food: 0 },
    );
    expect(LOW_NUMBER_TERRAIN_DECK).toHaveLength(37);
    expect(totals).toEqual({ wood: 20, stone: 12, food: 16 });
    expect(
      Object.fromEntries(LOW_NUMBER_BUILDINGS.map((building) => [building.id, building.maxLevel])),
    ).toEqual({
      marketplace: 2,
      temple: 2,
      workshop: 2,
      granary: 2,
      forum: 2,
      aqueduct: 1,
      odeon: 2,
      villa: 1,
      gymnasion: 1,
      port: 1,
    });

    const copies = LOW_NUMBER_CONTENT.playerEvents.reduce((sum, card) => sum + card.count, 0);
    const harmful = LOW_NUMBER_CONTENT.playerEvents
      .filter((card) => presentEventEffects(card.effects).tone === "negative")
      .reduce((sum, card) => sum + card.count, 0);
    expect(copies).toBe(83);
    expect(harmful).toBe(21);
  });

  it("compresses Assembly prizes and resolution magnitudes without mutating authored content", () => {
    const resolutionsBefore = structuredClone(RESOLUTION_CARDS);
    const politiciansBefore = structuredClone(POLITICIANS);
    const ruleset = deriveRuleset(DEFAULT_RULESET, LOW_NUMBER_RULESET_PATCH);

    createLowNumberContent(getAuthoredGameContent());

    expect(ruleset.assembly).toMatchObject({
      lawCap: 6,
      drawCost: 1,
      redrawCost: 1,
      repealCost: 2,
      briberyCost: 3,
      vetoCost: 2,
      prizes: {
        demosthenes: { food: 2 },
        perdiccas: { stone: 2 },
        kleistophenes: { wood: 3 },
        stratokles: { happiness: 1 },
      },
    });
    expect(ruleset.victory.minimums.cities).toBe(3);
    expect(ruleset.victory.minimums.voice).toBe(3);
    const streets = LOW_NUMBER_CONTENT.resolutions.find((card) => card.id === "the-streets-burn")!;
    expect(streets.kind === "directive" && streets.effects[0]).toMatchObject({ amount: -2 });
    expect(streets.text).toContain("lose 2 happiness");
    const bread = LOW_NUMBER_CONTENT.resolutions.find((card) => card.id === "bread-and-circuses")!;
    expect(bread.kind === "directive" && bread.effects).toMatchObject([
      { amount: 2 },
      { amount: -2 },
    ]);
    expect(RESOLUTION_CARDS).toEqual(resolutionsBefore);
    expect(POLITICIANS).toEqual(politiciansBefore);
  });

  it("returns fresh packages and never mutates authored content", () => {
    const authored = getAuthoredGameContent();
    const authoredSnapshot = structuredClone(authored);
    const first = createLowNumberContent(authored);
    const second = createLowNumberContent(authored);

    expect(first).not.toBe(second);
    expect(first.buildings).not.toBe(second.buildings);
    expect(first.buildings[0].cost).not.toBe(second.buildings[0].cost);
    expect(first.riotTable.rows[0]).not.toBe(second.riotTable.rows[0]);
    expect(first.playerEvents).not.toBe(second.playerEvents);
    expect(first.resolutions).not.toBe(second.resolutions);
    expect(first).toEqual(second);
    expect(authored).toEqual(authoredSnapshot);
    expect(first.omenTable).toEqual(authored.omenTable);
  });

  it("keeps every effective effect on the canonical presentation path", () => {
    for (const building of LOW_NUMBER_CONTENT.buildings) {
      for (const effect of building.effects)
        expect(presentBuildingEffect(effect).text).not.toBe("");
    }
    for (const card of [...LOW_NUMBER_CONTENT.seasonalEvents, ...LOW_NUMBER_CONTENT.playerEvents]) {
      expect(presentEventEffects(card.effects).text).not.toBe("");
    }
    for (const card of LOW_NUMBER_CONTENT.resolutions) {
      if (card.kind === "law") {
        for (const effect of card.effects) expect(presentLawEffect(effect).text).not.toBe("");
      } else {
        for (const effect of card.effects) expect(presentDirectiveEffect(effect).text).not.toBe("");
      }
    }
    for (const table of [
      LOW_NUMBER_CONTENT.riotTable,
      ...LOW_NUMBER_CONTENT.expeditionTables,
      LOW_NUMBER_CONTENT.omenTable,
    ]) {
      for (const row of table.rows) {
        for (const effect of row.effects) expect(presentTableEffect(effect).text).not.toBe("");
      }
    }
  });

  it("rewrites numeric event prose to the same effective values", () => {
    const card = (id: string) =>
      LOW_NUMBER_CONTENT.playerEvents.find((candidate) => candidate.id === id)!.text;
    expect(card("player-warehouse-fire")).toContain("Lose 2 Wood");
    expect(card("player-caravan-contacts")).toContain("up to 2 Wood for 3 Gold");
    expect(card("player-civic-petition")).toBe("Gain 1 Influence, or gain 1 Happiness.");
    expect(
      LOW_NUMBER_CONTENT.seasonalEvents.find((event) => event.id === "season-plague")?.text,
    ).toContain("loses 1 Happiness");
  });

  it("keeps transformed resolution prose aligned with low-number mechanics", () => {
    const resolution = (id: string) =>
      LOW_NUMBER_CONTENT.resolutions.find((candidate) => candidate.id === id)!;

    expect(resolution("cult-of-demeter").text).toBe(
      "Hold 5 or more food for 1 happiness; fall below it and lose 1.",
    );
    expect(resolution("manumission-law").text).toContain("each slave costs 1 happiness");
    expect(resolution("rural-bloc").text).toContain("Every colony yields 1 influence");
  });
});
