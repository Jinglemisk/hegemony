import { setContentOverrides } from "../game/content";
import {
  BUILDINGS,
  EXPEDITION_TABLES,
  OMEN_TABLE,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  SEASONAL_EVENT_CARDS,
  TERRAIN_DECK,
} from "../game/data";
import { deriveRuleset } from "../game/ruleset";
import type {
  BuildingDefinition,
  BuildingId,
  EventEffect,
  EventTableDefinition,
  Resource,
} from "../game/types";
import { POLITICIANS, RESOLUTION_CARDS } from "../game/assembly/deck";
import type { DirectiveEffect, LawEffect } from "../game/assembly/types";

/**
 * Experimental low-number economy used only by the reproducible balance study.
 * It is deliberately not registered as a live GAME_MODE: the study must earn that
 * decision first. Installing it mutates process-local content tables, so call it once
 * in a dedicated simulator process before creating any games.
 */

export const LOW_NUMBER_RULESET_PATCH = {
  startingResources: { wood: 9, stone: 5, gold: 4, food: 6, influence: 0, happiness: 0 },
  placementPopCounts: { capital: 2, city: 2, colony: 1 },
  settlements: {
    capital: { popCapacity: 5 },
    city: { popCapacity: 5 },
    colony: { popCapacity: 2 },
  },
  victory: {
    minimums: { pops: 8, citizens: 6, stockpile: 40, happiness: 10 },
  },
  actionCosts: {
    foundColony: { wood: 9, food: 1 },
    upgradeColonyToCity: { wood: 9, stone: 6, food: 3 },
  },
  growPopCosts: {
    slaves: { food: 3 },
    freemen: { food: 4 },
    citizens: { food: 5, gold: 1 },
  },
  popIncome: {
    citizens: { flat: { influence: 1, gold: 1, food: -1 }, primaryResource: 0 },
    freemen: { flat: { gold: 1, food: -1 }, primaryResource: 0 },
    slaves: { flat: { food: -1, happiness: -0.5 }, primaryResource: 1 },
  },
  economy: {
    foodStockpileHappinessDivisor: 3,
    foodStockpileHappinessCap: 1,
    unrest: { foodDeficitThreshold: -1 },
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
  ventureStakes: { gold: { gold: 2 }, wood: { wood: 3 } },
  assembly: {
    lawCap: 4,
    drawCost: 1,
    redrawCost: 1,
    repealCost: 2,
    briberyCost: 3,
    vetoCost: 2,
  },
} satisfies Parameters<typeof deriveRuleset>[1];

const BUILDING_COSTS: Record<BuildingId, BuildingDefinition["cost"]> = {
  marketplace: { wood: 6 },
  temple: { stone: 5 },
  workshop: { wood: 6 },
  granary: { wood: 6, stone: 2 },
  forum: { wood: 4, stone: 4 },
  aqueduct: { stone: 7 },
  odeon: { wood: 2, stone: 5 },
  villa: { wood: 6, gold: 2 },
  gymnasion: { wood: 2, stone: 7 },
};

export const LOW_NUMBER_BUILDINGS: BuildingDefinition[] = structuredClone(BUILDINGS).map(
  (building) => ({
    ...building,
    cost: BUILDING_COSTS[building.id],
    maxLevel:
      building.id === "granary"
        ? 2
        : building.id === "aqueduct" || building.id === "villa"
          ? 1
          : building.maxLevel,
    effects: building.effects.map((effect) => {
      switch (effect.type) {
        case "freemanGoldBonus":
        case "citizenInfluenceBonus":
        case "slavePrimaryResourceBonus":
          return { ...effect, amount: 1, supportedPops: 1 };
        case "popCapacityBonus":
          return { ...effect, amount: 2 };
        default:
          return "amount" in effect ? { ...effect, amount: 1 } : effect;
      }
    }),
  }),
);

/** Preserve every terrain rank and yield/slot trade-off while capping land at 1–3. */
export const LOW_NUMBER_TERRAIN_DECK: typeof TERRAIN_DECK = TERRAIN_DECK.map((tile) => {
  if (!tile.resource) return structuredClone(tile);

  const amount = tile.resource.amount;
  const compressed =
    tile.resource.type === "wood"
      ? amount <= 2
        ? 1
        : 2
      : tile.resource.type === "stone"
        ? amount <= 3
          ? 1
          : amount <= 4
            ? 2
            : 3
        : amount <= 2
          ? 1
          : amount <= 8
            ? 2
            : 3;

  return { ...tile, resource: { ...tile.resource, amount: compressed } };
});

function scaledMagnitude(value: number, divisor: number): number {
  if (value === 0) return 0;
  return Math.sign(value) * Math.max(1, Math.round(Math.abs(value) / divisor));
}

function isTrack(resource: Resource) {
  return resource === "happiness";
}

/** Resource denominations move about 3:1; happiness moves 2:1; one pop stays atomic. */
function scaleEventEffect(effect: EventEffect): EventEffect {
  const copy = structuredClone(effect);

  switch (copy.type) {
    case "resourceDelta":
      copy.amount = scaledMagnitude(copy.amount, isTrack(copy.resource) ? 2 : 3);
      break;
    case "scaledResourceDelta":
      copy.amountPerPops = scaledMagnitude(copy.amountPerPops, 2);
      copy.popStep = Math.max(1, Math.ceil(copy.popStep / 2));
      copy.minimum = scaledMagnitude(copy.minimum, 2);
      break;
    case "happinessDelta":
      copy.amount = scaledMagnitude(copy.amount, 2);
      break;
    case "scaledHappinessDelta":
      copy.amountPerPops = scaledMagnitude(copy.amountPerPops, 2);
      copy.popStep = Math.max(1, Math.ceil(copy.popStep / 2));
      copy.minimumMagnitude = Math.max(1, Math.round(copy.minimumMagnitude / 2));
      break;
    case "timedHappinessDelta":
      copy.amountPerTurn = scaledMagnitude(copy.amountPerTurn, 2);
      break;
    case "incomeModifier":
      copy.amount = scaledMagnitude(copy.amount, isTrack(copy.resource) ? 2 : 3);
      break;
    case "addPops":
      copy.amount = Math.max(1, Math.ceil(copy.amount / 2));
      break;
    case "actionCostDiscount":
      copy.amount = scaledMagnitude(copy.amount, 3);
      break;
    case "resourceExchange":
      copy.maxAmount = Math.max(1, Math.round(copy.maxAmount / 2));
      break;
    case "resourceDeltaPerPop":
      copy.minimum = Math.max(1, Math.round(copy.minimum / 2));
      break;
    case "choice":
      copy.options = copy.options.map((option) => option.map(scaleEventEffect));
      break;
    case "buildingCostMultiplier":
      break;
  }

  return copy;
}

function scaleTable(table: EventTableDefinition) {
  for (const row of table.rows) {
    for (const effect of row.effects) {
      if (effect.type === "gainResource" || effect.type === "loseResource") {
        effect.amount = scaledMagnitude(effect.amount, isTrack(effect.resource) ? 2 : 3);
      } else if (effect.type === "gainPop") {
        effect.foodFallback = Math.max(1, Math.round(effect.foodFallback / 2));
      }
      // Year omens stay at their indivisible ±1. Pop/building losses also stay atomic.
    }
  }

  for (const option of table.insurance ?? []) {
    for (const [resource, amount] of Object.entries(option.cost) as Array<[Resource, number]>) {
      option.cost[resource] = scaledMagnitude(amount, isTrack(resource) ? 2 : 3);
    }
  }
}

function scaleLawEffect(effect: LawEffect): LawEffect {
  const copy = structuredClone(effect);

  switch (copy.type) {
    case "actionCostDelta":
      copy.amount = scaledMagnitude(copy.amount, 3);
      break;
    case "settlementIncome":
    case "popIncome":
      if (copy.step) copy.step = Math.max(1, Math.ceil(copy.step / 2));
      break;
    case "thresholdHappiness":
      copy.threshold = Math.max(1, Math.round(copy.threshold / 3));
      copy.atOrAbove = scaledMagnitude(copy.atOrAbove, 2);
      copy.below = scaledMagnitude(copy.below, 2);
      break;
    case "surplusConversion":
      copy.above = Math.max(1, Math.round(copy.above / 3));
      break;
    case "onFoundColony":
      if (copy.happiness) copy.happiness = scaledMagnitude(copy.happiness, 2);
      break;
    case "flatIncome":
    case "popPrimaryIncome":
    case "actionCostMultiplier":
    case "bankRateStep":
    case "yearlyFreeAction":
      break;
  }

  return copy;
}

function scaleDirectiveEffect(effect: DirectiveEffect): DirectiveEffect {
  const copy = structuredClone(effect);
  if (copy.type === "resourceDelta") {
    copy.amount = scaledMagnitude(copy.amount, isTrack(copy.resource) ? 2 : 3);
  }
  return copy;
}

let installed = false;

export function installLowNumberContent() {
  if (installed) return;
  installed = true;

  setContentOverrides({ buildings: LOW_NUMBER_BUILDINGS, terrain: LOW_NUMBER_TERRAIN_DECK });

  for (const card of [...SEASONAL_EVENT_CARDS, ...PLAYER_EVENT_CARDS]) {
    card.effects = card.effects.map(scaleEventEffect);
  }

  // A free pop is twice as large after population compression. Keep deck size fixed
  // by moving those copies into the matching paid-grow coupons.
  const counts: Record<string, number> = {
    "player-new-citizen": 2,
    "player-free-settlers": 2,
    "player-captured-laborers": 2,
    "player-citizenship-rolls": 6,
    "player-willing-hands": 6,
    "player-slave-auction": 4,
  };
  for (const card of PLAYER_EVENT_CARDS) {
    if (counts[card.id] !== undefined) card.count = counts[card.id];
  }

  scaleTable(RIOT_TABLE);
  for (const table of EXPEDITION_TABLES) scaleTable(table);
  // OMEN_TABLE is intentionally passed through: ±1 is the indivisible world shock.
  scaleTable(OMEN_TABLE);

  for (const card of RESOLUTION_CARDS) {
    if (card.kind === "law") {
      card.effects = card.effects.map(scaleLawEffect);
    } else {
      card.effects = card.effects.map(scaleDirectiveEffect);
    }
  }
  for (const politician of POLITICIANS) {
    politician.patronBuff.effects = politician.patronBuff.effects.map(scaleLawEffect);
  }
}
