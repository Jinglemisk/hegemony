import { getBuilding } from "./content";
import { getOwnedSettlement } from "./core/query";
import { getLawHappinessContributions } from "./assembly/laws";
import { luxuryHappinessBonus } from "./luxury";
import { scaledByPops } from "./settlement";
import type { HegemonyState, PlayerId, Settlement } from "./types";

/**
 * Happiness is a level: a number read off the board each turn and never stored.
 *
 *   level = Temples + 2 per luxury − half the slaves − Unrest tokens, +2 if calm
 *
 * A level of −3 this turn is −3 next turn if nothing on the board changes. The only
 * part that persists is the count of Unrest tokens on the player.
 *
 * Standing Laws and the season's card still name happiness at v1's scale. Until the
 * steps that own them rewrite them, each counts as one more term of the level.
 */
export type HappinessContributionId =
  "temples" | "luxuries" | "slaves" | "tokens" | "calm" | "law" | "season";

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
  const luxuries = luxuryHappinessBonus(G, playerID);
  const perGood = G.ruleset.economy.luxury.happinessPerGood;
  const goods = perGood > 0 ? luxuries / perGood : 0;

  return [
    { id: "temples", amount: temples, detail: "Temples" },
    {
      id: "luxuries",
      amount: luxuries,
      detail: `${goods} ${goods === 1 ? "luxury" : "luxuries"}`,
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
    ...seasonHappiness(G, playerID),
  ];
}

/** The season card's standing happiness line (Civic Anxiety). Years replace seasons
 *  in Step 6. */
function seasonHappiness(G: HegemonyState, playerID: PlayerId): HappinessContribution[] {
  const active = G.activeSeasonEvent;

  return (active?.card?.effects ?? []).flatMap((effect): HappinessContribution[] =>
    effect.type === "scaledHappinessDelta" &&
    effect.duration === "season" &&
    (effect.scope === "allPlayers" || playerID === active?.playerID)
      ? [
          {
            id: "season",
            amount: scaledByPops(
              G,
              playerID,
              effect.amountPerPops,
              effect.popStep,
              effect.minimumMagnitude,
            ),
            detail: active?.card?.name ?? "Season",
          },
        ]
      : [],
  );
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

/**
 * A one-shot happiness gain or loss from a card, a Law's rider or a Directive. With
 * no bank to pay into, a loss of any size places one Unrest token and a gain of any
 * size clears one. Returns the change in tokens.
 */
export function applyHappinessSwing(G: HegemonyState, playerID: PlayerId, amount: number): number {
  const player = G.players[playerID];
  const before = player.unrestTokens;

  if (amount < 0) {
    player.unrestTokens += 1;
  } else if (amount > 0) {
    player.unrestTokens = Math.max(0, before - 1);
  }

  return player.unrestTokens - before;
}

/** How a swing reads in the log: "places an Unrest token" or "clears an Unrest token". */
export function describeHappinessSwing(change: number): string {
  if (change > 0) return "places an Unrest token";
  if (change < 0) return "clears an Unrest token";
  return "finds no Unrest token to clear";
}
