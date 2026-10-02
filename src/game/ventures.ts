import { getExpeditionTables } from "./content";
import { addLog, getPlayerName } from "./core/query";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import { rollOnTable } from "./tables";
import type { EventTableId, HegemonyState, PlayerId } from "./types";

/**
 * Stake 2 gold, choose an expedition, roll for a small windfall.
 * One venture per player per turn, open from turn 1.
 */

export function getFundExpeditionStatus(
  G: HegemonyState,
  playerID: PlayerId,
  expeditionId: EventTableId,
): ActionStatus {
  const cost = G.ruleset.ventureCost;
  const reasons: string[] = [];

  if (G.phase !== "gameplay") reasons.push("Expeditions sail during gameplay.");
  if (G.pendingPlayerEvent || G.pendingRiot) reasons.push("Resolve the pending event first.");
  if (!getExpeditionTables(G.definition.content).some((table) => table.id === expeditionId))
    reasons.push("No such expedition.");
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
): MoveResult {
  const status = getFundExpeditionStatus(G, playerID, expeditionId);
  const table = getExpeditionTables(G.definition.content).find(
    (candidate) => candidate.id === expeditionId,
  );

  if (!table || !status.can) {
    return invalid(...status.reasons);
  }

  const player = G.players[playerID];
  payCost(player.resources, status.cost ?? {});
  player.ventureUsedThisTurn = true;
  // Logs and the UI read the same cost.
  const stakeText = Object.entries(status.cost ?? {})
    .filter(([, amount]) => amount)
    .map(([resource, amount]) => `${amount} ${resource}`)
    .join(", ");
  addLog(
    G,
    `${getPlayerName(G, playerID)} stakes ${stakeText} to fund the ${table.name}.`,
    playerID,
  );
  rollOnTable(G, playerID, table);
  return MOVE_OK;
}
