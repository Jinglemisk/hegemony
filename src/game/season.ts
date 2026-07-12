import type { HegemonyState, PlayerId } from "./types";
import { PLAYER_IDS } from "./data";
import { isNewYear, seasonName, yearOf } from "./core/calendar";
import { capitalize } from "./core/format";
import { addLog, getPlayerName } from "./core/query";
import { drawSeasonalEvent } from "./events";
import { resolveDeckExhaustion } from "./victory";

export function resetTurnFlags(G: HegemonyState) {
  for (const player of Object.values(G.players)) {
    player.collectedThisTurn = false;
    player.grownSettlementsThisTurn = [];
    player.civicCalmUsedThisTurn = false;
    player.ladderUsedThisTurn = false;
    player.ventureUsedThisTurn = false;
  }
}

export function startNewSeason(G: HegemonyState) {
  if (G.activeSeasonEvent) {
    G.seasonalDiscardPile.push(G.activeSeasonEvent.card);
    G.activeSeasonEvent = null;
  }

  G.season += 1;
  resetTurnFlags(G);

  // A new year rotates the season opener one seat (roadmap-appendix D3d): the year
  // turns, the order turns. Everyone still plays exactly once per season.
  if (isNewYear(G.season)) {
    const index = PLAYER_IDS.indexOf(G.seasonOpener);
    G.seasonOpener = PLAYER_IDS[(index + 1) % PLAYER_IDS.length];
    addLog(G, `${getPlayerName(G, G.seasonOpener)} opens the new year.`);
  }

  addLog(G, `${capitalize(seasonName(G.season))} of Year ${yearOf(G.season)} begins.`);
  drawSeasonalEvent(G);

  // The seasonal deck is the game's finite clock — no card left means the age ends
  // and the victory-card tally resolves (roadmap-appendix D1).
  if (!G.activeSeasonEvent) {
    resolveDeckExhaustion(G);
  }
}

export function expireTurnEventModifiers(G: HegemonyState, playerID: PlayerId) {
  const expired = G.players[playerID].actionCostDiscounts;

  if (expired.length === 0) {
    return;
  }

  G.players[playerID].actionCostDiscounts = [];
  addLog(G, `${getPlayerName(G, playerID)}'s unused event discounts expired.`);
}
