import { produce } from "immer";
import type { HegemonyState, PlayerId, Resources } from "./types";
import { civicCalm, getCivicCalmStatus } from "./civic";
import type { CivicCalmPayment } from "./civic";
import { addLog, getPlayerName, realmPops } from "./core/query";
import { countPlayerPopType } from "./settlement";
import { happinessContributions, happinessLevel } from "./happiness";
import { startRiot } from "./riot";
import { describeRemoval, removePops } from "./tables";

/**
 * Unrest consequences. Happiness is a level derived from the board (game/happiness.ts);
 * this module gives its two lines teeth.
 *
 * {@link applyUnrestAtTurnEnd} runs once per player, when they commit to ending
 * their turn. At the riot line it clears the realm's Unrest tokens and parks a
 * riot on the table (game/riot.ts), which blocks the handoff until
 * the player rolls. At the revolt line nothing is rolled: half the slaves leave and
 * the tokens clear. Hunger is not here: it is settled just before (game/hunger.ts).
 */

/** The turn-end check for `playerID`. May leave a riot awaiting insurance and a roll. */
export function applyUnrestAtTurnEnd(G: HegemonyState, playerID: PlayerId) {
  if (G.phase !== "gameplay") {
    return;
  }

  const rules = G.ruleset.economy.unrest;

  // Calm counts only in the year it was bought; the year boundary clears it.
  const level = happinessLevel(G, playerID);

  if (level <= rules.revoltThreshold) {
    revolt(G, playerID);
  } else if (level <= rules.riotThreshold) {
    startRiot(G, playerID);
  }
}

/** A revolt is determinate: half the slaves leave, rounded down, and the Unrest
 *  tokens clear. No roll, and the turn passes. The half counts slaves on the move,
 *  as the level does; those who leave are taken from the settlements. */
function revolt(G: HegemonyState, playerID: PlayerId) {
  const player = G.players[playerID];
  const { slaves } = realmPops(G, playerID);
  const left = removePops(G, playerID, Math.floor(slaves / 2), ["slaves"]);
  const tokensCleared = player.unrestTokens;

  player.unrestTokens = 0;
  player.popsLostToUnrest += left.total;
  player.revolts += 1;
  addLog(
    G,
    `${getPlayerName(G, playerID)}'s realm revolts at turn end: ${left.total > 0 ? `${describeRemoval(left)} walk away` : "no slaves are left to walk away"}, and the Unrest tokens clear.`,
    playerID,
    { kind: "revolt", slaves, left: left.left, tokensCleared, level: happinessLevel(G, playerID) },
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
  /** Whether ending the player's turn at this level starts a riot or a revolt. */
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

/** What ending the turn now sets off, and what calm bought first would change. */
export interface TurnEndUnrest {
  outcome: "riot" | "revolt";
  level: number;
  tokens: number;
  /** Slaves now, and how many a revolt sends away. */
  slaves: number;
  leaving: number;
  /** The first calm the seat can buy that changes the outcome, with the level it
   *  reaches and what ending then sets off; null when no calm helps. */
  calm: {
    payment: CivicCalmPayment;
    cost: Partial<Resources>;
    level: number;
    outcome: "riot" | "none";
  } | null;
}

function outcomeAt(G: HegemonyState, level: number): "riot" | "revolt" | "none" {
  const rules = G.ruleset.economy.unrest;
  return level <= rules.revoltThreshold ? "revolt" : level <= rules.riotThreshold ? "riot" : "none";
}

/** The end-turn confirm's facts: null when ending now starts neither a riot nor a
 *  revolt. Calm is tried through the real action on a draft, gold before influence. */
export function turnEndUnrest(G: HegemonyState, playerID: PlayerId): TurnEndUnrest | null {
  const level = happinessLevel(G, playerID);
  const outcome = outcomeAt(G, level);
  if (outcome === "none") return null;

  const { slaves } = realmPops(G, playerID);
  let calm: TurnEndUnrest["calm"] = null;
  for (const payment of ["gold", "influence"] as const) {
    const status = getCivicCalmStatus(G, playerID, payment);
    if (!status.can) continue;
    const after = happinessLevel(
      produce(G, (draft) => void civicCalm(draft, playerID, payment)),
      playerID,
    );
    const then = outcomeAt(G, after);
    if (then !== outcome && then !== "revolt") {
      calm = { payment, cost: status.cost ?? {}, level: after, outcome: then };
      break;
    }
  }

  return {
    outcome,
    level,
    tokens: G.players[playerID].unrestTokens,
    slaves,
    // Only slaves standing in a settlement can be taken.
    leaving: Math.min(Math.floor(slaves / 2), countPlayerPopType(G, playerID, "slaves")),
    calm,
  };
}
