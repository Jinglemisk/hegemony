import type { HegemonyState, PlayerId, Resources, YearCardImpact } from "./types";
import { PLAYER_IDS } from "./data";
import { addLog, getOwnedSettlement, getPlayerName, getTile } from "./core/query";
import { applyUnrestTokenChange, happinessLevel } from "./happiness";
import { yearCardLoss } from "./economy/income";
import { shuffleWithSeed } from "./core/rng";
import { resolveAgeEnd } from "./victory";

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
 * Festival act once, here, on every realm. The Chronicle line carries what the card
 * did to each seat as it turned, for the year card's face.
 */
export function revealYearCard(G: HegemonyState) {
  const card = G.yearDrawPile.shift();

  if (!card) {
    return;
  }

  const before = Object.fromEntries(
    PLAYER_IDS.map((playerID) => [playerID, happinessLevel(G, playerID)]),
  ) as Record<PlayerId, number>;
  G.activeYearCard = card;

  if (card.effect.type === "unrestTokens") {
    for (const playerID of PLAYER_IDS) {
      applyUnrestTokenChange(G, playerID, card.effect.change);
    }
  }

  const impact = Object.fromEntries(
    PLAYER_IDS.map((playerID) => [
      playerID,
      {
        before: before[playerID],
        after: happinessLevel(G, playerID),
        loss: realmLoss(G, playerID),
      },
    ]),
  ) as YearCardImpact;
  addLog(G, `The year's card is ${card.name}: ${card.text}`, undefined, {
    kind: "yearCard",
    cardId: card.id,
    impact,
  });
}

/** What the standing year card takes from a realm's next income, summed. */
function realmLoss(G: HegemonyState, playerID: PlayerId): Partial<Resources> {
  const loss: Partial<Resources> = {};
  for (const tileId of G.players[playerID].settlements) {
    const tile = getTile(G, tileId);
    const settlement = getOwnedSettlement(G, tileId, playerID);
    const taken = tile && settlement ? yearCardLoss(G, tile, settlement) : null;
    if (taken) loss[taken.resource] = (loss[taken.resource] ?? 0) + taken.amount;
  }
  return loss;
}

export function startNewYear(G: HegemonyState) {
  // The game's length is its clock. After the last year the age ends and the
  // victory-card tally resolves, before anything advances, so the game-over state
  // sits on the last year actually played.
  if (G.year >= lastYear(G)) {
    resolveAgeEnd(G);
    return;
  }

  if (G.activeYearCard) {
    G.yearDiscardPile.push(G.activeYearCard);
    G.activeYearCard = null;
  }

  // A game longer than the deck shuffles the spent years back in.
  if (G.yearDrawPile.length === 0) {
    const reshuffled = shuffleWithSeed(G.yearDiscardPile, G.rng);
    G.yearDrawPile = reshuffled.cards;
    G.rng = reshuffled.state;
    G.yearDiscardPile = [];
    addLog(G, "The year deck is spent and shuffled back in.");
  }

  G.year += 1;
  resetTurnFlags(G);

  // The opener moves on one seat each year, so no seat always plays first. Everyone
  // still plays exactly once a year.
  const index = PLAYER_IDS.indexOf(G.yearOpener);
  G.yearOpener = PLAYER_IDS[(index + 1) % PLAYER_IDS.length];
  addLog(G, `Year ${G.year} begins. ${getPlayerName(G, G.yearOpener)} plays first.`, G.yearOpener);

  revealYearCard(G);
}

/** An open game's safety stop: no game runs past this year. */
const OPEN_GAME_YEAR_CAP = 40;

/** The game's last year: its length, or an open game's safety stop. The ruleset is
 *  enough, so the sim can size a game before it builds one. */
export function lastYear(G: Pick<HegemonyState, "ruleset">): number {
  return G.ruleset.victory.years ?? OPEN_GAME_YEAR_CAP;
}

/** The year deck's full size, including the card not yet revealed during setup. */
export function yearDeckSize(G: Pick<HegemonyState, "definition">): number {
  return G.definition.content.yearCards.reduce((total, card) => total + card.count, 0);
}
