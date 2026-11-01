import { finishTurn } from "./turn";
import { demotePop } from "./civic";
import { getAuthoredGameContent, getRiotTable } from "./content";
import { formatPopName } from "./core/format";
import { addLog, getPlayerName } from "./core/query";
import { discardAtRandom } from "./devCards";
import { happinessLevel } from "./happiness";
import { canAfford, payCost } from "./core/resources";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import { describeRemoval, landedRow, nextPopLoss, removePops, rollOnTable } from "./tables";
import type {
  HegemonyState,
  PlayerId,
  PopLeave,
  PopType,
  RiotInsuranceId,
  RiotLosses,
  RiotPay,
} from "./types";

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
 *
 * A riot's card (docs/plans/development-deck.md): for each pop the landed row takes, a
 * seat holding a development card chooses to lose the pop or discard a held card drawn
 * at random, one pop at a time and before the card is picked. The riot waits on those
 * answers, then passes the turn. Stocks and buildings go as the row says.
 */

/** The one pop the concession may demote: a citizen. */
export const CONCESSION_FROM: PopType = "citizens";

export function startRiot(G: HegemonyState, playerID: PlayerId) {
  // The riot spends the tokens that caused it, so unrest corrects itself.
  const tokensCleared = G.players[playerID].unrestTokens;
  G.players[playerID].unrestTokens = 0;
  G.pendingRiot = {
    playerID,
    boughtInsurance: [],
    tokensCleared,
    concessionTileId: null,
    losses: null,
  };
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
  if (G.pendingRiot?.losses) reasons.push("The die is cast.");
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
  if (G.pendingRiot?.losses) reasons.push("The die is cast.");

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
  const table = getRiotTable(G.definition.content);
  return {
    lowest: landedRow(table, 1, modifier).modified,
    highest: landedRow(table, table.die ?? 6, modifier).modified,
  };
}

/**
 * Face the table: roll with insurance (+1 each). Stocks and buildings go at once; the
 * pops wait for the seat's answers while it holds a card it may give in their place,
 * and otherwise go at once, slaves first. The last answer completes the committed turn,
 * without another unrest check or income.
 */
export function resolveRiot(G: HegemonyState, playerID: PlayerId): MoveResult {
  const status = getResolveRiotStatus(G, playerID);
  const pending = G.pendingRiot;

  if (!pending || !status.can) {
    return invalid(...status.reasons);
  }

  const line = G.log.length;
  const { pops } = rollOnTable(G, playerID, getRiotTable(G.definition.content), {
    modifier: insuranceRollBonus(pending.boughtInsurance, G.definition.content),
  });
  pending.losses = { owed: pops, left: [], cards: [], line };
  return settleRiotLosses(G, playerID);
}

/** Whether the seat may give a held card in place of a riot's pop: the rule is on and
 *  it holds one. */
function canPayCard(G: HegemonyState, playerID: PlayerId): boolean {
  return G.ruleset.devCards.riotCard && G.devHands[playerID].length > 0;
}

export function getResolveRiotPopStatus(
  G: HegemonyState,
  playerID: PlayerId,
  pay: RiotPay,
): ActionStatus {
  const losses = G.pendingRiot?.playerID === playerID ? G.pendingRiot.losses : null;
  if (!losses || losses.owed === 0) return { can: false, reasons: ["No riot pop to answer."] };
  if (pay === "card" && !canPayCard(G, playerID))
    return { can: false, reasons: ["No held card to give up."] };
  return { can: true, reasons: [] };
}

/** The pop the riot takes next if the seat does not pay a card for it. */
export function riotPopNext(G: HegemonyState, playerID: PlayerId): PopLeave | null {
  return G.pendingRiot?.losses?.owed ? nextPopLoss(G, playerID) : null;
}

/**
 * Answer one pop the riot takes: lose it, or discard a held card drawn at random. The
 * choice comes first, so the seat never sees which card goes before it chooses. The
 * card is a discard, not a play.
 */
export function resolveRiotPop(G: HegemonyState, playerID: PlayerId, pay: RiotPay): MoveResult {
  const status = getResolveRiotPopStatus(G, playerID, pay);
  if (!status.can) return invalid(...status.reasons);

  const losses = G.pendingRiot!.losses!;
  if (pay === "pop") {
    takeRiotPops(G, playerID, losses, 1);
  } else {
    const kept = nextPopLoss(G, playerID);
    const card = discardAtRandom(G, playerID)!;
    losses.cards.push(card.id);
    addLog(
      G,
      `${getPlayerName(G, playerID)} gives up ${card.name} to the mob in place of ${kept ? `a ${formatPopName(kept.pop, 1)}` : "a pop"}.`,
      playerID,
    );
  }
  losses.owed -= 1;
  return settleRiotLosses(G, playerID);
}

/** Take `count` of the riot's pops, slaves first, each from the settlement holding the
 *  most. */
function takeRiotPops(G: HegemonyState, playerID: PlayerId, losses: RiotLosses, count: number) {
  const removed = removePops(G, playerID, count);
  if (removed.total > 0)
    addLog(G, `${getPlayerName(G, playerID)} — Lost ${describeRemoval(removed)}.`);
  losses.left.push(...removed.left);
}

/** Wait for the seat's answers while it may pay a card; otherwise take what is owed and
 *  close the riot. */
function settleRiotLosses(G: HegemonyState, playerID: PlayerId): MoveResult {
  const pending = G.pendingRiot!;
  const losses = pending.losses!;
  if (losses.owed > 0 && canPayCard(G, playerID)) return MOVE_OK;
  takeRiotPops(G, playerID, losses, losses.owed);
  losses.owed = 0;

  const record = G.lastTableRoll!;
  record.outcomes.push(...lossOutcomes(losses));
  G.players[playerID].popsLostToUnrest += losses.left.length;
  G.pendingRiot = null;
  // The roll's Chronicle line carries the riot as a moment, for the seat's result card
  // and the other seats' toast.
  G.log[losses.line].moment = {
    kind: "riot",
    roll: record.roll,
    modifier: record.modifier,
    modified: record.modified,
    rowLabel: record.rowLabel,
    outcomes: record.outcomes,
    left: losses.left,
    cards: losses.cards,
    insurance: pending.boughtInsurance,
    concessionTileId: pending.concessionTileId,
    tokensCleared: pending.tokensCleared,
    level: happinessLevel(G, playerID),
  };
  return finishTurn(G);
}

/** What the pops cost, in the record's words: those lost, then the cards given up. */
function lossOutcomes({ left, cards }: RiotLosses): string[] {
  const byType = { citizens: 0, freemen: 0, slaves: 0 };
  for (const { pop } of left) byType[pop] += 1;
  const n = cards.length;
  return [
    ...(left.length ? [`Lost ${describeRemoval({ byType })}.`] : []),
    ...(n
      ? [
          `${n === 1 ? "A held card" : `${n} held cards`} discarded in place of ${n === 1 ? "a pop" : "pops"}.`,
        ]
      : []),
  ];
}
