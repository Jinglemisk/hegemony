import { BUILDINGS, EMPTY_RESOURCES, PLAYER_IDS } from "../data";
import type { HegemonyState, HexTile, PlayerId, PopType, Resource, Resources, Settlement } from "../types";
import { formatPopName, formatRuleNumber } from "../core/format";
import { getTile } from "../core/query";
import { applyResourceDelta } from "../core/resources";
import {
  scaledByPops,
  settlementIncomeSource,
  settlementOverCapacity,
  settlementTileYield
} from "../settlement";
import { DEFAULT_RULESET } from "../ruleset";
import type { Ruleset } from "../ruleset";

export type IncomeContribution = {
  resource: Resource;
  amount: number;
  source: string;
  detail: string;
};

export type FoodShortageStatus = {
  stockpile: number;
  income: number;
  projectedStockpile: number;
  rawPressure: number;
  appliedPressure: number;
  gracePreventedPressure: number;
  firstTurnGraceActive: boolean;
};

/**
 * Base income produced by `count` pops of a single type, before building effects
 * and over-capacity pressure. This is the ONE definition of the per-pop yield
 * formula, driven by {@link Ruleset.popIncome} and shared by {@link settlementNetYield}
 * and the UI's pop / grow-pop projections so the engine and UI can never drift.
 */
/**
 * `ruleset` is REQUIRED. It used to default to DEFAULT_RULESET, which silently
 * decoupled callers from `G.ruleset` — the UI omitted it and reported 2 gold per
 * freeman while a patched engine paid 4 (R7). A missing ruleset is now a type
 * error rather than a wrong number on screen.
 */
export function popIncome(
  pop: PopType,
  count: number,
  primaryResource: Resource,
  ruleset: Ruleset
): Resources {
  const income: Resources = { ...EMPTY_RESOURCES };
  const rule = ruleset.popIncome[pop];

  for (const [resource, perPop] of Object.entries(rule.flat) as Array<[Resource, number]>) {
    income[resource] += perPop * count;
  }
  income[primaryResource] += rule.primaryResource * count;

  return income;
}

/**
 * Net resource income produced by a single settlement: tile yield + pop yields +
 * building effects. Mirrors the per-settlement portion of {@link calculateIncomeBreakdown}
 * without the player-level seasonal / food-shortage adjustments. Used to render the
 * settlement summary card.
 */
/** `ruleset` is REQUIRED for the same reason as {@link popIncome}: a default here
 *  lets a caller silently read the wrong ruleset. */
export function settlementNetYield(tile: HexTile, settlement: Settlement, ruleset: Ruleset): Resources {
  const income: Resources = { ...EMPTY_RESOURCES };

  income[tile.resource.type] += settlementTileYield(tile, settlement, ruleset);
  applyResourceDelta(income, popIncome("citizens", settlement.pops.citizens, tile.resource.type, ruleset));
  applyResourceDelta(income, popIncome("freemen", settlement.pops.freemen, tile.resource.type, ruleset));
  applyResourceDelta(income, popIncome("slaves", settlement.pops.slaves, tile.resource.type, ruleset));
  income.happiness -= settlementOverCapacity(settlement, ruleset) * ruleset.economy.overCapacityHappinessPerPop;

  applyIncomeBuildingEffects([], income, settlement, settlementIncomeSource(tile, settlement), tile.resource.type);

  return income;
}

export function calculateIncome(G: HegemonyState, playerID: PlayerId): Resources {
  return summarizeIncome(calculateIncomeBreakdown(G, playerID));
}

export function calculateIncomeBreakdown(G: HegemonyState, playerID: PlayerId): IncomeContribution[] {
  const contributions: IncomeContribution[] = [];
  const income = { ...EMPTY_RESOURCES };
  const ruleset = G.ruleset;
  const coeff = (pop: PopType, resource: Resource) => ruleset.popIncome[pop].flat[resource] ?? 0;

  for (const tileId of G.players[playerID].settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!tile || !settlement) {
      continue;
    }

    const share =
      settlement.kind === "colony" && tile.settlements.length > 1 ? ruleset.economy.colonySharedTileYieldShare : 1;
    const settlementLabel = settlementIncomeSource(tile, settlement);
    const tileAmount = settlementTileYield(tile, settlement, ruleset);
    addIncomeContribution(contributions, income, {
      resource: tile.resource.type,
      amount: tileAmount,
      source: settlementLabel,
      detail: `Tile yield${share < 1 ? " shared colony" : ""}`
    });

    addIncomeContribution(contributions, income, {
      resource: "influence",
      amount: settlement.pops.citizens * coeff("citizens", "influence"),
      source: settlementLabel,
      detail: `${settlement.pops.citizens} citizens`
    });
    addIncomeContribution(contributions, income, {
      resource: "gold",
      amount: settlement.pops.citizens * coeff("citizens", "gold"),
      source: settlementLabel,
      detail: `${settlement.pops.citizens} citizens`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.citizens * coeff("citizens", "food"),
      source: settlementLabel,
      detail: `${settlement.pops.citizens} citizens upkeep`
    });
    addIncomeContribution(contributions, income, {
      resource: "gold",
      amount: settlement.pops.freemen * coeff("freemen", "gold"),
      source: settlementLabel,
      detail: `${settlement.pops.freemen} freeman pops`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.freemen * coeff("freemen", "food"),
      source: settlementLabel,
      detail: `${settlement.pops.freemen} freeman pops upkeep`
    });
    addIncomeContribution(contributions, income, {
      resource: tile.resource.type,
      amount: settlement.pops.slaves * ruleset.popIncome.slaves.primaryResource,
      source: settlementLabel,
      detail: `${settlement.pops.slaves} slave pops production`
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.slaves * coeff("slaves", "food"),
      source: settlementLabel,
      detail: `${settlement.pops.slaves} slave pops upkeep`
    });
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: settlement.pops.slaves * coeff("slaves", "happiness"),
      source: settlementLabel,
      detail: `${settlement.pops.slaves} slave pops pressure`
    });
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: settlementOverCapacity(settlement, ruleset) * -ruleset.economy.overCapacityHappinessPerPop,
      source: settlementLabel,
      detail: "Over capacity pressure"
    });

    applyIncomeBuildingEffects(contributions, income, settlement, settlementLabel, tile.resource.type);
  }

  applySeasonalIncomeEffects(G, playerID, contributions, income);
  applyYearOmenIncomeEffects(G, contributions, income);

  const foodShortage = getFoodShortageStatus(G, playerID, income.food);

  if (foodShortage.appliedPressure < 0) {
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: foodShortage.appliedPressure,
      source: "Food shortage",
      detail: `Projected food stockpile ${formatRuleNumber(foodShortage.projectedStockpile)}`
    });
  }

  const divisor = ruleset.economy.foodStockpileHappinessDivisor;
  const cap = ruleset.economy.foodStockpileHappinessCap;
  const uncapped = divisor > 0 ? Math.floor(G.players[playerID].resources.food / divisor) : 0;
  // Capped so hoarded food can't buy unlimited calm (roadmap-appendix D4).
  const foodStockpileHappiness = Math.min(uncapped, cap);

  if (foodStockpileHappiness > 0) {
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: foodStockpileHappiness,
      source: "Food stockpile",
      detail:
        uncapped > cap
          ? `Every ${divisor} stored food improves happiness (capped at +${cap})`
          : `Every ${divisor} stored food improves happiness (up to +${cap})`
    });
  }

  return contributions;
}

export function getFoodShortageStatus(G: HegemonyState, playerID: PlayerId, foodIncome: number): FoodShortageStatus {
  const stockpile = G.players[playerID].resources.food;
  const projectedStockpile = stockpile + foodIncome;
  const rawPressure = projectedStockpile < 0 ? projectedStockpile : 0;
  const firstTurnGraceActive =
    G.ruleset.economy.firstIncomeFoodGrace && !G.players[playerID].hasCollectedGameplayIncome;
  const appliedPressure = firstTurnGraceActive ? 0 : rawPressure;

  return {
    stockpile,
    income: foodIncome,
    projectedStockpile,
    rawPressure,
    appliedPressure,
    gracePreventedPressure: firstTurnGraceActive ? rawPressure : 0,
    firstTurnGraceActive
  };
}

/** The standing yearly omen (always symmetric — every player collects under it). */
function applyYearOmenIncomeEffects(G: HegemonyState, contributions: IncomeContribution[], income: Resources) {
  for (const effect of G.yearOmen?.effects ?? []) {
    if (effect.type === "yearIncomeModifier") {
      addIncomeContribution(contributions, income, {
        resource: effect.resource,
        amount: effect.amount,
        source: `Omen: ${G.yearOmen?.label}`,
        detail: "Yearly omen"
      });
    }
  }
}

function applySeasonalIncomeEffects(
  G: HegemonyState,
  playerID: PlayerId,
  contributions: IncomeContribution[],
  income: Resources
) {
  const card = G.activeSeasonEvent?.card;

  if (!card) {
    return;
  }

  for (const effect of card.effects) {
    if (effect.type === "incomeModifier" && effect.duration === "season" && effectAppliesToPlayer(effect.scope, playerID)) {
      addIncomeContribution(contributions, income, {
        resource: effect.resource,
        amount: effect.amount,
        source: card.name,
        detail: "Seasonal event"
      });
    } else if (
      effect.type === "scaledHappinessDelta" &&
      effect.duration === "season" &&
      effectAppliesToPlayer(effect.scope, playerID)
    ) {
      addIncomeContribution(contributions, income, {
        resource: "happiness",
        amount: scaledByPops(G, playerID, effect.amountPerPops, effect.popStep, effect.minimumMagnitude),
        source: card.name,
        detail: "Seasonal event"
      });
    }
  }
}

function effectAppliesToPlayer(scope: "activePlayer" | "allPlayers", playerID: PlayerId) {
  return scope === "allPlayers" || PLAYER_IDS.includes(playerID);
}

function applyIncomeBuildingEffects(
  contributions: IncomeContribution[],
  income: Resources,
  settlement: Settlement,
  settlementLabel: string,
  primaryResource: Resource
) {
  const popBonusSupport = {
    freemen: { supportedPops: 0, amount: 0 },
    citizens: { supportedPops: 0, amount: 0 },
    slaves: { supportedPops: 0, amount: 0 }
  };

  for (const buildingId of settlement.buildings) {
    const building = BUILDINGS.find((candidate) => candidate.id === buildingId);

    for (const effect of building?.effects ?? []) {
      if (effect.type === "income") {
        addIncomeContribution(contributions, income, {
          resource: effect.resource,
          amount: effect.amount,
          source: settlementLabel,
          detail: building?.name ?? buildingId
        });
      } else if (effect.type === "happiness") {
        addIncomeContribution(contributions, income, {
          resource: "happiness",
          amount: effect.amount,
          source: settlementLabel,
          detail: building?.name ?? buildingId
        });
      } else if (effect.type === "freemanGoldBonus") {
        popBonusSupport.freemen.supportedPops += effect.supportedPops;
        popBonusSupport.freemen.amount = effect.amount;
      } else if (effect.type === "citizenInfluenceBonus") {
        popBonusSupport.citizens.supportedPops += effect.supportedPops;
        popBonusSupport.citizens.amount = effect.amount;
      } else if (effect.type === "slavePrimaryResourceBonus") {
        popBonusSupport.slaves.supportedPops += effect.supportedPops;
        popBonusSupport.slaves.amount = effect.amount;
      }
    }
  }

  const supportedFreemen = Math.min(settlement.pops.freemen, popBonusSupport.freemen.supportedPops);
  addIncomeContribution(contributions, income, {
    resource: "gold",
    amount: supportedFreemen * popBonusSupport.freemen.amount,
    source: settlementLabel,
    detail: `Marketplace supports ${supportedFreemen} ${formatPopName("freemen", supportedFreemen)}`
  });

  const supportedCitizens = Math.min(settlement.pops.citizens, popBonusSupport.citizens.supportedPops);
  addIncomeContribution(contributions, income, {
    resource: "influence",
    amount: supportedCitizens * popBonusSupport.citizens.amount,
    source: settlementLabel,
    detail: `Temple supports ${supportedCitizens} ${formatPopName("citizens", supportedCitizens)}`
  });

  const supportedSlaves = Math.min(settlement.pops.slaves, popBonusSupport.slaves.supportedPops);
  addIncomeContribution(contributions, income, {
    resource: primaryResource,
    amount: supportedSlaves * popBonusSupport.slaves.amount,
    source: settlementLabel,
    detail: `Workshop supports ${supportedSlaves} ${formatPopName("slaves", supportedSlaves)}`
  });
}

export function addIncomeContribution(
  contributions: IncomeContribution[],
  income: Resources,
  contribution: IncomeContribution
) {
  if (contribution.amount === 0) {
    return;
  }

  contributions.push(contribution);
  income[contribution.resource] += contribution.amount;
}

export function summarizeIncome(contributions: IncomeContribution[]): Resources {
  const income = { ...EMPTY_RESOURCES };

  for (const contribution of contributions) {
    income[contribution.resource] += contribution.amount;
  }

  return income;
}
