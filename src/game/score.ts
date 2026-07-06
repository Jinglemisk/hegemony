import { totalPops } from "./core/pops";
import type { HegemonyState, PlayerId } from "./types";

export interface PlayerStandings {
  cities: number;
  colonies: number;
  pops: number;
  victoryPoints: number;
}

/**
 * Interim standings so players can track relative position before the real
 * end-condition / scoring system lands. The victory-point formula is the
 * provisional one recorded in todo.md and is expected to change:
 *   +5 / city (capital or upgraded), +3 / colony, +1 / citizen, +1 / freeman,
 *   +1 per 10 banked material resources, -1 per point of negative happiness.
 */
export function playerStandings(G: HegemonyState, playerID: PlayerId): PlayerStandings {
  const player = G.players[playerID];
  let cities = 0;
  let colonies = 0;
  let citizens = 0;
  let freemen = 0;
  let pops = 0;

  for (const tileId of player.settlements) {
    const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!settlement) {
      continue;
    }

    if (settlement.kind === "colony") {
      colonies += 1;
    } else {
      cities += 1;
    }

    citizens += settlement.pops.citizens;
    freemen += settlement.pops.freemen;
    pops += totalPops(settlement.pops);
  }

  const material = player.resources.wood + player.resources.stone + player.resources.gold + player.resources.food;
  const victoryPoints =
    5 * cities + 3 * colonies + citizens + freemen + Math.floor(material / 10) - Math.max(0, -player.resources.happiness);

  return { cities, colonies, pops, victoryPoints };
}
