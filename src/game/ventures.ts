import { EXPEDITION_TABLES } from "./data";
import { addLog, getPlayerName } from "./core/query";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import { rollOnTable } from "./tables";
import type { EventTableId, HegemonyState, PlayerId } from "./types";

/**
 * Ventures (roadmap-appendix D10/Q16): "Fund an Expedition" — stake gold or wood,
 * pick one of the three expedition tables, roll. Each table sits ≈ −7% EV in
 * gold-equivalents: the self-selecting catch-up casino. One venture per player per
 * turn, open from turn 1 — a catch-up mechanism must be reachable by whoever is behind.
 */

export type VentureStake = "gold" | "wood";

export function getFundExpeditionStatus(
  G: HegemonyState,
  playerID: PlayerId,
  expeditionId: EventTableId,
  stake: VentureStake
): ActionStatus {
  const cost = G.ruleset.ventureStakes[stake];
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("Expeditions sail during gameplay.");
  if (G.pendingPlayerEvent || G.pendingRiot) reasons.push("Resolve the pending event first.");
  if (!EXPEDITION_TABLES.some((table) => table.id === expeditionId)) reasons.push("No such expedition.");
  if (G.players[playerID].ventureUsedThisTurn) reasons.push("One venture per turn.");
  if (!canAfford(G.players[playerID].resources, cost)) reasons.push("Can't post the stake.");

  return { can: reasons.length === 0, reasons, cost };
}

/** Post the stake, sail, and let the table speak. The stake is spent win or lose —
 *  the payout rows are pure gain, so 1–2 IS "stake lost". */
export function fundExpedition(
  G: HegemonyState,
  playerID: PlayerId,
  expeditionId: EventTableId,
  stake: VentureStake
): MoveResult {
  const status = getFundExpeditionStatus(G, playerID, expeditionId, stake);
  const table = EXPEDITION_TABLES.find((candidate) => candidate.id === expeditionId);

  if (!table || !status.can) {
    return invalid(...status.reasons);
  }

  const player = G.players[playerID];
  payCost(player.resources, status.cost ?? {});
  player.ventureUsedThisTurn = true;
  // Read the stake back off the actual cost, not a literal — the amounts live in
  // ruleset.ventureStakes, and a hardcoded "5 gold" would drift the moment they change
  // (post-sprint-debt §2.6).
  const stakeText = Object.entries(status.cost ?? {})
    .filter(([, amount]) => amount)
    .map(([resource, amount]) => `${amount} ${resource}`)
    .join(", ");
  addLog(G, `${getPlayerName(G, playerID)} stakes ${stakeText} to fund the ${table.name}.`);
  rollOnTable(G, playerID, table);
  return MOVE_OK;
}
