import { votePurchaseLimit } from "../ideaRules";
import { applyUnrestTokenChange, describeUnrestTokenChange } from "../happiness";
import { PLAYER_IDS } from "../data";
import { yearDeckSize } from "../year";
import type { HegemonyState, PlayerId } from "../types";
import { addLog, getPlayerName, getTile } from "../core/query";
import { MOVE_OK, invalid } from "../core/results";
import type { MoveResult } from "../core/results";
import { shuffleWithSeed } from "../core/rng";
import { totalPops } from "../core/pops";
import { POLITICIANS } from "./deck";
import { hasLawRule, isPriceLaw } from "./laws";
import { getResolutionCard, getResolutionCards } from "../content";
import { getAuthoredGameContent } from "../content";
import type { GameContent } from "../content";
import type {
  AssemblyResult,
  AssemblySession,
  BallotItem,
  DirectiveCard,
  DirectiveEffect,
  PoliticianId,
  ResolutionCard,
} from "./types";

/**
 * The Assembly's flow (design §1.1–§1.5): cadence, the proposal round, the ballot,
 * and what a passed resolution does to the board.
 *
 * The whole session lives on `G.assembly`. While it is non-null the turn machine is
 * SUSPENDED — `endTurn` hands control here instead of opening the next turn, and
 * `closeAssembly` hands it back. The Assembly cannot be opened, skipped or dismissed
 * by a click, because no click is what put it on screen.
 */

// ── Cadence ───────────────────────────────────────────────────────────────────────

/** Every `everyYears` years, as the year opens, from the ruleset's first assembly year.
 *  `firstYear: 0` disables the whole subsystem, which is how the sim and the older
 *  test fixtures keep running an assembly-free game. */
export function shouldOpenAssembly(G: HegemonyState): boolean {
  const rules = G.ruleset.assembly;

  return (
    rules.firstYear > 0 &&
    G.phase === "gameplay" &&
    G.year >= rules.firstYear &&
    (G.year - rules.firstYear) % Math.max(1, rules.everyYears) === 0 &&
    !G.assembly
  );
}

/** The next sitting after this year; null when the Assembly is disabled. */
export function nextAssemblyYear(G: HegemonyState): number | null {
  const { firstYear, everyYears } = G.ruleset.assembly;
  if (firstYear === 0) return null;
  if (G.year < firstYear) return firstYear;
  const cadence = Math.max(1, everyYears);
  const next = firstYear + (Math.floor((G.year - firstYear) / cadence) + 1) * cadence;
  return next <= yearDeckSize(G) ? next : null;
}

/** Turn order for this year — the opener leads, and everyone plays once. */
function turnOrder(G: HegemonyState): PlayerId[] {
  const start = PLAYER_IDS.indexOf(G.yearOpener);
  return PLAYER_IDS.map((_, index) => PLAYER_IDS[(start + index) % PLAYER_IDS.length]);
}

/** The first seat still to finalize its proposal, in turn order; null when all are done. */
function firstUndecided(G: HegemonyState): PlayerId | null {
  const session = G.assembly!;
  return turnOrder(G).find((seat) => !session.proposalDone[seat]) ?? null;
}

/**
 * Keep `G.currentPlayer` pointed at whoever the Assembly is waiting on.
 *
 * In VOTING and CLOSING there is one such seat, and moving `currentPlayer` onto it
 * means every existing turn gate — the enumerator, the dispatcher, the UI's
 * `isActive`, the scoreboard highlight — works unchanged.
 *
 * PROPOSAL is asynchronous (owner ruling, 2026-07-20), so there is no single actor:
 * every undecided seat may act at once. We still park `currentPlayer` on the first
 * undecided seat so a headless driver has someone to play, but the UI does NOT gate on
 * it — it gates on {@link AssemblySession.proposalDone} for the viewer — and the
 * controller stops yanking the viewer to `currentPlayer` while the proposal round is
 * open, so the hotseat player can switch seats freely.
 */
function syncAssemblyActor(G: HegemonyState) {
  const session = G.assembly;

  if (!session) {
    return;
  }

  session.activePlayer =
    session.phase === "proposal"
      ? (firstUndecided(G) ?? session.resumePlayer)
      : session.phase === "voting"
        ? session.voteOrder[session.voteIndex]
        : session.resumePlayer;

  G.currentPlayer = session.activePlayer;
}

/**
 * Convene for secret player proposals only. With no proposals, the sitting closes.
 */
export function openAssembly(G: HegemonyState, resumePlayer: PlayerId) {
  const order = turnOrder(G);
  const perSeat = <T>(value: T) =>
    PLAYER_IDS.reduce((all, id) => ({ ...all, [id]: value }), {} as Record<PlayerId, T>);

  G.assembly = {
    year: G.year,
    phase: "proposal",
    activePlayer: order[0],
    held: perSeat(null),
    draws: perSeat(0),
    proposals: perSeat<BallotItem | null>(null),
    proposalDone: perSeat(false),
    ballot: [],
    ballotIndex: 0,
    votes: [],
    voteOrder: order,
    voteIndex: 0,
    bribesUsed: perSeat(0),
    results: [],
    // Isonomia names one rival at the previous Assembly and fixes only that seat's
    // base vote at one for this sitting.
    isonomiaTarget: G.pendingIsonomiaTarget,
    resumePlayer,
  };

  G.pendingIsonomiaTarget = null;
  G.assembliesHeld += 1;

  addLog(G, `The Assembly convenes for Year ${G.year}.`);

  if (G.assembly.isonomiaTarget) {
    addLog(
      G,
      `Isonomia binds ${getPlayerName(G, G.assembly.isonomiaTarget)} to one base vote at this Assembly.`,
      G.assembly.isonomiaTarget,
    );
  }

  syncAssemblyActor(G);
}

/**
 * Take the top card of a politician's deck, reshuffling their discards back in when it
 * runs dry. Cards leave a deck permanently only by being ENACTED — a discarded fish and
 * a voted-down proposal both return to the pile, or four seats fishing across a
 * seven-year game would strip the agora bare.
 */
function drawFromPoliticianDeck(G: HegemonyState, politician: PoliticianId): ResolutionCard | null {
  if (G.politicianDecks[politician].length === 0 && G.politicianDiscards[politician].length > 0) {
    const reshuffled = shuffleWithSeed(G.politicianDiscards[politician], G.rng);
    G.politicianDecks[politician] = reshuffled.cards;
    G.rng = reshuffled.state;
    G.politicianDiscards[politician] = [];
  }

  const cardId = G.politicianDecks[politician].shift();
  return cardId ? getResolutionCard(G.definition.content, cardId) : null;
}

function discardCard(G: HegemonyState, card: ResolutionCard) {
  G.politicianDiscards[card.politician].push(card.id);
}

// ── Proposal phase (async) ──────────────────────────────────────────────────────────
//
// Every seat acts independently and in secret. A seat may act as long as the phase is
// proposal and it has not yet finalized (proposalDone). There is no turn order here —
// the fairness the reverse-turn-order design guarded is now moot, because every seat
// draws simultaneously and nobody sees anyone else's card until the vote.

/** True when this seat may still draw/propose/pass this proposal round. */
function canAct(G: HegemonyState, playerID: PlayerId): boolean {
  const session = G.assembly;
  return Boolean(session && session.phase === "proposal" && !session.proposalDone[playerID]);
}

/** The once-per-sitting draw price. */
export function nextDrawCost(G: HegemonyState, _playerID: PlayerId): number {
  const session = G.assembly;

  if (!session) {
    return 0;
  }

  return G.ruleset.assembly.drawCost;
}

/**
 * Fish: pay influence, take one random card from a politician you CHOOSE, and look at
 * it in secret. Picking the politician but not the card preserves deck identity and
 * lets the seat pursue a particular author prize without cherry-picking an effect.
 */
export function getAssemblyDrawStatus(
  G: HegemonyState,
  playerID: PlayerId,
  politician: PoliticianId,
) {
  const price = nextDrawCost(G, playerID);
  const session = G.assembly;
  const reason = !canAct(G, playerID)
    ? "You have already spoken this sitting."
    : session!.held[playerID]
      ? "Resolve the held card first."
      : session!.draws[playerID] > 0
        ? "One draw per seat per sitting."
        : G.players[playerID].resources.influence < price
          ? `Requires ${price} influence.`
          : !G.politicianDecks[politician]?.length && !G.politicianDiscards[politician]?.length
            ? "That politician has no cards left to draw."
            : null;
  return { can: reason === null, reason, price, cost: { influence: price } };
}

export function assemblyDraw(
  G: HegemonyState,
  playerID: PlayerId,
  politician: PoliticianId,
): MoveResult {
  const session = G.assembly;

  const status = getAssemblyDrawStatus(G, playerID, politician);
  if (!status.can) return invalid(status.reason!);
  const cost = status.price;

  const card = drawFromPoliticianDeck(G, politician);

  if (!card) {
    return invalid("That politician has no cards left to draw.");
  }

  G.players[playerID].resources.influence -= cost;
  session!.draws[playerID] += 1;
  session!.held[playerID] = { card };
  addLog(
    G,
    `${getPlayerName(G, playerID)} paid ${cost} influence to sound out ${politicianName(politician)}.`,
    playerID,
  );
  return MOVE_OK;
}

/** Discard the draw. Its price is sunk; there is no second draw. */
export function assemblyDiscardHeld(G: HegemonyState, playerID: PlayerId): MoveResult {
  const session = G.assembly;

  if (!canAct(G, playerID) || !session!.held[playerID]) {
    return invalid();
  }

  discardCard(G, session!.held[playerID]!.card);
  session!.held[playerID] = null;
  addLog(G, `${getPlayerName(G, playerID)} set the drawn resolution aside.`, playerID);
  return MOVE_OK;
}

/** True when a new Law would automatically replace the oldest. */
export function isAtLawCap(G: HegemonyState): boolean {
  return G.activeLaws.length >= G.ruleset.assembly.lawCap;
}

/** Laws already standing — the set a proposal may not duplicate and a repeal must name. */
export function activeLawIds(G: HegemonyState): string[] {
  return G.activeLaws.map((law) => law.cardId);
}

/** A new Law survives this sitting and the sitting immediately after it. */
export function lawCanBeRemoved(G: HegemonyState, cardId: string): boolean {
  const law = G.activeLaws.find((active) => active.cardId === cardId);
  return Boolean(law && G.year > law.enactedYear + Math.max(1, G.ruleset.assembly.everyYears));
}
export function repealableLawIds(G: HegemonyState): string[] {
  return activeLawIds(G).filter((id) => lawCanBeRemoved(G, id));
}
/** Automatic casualties, recomputed when the vote resolves. At the cap the oldest
 * leaves; a new price Law also replaces the previous price Law. */
export function lawReplacementIds(G: HegemonyState, card: ResolutionCard): string[] {
  if (card.kind !== "law") return [];
  const ids: string[] = [];
  if (isAtLawCap(G)) {
    const oldest = [...G.activeLaws].sort((a, b) => a.order - b.order)[0];
    if (oldest) ids.push(oldest.cardId);
  }
  if (isPriceLaw(card)) {
    for (const law of G.activeLaws) {
      const standing = getResolutionCard(G.definition.content, law.cardId);
      if (standing && isPriceLaw(standing)) ids.push(law.cardId);
    }
  }
  return [...new Set(ids)];
}
export function lawProposalReason(G: HegemonyState, card: ResolutionCard): string | null {
  if (card.kind !== "law") return null;
  if (activeLawIds(G).includes(card.id)) return "That Law already stands.";
  if (lawReplacementIds(G, card).some((id) => !lawCanBeRemoved(G, id)))
    return "A Law this would replace is still in its minimum tenure.";
  return null;
}

export function assemblyPropose(
  G: HegemonyState,
  playerID: PlayerId,
  target?: PlayerId,
): MoveResult {
  const session = G.assembly;

  if (!canAct(G, playerID) || !session!.held[playerID]) {
    return invalid();
  }

  const card = session!.held[playerID]!.card;

  const reason = lawProposalReason(G, card);
  if (reason) return invalid(reason);

  if (
    card.kind === "directive" &&
    (!target || target === playerID || !PLAYER_IDS.includes(target))
  ) {
    return invalid("Choose one rival for this Directive.");
  }

  session!.proposals[playerID] = {
    kind: "enact",
    card,
    proposer: playerID,
    target: card.kind === "directive" ? target : undefined,
  };
  session!.held[playerID] = null;
  addLog(
    G,
    `${getPlayerName(G, playerID)} seals a resolution to lay before the Assembly.`,
    playerID,
  );
  finalizeProposal(G, playerID);
  return MOVE_OK;
}

/**
 * Propose striking a standing Law. It is voted like any other item (§1.4) — removing a
 * law is as political as passing one, so whoever a Law is hurting has to marshal a
 * coalition rather than simply buy their way out. It consumes the seat's one proposal.
 */
export function getAssemblyRepealStatus(G: HegemonyState, playerID: PlayerId, cardId?: string) {
  const price = G.ruleset.assembly.repealCost;
  const reason = !canAct(G, playerID)
    ? "You have already spoken this sitting."
    : cardId
      ? !lawCanBeRemoved(G, cardId)
        ? "That Law is absent or still in its minimum tenure."
        : null
      : repealableLawIds(G).length === 0
        ? "No standing Law can be repealed."
        : null;
  const blocked =
    reason ??
    (G.players[playerID].resources.influence < price ? `Requires ${price} influence.` : null);
  return { can: blocked === null, reason: blocked, price, cost: { influence: price } };
}

export function assemblyProposeRepeal(
  G: HegemonyState,
  playerID: PlayerId,
  cardId: string,
): MoveResult {
  const session = G.assembly;

  const status = getAssemblyRepealStatus(G, playerID, cardId);
  if (!status.can) return invalid(status.reason!);
  const cost = status.price;

  G.players[playerID].resources.influence -= cost;

  if (session!.held[playerID]) {
    discardCard(G, session!.held[playerID]!.card);
    session!.held[playerID] = null;
  }

  session!.proposals[playerID] = { kind: "repeal", cardId, proposer: playerID };
  addLog(
    G,
    `${getPlayerName(G, playerID)} moves to strike ${getResolutionCard(G.definition.content, cardId)?.name ?? cardId} from the record.`,
    playerID,
  );
  finalizeProposal(G, playerID);
  return MOVE_OK;
}

/** Say nothing this assembly. Always legal — a seat with no influence must still be
 *  able to reach the vote. */
export function assemblyPass(G: HegemonyState, playerID: PlayerId): MoveResult {
  const session = G.assembly;

  if (!canAct(G, playerID)) {
    return invalid();
  }

  if (session!.held[playerID]) {
    discardCard(G, session!.held[playerID]!.card);
    session!.held[playerID] = null;
  }

  session!.proposals[playerID] = null;
  addLog(G, `${getPlayerName(G, playerID)} holds their peace.`, playerID);
  finalizeProposal(G, playerID);
  return MOVE_OK;
}

/** Mark a seat done. When the last seat finalizes, the round closes and voting opens. */
function finalizeProposal(G: HegemonyState, playerID: PlayerId) {
  const session = G.assembly!;
  session.proposalDone[playerID] = true;

  if (turnOrder(G).every((seat) => session.proposalDone[seat])) {
    beginVoting(G);
    return;
  }

  syncAssemblyActor(G);
}

// ── Voting phase ──────────────────────────────────────────────────────────────────

/**
 * Assemble the ballot and open the vote. The proposals were secret and arrived in
 * whatever real-time order the seats acted; the ballot orders them deterministically —
 * each seat's proposal in turn order — so the vote sequence
 * never depends on who happened to click first.
 */
function beginVoting(G: HegemonyState) {
  const session = G.assembly!;

  session.ballot = [
    ...session.voteOrder
      .map((seat) => session.proposals[seat])
      .filter((item): item is BallotItem => item !== null),
  ];

  if (session.ballot.length === 0) {
    // Nothing was laid before the house — the agora rises without a vote.
    session.phase = "closing";
    addLog(G, "The Assembly rises with nothing on the bema.");
    syncAssemblyActor(G);
    return;
  }

  session.phase = "voting";
  session.ballotIndex = 0;
  session.votes = [];
  session.voteIndex = 0;
  addLog(
    G,
    `The Assembly turns to the ballot — ${session.ballot.length} resolution${session.ballot.length === 1 ? "" : "s"}, voted in turn.`,
  );
  syncAssemblyActor(G);
}

/** A seat's base voting strength: one plus their citizens, or exactly one when Isonomia names them. */
export function baseVoteWeight(G: HegemonyState, playerID: PlayerId): number {
  if (G.assembly?.isonomiaTarget === playerID) {
    return 1;
  }

  let citizens = 0;

  for (const tileId of G.players[playerID].settlements) {
    const settlement = getTile(G, tileId)?.settlements.find(
      (candidate) => candidate.owner === playerID,
    );

    if (settlement) {
      citizens += settlement.pops.citizens;
    }
  }

  const rural = hasLawRule(G, "ruralBloc")
    ? G.players[playerID].settlements.reduce((sum, tileId) => {
        const settlement = getTile(G, tileId)?.settlements.find((s) => s.owner === playerID);
        return sum + (settlement ? (settlement.kind === "colony" ? 1 : -1) : 0);
      }, 0)
    : 0;
  return Math.max(1, 1 + citizens + rural);
}

/** Votes bought so far plus the base — what this seat would cast right now. */
export function currentVoteWeight(G: HegemonyState, playerID: PlayerId): number {
  return baseVoteWeight(G, playerID) + (G.assembly?.bribesUsed[playerID] ?? 0);
}

/**
 * Buy a vote. Capped per player per assembly so a hoard cannot simply buy any outcome.
 */
export function getAssemblyBuyVoteStatus(
  G: HegemonyState,
  playerID: PlayerId,
  payment: "gold" | "influence",
) {
  const session = G.assembly;
  const rules = G.ruleset.assembly;
  const cost = { [payment]: rules.briberyCost };
  const reason =
    !session || session.phase !== "voting" || session.voteOrder[session.voteIndex] !== playerID
      ? "You can only buy votes when it is your turn to cast."
      : session.bribesUsed[playerID] >= votePurchaseLimit(G, playerID)
        ? `At most ${votePurchaseLimit(G, playerID)} votes bought per sitting.`
        : G.players[playerID].resources[payment] < rules.briberyCost
          ? `Requires ${rules.briberyCost} ${payment}.`
          : null;
  return { can: reason === null, reason, cost, price: rules.briberyCost };
}

export function assemblyBribe(
  G: HegemonyState,
  playerID: PlayerId,
  payment: "gold" | "influence",
): MoveResult {
  if (!["gold", "influence"].includes(payment)) return invalid("Choose gold or influence.");
  const status = getAssemblyBuyVoteStatus(G, playerID, payment);
  if (!status.can) return invalid(status.reason!);
  const session = G.assembly!;
  const rules = G.ruleset.assembly;

  G.players[playerID].resources[payment] -= rules.briberyCost;
  session.bribesUsed[playerID] += 1;
  addLog(
    G,
    `${getPlayerName(G, playerID)} buys a vote for ${rules.briberyCost} ${payment}.`,
    playerID,
  );
  return MOVE_OK;
}

/**
 * Cast openly and in turn — every vote is visible as it lands (§1.3). That makes the
 * last voter a kingmaker on close cards and invites live vote-trading, which is the
 * negotiation-friendly choice this design took deliberately.
 */
export function assemblyVote(G: HegemonyState, playerID: PlayerId, yea: boolean): MoveResult {
  const session = G.assembly;

  if (!session || session.phase !== "voting" || session.voteOrder[session.voteIndex] !== playerID) {
    return invalid("It is not your turn to vote.");
  }

  const bribed = session.bribesUsed[playerID];
  session.votes.push({
    playerID,
    yea,
    weight: baseVoteWeight(G, playerID) + bribed,
    bribed,
  });
  const weight = baseVoteWeight(G, playerID) + bribed;
  addLog(
    G,
    `${getPlayerName(G, playerID)} votes ${yea ? "yea" : "nay"} with ${weight} vote${weight === 1 ? "" : "s"}.`,
    playerID,
  );
  session.voteIndex += 1;

  if (session.voteIndex >= session.voteOrder.length) {
    resolveBallotItem(G);
  } else {
    syncAssemblyActor(G);
  }

  return MOVE_OK;
}

/** Tally, enact or reject, then move to the next item — or close the assembly. */
function resolveBallotItem(G: HegemonyState) {
  const session = G.assembly!;
  const item = session.ballot[session.ballotIndex];
  const yea = session.votes
    .filter((vote) => vote.yea)
    .reduce((total, vote) => total + vote.weight, 0);
  const nay = session.votes
    .filter((vote) => !vote.yea)
    .reduce((total, vote) => total + vote.weight, 0);
  // A tie fails. Earlier ballot items may make this proposal illegal.
  const blockedReason =
    item.kind === "repeal"
      ? lawCanBeRemoved(G, item.cardId)
        ? null
        : "The Law is absent or protected by minimum tenure."
      : lawProposalReason(G, item.card);
  const passed = yea > nay && blockedReason === null;

  const result: AssemblyResult = {
    item,
    passed,
    yea,
    nay,
    votes: [...session.votes],
    summary:
      yea > nay && blockedReason
        ? `The proposal cannot take effect. ${blockedReason}`
        : summarize(G, item, passed),
  };

  if (passed) {
    enact(G, item);
  } else {
    reject(G, item);
  }

  addLog(G, result.summary);
  session.results.push(result);
  session.ballotIndex += 1;
  session.votes = [];
  session.voteIndex = 0;

  if (session.ballotIndex >= session.ballot.length) {
    session.phase = "closing";
    addLog(G, "The Assembly rises.");
  }

  syncAssemblyActor(G);
}

function summarize(G: HegemonyState, item: BallotItem, passed: boolean): string {
  const name =
    item.kind === "repeal"
      ? (getResolutionCard(G.definition.content, item.cardId)?.name ?? item.cardId)
      : item.card.name;

  if (item.kind === "repeal") {
    return passed
      ? `${name} is struck from the record.`
      : `${name} survives the vote and still stands.`;
  }

  if (!passed) {
    return `${name} is voted down.`;
  }

  const reward = formatPrize(G.ruleset.assembly.prizes[item.card.politician]);
  const prize = reward ? ` ${getPlayerName(G, item.proposer!)} receives ${reward}.` : "";

  return item.card.kind === "law"
    ? `${name} is enacted — a new stele stands in the agora.${prize}`
    : `${name} carries against ${getPlayerName(G, item.target!)}.${prize}`;
}

function reject(G: HegemonyState, item: BallotItem) {
  if (item.kind === "enact") {
    discardCard(G, item.card);
  }
}

/** What a passing vote actually does to the board. */
function enact(G: HegemonyState, item: BallotItem) {
  if (item.kind === "repeal") {
    if (lawCanBeRemoved(G, item.cardId)) removeLaw(G, item.cardId);
    return;
  }

  if (item.card.kind === "directive") {
    if (!item.proposer || !item.target || item.target === item.proposer) {
      return;
    }
    applyDirective(G, item.card, item.target);
    // The monument is momentum, not a rule: it takes no cap slot and can never be
    // repealed, which is exactly why Stratokles's track only ever rises.
    G.tallyMonuments.push({
      cardId: item.card.id,
      author: item.proposer,
      enactedYear: G.year,
      order: G.lawOrder++,
    });
    discardCard(G, item.card);
    recordAuthoredPass(G, item.proposer, item.card.politician);
    return;
  }

  if (lawProposalReason(G, item.card)) return;
  for (const cardId of lawReplacementIds(G, item.card)) removeLaw(G, cardId);

  G.activeLaws.push({
    cardId: item.card.id,
    author: item.proposer,
    enactedYear: G.year,
    order: G.lawOrder++,
  });

  recordAuthoredPass(G, item.proposer, item.card.politician);
}

function recordAuthoredPass(G: HegemonyState, author: PlayerId, politician: PoliticianId) {
  const prize = G.ruleset.assembly.prizes[politician];

  for (const [resource, amount] of Object.entries(prize) as Array<
    [keyof HegemonyState["players"][PlayerId]["resources"], number | undefined]
  >) {
    if (amount) {
      G.players[author].resources[resource] += amount;
    }
  }

  // Voice is not paid here: it reads the standing Laws, so a passed Law counts for
  // its author while it stands and a Directive never does.
  G.assemblyPassedByPlayer[author] += 1;
}

function formatPrize(prize: Partial<HegemonyState["players"][PlayerId]["resources"]>): string {
  return Object.entries(prize)
    .filter(([, amount]) => Boolean(amount))
    .map(([resource, amount]) => `+${amount} ${resource}`)
    .join(", ");
}

/**
 * Apply a ballot item's board effect as if its vote had carried — enacts the Law (or
 * monument), resolves a Directive, or removes a repealed Law, exactly as a passing vote
 * does. Exposed for the sim's influence-aware bot, which calls it on a **clone** to score
 * "what if this resolution passed" without duplicating the enactment. Mutates `G`; never
 * call it on live state you mean to keep.
 */
export function enactForEval(G: HegemonyState, item: BallotItem): void {
  enact(G, item);
}

/** Take a Law off the board and return its card to its politician's discard pile, so
 *  the agora can debate it again in a later year. */
function removeLaw(G: HegemonyState, cardId: string) {
  const index = G.activeLaws.findIndex((law) => law.cardId === cardId);

  if (index === -1) {
    return;
  }

  G.activeLaws.splice(index, 1);
  const card = getResolutionCard(G.definition.content, cardId);

  if (card) {
    discardCard(G, card);
  }
}

// ── Directives ────────────────────────────────────────────────────────────────────

/** Resolve a Directive against the rival named on its ballot item. */
function applyDirective(G: HegemonyState, card: DirectiveCard, target: PlayerId) {
  for (const effect of card.effects) {
    applyDirectiveEffect(G, card, effect, target);
  }
}

function applyDirectiveEffect(
  G: HegemonyState,
  card: DirectiveCard,
  effect: DirectiveEffect,
  target: PlayerId,
) {
  switch (effect.type) {
    case "resourceDelta": {
      const resources = G.players[target].resources;
      const amount =
        effect.amount >= 0
          ? effect.amount
          : -Math.min(-effect.amount, Math.max(0, resources[effect.resource]));
      resources[effect.resource] += amount;
      addLog(G, `${card.name}: ${getPlayerName(G, target)} bears the decree.`, target);
      break;
    }

    case "unrestTokens": {
      const change = applyUnrestTokenChange(G, target, effect.change);
      addLog(
        G,
        `${card.name}: ${getPlayerName(G, target)} ${describeUnrestTokenChange(change)}.`,
        target,
      );
      break;
    }

    case "losePopFromLargest":
      loseFromLargestSettlement(G, target, effect.count, card.name);
      break;

    case "suppressIncome":
      G.players[target].incomeSuppressedTurns += effect.turns;
      addLog(G, `${card.name}: work stops in ${getPlayerName(G, target)}'s polis.`, target);
      break;

    case "repealNewestTargetLaw": {
      const newest = G.activeLaws
        .filter((law) => law.author === target)
        .sort((a, b) => b.order - a.order)[0];

      if (!newest || !lawCanBeRemoved(G, newest.cardId)) {
        addLog(
          G,
          `${card.name}: ${getPlayerName(G, target)} had no authored stele whose tenure had ended.`,
          target,
        );
        break;
      }

      removeLaw(G, newest.cardId);
      addLog(
        G,
        `${card.name}: ${getResolutionCard(G.definition.content, newest.cardId)?.name ?? newest.cardId} is thrown down.`,
      );
      break;
    }

    case "equalVotesNextAssembly":
      G.pendingIsonomiaTarget = target;
      addLog(
        G,
        `${card.name}: ${getPlayerName(G, target)} will have one base vote at the next Assembly.`,
        target,
      );
      break;
  }
}

/** Within the named rival's holdings, the mob takes from where there is most to take. */
function loseFromLargestSettlement(
  G: HegemonyState,
  playerID: PlayerId,
  count: number,
  source: string,
) {
  for (let removed = 0; removed < count; removed += 1) {
    let largestTileId: string | null = null;
    let largestSize = 0;

    for (const tileId of G.players[playerID].settlements) {
      const settlement = getTile(G, tileId)?.settlements.find(
        (candidate) => candidate.owner === playerID,
      );
      const size = settlement ? totalPops(settlement.pops) : 0;

      if (size > largestSize) {
        largestSize = size;
        largestTileId = tileId;
      }
    }

    if (!largestTileId) {
      return;
    }

    const settlement = getTile(G, largestTileId)!.settlements.find(
      (candidate) => candidate.owner === playerID,
    )!;
    // The mob takes the lowest rung first — the ones with least to lose riot hardest.
    const pop =
      settlement.pops.slaves > 0 ? "slaves" : settlement.pops.freemen > 0 ? "freemen" : "citizens";
    settlement.pops[pop] -= 1;
    G.players[playerID].popsLostToUnrest += 1;
    addLog(
      G,
      `${source}: ${getPlayerName(G, playerID)} loses a ${pop === "slaves" ? "slave" : pop === "freemen" ? "freeman" : "citizen"} to the mob.`,
      playerID,
    );
  }
}

function politicianName(politician: PoliticianId): string {
  return POLITICIANS.find((candidate) => candidate.id === politician)?.name ?? politician;
}

/** Every politician's deck, shuffled — built once at game creation. */
export function createPoliticianDecks(
  seed: number,
  content: GameContent = getAuthoredGameContent(),
): {
  decks: Record<PoliticianId, string[]>;
  discards: Record<PoliticianId, string[]>;
  rng: number;
} {
  let rng = seed >>> 0;
  const decks = {} as Record<PoliticianId, string[]>;
  const discards = {} as Record<PoliticianId, string[]>;

  for (const politician of POLITICIANS) {
    const shuffled = shuffleWithSeed(
      getResolutionCards(content)
        .filter((card) => card.politician === politician.id)
        .map((card) => card.id),
      rng,
    );
    decks[politician.id] = shuffled.cards;
    discards[politician.id] = [];
    rng = shuffled.state;
  }

  return { decks, discards, rng };
}

export type { AssemblySession, BallotItem, AssemblyResult };
