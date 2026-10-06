import { PLAYER_IDS } from "./data";
import type { HegemonyState, GameOverReason, PlayerId, VictoryMetric } from "./types";
import { totalPops } from "./core/pops";
import { addLog, getPlayerName, getTile } from "./core/query";
import { standingHappiness } from "./happiness";

/**
 * The victory race (roadmap-appendix D1). Six public cards use "Most X, minimum Y":
 * only the sole leader at the minimum holds one. Every card is a level read off the
 * board, so each can be broken off its holder. Holding `ruleset.victory.cardsToWin`
 * cards at the start of your own turn wins immediately.
 *
 * The year deck is the clock: it never reshuffles, and if it runs out before anyone
 * wins the race, most cards held takes the game (tiebreak: happiness, then pops,
 * then seat order).
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
  {
    id: "polis-builder",
    name: "Polis Builder",
    metric: "cities",
    description: "Most cities standing",
  },
  { id: "demos", name: "Demos", metric: "pops", description: "Most total pops" },
  { id: "civic-elite", name: "Civic Elite", metric: "citizens", description: "Most citizens" },
  {
    id: "treasurer",
    name: "Treasurer",
    metric: "gold",
    description: "Largest gold stock",
  },
  {
    id: "beloved",
    name: "Beloved of the People",
    metric: "happiness",
    description: "Highest happiness",
  },
  {
    id: "voice",
    name: "Voice of the Assembly",
    metric: "voice",
    description: "Most standing Laws authored",
  },
];

/** The current value of a victory metric for one player. */
export function victoryMetricValue(
  G: HegemonyState,
  playerID: PlayerId,
  metric: VictoryMetric,
): number {
  const player = G.players[playerID];

  switch (metric) {
    case "voice":
      // A level, not a tally: a repeal or a replaced Law takes it back off its author.
      return G.activeLaws.filter((law) => law.author === playerID).length;
    case "gold":
      return player.resources.gold;
    case "happiness":
      // Beloved reads the level without calm, which lasts a year.
      return standingHappiness(G, playerID);
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
  /** The sole leader before the minimum gate, or null on a tie. */
  leader: PlayerId | null;
  leadingValue: number;
  values: Record<PlayerId, number>;
}

/** All six cards with their current holders — the single source for engine checks and UI. */
export function victoryStandings(G: HegemonyState): VictoryCardStanding[] {
  return VICTORY_CARDS.map((card) => {
    const minimum = G.ruleset.victory.minimums[card.metric];
    const values = PLAYER_IDS.reduce(
      (all, playerID) => ({ ...all, [playerID]: victoryMetricValue(G, playerID, card.metric) }),
      {} as Record<PlayerId, number>,
    );

    let holder: PlayerId | null = null;
    let best = -Infinity;

    for (const playerID of PLAYER_IDS) {
      if (values[playerID] > best) {
        best = values[playerID];
        holder = playerID;
      } else if (values[playerID] === best) {
        holder = null;
      }
    }

    return {
      card,
      minimum,
      holder: holder !== null && best >= minimum ? holder : null,
      leader: holder,
      leadingValue: best,
      values,
    };
  });
}

/** Who holds Voice of the Assembly, or null. */
export function voiceHolder(G: HegemonyState): PlayerId | null {
  return victoryStandings(G).find((standing) => standing.card.metric === "voice")?.holder ?? null;
}

export function victoryCardsHeld(G: HegemonyState, playerID: PlayerId): number {
  return victoryStandings(G).filter((standing) => standing.holder === playerID).length;
}

/**
 * The start-of-turn win check: if the player opening their turn holds enough cards,
 * the game ends on the spot. Runs before income — the table had a full round
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

/** One seat in the age-end tally, with the three numbers its rank is read off. */
export interface TallyRow {
  seat: PlayerId;
  titles: number;
  happiness: number;
  pops: number;
}

/**
 * The age-end tally: most victory cards held, then happiness without calm, then total
 * pops, then seat order. `decidedBy` names the first of those that separates the
 * leader from the next seat.
 */
export function ageEndRanking(G: HegemonyState): {
  rows: TallyRow[];
  decidedBy: "titles" | "happiness" | "pops" | "seat";
} {
  const rows = PLAYER_IDS.map((seat) => ({
    seat,
    titles: victoryCardsHeld(G, seat),
    happiness: standingHappiness(G, seat),
    pops: victoryMetricValue(G, seat, "pops"),
  }));
  const keys = ["titles", "happiness", "pops"] as const;
  rows.sort((a, b) => {
    for (const key of keys) if (a[key] !== b[key]) return b[key] - a[key];
    return PLAYER_IDS.indexOf(a.seat) - PLAYER_IDS.indexOf(b.seat);
  });
  const decidedBy = keys.find((key) => rows[0][key] !== rows[1]?.[key]) ?? "seat";
  return { rows, decidedBy };
}

/**
 * The failsafe ending: the year deck (the clock) is exhausted. Most victory cards
 * held wins; ties break on happiness, then total pops, then seat order.
 */
export function resolveDeckExhaustion(G: HegemonyState) {
  if (G.phase !== "gameplay") {
    return;
  }

  addLog(G, "The years have run their course. The age ends.");
  endGame(G, ageEndRanking(G).rows[0].seat, "deckExhausted");
}

/** Who holds each title, by card id. */
export type TitleHolders = Record<string, PlayerId | null>;

export function titleHolders(G: HegemonyState): TitleHolders {
  return Object.fromEntries(
    victoryStandings(G).map((standing) => [standing.card.id, standing.holder]),
  );
}

/** The best value among the seats other than `seat`, and whose it is (the first in
 *  seat order on a tie). */
function runnerUp(standing: VictoryCardStanding, seat: PlayerId | null) {
  let best: { seat: PlayerId; value: number } | null = null;
  for (const id of PLAYER_IDS) {
    if (id !== seat && (!best || standing.values[id] > best.value))
      best = { seat: id, value: standing.values[id] };
  }
  return best;
}

export interface TitleChange {
  card: VictoryCardDefinition;
  from: PlayerId | null;
  to: PlayerId | null;
  /** The new holder's value, or the tied leaders' when the title fell to nobody. */
  value: number;
  minimum: number;
  /** The best value beside the new holder's (or beside the old holder's on a fall). */
  runnerUp: { seat: PlayerId; value: number } | null;
}

/** Every title whose holder differs from `before`, a fall to nobody included. */
export function titleChanges(G: HegemonyState, before: TitleHolders): TitleChange[] {
  return victoryStandings(G)
    .filter((standing) => (before[standing.card.id] ?? null) !== standing.holder)
    .map((standing) => {
      const from = before[standing.card.id] ?? null;
      return {
        card: standing.card,
        from,
        to: standing.holder,
        value: standing.holder ? standing.values[standing.holder] : standing.leadingValue,
        minimum: standing.minimum,
        runnerUp: runnerUp(standing, standing.holder ?? from),
      };
    });
}

/** A seat holding enough titles to win at the start of its next turn, unless the
 *  table breaks one first: each title it holds with the nearest challenger. */
export interface VictoryThreat {
  seat: PlayerId;
  titles: Array<{
    card: VictoryCardDefinition;
    value: number;
    runnerUp: { seat: PlayerId; value: number } | null;
  }>;
}

export function victoryThreats(G: HegemonyState): VictoryThreat[] {
  if (G.phase !== "gameplay") return [];
  const standings = victoryStandings(G);
  return PLAYER_IDS.flatMap((seat) => {
    const held = standings.filter((standing) => standing.holder === seat);
    return held.length >= G.ruleset.victory.cardsToWin
      ? [
          {
            seat,
            titles: held.map((standing) => ({
              card: standing.card,
              value: standing.values[seat],
              runnerUp: runnerUp(standing, seat),
            })),
          },
        ]
      : [];
  });
}

function endGame(G: HegemonyState, winner: PlayerId, reason: GameOverReason) {
  G.phase = "gameOver";
  G.winner = winner;
  G.gameOverReason = reason;
  addLog(
    G,
    reason === "victoryRace"
      ? `${getPlayerName(G, winner)} holds ${G.ruleset.victory.cardsToWin} victory cards — the game is won!`
      : `${getPlayerName(G, winner)} leads the victory cards as the age ends — the game is won!`,
    winner,
  );
}
