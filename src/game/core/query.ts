import { PLAYER_IDS } from "../data";
import type { HegemonyState, PlayerId, Settlement } from "../types";

export function getTile(G: HegemonyState, tileId: string) {
  return G.board.tiles.find((tile) => tile.id === tileId);
}

export function getOwnedSettlement(G: HegemonyState, tileId: string, playerID: PlayerId) {
  const tile = getTile(G, tileId);

  return tile?.settlements.find((settlement) => settlement.owner === playerID);
}

/** Resolve a persistent settlement reference without assuming its board-array position. */
export function getSettlementById(G: HegemonyState, settlementId: string): Settlement | undefined {
  for (const tile of G.board.tiles) {
    const settlement = tile.settlements.find((candidate) => candidate.id === settlementId);
    if (settlement) return settlement;
  }
  return undefined;
}

export function getPlayerName(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID]?.name ?? `Player ${Number(playerID) + 1}`;
}

export function toPlayerId(value: string | null | undefined): PlayerId {
  return PLAYER_IDS.includes(value as PlayerId) ? (value as PlayerId) : "0";
}

/** `about` is the seat the line concerns — the one who acted, or the one it was
 *  done to. See LogEntry.about for why the subject rather than the author. */
export function addLog(G: HegemonyState, message: string, about?: PlayerId) {
  G.log.push({
    id: `${G.season}-${G.log.length}-${message}`,
    season: G.season,
    message,
    ...(about ? { about } : {}),
  });
}

export function getGrownSettlementsThisTurn(G: HegemonyState, playerID: PlayerId) {
  return G.players[playerID].grownSettlementsThisTurn ?? [];
}

export function markSettlementGrown(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const player = G.players[playerID];

  player.grownSettlementsThisTurn = [...(player.grownSettlementsThisTurn ?? []), tileId];
}
