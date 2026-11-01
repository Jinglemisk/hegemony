import type { HegemonyState } from "../game/types";
import { resolvePolicy } from "../sim/policies";
import { playTurn } from "../sim/runner";
import { createSimRng, deriveBotSeed } from "../sim/rng";

/** A board as a real game leaves it: the sim's master bots play every seat until the
 *  year opens (past any sitting). Master searches every turn, so Year 12 takes a
 *  minute or more. */
export function botsToYear(initial: HegemonyState, year: number): HegemonyState {
  const rng = createSimRng(deriveBotSeed(initial.seed));
  const master = resolvePolicy("master");
  let G = initial;
  for (let turn = 0; turn < 400; turn++) {
    if (G.phase !== "gameplay" || (G.year >= year && !G.assembly)) break;
    G = playTurn(G, master, rng);
  }
  return G;
}
