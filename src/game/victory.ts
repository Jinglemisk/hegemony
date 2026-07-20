import { PLAYER_IDS } from "./data";
import type { HegemonyState, GameOverReason, PlayerId, VictoryMetric } from "./types";
import { totalPops } from "./core/pops";
import { addLog, getPlayerName, getTile } from "./core/query";
import { authoredSteleCount, patronCount, stratoklesCoupStatus } from "./assembly/power";

/**
 * The victory race (roadmap-appendix D1). Five public victory cards, each "Most X,
 * minimum Y": a card is held only by the SOLE leader in its metric who also meets the
 * ruleset minimum — ties, or leading below the minimum, leave it unheld. Holding
 * `ruleset.victory.cardsToWin` cards at the START of your own turn wins immediately.
 *
 * The seasonal event deck is the failsafe clock: it no longer reshuffles, and if it
 * runs out before anyone wins the race, most cards held takes the game (tiebreak:
 * happiness, then pops, then seat order).
 *
 * Minimums live in `ruleset.victory` so game length is a data dial, not code.
 */

export interface VictoryCardDefinition {
  id: string;
  name: string;
  metric: VictoryMetric;
  /** Player-facing summary; the minimum is appended from the ruleset at display time. */
  description: string;
}

export const VICTORY_CARDS: VictoryCardDefinition[] = [
  { id: "polis-builder", name: "Polis Builder", metric: "cities", description: "Most cities standing" },
  { id: "demos", name: "Demos", metric: "pops", description: "Most total pops" },
  { id: "civic-elite", name: "Civic Elite", metric: "citizens", description: "Most citizens" },
  { id: "treasurer", name: "Treasurer", metric: "stockpile", description: "Largest banked material stockpile" },
  { id: "beloved", name: "Beloved of the People", metric: "happiness", description: "Highest happiness" },
  // The Assembly's political card (§1.7). Deliberately a LIVE METRIC and not a
  // one-time achievement: it recomputes every turn off the board's stelae and flips
  // hands like the other five, so the Assembly stays contestable to the last year.
  { id: "voice", name: "Voice of the Assembly", metric: "voice", description: "Patron of the most politicians" }
];

/** The current value of a victory metric for one player. */
export function victoryMetricValue(G: HegemonyState, playerID: PlayerId, metric: VictoryMetric): number {
  const player = G.players[playerID];

  switch (metric) {
    case "voice":
      return patronCount(G, playerID);
    case "stockpile": {
      const { wood, stone, gold, food } = player.resources;
      return wood + stone + gold + food;
    }
    case "happiness":
      return player.resources.happiness;
    case "cities":
    case "pops":
    case "citizens": {
      let cities = 0;
      let pops = 0;
      let citizens = 0;

      for (const tileId of player.settlements) {
        const tile = getTile(G, tileId);
        const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

        if (!settlement) {
          continue;
        }

        if (settlement.kind !== "colony") {
          cities += 1;
        }
        pops += totalPops(settlement.pops);
        citizens += settlement.pops.citizens;
      }

      return metric === "cities" ? cities : metric === "pops" ? pops : citizens;
    }
  }
}

export interface VictoryCardStanding {
  card: VictoryCardDefinition;
  minimum: number;
  /** The sole leader at or above the minimum, or null (tied / nobody qualifies). */
  holder: PlayerId | null;
  values: Record<PlayerId, number>;
}

/**
 * A card's secondary metric, used ONLY to separate seats tied on the primary one.
 * Cards without a tiebreak keep the original rule — a tie leaves the card unheld.
 *
 * Only the Voice card has one: patronage is a coarse metric (0–4 with four
 * politicians), so ties on it are common enough that leaving the card permanently
 * unheld would make it decorative. Total stelae authored separates two seats who each
 * patron two politicians by how much of the agora they actually built (§1.7).
 */
function victoryTiebreakValue(G: HegemonyState, playerID: PlayerId, metric: VictoryMetric): number | null {
  return metric === "voice" ? authoredSteleCount(G, playerID) : null;
}

/** All six cards with their current holders — the single source for engine checks and UI. */
export function victoryStandings(G: HegemonyState): VictoryCardStanding[] {
  return VICTORY_CARDS.map((card) => {
    const minimum = G.ruleset.victory.minimums[card.metric];
    const values = PLAYER_IDS.reduce(
      (all, playerID) => ({ ...all, [playerID]: victoryMetricValue(G, playerID, card.metric) }),
      {} as Record<PlayerId, number>
    );

    let holder: PlayerId | null = null;
    let best = -Infinity;
    let bestTiebreak = -Infinity;

    for (const playerID of PLAYER_IDS) {
      const tiebreak = victoryTiebreakValue(G, playerID, card.metric);

      if (values[playerID] > best) {
        best = values[playerID];
        bestTiebreak = tiebreak ?? -Infinity;
        holder = playerID;
      } else if (values[playerID] === best) {
        if (tiebreak === null) {
          holder = null;
        } else if (tiebreak > bestTiebreak) {
          bestTiebreak = tiebreak;
          holder = playerID;
        } else if (tiebreak === bestTiebreak) {
          holder = null;
        }
      }
    }

    return { card, minimum, holder: holder !== null && best >= minimum ? holder : null, values };
  });
}

export function victoryCardsHeld(G: HegemonyState, playerID: PlayerId): number {
  return victoryStandings(G).filter((standing) => standing.holder === playerID).length;
}

/**
 * The start-of-turn win check: if the player opening their turn holds enough cards,
 * the game ends on the spot. Runs before upkeep/income — the table had a full round
 * to break a card off them.
 */
export function checkVictoryAtTurnStart(G: HegemonyState) {
  if (G.phase !== "gameplay") {
    return;
  }

  const playerID = G.currentPlayer;
  const held = victoryCardsHeld(G, playerID);

  if (held >= G.ruleset.victory.cardsToWin) {
    endGame(G, playerID, "victoryRace");
  }
}

/**
 * The failsafe ending: the seasonal deck (the clock) is exhausted. Most victory cards
 * held wins; ties break on happiness, then total pops, then seat order.
 */
export function resolveDeckExhaustion(G: HegemonyState) {
  if (G.phase !== "gameplay") {
    return;
  }

  const ranked = [...PLAYER_IDS].sort((a, b) => {
    const cards = victoryCardsHeld(G, b) - victoryCardsHeld(G, a);
    if (cards !== 0) return cards;

    const happiness = G.players[b].resources.happiness - G.players[a].resources.happiness;
    if (happiness !== 0) return happiness;

    const pops = victoryMetricValue(G, b, "pops") - victoryMetricValue(G, a, "pops");
    if (pops !== 0) return pops;

    return PLAYER_IDS.indexOf(a) - PLAYER_IDS.indexOf(b);
  });

  addLog(G, "The seasons have run their course — the age ends.");
  endGame(G, ranked[0], "deckExhausted");
}

/**
 * Stratokles's coup (§1.8). Once the demagogue holds more stelae than any other
 * politician AND has reached the tally threshold, he seizes the city and **his patron
 * wins outright**.
 *
 * Resolved as a win rather than an everybody-loses cap on purpose: a mutual loss is a
 * dead rule nobody would ever trigger, whereas crowning the patron gives a trailing
 * player a real comeback line — quietly feed the chaos — and gives everyone else a
 * concrete reason to vote his Directives down. Checked when an assembly closes, which
 * is the only moment his track can have moved.
 */
export function checkStratoklesCoup(G: HegemonyState) {
  if (G.phase !== "gameplay") {
    return;
  }

  const coup = stratoklesCoupStatus(G);

  if (coup.triggered && coup.patron) {
    addLog(G, "The demagogue's monuments fill the agora — Stratokles seizes the city.");
    endGame(G, coup.patron, "stratoklesCoup");
  }
}

function endGame(G: HegemonyState, winner: PlayerId, reason: GameOverReason) {
  G.phase = "gameOver";
  G.winner = winner;
  G.gameOverReason = reason;
  addLog(
    G,
    reason === "victoryRace"
      ? `${getPlayerName(G, winner)} holds ${G.ruleset.victory.cardsToWin} victory cards — the game is won!`
      : reason === "stratoklesCoup"
        ? `${getPlayerName(G, winner)} rides the mob to power as Stratokles's patron — the game is won!`
        : `${getPlayerName(G, winner)} leads the victory cards as the age ends — the game is won!`
  );
}
