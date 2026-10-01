import type { HegemonyState, PlayerId, Settlement } from "./types";
import { getOwnedSettlement } from "./core/query";
import type { RemovalSummary } from "./tables";

/**
 * Hunger: one pop leaves per mouth the income could not feed. The engine picks for
 * the player, the cheapest loss first: freemen leave before citizens, each from the
 * settlement holding the most of its class. Slaves eat nothing and never leave.
 */
export function applyHunger(G: HegemonyState, playerID: PlayerId, unfed: number): RemovalSummary {
  const summary: RemovalSummary = { total: 0, byType: { citizens: 0, freemen: 0, slaves: 0 } };
  const settlements = G.players[playerID].settlements.flatMap(
    (tileId) => getOwnedSettlement(G, tileId, playerID) ?? [],
  );

  for (let mouth = 0; mouth < unfed; mouth += 1) {
    const pop = fullest(settlements, "freemen") ? "freemen" : "citizens";
    const settlement = fullest(settlements, pop);

    if (!settlement) {
      break;
    }

    settlement.pops[pop] -= 1;
    summary.byType[pop] += 1;
    summary.total += 1;
  }

  G.players[playerID].popsLostToHunger += summary.total;
  return summary;
}

/** The settlement holding the most pops of one class; the earliest founded on a tie. */
function fullest(settlements: Settlement[], pop: "freemen" | "citizens"): Settlement | undefined {
  return settlements.reduce<Settlement | undefined>(
    (best, settlement) => (settlement.pops[pop] > (best?.pops[pop] ?? 0) ? settlement : best),
    undefined,
  );
}
