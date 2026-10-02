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
  settlementIdleSlaves,
  settlementIncomeSource,
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

  applyIncomeBuildingEffects(
    [],
    income,
    settlement,
    settlementIncomeSource(tile, settlement),
    primary,
    workingSlaves,
    ruleset,
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

    applyIncomeBuildingEffects(
      contributions,
      income,
      settlement,
      settlementLabel,
      primary,
      workingSlaves,
      ruleset,
      G.definition.content,
    );
  }

  applySeasonalIncomeEffects(G, playerID, contributions, income);
  applyYearOmenIncomeEffects(G, contributions, income);
  // Standing Laws land AFTER the settlement, building, seasonal and omen passes: a
  // Law is a patch over the ruleset, and the surplus-conversion effect (a tariff on
  // the harvest) can only be assessed once the harvest is known.
  applyStandingLawIncomeEffects(G, playerID, contributions, income);

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
  ruleset: Ruleset,
  content: GameContent,
) {
  for (const buildingId of settlement.buildings) {
    const building = getBuildings(content).find((candidate) => candidate.id === buildingId);

    for (const effect of building?.effects ?? []) {
      // A Temple's happiness is a term of the level, not income (game/happiness.ts).
      if (effect.type === "happiness") {
        continue;
      }
      if (effect.type === "income") {
        addIncomeContribution(contributions, income, {
          resource: effect.resource,
          amount: effect.amount,
          source: settlementLabel,
          settlementId: settlement.id,
          detail: building?.name ?? buildingId,
        });
        continue;
      }

      // A class building raises its column's printed value: every pop of the class
      // here makes `amount` instead of the base. For slaves that is the working
      // ones, so an Estate pays nothing for idle slaves or on a hill.
      const pops = effect.pop === "slaves" ? workingSlaves : settlement.pops[effect.pop];

      for (const [resource, base] of classOutputs(effect.pop, primaryResource, ruleset)) {
        addIncomeContribution(contributions, income, {
          resource,
          amount: pops * (effect.amount - base),
          source: settlementLabel,
          settlementId: settlement.id,
          detail: `${building?.name ?? buildingId}: ${pops} ${formatPopName(effect.pop, pops)} make ${effect.amount}`,
        });
      }
    }
  }
}

/** What one pop of a class makes before any building: the positive lines of its rule. */
function classOutputs(
  pop: PopType,
  primaryResource: Resource | null,
  ruleset: Ruleset,
): Array<[Resource, number]> {
  const rule = ruleset.popIncome[pop];

  return [
    ...(Object.entries(rule.flat) as Array<[Resource, number]>).filter(([, per]) => per > 0),
    ...(primaryResource && rule.primaryResource > 0
      ? ([[primaryResource, rule.primaryResource]] as Array<[Resource, number]>)
      : []),
  ];
}

/**
 * One class column of a settlement: what each pop of the class makes here, the
 * building that raised it, and the class's whole income with that raise in it. The
 * settlement page prints its three columns from this.
 */
export function settlementClassColumn(
  tile: HexTile,
  settlement: Settlement,
  pop: PopType,
  ruleset: Ruleset,
  content: GameContent = getAuthoredGameContent(),
): { perPop: number; raisedBy: string | null; income: Resources } {
  const primary = tile.resource?.type ?? null;
  const working =
    pop === "slaves" ? settlementWorkingSlaves(tile, settlement) : settlement.pops[pop];
  const income = popIncome(pop, settlement.pops[pop], primary, ruleset, working);
  const outputs = classOutputs(pop, primary, ruleset);
  let perPop = outputs[0]?.[1] ?? 0;
  let raisedBy: string | null = null;

  for (const buildingId of settlement.buildings) {
    const building = getBuildings(content).find((candidate) => candidate.id === buildingId);

    for (const effect of building?.effects ?? []) {
      if (effect.type !== "classOutput" || effect.pop !== pop || outputs.length === 0) {
        continue;
      }

      for (const [resource, base] of outputs) {
        income[resource] += working * (effect.amount - base);
      }
      perPop = effect.amount;
      raisedBy = building?.name ?? buildingId;
    }
  }

  return { perPop, raisedBy, income };
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
