import { finishTurn } from "./turn";
import { demotePop } from "./civic";
import { getAuthoredGameContent, getRiotTable } from "./content";
import { addLog, getPlayerName } from "./core/query";
import { happinessLevel } from "./happiness";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import { rollOnTable } from "./tables";
import type { HegemonyState, PlayerId, PopType, RiotInsuranceId } from "./types";

/**
 * The riot flow (roadmap-appendix D9): the first event-table instance. When unrest
 * at turn end finds the level at the riot line it clears the realm's Unrest tokens
 * and parks a {@link PendingRiot} on the state. Only insurance and the roll are
 * legal until resolution passes the committed turn.
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
  const tokensCleared = G.players[playerID].unrestTokens;
  G.players[playerID].unrestTokens = 0;
  G.pendingRiot = { playerID, boughtInsurance: [], tokensCleared, concessionTileId: null };
  addLog(
    G,
    `${getPlayerName(G, playerID)}'s province erupts at turn end — a riot must be faced before the turn passes. Its Unrest tokens clear.`,
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

    G.pendingRiot.concessionTileId = demoteTarget.tileId;
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

/** The rows a roll can land on with this modifier: the clamp keeps every roll on the
 *  table, so insurance puts the lowest rows out of reach. */
export function riotRollReach(
  G: HegemonyState,
  modifier: number,
): { lowest: number; highest: number } {
  const die = getRiotTable(G.definition.content).die ?? 6;
  const clamp = (roll: number) => Math.min(die, Math.max(1, roll));
  return { lowest: clamp(1 + modifier), highest: clamp(die + modifier) };
}

/**
 * Face the table: roll with insurance (+1 each). Pop losses take slaves first.
 * Resolving completes the committed turn, without another unrest check or income.
 * The roll's Chronicle line carries the riot as a moment, for the seat's result card
 * and the other seats' toast.
 */
export function resolveRiot(G: HegemonyState, playerID: PlayerId): MoveResult {
  const status = getResolveRiotStatus(G, playerID);
  const pending = G.pendingRiot;

  if (!pending || !status.can) {
    return invalid(...status.reasons);
  }

  const rollLine = G.log.length;
  const { record, popsRemoved, left } = rollOnTable(
    G,
    playerID,
    getRiotTable(G.definition.content),
    { modifier: insuranceRollBonus(pending.boughtInsurance, G.definition.content) },
  );

  G.players[playerID].popsLostToUnrest += popsRemoved;
  G.pendingRiot = null;
  G.log[rollLine].moment = {
    kind: "riot",
    roll: record.roll,
    modifier: record.modifier,
    modified: record.modified,
    rowLabel: record.rowLabel,
    outcomes: record.outcomes,
    left,
    insurance: pending.boughtInsurance,
    concessionTileId: pending.concessionTileId,
    tokensCleared: pending.tokensCleared,
    level: happinessLevel(G, playerID),
  };
  return finishTurn(G);
}
