import { describe, expect, it } from "vitest";

import {
  getAuthoredGameContent,
  getBuildings,
  getExpeditionTables,
  getPlayerEventCards,
  getRiotTable,
  getResolutionCards,
  getYearCards,
  getTerrainDeck,
} from "../game/content";
import { BUILDINGS } from "../game/data";
import { mergeRulesetPatches } from "../game/ruleset";
import { applyBuildingOverrides, rulesetPatchFromOverrides } from "../dev/tuning";
import { createLowNumberContent } from "../dev/tuningPresets";

describe("sim content/tune patching", () => {
  it("a buildings.* override changes the roster the engine reads, leaving the constant intact", () => {
    const estate = BUILDINGS.find((building) => building.id === "estate")!;
    const bumped = (estate.cost.wood ?? 0) + 50;

    const buildings = applyBuildingOverrides(BUILDINGS, {
      "buildings.estate.cost.wood": bumped,
    })!;

    expect(buildings.find((building) => building.id === "estate")!.cost.wood).toBe(bumped);
    // The authored table is untouched (the override clones).
    expect(BUILDINGS.find((building) => building.id === "estate")!.cost.wood).toBe(
      estate.cost.wood,
    );
  });

  it("ruleset.* overrides become a patch that merges with a --ruleset-patch file", () => {
    expect(rulesetPatchFromOverrides({ "ruleset.civicCalm.happiness": 9 })).toEqual({
      civicCalm: { happiness: 9 },
    });
    // A buildings-only map yields no ruleset patch.
    expect(rulesetPatchFromOverrides({ "buildings.estate.cost.wood": 1 })).toBeNull();

    const merged = mergeRulesetPatches(
      { startingResources: { wood: 5 } },
      { civicCalm: { happiness: 9 } },
    );
    expect(merged).toEqual({ startingResources: { wood: 5 }, civicCalm: { happiness: 9 } });
    expect(mergeRulesetPatches(null, null)).toBeNull();
  });

  it("selects every effective content family from the supplied package", () => {
    const authored = getAuthoredGameContent();
    const preset = createLowNumberContent(authored);
    expect(getBuildings(preset)).toBe(preset.buildings);
    expect(getTerrainDeck(preset)).toBe(preset.terrain);
    expect(getYearCards(preset)).toBe(preset.yearCards);
    expect(getPlayerEventCards(preset)).toBe(preset.playerEvents);
    expect(getRiotTable(preset)).toBe(preset.riotTable);
    expect(getExpeditionTables(preset)).toBe(preset.expeditionTables);
    expect(getResolutionCards(preset)).toBe(preset.resolutions);

    expect(getBuildings(authored)).toBe(authored.buildings);
    expect(getPlayerEventCards(authored)).toBe(authored.playerEvents);
    expect(getRiotTable(authored)).toBe(authored.riotTable);
    expect(getResolutionCards(authored)).toBe(authored.resolutions);
  });
});
