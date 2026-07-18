import { getBuildings } from "./content";
import { formatPopName } from "./core/format";
import { addLog, getOwnedSettlement, getPlayerName, getTile } from "./core/query";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import type { HegemonyState, PlayerId, PopType, Resource, Resources, Settlement } from "./types";

/**
 * The civic verbs (roadmap-appendix D7/D8): calm the province, or move a pop up and
 * down the social ladder. Both are once-per-turn throttles — calm must not stack,
 * and the ladder is deliberately slower than growing pops.
 */

export type CivicCalmPayment = "influence" | "gold";

/** slaves→freemen and freemen→citizens climb; citizens→freemen and freemen→slaves fall. */
export const PROMOTE_FROM: Array<Extract<PopType, "slaves" | "freemen">> = ["slaves", "freemen"];
export const DEMOTE_FROM: Array<Extract<PopType, "citizens" | "freemen">> = ["citizens", "freemen"];

export function promotionTarget(from: PopType): PopType {
  return from === "slaves" ? "freemen" : "citizens";
}

export function demotionTarget(from: PopType): PopType {
  return from === "citizens" ? "freemen" : "slaves";
}

export function getCivicCalmStatus(G: HegemonyState, playerID: PlayerId, payment: CivicCalmPayment): ActionStatus {
  const rules = G.ruleset.civicCalm;
  const cost = payment === "influence" ? { influence: rules.influenceCost } : { gold: rules.goldCost };
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("Calm is a gameplay action.");
  if (G.pendingPlayerEvent || G.pendingRiot) reasons.push("Resolve the pending event first.");
  if (G.players[playerID].civicCalmUsedThisTurn) reasons.push("One civic-calm action per turn — calm must not stack.");
  if (!canAfford(G.players[playerID].resources, cost)) {
    reasons.push(payment === "influence" ? `Stabilizing takes ${rules.influenceCost} influence.` : `Bread & circuses cost ${rules.goldCost} gold.`);
  }

  return { can: reasons.length === 0, reasons, cost };
}

/** One `civicCalm` seam, two payments (D7): Stabilize Province (influence) or
 *  Bread & Circuses (gold), both +`happiness` and both burning the same shared throttle. */
export function civicCalm(G: HegemonyState, playerID: PlayerId, payment: CivicCalmPayment): MoveResult {
  const status = getCivicCalmStatus(G, playerID, payment);

  if (!status.can) {
    return invalid(...status.reasons);
  }

  const player = G.players[playerID];
  payCost(player.resources, status.cost ?? {});
  player.resources.happiness += G.ruleset.civicCalm.happiness;
  player.civicCalmUsedThisTurn = true;
  addLog(
    G,
    `${getPlayerName(G, playerID)} ${payment === "influence" ? "stabilized the province" : "staged bread & circuses"} (+${G.ruleset.civicCalm.happiness} happiness).`
  );
  return MOVE_OK;
}

/** Total promotion-cost reduction from a settlement's buildings (the Gymnasion) — the
 *  civic counterpart to the Granary's grow-pop food discount (economy/cost.ts). */
function settlementPromoteDiscount(settlement: Settlement): number {
  return settlement.buildings.reduce((sum, buildingId) => {
    const building = getBuildings().find((candidate) => candidate.id === buildingId);

    return (
      sum +
      (building?.effects ?? []).reduce(
        (effectSum, effect) => (effect.type === "promoteCostReduction" ? effectSum + effect.amount : effectSum),
        0
      )
    );
  }, 0);
}

/** Cut `discount` off whichever resource(s) a promotion costs, floored at zero. */
function discountPromoteCost(cost: Partial<Resources>, discount: number): Partial<Resources> {
  if (discount <= 0) {
    return { ...cost };
  }

  const out: Partial<Resources> = {};
  for (const [resource, amount] of Object.entries(cost) as Array<[Resource, number]>) {
    out[resource] = Math.max(0, amount - discount);
  }
  return out;
}

export function getPromotePopStatus(G: HegemonyState, playerID: PlayerId, tileId: string, from: PopType): ActionStatus {
  const settlement = getOwnedSettlement(G, tileId, playerID);
  const baseCost = G.ruleset.ladder.promoteCosts[from as "slaves" | "freemen"] ?? {};
  const cost = discountPromoteCost(baseCost, settlement ? settlementPromoteDiscount(settlement) : 0);
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("The ladder is a gameplay action.");
  if (G.pendingPlayerEvent || G.pendingRiot) reasons.push("Resolve the pending event first.");
  if (!PROMOTE_FROM.includes(from as "slaves" | "freemen")) reasons.push("Only slaves and freemen can rise.");
  if (G.players[playerID].ladderUsedThisTurn) reasons.push("One ladder move per turn.");
  if (!settlement || settlement.pops[from] < 1) reasons.push(`No ${formatPopName(from, 1)} there to promote.`);
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("Can't afford the promotion.");

  return { can: reasons.length === 0, reasons, cost };
}

export function getDemotePopStatus(G: HegemonyState, playerID: PlayerId, tileId: string, from: PopType): ActionStatus {
  // Demotion is FREE during your own riot (D8 — the mob forces it), and doesn't
  // burn the ladder throttle: the concession insurance rides on this rule.
  const duringOwnRiot = G.pendingRiot?.playerID === playerID;
  const cost = duringOwnRiot ? {} : (G.ruleset.ladder.demoteCosts[from as "citizens" | "freemen"] ?? {});
  const reasons: string[] = [];
  const settlement = getOwnedSettlement(G, tileId, playerID);

  if (G.phase !== "gameplay") reasons.push("The ladder is a gameplay action.");
  if (G.pendingPlayerEvent) reasons.push("Resolve the pending event first.");
  if (G.pendingRiot && !duringOwnRiot) reasons.push("Resolve the pending riot first.");
  if (!DEMOTE_FROM.includes(from as "citizens" | "freemen")) reasons.push("Only citizens and freemen can fall.");
  if (!duringOwnRiot && G.players[playerID].ladderUsedThisTurn) reasons.push("One ladder move per turn.");
  if (!settlement || settlement.pops[from] < 1) reasons.push(`No ${formatPopName(from, 1)} there to demote.`);
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("Can't afford the demotion.");

  return { can: reasons.length === 0, reasons, cost };
}

/** Climb one rung: slave→freeman (food) or freeman→citizen (gold). */
export function promotePop(G: HegemonyState, playerID: PlayerId, tileId: string, from: PopType): MoveResult {
  const status = getPromotePopStatus(G, playerID, tileId, from);
  const settlement = getOwnedSettlement(G, tileId, playerID);
  const tile = getTile(G, tileId);

  if (!settlement || !tile || !status.can) {
    return invalid(...status.reasons);
  }

  const to = promotionTarget(from);
  payCost(G.players[playerID].resources, status.cost ?? {});
  settlement.pops[from] -= 1;
  settlement.pops[to] += 1;
  G.players[playerID].ladderUsedThisTurn = true;
  addLog(
    G,
    `${getPlayerName(G, playerID)} promoted a ${formatPopName(from, 1)} to ${formatPopName(to, 1)} on ${tile.terrain}.`
  );
  return MOVE_OK;
}

/** Fall one rung: citizen→freeman or freeman→slave (influence; the freeman's fall
 *  also costs happiness). Free and throttle-exempt during your own riot. */
export function demotePop(G: HegemonyState, playerID: PlayerId, tileId: string, from: PopType): MoveResult {
  const status = getDemotePopStatus(G, playerID, tileId, from);
  const settlement = getOwnedSettlement(G, tileId, playerID);
  const tile = getTile(G, tileId);

  if (!settlement || !tile || !status.can) {
    return invalid(...status.reasons);
  }

  const duringOwnRiot = G.pendingRiot?.playerID === playerID;
  const to = demotionTarget(from);
  payCost(G.players[playerID].resources, status.cost ?? {});

  if (!duringOwnRiot) {
    G.players[playerID].resources.happiness -= G.ruleset.ladder.demoteHappinessPenalty[from as "citizens" | "freemen"];
    G.players[playerID].ladderUsedThisTurn = true;
  }

  settlement.pops[from] -= 1;
  settlement.pops[to] += 1;
  addLog(
    G,
    `${getPlayerName(G, playerID)} demoted a ${formatPopName(from, 1)} to ${formatPopName(to, 1)} on ${tile.terrain}${duringOwnRiot ? " — the mob demanded it" : ""}.`
  );
  return MOVE_OK;
}
