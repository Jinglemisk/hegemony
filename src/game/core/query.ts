import { isDraft, original } from "immer";
import { PLAYER_IDS } from "../data";
import type { HegemonyState, HexTile, PlayerId, Settlement, YearTerm } from "../types";

const tilePositions = new WeakMap<HexTile[], Map<string, number>>();

export function getTile(G: HegemonyState, tileId: string) {
  const tiles = G.board.tiles;
  const base = isDraft(tiles) ? original(tiles)! : tiles;
  if (Object.isFrozen(base)) {
    let positions = tilePositions.get(base);
    if (!positions) {
      positions = new Map(base.map((tile, index) => [tile.id, index]));
      tilePositions.set(base, positions);
    }
    const position = positions.get(tileId);
    // Tiles never move within a match. Still fall back if a draft has changed
    // the array: read the current tile, never the immutable cached tile object.
    if (position !== undefined && tiles[position]?.id === tileId) return tiles[position];
  }
  return tiles.find((tile) => tile.id === tileId);
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
    id: `${G.year}-${G.log.length}-${message}`,
    year: G.year,
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

/** The term this year's card zeroes for the whole table, or null. */
export function zeroedYearTerm(G: HegemonyState): YearTerm | null {
  const effect = G.activeYearCard?.effect;

  return effect?.type === "zeroTerm" ? effect.term : null;
}
