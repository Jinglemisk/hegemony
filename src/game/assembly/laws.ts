import { current, isDraft } from "immer";
import type {
  BuildingId,
  HegemonyState,
  MaterialResource,
  PlayerId,
  PopType,
  Resource,
  Resources,
  Settlement,
  SettlementKind,
} from "../types";
import type { Ruleset } from "../ruleset";
import { getResolutionCard } from "../content";
import { getTile, isCapital, realmPops } from "../core/query";
import { slaveUnhappiness } from "../happiness";
import type { LawCostedAction, LawEffect, ResolutionCard, SettlementScope } from "./types";
import type { GameContent } from "../content";
import type { ActiveLaw } from "./types";
import type { NationalIdeaOwnership } from "../ideaTypes";

export type StandingEffectSource = {
  kind: "law" | "idea";
  id: string;
  label: string;
  effects: LawEffect[];
};
type StandingQueries = { sources: StandingEffectSource[]; effects: LawEffect[] };
const lawQueries = new WeakMap<GameContent, WeakMap<ActiveLaw[], StandingQueries>>();
const seatQueries = new WeakMap<
  StandingQueries,
  WeakMap<NationalIdeaOwnership[], StandingQueries>
>();
function snapshot<T>(value: T): T {
  return isDraft(value) ? current(value) : value;
}
function query(sources: StandingEffectSource[]): StandingQueries {
  return { sources, effects: sources.flatMap((source) => source.effects) };
}

/** Only immutable inputs are memoized. Mutable fixtures and changed drafts are
 * derived afresh; no cache is written into game state. */
function lawQuery(G: HegemonyState): StandingQueries {
  const content = snapshot(G.definition.content);
  const activeLaws = snapshot(G.activeLaws);
  const cached = lawQueries.get(content)?.get(activeLaws);
  if (cached) return cached;
  const result = query(
    activeLaws.flatMap((active) => {
      const card = getResolutionCard(content, active.cardId);
      return card?.kind === "law"
        ? [{ kind: "law" as const, id: card.id, label: card.name, effects: card.effects }]
        : [];
    }),
  );
  if (
    Object.isFrozen(content) &&
    Object.isFrozen(content.resolutions) &&
    Object.isFrozen(activeLaws) &&
    activeLaws.every(Object.isFrozen)
  ) {
    let byLaws = lawQueries.get(content);
    if (!byLaws) lawQueries.set(content, (byLaws = new WeakMap()));
    byLaws.set(activeLaws, result);
  }
  return result;
}
function standingQuery(G: HegemonyState, playerID: PlayerId): StandingQueries {
  const laws = lawQuery(G);
  const content = snapshot(G.definition.content);
  const nationalIdeas = snapshot(G.players[playerID].nationalIdeas);
  const cached = seatQueries.get(laws)?.get(nationalIdeas);
  if (cached) return cached;
  const ideas: StandingEffectSource[] = nationalIdeas.flatMap((owned) => {
    const idea = content.nationalIdeas.find((i) => i.id === owned.id);
    return idea ? [{ kind: "idea", id: idea.id, label: idea.name, effects: idea.effects }] : [];
  });
  const result = query([...laws.sources, ...ideas]);
  if (
    Object.isFrozen(content.nationalIdeas) &&
    Object.isFrozen(nationalIdeas) &&
    nationalIdeas.every(Object.isFrozen)
  ) {
    let byIdeas = seatQueries.get(laws);
    if (!byIdeas) seatQueries.set(laws, (byIdeas = new WeakMap()));
    byIdeas.set(nationalIdeas, result);
  }
  return result;
}
/** A seat's standing effects: the table's Laws, then that seat's own Ideas. */
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
/** The table's standing effects: the Laws alone, the same for every seat. Colony
 *  capacity, pop income and the slave resource are read from these; every other
 *  effect is the seat's: the Laws plus its own Ideas. */
export function getLawEffects(G: HegemonyState): LawEffect[] {
  return lawQuery(G).effects.slice();
}
/** Whether a settlement of this kind is in the scope. An unnamed kind is only in "all". */
export function inScope(scope: SettlementScope, kind?: SettlementKind): boolean {
  return scope === "all" || (kind !== undefined && (scope === "colony") === (kind === "colony"));
}
/** A derived ruleset; never written into the match definition or persisted. */
export function effectiveRuleset(G: HegemonyState, kind?: SettlementKind): Ruleset {
  if (G.activeLaws.length === 0) return G.ruleset;
  const base = G.ruleset;
  const rules: Ruleset = {
    ...base,
    settlements: { ...base.settlements, colony: { ...base.settlements.colony } },
    popIncome: {
      citizens: { ...base.popIncome.citizens, flat: { ...base.popIncome.citizens.flat } },
      freemen: { ...base.popIncome.freemen, flat: { ...base.popIncome.freemen.flat } },
      slaves: { ...base.popIncome.slaves, flat: { ...base.popIncome.slaves.flat } },
    },
  };
  for (const effect of getLawEffects(G)) {
    if (effect.type === "colonyCapacity") rules.settlements.colony.popCapacity = effect.amount;
    if (effect.type === "popIncome" && inScope(effect.scope ?? "all", kind))
      rules.popIncome[effect.pop].flat[effect.resource] = effect.amount;
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
        if (!settlement || !inScope(effect.scope, settlement.kind)) return [];
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
/** How many times a slave counts for unrest where no standing effect weighs it. */
export const SLAVE_UNREST_WEIGHT = 1;
/** How many times one settlement may grow per turn where no standing effect sets it. */
export const GROWS_PER_TURN = 1;

/** How many times this seat's slaves count for unrest under its standing effects. */
export function slaveUnrestCount(G: HegemonyState, playerID: PlayerId): number {
  return (
    getStandingEffects(G, playerID).find((effect) => effect.type === "slaveUnrestWeight")?.amount ??
    SLAVE_UNREST_WEIGHT
  );
}
/** What working slaves make on any terrain under a standing Law, instead of their tile's. */
export function lawSlaveResource(G: HegemonyState): MaterialResource | undefined {
  return getLawEffects(G).find((effect) => effect.type === "slaveResource")?.resource;
}
/** The sources that forbid this seat new buildings of this kind. */
export function buildingForbiddenBy(
  G: HegemonyState,
  playerID: PlayerId,
  building: BuildingId,
): string[] {
  return getStandingEffectSources(G, playerID).flatMap((source) =>
    source.effects.some(
      (effect) => effect.type === "buildingForbidden" && effect.building === building,
    )
      ? [source.label]
      : [],
  );
}
/** How many buildings this seat's colonies may hold, and the source that allows it;
 *  null when they raise nothing but a colony building. */
export function colonyBuildingLimit(
  G: HegemonyState,
  playerID: PlayerId,
): { amount: number; label: string } | null {
  for (const source of getStandingEffectSources(G, playerID))
    for (const effect of source.effects)
      if (effect.type === "colonyBuildings") return { amount: effect.amount, label: source.label };
  return null;
}
/** How many colony pieces standing effects add to (or take from) this seat's limit. */
export function colonyLimitDelta(G: HegemonyState, playerID: PlayerId): number {
  return getStandingEffects(G, playerID).reduce(
    (n, effect) => n + (effect.type === "colonyLimit" ? effect.amount : 0),
    0,
  );
}
/** Votes standing effects add to (or take from) a seat's base for one of its settlements. */
export function settlementVoteDelta(
  G: HegemonyState,
  playerID: PlayerId,
  kind: SettlementKind,
): number {
  return getStandingEffects(G, playerID).reduce(
    (n, effect) =>
      n + (effect.type === "settlementVotes" && inScope(effect.scope, kind) ? effect.amount : 0),
    0,
  );
}
/** How many times this settlement may grow per turn, and the source that set it (null at
 *  the base). A later source overrides an earlier one. */
export function growLimit(
  G: HegemonyState,
  settlement: Settlement,
): { amount: number; label: string | null } {
  let limit: { amount: number; label: string | null } = { amount: GROWS_PER_TURN, label: null };
  for (const source of getStandingEffectSources(G, settlement.owner))
    for (const effect of source.effects)
      if (
        effect.type === "growLimit" &&
        (effect.scope === "colony"
          ? settlement.kind === "colony"
          : isCapital(G, settlement.owner, settlement.tileId))
      )
        limit = { amount: effect.amount, label: source.label };
  return limit;
}
/** Whether a standing effect leaves this owner's building idle: it stands and does nothing. */
export function buildingIdle(G: HegemonyState, owner: PlayerId, building: BuildingId): boolean {
  return getStandingEffects(G, owner).some(
    (effect) => effect.type === "buildingIdle" && effect.building === building,
  );
}
/** One line per Law. A slave weight (Manumission) changes the existing slave count, with
 * its extra charge shown separately so the level's ledger still explains the total. */
export function getLawHappinessContributions(
  G: HegemonyState,
  playerID: PlayerId,
): Array<{ amount: number; label: string }> {
  // The count the slave term uses: slaves on the move included.
  const { slaves } = realmPops(G, playerID);
  return getStandingEffectSources(G, playerID).flatMap((source) => {
    let amount = 0;
    let namesHappiness = false;
    for (const effect of source.effects) {
      if (effect.type === "happiness") {
        amount += effect.amount;
        namesHappiness = true;
      }
      if (effect.type === "slaveUnrestWeight") {
        amount -= slaveUnhappiness(G, effect.amount * slaves) - slaveUnhappiness(G, slaves);
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
