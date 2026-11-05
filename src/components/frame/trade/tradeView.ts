import { getLuxuryGood } from "../../../game/content";
import { POP_TYPES } from "../../../game/core/pops";
import { getOwnedSettlement } from "../../../game/core/query";
import { DEAL_RESOURCES, describeAmounts, loanOf, partnerIn } from "../../../game/deals";
import { standingHappiness } from "../../../game/happiness";
import { partnerCanPay, tradePreview } from "../../../game/trade";
import type {
  Deal,
  DealLoan,
  HegemonyState,
  PlayerId,
  PopType,
  Resource,
  TradeBundle,
  TradeOffer,
} from "../../../game/types";
import { LUXURY_RASTER, POP_RASTERS, RESOURCE_RASTERS } from "../../../ui/iconRegistry";
import { RESOURCE_LABELS, formatPopLabel } from "../../../ui/formatters";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";

/**
 * The offer card's words and numbers, read off the engine. A side is what one seat
 * hands over; the card always shows two, from the acting seat's view: what it gives
 * and what it gets.
 */

/** One line on a side: a stock, a class of pops, one luxury good, or held cards, handed
 *  over now; a stock handed over every year; or a good lent. */
export type TradeItem =
  | { kind: "resource"; id: Resource }
  | { kind: "pop"; id: PopType }
  | { kind: "good"; id: string }
  | { kind: "cards"; id: "cards" }
  | { kind: "yearly"; id: Resource }
  | { kind: "lent"; id: string };

/** The card's rows: what moves once, what moves every year, what is lent. */
export type TradeRow = "now" | "yearly" | "lent";
export const TRADE_ROWS: readonly TradeRow[] = ["now", "yearly", "lent"];
export const ROW_LABEL: Record<TradeRow, string> = {
  now: "Now",
  yearly: "Every year",
  lent: "On loan",
};
export const rowOf = (item: TradeItem): TradeRow =>
  item.kind === "yearly" ? "yearly" : item.kind === "lent" ? "lent" : "now";

/** A good, a lent good: one of it, no count to step. */
export const isGood = (item: TradeItem) => item.kind === "good" || item.kind === "lent";

const CARDS: TradeItem = { kind: "cards", id: "cards" };

/** A side as the acting seat sees it. */
export type Sides = { gives: TradeBundle; gets: TradeBundle };

export const itemKey = (item: TradeItem) => `${item.kind}:${item.id}`;

export function itemCount(bundle: TradeBundle, item: TradeItem): number {
  if (item.kind === "resource") return bundle.resources[item.id] ?? 0;
  if (item.kind === "pop") return bundle.pops[item.id];
  if (item.kind === "cards") return bundle.cards;
  if (item.kind === "yearly") return bundle.yearly?.[item.id] ?? 0;
  if (item.kind === "lent") return bundle.lent?.includes(item.id) ? 1 : 0;
  return bundle.goods.includes(item.id) ? 1 : 0;
}

/** The bundle with one line set to `n`; a line at zero leaves it. */
export function withCount(bundle: TradeBundle, item: TradeItem, n: number): TradeBundle {
  if (item.kind === "resource") {
    const resources = { ...bundle.resources, [item.id]: n };
    if (n <= 0) delete resources[item.id];
    return { ...bundle, resources };
  }
  if (item.kind === "pop")
    return { ...bundle, pops: { ...bundle.pops, [item.id]: Math.max(0, n) } };
  if (item.kind === "cards") return { ...bundle, cards: Math.max(0, n) };
  if (item.kind === "yearly") {
    const yearly = { ...bundle.yearly, [item.id]: n };
    if (n <= 0) delete yearly[item.id];
    return { ...bundle, yearly };
  }
  if (item.kind === "lent") {
    const lent = (bundle.lent ?? []).filter((id) => id !== item.id);
    return { ...bundle, lent: n > 0 ? [...lent, item.id] : lent };
  }
  const goods = bundle.goods.filter((id) => id !== item.id);
  return { ...bundle, goods: n > 0 ? [...goods, item.id] : goods };
}

/** The bundle's lines in the card's order: stocks, pops, goods, cards, then the yearly
 *  stocks and the lent goods. */
export function itemsOf(bundle: TradeBundle): TradeItem[] {
  return [
    ...RESOURCE_ORDER.filter((id) => (bundle.resources[id] ?? 0) > 0).map((id): TradeItem => ({
      kind: "resource",
      id,
    })),
    ...POP_TYPES.filter((id) => bundle.pops[id] > 0).map((id): TradeItem => ({ kind: "pop", id })),
    ...bundle.goods.map((id): TradeItem => ({ kind: "good", id })),
    ...(bundle.cards > 0 ? [CARDS] : []),
    ...RESOURCE_ORDER.filter((id) => (bundle.yearly?.[id] ?? 0) > 0).map((id): TradeItem => ({
      kind: "yearly",
      id,
    })),
    ...(bundle.lent ?? []).map((id): TradeItem => ({ kind: "lent", id })),
  ];
}

export function itemIcon(item: TradeItem): string {
  if (item.kind === "resource" || item.kind === "yearly") return RESOURCE_RASTERS[item.id];
  if (item.kind === "pop") return POP_RASTERS[item.id];
  if (item.kind === "cards") return "events/convoy";
  return LUXURY_RASTER;
}

export function itemName(G: HegemonyState, item: TradeItem, n = 1): string {
  if (item.kind === "resource" || item.kind === "yearly") {
    return RESOURCE_LABELS[item.id].toLowerCase();
  }
  if (item.kind === "pop") return formatPopLabel(item.id, n);
  if (item.kind === "cards") return n === 1 ? "card" : "cards";
  const asset = G.board.luxuries.find((candidate) => candidate.id === item.id);
  return (asset && getLuxuryGood(G.definition.content, asset.goodId)?.name) ?? "a luxury good";
}

/** How many of a line the seat could hand over: a stock it holds, the most of a class
 *  standing in one settlement, a good it holds and has not lent, the cards in its hand. */
export function heldOf(G: HegemonyState, seat: PlayerId, item: TradeItem): number {
  if (item.kind === "resource" || item.kind === "yearly") {
    return Math.max(0, G.players[seat].resources[item.id]);
  }
  if (item.kind === "pop") {
    return Math.max(
      0,
      ...G.players[seat].settlements.map(
        (tileId) => getOwnedSettlement(G, tileId, seat)?.pops[item.id] ?? 0,
      ),
    );
  }
  if (item.kind === "cards") return G.devHands[seat].length;
  return G.board.luxuries.some(
    (asset) => asset.id === item.id && asset.owner === seat && !loanOf(G, asset.id),
  )
    ? 1
    : 0;
}

/** What the picker offers for one side: every line not on the card yet. A seat gives
 *  or lends its own goods and asks for goods the seats across the table hold, none of
 *  them out on loan; a good is on the card once, sold or lent. Cards go by count. */
export function pickable(
  G: HegemonyState,
  seat: PlayerId,
  sides: Sides,
  side: keyof Sides,
  others: readonly PlayerId[],
): TradeItem[] {
  const onCard = new Set([...itemsOf(sides.gives), ...itemsOf(sides.gets)].map(itemKey));
  const goodOnCard = new Set(
    [...itemsOf(sides.gives), ...itemsOf(sides.gets)].filter(isGood).map((item) => item.id),
  );
  const holders = side === "gives" ? [seat] : others;
  const goods = G.board.luxuries.filter(
    (asset) =>
      asset.owner !== null &&
      holders.includes(asset.owner) &&
      !loanOf(G, asset.id) &&
      !goodOnCard.has(asset.id),
  );
  return [
    ...RESOURCE_ORDER.map((id): TradeItem => ({ kind: "resource", id })),
    ...POP_TYPES.map((id): TradeItem => ({ kind: "pop", id })),
    ...goods.map((asset): TradeItem => ({ kind: "good", id: asset.id })),
    CARDS,
    ...RESOURCE_ORDER.filter((id) => DEAL_RESOURCES.includes(id)).map((id): TradeItem => ({
      kind: "yearly",
      id,
    })),
    ...goods.map((asset): TradeItem => ({ kind: "lent", id: asset.id })),
  ].filter((item) => !onCard.has(itemKey(item)));
}

export type StockChange = { key: string; icon: string; label: string; from: number; to: number };

/** The seat's stocks, and its level when goods or slaves change hands, after the
 *  trade: the engine's preview, so the card never works a rule out itself. */
export function stocksAfter(G: HegemonyState, seat: PlayerId, sides: Sides): StockChange[] {
  const before = G.players[seat].resources;
  const after = tradePreview(G, seat, sides.gives, sides.gets);
  const changes: StockChange[] = RESOURCE_ORDER.filter(
    (id) => after.resources[id] !== before[id],
  ).map((id) => ({
    key: id,
    icon: RESOURCE_RASTERS[id],
    label: RESOURCE_LABELS[id].toLowerCase(),
    from: before[id],
    to: after.resources[id],
  }));
  const level = standingHappiness(G, seat);
  if (after.happiness !== level) {
    changes.push({
      key: "happiness",
      icon: RESOURCE_RASTERS.happiness,
      label: "happiness",
      from: level,
      to: after.happiness,
    });
  }
  return changes;
}

/** How an answer reads on the disc and the card. An accept trades at once, so it has
 *  no mark. */
export type AnswerMark = "pending" | "counter" | "decline" | "cantPay";

export function answerMark(G: HegemonyState, offer: TradeOffer, seat: PlayerId): AnswerMark {
  const answer = offer.answers[seat];
  if (answer?.kind === "decline") return "decline";
  if (!partnerCanPay(G, offer, seat)) return "cantPay";
  return answer?.kind ?? "pending";
}

export const MARK_GLYPH: Record<AnswerMark, string> = {
  pending: "",
  counter: "⇄",
  decline: "×",
  cantPay: "×",
};

/** "Theron offers the table", "Theron offers Nikos and Kyros". */
export function offerTitle(G: HegemonyState, offer: TradeOffer): string {
  const from = G.players[offer.from].name;
  if (offer.toTable) return `${from} offers the table`;
  const names = offer.to.map((seat) => G.players[seat].name);
  return `${from} offers ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}`;
}

/** "2 wood, 1 slave, Pearls, 2 food a year and Wine on loan", or "nothing". */
export function bundleWords(G: HegemonyState, bundle: TradeBundle): string {
  const parts = itemsOf(bundle).map((item) => {
    const n = itemCount(bundle, item);
    if (item.kind === "good") return itemName(G, item);
    if (item.kind === "lent") return `${itemName(G, item)} on loan`;
    return `${n} ${itemName(G, item, n)}${item.kind === "yearly" ? " a year" : ""}`;
  });
  if (parts.length === 0) return "nothing";
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
}

export function dealTitle(G: HegemonyState, deal: Deal, seat: PlayerId): string {
  return `Deal with ${G.players[partnerIn(deal, seat)].name}`;
}

export function loanWords(G: HegemonyState, loan: DealLoan, seat: PlayerId): string {
  const asset = G.board.luxuries.find((candidate) => candidate.id === loan.assetId);
  const good = (asset && getLuxuryGood(G.definition.content, asset.goodId)?.name) ?? "A good";
  const length = loan.length === "turn" ? "for one turn" : "until the deal ends";
  return loan.borrower === seat
    ? `${good} lent to you, ${length}`
    : `${good} lent to ${G.players[loan.borrower].name}, ${length}`;
}

/** The deal in a line: "You give 2 food a year, get 3 stone a year; Pearls lent to you". */
export function dealWords(G: HegemonyState, deal: Deal, seat: PlayerId): string {
  const partner = partnerIn(deal, seat);
  const give = deal.yearly[seat];
  const get = deal.yearly[partner];
  const lines = [
    ...(give ? [`you give ${describeAmounts(give)} a year`] : []),
    ...(get ? [`you get ${describeAmounts(get)} a year`] : []),
    ...deal.loans.map((loan) => loanWords(G, loan, seat)),
  ];
  const text = lines.join("; ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
