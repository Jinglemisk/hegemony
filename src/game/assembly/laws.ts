import { current, isDraft } from "immer";
import type {
  BuildingId,
  HegemonyState,
  PlayerId,
  PopType,
  Resource,
  Resources,
  SettlementKind,
} from "../types";
import type { Ruleset } from "../ruleset";
import { getResolutionCard } from "../content";
import { getTile } from "../core/query";
import type { LawCostedAction, LawEffect, LawRule, ResolutionCard } from "./types";
import type { GameContent } from "../content";
import type { ActiveLaw } from "./types";
import type { NationalIdeaOwnership } from "../ideaTypes";

export type RulesSource = Ruleset | HegemonyState;
export type StandingEffectSource = {
  kind: "law" | "idea";
  id: string;
  label: string;
  effects: LawEffect[];
};
type StandingQueries = { sources: StandingEffectSource[]; effects: LawEffect[] };
const standingQueries = new WeakMap<
  GameContent,
  WeakMap<ActiveLaw[], WeakMap<NationalIdeaOwnership[], StandingQueries>>
>();
function snapshot<T>(value: T): T {
  return isDraft(value) ? current(value) : value;
}

/** Only immutable inputs are memoized. Mutable fixtures and changed drafts are
 * derived afresh; no cache is written into game state. */
function standingQuery(G: HegemonyState, playerID: PlayerId): StandingQueries {
  const content = snapshot(G.definition.content);
  const activeLaws = snapshot(G.activeLaws);
  const nationalIdeas = snapshot(G.players[playerID].nationalIdeas);
  const cached = standingQueries.get(content)?.get(activeLaws)?.get(nationalIdeas);
  if (cached) return cached;
  const laws: StandingEffectSource[] = activeLaws.flatMap((active) => {
    const card = getResolutionCard(content, active.cardId);
    return card?.kind === "law"
      ? [{ kind: "law" as const, id: card.id, label: card.name, effects: card.effects }]
      : [];
  });
  const ideas: StandingEffectSource[] = nationalIdeas.flatMap((owned) => {
    const idea = content.nationalIdeas.find((i) => i.id === owned.id);
    return idea ? [{ kind: "idea", id: idea.id, label: idea.name, effects: idea.effects }] : [];
  });
  const sources = [...laws, ...ideas];
  const result = { sources, effects: sources.flatMap((source) => source.effects) };
  if (
    Object.isFrozen(content) &&
    Object.isFrozen(content.resolutions) &&
    Object.isFrozen(content.nationalIdeas) &&
    Object.isFrozen(activeLaws) &&
    activeLaws.every(Object.isFrozen) &&
    Object.isFrozen(nationalIdeas) &&
    nationalIdeas.every(Object.isFrozen)
  ) {
    let byLaws = standingQueries.get(content);
    if (!byLaws) standingQueries.set(content, (byLaws = new WeakMap()));
    let byIdeas = byLaws.get(activeLaws);
    if (!byIdeas) byLaws.set(activeLaws, (byIdeas = new WeakMap()));
    byIdeas.set(nationalIdeas, result);
  }
  return result;
}
export function getStandingEffectSources(
  G: HegemonyState,
  playerID: PlayerId,
): StandingEffectSource[] {
  // Keep query results caller-owned, as before memoization.
  return standingQuery(G, playerID).sources.map((source) => ({ ...source }));
}
export function getStandingEffects(G: HegemonyState, playerID: PlayerId): LawEffect[] {
  return standingQuery(G, playerID).effects.slice();
}
export function hasLawRule(source: RulesSource | undefined, rule: LawRule): boolean {
  return Boolean(
    source &&
    "activeLaws" in source &&
    getStandingEffects(source, "0").some(
      (effect) => effect.type === "rule" && effect.rule === rule,
    ),
  );
}
/** A derived ruleset; never written into the match definition or persisted. */
export function effectiveRuleset(source: RulesSource, kind?: SettlementKind): Ruleset {
  if (!("activeLaws" in source) || source.activeLaws.length === 0)
    return "ruleset" in source ? source.ruleset : source;
  const base = source.ruleset;
  const rules: Ruleset = {
    ...base,
    settlements: { ...base.settlements, colony: { ...base.settlements.colony } },
    popIncome: {
      ...base.popIncome,
      citizens: { ...base.popIncome.citizens, flat: { ...base.popIncome.citizens.flat } },
      freemen: { ...base.popIncome.freemen, flat: { ...base.popIncome.freemen.flat } },
    },
  };
  for (const effect of getStandingEffects(source, "0")) {
    if (effect.type === "colonyCapacity") rules.settlements.colony.popCapacity = effect.amount;
  }
  if (hasLawRule(source, "grainLevy")) rules.popIncome.freemen.flat.food = 0;
  if (hasLawRule(source, "forumRites")) {
    rules.popIncome.citizens.flat.influence = 2;
    if (kind === "colony") rules.popIncome.freemen.flat.gold = 0;
  }
  return rules;
}
export function isPriceLaw(card: ResolutionCard): boolean {
  return (
    card.kind === "law" &&
    card.effects.some((effect) => ["actionCost", "calmPayment"].includes(effect.type))
  );
}
export function applyLawActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: LawCostedAction,
  cost: Partial<Resources>,
  context: { pop?: PopType; buildingId?: BuildingId } = {},
): Partial<Resources> {
  for (const effect of getStandingEffects(G, playerID)) {
    if (
      effect.type === "actionCost" &&
      effect.action === action &&
      (!effect.pop || effect.pop === context.pop) &&
      (!effect.buildingIds ||
        (context.buildingId !== undefined && effect.buildingIds.includes(context.buildingId)))
    )
      return { ...effect.cost };
  }
  return cost;
}
export function getLawIncomeContributions(
  G: HegemonyState,
  playerID: PlayerId,
): Array<{ resource: Resource; amount: number; label: string; settlementId: string }> {
  return getStandingEffectSources(G, playerID).flatMap((source) =>
    source.effects.flatMap((effect) => {
      if (effect.type !== "settlementIncome") return [];
      return G.players[playerID].settlements.flatMap((tileId) => {
        const settlement = getTile(G, tileId)?.settlements.find((s) => s.owner === playerID);
        if (
          !settlement ||
          (effect.scope === "city" && settlement.kind === "colony") ||
          (effect.scope === "colony" && settlement.kind !== "colony")
        )
          return [];
        return [
          {
            resource: effect.resource,
            amount: effect.amount,
            label: source.label,
            settlementId: settlement.id,
          },
        ];
      });
    }),
  );
}
/** One line per Law. Manumission changes the existing slave count, with its extra
 * charge shown separately so the level's ledger still explains the total. */
export function getLawHappinessContributions(
  G: HegemonyState,
  playerID: PlayerId,
): Array<{ amount: number; label: string }> {
  const slaves = G.players[playerID].settlements.reduce(
    (sum, tileId) =>
      sum + (getTile(G, tileId)?.settlements.find((s) => s.owner === playerID)?.pops.slaves ?? 0),
    0,
  );
  const per = G.ruleset.economy.slavesPerUnhappiness;
  return getStandingEffectSources(G, playerID).flatMap((source) => {
    let amount = 0;
    let namesHappiness = false;
    for (const effect of source.effects) {
      if (effect.type === "happiness") {
        amount += effect.amount;
        namesHappiness = true;
      }
      if (effect.type === "rule" && effect.rule === "manumission") {
        amount -= per > 0 ? Math.floor((3 * slaves) / per) - Math.floor(slaves / per) : 0;
        namesHappiness = true;
      }
    }
    return namesHappiness ? [{ amount, label: source.label }] : [];
  });
}
export function getFoundColonyRiders(G: HegemonyState, playerID: PlayerId) {
  return getStandingEffectSources(G, playerID).flatMap((source) =>
    source.effects.flatMap((effect) =>
      effect.type === "onFoundColony"
        ? [{ grantPop: effect.grantPop, amount: effect.amount ?? 1, label: source.label }]
        : [],
    ),
  );
}

/** The effective card supplies shared rule wording, including content overrides. */
export function ruleLawText(rule: LawRule, content: import("../content").GameContent): string {
  return (
    content.resolutions.find(
      (card) =>
        card.kind === "law" &&
        card.effects.some((effect) => effect.type === "rule" && effect.rule === rule),
    )?.text ?? rule
  );
}
