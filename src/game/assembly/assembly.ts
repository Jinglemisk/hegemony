import { PLAYER_IDS } from "../data";
import type { HegemonyState, PlayerId } from "../types";
import { isNewYear, yearOf } from "../core/calendar";
import { addLog, getPlayerName, getTile } from "../core/query";
import { MOVE_OK, invalid } from "../core/results";
import type { MoveResult } from "../core/results";
import { mulberry32, shuffleWithSeed } from "../core/rng";
import { totalPops } from "../core/pops";
import { getResolutionCard, POLITICIANS, RESOLUTION_DECKS } from "./deck";
import type {
  AssemblyResult,
  AssemblySession,
  BallotItem,
  BallotVote,
  DirectiveCard,
  DirectiveEffect,
  PoliticianId,
  ResolutionCard
} from "./types";

/**
 * The Assembly's flow (design §1.1–§1.5): cadence, the proposal round, the ballot,
 * and what a passed resolution does to the board.
 *
 * The whole session lives on `G.assembly`. While it is non-null the turn machine is
 * SUSPENDED — `endTurn` hands control here instead of opening the next turn, and
 * `closeAssembly` hands it back. That is the same engine-state gating the yearly omen
 * uses, one level up: the Assembly cannot be opened, skipped or dismissed by a click,
 * because no click is what put it on screen.
 */

// ── Cadence ───────────────────────────────────────────────────────────────────────

/** Annual, each spring, from the ruleset's first assembly year (design default: Year 2).
 *  `firstYear: 0` disables the whole subsystem, which is how the sim and the older
 *  test fixtures keep running an assembly-free game. */
export function shouldOpenAssembly(G: HegemonyState): boolean {
  const rules = G.ruleset.assembly;

  return (
    rules.firstYear > 0 &&
    G.phase === "gameplay" &&
    isNewYear(G.season) &&
    yearOf(G.season) >= rules.firstYear &&
    !G.assembly
  );
}

/** Turn order for this season — the opener leads, and everyone plays once. */
function turnOrder(G: HegemonyState): PlayerId[] {
  const start = PLAYER_IDS.indexOf(G.seasonOpener);
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
      ? firstUndecided(G) ?? session.resumePlayer
      : session.phase === "voting"
        ? session.voteOrder[session.voteIndex]
        : session.resumePlayer;

  G.currentPlayer = session.activePlayer;
}

/** Whose input the Assembly is waiting on, or null when it is not in session. */
export function assemblyActor(G: HegemonyState): PlayerId | null {
  return G.assembly?.activePlayer ?? null;
}

/**
 * Convene. One house card drops from a random politician's deck onto the ballot with
 * no author, so every assembly has something to argue about even if every seat passes;
 * then the seats fish and propose in REVERSE turn order (§1.3, fairness — the player
 * who acts last in the season speaks first in the agora).
 */
export function openAssembly(G: HegemonyState, resumePlayer: PlayerId) {
  const order = turnOrder(G);
  const houseCard = drawHouseCard(G);
  const perSeat = <T,>(value: T) =>
    PLAYER_IDS.reduce((all, id) => ({ ...all, [id]: value }), {} as Record<PlayerId, T>);

  G.assembly = {
    year: yearOf(G.season),
    season: G.season,
    phase: "proposal",
    activePlayer: order[0],
    houseItem: houseCard
      ? {
          kind: "enact",
          card: houseCard,
          proposer: null,
          replaces: houseCard.kind === "law" ? houseReplacementTarget(G) : undefined
        }
      : null,
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
    vetoUsed: perSeat(0),
    results: [],
    // Isonomia's legacy, set by a Directive passed at the PREVIOUS assembly and
    // consumed here — the demos got its equal vote exactly once.
    equalVotes: G.pendingIsonomia,
    resumePlayer
  };

  G.pendingIsonomia = false;
  G.assembliesHeld += 1;

  addLog(G, `The Assembly convenes for the spring of Year ${yearOf(G.season)}.`);

  if (houseCard) {
    addLog(G, `A house resolution is laid on the bema: ${houseCard.name}.`);
  }

  if (G.assembly.equalVotes) {
    addLog(G, "Isonomia stands: every player has exactly one vote at this assembly.");
  }

  syncAssemblyActor(G);
}

/**
 * The house card: a random politician's top card, drawn with the game's own PRNG so
 * the assembly is reproducible from the seed like every other draw.
 *
 * It must clear the SAME gate a proposed card clears. Nothing about being unauthored
 * exempts it: a house Law that duplicates a standing one would put the same stele on
 * the board twice — doubling its effects and its politician's power off a single card
 * — and one that ignores the cap would quietly take the board past its own ceiling.
 * A duplicate is discarded and redrawn; the cap is handled at the ballot, where the
 * house names its replacement like anyone else.
 */
function drawHouseCard(G: HegemonyState): ResolutionCard | null {
  const standing = activeLawIds(G);

  // Bounded: with 24 Laws and a cap of ~6 a clean draw is near-certain, but a rigged
  // or heavily-drained deck must not spin here.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const step = mulberry32(G.rng);
    G.rng = step.state;
    const politician = POLITICIANS[Math.floor(step.value * POLITICIANS.length)].id;
    const card = drawFromPoliticianDeck(G, politician) ?? drawFromAnyDeck(G);

    if (!card) {
      return null;
    }

    if (card.kind === "directive" || !standing.includes(card.id)) {
      return card;
    }

    // Already inscribed in the agora — back to the pile, and try again.
    discardCard(G, card);
  }

  return null;
}

/** The stele a house Law displaces when the board is already full. The OLDEST standing
 *  Law: with no author to make the choice, the house defers to age rather than picking
 *  a side, and the board self-manages instead of deadlocking. */
function houseReplacementTarget(G: HegemonyState): string | undefined {
  if (!isAtLawCap(G)) {
    return undefined;
  }

  return [...G.activeLaws].sort((a, b) => a.order - b.order)[0]?.cardId;
}

function drawFromAnyDeck(G: HegemonyState): ResolutionCard | null {
  for (const politician of POLITICIANS) {
    const card = drawFromPoliticianDeck(G, politician.id);

    if (card) {
      return card;
    }
  }

  return null;
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
  return cardId ? getResolutionCard(cardId) : null;
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

/** What a seat would pay for its next fish: the opening draw, then the redraw price for
 *  every card after it — the escalating sink is per-seat (§1.4). */
export function nextDrawCost(G: HegemonyState, playerID: PlayerId): number {
  const session = G.assembly;

  if (!session) {
    return 0;
  }

  const rules = G.ruleset.assembly;
  return session.draws[playerID] === 0 ? rules.drawCost : rules.redrawCost;
}

/**
 * Fish: pay influence, take one random card from a politician you CHOOSE, and look at
 * it in secret. Picking the politician but not the card is what keeps patronage
 * deliberate while outcomes stay varied and un-cherry-pickable (§1.3).
 */
export function assemblyDraw(G: HegemonyState, playerID: PlayerId, politician: PoliticianId): MoveResult {
  const session = G.assembly;

  if (!canAct(G, playerID)) {
    return invalid("You have already spoken this assembly.");
  }

  if (session!.held[playerID]) {
    return invalid("Discard or propose the card you are holding first.");
  }

  const cost = nextDrawCost(G, playerID);

  if (G.players[playerID].resources.influence < cost) {
    return invalid(`Drawing costs ${cost} influence.`);
  }

  const card = drawFromPoliticianDeck(G, politician);

  if (!card) {
    return invalid("That politician has no cards left to draw.");
  }

  G.players[playerID].resources.influence -= cost;
  session!.draws[playerID] += 1;
  session!.held[playerID] = { card, draws: session!.draws[playerID] };
  addLog(G, `${getPlayerName(G, playerID)} paid ${cost} influence to sound out ${politicianName(politician)}.`);
  return MOVE_OK;
}

/** Throw the fish back. Costs nothing by itself — the price is the next draw. */
export function assemblyDiscardHeld(G: HegemonyState, playerID: PlayerId): MoveResult {
  const session = G.assembly;

  if (!canAct(G, playerID) || !session!.held[playerID]) {
    return invalid();
  }

  discardCard(G, session!.held[playerID]!.card);
  session!.held[playerID] = null;
  addLog(G, `${getPlayerName(G, playerID)} set the drawn resolution aside.`);
  return MOVE_OK;
}

/** True when the board is full and a new Law must name one to replace (§1.5). */
export function isAtLawCap(G: HegemonyState): boolean {
  return G.activeLaws.length >= G.ruleset.assembly.lawCap;
}

/** Laws already standing — the set a proposal may not duplicate and a repeal must name. */
export function activeLawIds(G: HegemonyState): string[] {
  return G.activeLaws.map((law) => law.cardId);
}

/**
 * Put the held card on the ballot. At the Law cap the proposal must name an active Law
 * to replace, which is what keeps the board self-managing without deadlocking: the
 * agora can always accept a new idea, it just has to choose what to tear down for it.
 *
 * Directives never consume a cap slot (a tally monument is not a rule), so they never
 * need a replacement.
 */
export function assemblyPropose(G: HegemonyState, playerID: PlayerId, replaces?: string): MoveResult {
  const session = G.assembly;

  if (!canAct(G, playerID) || !session!.held[playerID]) {
    return invalid();
  }

  const card = session!.held[playerID]!.card;

  if (card.kind === "law" && activeLawIds(G).includes(card.id)) {
    return invalid(`${card.name} already stands on the board.`);
  }

  if (card.kind === "law" && isAtLawCap(G)) {
    if (!replaces || !activeLawIds(G).includes(replaces)) {
      return invalid("The board is full — name a standing Law this one would replace.");
    }
  }

  session!.proposals[playerID] = {
    kind: "enact",
    card,
    proposer: playerID,
    replaces: card.kind === "law" && isAtLawCap(G) ? replaces : undefined
  };
  session!.held[playerID] = null;
  addLog(G, `${getPlayerName(G, playerID)} seals a resolution to lay before the Assembly.`);
  finalizeProposal(G, playerID);
  return MOVE_OK;
}

/**
 * Propose striking a standing Law. It is voted like any other item (§1.4) — removing a
 * law is as political as passing one, so whoever a Law is hurting has to marshal a
 * coalition rather than simply buy their way out. It consumes the seat's one proposal.
 */
export function assemblyProposeRepeal(G: HegemonyState, playerID: PlayerId, cardId: string): MoveResult {
  const session = G.assembly;

  if (!canAct(G, playerID)) {
    return invalid();
  }

  if (!activeLawIds(G).includes(cardId)) {
    return invalid("That Law is not standing.");
  }

  const cost = G.ruleset.assembly.repealCost;

  if (G.players[playerID].resources.influence < cost) {
    return invalid(`Proposing a repeal costs ${cost} influence.`);
  }

  G.players[playerID].resources.influence -= cost;

  if (session!.held[playerID]) {
    discardCard(G, session!.held[playerID]!.card);
    session!.held[playerID] = null;
  }

  session!.proposals[playerID] = { kind: "repeal", cardId, proposer: playerID };
  addLog(G, `${getPlayerName(G, playerID)} moves to strike ${getResolutionCard(cardId)?.name ?? cardId} from the record.`);
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
  addLog(G, `${getPlayerName(G, playerID)} holds their peace.`);
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
 * the house card first, then each seat's proposal in turn order — so the vote sequence
 * never depends on who happened to click first.
 */
function beginVoting(G: HegemonyState) {
  const session = G.assembly!;

  session.ballot = [
    ...(session.houseItem ? [session.houseItem] : []),
    ...session.voteOrder.map((seat) => session.proposals[seat]).filter((item): item is BallotItem => item !== null)
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
    `The Assembly turns to the ballot — ${session.ballot.length} resolution${session.ballot.length === 1 ? "" : "s"}, voted in turn.`
  );
  syncAssemblyActor(G);
}

/** A seat's base voting strength: their citizens, or exactly one under Isonomia. */
export function baseVoteWeight(G: HegemonyState, playerID: PlayerId): number {
  if (G.assembly?.equalVotes) {
    return 1;
  }

  let citizens = 0;

  for (const tileId of G.players[playerID].settlements) {
    const settlement = getTile(G, tileId)?.settlements.find((candidate) => candidate.owner === playerID);

    if (settlement) {
      citizens += settlement.pops.citizens;
    }
  }

  return citizens;
}

/** Votes bought so far plus the base — what this seat would cast right now. */
export function currentVoteWeight(G: HegemonyState, playerID: PlayerId): number {
  return baseVoteWeight(G, playerID) + (G.assembly?.bribesUsed[playerID] ?? 0);
}

/**
 * Buy a vote. Capped per player per assembly (§1.4) so patronage flavours the vote
 * without letting a hoard buy any outcome outright — the cap is what stops influence
 * from simply becoming votes at scale.
 */
export function assemblyBribe(G: HegemonyState, playerID: PlayerId): MoveResult {
  const session = G.assembly;
  const rules = G.ruleset.assembly;

  if (!session || session.phase !== "voting" || session.voteOrder[session.voteIndex] !== playerID) {
    return invalid("You can only buy votes when it is your turn to cast.");
  }

  if (session.bribesUsed[playerID] >= rules.briberyCap) {
    return invalid(`You may buy at most ${rules.briberyCap} votes per assembly.`);
  }

  if (G.players[playerID].resources.influence < rules.briberyCost) {
    return invalid(`A vote costs ${rules.briberyCost} influence.`);
  }

  G.players[playerID].resources.influence -= rules.briberyCost;
  session.bribesUsed[playerID] += 1;
  addLog(G, `${getPlayerName(G, playerID)} buys a vote for ${rules.briberyCost} influence.`);
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
    bribed
  });
  const weight = baseVoteWeight(G, playerID) + bribed;
  addLog(
    G,
    `${getPlayerName(G, playerID)} votes ${yea ? "yea" : "nay"} with ${weight} vote${weight === 1 ? "" : "s"}.`
  );
  session.voteIndex += 1;

  if (session.voteIndex >= session.voteOrder.length) {
    resolveBallotItem(G, null);
  } else {
    syncAssemblyActor(G);
  }

  return MOVE_OK;
}

/**
 * Strike the resolution under vote outright, once per assembly. Spending it costs the
 * seat their own vote on the item — a veto is a walkout, not a free extra lever.
 */
export function assemblyVeto(G: HegemonyState, playerID: PlayerId): MoveResult {
  const session = G.assembly;
  const rules = G.ruleset.assembly;

  if (!session || session.phase !== "voting" || session.voteOrder[session.voteIndex] !== playerID) {
    return invalid("You can only veto when it is your turn to cast.");
  }

  if (session.vetoUsed[playerID] >= rules.vetoesPerAssembly) {
    return invalid("You have already used your veto this assembly.");
  }

  if (G.players[playerID].resources.influence < rules.vetoCost) {
    return invalid(`A veto costs ${rules.vetoCost} influence.`);
  }

  G.players[playerID].resources.influence -= rules.vetoCost;
  session.vetoUsed[playerID] += 1;
  addLog(G, `${getPlayerName(G, playerID)} vetoes the resolution before the house.`);
  resolveBallotItem(G, playerID);
  return MOVE_OK;
}

/** Tally, enact or reject, then move to the next item — or close the assembly. */
function resolveBallotItem(G: HegemonyState, vetoedBy: PlayerId | null) {
  const session = G.assembly!;
  const item = session.ballot[session.ballotIndex];
  const yea = session.votes.filter((vote) => vote.yea).reduce((total, vote) => total + vote.weight, 0);
  const nay = session.votes.filter((vote) => !vote.yea).reduce((total, vote) => total + vote.weight, 0);
  // Simple majority; a tie FAILS unless the ruleset says otherwise (§1.3).
  const passed = vetoedBy === null && (yea > nay || (yea === nay && G.ruleset.assembly.tiesPass && yea > 0));

  const result: AssemblyResult = {
    item,
    passed,
    yea,
    nay,
    votes: [...session.votes],
    vetoedBy: vetoedBy ?? undefined,
    summary: summarize(G, item, passed, vetoedBy)
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

function summarize(G: HegemonyState, item: BallotItem, passed: boolean, vetoedBy: PlayerId | null): string {
  const name = item.kind === "repeal" ? (getResolutionCard(item.cardId)?.name ?? item.cardId) : item.card.name;

  if (vetoedBy) {
    return `${getPlayerName(G, vetoedBy)} struck ${name} from the ballot.`;
  }

  if (item.kind === "repeal") {
    return passed ? `${name} is struck from the record.` : `${name} survives the vote and still stands.`;
  }

  if (!passed) {
    return `${name} is voted down.`;
  }

  return item.card.kind === "law"
    ? `${name} is enacted — a new stele stands in the agora.`
    : `${name} carries. The mob has its day.`;
}

function reject(G: HegemonyState, item: BallotItem) {
  if (item.kind === "enact") {
    discardCard(G, item.card);
  }
}

/** What a passing vote actually does to the board. */
function enact(G: HegemonyState, item: BallotItem) {
  if (item.kind === "repeal") {
    removeLaw(G, item.cardId);
    return;
  }

  if (item.card.kind === "directive") {
    applyDirective(G, item.card);
    // The monument is momentum, not a rule: it takes no cap slot and can never be
    // repealed, which is exactly why Stratokles's track only ever rises.
    G.tallyMonuments.push({
      cardId: item.card.id,
      author: item.proposer,
      enactedSeason: G.season,
      order: G.lawOrder++
    });
    discardCard(G, item.card);
    return;
  }

  if (item.replaces) {
    removeLaw(G, item.replaces);
  }

  G.activeLaws.push({
    cardId: item.card.id,
    author: item.proposer,
    enactedSeason: G.season,
    order: G.lawOrder++
  });
}

/** Take a Law off the board and return its card to its politician's discard pile, so
 *  the agora can debate it again in a later year. */
function removeLaw(G: HegemonyState, cardId: string) {
  const index = G.activeLaws.findIndex((law) => law.cardId === cardId);

  if (index === -1) {
    return;
  }

  G.activeLaws.splice(index, 1);
  const card = getResolutionCard(cardId);

  if (card) {
    discardCard(G, card);
  }
}

// ── Directives ────────────────────────────────────────────────────────────────────

/** Resolve a Directive: one-time, temporary, and it hits EVERY player at once. */
function applyDirective(G: HegemonyState, card: DirectiveCard) {
  for (const effect of card.effects) {
    applyDirectiveEffect(G, card, effect);
  }
}

function applyDirectiveEffect(G: HegemonyState, card: DirectiveCard, effect: DirectiveEffect) {
  switch (effect.type) {
    case "resourceDelta":
      for (const playerID of PLAYER_IDS) {
        const resources = G.players[playerID].resources;
        // Stocks clamp at zero; happiness is the one ledger that goes negative by
        // design (unrest), matching how event effects already behave.
        const amount =
          effect.resource === "happiness" || effect.amount >= 0
            ? effect.amount
            : -Math.min(-effect.amount, Math.max(0, resources[effect.resource]));
        resources[effect.resource] += amount;
      }
      addLog(G, `${card.name}: every polis feels it.`);
      break;

    case "resourceFraction":
      for (const playerID of PLAYER_IDS) {
        const resources = G.players[playerID].resources;
        const lost = Math.floor(Math.max(0, resources[effect.resource]) * effect.fraction);
        resources[effect.resource] -= lost;
      }
      addLog(G, `${card.name}: the storehouses are emptied.`);
      break;

    case "losePopFromLargest":
      for (const playerID of PLAYER_IDS) {
        loseFromLargestSettlement(G, playerID, effect.count, card.name);
      }
      break;

    case "suppressIncome":
      for (const playerID of PLAYER_IDS) {
        G.players[playerID].incomeSuppressedTurns += effect.turns;
      }
      addLog(G, `${card.name}: the work stops — no polis collects income next turn.`);
      break;

    case "repealNewestLaw": {
      const newest = [...G.activeLaws].sort((a, b) => b.order - a.order)[0];

      if (!newest) {
        addLog(G, `${card.name}: there was no stele left standing to break.`);
        break;
      }

      removeLaw(G, newest.cardId);
      addLog(G, `${card.name}: ${getResolutionCard(newest.cardId)?.name ?? newest.cardId} is thrown down.`);
      break;
    }

    case "equalVotesNextAssembly":
      G.pendingIsonomia = true;
      addLog(G, `${card.name}: at the next assembly every voice weighs the same.`);
      break;
  }
}

/** The mob takes from where there is most to take — the over-extended player pays the
 *  most, which is how a table-wide Directive levels without ever naming a target. */
function loseFromLargestSettlement(G: HegemonyState, playerID: PlayerId, count: number, source: string) {
  for (let removed = 0; removed < count; removed += 1) {
    let largestTileId: string | null = null;
    let largestSize = 0;

    for (const tileId of G.players[playerID].settlements) {
      const settlement = getTile(G, tileId)?.settlements.find((candidate) => candidate.owner === playerID);
      const size = settlement ? totalPops(settlement.pops) : 0;

      if (size > largestSize) {
        largestSize = size;
        largestTileId = tileId;
      }
    }

    if (!largestTileId) {
      return;
    }

    const settlement = getTile(G, largestTileId)!.settlements.find((candidate) => candidate.owner === playerID)!;
    // The mob takes the lowest rung first — the ones with least to lose riot hardest.
    const pop = settlement.pops.slaves > 0 ? "slaves" : settlement.pops.freemen > 0 ? "freemen" : "citizens";
    settlement.pops[pop] -= 1;
    G.players[playerID].popsLostToUnrest += 1;
    addLog(G, `${source}: ${getPlayerName(G, playerID)} loses a ${pop === "slaves" ? "slave" : pop === "freemen" ? "freeman" : "citizen"} to the mob.`);
  }
}

// ── Closing ───────────────────────────────────────────────────────────────────────

/** True once every ballot item has been resolved and the recap is on screen. */
export function isAssemblyClosing(G: HegemonyState): boolean {
  return G.assembly?.phase === "closing";
}

function politicianName(politician: PoliticianId): string {
  return POLITICIANS.find((candidate) => candidate.id === politician)?.name ?? politician;
}

/** Every politician's deck, shuffled — built once at game creation. */
export function createPoliticianDecks(seed: number): {
  decks: Record<PoliticianId, string[]>;
  discards: Record<PoliticianId, string[]>;
  rng: number;
} {
  let rng = seed >>> 0;
  const decks = {} as Record<PoliticianId, string[]>;
  const discards = {} as Record<PoliticianId, string[]>;

  for (const politician of POLITICIANS) {
    const shuffled = shuffleWithSeed(
      RESOLUTION_DECKS[politician.id].map((card) => card.id),
      rng
    );
    decks[politician.id] = shuffled.cards;
    discards[politician.id] = [];
    rng = shuffled.state;
  }

  return { decks, discards, rng };
}

export type { AssemblySession, BallotItem, BallotVote, AssemblyResult };
