import { getTile } from "./core/query";
import { totalPops } from "./core/pops";
import { victoryCardsHeld } from "./victory";
import type { HegemonyState, PlayerId } from "./types";

export interface PlayerStandings {
  cities: number;
  colonies: number;
  pops: number;
  /** Victory cards currently held — the real score (see game/victory.ts). */
  victoryCards: number;
}

/**
 * Roster standings: settlement/pop counts plus victory cards held. The old
 * provisional VP formula is gone — the victory race (game/victory.ts) is the
 * scoring system now; the sim's greedy bot keeps its own positional heuristic
 * in src/sim/policies.ts.
 */
export function playerStandings(G: HegemonyState, playerID: PlayerId): PlayerStandings {
  const player = G.players[playerID];
  let cities = 0;
  let colonies = 0;
  let pops = 0;

  for (const tileId of player.settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!settlement) {
      continue;
    }

    if (settlement.kind === "colony") {
      colonies += 1;
    } else {
      cities += 1;
    }

    pops += totalPops(settlement.pops);
  }

  return { cities, colonies, pops, victoryCards: victoryCardsHeld(G, playerID) };
}
