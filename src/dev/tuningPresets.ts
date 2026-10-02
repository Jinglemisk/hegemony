import type { GameContent } from "../game/content";
import type { DirectiveEffect, LawEffect, ResolutionCard } from "../game/assembly/types";
import type { RulesetPatch } from "../game/ruleset";
import type { EventEffect, EventTableDefinition, Resource, Stat } from "../game/types";

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
  ventureStakes: { gold: { gold: 2 }, wood: { wood: 3 } },
  assembly: {
    prizes: {
      demosthenes: { food: 2 },
      perdiccas: { stone: 2 },
      kleistophenes: { wood: 3 },
      stratokles: { gold: 1 },
    },
    drawCost: 1,
    redrawCost: 1,
    repealCost: 2,
    briberyCost: 3,
    vetoCost: 2,
  },
} satisfies RulesetPatch;

function scaledMagnitude(value: number, divisor: number): number {
  if (value === 0) return 0;
  return Math.sign(value) * Math.max(1, Math.round(Math.abs(value) / divisor));
}

function isHappiness(resource: Stat) {
  return resource === "happiness";
}

function scaleEventEffect(effect: EventEffect): EventEffect {
  const copy = structuredClone(effect);

  switch (copy.type) {
    case "resourceDelta":
      copy.amount = scaledMagnitude(copy.amount, isHappiness(copy.resource) ? 2 : 3);
      break;
    case "happinessDelta":
      copy.amount = scaledMagnitude(copy.amount, 2);
      break;
    case "timedHappinessDelta":
      copy.amountPerTurn = scaledMagnitude(copy.amountPerTurn, 2);
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
  }

  return copy;
}

function scaleLawEffect(effect: LawEffect): LawEffect {
  const copy = structuredClone(effect);

  switch (copy.type) {
    case "actionCostDelta":
      copy.amount = scaledMagnitude(copy.amount, isHappiness(copy.resource) ? 2 : 3);
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
    copy.amount = scaledMagnitude(copy.amount, isHappiness(copy.resource) ? 2 : 3);
  }
  return copy;
}

function mechanicalNumbers(effect: LawEffect | DirectiveEffect): number[] {
  switch (effect.type) {
    case "settlementIncome":
    case "popIncome":
      return [effect.amount, ...(effect.step ? [effect.step] : [])];
    case "popPrimaryIncome":
    case "flatIncome":
      return [effect.amount];
    case "thresholdHappiness":
      return [effect.threshold, effect.atOrAbove, effect.below];
    case "surplusConversion":
      return [effect.above, effect.per, effect.amount];
    case "actionCostDelta":
      return [effect.amount];
    case "actionCostMultiplier":
      return [effect.multiplier];
    case "bankRateStep":
      return [effect.steps];
    case "onFoundColony":
      return effect.happiness ? [effect.happiness] : [];
    case "resourceDelta":
      return [effect.amount];
    case "resourceFraction":
      return [];
    case "losePopFromLargest":
      return [effect.count];
    case "suppressIncome":
      return [effect.turns];
    case "yearlyFreeAction":
    case "repealNewestTargetLaw":
    case "equalVotesNextAssembly":
      return [];
  }
}

function rewriteResolutionText(
  text: string,
  before: Array<LawEffect | DirectiveEffect>,
  after: Array<LawEffect | DirectiveEffect>,
): string {
  const replacements = new Map<number, number>();
  for (let effectIndex = 0; effectIndex < Math.min(before.length, after.length); effectIndex += 1) {
    const original = mechanicalNumbers(before[effectIndex]);
    const effective = mechanicalNumbers(after[effectIndex]);
    for (let index = 0; index < Math.min(original.length, effective.length); index += 1) {
      const from = Math.abs(original[index]);
      const to = Math.abs(effective[index]);
      if (from !== to && (!replacements.has(from) || replacements.get(from) === to)) {
        replacements.set(from, to);
      }
    }
  }

  let output = text;
  for (const [from, to] of replacements) {
    output = output.replace(new RegExp(`(?<![\\d.])${from}(?!\\d|\\.\\d)`, "g"), String(to));
  }
  return output
    .replace(/every 1 slaves cost/gi, "each slave costs")
    .replace(/every 1 colonies yield/gi, (phrase) =>
      phrase.startsWith("Every") ? "Every colony yields" : "every colony yields",
    );
}

function scaleResolution(card: ResolutionCard): ResolutionCard {
  const copy = structuredClone(card);
  const effects =
    copy.kind === "law" ? copy.effects.map(scaleLawEffect) : copy.effects.map(scaleDirectiveEffect);
  return {
    ...copy,
    text: rewriteResolutionText(copy.text, copy.effects, effects),
    effects,
  } as ResolutionCard;
}

function eventTextNumbers(effect: EventEffect): number[] {
  switch (effect.type) {
    case "resourceDelta":
    case "happinessDelta":
    case "actionCostDiscount":
      return [effect.amount];
    case "timedHappinessDelta":
      return [effect.amountPerTurn, effect.turns];
    case "addPops":
      return [effect.amount];
    case "resourceExchange":
      return [effect.maxAmount, Math.floor(effect.maxAmount * effect.ratio)];
    case "resourceDeltaPerPop":
      return [effect.amountPerPop, effect.minimum];
    case "choice":
      return effect.options.flatMap((option) => option.flatMap(eventTextNumbers));
  }
}

/** Authored event prose contains the same mechanical numbers as its typed effects.
 *  Rewrite those occurrences in order so flavor remains intact without contradicting
 *  the canonical effective rows rendered beside it. */
function rewriteEventText(text: string, before: EventEffect[], after: EventEffect[]): string {
  const original = before.flatMap(eventTextNumbers);
  const effective = after.flatMap(eventTextNumbers);
  let output = text;
  let from = 0;

  for (let index = 0; index < Math.min(original.length, effective.length); index += 1) {
    const magnitude = String(Math.abs(original[index])).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`[+-]?${magnitude}(?![\\d.])`, "g");
    pattern.lastIndex = from;
    const match = pattern.exec(output);
    if (!match) continue;
    if (original[index] === effective[index]) {
      from = match.index + match[0].length;
      continue;
    }
    const sign = match[0].startsWith("-") ? "-" : match[0].startsWith("+") ? "+" : "";
    const replacement = `${sign}${Math.abs(effective[index])}`;
    output = `${output.slice(0, match.index)}${replacement}${output.slice(match.index + match[0].length)}`;
    from = match.index + replacement.length;
  }

  return output;
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

  // Buildings and the year deck stay as authored: v2's roster is already single
  // digits, and a year card carries no number to scale.
  content.playerEvents = content.playerEvents.map((card) => {
    const effects = card.effects.map(scaleEventEffect);
    return {
      ...card,
      count:
        (
          {
            "player-new-citizen": 2,
            "player-free-settlers": 2,
            "player-captured-laborers": 2,
            "player-willing-hands": 6,
            "player-slave-auction": 4,
          } as Record<string, number>
        )[card.id] ?? card.count,
      text: rewriteEventText(card.text, card.effects, effects),
      effects,
    };
  });
  content.resolutions = content.resolutions.map(scaleResolution);

  scaleTable(content.riotTable);
  content.expeditionTables.forEach(scaleTable);
  // Yearly omens remain their authored, indivisible ±1 values.

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
