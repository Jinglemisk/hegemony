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
  presentYearCard,
} from "../ui/effects";

const LOW_NUMBER_CONTENT = createLowNumberContent(getAuthoredGameContent());
const LOW_NUMBER_BUILDINGS = LOW_NUMBER_CONTENT.buildings;

describe("low-number economy study invariants", () => {
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
    const gold = start.gold;
    const setupPops =
      LOW_NUMBER_RULESET_PATCH.placementPopCounts.capital +
      LOW_NUMBER_RULESET_PATCH.placementPopCounts.colony;
    expect(gold).toBeLessThan(LOW_NUMBER_RULESET_PATCH.victory.minimums.gold);
    expect(setupPops).toBeLessThan(LOW_NUMBER_RULESET_PATCH.victory.minimums.pops);
    expect(setupPops).toBeLessThan(LOW_NUMBER_RULESET_PATCH.victory.minimums.citizens);
  });

  it("leaves the terrain deck and the building roster alone and locks deck counts", () => {
    expect(LOW_NUMBER_CONTENT.terrain).toEqual(getAuthoredGameContent().terrain);
    expect(LOW_NUMBER_BUILDINGS).toEqual(getAuthoredGameContent().buildings);

    const copies = LOW_NUMBER_CONTENT.playerEvents.reduce((sum, card) => sum + card.count, 0);
    const harmful = LOW_NUMBER_CONTENT.playerEvents
      .filter((card) => presentEventEffects(card.effects).tone === "negative")
      .reduce((sum, card) => sum + card.count, 0);
    expect(copies).toBe(40);
    expect(harmful).toBe(12);
  });

  it("keeps v2 Assembly prices, prizes and content as authored", () => {
    const ruleset = deriveRuleset(DEFAULT_RULESET, LOW_NUMBER_RULESET_PATCH);
    expect(ruleset.assembly).toEqual(DEFAULT_RULESET.assembly);
    expect(LOW_NUMBER_CONTENT.resolutions).toEqual(RESOLUTION_CARDS);
    expect(ruleset.victory.minimums.voice).toBe(3);
    expect(POLITICIANS.find((p) => p.id === "stratokles")?.kind).toBe("directive");
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
    expect(first.yearCards).toEqual(authored.yearCards);
  });

  it("keeps every effective effect on the canonical presentation path", () => {
    for (const building of LOW_NUMBER_CONTENT.buildings) {
      for (const effect of building.effects)
        expect(presentBuildingEffect(effect).text).not.toBe("");
    }
    for (const card of LOW_NUMBER_CONTENT.yearCards) {
      expect(presentYearCard(card).text).not.toBe("");
    }
    for (const card of LOW_NUMBER_CONTENT.playerEvents) {
      expect(presentEventEffects(card.effects).text).not.toBe("");
    }
    for (const card of LOW_NUMBER_CONTENT.resolutions) {
      if (card.kind === "law") {
        for (const effect of card.effects) expect(presentLawEffect(effect).text).not.toBe("");
      } else {
        for (const effect of card.effects) expect(presentDirectiveEffect(effect).text).not.toBe("");
      }
    }
    for (const table of [LOW_NUMBER_CONTENT.riotTable, ...LOW_NUMBER_CONTENT.expeditionTables]) {
      for (const row of table.rows) {
        for (const effect of row.effects) expect(presentTableEffect(effect).text).not.toBe("");
      }
    }
  });

  it("leaves the new small player deck and ventures as authored", () => {
    expect(LOW_NUMBER_CONTENT.playerEvents).toEqual(getAuthoredGameContent().playerEvents);
    expect(LOW_NUMBER_CONTENT.expeditionTables).toEqual(getAuthoredGameContent().expeditionTables);
  });
});
