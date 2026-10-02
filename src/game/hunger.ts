import type { HegemonyState, PlayerId } from "./types";
import { removePops } from "./tables";
import type { RemovalSummary } from "./tables";

/**
 * Hunger: one pop leaves per mouth the income could not feed. The engine picks for
 * the player, the cheapest loss first: freemen leave before citizens, each from the
 * settlement holding the most of its class. Slaves eat nothing and never leave.
 */
export function applyHunger(G: HegemonyState, playerID: PlayerId, unfed: number): RemovalSummary {
  const summary = removePops(G, playerID, unfed, ["freemen", "citizens"]);

  G.players[playerID].popsLostToHunger += summary.total;
  return summary;
}
