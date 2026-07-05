import type { HegemonyState, PlayerId } from "./types";
import { addLog, getPlayerName } from "./core/query";
import { drawSeasonalEvent } from "./events";

export function resetTurnFlags(G: HegemonyState) {
  for (const player of Object.values(G.players)) {
    player.collectedThisTurn = false;
    player.grownSettlementsThisTurn = [];
  }
}

export function startNewSeason(G: HegemonyState) {
  if (G.activeSeasonEvent) {
    G.seasonalDiscardPile.push(G.activeSeasonEvent.card);
    G.activeSeasonEvent = null;
  }

  G.season += 1;
  resetTurnFlags(G);
  addLog(G, `Season ${G.season} begins.`);
  drawSeasonalEvent(G);
}

export function expireTurnEventModifiers(G: HegemonyState, playerID: PlayerId) {
  const expired = G.players[playerID].actionCostDiscounts;

  if (expired.length === 0) {
    return;
  }

  G.players[playerID].actionCostDiscounts = [];
  addLog(G, `${getPlayerName(G, playerID)}'s unused event discounts expired.`);
}
