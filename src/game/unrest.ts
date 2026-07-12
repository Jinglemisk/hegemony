import type { HegemonyState, PlayerId } from "./types";
import { formatRuleNumber } from "./core/format";
import { addLog, getPlayerName } from "./core/query";
import { calculateIncome } from "./economy/income";
import { startRiot } from "./riot";
import { describeRemoval, removeRandomPops } from "./tables";

/**
 * Unrest consequences. `happiness` is a per-player meter where higher is good and
 * negative reads as the rulebook's "Unrest": this module gives that meter teeth.
 *
 * {@link applyUnrestUpkeep} runs once per player, at the start of their turn and
 * BEFORE their income is collected (the rulebook removes pops "before any
 * resources are collected"). It (1) applies & ticks down timed happiness
 * modifiers, (2) starts a RIOT at the deadly-unrest thresholds — since D9 the
 * riot table (game/riot.ts) replaces the old flat random pop removal, so the
 * upkeep parks a pending riot and defers income until the player rolls — and
 * (3) advances the consecutive-food-deficit starvation counter.
 */

/** The start-of-turn unrest step for `playerID`. Pure mutation on the draft state.
 *  May leave a {@link PendingRiot} on the state — callers defer income while it stands. */
export function applyUnrestUpkeep(G: HegemonyState, playerID: PlayerId) {
  if (G.phase !== "gameplay") {
    return;
  }

  const player = G.players[playerID];
  const rules = G.ruleset.economy.unrest;

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

  // 2. Deadly unrest thresholds — severe first, mutually exclusive. A threshold
  //    starts a riot (blocking the turn on the table) instead of removing pops.
  if (player.resources.happiness <= rules.severeThreshold) {
    startRiot(G, playerID, "revolt");
  } else if (player.resources.happiness <= rules.popLossThreshold) {
    startRiot(G, playerID, "unrest");
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
        player.popsLostToUnrest += removed.total;
        player.consecutiveFoodDeficitTurns = 0;

        if (removed.total > 0) {
          addLog(G, `${getPlayerName(G, playerID)} — starvation claims ${describeRemoval(removed)}.`);
        }
      }
    } else {
      player.consecutiveFoodDeficitTurns = 0;
    }
  }
}

/** How close a player is to (or into) unrest, for the ledger's warning. Escalates:
 *  calm (happiness ≥ 0) → discontent (negative) → unrest (≤ -5) → revolt (≤ -10). */
export type UnrestTier = "calm" | "discontent" | "unrest" | "revolt";

export interface UnrestStatus {
  tier: UnrestTier;
  happiness: number;
  /** Whether the current happiness would put the player on the riot table next upkeep. */
  riotAtRisk: boolean;
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

  if (happiness <= rules.severeThreshold) {
    tier = "revolt";
  } else if (happiness <= rules.popLossThreshold) {
    tier = "unrest";
  } else if (happiness < 0) {
    tier = "discontent";
  }

  return {
    tier,
    happiness,
    riotAtRisk: tier === "unrest" || tier === "revolt",
    timedModifiers: player.timedHappinessModifiers.length,
    deficitTurns: player.consecutiveFoodDeficitTurns,
    totalDeaths: player.popsLostToUnrest
  };
}
