import { getBuilding } from "./content";
import { getOwnedSettlement, zeroedYearTerm } from "./core/query";
import { getLawHappinessContributions } from "./assembly/laws";
import { activeClaims, luxuryHappinessBonus } from "./luxury";
import type { HegemonyState, PlayerId, Settlement, UnrestTokenChange } from "./types";

/**
 * Happiness is a level: a number read off the board each turn and never stored.
 *
 *   level = Temples + 2 per luxury − half the slaves − Unrest tokens, +2 if calm
 *
 * A level of −3 this turn is −3 next turn if nothing on the board changes. The only
 * part that persists is the count of Unrest tokens on the player.
 *
 * Standing Laws still name happiness at v1's scale. Until Step 8 rewrites them, each
 * counts as one more term of the level.
 */
export type HappinessContributionId = "temples" | "luxuries" | "slaves" | "tokens" | "calm" | "law";

export interface HappinessContribution {
  id: HappinessContributionId;
  amount: number;
  /** What a player counts to get the amount: "3 Temples", "5 slaves", a Law's name. */
  detail: string;
}

/** The happiness a settlement's buildings state: +1 for its Temple. */
export function settlementBuildingHappiness(G: HegemonyState, settlement: Settlement): number {
  return settlement.buildings.reduce(
    (sum, buildingId) =>
      sum +
      (getBuilding(G.definition.content, buildingId)?.effects ?? []).reduce(
        (effectSum, effect) =>
          effect.type === "happiness" ? effectSum + effect.amount : effectSum,
        0,
      ),
    0,
  );
}

/** Every two slaves in the realm cost 1 happiness; an odd slave costs nothing. */
export function slaveUnhappiness(G: HegemonyState, slaves: number): number {
  const per = G.ruleset.economy.slavesPerUnhappiness;

  return per > 0 ? Math.floor(slaves / per) : 0;
}

/** Every term of a realm's level, zero ones included, in the order a player reads
 *  them. The level is their sum. */
export function happinessContributions(
  G: HegemonyState,
  playerID: PlayerId,
): HappinessContribution[] {
  const player = G.players[playerID];
  const settlements = player.settlements.flatMap(
    (tileId) => getOwnedSettlement(G, tileId, playerID) ?? [],
  );
  const temples = settlements.reduce(
    (sum, settlement) => sum + settlementBuildingHappiness(G, settlement),
    0,
  );
  const slaves = settlements.reduce((sum, settlement) => sum + settlement.pops.slaves, 0);
  const goods = activeClaims(G, playerID).length;
  const blockade = zeroedYearTerm(G) === "luxuryHappiness" ? G.activeYearCard?.name : null;

  return [
    { id: "temples", amount: temples, detail: "Temples" },
    {
      id: "luxuries",
      amount: luxuryHappinessBonus(G, playerID),
      detail:
        `${goods} ${goods === 1 ? "luxury" : "luxuries"}` +
        (blockade ? `, none counted this year (${blockade})` : ""),
    },
    { id: "slaves", amount: -slaveUnhappiness(G, slaves), detail: `${slaves} slaves` },
    {
      id: "tokens",
      amount: -player.unrestTokens,
      detail: `${player.unrestTokens} Unrest ${player.unrestTokens === 1 ? "token" : "tokens"}`,
    },
    {
      id: "calm",
      amount: player.calmActive ? G.ruleset.civicCalm.happiness : 0,
      detail: "Calm bought this year",
    },
    ...getLawHappinessContributions(G, playerID).map((law): HappinessContribution => ({
      id: "law",
      amount: law.amount,
      detail: law.label,
    })),
  ];
}

/** The level the riot and revolt lines test: every term, this year's calm included. */
export function happinessLevel(G: HegemonyState, playerID: PlayerId): number {
  return happinessContributions(G, playerID).reduce((sum, term) => sum + term.amount, 0);
}

/** The level without calm: what Beloved of the People reads, so a victory card
 *  cannot be bought for one turn. */
export function standingHappiness(G: HegemonyState, playerID: PlayerId): number {
  return happinessContributions(G, playerID).reduce(
    (sum, term) => (term.id === "calm" ? sum : sum + term.amount),
    0,
  );
}

/** Apply the printed token verb. Clear-one floors at zero; Festival clears all. */
export function applyUnrestTokenChange(
  G: HegemonyState,
  playerID: PlayerId,
  change: UnrestTokenChange,
): number {
  const player = G.players[playerID];
  const before = player.unrestTokens;
  player.unrestTokens =
    change === "placeOne" ? before + 1 : change === "clearAll" ? 0 : Math.max(0, before - 1);
  return player.unrestTokens - before;
}

export function describeUnrestTokenChange(change: number): string {
  if (change > 0) return "places an Unrest token";
  if (change < 0) return `clears ${-change === 1 ? "an Unrest token" : `${-change} Unrest tokens`}`;
  return "finds no Unrest token to clear";
}
