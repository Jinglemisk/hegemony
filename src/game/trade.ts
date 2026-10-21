import { produce } from "immer";
import { currentWorkflow } from "./actors";
import { standingHappiness } from "./happiness";
import { getLuxuryGood } from "./content";
import { PLAYER_IDS } from "./data";
import { allocateEntityId } from "./entity";
import { transferLuxury } from "./luxury";
import { settlementRoom } from "./settlement";
import { formatPops } from "./core/format";
import { EMPTY_POPS, POP_TYPES, clonePops, hasPops, subtractPops, totalPops } from "./core/pops";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { MOVE_OK, invalid } from "./core/results";
import type { ActionStatus, MoveResult } from "./core/results";
import type {
  HegemonyState,
  PlayerId,
  Pops,
  Resource,
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
 * public, so nothing here is redacted.
 */

/** Every stock trades. */
export const TRADE_RESOURCES: readonly Resource[] = ["wood", "stone", "food", "gold", "influence"];

export function emptyBundle(): TradeBundle {
  return { resources: {}, goods: [], pops: clonePops(EMPTY_POPS) };
}

export function isEmptyBundle(bundle: TradeBundle): boolean {
  return (
    TRADE_RESOURCES.every((resource) => (bundle.resources[resource] ?? 0) === 0) &&
    bundle.goods.length === 0 &&
    totalPops(bundle.pops) === 0
  );
}

function bundleShapeReason(bundle: TradeBundle): string | null {
  const keys = Object.keys(bundle.resources) as Resource[];
  if (keys.some((key) => !TRADE_RESOURCES.includes(key))) return "Unknown resource.";
  const counts = [
    ...keys.map((key) => bundle.resources[key] ?? 0),
    ...POP_TYPES.map((pop) => bundle.pops[pop]),
  ];
  if (counts.some((count) => !Number.isInteger(count) || count < 0)) {
    return "Counts are whole numbers.";
  }
  if (new Set(bundle.goods).size !== bundle.goods.length) return "A good is named twice.";
  return null;
}

/** Why terms cannot be offered at all, whoever holds what: each side gives at least
 *  one thing (no gifts), counts are whole, and goods are real. */
function termsReason(G: HegemonyState, terms: TradeTerms): string | null {
  const shape = bundleShapeReason(terms.give) ?? bundleShapeReason(terms.get);
  if (shape) return shape;
  if (isEmptyBundle(terms.give) || isEmptyBundle(terms.get)) {
    return "Each side gives at least one thing.";
  }
  const goods = [...terms.give.goods, ...terms.get.goods];
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

/**
 * What a seat lacks to hand over `bundle`, one line each. Its pops must stand together
 * in `from`, or in any one settlement while it is unnamed. The composer's preview, the
 * answers and settlement all read this one check. A seat short of food holds none to
 * give, though it may take food.
 */
export function tradeShortfalls(
  G: HegemonyState,
  seat: PlayerId,
  bundle: TradeBundle,
  from?: string,
): string[] {
  const reasons: string[] = [];
  const held = G.players[seat].resources;
  for (const resource of TRADE_RESOURCES) {
    const amount = bundle.resources[resource] ?? 0;
    if (amount > 0 && held[resource] < amount) {
      reasons.push(`Holds ${Math.max(0, held[resource])} ${resource}, not ${amount}.`);
    }
  }
  for (const id of bundle.goods) {
    const asset = G.board.luxuries.find((candidate) => candidate.id === id);
    if (asset?.owner !== seat) {
      const name = asset ? getLuxuryGood(G.definition.content, asset.goodId)?.name : null;
      reasons.push(`Does not hold ${name ?? "that good"}.`);
    }
  }
  if (totalPops(bundle.pops) > 0) {
    const sources = tradePopSources(G, seat, bundle.pops);
    if (from ? !sources.includes(from) : sources.length === 0) {
      reasons.push(`No settlement there holds ${formatPops(bundle.pops)}.`);
    }
  }
  return reasons;
}

/** Why a seat's side cannot be committed: what it lacks to give, an unnamed source for
 *  the pops it gives, and no named settlement with room for the pops it gets. */
function sideReasons(
  G: HegemonyState,
  seat: PlayerId,
  gives: TradeBundle,
  gets: TradeBundle,
  places: TradePlaces,
): string[] {
  const reasons = tradeShortfalls(G, seat, gives, places.from);
  if (totalPops(gives.pops) > 0 && !places.from) {
    reasons.push("Name the settlement the pops leave.");
  }
  if (totalPops(gets.pops) > 0) {
    if (!places.to) reasons.push("Name the settlement that receives the pops.");
    else if (!tradePopTargets(G, seat, gets.pops).includes(places.to)) {
      reasons.push("No room there for the pops.");
    }
  }
  return reasons;
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
    if (terms.get.goods.some((id) => G.board.luxuries.find((a) => a.id === id)?.owner === seat)) {
      reasons.push("You already hold that good.");
    }
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
      : sideReasons(G, seat, answer.terms.get, answer.terms.give, answer.places);
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
  return tradeShortfalls(G, partner, terms.get, counter?.places.from).length === 0;
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

/** One seat hands its side to the other. Pops leave at once and travel to the
 *  receiver, who owns them from now and takes them in at the start of its next turn. */
function handOver(
  G: HegemonyState,
  giver: PlayerId,
  receiver: PlayerId,
  bundle: TradeBundle,
  from: string | undefined,
  to: string | undefined,
) {
  for (const resource of TRADE_RESOURCES) {
    const amount = bundle.resources[resource] ?? 0;
    G.players[giver].resources[resource] -= amount;
    G.players[receiver].resources[resource] += amount;
  }
  for (const id of bundle.goods) transferLuxury(G, id, receiver);
  if (totalPops(bundle.pops) === 0) return;

  const source = getOwnedSettlement(G, from!, giver)!;
  const target = getOwnedSettlement(G, to!, receiver)!;
  subtractPops(source.pops, bundle.pops);
  G.transfers.push({
    id: allocateEntityId(G, "transfer"),
    owner: receiver,
    giver,
    fromSettlementId: source.id,
    toSettlementId: target.id,
    fromTileId: from!,
    toTileId: to!,
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
  handOver(G, seat, partner, terms.give, ownPlaces.from, theirPlaces.to);
  handOver(G, partner, seat, terms.get, theirPlaces.from, ownPlaces.to);
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
 * offer closed and no line written. Holdings and room are the caller's to check.
 */
export function tradeForEval(
  G: HegemonyState,
  from: PlayerId,
  partner: PlayerId,
  terms: TradeTerms,
  fromPlaces: TradePlaces = {},
  partnerPlaces: TradePlaces = {},
): HegemonyState {
  return produce(G, (draft) => {
    handOver(draft, from, partner, terms.give, fromPlaces.from, partnerPlaces.to);
    handOver(draft, partner, from, terms.get, partnerPlaces.from, fromPlaces.to);
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
 * move; holdings are not checked here.
 */
export function tradePreview(
  G: HegemonyState,
  seat: PlayerId,
  gives: TradeBundle,
  gets: TradeBundle,
): { resources: HegemonyState["players"][PlayerId]["resources"]; happiness: number } {
  const after = produce(G, (draft) => {
    const resources = draft.players[seat].resources;
    for (const resource of TRADE_RESOURCES) {
      resources[resource] += (gets.resources[resource] ?? 0) - (gives.resources[resource] ?? 0);
    }
    for (const asset of draft.board.luxuries) {
      if (gets.goods.includes(asset.id)) asset.owner = seat;
      else if (gives.goods.includes(asset.id)) asset.owner = null;
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

/** The trading window closes: a turn ends, or the Assembly's preparation does. */
export function closeOffers(G: HegemonyState) {
  G.offers = [];
  G.offersMade = {};
}

/** "2 wood, 1 gold, Pearls and 1 slave", or "nothing". */
export function describeBundle(G: HegemonyState, bundle: TradeBundle): string {
  const parts = [
    ...TRADE_RESOURCES.filter((resource) => (bundle.resources[resource] ?? 0) > 0).map(
      (resource) => `${bundle.resources[resource]} ${resource}`,
    ),
    ...bundle.goods.map((id) => {
      const asset = G.board.luxuries.find((candidate) => candidate.id === id);
      return (asset && getLuxuryGood(G.definition.content, asset.goodId)?.name) ?? id;
    }),
    ...(totalPops(bundle.pops) > 0 ? [formatPops(bundle.pops)] : []),
  ];
  return parts.length === 0 ? "nothing" : parts.join(", ");
}
