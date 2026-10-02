import { collectIncome } from "./actions";
import { demotePop } from "./civic";
import { getAuthoredGameContent, getRiotTable } from "./content";
import { addLog, getPlayerName } from "./core/query";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import { rollOnTable } from "./tables";
import type { HegemonyState, PlayerId, PopType, RiotInsuranceId } from "./types";

/**
 * The riot flow (roadmap-appendix D9): the first event-table instance. When unrest
 * upkeep finds the level at the riot line it clears the realm's Unrest tokens and
 * parks a {@link PendingRiot} on the state — the turn BLOCKS (income deferred,
 * endTurn illegal) until the player declares insurance and rolls.
 *
 * All three insurance options may each be bought once per riot (max +3). Full
 * insurance makes a riot's pop losses impossible — deliberately: it converts
 * catastrophe into taxation. A revolt never comes here: it has no roll
 * (game/unrest.ts).
 */

/** The one pop the concession may demote: a citizen. */
export const CONCESSION_FROM: PopType = "citizens";

export function startRiot(G: HegemonyState, playerID: PlayerId) {
  // The riot spends the tokens that caused it, so unrest corrects itself.
  G.players[playerID].unrestTokens = 0;
  G.pendingRiot = { playerID, boughtInsurance: [] };
  addLog(
    G,
    `${getPlayerName(G, playerID)}'s province erupts — a riot must be faced before income is collected. Its Unrest tokens clear.`,
    playerID,
  );
}

export function getBuyRiotInsuranceStatus(
  G: HegemonyState,
  playerID: PlayerId,
  optionId: RiotInsuranceId,
): ActionStatus {
  const option = getRiotTable(G.definition.content).insurance?.find(
    (candidate) => candidate.id === optionId,
  );
  const reasons: string[] = [];

  if (!option) {
    return { can: false, reasons: ["No such insurance."] };
  }
  if (G.pendingRiot?.playerID !== playerID) reasons.push("No riot is pending.");
  if (G.pendingRiot?.boughtInsurance.includes(optionId))
    reasons.push("Already declared this riot.");
  if (!canAfford(G.players[playerID].resources, option.cost)) reasons.push("Can't afford it.");

  return { can: reasons.length === 0, reasons, cost: option.cost };
}

/**
 * Declare one insurance option before the die (+1 to the roll each). The concession's
 * price is a demotion instead of resources — free, the mob forces it (D8), and it must
 * be a citizen; pass the settlement via `demoteTarget`.
 */
export function buyRiotInsurance(
  G: HegemonyState,
  playerID: PlayerId,
  optionId: RiotInsuranceId,
  demoteTarget?: { tileId: string; from: PopType },
): MoveResult {
  const status = getBuyRiotInsuranceStatus(G, playerID, optionId);
  const option = getRiotTable(G.definition.content).insurance?.find(
    (candidate) => candidate.id === optionId,
  );

  if (!option || !status.can || !G.pendingRiot) {
    return invalid(...status.reasons);
  }

  if (option.demotesPop) {
    if (!demoteTarget || demoteTarget.from !== CONCESSION_FROM) {
      return invalid("The concession demands a citizen to demote.");
    }

    const demoted = demotePop(G, playerID, demoteTarget.tileId, demoteTarget.from);

    if (!demoted.ok) {
      return demoted;
    }
  } else {
    payCost(G.players[playerID].resources, option.cost);
  }

  G.pendingRiot.boughtInsurance.push(optionId);
  addLog(
    G,
    `${getPlayerName(G, playerID)} declares ${option.label} (+1 to the riot roll).`,
    playerID,
  );
  return MOVE_OK;
}

export function getResolveRiotStatus(G: HegemonyState, playerID: PlayerId): ActionStatus {
  const reasons: string[] = [];

  if (G.pendingRiot?.playerID !== playerID) reasons.push("No riot is pending.");

  return { can: reasons.length === 0, reasons };
}

/**
 * The roll bonus banked from declared insurance: the SUM of each bought option's
 * `modifier`, so the bonus is data-defined — set an option's modifier to 2 and it is
 * worth 2 on the die. All three ship at +1, so a full house is +3, but nothing
 * hardcodes that count. Shared with the RiotModal so the preview the player reads and
 * the roll that resolves can never disagree (post-sprint-debt §2.3).
 */
export function insuranceRollBonus(
  boughtInsurance: RiotInsuranceId[],
  content = getAuthoredGameContent(),
): number {
  return boughtInsurance.reduce((bonus, optionId) => {
    const option = getRiotTable(content).insurance?.find((candidate) => candidate.id === optionId);
    return bonus + (option?.modifier ?? 0);
  }, 0);
}

/**
 * Face the table: roll with insurance (+1 each). Pop losses take slaves first.
 * Resolving unblocks the turn and runs the deferred income collection.
 */
export function resolveRiot(G: HegemonyState, playerID: PlayerId): MoveResult {
  const status = getResolveRiotStatus(G, playerID);
  const pending = G.pendingRiot;

  if (!pending || !status.can) {
    return invalid(...status.reasons);
  }

  const { popsRemoved } = rollOnTable(G, playerID, getRiotTable(G.definition.content), {
    modifier: insuranceRollBonus(pending.boughtInsurance, G.definition.content),
  });

  G.players[playerID].popsLostToUnrest += popsRemoved;
  G.pendingRiot = null;
  collectIncome(G, playerID, "automatic");
  return MOVE_OK;
}
