import { currentWorkflow } from "./actors";
import { getLuxuryGood } from "./content";
import { PLAYER_IDS } from "./data";
import { allocateEntityId } from "./entity";
import { addLog, getPlayerName } from "./core/query";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import type {
  Deal,
  DealLoan,
  HegemonyState,
  LuxuryAsset,
  PlayerId,
  Resource,
  Resources,
  TradeTerms,
} from "./types";

/**
 * Standing deals (rules.md, Standing deals). A trade with yearly lines or lent goods
 * leaves a deal behind. Making it is the year's exchange for both seats. From the next
 * year each seat settles once a year at its own income, so a stock never moves on
 * another seat's turn: it pays its own line and takes what its partner has paid, the two
 * lines its income shows.
 *
 * A payment leaves its payer's stock and waits on the deal until its receiver's income.
 * So a seat takes only what was paid, and no stock comes from nowhere: the seat that
 * plays first in a year takes that year's payment at its next income. A seat short of its
 * line pays what it holds, and its partner chooses at its next income to take that and
 * pay in full, or to cancel the deal at once. Either seat may end a deal on its own turn:
 * the year runs out, then it closes. A closed deal stays on the state until what was paid
 * on it is taken.
 *
 * A lent good stays its owner's, for the Port rule and for trade; only the count moves
 * to the borrower ({@link holderOf}). A one-turn loan goes back at the end of the
 * borrower's next turn, or of this one when the borrower made the deal on it.
 */

/** Every stock a deal may repeat: the land's materials, gold and influence. */
export const DEAL_RESOURCES: readonly Resource[] = ["wood", "stone", "food", "gold", "influence"];

export function partnerIn(deal: Deal, seat: PlayerId): PlayerId {
  return deal.seats[0] === seat ? deal.seats[1] : deal.seats[0];
}

export function dealsOf(G: HegemonyState, seat: PlayerId): Deal[] {
  return G.deals.filter((deal) => deal.seats.includes(seat));
}

export function getDeal(G: HegemonyState, dealId: string): Deal | undefined {
  return G.deals.find((deal) => deal.id === dealId);
}

/** The loan of a good, with its deal, while it is lent. */
export function loanOf(G: HegemonyState, assetId: string): { deal: Deal; loan: DealLoan } | null {
  for (const deal of G.deals) {
    const loan = deal.loans.find((candidate) => candidate.assetId === assetId);
    if (loan) return { deal, loan };
  }
  return null;
}

/** The seat a good counts for: its borrower while it is lent, else its owner. */
export function holderOf(G: HegemonyState, asset: LuxuryAsset): PlayerId | null {
  return loanOf(G, asset.id)?.loan.borrower ?? asset.owner;
}

function hasAmounts(amounts: Partial<Resources> | undefined): boolean {
  return DEAL_RESOURCES.some((resource) => (amounts?.[resource] ?? 0) > 0);
}

/** Whether terms leave a deal behind: a yearly line or a lent good either way. */
export function isDealTerms(terms: TradeTerms): boolean {
  return (
    hasAmounts(terms.give.yearly) ||
    hasAmounts(terms.get.yearly) ||
    (terms.give.lent?.length ?? 0) > 0 ||
    (terms.get.lent?.length ?? 0) > 0
  );
}

/** Whether a deal settles in `year`: after the year it was made, up to the one it
 *  ends in. */
export function settlesIn(deal: Deal, year: number): boolean {
  return year > deal.madeYear && (deal.endsYear === null || year <= deal.endsYear);
}

/** The year of a seat's next income: this one, or the next once it has collected. */
export function nextIncomeYear(G: HegemonyState, seat: PlayerId): number {
  return G.players[seat].collectedThisTurn ? G.year + 1 : G.year;
}

/** A seat's place in a year's order of play. The opener moves on one seat each year. */
function placeIn(G: HegemonyState, year: number, seat: PlayerId): number {
  const seats = PLAYER_IDS.length;
  const opener = PLAYER_IDS.indexOf(G.yearOpener) + (year - G.year);
  return (((PLAYER_IDS.indexOf(seat) - opener) % seats) + seats) % seats;
}

/** What a seat takes at its next income: what waits for it, and its partner's line for
 *  each income the partner has before then. The line is the promise: a partner short of
 *  it pays less. */
export function dealReceipt(G: HegemonyState, deal: Deal, seat: PlayerId): Partial<Resources> {
  const partner = partnerIn(deal, seat);
  const takes = { ...deal.waiting[seat] };
  const mine = nextIncomeYear(G, seat);
  for (let year = nextIncomeYear(G, partner); year <= mine; year += 1) {
    const first = year < mine || placeIn(G, year, partner) < placeIn(G, year, seat);
    if (first && settlesIn(deal, year)) addAmounts(takes, deal.yearly[partner] ?? {});
  }
  return takes;
}

/** A deal line in a seat's income: a stock it pays or takes, at its next income. */
export type DealIncomeLine = {
  dealId: string;
  partner: PlayerId;
  resource: Resource;
  amount: number;
};

/** The lines a seat's deals add to its next income, what it pays then what it takes. */
export function dealIncomeLines(G: HegemonyState, seat: PlayerId): DealIncomeLine[] {
  const year = nextIncomeYear(G, seat);
  return dealsOf(G, seat).flatMap((deal) => {
    const partner = partnerIn(deal, seat);
    const pays = settlesIn(deal, year) ? (deal.yearly[seat] ?? {}) : {};
    const takes = dealReceipt(G, deal, seat);
    return [
      ...DEAL_RESOURCES.map((resource) => ({ resource, amount: -(pays[resource] ?? 0) })),
      ...DEAL_RESOURCES.map((resource) => ({ resource, amount: takes[resource] ?? 0 })),
    ]
      .filter((line) => line.amount !== 0)
      .map((line) => ({ ...line, dealId: deal.id, partner }));
  });
}

/** "2 food and 1 gold", or "nothing". */
export function describeAmounts(amounts: Partial<Resources>): string {
  const parts = DEAL_RESOURCES.filter((resource) => (amounts[resource] ?? 0) > 0).map(
    (resource) => `${amounts[resource]} ${resource}`,
  );
  return parts.length === 0 ? "nothing" : parts.join(" and ");
}

function addAmounts(into: Partial<Resources>, amounts: Partial<Resources>) {
  for (const resource of DEAL_RESOURCES) {
    const amount = amounts[resource] ?? 0;
    if (amount !== 0) into[resource] = (into[resource] ?? 0) + amount;
  }
}

/** Take `amounts` out of `from`, as far as it holds them. */
function removeAmounts(from: Partial<Resources>, amounts: Partial<Resources>) {
  for (const resource of DEAL_RESOURCES) {
    const left = (from[resource] ?? 0) - (amounts[resource] ?? 0);
    if (left > 0) from[resource] = left;
    else delete from[resource];
  }
}

/** A seat takes what waits for it on a deal. */
function takeWaiting(G: HegemonyState, deal: Deal, seat: PlayerId): Partial<Resources> {
  const taken = deal.waiting[seat] ?? {};
  delete deal.waiting[seat];
  const stocks = G.players[seat].resources;
  for (const resource of DEAL_RESOURCES) stocks[resource] += taken[resource] ?? 0;
  return taken;
}

/**
 * One seat's settlement: it pays its line from what it holds, and the payment waits for
 * its partner; then it takes what waits for it. A stock it holds too little of is paid as
 * far as it goes, and the shortfall waits on its partner's answer. Past the deal's last
 * year nothing is due, and the seat only takes.
 */
function settleSide(G: HegemonyState, deal: Deal, seat: PlayerId) {
  const partner = partnerIn(deal, seat);
  const stocks = G.players[seat].resources;
  const due = settlesIn(deal, G.year);
  const owed = due ? (deal.yearly[seat] ?? {}) : {};
  const paid: Partial<Resources> = {};
  const shortOwed: Partial<Resources> = {};
  const shortPaid: Partial<Resources> = {};
  for (const resource of DEAL_RESOURCES) {
    const line = owed[resource] ?? 0;
    if (line === 0) continue;
    const pays = Math.min(line, Math.max(0, stocks[resource]));
    stocks[resource] -= pays;
    paid[resource] = pays;
    if (pays < line) {
      shortOwed[resource] = line;
      shortPaid[resource] = pays;
    }
  }
  if (hasAmounts(paid)) {
    const waits = deal.waiting[partner] ?? {};
    addAmounts(waits, paid);
    deal.waiting[partner] = waits;
  }
  if (due) deal.settled[seat] = { year: G.year, paid };
  const receipt = takeWaiting(G, deal, seat);

  const name = getPlayerName(G, seat);
  const other = getPlayerName(G, partner);
  addLog(
    G,
    `${name} settles the deal with ${other}: pays ${describeAmounts(paid)}, takes ${describeAmounts(receipt)}.`,
    seat,
  );
  if (hasAmounts(shortOwed)) {
    const short = deal.short[seat] ?? { owed: {}, paid: {} };
    addAmounts(short.owed, shortOwed);
    addAmounts(short.paid, shortPaid);
    deal.short[seat] = short;
    addLog(
      G,
      `${name} could pay only ${describeAmounts(shortPaid)} of ${describeAmounts(shortOwed)} to ${other}.`,
      seat,
    );
  }
}

/** The deals waiting on a seat's answer to its partner's short payment: asked at its
 *  income, on its own turn. */
export function dealsAwaitingAnswer(G: HegemonyState, seat: PlayerId): Deal[] {
  if (currentWorkflow(G) !== "turn" || G.currentPlayer !== seat) return [];
  if (!G.players[seat].collectedThisTurn) return [];
  return dealsOf(G, seat).filter((deal) => deal.short[partnerIn(deal, seat)]);
}

/** A seat's income settles each of its deals due this year, and takes what waits for it
 *  on a closed one. A deal whose partner paid short waits for the seat's answer. */
export function settleDealsAtIncome(G: HegemonyState, seat: PlayerId) {
  for (const deal of dealsOf(G, seat)) {
    if (deal.short[partnerIn(deal, seat)]) continue;
    const due = settlesIn(deal, G.year) && !isClosedDeal(deal);
    if (due || hasAmounts(deal.waiting[seat])) settleSide(G, deal, seat);
  }
  dropSpentDeals(G);
}

/** Arm a seat's one-turn loans at its turn start: they go back at this turn's end. */
export function startLoanTurns(G: HegemonyState, seat: PlayerId) {
  for (const deal of G.deals) {
    for (const loan of deal.loans) {
      if (loan.length === "turn" && loan.borrower === seat && loan.turn === null) {
        loan.turn = G.turn;
      }
    }
  }
}

function loanReturnLine(G: HegemonyState, loan: DealLoan): string {
  const asset = G.board.luxuries.find((candidate) => candidate.id === loan.assetId);
  const owner = asset?.owner ? getPlayerName(G, asset.owner) : "the board";
  const name = asset ? getLuxuryGood(G.definition.content, asset.goodId)?.name : null;
  return `${name ?? loan.assetId} goes back from ${getPlayerName(G, loan.borrower)} to ${owner}.`;
}

/** Whether a deal has stopped: no line repeats and no good is lent. */
export function isClosedDeal(deal: Deal): boolean {
  return (
    deal.loans.length === 0 &&
    !hasAmounts(deal.yearly[deal.seats[0]]) &&
    !hasAmounts(deal.yearly[deal.seats[1]])
  );
}

/** A closed deal leaves the state once nothing paid on it waits to be taken. */
function dropSpentDeals(G: HegemonyState) {
  G.deals = G.deals.filter(
    (deal) =>
      !isClosedDeal(deal) ||
      hasAmounts(deal.waiting[deal.seats[0]]) ||
      hasAmounts(deal.waiting[deal.seats[1]]),
  );
}

/** A deal stops: its lent goods go back, no line repeats and no answer is owed. What
 *  was paid on it still waits for its receiver. */
function stopDeal(G: HegemonyState, deal: Deal) {
  deal.loans = [];
  deal.yearly = {};
  deal.short = {};
  deal.endsYear ??= G.year;
}

/** At a seat's turn end its one-turn loans of this turn go back; a deal left with
 *  nothing closes. */
export function returnLoansAtTurnEnd(G: HegemonyState, seat: PlayerId) {
  for (const deal of G.deals) {
    deal.loans = deal.loans.filter((loan) => {
      const back = loan.length === "turn" && loan.borrower === seat && loan.turn === G.turn;
      if (back) addLog(G, loanReturnLine(G, loan), seat);
      return !back;
    });
  }
  dropSpentDeals(G);
}

/** As the year turns, the deals ended in it close and their lent goods go back. Both
 *  seats have settled the year; the payment of the seat that played second still waits
 *  for its partner's next income. */
export function closeDealsAtYearEnd(G: HegemonyState) {
  for (const deal of G.deals) {
    if (deal.endsYear === null || deal.endsYear > G.year || isClosedDeal(deal)) continue;
    for (const loan of deal.loans) addLog(G, loanReturnLine(G, loan), loan.borrower);
    addLog(
      G,
      `The deal between ${getPlayerName(G, deal.seats[0])} and ${getPlayerName(G, deal.seats[1])} closes.`,
      deal.seats[0],
    );
    stopDeal(G, deal);
  }
  dropSpentDeals(G);
}

/** Whether a seat's payment of this year goes back to it if the deal closes now: it has
 *  paid this year and its partner has not. */
export function dealPaymentReturns(G: HegemonyState, deal: Deal, seat: PlayerId): boolean {
  const mine = deal.settled[seat];
  return (
    mine?.year === G.year &&
    deal.settled[partnerIn(deal, seat)]?.year !== G.year &&
    hasAmounts(mine.paid)
  );
}

/**
 * A deal closes at once, part-way through a year. A seat that has paid this year while
 * its partner has not gets that payment back: it waits for its own next income, where
 * its partner would have taken it. Payments both seats matched stay where they wait.
 */
function closeNow(G: HegemonyState, deal: Deal) {
  for (const seat of deal.seats) {
    if (!dealPaymentReturns(G, deal, seat)) continue;
    const partner = partnerIn(deal, seat);
    const mine = deal.settled[seat]!;
    removeAmounts((deal.waiting[partner] ??= {}), mine.paid);
    const back = deal.waiting[seat] ?? {};
    addAmounts(back, mine.paid);
    deal.waiting[seat] = back;
    addLog(
      G,
      `${getPlayerName(G, seat)}'s payment of ${describeAmounts(mine.paid)} goes back at its next income.`,
      seat,
    );
  }
  stopDeal(G, deal);
  dropSpentDeals(G);
}

/** A lent good that leaves its owner (its last Port beside it fell) ends its deal at
 *  once. */
export function endDealLending(G: HegemonyState, assetId: string) {
  const found = loanOf(G, assetId);
  if (!found) return;
  const [a, b] = found.deal.seats;
  addLog(
    G,
    `The deal between ${getPlayerName(G, a)} and ${getPlayerName(G, b)} ends: its lent good left its owner.`,
    a,
  );
  closeNow(G, found.deal);
}

/**
 * The deal a settled trade leaves, if any. The trade itself made this year's exchange.
 * A one-turn loan to the seat whose turn it is counts this turn and goes back at its end.
 */
export function makeDeal(G: HegemonyState, seat: PlayerId, partner: PlayerId, terms: TradeTerms) {
  if (!isDealTerms(terms)) return;
  const length = terms.lease ?? "standing";
  const onTurn = currentWorkflow(G) === "turn";
  const loan = (assetId: string, borrower: PlayerId): DealLoan => ({
    assetId,
    borrower,
    length,
    turn: length === "turn" && onTurn && borrower === G.currentPlayer ? G.turn : null,
  });
  const deal: Deal = {
    id: allocateEntityId(G, "deal"),
    seats: [seat, partner],
    yearly: {
      ...(hasAmounts(terms.give.yearly) ? { [seat]: { ...terms.give.yearly } } : {}),
      ...(hasAmounts(terms.get.yearly) ? { [partner]: { ...terms.get.yearly } } : {}),
    },
    loans: [
      ...(terms.give.lent ?? []).map((id) => loan(id, partner)),
      ...(terms.get.lent ?? []).map((id) => loan(id, seat)),
    ],
    madeYear: G.year,
    endsYear: null,
    short: {},
    waiting: {},
    settled: {},
  };
  G.deals.push(deal);
}

/** A seat ends a standing deal: the year runs out, then it closes. */
export function endDeal(G: HegemonyState, seat: PlayerId, dealId: string) {
  const deal = getDeal(G, dealId)!;
  deal.endsYear = G.year;
  addLog(
    G,
    `${getPlayerName(G, seat)} ends the deal with ${getPlayerName(G, partnerIn(deal, seat))}: it runs out with this year.`,
    seat,
  );
}

export function getDealShortfallStatus(
  G: HegemonyState,
  seat: PlayerId,
  dealId: string,
): ActionStatus {
  const deal = getDeal(G, dealId);
  const reason = !deal
    ? "No such deal."
    : !dealsAwaitingAnswer(G, seat).includes(deal)
      ? "No short payment waits on you."
      : null;
  return { can: reason === null, reasons: reason ? [reason] : [] };
}

/** The answer to a partner's short payment: take what it paid and pay in full, or
 *  cancel the deal at once. A cancelling seat pays nothing more and takes what was paid
 *  for the years it paid its own side. */
export function dealShortfall(
  G: HegemonyState,
  seat: PlayerId,
  dealId: string,
  keep: boolean,
): MoveResult {
  const status = getDealShortfallStatus(G, seat, dealId);
  if (!status.can) return invalid(...status.reasons);

  const deal = getDeal(G, dealId)!;
  const partner = partnerIn(deal, seat);
  if (!keep) {
    addLog(
      G,
      `${getPlayerName(G, seat)} cancels the deal with ${getPlayerName(G, partner)} over a short payment.`,
      seat,
    );
    closeNow(G, deal);
    const taken = takeWaiting(G, deal, seat);
    if (hasAmounts(taken)) {
      addLog(G, `${getPlayerName(G, seat)} takes ${describeAmounts(taken)} paid before.`, seat);
    }
    dropSpentDeals(G);
    return MOVE_OK;
  }
  delete deal.short[partner];
  settleSide(G, deal, seat);
  dropSpentDeals(G);
  return MOVE_OK;
}

/** Why the turn's seat cannot end its turn yet: a short payment waits on its answer. */
export function dealEndTurnReason(G: HegemonyState): string | null {
  const [deal] = dealsAwaitingAnswer(G, G.currentPlayer);
  return deal
    ? `Answer ${getPlayerName(G, partnerIn(deal, G.currentPlayer))}'s short payment first.`
    : null;
}

/** Every seat other than `seat`, for previews that need a partner. */
export function anyRival(seat: PlayerId): PlayerId {
  return PLAYER_IDS.find((id) => id !== seat)!;
}
