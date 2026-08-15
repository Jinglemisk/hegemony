import type { ActiveEffectDescriptor, ActiveEffectMechanic } from "../game/activeEffects";
import type { DirectiveEffect, LawEffect } from "../game/assembly/types";
import { getAuthoredGameContent } from "../game/content";
import type { GameContent } from "../game/content";
import type { BuildingEffect, EventEffect, TableEffect } from "../game/types";
import {
  RESOURCE_LABELS,
  buildingName,
  formatNumber,
  formatPopLabel,
  formatSignedNumber,
} from "./formatters";

export type EffectTone = "positive" | "negative" | "muted" | "neutral";

/**
 * A presented effect, in two registers at once.
 *
 * `text` is the flat sentence every ledger row, chip and tooltip has always
 * rendered, and it is unchanged — this split adds to the shape, it never
 * rewrites it. The parts beside it are that same sentence taken apart, because
 * a ceremony stakes its whole composition on ONE enormous figure with the words
 * demoted around it, and a single string has no seam to size differently.
 *
 * An effect that has no one number worth carving simply omits the parts, and a
 * caller that finds none falls back to `text`. That is the fallback rule
 * everywhere: `text` is always there, the parts are an opportunity.
 */
export type EffectPresentation = {
  text: string;
  tone: EffectTone;
  /** The carved numeral, signed — "+9", "-2". */
  magnitude?: string;
  /** What the number is about, set in display caps — "Happiness", "Gold". */
  subject?: string;
  /** When or how it lands, demoted beneath the subject. */
  condition?: string;
  /** How many turns it stands, when it is timed — drives the duration strip. */
  turns?: number;
};

/**
 * Build a presentation from its parts.
 *
 * By default `text` is the parts joined in order, so the flat sentence is
 * PRODUCED by the split rather than maintained beside it and the two cannot
 * drift. `text` is passed explicitly only where the flat wording and the carved
 * wording genuinely differ — a timed blow says "for 3 turns" in prose and says
 * it with pips in a ceremony, so its condition is the *when*, not the *how long*.
 */
function carve(
  tone: EffectTone,
  parts: { magnitude?: string; subject?: string; condition?: string; turns?: number },
  text = [parts.magnitude, parts.subject, parts.condition].filter(Boolean).join(" "),
): EffectPresentation {
  return { text, tone, ...parts };
}

export type ActiveEffectPresentation = EffectPresentation & {
  id: string;
  source: string;
  duration: string;
  accessibleText: string;
};

export function presentEventEffects(
  effects: readonly EventEffect[],
  content: GameContent = getAuthoredGameContent(),
): EffectPresentation {
  const presented = effects.map((effect) => presentEventEffect(effect, content));

  // A card that does ONE thing keeps that effect's parts, so the ceremony can
  // carve them. Two effects joined by " / " have no single number to be about,
  // and the flat sentence is the honest answer.
  if (presented.length === 1) {
    return presented[0];
  }

  return {
    text: presented.map((effect) => effect.text).join(" / "),
    tone: combineTones(presented),
  };
}

/** One frontend projection for board, ledger, tooltip, and accessible status text. */
export function presentActiveEffect(
  descriptor: ActiveEffectDescriptor,
  content: GameContent = getAuthoredGameContent(),
): ActiveEffectPresentation {
  const presented = descriptor.mechanics.map((mechanic) =>
    presentActiveEffectMechanic(mechanic, content),
  );
  const effect = joinEffectPresentations(presented);
  const duration = presentActiveEffectDuration(descriptor);
  const accessibleText = [descriptor.source.label, effect.text, duration]
    .filter(Boolean)
    .join(". ");

  return {
    id: descriptor.id,
    source: descriptor.source.label,
    text: effect.text,
    tone: effect.tone,
    duration,
    accessibleText,
  };
}

export function presentActiveEffects(
  descriptors: readonly ActiveEffectDescriptor[],
  content: GameContent = getAuthoredGameContent(),
): ActiveEffectPresentation[] {
  return descriptors.map((descriptor) => presentActiveEffect(descriptor, content));
}

export function joinEffectPresentations(
  effects: readonly EffectPresentation[],
  separator = "  ·  ",
): EffectPresentation {
  if (effects.length === 1) {
    return effects[0];
  }

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
      return carve("negative", {
        magnitude: `-${formatNumber(effect.count)}`,
        subject: effect.count === 1 ? "pop" : "pops",
      });
    case "loseResource":
      return carve("negative", {
        magnitude: `-${formatNumber(effect.amount)}`,
        subject: RESOURCE_LABELS[effect.resource],
        condition: effect.popLossIfShort
          ? `(short: -${formatNumber(effect.popLossIfShort)} pop)`
          : undefined,
      });
    case "destroyBuilding":
      return carve("negative", { magnitude: "-1", subject: "building" });
    case "gainResource":
      return carve("positive", {
        magnitude: `+${formatNumber(effect.amount)}`,
        subject: RESOURCE_LABELS[effect.resource],
      });
    case "gainPop":
      return carve("positive", { magnitude: "+1", subject: formatPopLabel(effect.pop, 1) });
    case "yearIncomeModifier":
      return carve(
        effect.amount >= 0 ? "positive" : "negative",
        {
          magnitude: formatSignedNumber(effect.amount),
          subject: `${RESOURCE_LABELS[effect.resource]} income`,
          condition: "all year",
        },
        `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]} income, all year`,
      );
  }
}

export function presentEventEffect(
  effect: EventEffect,
  content: GameContent = getAuthoredGameContent(),
): EffectPresentation {
  switch (effect.type) {
    case "resourceDelta":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource]);
    case "scaledResourceDelta":
      return carve(signedTone(effect.amountPerPops), {
        magnitude: formatSignedNumber(effect.amountPerPops),
        subject: RESOURCE_LABELS[effect.resource],
        condition: `per ${effect.popStep} pops`,
      });
    case "happinessDelta":
      return signedPresentation(effect.amount, RESOURCE_LABELS.happiness);
    case "scaledHappinessDelta":
      return carve(signedTone(effect.amountPerPops), {
        magnitude: formatSignedNumber(effect.amountPerPops),
        subject: RESOURCE_LABELS.happiness,
        condition: `per ${effect.popStep} pops`,
      });
    case "timedHappinessDelta":
      // The one presenter whose two registers genuinely differ. The flat
      // sentence has to say how long it lasts; a ceremony says that with pips,
      // so the carved condition is the WHEN and `turns` carries the duration.
      return carve(
        signedTone(effect.amountPerTurn),
        {
          magnitude: formatSignedNumber(effect.amountPerTurn),
          subject: RESOURCE_LABELS.happiness,
          condition: "at each of your upkeeps",
          turns: effect.turns,
        },
        `${formatSignedNumber(effect.amountPerTurn)} ${RESOURCE_LABELS.happiness} per turn for ${effect.turns} turns`,
      );
    case "incomeModifier":
      return carve(signedTone(effect.amount), {
        magnitude: formatSignedNumber(effect.amount),
        subject: `${RESOURCE_LABELS[effect.resource]} income`,
      });
    case "buildingCostMultiplier":
      return {
        text:
          effect.multiplier > 1
            ? "Double building costs this season"
            : "Halve building costs this season",
        tone: effect.multiplier > 1 ? "negative" : "positive",
      };
    case "addPops":
      return carve(
        "positive",
        {
          magnitude: `+${formatNumber(effect.amount)}`,
          subject: formatPopLabel(effect.pop, effect.amount),
          condition: "in a settlement with room",
        },
        `Add ${effect.amount} ${formatPopLabel(effect.pop, effect.amount)}`,
      );
    case "actionCostDiscount": {
      const target = effect.buildingId
        ? buildingName(effect.buildingId, content)
        : effect.action === "foundColony"
          ? "colony"
          : effect.action === "growPop"
            ? `${effect.pop ? formatPopLabel(effect.pop, 1) : "pop"} grown`
            : "building";

      return carve(
        "positive",
        {
          magnitude: `-${formatNumber(effect.amount)}`,
          subject: RESOURCE_LABELS[effect.resource],
          condition: `on your next ${target}`,
        },
        `Next ${target}: -${formatNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]}`,
      );
    }
    case "resourceExchange":
      return {
        text: `Exchange up to ${effect.maxAmount} ${RESOURCE_LABELS[effect.from]} for ${Math.floor(
          effect.maxAmount * effect.ratio,
        )} ${RESOURCE_LABELS[effect.to]}`,
        tone: "neutral",
      };
    case "resourceDeltaPerPop":
      return carve(signedTone(effect.amountPerPop), {
        magnitude: formatSignedNumber(effect.amountPerPop),
        subject: RESOURCE_LABELS[effect.resource],
        condition: `per ${formatPopLabel(effect.pop, 1)}, minimum ${effect.minimum}`,
      });
    case "choice":
      return { text: "Choose one option", tone: "neutral" };
  }
}

function presentActiveEffectMechanic(
  mechanic: ActiveEffectMechanic,
  content: GameContent,
): EffectPresentation {
  switch (mechanic.type) {
    case "suppressIncome":
      return {
        text: "No income for " + mechanic.turns + " collection" + (mechanic.turns === 1 ? "" : "s"),
        tone: "negative",
      };
    case "foodDeficitProgress":
      return {
        text:
          formatSignedNumber(mechanic.netFood) +
          " food income · starvation " +
          mechanic.current +
          "/" +
          mechanic.threshold +
          (mechanic.graceActive ? " (first-income grace)" : "") +
          " · -" +
          mechanic.popLoss +
          " pop at threshold",
        tone: "negative",
      };
    case "timedHappiness":
      return {
        text: formatSignedNumber(mechanic.amountPerTurn) + " happiness per upkeep",
        tone: signedTone(mechanic.amountPerTurn),
      };
    case "resourceIncome":
      return {
        text:
          formatSignedNumber(mechanic.amount) +
          " " +
          RESOURCE_LABELS[mechanic.resource] +
          " income",
        tone: signedTone(mechanic.amount),
      };
    case "buildingCostMultiplier":
      return {
        text:
          "Building costs ×" +
          formatNumber(mechanic.multiplier) +
          (mechanic.excludes.length > 0
            ? " (excludes " + mechanic.excludes.map(actionLabel).join(", ") + ")"
            : ""),
        tone: mechanic.multiplier < 1 ? "positive" : mechanic.multiplier > 1 ? "negative" : "muted",
      };
    case "actionCostDiscount": {
      const target = mechanic.buildingId
        ? buildingName(mechanic.buildingId, content)
        : mechanic.action === "growPop" && mechanic.pop
          ? formatPopLabel(mechanic.pop, 1) + " growth"
          : actionLabel(mechanic.action);

      return {
        text:
          "Next " +
          target +
          ": -" +
          formatNumber(mechanic.amount) +
          " " +
          RESOURCE_LABELS[mechanic.resource],
        tone: "positive",
      };
    }
    case "standingLaw":
      return presentLawEffect(mechanic.effect, content);
    case "equalVotesNextAssembly":
      return {
        text:
          "Exactly " + mechanic.votes + " vote" + (mechanic.votes === 1 ? "" : "s") + " per player",
        tone: "neutral",
      };
  }
}

export function presentLawEffect(
  effect: LawEffect,
  content: GameContent = getAuthoredGameContent(),
): EffectPresentation {
  switch (effect.type) {
    case "settlementIncome":
      return {
        text:
          formatSignedNumber(effect.amount) +
          " " +
          RESOURCE_LABELS[effect.resource] +
          " per " +
          settlementScopeLabel(effect.scope) +
          (effect.step && effect.step > 1 ? " / " + effect.step : ""),
        tone: signedTone(effect.amount),
      };
    case "popIncome":
      return {
        text:
          formatSignedNumber(effect.amount) +
          " " +
          RESOURCE_LABELS[effect.resource] +
          " per " +
          (effect.step && effect.step > 1 ? effect.step + " " : "") +
          formatPopLabel(effect.pop, effect.step ?? 1),
        tone: signedTone(effect.amount),
      };
    case "popPrimaryIncome":
      return {
        text:
          formatSignedNumber(effect.amount) + " tile resource per " + formatPopLabel(effect.pop, 1),
        tone: signedTone(effect.amount),
      };
    case "flatIncome":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource] + " income");
    case "thresholdHappiness":
      return {
        text:
          formatSignedNumber(effect.atOrAbove) +
          " happiness at " +
          effect.threshold +
          " " +
          RESOURCE_LABELS[effect.resource] +
          "; " +
          formatSignedNumber(effect.below) +
          " below",
        tone:
          signedTone(effect.atOrAbove) === signedTone(effect.below)
            ? signedTone(effect.atOrAbove)
            : "neutral",
      };
    case "surplusConversion":
      return {
        text:
          formatSignedNumber(effect.amount) +
          " " +
          RESOURCE_LABELS[effect.to] +
          " per " +
          effect.per +
          " " +
          RESOURCE_LABELS[effect.from] +
          " income above " +
          effect.above,
        tone: signedTone(effect.amount),
      };
    case "actionCostDelta":
      return {
        text:
          lawActionCostTarget(effect, content) +
          ": " +
          formatSignedNumber(effect.amount) +
          " " +
          RESOURCE_LABELS[effect.resource] +
          " cost",
        tone: signedTone(-effect.amount),
      };
    case "actionCostMultiplier":
      return {
        text: actionLabel(effect.action) + " costs ×" + formatNumber(effect.multiplier),
        tone: effect.multiplier < 1 ? "positive" : effect.multiplier > 1 ? "negative" : "muted",
      };
    case "bankRateStep":
      return {
        text:
          RESOURCE_LABELS[effect.material] +
          " bank rate " +
          formatSignedNumber(effect.steps) +
          " step" +
          (Math.abs(effect.steps) === 1 ? "" : "s"),
        tone: signedTone(effect.steps),
      };
    case "yearlyFreeAction":
      return {
        text:
          "First " +
          actionLabel(effect.action) +
          " each year: free " +
          effect.resources.map((resource) => RESOURCE_LABELS[resource]).join(" + "),
        tone: "positive",
      };
    case "onFoundColony": {
      const rewards = [
        effect.grantPop ? "+1 " + formatPopLabel(effect.grantPop, 1) : null,
        effect.happiness ? formatSignedNumber(effect.happiness) + " happiness" : null,
      ].filter(Boolean);
      return {
        text: "On founding a colony: " + rewards.join(" + "),
        tone: (effect.happiness ?? 0) < 0 && !effect.grantPop ? "negative" : "positive",
      };
    }
  }
}

export function presentDirectiveEffect(effect: DirectiveEffect): EffectPresentation {
  switch (effect.type) {
    case "resourceDelta":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource]);
    case "resourceFraction":
      return {
        text: `Lose ${formatNumber(effect.fraction * 100)}% stored ${RESOURCE_LABELS[effect.resource]}`,
        tone: "negative",
      };
    case "losePopFromLargest":
      return {
        text: `-${formatNumber(effect.count)} ${effect.count === 1 ? "pop" : "pops"} from largest settlement`,
        tone: "negative",
      };
    case "suppressIncome":
      return {
        text: `No income for ${effect.turns} collection${effect.turns === 1 ? "" : "s"}`,
        tone: "negative",
      };
    case "repealNewestTargetLaw":
      return { text: "Repeal the target's newest authored standing Law", tone: "neutral" };
    case "equalVotesNextAssembly":
      return { text: "Target has exactly 1 base vote at the next Assembly", tone: "neutral" };
  }
}

export function presentBuildingEffect(effect: BuildingEffect): EffectPresentation {
  switch (effect.type) {
    case "freemanGoldBonus":
      return {
        text: `+${formatNumber(effect.amount)} Gold per freeman, up to ${effect.supportedPops}`,
        tone: "positive",
      };
    case "citizenInfluenceBonus":
      return {
        text: `+${formatNumber(effect.amount)} Influence per citizen, up to ${effect.supportedPops}`,
        tone: "positive",
      };
    case "slavePrimaryResourceBonus":
      return {
        text: `+${formatNumber(effect.amount)} tile resource per slave, up to ${effect.supportedPops}`,
        tone: "positive",
      };
    case "income":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource] + " income");
    case "happiness":
      return signedPresentation(effect.amount, RESOURCE_LABELS.happiness);
    case "growPopFoodDiscount":
      return {
        text: `Grow Pop costs -${formatNumber(effect.amount)} Food here`,
        tone: "positive",
      };
    case "popCapacityBonus":
      return signedPresentation(effect.amount, "pop capacity");
    case "tilePrimaryResourceBonus":
      return signedPresentation(effect.amount, "tile resource income");
    case "promoteCostReduction":
      return {
        text: `Promotions cost -${formatNumber(effect.amount)} here`,
        tone: "positive",
      };
  }
}

export function presentBuildingEffects(effects: readonly BuildingEffect[]): EffectPresentation {
  return effects.length > 0
    ? joinEffectPresentations(effects.map(presentBuildingEffect), ", ")
    : { text: "No effect", tone: "muted" };
}

function presentActiveEffectDuration(descriptor: ActiveEffectDescriptor): string {
  const remaining = descriptor.duration.remaining;
  switch (descriptor.duration.expiry) {
    case "afterIncomeCollections":
      return remaining + " income collection" + (remaining === 1 ? " remaining" : "s remaining");
    case "afterPlayerUpkeeps":
      return remaining + " upkeep" + (remaining === 1 ? " remaining" : "s remaining");
    case "onFoodRecoveryOrStarvation":
      return remaining + " deficient upkeep" + (remaining === 1 ? "" : "s") + " to threshold";
    case "atSeasonEnd":
      return "Until season end";
    case "atYearEnd":
      return "Until year end";
    case "afterMatchingActionOrTurnEnd":
      return "Until used or turn end";
    case "afterMatchingLawActionOrYearEnd":
      return "Until used or year end";
    case "whenRepealed":
      return "Until repealed";
    case "atNextAssembly":
      return "At the next Assembly";
  }
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    buildBuilding: "build",
    foundColony: "found colony",
    growPop: "grow pop",
    upgradeColonyToCity: "upgrade colony",
    promotePop: "promote pop",
    demotePop: "demote pop",
  };
  return labels[action] ?? action;
}

function lawActionCostTarget(
  effect: Extract<LawEffect, { type: "actionCostDelta" }>,
  content: GameContent,
): string {
  let target = actionLabel(effect.action);

  if (effect.scope) {
    target += " in " + settlementScopePlural(effect.scope);
  }

  if (effect.pop) {
    target += " (" + formatPopLabel(effect.pop, 1) + " only)";
  }

  if (effect.buildingIds?.length) {
    target +=
      " (" +
      joinHumanList(effect.buildingIds.map((buildingId) => buildingName(buildingId, content))) +
      " only)";
  }

  return target;
}

function settlementScopePlural(scope: "all" | "city" | "colony"): string {
  if (scope === "all") return "all settlements";
  return scope === "city" ? "cities" : "colonies";
}

function joinHumanList(items: string[]): string {
  if (items.length < 2) return items[0] ?? "";
  if (items.length === 2) return items.join(" and ");
  return items.slice(0, -1).join(", ") + ", and " + items.at(-1);
}

function settlementScopeLabel(scope: "all" | "city" | "colony"): string {
  return scope === "all" ? "settlement" : scope;
}

function signedPresentation(amount: number, label: string): EffectPresentation {
  return carve(signedTone(amount), { magnitude: formatSignedNumber(amount), subject: label });
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
