import { collectIncome } from "./actions";
import { demotePop } from "./civic";
import { RIOT_TABLE } from "./data";
import { addLog, getPlayerName } from "./core/query";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import { rollOnTable } from "./tables";
import type { HegemonyState, PlayerId, PopType, RiotInsuranceId, RiotTier } from "./types";

/**
 * The riot flow (roadmap-appendix D9): the first event-table instance. When unrest
 * upkeep finds a riot threshold it parks a {@link PendingRiot} on the state instead
 * of removing pops — the turn BLOCKS (income deferred, endTurn illegal, the rulebook
 * removes pops before collection) until the player declares insurance and rolls.
 *
 * All three insurance options may each be bought once per riot (max +3). Full
 * insurance makes a mild riot's pop losses impossible — deliberately: it converts
 * catastrophe into taxation. The severe tier (−2, pop losses doubled) still bites.
 */

export function startRiot(G: HegemonyState, playerID: PlayerId, tier: RiotTier) {
  G.pendingRiot = { playerID, tier, boughtInsurance: [] };
  addLog(
    G,
    `${getPlayerName(G, playerID)}'s province erupts — a ${tier === "revolt" ? "revolt" : "riot"} must be faced before income is collected.`
  );
}

export function getBuyRiotInsuranceStatus(
  G: HegemonyState,
  playerID: PlayerId,
  optionId: RiotInsuranceId
): ActionStatus {
  const option = RIOT_TABLE.insurance?.find((candidate) => candidate.id === optionId);
  const reasons: string[] = [];

  if (!option) {
    return { can: false, reasons: ["No such insurance."] };
  }
  if (G.pendingRiot?.playerID !== playerID) reasons.push("No riot is pending.");
  if (G.pendingRiot?.boughtInsurance.includes(optionId)) reasons.push("Already declared this riot.");
  if (!canAfford(G.players[playerID].resources, option.cost)) reasons.push("Can't afford it.");

  return { can: reasons.length === 0, reasons, cost: option.cost };
}

/**
 * Declare one insurance option before the die (+1 to the roll each). The concession's
 * price is a demotion instead of resources — free, the mob forces it (D8); pass the
 * pop to sacrifice via `demoteTarget`.
 */
export function buyRiotInsurance(
  G: HegemonyState,
  playerID: PlayerId,
  optionId: RiotInsuranceId,
  demoteTarget?: { tileId: string; from: PopType }
): MoveResult {
  const status = getBuyRiotInsuranceStatus(G, playerID, optionId);
  const option = RIOT_TABLE.insurance?.find((candidate) => candidate.id === optionId);

  if (!option || !status.can || !G.pendingRiot) {
    return invalid(...status.reasons);
  }

  if (option.demotesPop) {
    if (!demoteTarget) {
      return invalid("The concession demands a pop to demote.");
    }

    const demoted = demotePop(G, playerID, demoteTarget.tileId, demoteTarget.from);

    if (!demoted.ok) {
      return demoted;
    }
  } else {
    payCost(G.players[playerID].resources, option.cost);
  }

  G.pendingRiot.boughtInsurance.push(optionId);
  addLog(G, `${getPlayerName(G, playerID)} declares ${option.label} (+1 to the riot roll).`);
  return MOVE_OK;
}

export function getResolveRiotStatus(G: HegemonyState, playerID: PlayerId): ActionStatus {
  const reasons: string[] = [];

  if (G.pendingRiot?.playerID !== playerID) reasons.push("No riot is pending.");

  return { can: reasons.length === 0, reasons };
}

/**
 * Face the table: roll with insurance (+1 each) and the tier (revolt: −2, pop losses
 * doubled, happiness rebounds to the ruleset's severeRebound; a mild riot never
 * rebounds — it can re-fire, which is what civic calm is for). Resolving unblocks the
 * turn and runs the deferred income collection.
 */
export function resolveRiot(G: HegemonyState, playerID: PlayerId): MoveResult {
  const status = getResolveRiotStatus(G, playerID);
  const pending = G.pendingRiot;

  if (!pending || !status.can) {
    return invalid(...status.reasons);
  }

  const severe = pending.tier === "revolt";
  const unrest = G.ruleset.economy.unrest;
  const { popsRemoved } = rollOnTable(G, playerID, RIOT_TABLE, {
    modifier: pending.boughtInsurance.length + (severe ? unrest.severeRollModifier : 0),
    popLossMultiplier: severe ? unrest.severePopLossMultiplier : 1
  });

  const player = G.players[playerID];
  player.popsLostToUnrest += popsRemoved;

  if (severe) {
    player.resources.happiness = G.ruleset.economy.unrest.severeRebound;
    addLog(G, `${getPlayerName(G, playerID)}'s happiness settles at ${G.ruleset.economy.unrest.severeRebound}.`);
  }

  G.pendingRiot = null;
  collectIncome(G, playerID, "automatic");
  return MOVE_OK;
}
