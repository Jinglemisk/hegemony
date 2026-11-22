import { produce } from "immer";
import { currentWorkflow } from "./actors";
import { TRADABLE_MATERIALS } from "./bank";
import { calculateIncome } from "./economy/income";
import { standingHappiness } from "./happiness";
import { getLuxuryGood } from "./content";
import { PLAYER_IDS } from "./data";
import { allocateEntityId } from "./entity";
import { hasPortBeside, luxuryName, transferLuxury } from "./luxury";
import { anyRival, endDeal, getDeal, loanOf, makeDeal } from "./deals";
import { settlementRoom } from "./settlement";
import { formatPops } from "./core/format";
import { EMPTY_POPS, POP_TYPES, clonePops, hasPops, subtractPops, totalPops } from "./core/pops";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import type {
  Deal,
  HegemonyState,
  LeaseLength,
  PlayerId,
  Pops,
  Resource,
  Resources,
  TradableMaterial,
  TradeAnswer,
  TradeBundle,
  TradeOffer,
  TradePlaces,
  TradeReply,
  TradeTerms,
} from "./types";

/**
 * Player trade (docs/plans/player-trade.md). An offer goes to the table or to named
 * seats. The first named seat to accept trades: settlement rechecks both sides and
 * moves everything at once, and the offer closes. A counter waits for the offering
 * seat to take it, and dies with the offer if another seat accepts first. Offers are
 * public but for the held cards a giver picks, which projections hide: an offer names how
 * many cards, never which. Yearly lines and lent goods leave a standing deal behind
 * (deals.ts); their first exchange is part of the trade.
 */

/** Every stock trades. */
export const TRADE_RESOURCES: readonly Resource[] = ["wood", "stone", "food", "gold", "influence"];

export function emptyBundle(): TradeBundle {
  return { resources: {}, goods: [], pops: clonePops(EMPTY_POPS), cards: 0 };
}

export function isEmptyBundle(bundle: TradeBundle): boolean {
  return (
    TRADE_RESOURCES.every(
      (resource) =>
        (bundle.resources[resource] ?? 0) === 0 && (bundle.yearly?.[resource] ?? 0) === 0,
    ) &&
    bundle.goods.length === 0 &&
    (bundle.lent?.length ?? 0) === 0 &&
    totalPops(bundle.pops) === 0 &&
    bundle.cards === 0
  );
}

/** The stocks a side hands over now: its one-off stocks and its first yearly line. */
export function nowResources(bundle: TradeBundle): Partial<Resources> {
  return Object.fromEntries(
    TRADE_RESOURCES.map((resource) => [
      resource,
      (bundle.resources[resource] ?? 0) + (bundle.yearly?.[resource] ?? 0),
    ]),
  );
}

function bundleShapeReason(bundle: TradeBundle): string | null {
  const keys = Object.keys(bundle.resources) as Resource[];
  const yearly = Object.keys(bundle.yearly ?? {}) as Resource[];
  if ([...keys, ...yearly].some((key) => !TRADE_RESOURCES.includes(key))) {
    return "Unknown resource.";
  }
  const counts = [
    ...keys.map((key) => bundle.resources[key] ?? 0),
    ...yearly.map((key) => bundle.yearly?.[key] ?? 0),
    ...POP_TYPES.map((pop) => bundle.pops[pop]),
    bundle.cards,
  ];
  if (counts.some((count) => !Number.isInteger(count) || count < 0)) {
    return "Counts are whole numbers.";
  }
  const goods = [...bundle.goods, ...(bundle.lent ?? [])];
  if (new Set(goods).size !== goods.length) return "A good is named twice.";
  return null;
}

const LEASE_LENGTHS: readonly LeaseLength[] = ["turn", "standing"];

/** Why terms cannot be offered at all, whoever holds what: each side gives at least
 *  one thing (no gifts), counts are whole, and goods are real. */
function termsReason(G: HegemonyState, terms: TradeTerms): string | null {
  const shape = bundleShapeReason(terms.give) ?? bundleShapeReason(terms.get);
  if (shape) return shape;
  if (terms.lease !== undefined && !LEASE_LENGTHS.includes(terms.lease)) {
    return "Unknown lease length.";
  }
  if (isEmptyBundle(terms.give) || isEmptyBundle(terms.get)) {
    return "Each side gives at least one thing.";
  }
  const goods = [
    ...terms.give.goods,
    ...terms.get.goods,
    ...(terms.give.lent ?? []),
    ...(terms.get.lent ?? []),
  ];
  if (new Set(goods).size !== goods.length) return "A good is named on both sides.";
  if (!goods.every((id) => G.board.luxuries.some((asset) => asset.id === id))) {
    return "No such luxury good.";
  }
  return null;
}

/** Owned settlements holding all of `pops`, any of which they could leave from. */
export function tradePopSources(G: HegemonyState, seat: PlayerId, pops: Pops): string[] {
  return G.players[seat].settlements.filter((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, seat);
    return settlement !== undefined && hasPops(settlement.pops, pops);
  });
}

/** Owned settlements with room for `pops`, counting pops already on the move to them. */
export function tradePopTargets(G: HegemonyState, seat: PlayerId, pops: Pops): string[] {
  return G.players[seat].settlements.filter((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, seat);
    return settlement !== undefined && settlementRoom(G, settlement) >= totalPops(pops);
  });
}

/** Each way to name a seat's settlements for the pops it gives and gets. */
export function tradePlaceChoices(
  G: HegemonyState,
  seat: PlayerId,
  gives: TradeBundle,
  gets: TradeBundle,
): TradePlaces[] {
  const froms = totalPops(gives.pops) > 0 ? tradePopSources(G, seat, gives.pops) : [undefined];
  const tos = totalPops(gets.pops) > 0 ? tradePopTargets(G, seat, gets.pops) : [undefined];
  return froms.flatMap((from) =>
    tos.map((to) => ({ ...(from ? { from } : {}), ...(to ? { to } : {}) })),
  );
}

/** Whether every card picked is in the hand, each once, and the pick is `count` long.
 *  Counted as a multiset, so a projection's hidden hand and hidden pick still match. */
function heldPick(hand: readonly string[], picked: readonly string[], count: number): boolean {
  if (picked.length !== count) return false;
  const left = [...hand];
  return picked.every((id) => {
    const at = left.indexOf(id);
    if (at >= 0) left.splice(at, 1);
    return at >= 0;
  });
}

/**
 * What a seat lacks to hand over `bundle`, one line each. Its pops must stand together
 * in `from`, or in any one settlement while it is unnamed, and the cards it picked must
 * be in its hand. The composer's preview, the answers and settlement all read this one
 * check. A seat short of food holds none to give, though it may take food.
 */
export function tradeShortfalls(
  G: HegemonyState,
  seat: PlayerId,
  bundle: TradeBundle,
  from?: string,
  cards?: readonly string[],
): string[] {
  const reasons: string[] = [];
  const held = G.players[seat].resources;
  const now = nowResources(bundle);
  for (const resource of TRADE_RESOURCES) {
    const amount = now[resource] ?? 0;
    if (amount > 0 && held[resource] < amount) {
      reasons.push(`Holds ${Math.max(0, held[resource])} ${resource}, not ${amount}.`);
    }
  }
  // A lent good stays its owner's but moves in no other trade until it comes back.
  for (const id of [...bundle.goods, ...(bundle.lent ?? [])]) {
    const asset = G.board.luxuries.find((candidate) => candidate.id === id);
    const name = asset ? getLuxuryGood(G.definition.content, asset.goodId)?.name : null;
    const loan = loanOf(G, id);
    if (asset?.owner !== seat) reasons.push(`Does not hold ${name ?? "that good"}.`);
    else if (loan) reasons.push(`${name} is lent to ${getPlayerName(G, loan.loan.borrower)}.`);
  }
  if (totalPops(bundle.pops) > 0) {
    const sources = tradePopSources(G, seat, bundle.pops);
    if (from ? !sources.includes(from) : sources.length === 0) {
      reasons.push(`No settlement there holds ${formatPops(bundle.pops)}.`);
    }
  }
  if (bundle.cards > 0) {
    const hand = G.devHands[seat].map((held) => held.id);
    if (hand.length < bundle.cards) {
      reasons.push(
        `Holds ${hand.length} card${hand.length === 1 ? "" : "s"}, not ${bundle.cards}.`,
      );
    } else if (cards?.length && !heldPick(hand, cards, bundle.cards)) {
      reasons.push("No longer holds the cards it picked.");
    }
  }
  return reasons;
}

/** Under the Port rule a good goes only to a seat with a Port beside it, so it is never
 *  handed over to be released at once: the goods of `goods` the seat could not take, by
 *  name. */
function goodsWithoutPort(G: HegemonyState, seat: PlayerId, goods: readonly string[]): string[] {
  if (!G.ruleset.economy.luxury.needsPort) return [];
  return goods.flatMap((id) => {
    const asset = G.board.luxuries.find((candidate) => candidate.id === id);
    return asset && !hasPortBeside(G, seat, asset) ? [luxuryName(G, asset)] : [];
  });
}

/** Why a seat's side cannot be committed: what it lacks to give, an unnamed source for
 *  the pops it gives, no named settlement with room for the pops it gets, and no Port
 *  beside a good it gets. */
function sideReasons(
  G: HegemonyState,
  seat: PlayerId,
  gives: TradeBundle,
  gets: TradeBundle,
  places: TradePlaces,
): string[] {
  const reasons = tradeShortfalls(G, seat, gives, places.from, places.cards);
  if (totalPops(gives.pops) > 0 && !places.from) {
    reasons.push("Name the settlement the pops leave.");
  }
  if (gives.cards > 0 && !places.cards?.length) reasons.push("Pick the cards to give.");
  if (totalPops(gets.pops) > 0) {
    if (!places.to) reasons.push("Name the settlement that receives the pops.");
    else if (!tradePopTargets(G, seat, gets.pops).includes(places.to)) {
      reasons.push("No room there for the pops.");
    }
  }
  for (const good of goodsWithoutPort(G, seat, gets.goods)) {
    reasons.push(`No Port beside ${good} to take it.`);
  }
  return reasons;
}

/** Why `seat` may not be offered `goods`: it has no Port beside one of them. */
function noPortReasons(G: HegemonyState, seat: PlayerId, goods: readonly string[]): string[] {
  return goodsWithoutPort(G, seat, goods).map(
    (good) => `${getPlayerName(G, seat)} has no Port beside ${good}.`,
  );
}

/** Trade happens on a turn, with nothing pending, and in the Assembly's preparation. */
function windowReason(G: HegemonyState): string | null {
  if (!G.ruleset.trade.enabled) return "Trade is off in this game.";
  const workflow = currentWorkflow(G);
  return workflow === "turn" || workflow === "assemblyProposal"
    ? null
    : "Trade waits for the pending decision.";
}

/** May this seat open a new offer: the turn's seat, or a seat not yet Ready. */
export function offerWindowReason(G: HegemonyState, seat: PlayerId): string | null {
  const reason = windowReason(G);
  if (reason) return reason;
  if (G.assembly) return G.assembly.ready[seat] ? "Ready seats make no new offers." : null;
  return seat === G.currentPlayer ? null : "Only the seat whose turn it is makes offers.";
}

export function getOffer(G: HegemonyState, offerId: string): TradeOffer | undefined {
  return G.offers.find((offer) => offer.id === offerId);
}

/** The recipients named, in seat order, or every rival when none is. */
function recipients(seat: PlayerId, named: readonly PlayerId[]): PlayerId[] {
  const rivals = PLAYER_IDS.filter((id) => id !== seat);
  return named.length === 0 ? rivals : rivals.filter((id) => named.includes(id));
}

/** An offer names its seat's own settlements for traded pops as it is made: an accept
 *  settles at once, so nothing waits for the offering seat. */
export function getTradeOfferStatus(
  G: HegemonyState,
  seat: PlayerId,
  to: readonly PlayerId[],
  terms: TradeTerms,
  places: TradePlaces,
): ActionStatus {
  const reasons: string[] = [];
  const window = offerWindowReason(G, seat);
  if (window) reasons.push(window);
  if (to.some((id) => id === seat || !PLAYER_IDS.includes(id)) || new Set(to).size !== to.length) {
    reasons.push("Offer to rivals, each once.");
  }
  const shape = termsReason(G, terms);
  if (shape) reasons.push(shape);
  else {
    reasons.push(...sideReasons(G, seat, terms.give, terms.get, places));
    const asked = [...terms.get.goods, ...(terms.get.lent ?? [])];
    if (asked.some((id) => G.board.luxuries.find((a) => a.id === id)?.owner === seat)) {
      reasons.push("You already hold that good.");
    }
    for (const id of recipients(seat, to)) reasons.push(...noPortReasons(G, id, terms.give.goods));
  }
  return { can: reasons.length === 0, reasons };
}

export function tradeOffer(
  G: HegemonyState,
  seat: PlayerId,
  to: readonly PlayerId[],
  terms: TradeTerms,
  places: TradePlaces,
): MoveResult {
  const status = getTradeOfferStatus(G, seat, to, terms, places);
  if (!status.can) return invalid(...status.reasons);

  const offer: TradeOffer = {
    id: allocateEntityId(G, "offer"),
    from: seat,
    to: recipients(seat, to),
    toTable: to.length === 0,
    terms,
    places,
    answers: {},
  };
  G.offers.push(offer);
  G.offersMade[seat] = (G.offersMade[seat] ?? 0) + 1;
  addLog(
    G,
    `${getPlayerName(G, seat)} offers ${describeBundle(G, terms.give)} for ${describeBundle(G, terms.get)}${offer.toTable ? " to the table" : ` to ${offer.to.map((id) => getPlayerName(G, id)).join(" and ")}`}.`,
    seat,
  );
  return MOVE_OK;
}

export function getTradeAnswerStatus(
  G: HegemonyState,
  seat: PlayerId,
  offerId: string,
  answer: TradeAnswer,
): ActionStatus {
  const window = windowReason(G);
  if (window) return { can: false, reasons: [window] };
  const offer = getOffer(G, offerId);
  if (!offer) return { can: false, reasons: ["That offer is closed."] };
  if (!offer.to.includes(seat)) return { can: false, reasons: ["The offer is not to you."] };
  if (offer.answers[seat]) return { can: false, reasons: ["You have answered."] };

  if (answer.kind === "decline") return { can: true, reasons: [] };
  if (answer.kind === "counter") {
    const shape = termsReason(G, answer.terms);
    const reasons = shape
      ? [shape]
      : [
          ...sideReasons(G, seat, answer.terms.get, answer.terms.give, answer.places),
          ...noPortReasons(G, offer.from, answer.terms.get.goods),
        ];
    return { can: reasons.length === 0, reasons };
  }
  // An accept settles at once: both sides are checked now.
  const reasons = sideReasons(G, seat, offer.terms.get, offer.terms.give, answer.places);
  const theirs = sideReasons(G, offer.from, offer.terms.give, offer.terms.get, offer.places);
  if (theirs.length > 0) {
    reasons.push(`${getPlayerName(G, offer.from)} can no longer trade: ${theirs.join(" ")}`);
  }
  return { can: reasons.length === 0, reasons };
}

export function tradeAnswer(
  G: HegemonyState,
  seat: PlayerId,
  offerId: string,
  answer: TradeAnswer,
): MoveResult {
  const status = getTradeAnswerStatus(G, seat, offerId, answer);
  if (!status.can) return invalid(...status.reasons);

  const offer = getOffer(G, offerId)!;
  if (answer.kind === "accept") {
    settle(G, offer, seat, offer.terms, offer.places, answer.places);
    return MOVE_OK;
  }
  offer.answers[seat] = answer;
  const name = getPlayerName(G, seat);
  const owner = getPlayerName(G, offer.from);
  addLog(
    G,
    answer.kind === "decline"
      ? `${name} declines ${owner}'s offer.`
      : `${name} counters ${owner}'s offer: ${describeBundle(G, answer.terms.get)} for ${describeBundle(G, answer.terms.give)}.`,
    seat,
  );
  return MOVE_OK;
}

/** A seat's counter, if it countered. */
export function counterOf(
  offer: TradeOffer,
  partner: PlayerId,
): Extract<TradeReply, { kind: "counter" }> | null {
  const reply = offer.answers[partner];
  return reply?.kind === "counter" ? reply : null;
}

/** Whether a seat could still hand over its side, the offer's or its counter's, as the
 *  disc's "can't pay" mark reads it. */
export function partnerCanPay(G: HegemonyState, offer: TradeOffer, partner: PlayerId): boolean {
  const counter = counterOf(offer, partner);
  const terms = counter?.terms ?? offer.terms;
  return (
    tradeShortfalls(G, partner, terms.get, counter?.places.from, counter?.places.cards).length === 0
  );
}

/** Taking a counter: the offering seat names its pop settlements for the counter's
 *  terms, which may differ from its offer's. */
export function getTradeSettleStatus(
  G: HegemonyState,
  seat: PlayerId,
  offerId: string,
  partner: PlayerId,
  places: TradePlaces,
): ActionStatus {
  const window = windowReason(G);
  if (window) return { can: false, reasons: [window] };
  const offer = getOffer(G, offerId);
  if (!offer) return { can: false, reasons: ["That offer is closed."] };
  if (offer.from !== seat) return { can: false, reasons: ["Only the offering seat settles."] };
  const counter = counterOf(offer, partner);
  if (!counter) return { can: false, reasons: ["That seat has not countered."] };

  const { terms } = counter;
  const reasons = sideReasons(G, seat, terms.give, terms.get, places);
  const theirs = sideReasons(G, partner, terms.get, terms.give, counter.places);
  if (theirs.length > 0) {
    reasons.push(`${getPlayerName(G, partner)} can no longer trade: ${theirs.join(" ")}`);
  }
  return { can: reasons.length === 0, reasons };
}

/** One seat hands its side to the other, from the places each named. Pops leave at once
 *  and travel to the receiver, who owns them from now and takes them in at the start of
 *  its next turn. Cards go from hand to hand, the giver's pick, and come in on this turn,
 *  so the receiver never plays one before its next. */
function handOver(
  G: HegemonyState,
  giver: PlayerId,
  receiver: PlayerId,
  bundle: TradeBundle,
  giverPlaces: TradePlaces,
  receiverPlaces: TradePlaces,
) {
  const now = nowResources(bundle);
  for (const resource of TRADE_RESOURCES) {
    const amount = now[resource] ?? 0;
    G.players[giver].resources[resource] -= amount;
    G.players[receiver].resources[resource] += amount;
  }
  for (const id of bundle.goods) transferLuxury(G, id, receiver);
  for (const id of bundle.cards > 0 ? (giverPlaces.cards ?? []) : []) {
    const hand = G.devHands[giver];
    hand.splice(
      hand.findIndex((held) => held.id === id),
      1,
    );
    G.devHands[receiver].push({ id, turn: G.turn });
  }
  if (totalPops(bundle.pops) === 0) return;

  const from = giverPlaces.from!;
  const to = receiverPlaces.to!;
  const source = getOwnedSettlement(G, from, giver)!;
  const target = getOwnedSettlement(G, to, receiver)!;
  subtractPops(source.pops, bundle.pops);
  G.transfers.push({
    id: allocateEntityId(G, "transfer"),
    owner: receiver,
    giver,
    fromSettlementId: source.id,
    toSettlementId: target.id,
    fromTileId: from,
    toTileId: to,
    pops: clonePops(bundle.pops),
  });
}

/** Move both sides at once and close the offer, with every other seat's answer on it.
 *  The other open offers stand, each to its own recheck. */
function settle(
  G: HegemonyState,
  offer: TradeOffer,
  partner: PlayerId,
  terms: TradeTerms,
  ownPlaces: TradePlaces,
  theirPlaces: TradePlaces,
) {
  const seat = offer.from;
  handOver(G, seat, partner, terms.give, ownPlaces, theirPlaces);
  handOver(G, partner, seat, terms.get, theirPlaces, ownPlaces);
  makeDeal(G, seat, partner, terms);
  G.offers = G.offers.filter((open) => open.id !== offer.id);
  addLog(
    G,
    `${getPlayerName(G, seat)} trades ${describeBundle(G, terms.give)} to ${getPlayerName(G, partner)} for ${describeBundle(G, terms.get)}.`,
    seat,
    { kind: "trade", from: seat, partner, terms },
  );
}

/**
 * The match as it would stand had `from` traded `terms` with `partner`, for a bot
 * weighing a deal it has not made: both sides hand over as at settlement, with no
 * offer closed and no line written. Holdings and room are the caller's to check. Cards
 * stay where they are: which ones move is the giver's pick, so a deal's cards weigh
 * nothing here.
 */
export function tradeForEval(
  G: HegemonyState,
  from: PlayerId,
  partner: PlayerId,
  terms: TradeTerms,
  fromPlaces: TradePlaces = {},
  partnerPlaces: TradePlaces = {},
): HegemonyState {
  const own = { ...fromPlaces, cards: [] };
  const theirs = { ...partnerPlaces, cards: [] };
  return produce(G, (draft) => {
    handOver(draft, from, partner, terms.give, own, theirs);
    handOver(draft, partner, from, terms.get, theirs, own);
  });
}

/** The offering seat takes a counter. */
export function tradeSettle(
  G: HegemonyState,
  seat: PlayerId,
  offerId: string,
  partner: PlayerId,
  places: TradePlaces,
): MoveResult {
  const status = getTradeSettleStatus(G, seat, offerId, partner, places);
  if (!status.can) return invalid(...status.reasons);

  const offer = getOffer(G, offerId)!;
  const counter = counterOf(offer, partner)!;
  settle(G, offer, partner, counter.terms, places, counter.places);
  return MOVE_OK;
}

export function getTradeWithdrawStatus(
  G: HegemonyState,
  seat: PlayerId,
  offerId: string,
): ActionStatus {
  const window = windowReason(G);
  const offer = getOffer(G, offerId);
  const reason =
    window ?? (!offer ? "That offer is closed." : offer.from !== seat ? "Not your offer." : null);
  return { can: reason === null, reasons: reason ? [reason] : [] };
}

export function tradeWithdraw(G: HegemonyState, seat: PlayerId, offerId: string): MoveResult {
  const status = getTradeWithdrawStatus(G, seat, offerId);
  if (!status.can) return invalid(...status.reasons);

  G.offers = G.offers.filter((offer) => offer.id !== offerId);
  addLog(G, `${getPlayerName(G, seat)} withdraws an offer.`, seat);
  return MOVE_OK;
}

/**
 * A seat's stocks and standing level as they would be after handing over `gives` for
 * `gets`: the offer card's footer. Pops count from the moment they trade, as on the
 * move, and yearly lines with their first exchange; holdings are not checked here.
 */
export function tradePreview(
  G: HegemonyState,
  seat: PlayerId,
  gives: TradeBundle,
  gets: TradeBundle,
): { resources: HegemonyState["players"][PlayerId]["resources"]; happiness: number } {
  const after = produce(G, (draft) => {
    const resources = draft.players[seat].resources;
    const [given, got] = [nowResources(gives), nowResources(gets)];
    for (const resource of TRADE_RESOURCES) {
      resources[resource] += (got[resource] ?? 0) - (given[resource] ?? 0);
    }
    for (const asset of draft.board.luxuries) {
      if (gets.goods.includes(asset.id)) asset.owner = seat;
      else if (gives.goods.includes(asset.id)) asset.owner = null;
    }
    // A lent good counts for its borrower: a stand-in deal moves the count.
    const loans = [
      ...(gets.lent ?? []).map((assetId) => ({ assetId, borrower: seat })),
      ...(gives.lent ?? []).map((assetId) => ({ assetId, borrower: anyRival(seat) })),
    ];
    if (loans.length > 0) {
      const preview: Deal = {
        id: "preview",
        seats: [seat, anyRival(seat)],
        yearly: {},
        loans: loans.map((loan) => ({ ...loan, length: "standing", turn: null })),
        madeYear: draft.year,
        endsYear: null,
        short: {},
      };
      draft.deals.push(preview);
    }
    const source = tradePopSources(draft, seat, gives.pops)[0];
    const settlement = source ? getOwnedSettlement(draft, source, seat) : undefined;
    if (settlement && totalPops(gives.pops) > 0) subtractPops(settlement.pops, gives.pops);
    if (totalPops(gets.pops) > 0) {
      draft.transfers.push({
        id: "preview",
        owner: seat,
        fromSettlementId: "",
        toSettlementId: "",
        fromTileId: "",
        toTileId: "",
        pops: clonePops(gets.pops),
      });
    }
  });
  return { resources: after.players[seat].resources, happiness: standingHappiness(after, seat) };
}

/** Either seat may end a standing deal where it could make an offer: on its own turn, or
 *  in the Assembly's preparation before it is Ready. */
export function getDealEndStatus(G: HegemonyState, seat: PlayerId, dealId: string): ActionStatus {
  const deal = getDeal(G, dealId);
  const reason = !deal
    ? "No such deal."
    : !deal.seats.includes(seat)
      ? "Not your deal."
      : deal.endsYear !== null
        ? "This deal is already ending."
        : offerWindowReason(G, seat);
  return { can: reason === null, reasons: reason ? [reason] : [] };
}

export function dealEnd(G: HegemonyState, seat: PlayerId, dealId: string): MoveResult {
  const status = getDealEndStatus(G, seat, dealId);
  if (!status.can) return invalid(...status.reasons);
  endDeal(G, seat, dealId);
  return MOVE_OK;
}

/** The trading window closes: a turn ends, or the Assembly's preparation does. */
export function closeOffers(G: HegemonyState) {
  G.offers = [];
  G.offersMade = {};
}

/** "2 wood, 1 gold, 2 food a year, Pearls, Wine on loan, 1 slave and 2 cards", or
 *  "nothing". */
export function describeBundle(G: HegemonyState, bundle: TradeBundle): string {
  const goodName = (id: string) => {
    const asset = G.board.luxuries.find((candidate) => candidate.id === id);
    return (asset && getLuxuryGood(G.definition.content, asset.goodId)?.name) ?? id;
  };
  const parts = [
    ...TRADE_RESOURCES.filter((resource) => (bundle.resources[resource] ?? 0) > 0).map(
      (resource) => `${bundle.resources[resource]} ${resource}`,
    ),
    ...TRADE_RESOURCES.filter((resource) => (bundle.yearly?.[resource] ?? 0) > 0).map(
      (resource) => `${bundle.yearly?.[resource]} ${resource} a year`,
    ),
    ...bundle.goods.map(goodName),
    ...(bundle.lent ?? []).map((id) => `${goodName(id)} on loan`),
    ...(totalPops(bundle.pops) > 0 ? [formatPops(bundle.pops)] : []),
    ...(bundle.cards > 0 ? [`${bundle.cards} card${bundle.cards === 1 ? "" : "s"}`] : []),
  ];
  return parts.length === 0 ? "nothing" : parts.join(", ");
}

/** One side of a realm's lean: the material, its net a turn and the stock it holds. */
export type LeanSide = { resource: TradableMaterial; income: number; stock: number };

/**
 * What a realm has to trade and what it wants, read from what the whole table sees: its
 * net income a turn and its stock of the land's three materials (gold is what pays,
 * influence is civic). Its export is the one it makes most beyond its needs: the highest
 * net above 0, the larger stock breaking a tie. Its import is the one it lacks most: of
 * those it makes nothing of beyond its needs (a net of 0 or less), the one it will hold
 * least of once this turn's income lands, the larger deficit breaking a tie. Either is
 * null when there is none. The map shows both beside each realm's capital in Trade, to
 * point sellers at buyers.
 */
export function tradeLean(
  G: HegemonyState,
  seat: PlayerId,
): { exports: LeanSide | null; imports: LeanSide | null } {
  const income = calculateIncome(G, seat);
  const sides = TRADABLE_MATERIALS.map((resource) => ({
    resource,
    income: income[resource],
    stock: Math.max(0, G.players[seat].resources[resource]),
  }));
  const after = (side: LeanSide) => side.stock + side.income;
  const [exports = null] = sides
    .filter((side) => side.income > 0)
    .sort((a, b) => b.income - a.income || b.stock - a.stock);
  const [imports = null] = sides
    .filter((side) => side.income <= 0)
    .sort((a, b) => after(a) - after(b) || a.income - b.income);
  return { exports, imports };
}
