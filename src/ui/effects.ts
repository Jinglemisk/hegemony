import type { EventEffect, TableEffect } from "../game/types";
import {
  RESOURCE_LABELS,
  buildingName,
  formatNumber,
  formatPopLabel,
  formatSignedNumber,
} from "./formatters";

export type EffectTone = "positive" | "negative" | "muted" | "neutral";

export type EffectPresentation = {
  text: string;
  tone: EffectTone;
};

export function presentEventEffects(effects: readonly EventEffect[]): EffectPresentation {
  const presented = effects.map(presentEventEffect);

  return {
    text: presented.map((effect) => effect.text).join(" / "),
    tone: combineTones(presented),
  };
}

export function joinEffectPresentations(
  effects: readonly EffectPresentation[],
  separator = "  ·  ",
): EffectPresentation {
  return {
    text: effects.map((effect) => effect.text).join(separator),
    tone: combineTones(effects),
  };
}

export function presentTableEffect(effect: TableEffect): EffectPresentation {
  switch (effect.type) {
    case "none":
      return { text: "—", tone: "muted" };
    case "losePops":
      return {
        text: `-${formatNumber(effect.count)} ${effect.count === 1 ? "pop" : "pops"}`,
        tone: "negative",
      };
    case "loseResource":
      return {
        text:
          `-${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}` +
          (effect.popLossIfShort ? ` (short: -${formatNumber(effect.popLossIfShort)} pop)` : ""),
        tone: "negative",
      };
    case "destroyBuilding":
      return { text: "-1 building", tone: "negative" };
    case "gainResource":
      return {
        text: `+${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`,
        tone: "positive",
      };
    case "gainPop":
      return { text: `+1 ${formatPopLabel(effect.pop, 1)}`, tone: "positive" };
    case "yearIncomeModifier":
      return {
        text: `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]} income, all year`,
        tone: effect.amount >= 0 ? "positive" : "negative",
      };
  }
}

function presentEventEffect(effect: EventEffect): EffectPresentation {
  switch (effect.type) {
    case "resourceDelta":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource]);
    case "scaledResourceDelta":
      return {
        text: `${formatSignedNumber(effect.amountPerPops)} ${RESOURCE_LABELS[effect.resource]} per ${effect.popStep} pops`,
        tone: signedTone(effect.amountPerPops),
      };
    case "happinessDelta":
      return signedPresentation(effect.amount, RESOURCE_LABELS.happiness);
    case "scaledHappinessDelta":
      return {
        text: `${formatSignedNumber(effect.amountPerPops)} ${RESOURCE_LABELS.happiness} per ${effect.popStep} pops`,
        tone: signedTone(effect.amountPerPops),
      };
    case "timedHappinessDelta":
      return {
        text: `${formatSignedNumber(effect.amountPerTurn)} ${RESOURCE_LABELS.happiness} per turn for ${effect.turns} turns`,
        tone: signedTone(effect.amountPerTurn),
      };
    case "incomeModifier":
      return {
        text: `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]} income`,
        tone: signedTone(effect.amount),
      };
    case "buildingCostMultiplier":
      return {
        text:
          effect.multiplier > 1
            ? "Double building costs this season"
            : "Halve building costs this season",
        tone: effect.multiplier > 1 ? "negative" : "positive",
      };
    case "addPops":
      return {
        text: `Add ${effect.amount} ${formatPopLabel(effect.pop, effect.amount)}`,
        tone: "positive",
      };
    case "actionCostDiscount": {
      const target = effect.buildingId
        ? buildingName(effect.buildingId)
        : effect.action === "foundColony"
          ? "colony"
          : effect.action === "growPop"
            ? `${effect.pop ? formatPopLabel(effect.pop, 1) : "pop"} grown`
            : "building";

      return {
        text: `Next ${target}: -${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`,
        tone: "positive",
      };
    }
    case "resourceExchange":
      return {
        text: `Exchange up to ${effect.maxAmount} ${RESOURCE_LABELS[effect.from]} for ${Math.floor(
          effect.maxAmount * effect.ratio,
        )} ${RESOURCE_LABELS[effect.to]}`,
        tone: "neutral",
      };
    case "resourceDeltaPerPop":
      return {
        text: `${formatSignedNumber(effect.amountPerPop)} ${RESOURCE_LABELS[effect.resource]} per ${formatPopLabel(
          effect.pop,
          1,
        )}, minimum ${effect.minimum}`,
        tone: signedTone(effect.amountPerPop),
      };
    case "choice":
      return { text: "Choose one option", tone: "neutral" };
  }
}

function signedPresentation(amount: number, label: string): EffectPresentation {
  return {
    text: `${formatSignedNumber(amount)} ${label}`,
    tone: signedTone(amount),
  };
}

function signedTone(amount: number): EffectTone {
  return amount > 0 ? "positive" : amount < 0 ? "negative" : "muted";
}

function combineTones(effects: readonly EffectPresentation[]): EffectTone {
  const tones = new Set(effects.map((effect) => effect.tone).filter((tone) => tone !== "muted"));

  if (tones.size === 0) {
    return "muted";
  }

  return tones.size === 1 ? [...tones][0] : "neutral";
}
