import type { HegemonyState, PlayerId, PopType, Settlement } from "./types";
import { POP_TYPES } from "./core/pops";
import { formatPopName, formatRuleNumber } from "./core/format";
import { addLog, getOwnedSettlement, getPlayerName } from "./core/query";
import { shuffleWithSeed } from "./core/rng";
import { calculateIncome } from "./economy/income";

/**
 * Unrest consequences. `happiness` is a per-player meter where higher is good and
 * negative reads as the rulebook's "Unrest": this module gives that meter teeth.
 *
 * {@link applyUnrestUpkeep} runs once per player, at the start of their turn and
 * BEFORE their income is collected (the rulebook removes pops "before any
 * resources are collected"). It (1) applies & ticks down timed happiness
 * modifiers, (2) fires the deadly-unrest pop-loss thresholds, and (3) advances
 * the consecutive-food-deficit starvation counter. Pops are removed at random
 * through the game's seeded RNG so the whole game stays deterministic/replayable.
 */

type RemovalSummary = { total: number; byType: Record<PopType, number> };

/**
 * Remove `count` pops chosen uniformly at random from across the player's
 * settlements, using the seeded RNG on the state (never Math.random — the state
 * must stay serializable and replayable). Removing pops can leave a settlement at
 * zero pops; the settlement itself is left standing.
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

/** The start-of-turn unrest step for `playerID`. Pure mutation on the draft state. */
export function applyUnrestUpkeep(G: HegemonyState, playerID: PlayerId) {
  if (G.phase !== "gameplay") {
    return;
  }

  const player = G.players[playerID];
  const rules = G.ruleset.economy.unrest;
  let lostThisTurn = 0;

  // 1. Timed happiness modifiers — apply, tick down, drop the expired. Done first
  //    so an event-driven penalty can push the player into a threshold this turn.
  if (player.timedHappinessModifiers.length > 0) {
    const survivors: typeof player.timedHappinessModifiers = [];

    for (const modifier of player.timedHappinessModifiers) {
      player.resources.happiness += modifier.amountPerTurn;
      const turnsRemaining = modifier.turnsRemaining - 1;
      addLog(
        G,
        `${getPlayerName(G, playerID)} feels ${formatRuleNumber(modifier.amountPerTurn)} happiness from ${modifier.source}` +
          (turnsRemaining > 0 ? ` (${turnsRemaining} turn${turnsRemaining === 1 ? "" : "s"} left).` : ", now passing.")
      );

      if (turnsRemaining > 0) {
        survivors.push({ ...modifier, turnsRemaining });
      }
    }

    player.timedHappinessModifiers = survivors;
  }

  // 2. Deadly unrest thresholds — severe first, mutually exclusive.
  if (player.resources.happiness <= rules.severeThreshold) {
    const removed = removeRandomPops(G, playerID, rules.severePopLossCount);
    lostThisTurn += removed.total;
    player.resources.happiness = rules.severeRebound;
    addLog(
      G,
      `${getPlayerName(G, playerID)} — unrest erupts, ` +
        (removed.total > 0 ? `costing ${describeRemoval(removed)}. ` : "but there are no pops left to lose. ") +
        `Happiness settles at ${formatRuleNumber(rules.severeRebound)}.`
    );
  } else if (player.resources.happiness <= rules.popLossThreshold) {
    const removed = removeRandomPops(G, playerID, rules.popLossCount);
    lostThisTurn += removed.total;

    if (removed.total > 0) {
      addLog(G, `${getPlayerName(G, playerID)} — unrest costs ${describeRemoval(removed)}.`);
    }
  }

  // 3. Consecutive food-deficit starvation. Honour the same first-income grace the
  //    food-shortage happiness pressure uses, so a player is never punished before
  //    they have collected income once.
  const graceActive = G.ruleset.economy.firstIncomeFoodGrace && !player.hasCollectedGameplayIncome;

  if (!graceActive) {
    const netFood = calculateIncome(G, playerID).food;

    if (netFood <= rules.foodDeficitThreshold) {
      player.consecutiveFoodDeficitTurns += 1;

      if (player.consecutiveFoodDeficitTurns >= rules.foodDeficitTurnsToStarve) {
        const removed = removeRandomPops(G, playerID, rules.foodDeficitStarvePopLoss);
        lostThisTurn += removed.total;
        player.consecutiveFoodDeficitTurns = 0;

        if (removed.total > 0) {
          addLog(G, `${getPlayerName(G, playerID)} — starvation claims ${describeRemoval(removed)}.`);
        }
      }
    } else {
      player.consecutiveFoodDeficitTurns = 0;
    }
  }

  player.popsLostToUnrest += lostThisTurn;
}

/** How close a player is to (or into) unrest, for the ledger's warning. Escalates:
 *  calm (happiness ≥ 0) → discontent (negative) → unrest (≤ -5) → revolt (≤ -10). */
export type UnrestTier = "calm" | "discontent" | "unrest" | "revolt";

export interface UnrestStatus {
  tier: UnrestTier;
  happiness: number;
  /** Pops that will be lost at the next upkeep at the current happiness (0 unless a threshold is met). */
  popsAtRisk: number;
  /** Count of active timed happiness modifiers still ticking. */
  timedModifiers: number;
  /** Consecutive food-deficit turns accrued so far. */
  deficitTurns: number;
  /** Running total of pops already lost to unrest & starvation. */
  totalDeaths: number;
}

export function unrestStatus(G: HegemonyState, playerID: PlayerId): UnrestStatus {
  const player = G.players[playerID];
  const happiness = player.resources.happiness;
  const rules = G.ruleset.economy.unrest;

  let tier: UnrestTier = "calm";
  let popsAtRisk = 0;

  if (happiness <= rules.severeThreshold) {
    tier = "revolt";
    popsAtRisk = rules.severePopLossCount;
  } else if (happiness <= rules.popLossThreshold) {
    tier = "unrest";
    popsAtRisk = rules.popLossCount;
  } else if (happiness < 0) {
    tier = "discontent";
  }

  return {
    tier,
    happiness,
    popsAtRisk,
    timedModifiers: player.timedHappinessModifiers.length,
    deficitTurns: player.consecutiveFoodDeficitTurns,
    totalDeaths: player.popsLostToUnrest
  };
}

/** "2 slaves, 1 freeman" — nonzero pop types in a stable order, using the shared pop labels. */
function describeRemoval(summary: RemovalSummary): string {
  const parts = POP_TYPES.filter((pop) => summary.byType[pop] > 0).map(
    (pop) => `${summary.byType[pop]} ${formatPopName(pop, summary.byType[pop])}`
  );

  return parts.join(", ");
}
