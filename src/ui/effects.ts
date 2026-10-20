import type { ActiveEffectDescriptor, ActiveEffectMechanic } from "../game/activeEffects";
import { GROWS_PER_TURN, SLAVE_UNREST_WEIGHT } from "../game/assembly/laws";
import type { DirectiveEffect, LawEffect } from "../game/assembly/types";
import { getAuthoredGameContent } from "../game/content";
import type { GameContent } from "../game/content";
import { capitalize, pluralName } from "../game/core/format";
import type { Ruleset } from "../game/ruleset";
import type { UnrestOutcome } from "../game/unrest";
import type {
  BuildingEffect,
  EventEffect,
  TableEffect,
  YearCard,
  YearTerm,
  UnrestTokenChange,
} from "../game/types";
import {
  RESOURCE_LABELS,
  buildingName,
  formatNumber,
  formatResourceCost,
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
  /** The carved numeral, signed — "+9", "−2". */
  magnitude?: string;
  /** What the number is about, set in display caps — "Happiness", "Gold". */
  subject?: string;
  /** When or how it lands, demoted beneath the subject. */
  condition?: string;
};

/**
 * Build a presentation from its parts.
 *
 * By default `text` is the parts joined in order, so the flat sentence is
 * PRODUCED by the split rather than maintained beside it and the two cannot
 * drift. `text` is passed explicitly only where the flat wording and the carved
 * wording differ.
 */
function carve(
  tone: EffectTone,
  parts: { magnitude?: string; subject?: string; condition?: string },
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

export function presentEventEffects(effects: readonly EventEffect[]): EffectPresentation {
  const presented = effects.map((effect) => presentEventEffect(effect));

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
  ruleset: Ruleset,
  content: GameContent = getAuthoredGameContent(),
): ActiveEffectPresentation {
  const presented = descriptor.mechanics.map((mechanic) =>
    presentActiveEffectMechanic(mechanic, ruleset, content),
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
  ruleset: Ruleset,
  content: GameContent = getAuthoredGameContent(),
): ActiveEffectPresentation[] {
  return descriptors.map((descriptor) => presentActiveEffect(descriptor, ruleset, content));
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

/** The token operation printed on the card. */
function presentUnrestToken(change: UnrestTokenChange, realm = "your realm"): EffectPresentation {
  return carve(change === "placeOne" ? "negative" : "positive", {
    magnitude: change === "clearAll" ? "All" : change === "placeOne" ? "+1" : "−1",
    subject: change === "clearAll" ? "Unrest tokens" : "Unrest token",
    condition: change === "placeOne" ? `placed on ${realm}` : `cleared from ${realm}`,
  });
}

export function presentTableEffect(effect: TableEffect): EffectPresentation {
  switch (effect.type) {
    case "none":
      return { text: "—", tone: "muted" };
    case "losePops":
      return carve("negative", {
        magnitude: `−${formatNumber(effect.count)}`,
        subject: effect.count === 1 ? "pop" : "pops",
      });
    case "loseResource":
      return carve("negative", {
        magnitude: `−${formatNumber(effect.amount)}`,
        subject: RESOURCE_LABELS[effect.resource],
        condition: effect.popLossIfShort
          ? `(short: −${formatNumber(effect.popLossIfShort)} pop)`
          : undefined,
      });
    case "destroyBuilding":
      return carve("negative", { magnitude: "−1", subject: "building" });
    case "gainResource":
      return carve("positive", {
        magnitude: `+${formatNumber(effect.amount)}`,
        subject: RESOURCE_LABELS[effect.resource],
      });
    case "gainPop":
      return carve("positive", { magnitude: "+1", subject: formatPopLabel(effect.pop, 1) });
  }
}

export function presentEventEffect(effect: EventEffect): EffectPresentation {
  switch (effect.type) {
    case "resourceDelta":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource]);
    case "unrestTokens":
      return presentUnrestToken(effect.change);
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
  }
}

function presentActiveEffectMechanic(
  mechanic: ActiveEffectMechanic,
  ruleset: Ruleset,
  content: GameContent,
): EffectPresentation {
  switch (mechanic.type) {
    case "suppressIncome":
      return {
        text: "No income for " + mechanic.turns + " collection" + (mechanic.turns === 1 ? "" : "s"),
        tone: "negative",
      };
    case "hunger":
      return {
        text:
          formatSignedNumber(mechanic.netFood) +
          " food income, " +
          (mechanic.stockpile < 0
            ? -mechanic.stockpile + " short"
            : mechanic.stockpile + " stored") +
          " · " +
          (mechanic.unfed > 0
            ? mechanic.unfed +
              (mechanic.unfed === 1 ? " pop leaves" : " pops leave") +
              " at turn end"
            : "one pop leaves per food short at turn end"),
        tone: "negative",
      };
    case "zeroTerm":
      return { text: YEAR_TERM_LABELS[mechanic.term], tone: "negative" };
    case "standingLaw":
      return presentLawEffect(mechanic.effect, ruleset, content);
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
  ruleset: Ruleset,
  content: GameContent = getAuthoredGameContent(),
): EffectPresentation {
  switch (effect.type) {
    case "actionCost":
      return {
        text:
          (effect.buildingIds?.map((id) => buildingName(id, content)).join(" / ") ??
            {
              foundColony: "Found a colony",
              upgradeColonyToCity: "Upgrade a colony",
              buildBuilding: "Build",
              growPop: "Grow",
              promotePop: "Promote",
              demotePop: "Demote",
            }[effect.action]) +
          " costs " +
          (Object.keys(effect.cost).length ? formatResourceCost(effect.cost) : "nothing") +
          (effect.pop ? ` (${formatPopLabel(effect.pop, 1)})` : ""),
        tone: "neutral",
      };
    case "realmIncome":
      return signedPresentation(effect.amount, `${effect.resource} at yearly income`);
    case "extraSlots":
      return {
        text: `${effect.scope === "capital" ? "Capital" : "Cities"} ${effect.amount < 0 ? "lose" : "gain"} ${Math.abs(effect.amount)} work slot`,
        tone: signedTone(effect.amount),
      };
    case "colonyPieces":
      return { text: `${effect.amount} extra colony piece`, tone: "positive" };
    case "acquirePop":
      return { text: "Add one slave or freeman when taking this Idea", tone: "positive" };
    case "acquireResource":
      return signedPresentation(effect.amount, `${effect.resource} when taking this Idea`);
    case "onUpgradeCity":
      return {
        text: `Upgrading adds one ${formatPopLabel(effect.grantPop, 1)} if there is room`,
        tone: "positive",
      };
    case "dolePrice":
      return { text: `The Dole costs ${effect.amount} influence`, tone: "positive" };
    case "slotExempt":
      return {
        text: `${buildingName(effect.building, content)} takes no work slot`,
        tone: "positive",
      };
    case "votePurchaseLimit":
      return { text: `Buy up to ${effect.amount} votes per Assembly`, tone: "positive" };
    case "calmPayment":
      return { text: `Gold calm instead costs ${effect.amount} food`, tone: "neutral" };
    case "colonyCapacity":
      return { text: `Colonies hold ${effect.amount} pops; existing pops stay`, tone: "negative" };
    case "buildingFood":
      return {
        text: `${buildingName(effect.building, content)} grows ${effect.amount} food`,
        tone: "positive",
      };
    case "happiness":
      return signedPresentation(effect.amount, "happiness to the realm");
    case "settlementIncome":
      return {
        text: `${formatSignedNumber(effect.amount)} ${RESOURCE_LABELS[effect.resource]} per ${effect.scope}`,
        tone: signedTone(effect.amount),
      };
    case "onFoundColony":
      return {
        text: `Founding grants ${effect.amount ?? 1} ${formatPopLabel(effect.grantPop, effect.amount ?? 1)} as room allows`,
        tone: "positive",
      };
    case "popIncome": {
      // A whole yield: its tone is which way it moves the ruleset's own figure.
      const base = ruleset.popIncome[effect.pop].flat[effect.resource] ?? 0;
      const pops = capitalize(effect.pop);
      const where = effect.scope ? ` in ${effect.scope === "colony" ? "colonies" : "cities"}` : "";
      return {
        text:
          (effect.resource === "food" && effect.amount <= 0
            ? `${pops} eat ${effect.amount === 0 ? "no" : -effect.amount} food`
            : `${pops} produce ${effect.amount === 0 ? "no" : effect.amount} ${effect.resource}`) +
          where,
        tone: signedTone(effect.amount - base),
      };
    }
    case "slaveResource":
      return { text: `Slaves grow ${effect.resource} on any terrain`, tone: "positive" };
    case "slaveUnrestWeight":
      return {
        text: `Slaves count ${effect.amount} times for unrest`,
        tone: signedTone(SLAVE_UNREST_WEIGHT - effect.amount),
      };
    case "buildingForbidden":
      return {
        text: `No new ${pluralName(buildingName(effect.building, content))} may be built`,
        tone: "negative",
      };
    case "buildingIdle":
      return {
        text: `${pluralName(buildingName(effect.building, content))} do nothing`,
        tone: "negative",
      };
    case "colonyBuildings":
      return {
        text: `Colonies may hold ${effect.amount} building${effect.amount === 1 ? "" : "s"}`,
        tone: "positive",
      };
    case "colonyLimit":
      return {
        text: `You may place ${Math.abs(effect.amount)} ${effect.amount < 0 ? "fewer" : "more"} colony piece${Math.abs(effect.amount) === 1 ? "" : "s"}`,
        tone: signedTone(effect.amount),
      };
    case "growLimit": {
      const who = effect.scope === "capital" ? "Your capital" : "Colonies";
      return {
        text:
          effect.amount === 0
            ? `${who} may not grow`
            : `${who} may grow ${effect.amount} times per turn`,
        tone: signedTone(effect.amount - GROWS_PER_TURN),
      };
    }
    case "settlementVotes":
      return {
        text: `${formatSignedNumber(effect.amount)} vote${Math.abs(effect.amount) === 1 ? "" : "s"} per ${effect.scope}`,
        tone: signedTone(effect.amount),
      };
  }
}

export function presentDirectiveEffect(effect: DirectiveEffect): EffectPresentation {
  switch (effect.type) {
    case "resourceDelta":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource]);
    case "unrestTokens":
      return presentUnrestToken(effect.change, "the target's realm");
    case "losePopFromLargest":
      return {
        text: `−${formatNumber(effect.count)} ${effect.count === 1 ? "pop" : "pops"} from largest settlement`,
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
    case "classOutput":
      return {
        text: `Each ${formatPopLabel(effect.pop, 1)} here makes ${formatNumber(effect.amount)}`,
        tone: "positive",
      };
    case "income":
      return signedPresentation(effect.amount, RESOURCE_LABELS[effect.resource] + " income");
    case "happiness":
      return signedPresentation(effect.amount, RESOURCE_LABELS.happiness);
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
    case "whenFed":
      return remaining === 0
        ? "Hunger at the next income"
        : "Food lasts " + remaining + " more income" + (remaining === 1 ? "" : "s");
    case "atYearEnd":
      return "Until year end";
    case "permanent":
      return "For the rest of the game";
    case "whenRepealed":
      return "Until repealed";
    case "atNextAssembly":
      return "At the next Assembly";
  }
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

/** What each zeroed term means, in the words the year cards print. */
export const YEAR_TERM_LABELS: Record<YearTerm, string> = {
  plainsFood: "Plains grow no food",
  forestWood: "Forests yield no wood",
  mountainStone: "Mountains yield no stone",
  freemenGold: "Freemen yield no gold",
  citizenInfluence: "Citizens yield no influence",
  luxuryHappiness: "Luxuries give no happiness",
};

/** What each zeroed term strikes, carved as the year card's subject. */
const YEAR_TERM_NOUNS: Record<YearTerm, string> = {
  plainsFood: "Plains food",
  forestWood: "Forest wood",
  mountainStone: "Mountain stone",
  freemenGold: "Freemen gold",
  citizenInfluence: "Citizen influence",
  luxuryHappiness: "Luxury happiness",
};

/** The year card's rule: its flat line, and the three ranks the ceremony carves. */
export function presentYearCard(card: YearCard): EffectPresentation {
  if (card.effect.type === "zeroTerm") {
    const { term } = card.effect;
    return carve(
      "negative",
      { magnitude: "0", subject: YEAR_TERM_NOUNS[term], condition: "for the whole year" },
      YEAR_TERM_LABELS[term],
    );
  }

  return card.effect.change === "placeOne"
    ? carve(
        "negative",
        { magnitude: "+1", subject: "Unrest token", condition: "on every realm, now" },
        "Everyone places an Unrest token",
      )
    : carve(
        "positive",
        { magnitude: "0", subject: "Unrest tokens", condition: "every realm clears them" },
        "Everyone clears their Unrest tokens",
      );
}

/** The riot and revolt in words, from the engine's outcome (`unrestOutcome`) and the
 *  ruleset: its name (`noun`), the line the level stands at, what ending the turn there
 *  sets off, and the revolt's share of the slaves (`fraction` mid-sentence, `share` to
 *  open one). Above both lines the warning says where a riot starts. */
export function presentUnrestOutcome(ruleset: Ruleset, tier: UnrestOutcome["tier"]) {
  const { riotThreshold, revoltSlaveShare } = ruleset.economy.unrest;
  const fraction = revoltSlaveShare === 0.5 ? "half" : `${formatNumber(revoltSlaveShare * 100)}%`;
  // Opens a sentence before "your slaves": "Half", or "60% of".
  const share = fraction === "half" ? "Half" : `${fraction} of`;
  switch (tier) {
    case "revolt":
      return {
        noun: "revolt",
        line: "the revolt line",
        fraction,
        share,
        warning: `${share} your slaves leave if you end your turn at this level, and your Unrest tokens clear.`,
      };
    case "riot":
      return {
        noun: "riot",
        line: "the riot line",
        fraction,
        share,
        warning:
          "Ending your turn at this level clears your Unrest tokens and starts the riot table.",
      };
    case "none":
      return {
        noun: null,
        line: null,
        fraction,
        share,
        warning: `A riot starts at ${formatNumber(riotThreshold)} happiness.`,
      };
  }
}

/** The pass rule's tie half in words, from the ruleset: "a tie fails" or "a tie carries". */
export function tieRule(ruleset: Ruleset) {
  return ruleset.assembly.tiesPass ? "a tie carries" : "a tie fails";
}
