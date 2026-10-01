import { EMPTY_RESOURCES } from "../data";
import { getAuthoredGameContent, getBuildings } from "../content";
import type { GameContent } from "../content";
import type {
  HegemonyState,
  HexTile,
  PlayerId,
  PopType,
  Resource,
  Resources,
  Settlement,
} from "../types";
import { formatPopName } from "../core/format";
import { getTile } from "../core/query";
import { applyResourceDelta } from "../core/resources";
import {
  countPlayerPopType,
  scaledByPops,
  settlementIdleSlaves,
  settlementIncomeSource,
  settlementOverCapacity,
  settlementWorkingSlaves,
} from "../settlement";
import type { Ruleset } from "../ruleset";
import { getLawIncomeContributions } from "../assembly/laws";

export type IncomeContribution = {
  resource: Resource;
  amount: number;
  source: string;
  detail: string;
  /**
   * The settlement this line comes from, when one does.
   *
   * `source` is the engine's own label and stays a plain string — the simulator,
   * the telemetry and every test read it. This id exists so the frontend can put
   * the settlement's NAME on the row instead ("ARGOS", not "City on plains
   * -2,0") without the engine having to know that settlements have names, which
   * is a presentation fact and not a rule. Purely additive; nothing in the rules
   * reads it.
   */
  settlementId?: string;
};

/** What the next income does to the granary. Free pops eat; when the food runs short,
 *  one pop leaves per unfed mouth and the stockpile stays at zero. */
export type HungerStatus = {
  stockpile: number;
  income: number;
  /** Food after the next income, never below zero. */
  projectedStockpile: number;
  /** Mouths the next income cannot feed. One pop leaves for each. */
  unfed: number;
};

/**
 * Base income produced by `count` pops of a single type, before building effects
 * and over-capacity pressure. This is the ONE definition of the per-pop yield
 * formula, driven by {@link Ruleset.popIncome} and shared by {@link settlementNetYield}
 * and the UI's pop / grow-pop projections so the engine and UI can never drift.
 *
 * `working` is how many of the `count` hold a work slot: only they make the tile's
 * resource. It matters for slaves, whose idle ones still count toward unrest.
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
  primaryResource: Resource | null,
  ruleset: Ruleset,
  working: number = count,
): Resources {
  const income: Resources = { ...EMPTY_RESOURCES };
  const rule = ruleset.popIncome[pop];

  for (const [resource, perPop] of Object.entries(rule.flat) as Array<[Resource, number]>) {
    income[resource] += perPop * count;
  }
  // Hills have no resource, so slaves make nothing there; freemen and citizens
  // produce wherever they live.
  if (primaryResource) {
    income[primaryResource] += rule.primaryResource * working;
  }

  return income;
}

/**
 * Net resource income produced by a single settlement: pop yields + building
 * effects. Mirrors the per-settlement portion of {@link calculateIncomeBreakdown}
 * without the player-level seasonal adjustments. Used to render the settlement
 * summary card.
 */
/** `ruleset` is REQUIRED for the same reason as {@link popIncome}: a default here
 *  lets a caller silently read the wrong ruleset. */
export function settlementNetYield(
  tile: HexTile,
  settlement: Settlement,
  ruleset: Ruleset,
  content: GameContent = getAuthoredGameContent(),
): Resources {
  const income: Resources = { ...EMPTY_RESOURCES };
  const primary = tile.resource?.type ?? null;
  const workingSlaves = settlementWorkingSlaves(tile, settlement);

  applyResourceDelta(income, popIncome("citizens", settlement.pops.citizens, primary, ruleset));
  applyResourceDelta(income, popIncome("freemen", settlement.pops.freemen, primary, ruleset));
  applyResourceDelta(
    income,
    popIncome("slaves", settlement.pops.slaves, primary, ruleset, workingSlaves),
  );
  income.happiness -=
    settlementOverCapacity(settlement, ruleset, content) *
    ruleset.economy.overCapacityHappinessPerPop;

  applyIncomeBuildingEffects(
    [],
    income,
    settlement,
    settlementIncomeSource(tile, settlement),
    primary,
    workingSlaves,
    content,
  );

  return income;
}

export function calculateIncome(G: HegemonyState, playerID: PlayerId): Resources {
  return summarizeIncome(calculateIncomeBreakdown(G, playerID));
}

export function calculateIncomeBreakdown(
  G: HegemonyState,
  playerID: PlayerId,
): IncomeContribution[] {
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

    const settlementLabel = settlementIncomeSource(tile, settlement);
    const primary = tile.resource?.type ?? null;
    const workingSlaves = settlementWorkingSlaves(tile, settlement);
    const idleSlaves = settlementIdleSlaves(tile, settlement);

    addIncomeContribution(contributions, income, {
      resource: "influence",
      amount: settlement.pops.citizens * coeff("citizens", "influence"),
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `${settlement.pops.citizens} citizens`,
    });
    addIncomeContribution(contributions, income, {
      resource: "gold",
      amount: settlement.pops.citizens * coeff("citizens", "gold"),
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `${settlement.pops.citizens} citizens`,
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.citizens * coeff("citizens", "food"),
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `${settlement.pops.citizens} citizens upkeep`,
    });
    addIncomeContribution(contributions, income, {
      resource: "gold",
      amount: settlement.pops.freemen * coeff("freemen", "gold"),
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `${settlement.pops.freemen} freeman pops`,
    });
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.freemen * coeff("freemen", "food"),
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `${settlement.pops.freemen} freeman pops upkeep`,
    });
    // A slave makes the tile's resource only from an open slot; the rest are idle.
    if (primary) {
      addIncomeContribution(contributions, income, {
        resource: primary,
        amount: workingSlaves * ruleset.popIncome.slaves.primaryResource,
        source: settlementLabel,
        settlementId: settlement.id,
        detail:
          `${workingSlaves} working ${formatPopName("slaves", workingSlaves)}` +
          (idleSlaves > 0 ? `, ${idleSlaves} idle` : ""),
      });
    }
    addIncomeContribution(contributions, income, {
      resource: "food",
      amount: settlement.pops.slaves * coeff("slaves", "food"),
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `${settlement.pops.slaves} slave pops upkeep`,
    });
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount: settlement.pops.slaves * coeff("slaves", "happiness"),
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `${settlement.pops.slaves} slave pops pressure`,
    });
    addIncomeContribution(contributions, income, {
      resource: "happiness",
      amount:
        settlementOverCapacity(settlement, ruleset, G.definition.content) *
        -ruleset.economy.overCapacityHappinessPerPop,
      source: settlementLabel,
      settlementId: settlement.id,
      detail: "Over capacity pressure",
    });

    applyIncomeBuildingEffects(
      contributions,
      income,
      settlement,
      settlementLabel,
      primary,
      workingSlaves,
      G.definition.content,
    );
  }

  applySeasonalIncomeEffects(G, playerID, contributions, income);
  applyYearOmenIncomeEffects(G, contributions, income);
  // Standing Laws land AFTER the settlement, building, seasonal and omen passes: a
  // Law is a patch over the ruleset, and the surplus-conversion effect (a tariff on
  // the harvest) can only be assessed once the harvest is known.
  applyStandingLawIncomeEffects(G, playerID, contributions, income);

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
          : `Every ${divisor} stored food improves happiness (up to +${cap})`,
    });
  }

  return contributions;
}

export function getHungerStatus(
  G: HegemonyState,
  playerID: PlayerId,
  foodIncome: number,
): HungerStatus {
  const stockpile = G.players[playerID].resources.food;
  const after = stockpile + foodIncome;
  // Only free pops eat, so only they can go unfed; a shortfall deeper than their
  // number (an omen or a Law taking food) still stops at zero food.
  const mouths =
    countPlayerPopType(G, playerID, "freemen") + countPlayerPopType(G, playerID, "citizens");

  return {
    stockpile,
    income: foodIncome,
    projectedStockpile: Math.max(0, after),
    unfed: Math.min(mouths, Math.max(0, -after)),
  };
}

/**
 * The Assembly's standing Laws. Each lands as its own breakdown line named after the
 * Law that caused it, so a player who
 * wonders where a number came from can always trace it back to a stele in the agora.
 */
function applyStandingLawIncomeEffects(
  G: HegemonyState,
  playerID: PlayerId,
  contributions: IncomeContribution[],
  income: Resources,
) {
  for (const contribution of getLawIncomeContributions(G, playerID, income)) {
    addIncomeContribution(contributions, income, {
      resource: contribution.resource,
      amount: contribution.amount,
      source: contribution.label,
      detail: "Standing law",
    });
  }
}

/** The standing yearly omen (always symmetric — every player collects under it). */
function applyYearOmenIncomeEffects(
  G: HegemonyState,
  contributions: IncomeContribution[],
  income: Resources,
) {
  for (const effect of G.yearOmen?.effects ?? []) {
    if (effect.type === "yearIncomeModifier") {
      addIncomeContribution(contributions, income, {
        resource: effect.resource,
        amount: effect.amount,
        source: `Omen: ${G.yearOmen?.label}`,
        detail: "Yearly omen",
      });
    }
  }
}

function applySeasonalIncomeEffects(
  G: HegemonyState,
  playerID: PlayerId,
  contributions: IncomeContribution[],
  income: Resources,
) {
  const activeEvent = G.activeSeasonEvent;
  const card = activeEvent?.card;

  if (!card) {
    return;
  }

  for (const effect of card.effects) {
    if (
      effect.type === "incomeModifier" &&
      effect.duration === "season" &&
      effectAppliesToPlayer(effect.scope, playerID, activeEvent.playerID)
    ) {
      addIncomeContribution(contributions, income, {
        resource: effect.resource,
        amount: effect.amount,
        source: card.name,
        detail: "Seasonal event",
      });
    } else if (
      effect.type === "scaledHappinessDelta" &&
      effect.duration === "season" &&
      effectAppliesToPlayer(effect.scope, playerID, activeEvent.playerID)
    ) {
      addIncomeContribution(contributions, income, {
        resource: "happiness",
        amount: scaledByPops(
          G,
          playerID,
          effect.amountPerPops,
          effect.popStep,
          effect.minimumMagnitude,
        ),
        source: card.name,
        detail: "Seasonal event",
      });
    }
  }
}

function effectAppliesToPlayer(
  scope: "activePlayer" | "allPlayers",
  playerID: PlayerId,
  activePlayerID: PlayerId,
) {
  return scope === "allPlayers" || playerID === activePlayerID;
}

function applyIncomeBuildingEffects(
  contributions: IncomeContribution[],
  income: Resources,
  settlement: Settlement,
  settlementLabel: string,
  primaryResource: Resource | null,
  workingSlaves: number,
  content: GameContent,
) {
  const popBonusSupport = {
    freemen: { supportedPops: 0, amount: 0 },
    citizens: { supportedPops: 0, amount: 0 },
    slaves: { supportedPops: 0, amount: 0 },
  };
  // The Villa's flat boost to the tile's own material — accumulated across copies
  // (levels), paid only when the tile actually yields (dead on hills/oracle).
  let tilePrimaryBonus = 0;

  for (const buildingId of settlement.buildings) {
    const building = getBuildings(content).find((candidate) => candidate.id === buildingId);

    for (const effect of building?.effects ?? []) {
      if (effect.type === "income") {
        addIncomeContribution(contributions, income, {
          resource: effect.resource,
          amount: effect.amount,
          source: settlementLabel,
          settlementId: settlement.id,
          detail: building?.name ?? buildingId,
        });
      } else if (effect.type === "happiness") {
        addIncomeContribution(contributions, income, {
          resource: "happiness",
          amount: effect.amount,
          source: settlementLabel,
          settlementId: settlement.id,
          detail: building?.name ?? buildingId,
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
      } else if (effect.type === "tilePrimaryResourceBonus") {
        tilePrimaryBonus += effect.amount;
      }
    }
  }

  if (primaryResource && tilePrimaryBonus > 0) {
    addIncomeContribution(contributions, income, {
      resource: primaryResource,
      amount: tilePrimaryBonus,
      source: settlementLabel,
      settlementId: settlement.id,
      detail: "Villa",
    });
  }

  const supportedFreemen = Math.min(settlement.pops.freemen, popBonusSupport.freemen.supportedPops);
  addIncomeContribution(contributions, income, {
    resource: "gold",
    amount: supportedFreemen * popBonusSupport.freemen.amount,
    source: settlementLabel,
    settlementId: settlement.id,
    detail: `Marketplace supports ${supportedFreemen} ${formatPopName("freemen", supportedFreemen)}`,
  });

  const supportedCitizens = Math.min(
    settlement.pops.citizens,
    popBonusSupport.citizens.supportedPops,
  );
  addIncomeContribution(contributions, income, {
    resource: "influence",
    amount: supportedCitizens * popBonusSupport.citizens.amount,
    source: settlementLabel,
    settlementId: settlement.id,
    detail: `Temple supports ${supportedCitizens} ${formatPopName("citizens", supportedCitizens)}`,
  });

  // The Workshop's bonus goes to slaves at work, so it pays nothing on a hill and
  // nothing for idle slaves.
  if (primaryResource) {
    const supportedSlaves = Math.min(workingSlaves, popBonusSupport.slaves.supportedPops);
    addIncomeContribution(contributions, income, {
      resource: primaryResource,
      amount: supportedSlaves * popBonusSupport.slaves.amount,
      source: settlementLabel,
      settlementId: settlement.id,
      detail: `Workshop supports ${supportedSlaves} ${formatPopName("slaves", supportedSlaves)}`,
    });
  }
}

export function addIncomeContribution(
  contributions: IncomeContribution[],
  income: Resources,
  contribution: IncomeContribution,
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
