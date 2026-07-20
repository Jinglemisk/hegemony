import type { HegemonyState, PlayerId, PopType, Resource, Resources, SettlementKind } from "../types";
import { getTile } from "../core/query";
import { getResolutionCard, POLITICIANS } from "./deck";
import { politicianStandings } from "./power";
import type { LawCostedAction, LawEffect, SettlementScope } from "./types";

/**
 * The standing-modifier layer — the one genuinely new engine seam the Assembly needs
 * (design §3, §6.2).
 *
 * Every other content system in this engine applies its effects ONCE, at the moment a
 * card resolves. A Law does not: it is a patch that hangs over the ruleset until it is
 * repealed, so the income, cost, bank and happiness pipelines must CONSULT it every
 * time they compute. This module is that consultation — it turns `G.activeLaws` (plus
 * any patron buffs the reader has earned) into the small set of questions those
 * pipelines actually ask, and nothing else in the engine needs to know Laws exist.
 *
 * Two rules keep it honest:
 *   1. A Law is table-wide. Every active Law applies to EVERY player, including the
 *      seat that never voted for it — that is what makes a vote worth having.
 *   2. A patron buff is not. It applies only to the politician's patron, and only
 *      once that politician is dominant (§1.6).
 */

/** The scopes a settlement of each kind answers to. A capital IS a city for a Law's
 *  purposes, matching how `victoryMetricValue` already counts the "cities" metric. */
function matchesScope(kind: SettlementKind, scope: SettlementScope): boolean {
  if (scope === "all") {
    return true;
  }

  return scope === "colony" ? kind === "colony" : kind !== "colony";
}

/**
 * Every standing effect bearing on one player: the table-wide Laws, plus the patron
 * buffs of every politician this player is patron of and who has reached dominance.
 *
 * This is the ONE place the two sources are combined, so no pipeline can accidentally
 * honour Laws but forget buffs (or vice versa).
 */
export function getStandingEffects(G: HegemonyState, playerID: PlayerId): LawEffect[] {
  const effects: LawEffect[] = [];

  for (const active of G.activeLaws) {
    const card = getResolutionCard(active.cardId);

    if (card?.kind === "law") {
      effects.push(...card.effects);
    }
  }

  for (const standing of politicianStandings(G)) {
    if (standing.dominant && standing.patron === playerID) {
      effects.push(...standing.politician.patronBuff.effects);
    }
  }

  return effects;
}

/** How many of the player's settlements answer to a scope. */
function countSettlementsInScope(G: HegemonyState, playerID: PlayerId, scope: SettlementScope): number {
  let count = 0;

  for (const tileId of G.players[playerID].settlements) {
    const settlement = getTile(G, tileId)?.settlements.find((candidate) => candidate.owner === playerID);

    if (settlement && matchesScope(settlement.kind, scope)) {
      count += 1;
    }
  }

  return count;
}

/** How many pops of a type the player holds across every settlement. */
function countPops(G: HegemonyState, playerID: PlayerId, pop: PopType): number {
  let count = 0;

  for (const tileId of G.players[playerID].settlements) {
    const settlement = getTile(G, tileId)?.settlements.find((candidate) => candidate.owner === playerID);

    if (settlement) {
      count += settlement.pops[pop];
    }
  }

  return count;
}

/** `amount` is paid once per `step` whole units — so step 1 is the plain per-unit case
 *  and step 3 is "+1 per 3 citizens", floored. */
function scaled(count: number, amount: number, step: number | undefined): number {
  const divisor = step && step > 1 ? step : 1;
  return Math.floor(count / divisor) * amount;
}

export type LawIncomeContribution = {
  resource: Resource;
  amount: number;
  /** The Law (or patron buff) that produced it — becomes the income breakdown's source. */
  label: string;
};

/**
 * Every standing income / happiness modifier the player is under, as discrete
 * contributions the income breakdown can list line by line. `baseIncome` is the income
 * accumulated so far, which the surplus-conversion effect reads (a tariff on food can
 * only be assessed once the food income is known) — so this must be called AFTER the
 * settlement, building, seasonal and omen passes.
 */
export function getLawIncomeContributions(
  G: HegemonyState,
  playerID: PlayerId,
  baseIncome: Resources
): LawIncomeContribution[] {
  const contributions: LawIncomeContribution[] = [];
  const effects = getStandingEffects(G, playerID);

  if (effects.length === 0) {
    return contributions;
  }

  const label = (effect: LawEffect) => effectLabel(G, playerID, effect);

  for (const effect of effects) {
    switch (effect.type) {
      case "settlementIncome": {
        const count = countSettlementsInScope(G, playerID, effect.scope);
        contributions.push({
          resource: effect.resource,
          amount: scaled(count, effect.amount, effect.step),
          label: label(effect)
        });
        break;
      }
      case "popIncome": {
        const count = countPops(G, playerID, effect.pop);
        contributions.push({
          resource: effect.resource,
          amount: scaled(count, effect.amount, effect.step),
          label: label(effect)
        });
        break;
      }
      case "popPrimaryIncome": {
        // Paid into each settlement TILE's own material, so it must be assessed per
        // settlement — and it is dead on a yield-less tile (hill / oracle), exactly
        // like the base slave coefficient it patches.
        for (const tileId of G.players[playerID].settlements) {
          const tile = getTile(G, tileId);
          const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);
          const primary = tile?.resource?.type;

          if (!tile || !settlement || !primary) {
            continue;
          }

          contributions.push({
            resource: primary,
            amount: settlement.pops[effect.pop] * effect.amount,
            label: label(effect)
          });
        }
        break;
      }
      case "flatIncome":
        contributions.push({ resource: effect.resource, amount: effect.amount, label: label(effect) });
        break;
      case "thresholdHappiness": {
        const held = G.players[playerID].resources[effect.resource];
        contributions.push({
          resource: "happiness",
          amount: held >= effect.threshold ? effect.atOrAbove : effect.below,
          label: label(effect)
        });
        break;
      }
      default:
        break;
    }
  }

  // Surplus conversion runs LAST and reads the income as it now stands, including the
  // standing modifiers above — a tariff assessed on the harvest the Laws actually
  // produce, not on the pre-Law figure.
  const projected = { ...baseIncome };
  for (const contribution of contributions) {
    projected[contribution.resource] += contribution.amount;
  }

  for (const effect of effects) {
    if (effect.type !== "surplusConversion") {
      continue;
    }

    const surplus = projected[effect.from] - effect.above;

    if (surplus > 0) {
      contributions.push({
        resource: effect.to,
        amount: Math.floor(surplus / effect.per) * effect.amount,
        label: effectLabel(G, playerID, effect)
      });
    }
  }

  return contributions;
}

/** Which Law (or patron buff) an effect came from — for the income breakdown's source
 *  column, so a player can always trace a number back to the stele that caused it. */
function effectLabel(G: HegemonyState, playerID: PlayerId, effect: LawEffect): string {
  for (const active of G.activeLaws) {
    const card = getResolutionCard(active.cardId);

    if (card?.kind === "law" && card.effects.includes(effect)) {
      return card.name;
    }
  }

  for (const politician of POLITICIANS) {
    if (politician.patronBuff.effects.includes(effect)) {
      return `${politician.name}'s patronage`;
    }
  }

  return "Standing law";
}

/**
 * A Law's repricing of an action, as a patch to apply over the base cost. The
 * multiplier lands first (so "half, then −3" is unambiguous), then the deltas, and the
 * caller clamps at zero — matching how event discounts already behave in `cost.ts`.
 */
export function applyLawActionCost(
  G: HegemonyState,
  playerID: PlayerId,
  action: LawCostedAction,
  cost: Partial<Resources>,
  context: { scope?: SettlementScope; pop?: PopType; buildingId?: string } = {}
): Partial<Resources> {
  const effects = getStandingEffects(G, playerID);

  if (effects.length === 0) {
    return cost;
  }

  const adjusted: Partial<Resources> = { ...cost };

  for (const effect of effects) {
    if (effect.type === "actionCostMultiplier" && effect.action === action) {
      for (const [resource, amount] of Object.entries(adjusted) as Array<[Resource, number | undefined]>) {
        adjusted[resource] = Math.ceil((amount ?? 0) * effect.multiplier);
      }
    }
  }

  for (const effect of effects) {
    if (effect.type !== "actionCostDelta" || effect.action !== action) {
      continue;
    }

    // A narrowed effect only bites when the caller's context matches it. An absent
    // narrowing means "every case", so an unscoped Law applies everywhere.
    if (effect.scope && context.scope && !scopeOverlaps(effect.scope, context.scope)) {
      continue;
    }

    if (effect.pop && effect.pop !== context.pop) {
      continue;
    }

    if (effect.buildingIds && (!context.buildingId || !effect.buildingIds.includes(context.buildingId as never))) {
      continue;
    }

    // A reduction against a resource this action does not cost is simply a no-op.
    // Writing the clamped 0 in would put a phantom "0 food" line in the player's
    // cost preview (Grain Dole discounts food; the freeman promotion costs gold).
    // A positive delta may legitimately introduce a new cost (Tenant Rights adds
    // gold to a food-priced grow), so only the negative case is skipped.
    if (adjusted[effect.resource] === undefined && effect.amount < 0) {
      continue;
    }

    adjusted[effect.resource] = Math.max(0, (adjusted[effect.resource] ?? 0) + effect.amount);
  }

  // A free-action coupon zeroes the named resources outright — checked, not consumed,
  // here; `consumeLawFreeAction` spends it once the action actually commits.
  if (hasLawFreeAction(G, playerID, action)) {
    for (const resource of freeActionResources(effects, action)) {
      adjusted[resource] = 0;
    }
  }

  return adjusted;
}

function scopeOverlaps(a: SettlementScope, b: SettlementScope): boolean {
  return a === "all" || b === "all" || a === b;
}

function freeActionResources(effects: LawEffect[], action: LawCostedAction): Resource[] {
  const resources: Resource[] = [];

  for (const effect of effects) {
    if (effect.type === "yearlyFreeAction" && effect.action === action) {
      resources.push(...effect.resources);
    }
  }

  return resources;
}

/** True when the player still holds an unspent free-action coupon for this action. */
export function hasLawFreeAction(G: HegemonyState, playerID: PlayerId, action: LawCostedAction): boolean {
  if (G.players[playerID].lawFreeActionsUsedThisYear.includes(action)) {
    return false;
  }

  return getStandingEffects(G, playerID).some(
    (effect) => effect.type === "yearlyFreeAction" && effect.action === action
  );
}

/** Spend the year's free-action coupon. Called by the action AFTER it commits, so a
 *  refused move never burns the coupon. */
export function consumeLawFreeAction(G: HegemonyState, playerID: PlayerId, action: LawCostedAction) {
  if (hasLawFreeAction(G, playerID, action)) {
    G.players[playerID].lawFreeActionsUsedThisYear.push(action);
  }
}

/** A Law's shift to a bank rate, in whole steps in the trader's favour: a better sell
 *  rate needs FEWER materials per gold, a better buy rate needs fewer gold per material.
 *  Both clamp at 1 — no Law can make an exchange free. */
export function applyLawBankRate(
  G: HegemonyState,
  playerID: PlayerId,
  material: string,
  rate: { sell: number; buy: number }
): { sell: number; buy: number } {
  let steps = 0;

  for (const effect of getStandingEffects(G, playerID)) {
    if (effect.type === "bankRateStep" && effect.material === material) {
      steps += effect.steps;
    }
  }

  if (steps === 0) {
    return rate;
  }

  return {
    sell: Math.max(1, rate.sell - steps),
    buy: Math.max(1, rate.buy - steps)
  };
}

/** The riders a Law hangs on founding a colony (Frontier Spirit). */
export function getFoundColonyRiders(G: HegemonyState, playerID: PlayerId) {
  const riders: Array<{ grantPop?: PopType; happiness?: number; label: string }> = [];

  for (const effect of getStandingEffects(G, playerID)) {
    if (effect.type === "onFoundColony") {
      riders.push({
        grantPop: effect.grantPop,
        happiness: effect.happiness,
        label: effectLabel(G, playerID, effect)
      });
    }
  }

  return riders;
}
