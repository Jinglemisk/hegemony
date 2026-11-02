import { getBuildings } from "./content";
import { POP_TYPES, fullest, totalPops } from "./core/pops";
import { formatPopName } from "./core/format";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { applyResourceDeltaWithFloors, createResourceDelta } from "./core/resources";
import { releaseLuxuriesAfterPortLoss } from "./luxury";
import { mulberry32 } from "./core/rng";
import type {
  EventTableDefinition,
  EventTableRow,
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
 * dice table in the game, which is the riot's today. Tables are content data
 * ({@link ./data}); this module owns the die, the modifier/clamp arithmetic, and the
 * effect interpreter. All randomness runs through the game's own mulberry32 state so
 * a table roll is as replayable as a deck shuffle.
 *
 * A roll applies its row's stocks and buildings and counts its pops. The caller takes
 * the pops: a riot asks first whether a held card stands in for each (game/riot.ts).
 */

export interface RollOptions {
  /** Net roll modifier: riot insurance adds 1 for each option bought. */
  modifier?: number;
}

export interface RollResult {
  record: TableRollRecord;
  /** The pops the landed row takes, not yet removed: no more than stand in the seat's
   *  settlements. */
  pops: number;
}

/** One die of any size through the game's seeded PRNG state — the die size is table
 *  data ({@link EventTableDefinition.die}), so a d8 or d12 table is a data edit. */
export function rollDie(G: HegemonyState, sides: number): number {
  const step = mulberry32(G.rng);
  G.rng = step.state;
  return 1 + Math.floor(step.value * sides);
}

/**
 * The row a natural roll lands on with `modifier`: the sum clamps into the die's faces, so
 * a table can never be rolled off. The one lookup the roll, the riot sheet and the bots'
 * forecast read.
 */
export function landedRow(
  table: EventTableDefinition,
  roll: number,
  modifier = 0,
): { modified: number; row: EventTableRow } {
  const die = table.die ?? 6;
  const modified = Math.min(die, Math.max(1, roll + modifier));
  const row =
    table.rows.find((candidate) => candidate.roll === modified) ??
    table.rows[table.rows.length - 1];
  return { modified, row };
}

/**
 * Roll on a table for `playerID`, apply the landed row's stocks and buildings, and count
 * its pops. The record is stored on {@link HegemonyState.lastTableRoll} so the UI shows
 * the outcome without ever re-rolling; the caller adds what the pops cost.
 */
export function rollOnTable(
  G: HegemonyState,
  playerID: PlayerId,
  table: EventTableDefinition,
  { modifier = 0 }: RollOptions = {},
): RollResult {
  const roll = rollDie(G, table.die ?? 6);
  const { modified, row } = landedRow(table, roll, modifier);

  const modifierText = modifier === 0 ? "" : ` ${modifier > 0 ? "+" : ""}${modifier} → ${modified}`;
  addLog(
    G,
    `${getPlayerName(G, playerID)} rolls ${roll}${modifierText} on the ${table.name} table: ${row.label}.`,
    playerID,
  );

  const outcomes: string[] = [];
  let wanted = 0;

  for (const effect of row.effects) {
    const applied = applyTableEffect(G, playerID, effect);
    wanted += applied.pops;
    outcomes.push(...applied.outcomes);
  }

  // A row takes no more pops than stand in the seat's settlements: those on the move are
  // out of its reach.
  const standing = ownedSettlements(G, playerID).reduce(
    (sum, settlement) => sum + totalPops(settlement.pops),
    0,
  );
  const pops = Math.min(wanted, standing);
  if (wanted > 0 && pops === 0) outcomes.push("No pops left to lose.");

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
  return { record, pops };
}

/** One effect of a landed row: its stocks and buildings applied, its pops counted. */
function applyTableEffect(
  G: HegemonyState,
  playerID: PlayerId,
  effect: TableEffect,
): { outcomes: string[]; pops: number } {
  const player = G.players[playerID];
  const name = getPlayerName(G, playerID);

  switch (effect.type) {
    case "none":
      return { outcomes: ["No losses."], pops: 0 };

    case "losePops":
      return { outcomes: [], pops: effect.count };

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
      // The bribe pattern: coming up short is paid in blood on top of the coin.
      const short = paid < effect.amount && effect.popLossIfShort ? effect.popLossIfShort : 0;
      if (short) outcomes.push("Couldn't pay in full.");

      addLog(G, `${name} — ${outcomes.join(" ")}`);
      return { outcomes, pops: short };
    }

    case "destroyBuilding": {
      const destroyed = destroyRandomBuilding(G, playerID);

      if (destroyed) {
        addLog(G, `${name} — ${destroyed.name} burns to the ground.`);
        // A burned Port may have been the last beside a good: the good goes back.
        const released = releaseLuxuriesAfterPortLoss(G, playerID, destroyed.tileId);
        return {
          outcomes: [
            `${destroyed.name} destroyed.`,
            ...released.map((good) => `${good} goes back to the board.`),
          ],
          pops: 0,
        };
      }

      // Nothing to burn: the fallback pops are lost instead, so a buildingless
      // player's roll 1 stays strictly worse than roll 2's two pops never inverting.
      return { outcomes: ["No buildings to burn."], pops: effect.popLossFallback };
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
export const TABLE_LOSS_ORDER: PopType[] = ["slaves", "freemen", "citizens"];

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
  const settlements = ownedSettlements(G, playerID);

  for (let lost = 0; lost < count; lost += 1) {
    const next = nextLoss(settlements, order);

    if (!next) {
      break;
    }

    next.settlement.pops[next.pop] -= 1;
    summary.byType[next.pop] += 1;
    summary.total += 1;
    summary.left.push({ tileId: next.settlement.tileId, pop: next.pop });
  }

  return summary;
}

/** The pop a loss takes next, and from where: what a riot's card would keep. */
export function nextPopLoss(
  G: HegemonyState,
  playerID: PlayerId,
  order: PopType[] = TABLE_LOSS_ORDER,
): PopLeave | null {
  const next = nextLoss(ownedSettlements(G, playerID), order);
  return next ? { tileId: next.settlement.tileId, pop: next.pop } : null;
}

function ownedSettlements(G: HegemonyState, playerID: PlayerId): Settlement[] {
  return G.players[playerID].settlements.flatMap(
    (tileId) => getOwnedSettlement(G, tileId, playerID) ?? [],
  );
}

/** The first class in `order` the settlements hold, from the one holding the most. */
function nextLoss(settlements: Settlement[], order: PopType[]) {
  const pop = order.find((candidate) => fullest(settlements, candidate));
  const settlement = pop && fullest(settlements, pop);
  return pop && settlement ? { pop, settlement } : null;
}

/** "2 slaves, 1 freeman" — nonzero pop types in a stable order, using the shared pop labels. */
export function describeRemoval(summary: Pick<RemovalSummary, "byType">): string {
  const parts = POP_TYPES.filter((pop) => summary.byType[pop] > 0).map(
    (pop) => `${summary.byType[pop]} ${formatPopName(pop, summary.byType[pop])}`,
  );

  return parts.join(", ");
}

/** Burn one random owned building (seeded). Returns its display name and tile, or null if
 *  the player owns none. A settlement holds one of each building, so the one burned is gone. */
function destroyRandomBuilding(
  G: HegemonyState,
  playerID: PlayerId,
): { name: string; tileId: string } | null {
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
  const name =
    getBuildings(G.definition.content).find((building) => building.id === removed)?.name ?? removed;
  return { name, tileId: target.settlement.tileId };
}
