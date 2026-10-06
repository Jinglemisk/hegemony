import { getBuildings } from "./content";
import { POP_TYPES, totalPops } from "./core/pops";
import { settlementCapacity } from "./settlement";
import { formatPopName } from "./core/format";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { applyResourceDeltaWithFloors, createResourceDelta } from "./core/resources";
import { mulberry32 } from "./core/rng";
import type {
  EventTableDefinition,
  HegemonyState,
  PlayerId,
  PopLeave,
  PopType,
  Settlement,
  TableEffect,
  TableRollRecord,
} from "./types";

/**
 * The event-table engine seam (docs/archive/plans/event-tables.md): one function rolls every
 * dice table in the game — riot and the expeditions. Tables are content data
 * ({@link ./data}); this module owns the die, the modifier/clamp arithmetic, and the
 * effect interpreter. All randomness runs through the game's own mulberry32 state so
 * a table roll is as replayable as a deck shuffle.
 */

export interface RollOptions {
  /** Net roll modifier: riot insurance adds 1 for each option bought. */
  modifier?: number;
}

export interface RollResult {
  record: TableRollRecord;
  /** Total pops removed by the roll's effects — the riot adds this to popsLostToUnrest. */
  popsRemoved: number;
  /** Each pop the roll removed, by settlement. */
  left: PopLeave[];
}

/** One die of any size through the game's seeded PRNG state — the die size is table
 *  data ({@link EventTableDefinition.die}), so a d8 or d12 table is a data edit. */
export function rollDie(G: HegemonyState, sides: number): number {
  const step = mulberry32(G.rng);
  G.rng = step.state;
  return 1 + Math.floor(step.value * sides);
}

/**
 * Roll on a table for `playerID` and apply the landed row's effects. The natural d6
 * plus the modifier clamps into 1–6 — a table can never be rolled off. The record is
 * stored on {@link HegemonyState.lastTableRoll} so the UI shows the outcome without
 * ever re-rolling.
 */
export function rollOnTable(
  G: HegemonyState,
  playerID: PlayerId,
  table: EventTableDefinition,
  { modifier = 0 }: RollOptions = {},
): RollResult {
  const die = table.die ?? 6;
  const roll = rollDie(G, die);
  const modified = Math.min(die, Math.max(1, roll + modifier));
  const row =
    table.rows.find((candidate) => candidate.roll === modified) ??
    table.rows[table.rows.length - 1];

  const modifierText = modifier === 0 ? "" : ` ${modifier > 0 ? "+" : ""}${modifier} → ${modified}`;
  addLog(
    G,
    `${getPlayerName(G, playerID)} rolls ${roll}${modifierText} on the ${table.name} table: ${row.label}.`,
    playerID,
  );

  const outcomes: string[] = [];
  const left: PopLeave[] = [];

  for (const effect of row.effects) {
    const applied = applyTableEffect(G, playerID, effect);
    left.push(...applied.left);
    outcomes.push(...applied.outcomes);
  }

  const record: TableRollRecord = {
    tableId: table.id,
    playerID,
    roll,
    modified,
    modifier,
    rowLabel: row.label,
    outcomes,
    year: G.year,
  };
  G.lastTableRoll = record;
  return { record, popsRemoved: left.length, left };
}

function applyTableEffect(
  G: HegemonyState,
  playerID: PlayerId,
  effect: TableEffect,
): { outcomes: string[]; left: PopLeave[] } {
  const player = G.players[playerID];
  const name = getPlayerName(G, playerID);

  switch (effect.type) {
    case "none":
      return { outcomes: ["No losses."], left: [] };

    case "losePops": {
      const removed = removePops(G, playerID, effect.count);
      const text =
        removed.total > 0 ? `Lost ${describeRemoval(removed)}.` : "No pops left to lose.";
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], left: removed.left };
    }

    case "loseResource": {
      const held = player.resources[effect.resource];
      const floor = G.ruleset.economy.stockpileFloors[effect.resource] ?? 0;
      const paid = Math.min(effect.amount, Math.max(0, held - floor));
      applyResourceDeltaWithFloors(
        player.resources,
        createResourceDelta(effect.resource, -paid),
        G.ruleset.economy.stockpileFloors,
      );
      const outcomes = [`Lost ${paid} ${effect.resource}.`];
      let left: PopLeave[] = [];

      // The bribe pattern: coming up short is paid in blood on top of the coin.
      if (paid < effect.amount && effect.popLossIfShort) {
        const removed = removePops(G, playerID, effect.popLossIfShort);
        left = removed.left;
        if (removed.total > 0) {
          outcomes.push(`Couldn't pay in full — lost ${describeRemoval(removed)}.`);
        }
      }

      addLog(G, `${name} — ${outcomes.join(" ")}`);
      return { outcomes, left };
    }

    case "destroyBuilding": {
      const destroyed = destroyRandomBuilding(G, playerID);

      if (destroyed) {
        addLog(G, `${name} — ${destroyed} burns to the ground.`);
        return { outcomes: [`${destroyed} destroyed.`], left: [] };
      }

      // Nothing to burn: the fallback pops are lost instead, so a buildingless
      // player's roll 1 stays strictly worse than roll 2's two pops never inverting.
      const removed = removePops(G, playerID, effect.popLossFallback);
      const text =
        removed.total > 0
          ? `No buildings to burn — lost ${describeRemoval(removed)} instead.`
          : "Nothing left to lose.";
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], left: removed.left };
    }

    case "gainResource": {
      applyResourceDeltaWithFloors(
        player.resources,
        createResourceDelta(effect.resource, effect.amount),
        G.ruleset.economy.stockpileFloors,
      );
      const text = `Gained ${effect.amount} ${effect.resource}.`;
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], left: [] };
    }

    case "gainPop": {
      const settled = addPopToSettlementWithRoom(G, playerID, effect.pop);

      if (settled) {
        player.popsGainedFromEvents += 1;
        const text = `1 ${formatPopName(effect.pop, 1)} settles in ${settled}.`;
        addLog(G, `${name} — ${text}`);
        return { outcomes: [text], left: [] };
      }

      applyResourceDeltaWithFloors(
        player.resources,
        createResourceDelta("food", effect.foodFallback),
        G.ruleset.economy.stockpileFloors,
      );
      const text = `No settlement has room — the settlers leave ${effect.foodFallback} food and sail on.`;
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], left: [] };
    }
  }
}

export type RemovalSummary = {
  total: number;
  byType: Record<PopType, number>;
  /** Each pop removed, by settlement, in the order it left. */
  left: PopLeave[];
};

/** The order a table's pop losses fall in: slaves first, then freemen, then citizens. */
const TABLE_LOSS_ORDER: PopType[] = ["slaves", "freemen", "citizens"];

/**
 * Remove `count` pops, taking the classes in `order`: every pop of the first class
 * goes before any of the next. Each leaves the settlement holding the most of its
 * class, the earliest founded on a tie, so the same state always loses the same
 * pops. A settlement left at zero pops still stands. Riots, revolts and hunger all
 * remove pops through here.
 */
export function removePops(
  G: HegemonyState,
  playerID: PlayerId,
  count: number,
  order: PopType[] = TABLE_LOSS_ORDER,
): RemovalSummary {
  const summary: RemovalSummary = {
    total: 0,
    byType: { citizens: 0, freemen: 0, slaves: 0 },
    left: [],
  };
  const settlements = G.players[playerID].settlements.flatMap(
    (tileId) => getOwnedSettlement(G, tileId, playerID) ?? [],
  );

  for (let lost = 0; lost < count; lost += 1) {
    const pop = order.find((candidate) => fullest(settlements, candidate));
    const settlement = pop && fullest(settlements, pop);

    if (!pop || !settlement) {
      break;
    }

    settlement.pops[pop] -= 1;
    summary.byType[pop] += 1;
    summary.total += 1;
    summary.left.push({ tileId: settlement.tileId, pop });
  }

  return summary;
}

/** The settlement holding the most pops of one class; the earliest founded on a tie. */
function fullest(settlements: Settlement[], pop: PopType): Settlement | undefined {
  return settlements.reduce<Settlement | undefined>(
    (best, settlement) => (settlement.pops[pop] > (best?.pops[pop] ?? 0) ? settlement : best),
    undefined,
  );
}

/** "2 slaves, 1 freeman" — nonzero pop types in a stable order, using the shared pop labels. */
export function describeRemoval(summary: RemovalSummary): string {
  const parts = POP_TYPES.filter((pop) => summary.byType[pop] > 0).map(
    (pop) => `${summary.byType[pop]} ${formatPopName(pop, summary.byType[pop])}`,
  );

  return parts.join(", ");
}

/** Burn one random owned building (seeded). Returns its display name, or null if the
 *  player owns none. Because a settlement's `buildings` are copies (levels), splicing
 *  one out already IS the downgrade — a level-3 Granary drops to level 2 rather than
 *  vanishing, only the last copy is truly destroyed (Phase 2 level model). */
function destroyRandomBuilding(G: HegemonyState, playerID: PlayerId): string | null {
  const owned: Array<{ settlement: Settlement; index: number }> = [];

  for (const tileId of G.players[playerID].settlements) {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    for (let index = 0; index < (settlement?.buildings.length ?? 0); index += 1) {
      owned.push({ settlement: settlement!, index });
    }
  }

  if (owned.length === 0) {
    return null;
  }

  const step = mulberry32(G.rng);
  G.rng = step.state;
  const target = owned[Math.floor(step.value * owned.length)];
  const [removed] = target.settlement.buildings.splice(target.index, 1);
  return (
    getBuildings(G.definition.content).find((building) => building.id === removed)?.name ?? removed
  );
}

/** Add one pop to a random owned settlement with spare capacity (seeded). Returns a
 *  human label for the destination, or null when every settlement is full. */
function addPopToSettlementWithRoom(
  G: HegemonyState,
  playerID: PlayerId,
  pop: PopType,
): string | null {
  const candidates: Settlement[] = [];

  for (const tileId of G.players[playerID].settlements) {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    if (settlement && totalPops(settlement.pops) < settlementCapacity(settlement, G)) {
      candidates.push(settlement);
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const step = mulberry32(G.rng);
  G.rng = step.state;
  const target = candidates[Math.floor(step.value * candidates.length)];
  target.pops[pop] += 1;
  return `their ${target.kind}`;
}
