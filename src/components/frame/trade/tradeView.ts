import { getLuxuryGood } from "../../../game/content";
import { POP_TYPES } from "../../../game/core/pops";
import { getOwnedSettlement } from "../../../game/core/query";
import { standingHappiness } from "../../../game/happiness";
import { partnerCanPay, tradePreview } from "../../../game/trade";
import type {
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
import { settlementNameOf } from "../../../ui/settlementNames";

/**
 * The offer card's words and numbers, read off the engine. A side is what one seat
 * hands over; the card always shows two, from the acting seat's view: what it gives
 * and what it gets.
 */

/** One line on a side: a stock, a class of pops, or one luxury good. */
export type TradeItem =
  { kind: "resource"; id: Resource } | { kind: "pop"; id: PopType } | { kind: "good"; id: string };

/** A side as the acting seat sees it. */
export type Sides = { gives: TradeBundle; gets: TradeBundle };

export const itemKey = (item: TradeItem) => `${item.kind}:${item.id}`;

export function itemCount(bundle: TradeBundle, item: TradeItem): number {
  if (item.kind === "resource") return bundle.resources[item.id] ?? 0;
  if (item.kind === "pop") return bundle.pops[item.id];
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
  const goods = bundle.goods.filter((id) => id !== item.id);
  return { ...bundle, goods: n > 0 ? [...goods, item.id] : goods };
}

/** The bundle's lines in the card's order: stocks, pops, goods. */
export function itemsOf(bundle: TradeBundle): TradeItem[] {
  return [
    ...RESOURCE_ORDER.filter((id) => (bundle.resources[id] ?? 0) > 0).map((id): TradeItem => ({
      kind: "resource",
      id,
    })),
    ...POP_TYPES.filter((id) => bundle.pops[id] > 0).map((id): TradeItem => ({ kind: "pop", id })),
    ...bundle.goods.map((id): TradeItem => ({ kind: "good", id })),
  ];
}

export function itemIcon(item: TradeItem): string {
  if (item.kind === "resource") return RESOURCE_RASTERS[item.id];
  if (item.kind === "pop") return POP_RASTERS[item.id];
  return LUXURY_RASTER;
}

export function itemName(G: HegemonyState, item: TradeItem, n = 1): string {
  if (item.kind === "resource") return RESOURCE_LABELS[item.id].toLowerCase();
  if (item.kind === "pop") return formatPopLabel(item.id, n);
  const asset = G.board.luxuries.find((candidate) => candidate.id === item.id);
  return (asset && getLuxuryGood(G.definition.content, asset.goodId)?.name) ?? "a luxury good";
}

/** How many of a line the seat could hand over: a stock it holds, the most of a class
 *  standing in one settlement, a good it holds. */
export function heldOf(G: HegemonyState, seat: PlayerId, item: TradeItem): number {
  if (item.kind === "resource") return Math.max(0, G.players[seat].resources[item.id]);
  if (item.kind === "pop") {
    return Math.max(
      0,
      ...G.players[seat].settlements.map(
        (tileId) => getOwnedSettlement(G, tileId, seat)?.pops[item.id] ?? 0,
      ),
    );
  }
  return G.board.luxuries.some((asset) => asset.id === item.id && asset.owner === seat) ? 1 : 0;
}

/** What the picker offers for one side: every line not on the card yet. A seat gives
 *  its own goods and asks for goods the seats across the table hold. */
export function pickable(
  G: HegemonyState,
  seat: PlayerId,
  sides: Sides,
  side: keyof Sides,
  others: readonly PlayerId[],
): TradeItem[] {
  const onCard = new Set([...itemsOf(sides.gives), ...itemsOf(sides.gets)].map(itemKey));
  const holders = side === "gives" ? [seat] : others;
  const goods = G.board.luxuries
    .filter((asset) => asset.owner !== null && holders.includes(asset.owner))
    .map((asset): TradeItem => ({ kind: "good", id: asset.id }));
  return [
    ...RESOURCE_ORDER.map((id): TradeItem => ({ kind: "resource", id })),
    ...POP_TYPES.map((id): TradeItem => ({ kind: "pop", id })),
    ...goods,
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

/** How an answer reads on the disc and the card. */
export type AnswerMark = "pending" | "accept" | "counter" | "decline" | "cantPay";

export function answerMark(G: HegemonyState, offer: TradeOffer, seat: PlayerId): AnswerMark {
  const answer = offer.answers[seat];
  if (answer?.kind === "decline") return "decline";
  if (!partnerCanPay(G, offer, seat)) return "cantPay";
  return answer?.kind ?? "pending";
}

export const MARK_GLYPH: Record<AnswerMark, string> = {
  pending: "",
  accept: "✓",
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

/** "2 wood, 1 slave and Pearls", or "nothing". */
export function bundleWords(G: HegemonyState, bundle: TradeBundle): string {
  const parts = itemsOf(bundle).map((item) => {
    const n = itemCount(bundle, item);
    return item.kind === "good" ? itemName(G, item) : `${n} ${itemName(G, item, n)}`;
  });
  if (parts.length === 0) return "nothing";
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
}

export function settlementLabel(G: HegemonyState, seat: PlayerId, tileId: string): string {
  const settlement = getOwnedSettlement(G, tileId, seat);
  return settlement ? settlementNameOf(G.board.tiles, settlement.id) : tileId;
}
