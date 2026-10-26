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
 * {@link unrestOutcome} is the one test of the lines: the turn end, the status, the
 * end-turn confirm, the screens and the bots read it. {@link applyUnrestAtTurnEnd}
 * runs once per player, when they commit to ending their turn. At the riot line it
 * clears the realm's Unrest tokens and parks a riot on the table (game/riot.ts), which
 * blocks the handoff until the player rolls. At the revolt line nothing is rolled: the
 * ruleset's share of the slaves leave and the tokens clear. Hunger is not here: it is
 * settled just before (game/hunger.ts).
 */

/** What ending the turn at a level sets off, and what it takes. */
export interface UnrestOutcome {
  tier: "none" | "riot" | "revolt";
  level: number;
  /** Unrest tokens a riot or a revolt clears. */
  tokens: number;
  /** Slaves now, counting those on the move, as the level does. */
  slaves: number;
  /** Slaves a revolt sends away: the ruleset's share of `slaves`, rounded down, taken
   *  only from those standing in a settlement. */
  leaving: number;
}

/** The turn-end outcome for `playerID` at `level`, the seat's level now by default. */
export function unrestOutcome(
  G: HegemonyState,
  playerID: PlayerId,
  level = happinessLevel(G, playerID),
): UnrestOutcome {
  const rules = G.ruleset.economy.unrest;
  const { slaves } = realmPops(G, playerID);
  return {
    tier:
      level <= rules.revoltThreshold ? "revolt" : level <= rules.riotThreshold ? "riot" : "none",
    level,
    tokens: G.players[playerID].unrestTokens,
    slaves,
    leaving: Math.min(
      Math.floor(slaves * rules.revoltSlaveShare),
      countPlayerPopType(G, playerID, "slaves"),
    ),
  };
}

/** The turn-end check for `playerID`. May leave a riot awaiting insurance and a roll. */
export function applyUnrestAtTurnEnd(G: HegemonyState, playerID: PlayerId) {
  if (G.phase !== "gameplay") {
    return;
  }

  // Calm counts only in the year it was bought; the year boundary clears it.
  const outcome = unrestOutcome(G, playerID);

  if (outcome.tier === "revolt") {
    revolt(G, playerID, outcome);
  } else if (outcome.tier === "riot") {
    startRiot(G, playerID);
  }
}

/** A revolt is determinate: the outcome's slaves leave and the Unrest tokens clear.
 *  No roll, and the turn passes. */
function revolt(G: HegemonyState, playerID: PlayerId, { slaves, leaving }: UnrestOutcome) {
  const player = G.players[playerID];
  const left = removePops(G, playerID, leaving, ["slaves"]);
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
  /** What ending the turn at this level sets off. */
  outcome: UnrestOutcome;
  /** The level the lines test: every term, calm included. */
  happiness: number;
  /** The standing luxury term (active goods × happinessPerGood). */
  luxuryBonus: number;
  /** Calm bought this year: counted until the year turns. */
  calmBonus: number;
  /** Running total of pops already lost to riots, revolts and hunger. */
  totalDeaths: number;
}

export function unrestStatus(G: HegemonyState, playerID: PlayerId): UnrestStatus {
  const player = G.players[playerID];
  const terms = happinessContributions(G, playerID);
  const happiness = terms.reduce((sum, term) => sum + term.amount, 0);
  const outcome = unrestOutcome(G, playerID, happiness);

  const tier: UnrestTier =
    outcome.tier === "revolt"
      ? "revolt"
      : outcome.tier === "riot"
        ? "unrest"
        : happiness < 0
          ? "discontent"
          : "calm";

  return {
    tier,
    outcome,
    happiness,
    luxuryBonus: terms.find((term) => term.id === "luxuries")?.amount ?? 0,
    calmBonus: terms.find((term) => term.id === "calm")?.amount ?? 0,
    totalDeaths: player.popsLostToUnrest + player.popsLostToHunger,
  };
}

/** What ending the turn now sets off, and what calm bought first would change. */
export interface TurnEndUnrest extends UnrestOutcome {
  tier: "riot" | "revolt";
  /** The first calm the seat can buy that changes the outcome, with the level it
   *  reaches and what ending then sets off; null when no calm helps. */
  calm: {
    payment: CivicCalmPayment;
    cost: Partial<Resources>;
    level: number;
    tier: "riot" | "none";
  } | null;
}

/** The end-turn confirm's facts: null when ending now starts neither a riot nor a
 *  revolt. Calm is tried through the real action on a draft, gold before influence. */
export function turnEndUnrest(G: HegemonyState, playerID: PlayerId): TurnEndUnrest | null {
  const outcome = unrestOutcome(G, playerID);
  const { tier } = outcome;
  if (tier === "none") return null;

  let calm: TurnEndUnrest["calm"] = null;
  for (const payment of ["gold", "influence"] as const) {
    const status = getCivicCalmStatus(G, playerID, payment);
    if (!status.can) continue;
    const after = happinessLevel(
      produce(G, (draft) => void civicCalm(draft, playerID, payment)),
      playerID,
    );
    const then = unrestOutcome(G, playerID, after).tier;
    if (then !== tier && then !== "revolt") {
      calm = { payment, cost: status.cost ?? {}, level: after, tier: then };
      break;
    }
  }

  return { ...outcome, tier, calm };
}
