import { getBuilding } from "./content";
import { getOwnedSettlement } from "./core/query";
import { luxuryHappinessBonus } from "./luxury";
import type { HegemonyState, PlayerId, Settlement } from "./types";

/**
 * What a realm's happiness is made of, as named terms a player can count off the
 * board: Temples, luxuries, slaves, and this year's calm.
 *
 * Step 5 of the v2 migration combines these into the model Q77 picks. Until then
 * today's bank runs on top of them: Temples and slaves are paid into the bank at
 * each income, while luxuries and calm stand beside it and are never banked.
 */
export type HappinessContributionId = "temples" | "luxuries" | "slaves" | "calm";

export interface HappinessContribution {
  id: HappinessContributionId;
  amount: number;
  detail: string;
}

/** The terms the bank collects at income. The others only stand beside it. */
export const BANKED_HAPPINESS: readonly HappinessContributionId[] = ["temples", "slaves"];

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
  const luxuries = luxuryHappinessBonus(G, playerID);
  const perGood = G.ruleset.economy.luxury.happinessPerGood;

  return [
    { id: "temples", amount: temples, detail: "Temples" },
    {
      id: "luxuries",
      amount: luxuries,
      detail: `${perGood > 0 ? luxuries / perGood : 0} active luxuries`,
    },
    { id: "slaves", amount: -slaveUnhappiness(G, slaves), detail: `${slaves} slaves` },
    {
      id: "calm",
      amount: player.calmActive ? G.ruleset.civicCalm.happiness : 0,
      detail: "Calm bought this year",
    },
  ];
}

function contribution(G: HegemonyState, playerID: PlayerId, id: HappinessContributionId) {
  return happinessContributions(G, playerID).find((term) => term.id === id)?.amount ?? 0;
}

/** The bank plus luxuries: what Beloved of the People reads. Calm is left out, so a
 *  victory card cannot be bought for one turn. */
export function standingHappiness(G: HegemonyState, playerID: PlayerId): number {
  return G.players[playerID].resources.happiness + contribution(G, playerID, "luxuries");
}

/** The bank plus luxuries plus this year's calm: what the riot thresholds test. */
export function effectiveHappiness(G: HegemonyState, playerID: PlayerId): number {
  return standingHappiness(G, playerID) + contribution(G, playerID, "calm");
}
