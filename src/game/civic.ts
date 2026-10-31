import { formatPopName } from "./core/format";
import { addLog, getOwnedSettlement, getPlayerName, getTile } from "./core/query";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import type { HegemonyState, PlayerId, PopType, Resources } from "./types";
import { applyLawActionCost, getStandingEffects } from "./assembly/laws";
import { pendingDecisionReasons } from "./status";

/**
 * The civic verbs (roadmap-appendix D7/D8): calm the province, or move a pop up and
 * down the social ladder. Both are once-per-turn throttles — calm must not stack,
 * and the ladder is deliberately slower than growing pops.
 */

export type CivicCalmPayment = "influence" | "gold";
export const CIVIC_CALM_PAYMENTS: CivicCalmPayment[] = ["influence", "gold"];

/** slaves→freemen and freemen→citizens climb; citizens→freemen and freemen→slaves fall. */
export const PROMOTE_FROM: Array<Extract<PopType, "slaves" | "freemen">> = ["slaves", "freemen"];
export const DEMOTE_FROM: Array<Extract<PopType, "citizens" | "freemen">> = ["citizens", "freemen"];

export function promotionTarget(from: PopType): PopType {
  return from === "slaves" ? "freemen" : "citizens";
}

export function demotionTarget(from: PopType): PopType {
  return from === "citizens" ? "freemen" : "slaves";
}

/** One calm payment's price: Festival Calendar turns the gold payment into food. */
export function getCalmCost(
  G: HegemonyState,
  playerID: PlayerId,
  payment: CivicCalmPayment,
): Partial<Resources> {
  const rules = G.ruleset.civicCalm;
  const foodPayment = getStandingEffects(G, playerID).find(
    (effect) => effect.type === "calmPayment",
  );
  return payment === "influence"
    ? { influence: rules.influenceCost }
    : foodPayment
      ? { food: foodPayment.amount }
      : { gold: rules.goldCost };
}

/** A promotion's price under standing Laws: Manumission makes a slave's free. */
export function getPromoteCost(
  G: HegemonyState,
  playerID: PlayerId,
  from: PopType,
): Partial<Resources> {
  const baseCost = G.ruleset.ladder.promoteCosts[from as "slaves" | "freemen"] ?? {};
  return applyLawActionCost(G, playerID, "promotePop", { ...baseCost }, { pop: from });
}

/** A demotion's price under standing Laws, outside the seat's own riot. */
export function getDemoteCost(
  G: HegemonyState,
  playerID: PlayerId,
  from: PopType,
): Partial<Resources> {
  const baseCost = G.ruleset.ladder.demoteCosts[from as "citizens" | "freemen"] ?? {};
  return applyLawActionCost(G, playerID, "demotePop", { ...baseCost }, { pop: from });
}

export function getCivicCalmStatus(
  G: HegemonyState,
  playerID: PlayerId,
  payment: CivicCalmPayment,
): ActionStatus {
  const cost = getCalmCost(G, playerID, payment);
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("Calm is a gameplay action.");
  reasons.push(...pendingDecisionReasons(G));
  if (G.players[playerID].civicCalmUsedThisTurn)
    reasons.push("One civic-calm action per turn — calm must not stack.");
  if (!canAfford(G.players[playerID].resources, cost)) {
    reasons.push("Not enough resources for calm.");
  }

  return { can: reasons.length === 0, reasons, cost };
}

/** One `civicCalm` seam, two payments: Stabilize Province (influence) or Bread &
 *  Circuses (gold). Both add `happiness` until the year turns and burn
 *  the same shared throttle. */
export function civicCalm(
  G: HegemonyState,
  playerID: PlayerId,
  payment: CivicCalmPayment,
): MoveResult {
  const status = getCivicCalmStatus(G, playerID, payment);

  if (!status.can) {
    return invalid(...status.reasons);
  }

  const player = G.players[playerID];
  payCost(player.resources, status.cost ?? {});
  // Calm is a level bonus for this year; the year boundary clears it.
  player.calmActive = true;
  player.civicCalmUsedThisTurn = true;
  addLog(
    G,
    `${getPlayerName(G, playerID)} ${payment === "influence" ? "stabilized the province" : "staged bread & circuses"} (+${G.ruleset.civicCalm.happiness} happiness this year).`,
    playerID,
  );
  return MOVE_OK;
}

export function getPromotePopStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  from: PopType,
): ActionStatus {
  const settlement = getOwnedSettlement(G, tileId, playerID);
  const cost = getPromoteCost(G, playerID, from);
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("The ladder is a gameplay action.");
  reasons.push(...pendingDecisionReasons(G));
  if (!PROMOTE_FROM.includes(from as "slaves" | "freemen"))
    reasons.push("Only slaves and freemen can rise.");
  if (G.players[playerID].ladderUsedThisTurn) reasons.push("One ladder move per turn.");
  if (!settlement || settlement.pops[from] < 1)
    reasons.push(`No ${formatPopName(from, 1)} there to promote.`);
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("Can't afford the promotion.");

  return { can: reasons.length === 0, reasons, cost };
}

export function getDemotePopStatus(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  from: PopType,
): ActionStatus {
  // Demotion is FREE during your own riot (D8 — the mob forces it), and doesn't
  // burn the ladder throttle: the concession insurance rides on this rule.
  const duringOwnRiot = G.pendingRiot?.playerID === playerID;
  const cost = duringOwnRiot ? {} : getDemoteCost(G, playerID, from);
  const reasons: string[] = [];
  const settlement = getOwnedSettlement(G, tileId, playerID);

  if (G.phase !== "gameplay") reasons.push("The ladder is a gameplay action.");
  if (!duringOwnRiot) reasons.push(...pendingDecisionReasons(G));
  if (!DEMOTE_FROM.includes(from as "citizens" | "freemen"))
    reasons.push("Only citizens and freemen can fall.");
  if (!duringOwnRiot && G.players[playerID].ladderUsedThisTurn)
    reasons.push("One ladder move per turn.");
  if (!settlement || settlement.pops[from] < 1)
    reasons.push(`No ${formatPopName(from, 1)} there to demote.`);
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("Can't afford the demotion.");

  return { can: reasons.length === 0, reasons, cost };
}

/** Climb one rung: slave→freeman (food) or freeman→citizen (gold). */
export function promotePop(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  from: PopType,
): MoveResult {
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
    `${getPlayerName(G, playerID)} promoted a ${formatPopName(from, 1)} to ${formatPopName(to, 1)} on ${tile.terrain}.`,
    playerID,
  );
  return MOVE_OK;
}

/** Fall one rung: citizen→freeman or freeman→slave, for influence. Free and
 *  throttle-exempt during your own riot. */
export function demotePop(
  G: HegemonyState,
  playerID: PlayerId,
  tileId: string,
  from: PopType,
): MoveResult {
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
    G.players[playerID].ladderUsedThisTurn = true;
  }

  settlement.pops[from] -= 1;
  settlement.pops[to] += 1;
  addLog(
    G,
    `${getPlayerName(G, playerID)} demoted a ${formatPopName(from, 1)} to ${formatPopName(to, 1)} on ${tile.terrain}${duringOwnRiot ? " — the mob demanded it" : ""}.`,
    playerID,
  );
  return MOVE_OK;
}
