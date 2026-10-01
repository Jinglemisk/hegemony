import type { HegemonyState, PlayerId } from "./types";
import { formatRuleNumber } from "./core/format";
import { addLog, getPlayerName } from "./core/query";
import { effectiveHappiness, luxuryHappinessBonus, tickLuxurySuppression } from "./luxury";
import { startRiot } from "./riot";

/**
 * Unrest consequences. `happiness` is a per-player meter where higher is good and
 * negative reads as the rulebook's "Unrest": this module gives that meter teeth.
 *
 * {@link applyUnrestUpkeep} runs once per player, at the start of their turn and
 * BEFORE their income is collected (the rulebook removes pops "before any
 * resources are collected"). It (1) applies & ticks down timed happiness
 * modifiers, (2) starts a RIOT at the deadly-unrest thresholds — since D9 the
 * riot table (game/riot.ts) replaces the old flat random pop removal, so the
 * upkeep parks a pending riot and defers income until the player rolls. Hunger is
 * not here: it strikes at income (game/hunger.ts).
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
        `${getPlayerName(G, playerID)} feels ${formatRuleNumber(modifier.amountPerTurn)} happiness from ${modifier.sourceName}` +
          (turnsRemaining > 0
            ? ` (${turnsRemaining} turn${turnsRemaining === 1 ? "" : "s"} left).`
            : ", now passing."),
        playerID,
      );

      if (turnsRemaining > 0) {
        survivors.push({ ...modifier, turnsRemaining });
      }
    }

    player.timedHappinessModifiers = survivors;
  }

  // 1b. Luxury denial ticks down at the owner's upkeep, before the thresholds
  //     read the offset, so an expiring suppression relieves THIS turn.
  tickLuxurySuppression(G, playerID);

  // 2. Deadly unrest thresholds — severe first, mutually exclusive. A threshold
  //    starts a riot (blocking the turn on the table) instead of removing pops.
  //    EFFECTIVE happiness is tested (Q43): active luxuries are a standing floor
  //    that can hold a player above the riot line without touching the bank.
  const effective = effectiveHappiness(G, playerID);
  if (effective <= rules.severeThreshold) {
    startRiot(G, playerID, "revolt");
  } else if (effective <= rules.popLossThreshold) {
    startRiot(G, playerID, "unrest");
  }
}

/** How close a player is to (or into) unrest, for the ledger's warning. Escalates:
 *  calm (happiness ≥ 0) → discontent (negative) → unrest (≤ -5) → revolt (≤ -10). */
export type UnrestTier = "calm" | "discontent" | "unrest" | "revolt";

export interface UnrestStatus {
  tier: UnrestTier;
  /** EFFECTIVE happiness — stored + luxury offset — the number the thresholds test.
   *  Kept under the historical name so every consumer judges by the real line. */
  happiness: number;
  /** The stored bank alone, for the raw / bonus / effective breakdown every
   *  happiness surface must show (luxury-goods.md §8). */
  storedHappiness: number;
  /** The standing luxury offset (active goods × happinessPerGood). */
  luxuryBonus: number;
  /** Whether the current happiness would put the player on the riot table next upkeep. */
  riotAtRisk: boolean;
  /** Count of active timed happiness modifiers still ticking. */
  timedModifiers: number;
  /** Running total of pops already lost to riots and to hunger. */
  totalDeaths: number;
}

export function unrestStatus(G: HegemonyState, playerID: PlayerId): UnrestStatus {
  const player = G.players[playerID];
  const storedHappiness = player.resources.happiness;
  const luxuryBonus = luxuryHappinessBonus(G, playerID);
  const happiness = storedHappiness + luxuryBonus;
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
    storedHappiness,
    luxuryBonus,
    riotAtRisk: tier === "unrest" || tier === "revolt",
    timedModifiers: player.timedHappinessModifiers.length,
    totalDeaths: player.popsLostToUnrest + player.popsLostToHunger,
  };
}
