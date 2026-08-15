import type { EffectTone } from "../../../ui/effects";

export type CeremonyMood = "gift" | "wound" | "rite";

/**
 * The mood is about how a moment FEELS, not what it does: a `gift` is olive, a
 * `wound` oxblood, a `rite` clay. It is read off the effects the engine already
 * presented, so no ceremony carries a hand-set colour.
 */
export function ceremonyMood(tone: EffectTone): CeremonyMood {
  return tone === "negative" ? "wound" : tone === "positive" ? "gift" : "rite";
}

/** The kicker over the title — the deck's own verdict on what it just dealt. */
export function moodKicker(mood: CeremonyMood): string {
  return mood === "wound" ? "A dark fate" : mood === "gift" ? "A kind wind" : "A fate";
}

/**
 * The commit verb is the OUTCOME, not a navigation instruction. You do not
 * "Continue" out of a riot; you endure it. Where the moment hands you something
 * with a name, the verb names it — "Take the Gold" — which is why this takes the
 * subject the presenter split now provides.
 *
 * It lives here rather than in the fate modal because the venture and the riot
 * need it too, and the version that stayed local to one modal is exactly why
 * both of them read "Continue".
 */
export function commitVerb(mood: CeremonyMood, subject?: string): string {
  if (mood === "gift") {
    return subject ? `Take the ${subject}` : "Take It";
  }

  return mood === "wound" ? "Endure It" : "So Be It";
}
