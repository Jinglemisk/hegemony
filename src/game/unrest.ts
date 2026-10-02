import type { HegemonyState, PlayerId } from "./types";
import { addLog, getPlayerName } from "./core/query";
import { countPlayerPopType } from "./settlement";
import { happinessContributions, happinessLevel } from "./happiness";
import { tickLuxurySuppression } from "./luxury";
import { startRiot } from "./riot";
import { describeRemoval, removePops } from "./tables";

/**
 * Unrest consequences. Happiness is a level derived from the board (game/happiness.ts);
 * this module gives its two lines teeth.
 *
 * {@link applyUnrestUpkeep} runs once per player, at the start of their turn and
 * before their income is collected. At the riot line it clears the realm's Unrest
 * tokens and parks a riot on the table (game/riot.ts), which blocks the turn until
 * the player rolls. At the revolt line nothing is rolled: half the slaves leave and
 * the tokens clear. Hunger is not here: it strikes at income (game/hunger.ts).
 */

/** The start-of-turn unrest step for `playerID`. Pure mutation on the draft state.
 *  May leave a {@link PendingRiot} on the state — callers defer income while it stands. */
export function applyUnrestUpkeep(G: HegemonyState, playerID: PlayerId) {
  if (G.phase !== "gameplay") {
    return;
  }

  const rules = G.ruleset.economy.unrest;

  // Luxury denial ticks down first, so an expiring suppression relieves this turn.
  tickLuxurySuppression(G, playerID);

  // Calm counts only in the year it was bought; the year boundary clears it.
  const level = happinessLevel(G, playerID);

  if (level <= rules.revoltThreshold) {
    revolt(G, playerID);
  } else if (level <= rules.riotThreshold) {
    startRiot(G, playerID);
  }
}

/** A revolt is determinate: half the slaves leave, rounded down, and the Unrest
 *  tokens clear. No roll, and the turn goes on. */
function revolt(G: HegemonyState, playerID: PlayerId) {
  const player = G.players[playerID];
  const leaving = Math.floor(countPlayerPopType(G, playerID, "slaves") / 2);
  const left = removePops(G, playerID, leaving, ["slaves"]);

  player.unrestTokens = 0;
  player.popsLostToUnrest += left.total;
  player.revolts += 1;
  addLog(
    G,
    `${getPlayerName(G, playerID)}'s realm revolts: ${left.total > 0 ? `${describeRemoval(left)} walk away` : "no slaves are left to walk away"}, and the Unrest tokens clear.`,
    playerID,
  );
}

/** How close a player is to (or into) unrest, for the shell's warning. Escalates:
 *  calm (level ≥ 0) → discontent (below 0) → unrest (the riot line) → revolt. */
export type UnrestTier = "calm" | "discontent" | "unrest" | "revolt";

export interface UnrestStatus {
  tier: UnrestTier;
  /** The level the lines test: every term, calm included. */
  happiness: number;
  /** The standing luxury term (active goods × happinessPerGood). */
  luxuryBonus: number;
  /** Calm bought this year: counted until the year turns. */
  calmBonus: number;
  /** Unrest tokens on the realm. */
  tokens: number;
  /** Whether the level would start a riot or a revolt at the next upkeep. */
  riotAtRisk: boolean;
  /** Running total of pops already lost to riots, revolts and hunger. */
  totalDeaths: number;
}

export function unrestStatus(G: HegemonyState, playerID: PlayerId): UnrestStatus {
  const player = G.players[playerID];
  const terms = happinessContributions(G, playerID);
  const happiness = terms.reduce((sum, term) => sum + term.amount, 0);
  const rules = G.ruleset.economy.unrest;

  let tier: UnrestTier = "calm";

  if (happiness <= rules.revoltThreshold) {
    tier = "revolt";
  } else if (happiness <= rules.riotThreshold) {
    tier = "unrest";
  } else if (happiness < 0) {
    tier = "discontent";
  }

  return {
    tier,
    happiness,
    luxuryBonus: terms.find((term) => term.id === "luxuries")?.amount ?? 0,
    calmBonus: terms.find((term) => term.id === "calm")?.amount ?? 0,
    tokens: player.unrestTokens,
    riotAtRisk: tier === "unrest" || tier === "revolt",
    totalDeaths: player.popsLostToUnrest + player.popsLostToHunger,
  };
}
