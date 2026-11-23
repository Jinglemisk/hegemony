import { capitalize, formatPopName } from "../../../game/core/format";
import type { DevCard, DevCardEffect, EventEffect } from "../../../game/types";
import type { EffectTone } from "../../../ui/effects";
import { RESOURCE_LABELS } from "../../../ui/formatters";
import { POP_RASTERS, RESOURCE_RASTERS } from "../../../ui/iconRegistry";

export type CeremonyMood = "gift" | "wound" | "rite";

/**
 * The mood is about how a moment FEELS, not what it does: a `gift` is olive, a
 * `wound` oxblood, a `rite` clay. It is read off the effects the engine already
 * presented, so no ceremony carries a hand-set colour.
 */
export function ceremonyMood(tone: EffectTone): CeremonyMood {
  return tone === "negative" ? "wound" : tone === "positive" ? "gift" : "rite";
}

/**
 * The commit verb is the OUTCOME, not a navigation instruction. You do not
 * "Continue" out of a riot; you endure it. A drawn card whose effect has a name
 * says it instead (`fateCommit`, `devDrawCommit`); this is the verb for a moment
 * without one, the riot and the revolt.
 */
export function commitVerb(mood: CeremonyMood): string {
  if (mood === "gift") return "Take It";
  return mood === "wound" ? "Endure It" : "So Be It";
}

/**
 * A commit's words: the verb, then the icon of what it acts on before that thing's
 * name ("Clear the [unrest] Unrest"). Without `noun` it is the verb alone ("Done").
 */
export type CommitLabel = { verb: string; icon?: string; noun?: string };

/** The commit for one effect a drawn card applies, named from its typed data. */
function effectCommit(effect: EventEffect | DevCardEffect): CommitLabel | null {
  switch (effect.type) {
    case "resourceDelta":
      return {
        verb: effect.amount < 0 ? "Lose the" : "Take the",
        icon: RESOURCE_RASTERS[effect.resource],
        noun: RESOURCE_LABELS[effect.resource],
      };
    case "gain":
      // A choice of kinds is made in the hand; a drawn yield names its one kind.
      return effect.resources.length === 1
        ? {
            verb: "Take the",
            icon: RESOURCE_RASTERS[effect.resources[0]],
            noun: RESOURCE_LABELS[effect.resources[0]],
          }
        : null;
    case "addPops":
      return {
        verb: "Settle the",
        icon: POP_RASTERS[effect.pop],
        noun: capitalize(formatPopName(effect.pop, effect.amount)),
      };
    case "unrestTokens":
      return {
        verb: effect.change === "placeOne" ? "Place the" : "Clear the",
        icon: "unrest/unrest",
        noun: "Unrest",
      };
    default:
      return null;
  }
}

/** A fate's commit: what its one effect does, or the mood's verb for a card of several. */
export function fateCommit(effects: readonly EventEffect[], mood: CeremonyMood): CommitLabel {
  return (effects.length === 1 ? effectCommit(effects[0]) : null) ?? { verb: commitVerb(mood) };
}

/** A bought card's commit: a yield takes what it gave, any other card is kept. */
export function devDrawCommit(card: DevCard): CommitLabel {
  return card.kind === "yield"
    ? (effectCommit(card.effect) ?? { verb: "Done" })
    : { verb: "Keep the", icon: "events/convoy", noun: card.name };
}
