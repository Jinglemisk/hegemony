import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  defaultValueAt,
  loadOverrides,
  loadTuningPresetId,
  resolveTuning,
  saveOverrides,
  saveTuningPresetId,
} from "./tuning";
import { GAME_MODES } from "../game/ruleset";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: memoryStorage() },
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("shared tuning resolution", () => {
  it("resolves mode, preset, explicit patch, then manual overrides", () => {
    const resolved = resolveTuning(
      GAME_MODES.standard.ruleset,
      "low-number-core-v1",
      {
        "ruleset.startingResources.wood": 11,
        "buildings.villa.cost.wood": 8,
      },
      { startingResources: { wood: 10 }, civicCalm: { goldCost: 4 } },
    );

    expect(resolved.ruleset.startingResources.wood).toBe(11);
    expect(resolved.ruleset.civicCalm.goldCost).toBe(4);
    expect(resolved.ruleset.actionCosts.foundColony.wood).toBe(9);
    expect(resolved.ruleset.economy.stockpileFloors).toEqual({
      wood: 0,
      stone: 0,
      gold: 0,
      influence: 0,
    });
    expect(resolved.content.buildings.find((building) => building.id === "villa")?.cost.wood).toBe(
      8,
    );
    expect(resolved.presetId).toBe("low-number-core-v1");
    expect(resolved.resolvedContentHash).toMatch(/^[0-9a-f]{8}$/);
    expect(resolved.manualPatchHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("produces stable hashes from fresh, equivalent content", () => {
    const first = resolveTuning(GAME_MODES.standard.ruleset, "low-number-core-v1");
    const second = resolveTuning(GAME_MODES.standard.ruleset, "low-number-core-v1");

    expect(first.content).not.toBe(second.content);
    expect(first.resolvedContentHash).toBe(second.resolvedContentHash);
  });

  it("uses the preset as the manual-edit default", () => {
    expect(defaultValueAt("ruleset.actionCosts.foundColony.wood", null)).toBe(20);
    expect(defaultValueAt("ruleset.actionCosts.foundColony.wood", "low-number-core-v1")).toBe(9);
    expect(defaultValueAt("buildings.villa.cost.wood", "low-number-core-v1")).toBe(6);
  });
});

describe("browser tuning persistence", () => {
  it("stores the preset separately from legacy manual overrides", () => {
    const overrides = { "ruleset.startingResources.wood": 12 };
    saveOverrides(overrides);
    saveTuningPresetId("low-number-core-v1");

    expect(loadOverrides()).toEqual(overrides);
    expect(loadTuningPresetId()).toBe("low-number-core-v1");

    saveTuningPresetId(null);
    expect(loadTuningPresetId()).toBeNull();
    expect(loadOverrides()).toEqual(overrides);
  });

  it("ignores stale or unknown stored preset IDs", () => {
    window.localStorage.setItem("hegemony-dev-tuning-preset-v1", "future-preset");
    expect(loadTuningPresetId()).toBeNull();
  });
});
