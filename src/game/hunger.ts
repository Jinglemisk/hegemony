import { effectiveRuleset } from "./assembly/laws";
import type { HegemonyState, PlayerId } from "./types";
import { removePops } from "./tables";
import type { RemovalSummary } from "./tables";

/**
 * Hunger: one pop leaves per mouth the income could not feed. The engine picks for
 * the player, the cheapest loss first: freemen leave before citizens, each from the
 * settlement holding the most of its class. Slaves eat nothing and never leave.
 */
export function applyHunger(G: HegemonyState, playerID: PlayerId, unfed: number): RemovalSummary {
  const rules = effectiveRuleset(G);
  const mouths = (["freemen", "citizens"] as const).filter(
    (pop) => (rules.popIncome[pop].flat.food ?? 0) < 0,
  );
  const summary = removePops(G, playerID, unfed, mouths);

  G.players[playerID].popsLostToHunger += summary.total;
  return summary;
}
