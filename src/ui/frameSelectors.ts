import {
  getActiveEffects,
  getBankBuyStatus,
  happinessContributions,
  unrestStatus,
} from "../game/rules";
import { playerDole } from "../game/ideaRules";
import { sign } from "./frameFormat";
import type { HappinessContribution } from "../game/rules";
import type { HegemonyState, PlayerId } from "../game/types";

/** The committed turn's consequences, using the engine's current stock, level and
 *  thresholds. Hunger is settled first, then the riot or revolt: the label names the
 *  riot when both wait, and the message names both. */
export function endTurnWarning(G: HegemonyState, playerID: PlayerId) {
  const status = unrestStatus(G, playerID);
  const hunger = hungerShortfall(G, playerID);
  const leaving = hunger
    ? `${hunger.unfed} ${hunger.unfed === 1 ? "pop leaves" : "pops leave"}`
    : null;
  const hungerMessage = hunger
    ? `Ending now, ${leaving}: you are ${hunger.short} food short.`
    : null;
  if (status.riotAtRisk) {
    const revolt = status.tier === "revolt";
    const unrest = `Ending now starts a ${revolt ? "revolt" : "riot"} at ${sign(status.happiness)}.`;
    return {
      label: revolt ? "Starts revolt" : "Starts riot",
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
  fixes: Array<{ icon: string; text: string }>;
};

/**
 * Food short during the seat's own turn: what ending now takes (the hunger alarm's
 * own mechanic) and the two ways to buy food first.
 */
export function hungerShortfall(G: HegemonyState, playerID: PlayerId): HungerShortfall | null {
  const hunger = getActiveEffects(G, playerID)
    .flatMap((descriptor) => descriptor.mechanics)
    .find((mechanic) => mechanic.type === "hunger");
  if (!hunger || hunger.unfed === 0) return null;
  const { food, influenceCost } = playerDole(G, playerID);
  const bank = getBankBuyStatus(G, playerID, "food").cost?.gold ?? 0;
  const held = G.players[playerID].resources;
  return {
    short: -hunger.stockpile,
    unfed: hunger.unfed,
    fixes: [
      {
        icon: "resources/influence",
        text: `Dole: ${food} food for ${influenceCost} influence (you hold ${held.influence})`,
      },
      { icon: "resources/gold", text: `Bank: 1 food for ${bank} gold (you hold ${held.gold})` },
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
  /** At or below this, the realm revolts: half its slaves leave. */
  revoltAt: number;
  /** Unrest tokens on the realm, each worth −1 until a riot or a card clears them. */
  tokens: number;
  lines: Array<{ label: string; amount: number }>;
};

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function termLabel(G: HegemonyState, term: HappinessContribution): string {
  switch (term.id) {
    case "slaves":
      return `${capitalized(term.detail)}, 1 per ${G.ruleset.economy.slavesPerUnhappiness}`;
    case "calm":
      return "Calm, until year end";
    default:
      return capitalized(term.detail);
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
    value: terms.reduce((sum, term) => sum + term.amount, 0),
    floor: revoltThreshold,
    ceiling: -revoltThreshold,
    riotAt: riotThreshold,
    revoltAt: revoltThreshold,
    tokens: G.players[playerID].unrestTokens,
    lines: terms
      .filter((term) => term.amount !== 0 || always.includes(term.id))
      .map((term) => ({ label: termLabel(G, term), amount: term.amount })),
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

/** A seat's public position: what anyone at the table can count on the board. */
export function publicCensus(G: HegemonyState, playerID: PlayerId): Census {
  const census: Census = { slaves: 0, freemen: 0, citizens: 0, cities: 0, colonies: 0 };

  for (const tile of G.board.tiles) {
    for (const settlement of tile.settlements) {
      if (settlement.owner !== playerID) {
        continue;
      }

      census.slaves += settlement.pops.slaves;
      census.freemen += settlement.pops.freemen;
      census.citizens += settlement.pops.citizens;

      if (settlement.kind === "colony") {
        census.colonies += 1;
      } else {
        census.cities += 1;
      }
    }
  }

  return census;
}
