import { afterEach, describe, expect, it } from "vitest";

import {
  getAuthoredGameContent,
  getBuildings,
  getExpeditionTables,
  getOmenTable,
  getPlayerEventCards,
  getRiotTable,
  getResolutionCards,
  getSeasonalEventCards,
  getTerrainDeck,
  installGameContent,
  setContentOverrides,
} from "../game/content";
import { BUILDINGS } from "../game/data";
import { mergeRulesetPatches } from "../game/ruleset";
import { applyBuildingOverrides, rulesetPatchFromOverrides } from "../dev/tuning";
import { createLowNumberContent } from "../dev/tuningPresets";

describe("sim content/tune patching", () => {
  // The content override is a module-global — never let one test leak into the next.
  afterEach(() => installGameContent(null));

  it("a buildings.* override changes the roster the engine reads, leaving the constant intact", () => {
    const villa = BUILDINGS.find((building) => building.id === "villa")!;
    const bumped = (villa.cost.wood ?? 0) + 50;

    setContentOverrides({
      buildings: applyBuildingOverrides(BUILDINGS, { "buildings.villa.cost.wood": bumped }),
    });

    expect(getBuildings().find((building) => building.id === "villa")!.cost.wood).toBe(bumped);
    // The authored table is untouched (the override clones).
    expect(BUILDINGS.find((building) => building.id === "villa")!.cost.wood).toBe(villa.cost.wood);
  });

  it("ruleset.* overrides become a patch that merges with a --ruleset-patch file", () => {
    expect(rulesetPatchFromOverrides({ "ruleset.civicCalm.happiness": 9 })).toEqual({
      civicCalm: { happiness: 9 },
    });
    // A buildings-only map yields no ruleset patch.
    expect(rulesetPatchFromOverrides({ "buildings.villa.cost.wood": 1 })).toBeNull();

    const merged = mergeRulesetPatches(
      { startingResources: { wood: 5 } },
      { civicCalm: { happiness: 9 } },
    );
    expect(merged).toEqual({ startingResources: { wood: 5 }, civicCalm: { happiness: 9 } });
    expect(mergeRulesetPatches(null, null)).toBeNull();
  });

  it("installs and clears every effective content family as one package", () => {
    const authored = getAuthoredGameContent();
    const preset = createLowNumberContent(authored);
    installGameContent(preset);

    expect(getBuildings()).toBe(preset.buildings);
    expect(getTerrainDeck()).toBe(preset.terrain);
    expect(getSeasonalEventCards()).toBe(preset.seasonalEvents);
    expect(getPlayerEventCards()).toBe(preset.playerEvents);
    expect(getRiotTable()).toBe(preset.riotTable);
    expect(getExpeditionTables()).toBe(preset.expeditionTables);
    expect(getOmenTable()).toBe(preset.omenTable);
    expect(getResolutionCards()).toBe(preset.resolutions);

    installGameContent(null);
    expect(getBuildings()).toBe(authored.buildings);
    expect(getPlayerEventCards()).toBe(authored.playerEvents);
    expect(getRiotTable()).toBe(authored.riotTable);
    expect(getResolutionCards()).toBe(authored.resolutions);
  });
});
