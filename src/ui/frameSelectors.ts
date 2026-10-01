import { unrestStatus } from "../game/rules";
import type { HegemonyState, PlayerId } from "../game/types";

/**
 * What the frame's happiness display draws, whichever model the rules run.
 *
 * v2 has not settled its happiness model yet (Q77): a clamped bank, or a level
 * rebuilt each year with Unrest tokens. The display takes this shape either way —
 * a value, the range its gauge spans, where riot and revolt start, and the lines
 * that add up to the value — so Step 5 swaps the selector, not the component.
 */
export type HappinessDisplay = {
  model: "bank" | "level";
  value: number;
  /** The gauge's ends. The value's tick is clamped inside them. */
  floor: number;
  ceiling: number;
  /** At or below this, the riot table is rolled. */
  riotAt: number;
  /** At or below this, the riot is severe (a revolt). */
  revoltAt: number;
  lines: Array<{ label: string; amount: number }>;
};

/** Today's rules: a bank, plus the standing luxury offset and this year's calm,
 *  tested against two thresholds. */
export function happinessDisplay(G: HegemonyState, playerID: PlayerId): HappinessDisplay {
  const status = unrestStatus(G, playerID);
  const { popLossThreshold, severeThreshold } = G.ruleset.economy.unrest;
  // Stored, the luxury bonus and the effective value are always shown together;
  // calm joins them for the turn it lasts.
  const lines = [
    { label: "Stored", amount: status.storedHappiness },
    { label: "Luxuries", amount: status.luxuryBonus },
    ...(status.calmBonus !== 0
      ? [{ label: "Calm, until your next turn", amount: status.calmBonus }]
      : []),
  ];

  return {
    model: "bank",
    value: status.happiness,
    floor: severeThreshold,
    ceiling: -severeThreshold,
    riotAt: popLossThreshold,
    revoltAt: severeThreshold,
    lines,
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
