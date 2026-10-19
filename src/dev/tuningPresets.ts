import type { GameContent } from "../game/content";
import type { RulesetPatch } from "../game/ruleset";
import type { EventTableDefinition, Resource, Stat } from "../game/types";

export type TuningPresetId = "low-number-core-v1";

export type TuningPreset = {
  id: TuningPresetId;
  label: string;
  rulesetPatch: RulesetPatch;
  createContent(base: GameContent): GameContent;
};

export const LOW_NUMBER_RULESET_PATCH = {
  startingResources: { wood: 9, stone: 5, gold: 4, food: 6, influence: 0 },
  placementPopCounts: { capital: 2, city: 2, colony: 1 },
  settlements: {
    capital: { popCapacity: 5 },
    city: { popCapacity: 5 },
    colony: { popCapacity: 2 },
  },
  victory: {
    cardsToWin: 3,
    minimums: { cities: 3, pops: 8, citizens: 6, gold: 15, happiness: 4, voice: 3 },
  },
  actionCosts: {
    foundColony: { wood: 9, food: 1 },
    upgradeColonyToCity: { wood: 9, stone: 6 },
  },
  growPopCosts: {
    slaves: { food: 3 },
    freemen: { food: 4 },
  },
  popIncome: {
    citizens: { flat: { influence: 1, food: -1 }, primaryResource: 0 },
    freemen: { flat: { gold: 1, food: -1 }, primaryResource: 0 },
    slaves: { flat: {}, primaryResource: 1 },
  },
  economy: {
    stockpileFloors: { wood: 0, stone: 0, gold: 0, influence: 0 },
    bank: {
      baseline: { sell: 2, buy: 2 },
      abundant: { sell: 3, buy: 2 },
      scarce: { sell: 2, buy: 3 },
    },
  },
  civicCalm: { happiness: 2, influenceCost: 2, goldCost: 3 },
  ladder: {
    promoteCosts: { slaves: { food: 2 }, freemen: { gold: 2 } },
    demoteCosts: { citizens: { influence: 1 }, freemen: { influence: 2 } },
  },
} satisfies RulesetPatch;

function scaledMagnitude(value: number, divisor: number): number {
  if (value === 0) return 0;
  return Math.sign(value) * Math.max(1, Math.round(Math.abs(value) / divisor));
}

function isHappiness(resource: Stat) {
  return resource === "happiness";
}

function scaleTable(table: EventTableDefinition): void {
  for (const row of table.rows) {
    for (const effect of row.effects) {
      if (effect.type === "gainResource" || effect.type === "loseResource") {
        effect.amount = scaledMagnitude(effect.amount, isHappiness(effect.resource) ? 2 : 3);
      } else if (effect.type === "gainPop") {
        effect.foodFallback = Math.max(1, Math.round(effect.foodFallback / 2));
      }
    }
  }

  for (const option of table.insurance ?? []) {
    for (const [resource, amount] of Object.entries(option.cost) as Array<[Resource, number]>) {
      option.cost[resource] = scaledMagnitude(amount, isHappiness(resource) ? 2 : 3);
    }
  }
}

export function createLowNumberContent(base: GameContent): GameContent {
  const content = structuredClone(base);

  // Buildings, player cards, ventures and the year deck stay as authored: v2's roster is already single
  // digits, and a year card carries no number to scale.
  // Step 8 Laws, Directives and sitting prices remain as authored.

  scaleTable(content.riotTable);

  return content;
}

export const TUNING_PRESETS: Record<TuningPresetId, TuningPreset> = {
  "low-number-core-v1": {
    id: "low-number-core-v1",
    label: "Low Numbers",
    rulesetPatch: LOW_NUMBER_RULESET_PATCH,
    createContent: createLowNumberContent,
  },
};

export function getTuningPreset(id: TuningPresetId | null): TuningPreset | null {
  return id ? TUNING_PRESETS[id] : null;
}

export function isTuningPresetId(value: unknown): value is TuningPresetId {
  return typeof value === "string" && Object.hasOwn(TUNING_PRESETS, value);
}
