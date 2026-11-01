import type { ResolutionCard } from "../game/assembly/types";
import type { GameContent } from "../game/content";
import type { NationalIdeaDefinition, NationalIdeaId } from "../game/ideaTypes";

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

const FORUM_RITES: ResolutionCard = {
  kind: "law",
  politician: "perdiccas",
  id: "forum-rites",
  name: "Forum Rites",
  text: "Citizens produce 2 influence everywhere, but freemen produce nothing in colonies.",
  effects: [
    { type: "popIncome", pop: "citizens", resource: "influence", amount: 2 },
    { type: "popIncome", pop: "freemen", resource: "gold", amount: 0, scope: "colony" },
  ],
};

const CAPITAL_WORKS: NationalIdeaDefinition = {
  // An id the game no longer has.
  id: "capital-works" as NationalIdeaId,
  name: "Capital Works",
  text: "Your capital has one extra work slot.",
  effects: [{ type: "extraSlots", scope: "capital", amount: 1 }],
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
  /** Capital Works is a National Idea again, in its old place after Urban Planning. */
  "capital-works": (content) => {
    const ideas = content.nationalIdeas;
    const at = ideas.findIndex((idea) => idea.id === "urban-planning") + 1;
    return {
      ...content,
      nationalIdeas: [...ideas.slice(0, at), CAPITAL_WORKS, ...ideas.slice(at)],
    };
  },
  /** Forum Rites stands in Rural Messengers' place: every citizen makes 2 influence. */
  "forum-rites": (content) => replaceResolution(content, "rural-messengers", FORUM_RITES),
};

export function restoreContent(content: GameContent, ids: readonly string[]): GameContent {
  return ids.reduce((restored, id) => RESTORES[id](restored), content);
}
