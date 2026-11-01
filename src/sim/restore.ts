import type { ResolutionCard } from "../game/assembly/types";
import type { GameContent } from "../game/content";

/**
 * The agency package's comparisons turn each change off one at a time (owner, 2026-10-31).
 * `batch --restore` plays the content a change replaced. Sim-only, never offered in the
 * game, and each entry goes once its comparison is read.
 */
const MANUMISSION_THREE_TIMES: ResolutionCard = {
  kind: "law",
  politician: "demosthenes",
  id: "manumission",
  name: "Manumission",
  text: "Promoting a slave is free, but slaves count three times for unrest.",
  effects: [
    { type: "actionCost", action: "promotePop", pop: "slaves", cost: {} },
    { type: "slaveUnrestWeight", amount: 3 },
  ],
};

function replaceResolution(content: GameContent, id: string, card: ResolutionCard): GameContent {
  return {
    ...content,
    resolutions: content.resolutions.map((each) => (each.id === id ? card : each)),
  };
}

export const RESTORES: Record<string, (content: GameContent) => GameContent> = {
  /** Manumission counts each slave three times, as before the package. */
  manumission: (content) => replaceResolution(content, "manumission", MANUMISSION_THREE_TIMES),
};

export function restoreContent(content: GameContent, ids: readonly string[]): GameContent {
  return ids.reduce((restored, id) => RESTORES[id](restored), content);
}
