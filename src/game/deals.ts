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
 * Standing deals (docs/plans/trade-deals.md). A trade with yearly lines or lent goods
 * leaves a deal behind. Making it is the year's exchange for both seats. From the next
 * year each seat settles once a year at its own income, so a stock never moves on
 * another seat's turn: it pays its own line and takes its partner's, the two lines its
 * income shows. A seat short of its line pays what it holds, and its partner chooses at
 * its next income to take that and pay in full, or to cancel the deal at once. Either
 * seat may end a deal on its own turn: the year runs out, then it closes.
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

/** What a seat takes from its partner at its next settlement: the partner's line, with
 *  each stock it paid short of replaced by what it paid. */
export function dealReceipt(deal: Deal, seat: PlayerId): Partial<Resources> {
  const partner = partnerIn(deal, seat);
  const short = deal.short[partner];
  const line = { ...deal.yearly[partner] };
  if (!short) return line;
  for (const resource of DEAL_RESOURCES) {
    if ((short.owed[resource] ?? 0) > 0) line[resource] = short.paid[resource] ?? 0;
  }
  return line;
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
    if (!settlesIn(deal, year)) return [];
    const partner = partnerIn(deal, seat);
    const pays = deal.yearly[seat] ?? {};
    const takes = dealReceipt(deal, seat);
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

/**
 * One seat's settlement: it pays its line from what it holds and takes `receipt`. A
 * stock it holds too little of is paid as far as it goes, and the shortfall waits on its
 * partner's answer.
 */
function settleSide(G: HegemonyState, deal: Deal, seat: PlayerId, receipt: Partial<Resources>) {
  const partner = partnerIn(deal, seat);
  const stocks = G.players[seat].resources;
  const owed = deal.yearly[seat] ?? {};
  const paid: Partial<Resources> = {};
  const shortOwed: Partial<Resources> = {};
  const shortPaid: Partial<Resources> = {};
  for (const resource of DEAL_RESOURCES) {
    const due = owed[resource] ?? 0;
    if (due === 0) continue;
    const pays = Math.min(due, Math.max(0, stocks[resource]));
    stocks[resource] -= pays;
    paid[resource] = pays;
    if (pays < due) {
      shortOwed[resource] = due;
      shortPaid[resource] = pays;
    }
  }
  for (const resource of DEAL_RESOURCES) stocks[resource] += receipt[resource] ?? 0;

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

/** A seat's income settles each of its deals due this year, but one whose partner paid
 *  short: that waits for the seat's answer. */
export function settleDealsAtIncome(G: HegemonyState, seat: PlayerId) {
  for (const deal of dealsOf(G, seat)) {
    if (!settlesIn(deal, G.year) || deal.short[partnerIn(deal, seat)]) continue;
    settleSide(G, deal, seat, dealReceipt(deal, seat));
  }
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

function isSpent(deal: Deal): boolean {
  return (
    deal.loans.length === 0 &&
    !hasAmounts(deal.yearly[deal.seats[0]]) &&
    !hasAmounts(deal.yearly[deal.seats[1]])
  );
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
  G.deals = G.deals.filter((deal) => !isSpent(deal));
}

/** As the year turns, the deals ended in it close and their lent goods go back. */
export function closeDealsAtYearEnd(G: HegemonyState) {
  for (const deal of G.deals) {
    if (deal.endsYear === null || deal.endsYear > G.year) continue;
    for (const loan of deal.loans) addLog(G, loanReturnLine(G, loan), loan.borrower);
    addLog(
      G,
      `The deal between ${getPlayerName(G, deal.seats[0])} and ${getPlayerName(G, deal.seats[1])} closes.`,
      deal.seats[0],
    );
  }
  G.deals = G.deals.filter((deal) => deal.endsYear === null || deal.endsYear > G.year);
}

/** A deal closes at once: its lent goods go back and nothing more moves. */
function closeNow(G: HegemonyState, deal: Deal) {
  G.deals = G.deals.filter((open) => open.id !== deal.id);
}

/** A lent good that leaves its owner (its last Port beside it fell) ends its deal at
 *  once. */
export function endDealLending(G: HegemonyState, assetId: string) {
  const found = loanOf(G, assetId);
  if (!found) return;
  closeNow(G, found.deal);
  const [a, b] = found.deal.seats;
  addLog(
    G,
    `The deal between ${getPlayerName(G, a)} and ${getPlayerName(G, b)} ends: its lent good left its owner.`,
    a,
  );
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
 *  cancel the deal at once. */
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
    closeNow(G, deal);
    addLog(
      G,
      `${getPlayerName(G, seat)} cancels the deal with ${getPlayerName(G, partner)} over a short payment.`,
      seat,
    );
    return MOVE_OK;
  }
  const receipt = dealReceipt(deal, seat);
  delete deal.short[partner];
  settleSide(G, deal, seat, receipt);
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
