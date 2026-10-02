import type { HegemonyState, PlayerId } from "./types";
import { PLAYER_IDS } from "./data";
import { addLog, getPlayerName } from "./core/query";
import { resolveDeckExhaustion } from "./victory";

export function resetTurnFlags(G: HegemonyState) {
  for (const player of Object.values(G.players)) {
    player.collectedThisTurn = false;
    player.grownSettlementsThisTurn = [];
    player.civicCalmUsedThisTurn = false;
    player.ladderUsedThisTurn = false;
    player.ventureUsedThisTurn = false;
    player.moveUsedThisTurn = false;
    player.calmActive = false;
  }
}

/**
 * Turn the top card of the year deck face up. A card that zeroes a term stands until
 * the year turns and is read by the income and happiness selectors; Plague and
 * Festival act once, here, on every realm.
 */
export function revealYearCard(G: HegemonyState) {
  const card = G.yearDrawPile.shift();

  if (!card) {
    return;
  }

  G.activeYearCard = card;
  addLog(G, `The year's card is ${card.name}: ${card.text}`);

  if (card.effect.type === "unrestTokens") {
    for (const player of Object.values(G.players)) {
      player.unrestTokens = card.effect.change === "placeOne" ? player.unrestTokens + 1 : 0;
    }
  }
}

export function startNewYear(G: HegemonyState) {
  // The year deck is the game's clock and never reshuffles. When it is spent the age
  // ends and the victory-card tally resolves, before anything advances, so the
  // game-over state sits on the last year actually played.
  if (G.yearDrawPile.length === 0) {
    resolveDeckExhaustion(G);
    return;
  }

  if (G.activeYearCard) {
    G.yearDiscardPile.push(G.activeYearCard);
    G.activeYearCard = null;
  }

  G.year += 1;
  resetTurnFlags(G);

  // The opener moves on one seat each year, so no seat always plays first. Everyone
  // still plays exactly once a year.
  const index = PLAYER_IDS.indexOf(G.yearOpener);
  G.yearOpener = PLAYER_IDS[(index + 1) % PLAYER_IDS.length];
  addLog(G, `Year ${G.year} begins. ${getPlayerName(G, G.yearOpener)} plays first.`, G.yearOpener);

  // Once-a-year coupons from standing Laws (Monumental Code's free building, Land
  // Rush's free colony) refresh with the year that granted them.
  for (const player of Object.values(G.players)) {
    player.lawFreeActionsUsedThisYear = [];
  }

  revealYearCard(G);
}

/** The clock's full deck size, including the card not yet revealed during setup. */
export function yearDeckSize(G: HegemonyState): number {
  return G.definition.content.yearCards.reduce((total, card) => total + card.count, 0);
}

export function expireTurnEventModifiers(G: HegemonyState, playerID: PlayerId) {
  const expired = G.players[playerID].actionCostDiscounts;

  if (expired.length === 0) {
    return;
  }

  G.players[playerID].actionCostDiscounts = [];
  addLog(G, `${getPlayerName(G, playerID)}'s unused event discounts expired.`, playerID);
}
