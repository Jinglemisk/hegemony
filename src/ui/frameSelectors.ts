import {
  getActiveEffects,
  happinessContributions,
  happinessLevel,
  realmPops,
  unrestOutcome,
} from "../game/rules";
import type { ActiveEffectDescriptor } from "../game/activeEffects";
import { nextAssemblyYear } from "../game/assembly";
import { capitalize } from "../game/core/format";
import { PLAYER_IDS } from "../game/data";
import { playerDole } from "../game/ideaRules";
import { presentUnrestOutcome } from "./effects";
import { sign } from "./frameFormat";
import type { HappinessContribution } from "../game/rules";
import type { HegemonyState, LogEntry, PlayerId } from "../game/types";

/** The committed turn's consequences, using the engine's current stock, level and
 *  thresholds. Hunger is settled first, then the riot or revolt: the label names the
 *  riot when both wait, and the message names both. */
export function endTurnWarning(G: HegemonyState, playerID: PlayerId) {
  const outcome = unrestOutcome(G, playerID);
  const hunger = hungerShortfall(G, playerID);
  const leaving = hunger
    ? `${hunger.unfed} ${hunger.unfed === 1 ? "pop leaves" : "pops leave"}`
    : null;
  const hungerMessage = hunger
    ? `Ending now, ${leaving}: you are ${hunger.short} food short.`
    : null;
  if (outcome.tier !== "none") {
    const { noun } = presentUnrestOutcome(G.ruleset, outcome.tier);
    const unrest = `Ending now starts a ${noun} at ${sign(outcome.level)}.`;
    return {
      label: `Starts ${noun}`,
      message: hungerMessage ? `${hungerMessage} ${unrest}` : unrest,
    };
  }
  return hungerMessage ? { label: leaving!, message: hungerMessage } : null;
}

export type HungerShortfall = {
  /** Food missing now. */
  short: number;
  /** Pops that leave if the turn ended now: one per missing food, while mouths last. */
  unfed: number;
  /** What would feed the shortfall now, with its price and what the seat holds. */
  fixes: string[];
};

/**
 * Food short during the seat's own turn: what ending now takes (the hunger alarm's
 * own mechanic) and the two ways to get food first: the Dole, or a trade.
 */
export function hungerShortfall(G: HegemonyState, playerID: PlayerId): HungerShortfall | null {
  const hunger = getActiveEffects(G, playerID)
    .flatMap((descriptor) => descriptor.mechanics)
    .find((mechanic) => mechanic.type === "hunger");
  if (!hunger || hunger.unfed === 0) return null;
  const { food, influenceCost } = playerDole(G, playerID);
  const held = G.players[playerID].resources;
  return {
    short: -hunger.stockpile,
    unfed: hunger.unfed,
    fixes: [
      `Dole: ${food} food for ${influenceCost} influence (you hold ${held.influence})`,
      "Trade: offer the other seats goods for food",
    ],
  };
}

/**
 * What the frame's happiness display draws: the level, the range its gauge spans,
 * where riot and revolt start, and the terms that add up to the level.
 */
export type HappinessDisplay = {
  value: number;
  /** The gauge's ends. The value's tick is clamped inside them. */
  floor: number;
  ceiling: number;
  /** At or below this, the riot table is rolled. */
  riotAt: number;
  /** At or below this, the realm revolts: the ruleset's share of its slaves leave. */
  revoltAt: number;
  /** Unrest tokens on the realm, each worth −1 until a riot or a card clears them. */
  tokens: number;
  /** `turns` on a term that runs out (calm, at year end). */
  lines: Array<{ label: string; amount: number; turns?: number }>;
};

function termLabel(G: HegemonyState, term: HappinessContribution): string {
  switch (term.id) {
    case "slaves":
      return `${capitalize(term.detail)}, 1 per ${G.ruleset.economy.slavesPerUnhappiness}`;
    case "calm":
      return "Calm";
    default:
      return capitalize(term.detail);
  }
}

/**
 * The seat's own turns left this year, the one being played included. A year is one
 * turn per seat, in order from the year's opener; the Assembly sits before any of them.
 */
export function turnsLeftInYear(G: HegemonyState, seat: PlayerId): number {
  if (G.assembly) return 1;
  const order = PLAYER_IDS.map(
    (_, index) => PLAYER_IDS[(PLAYER_IDS.indexOf(G.yearOpener) + index) % PLAYER_IDS.length],
  );
  return order.indexOf(seat) >= order.indexOf(G.currentPlayer) ? 1 : 0;
}

/** The seat's own turns before `year` opens. */
export function turnsUntilYear(G: HegemonyState, seat: PlayerId, year: number): number {
  return Math.max(0, year - G.year - 1) + turnsLeftInYear(G, seat);
}

/** How many of the seat's turns a standing effect has left (`Turns`); null while it
 *  stands until repealed or for good. */
export function effectTurns(
  G: HegemonyState,
  seat: PlayerId,
  descriptor: ActiveEffectDescriptor,
): number | null {
  switch (descriptor.duration.expiry) {
    case "afterIncomeCollections":
    case "whenFed":
      return descriptor.duration.remaining;
    case "atYearEnd":
      return turnsLeftInYear(G, seat);
    case "atNextAssembly": {
      const year = nextAssemblyYear(G);
      return year === null ? null : turnsUntilYear(G, seat, year);
    }
    case "whenRepealed":
    case "permanent":
      return null;
  }
}

/** The level and its terms. Temples, luxuries, slaves and tokens are always listed,
 *  so a player sees what the level is made of even at zero; the rest only when they
 *  count. */
export function happinessDisplay(G: HegemonyState, playerID: PlayerId): HappinessDisplay {
  const terms = happinessContributions(G, playerID);
  const { riotThreshold, revoltThreshold } = G.ruleset.economy.unrest;
  const always: Array<HappinessContribution["id"]> = [
    "temples",
    "luxuries",
    "slaves",
    "tokens",
    "law",
  ];

  return {
    value: happinessLevel(G, playerID),
    floor: revoltThreshold,
    ceiling: -revoltThreshold,
    riotAt: riotThreshold,
    revoltAt: revoltThreshold,
    tokens: G.players[playerID].unrestTokens,
    lines: terms
      .filter((term) => term.amount !== 0 || always.includes(term.id))
      .map((term) => ({
        label: termLabel(G, term),
        amount: term.amount,
        ...(term.id === "calm" ? { turns: turnsLeftInYear(G, playerID) } : {}),
      })),
  };
}

/** Where the gauge's tick and bands fall, as fractions of its width. */
export function gaugeStops(display: HappinessDisplay) {
  const span = display.ceiling - display.floor || 1;
  const at = (value: number) => Math.min(1, Math.max(0, (value - display.floor) / span));

  return { value: at(display.value), riot: at(display.riotAt), revolt: at(display.revoltAt) };
}

export type Census = {
  slaves: number;
  freemen: number;
  citizens: number;
  cities: number;
  colonies: number;
};

/** A seat's public position: what anyone at the table can count on the board. Pops
 *  on the move are counted: they are still in the realm. */
export function publicCensus(G: HegemonyState, playerID: PlayerId): Census {
  const census: Census = { ...realmPops(G, playerID), cities: 0, colonies: 0 };

  for (const tile of G.board.tiles) {
    for (const settlement of tile.settlements) {
      if (settlement.owner !== playerID) {
        continue;
      }

      if (settlement.kind === "colony") {
        census.colonies += 1;
      } else {
        census.cities += 1;
      }
    }
  }

  return census;
}

/** Whose deed a Chronicle line is: the engine's `about`, or, in saves from before that
 *  field, the seat whose name the line opens with (longest name first, so no name can
 *  be a prefix of another's). */
export function deedSeat(G: HegemonyState, entry: LogEntry): PlayerId | null {
  if (entry.about) return entry.about;
  const players = Object.values(G.players).sort((a, b) => b.name.length - a.name.length);
  return players.find((player) => entry.message.startsWith(player.name))?.id ?? null;
}
