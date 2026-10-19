import { getExpeditionTables } from "../game/content";
import { getOwnedSettlement } from "../game/core/query";
import { totalPops } from "../game/core/pops";
import { mulberry32 } from "../game/core/rng";
import { transition, type GameCommand } from "../game/legalMoves";
import { settlementCapacity } from "../game/settlement";
import type { HegemonyState, PlayerId } from "../game/types";

/** Exhaust the public die and the Voyage's uniform settlement lottery through
 * canonical transitions. Synthetic seeds encode each outcome; the live game's
 * RNG never enters this calculation. No duplicated payout/cost interpreter. */
export function ventureOutcomes(
  G: HegemonyState,
  player: PlayerId,
  command: Extract<GameCommand, { type: "fundExpedition" }>,
): Array<{ state: HegemonyState; probability: number }> {
  const table = getExpeditionTables(G.definition.content).find(
    (candidate) => candidate.id === command.expeditionId,
  );
  if (!table) return [];
  const die = table.die ?? 6;
  const destinations = G.players[player].settlements.filter((id) => {
    const settlement = getOwnedSettlement(G, id, player);
    return settlement && totalPops(settlement.pops) < settlementCapacity(settlement, G);
  }).length;
  const seeds = new Map<string, number>();
  const slots = (roll: number) => {
    const row = table.rows.find((candidate) => candidate.roll === roll) ?? table.rows.at(-1)!;
    return row.effects.some((effect) => effect.type === "gainPop") ? Math.max(1, destinations) : 1;
  };
  const outcomeCount = Array.from({ length: die }, (_, i) => slots(i + 1)).reduce(
    (sum, count) => sum + count,
    0,
  );
  // Enumerate synthetic streams, stopping once every public outcome has a seed.
  for (let seed = 0; seeds.size < outcomeCount; seed += 1) {
    const first = mulberry32(seed);
    const roll = 1 + Math.floor(first.value * die);
    const count = slots(roll);
    const destination = count > 1 ? Math.floor(mulberry32(first.state).value * count) : 0;
    const key = `${roll}:${destination}`;
    if (!seeds.has(key)) seeds.set(key, seed);
  }
  return [...seeds].map(([key, seed]) => {
    const roll = Number(key.split(":")[0]);
    const result = transition(G.definition, { ...G, rng: seed }, player, command);
    if (!result.ok) throw new Error(`Illegal hypothetical venture: ${result.reasons.join("; ")}`);
    return {
      state: { ...result.state, rng: G.rng },
      probability: 1 / die / slots(roll),
    };
  });
}
