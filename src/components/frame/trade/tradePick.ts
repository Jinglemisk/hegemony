import { createContext, useContext } from "react";
import { totalPops } from "../../../game/core/pops";
import { tradePopSources, tradePopTargets } from "../../../game/trade";
import type { HegemonyState, PlayerId, Pops, TradePlaces } from "../../../game/types";
import type { MapSelectionMode } from "../../board/map/mapSelection";

/**
 * Traded pops are placed on the map, as a move's are. A trade that hands over pops
 * asks its seat, before the command goes, for the settlement they leave; one that brings
 * pops asks where they go. Each pick is a map mode; the shell runs them in turn and
 * sends the command with the places named.
 */
export type TradePickRequest = {
  seat: PlayerId;
  /** The other side, shown on the popover with a handshake; null before anyone accepts. */
  partner: PlayerId | null;
  gives: Pops;
  gets: Pops;
  /** Places already named, kept when they still serve: an offer's, for its counter. */
  places?: TradePlaces;
};

/** Ask for the places a trade needs, then call `send` with them. */
export type PickTradePlaces = (
  request: TradePickRequest,
  send: (places: TradePlaces) => void,
) => void;

/** The map pick a trade still needs, or null when every place it needs is named. */
export function nextTradePick(
  G: HegemonyState,
  request: TradePickRequest,
  places: TradePlaces,
): MapSelectionMode | null {
  const { seat, partner, gives, gets } = request;
  if (totalPops(gives) > 0 && !tradePopSources(G, seat, gives).includes(places.from ?? "")) {
    return { kind: "tradePops", seat, partner, pops: gives, direction: "send" };
  }
  if (totalPops(gets) > 0 && !tradePopTargets(G, seat, gets).includes(places.to ?? "")) {
    return { kind: "tradePops", seat, partner, pops: gets, direction: "receive" };
  }
  return null;
}

/** Only the places the trade's pops use. */
export function usedPlaces(request: TradePickRequest, places: TradePlaces): TradePlaces {
  return {
    ...(totalPops(request.gives) > 0 && places.from ? { from: places.from } : {}),
    ...(totalPops(request.gets) > 0 && places.to ? { to: places.to } : {}),
  };
}

export const TradePickContext = createContext<PickTradePlaces | null>(null);

export function useTradePick(): PickTradePlaces {
  const pick = useContext(TradePickContext);
  if (!pick) throw new Error("useTradePick must be used inside the board");
  return pick;
}
