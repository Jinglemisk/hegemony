import { BUILDINGS, OMEN_TABLE } from "./data";
import { yearOf } from "./core/calendar";
import { POP_TYPES, totalPops } from "./core/pops";
import { formatPopName } from "./core/format";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { mulberry32, shuffleWithSeed } from "./core/rng";
import type {
  EventTableDefinition,
  HegemonyState,
  PlayerId,
  PopType,
  Settlement,
  TableEffect,
  TableRollRecord
} from "./types";

/**
 * The event-table engine seam (docs/feat/event-tables.md): one function rolls every
 * dice table in the game — riot, expeditions, future omens. Tables are content data
 * ({@link ./data}); this module owns the die, the modifier/clamp arithmetic, and the
 * effect interpreter. All randomness runs through the game's own mulberry32 state so
 * a table roll is as replayable as a deck shuffle.
 */

export interface RollOptions {
  /** Net roll modifier — insurance (+1 each) and the severe-riot tier (−2). */
  modifier?: number;
  /** Multiplies every pop-loss amount (the severe riot doubles them). */
  popLossMultiplier?: number;
}

export interface RollResult {
  record: TableRollRecord;
  /** Total pops removed by the roll's effects — the riot adds this to popsLostToUnrest. */
  popsRemoved: number;
}

/** One die of any size through the game's seeded PRNG state — the die size is table
 *  data ({@link EventTableDefinition.die}), so a d8 or d12 table is a data edit. */
export function rollDie(G: HegemonyState, sides: number): number {
  const step = mulberry32(G.rng);
  G.rng = step.state;
  return 1 + Math.floor(step.value * sides);
}

/** One d6 through the game's seeded PRNG state. */
export function rollD6(G: HegemonyState): number {
  return rollDie(G, 6);
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
  { modifier = 0, popLossMultiplier = 1 }: RollOptions = {}
): RollResult {
  const die = table.die ?? 6;
  const roll = rollDie(G, die);
  const modified = Math.min(die, Math.max(1, roll + modifier));
  const row = table.rows.find((candidate) => candidate.roll === modified) ?? table.rows[table.rows.length - 1];

  const modifierText = modifier === 0 ? "" : ` ${modifier > 0 ? "+" : ""}${modifier} → ${modified}`;
  addLog(G, `${getPlayerName(G, playerID)} rolls ${roll}${modifierText} on the ${table.name} table: ${row.label}.`);

  const outcomes: string[] = [];
  let popsRemoved = 0;

  for (const effect of row.effects) {
    const applied = applyTableEffect(G, playerID, effect, popLossMultiplier);
    popsRemoved += applied.popsRemoved;
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
    season: G.season
  };
  G.lastTableRoll = record;
  return { record, popsRemoved };
}

function applyTableEffect(
  G: HegemonyState,
  playerID: PlayerId,
  effect: TableEffect,
  popLossMultiplier: number
): { outcomes: string[]; popsRemoved: number } {
  const player = G.players[playerID];
  const name = getPlayerName(G, playerID);

  switch (effect.type) {
    case "none":
      return { outcomes: ["No losses."], popsRemoved: 0 };

    case "losePops": {
      const removed = removeRandomPops(G, playerID, effect.count * popLossMultiplier);
      const text = removed.total > 0 ? `Lost ${describeRemoval(removed)}.` : "No pops left to lose.";
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], popsRemoved: removed.total };
    }

    case "loseResource": {
      const held = player.resources[effect.resource];
      const paid = Math.min(effect.amount, Math.max(0, held));
      player.resources[effect.resource] -= paid;
      const outcomes = [`Lost ${paid} ${effect.resource}.`];
      let popsRemoved = 0;

      // The bribe pattern: coming up short is paid in blood on top of the coin.
      if (paid < effect.amount && effect.popLossIfShort) {
        const removed = removeRandomPops(G, playerID, effect.popLossIfShort * popLossMultiplier);
        popsRemoved = removed.total;
        if (removed.total > 0) {
          outcomes.push(`Couldn't pay in full — lost ${describeRemoval(removed)}.`);
        }
      }

      addLog(G, `${name} — ${outcomes.join(" ")}`);
      return { outcomes, popsRemoved };
    }

    case "destroyBuilding": {
      const destroyed = destroyRandomBuilding(G, playerID);

      if (destroyed) {
        addLog(G, `${name} — ${destroyed} burns to the ground.`);
        return { outcomes: [`${destroyed} destroyed.`], popsRemoved: 0 };
      }

      // Nothing to burn: the fallback pops are lost instead, so a buildingless
      // player's roll 1 stays strictly worse than roll 2's two pops never inverting.
      const removed = removeRandomPops(G, playerID, effect.popLossFallback * popLossMultiplier);
      const text =
        removed.total > 0 ? `No buildings to burn — lost ${describeRemoval(removed)} instead.` : "Nothing left to lose.";
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], popsRemoved: removed.total };
    }

    case "gainResource": {
      player.resources[effect.resource] += effect.amount;
      const text = `Gained ${effect.amount} ${effect.resource}.`;
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], popsRemoved: 0 };
    }

    case "gainPop": {
      const settled = addPopToSettlementWithRoom(G, playerID, effect.pop);

      if (settled) {
        player.popsGainedFromEvents += 1;
        const text = `1 ${formatPopName(effect.pop, 1)} settles in ${settled}.`;
        addLog(G, `${name} — ${text}`);
        return { outcomes: [text], popsRemoved: 0 };
      }

      player.resources.food += effect.foodFallback;
      const text = `No settlement has room — the settlers leave ${effect.foodFallback} food and sail on.`;
      addLog(G, `${name} — ${text}`);
      return { outcomes: [text], popsRemoved: 0 };
    }

    case "yearIncomeModifier": {
      // Persistent, not immediate: the income engine reads it off G.yearOmen while
      // the omen stands. Rolling only announces it.
      const sign = effect.amount > 0 ? "+" : "";
      const text = `All players: ${sign}${effect.amount} ${effect.resource} income while the omen stands.`;
      return { outcomes: [text], popsRemoved: 0 };
    }
  }
}

/**
 * The year's opener takes the auspices (PROVISIONAL): one public roll on the omen
 * table, standing over every polis until the next spring replaces it. Called at
 * gameplay start (year 1) and on each new year's season turn.
 */
export function rollYearOmen(G: HegemonyState) {
  const { record } = rollOnTable(G, G.seasonOpener, OMEN_TABLE);
  const row =
    OMEN_TABLE.rows.find((candidate) => candidate.roll === record.modified) ?? OMEN_TABLE.rows[OMEN_TABLE.rows.length - 1];

  G.yearOmen = { record, label: row.label, year: yearOf(G.season), effects: row.effects };
  addLog(G, `The omen for Year ${yearOf(G.season)}: ${row.label}.`);
}

type RemovalSummary = { total: number; byType: Record<PopType, number> };

/**
 * Remove `count` pops chosen uniformly at random from across the player's
 * settlements, using the seeded RNG on the state (never Math.random — the state
 * must stay serializable and replayable). Removing pops can leave a settlement at
 * zero pops; the settlement itself is left standing. (Moved here from unrest.ts —
 * it is the `losePops` interpreter; unrest re-imports it.)
 */
export function removeRandomPops(G: HegemonyState, playerID: PlayerId, count: number): RemovalSummary {
  const summary: RemovalSummary = { total: 0, byType: { citizens: 0, freemen: 0, slaves: 0 } };

  if (count <= 0) {
    return summary;
  }

  // One token per existing pop — a flat bag we can shuffle and draw from.
  const tokens: Array<{ settlement: Settlement; pop: PopType }> = [];
  for (const tileId of G.players[playerID].settlements) {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    if (!settlement) {
      continue;
    }

    for (const pop of POP_TYPES) {
      for (let i = 0; i < settlement.pops[pop]; i += 1) {
        tokens.push({ settlement, pop });
      }
    }
  }

  if (tokens.length === 0) {
    return summary;
  }

  const shuffled = shuffleWithSeed(tokens, G.rng);
  G.rng = shuffled.state;

  const removeCount = Math.min(count, shuffled.cards.length);
  for (let i = 0; i < removeCount; i += 1) {
    const token = shuffled.cards[i];
    token.settlement.pops[token.pop] -= 1;
    summary.byType[token.pop] += 1;
    summary.total += 1;
  }

  return summary;
}

/** "2 slaves, 1 freeman" — nonzero pop types in a stable order, using the shared pop labels. */
export function describeRemoval(summary: RemovalSummary): string {
  const parts = POP_TYPES.filter((pop) => summary.byType[pop] > 0).map(
    (pop) => `${summary.byType[pop]} ${formatPopName(pop, summary.byType[pop])}`
  );

  return parts.join(", ");
}

/** Burn one random owned building (seeded). Returns its display name, or null if the
 *  player owns none. Once building tiers exist (Phase 2) this becomes a downgrade
 *  for tier-2+ buildings — today everything is tier 1, so destruction is the rule. */
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
  return BUILDINGS.find((building) => building.id === removed)?.name ?? removed;
}

/** Add one pop to a random owned settlement with spare capacity (seeded). Returns a
 *  human label for the destination, or null when every settlement is full. */
function addPopToSettlementWithRoom(G: HegemonyState, playerID: PlayerId, pop: PopType): string | null {
  const candidates: Settlement[] = [];

  for (const tileId of G.players[playerID].settlements) {
    const settlement = getOwnedSettlement(G, tileId, playerID);

    if (settlement && totalPops(settlement.pops) < G.ruleset.settlements[settlement.kind].popCapacity) {
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
