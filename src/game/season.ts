import type { HegemonyState, PlayerId } from "./types";
import { PLAYER_IDS } from "./data";
import { isNewYear, seasonName, yearOf } from "./core/calendar";
import { capitalize } from "./core/format";
import { addLog, getPlayerName } from "./core/query";
import { drawSeasonalEvent } from "./events";
import { rollYearOmen } from "./tables";
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

  // The seasonal deck is the game's finite clock — if it is spent, the age ends and
  // the victory-card tally resolves (roadmap-appendix D1) BEFORE we advance anything.
  // Ending here (rather than after G.season++/opener rotation) keeps the game-over
  // state on the last season actually played: no phantom season, and endTurn never
  // leaves G.turn/G.season inconsistent for telemetry. The seasonal deck never
  // reshuffles, so an empty draw pile is the exact exhaustion condition
  // (see drawSeasonalCard in events.ts).
  if (G.seasonalDrawPile.length === 0) {
    resolveDeckExhaustion(G);
    return;
  }

  G.season += 1;
  resetTurnFlags(G);

  // A new year rotates the season opener one seat (roadmap-appendix D3d): the year
  // turns, the order turns. Everyone still plays exactly once per season.
  if (isNewYear(G.season)) {
    const index = PLAYER_IDS.indexOf(G.seasonOpener);
    G.seasonOpener = PLAYER_IDS[(index + 1) % PLAYER_IDS.length];
    addLog(G, `${getPlayerName(G, G.seasonOpener)} opens the new year.`);
    // The new opener takes the auspices — the omen replaces last year's.
    rollYearOmen(G);
  }

  addLog(G, `${capitalize(seasonName(G.season))} of Year ${yearOf(G.season)} begins.`);
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
