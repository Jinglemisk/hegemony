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
  Terrain,
  YearTerm,
} from "../types";
import { formatPopName } from "../core/format";
import { getTile, zeroedYearTerm } from "../core/query";
import { applyResourceDelta } from "../core/resources";
import {
  countPlayerPopType,
  settlementIdleSlaves,
  settlementIncomeSource,
  settlementWorkingSlaves,
  settlementSlaveResource,
} from "../settlement";
import type { Ruleset } from "../ruleset";
import {
  getLawIncomeContributions,
  effectiveRuleset,
  getStandingEffects,
  getStandingEffectSources,
  hasLawRule,
  type RulesSource,
} from "../assembly/laws";

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

/** Where the granary stands. Free pops eat at income, which may take food below zero.
 *  Ending the turn short, one pop leaves per missing food and food returns to zero. */
export type HungerStatus = {
  /** Food held now. Below zero only during its owner's turn. */
  stockpile: number;
  income: number;
  /** Food after the next income; below zero is a shortfall to cover on that turn. */
  projectedStockpile: number;
  /** Pops that leave if the turn ended now. */
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

/** The printed slave column on an unsettled tile, before buildings or a year card. */
export function tileSlaveColumn(G: HegemonyState, tile: HexTile) {
  const resource = settlementSlaveResource(tile, G);
  const income = popIncome("slaves", 1, resource, effectiveRuleset(G));
  return { resource, perPop: resource ? income[resource] : 0 };
}

/**
 * Net resource income a settlement prints: pop yields + building effects, before
 * the year's card. {@link settlementYieldThisYear} is what it pays this year.
 */
/** `ruleset` is REQUIRED for the same reason as {@link popIncome}: a default here
 *  lets a caller silently read the wrong ruleset. */
export function settlementNetYield(
  tile: HexTile,
  settlement: Settlement,
  sourceRules: RulesSource,
  content: GameContent = getAuthoredGameContent(),
): Resources {
  const ruleset = effectiveRuleset(sourceRules, settlement.kind);
  const income: Resources = { ...EMPTY_RESOURCES };
  const primary = settlementSlaveResource(tile, sourceRules);
  const workingSlaves = settlementWorkingSlaves(tile, settlement, sourceRules);

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
    sourceRules,
  );

  if ("activeLaws" in sourceRules) {
    for (const entry of getLawIncomeContributions(sourceRules, settlement.owner)) {
      if (entry.settlementId === settlement.id) income[entry.resource] += entry.amount;
    }
  }

  return income;
}

/** The class column each year card zeroes. A terrain card only bites on that terrain. */
const YEAR_TERM_COLUMNS: Record<
  Exclude<YearTerm, "luxuryHappiness">,
  { pop: PopType; resource: Resource; terrain?: Terrain }
> = {
  plainsFood: { pop: "slaves", resource: "food", terrain: "plains" },
  forestWood: { pop: "slaves", resource: "wood", terrain: "forest" },
  mountainStone: { pop: "slaves", resource: "stone", terrain: "mountain" },
  freemenGold: { pop: "freemen", resource: "gold" },
  citizenInfluence: { pop: "citizens", resource: "influence" },
};

/**
 * What this year's card takes from one settlement's next income: the whole of the
 * class column it zeroes, the building's raise included. Null when the card zeroes
 * nothing here, or when the owner has already collected this year: their next income
 * falls under next year's card, which nobody has seen.
 */
export function yearCardLoss(
  G: HegemonyState,
  tile: HexTile,
  settlement: Settlement,
): { pop: PopType; resource: Resource; amount: number } | null {
  const term = zeroedYearTerm(G);

  if (!term || term === "luxuryHappiness" || G.players[settlement.owner].collectedThisTurn) {
    return null;
  }

  const column = YEAR_TERM_COLUMNS[term];

  if (column.terrain && tile.terrain !== column.terrain) {
    return null;
  }

  if (column.pop === "slaves" && settlementSlaveResource(tile, G) !== column.resource) return null;
  const amount = settlementClassColumn(tile, settlement, column.pop, G, G.definition.content)
    .income[column.resource];

  return amount > 0 ? { pop: column.pop, resource: column.resource, amount } : null;
}

/** What a settlement pays at its owner's next income: what it prints, less what the
 *  year's card zeroes. */
export function settlementNextYield(
  G: HegemonyState,
  tile: HexTile,
  settlement: Settlement,
): Resources {
  const income = settlementNetYield(tile, settlement, G, G.definition.content);
  const loss = yearCardLoss(G, tile, settlement);

  if (loss) {
    income[loss.resource] -= loss.amount;
  }

  return income;
}

/** A class column at the owner's next income, with the year card applied. */
export function settlementNextClassColumn(
  G: HegemonyState,
  tile: HexTile,
  settlement: Settlement,
  pop: PopType,
) {
  const column = settlementClassColumn(tile, settlement, pop, G, G.definition.content);
  const loss = yearCardLoss(G, tile, settlement);
  const zeroed = loss?.pop === pop;
  if (zeroed) {
    column.income[loss.resource] = 0;
    column.perPop = 0;
  }
  return { ...column, zeroed };
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

  for (const tileId of G.players[playerID].settlements) {
    const tile = getTile(G, tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

    if (!tile || !settlement) {
      continue;
    }

    const ruleset = effectiveRuleset(G, settlement.kind);
    const coeff = (pop: PopType, resource: Resource) => ruleset.popIncome[pop].flat[resource] ?? 0;
    const settlementLabel = settlementIncomeSource(tile, settlement);
    const primary = settlementSlaveResource(tile, G);
    const workingSlaves = settlementWorkingSlaves(tile, settlement, G);
    const idleSlaves = settlementIdleSlaves(tile, settlement, G);

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
      G,
    );

    // The year's card takes its whole term back as one line that names the card.
    const loss = yearCardLoss(G, tile, settlement);
    if (loss) {
      addIncomeContribution(contributions, income, {
        resource: loss.resource,
        amount: -loss.amount,
        source: settlementLabel,
        settlementId: settlement.id,
        detail: `${G.activeYearCard?.name}: ${G.activeYearCard?.text}`,
      });
    }
  }

  // Standing Laws land AFTER the settlement, building and year-card passes: a
  // Law is a patch over the ruleset, and the surplus-conversion effect (a tariff on
  // the harvest) can only be assessed once the harvest is known.
  applyStandingLawIncomeEffects(G, playerID, contributions, income);

  for (const source of getStandingEffectSources(G, playerID)) {
    for (const effect of source.effects)
      if (effect.type === "realmIncome")
        addIncomeContribution(contributions, income, {
          resource: effect.resource,
          amount: effect.amount,
          source: source.label,
          detail: "National Idea",
        });
  }
  return contributions;
}

/** Pops that leave if `playerID` ended the turn now: one per missing food. */
export function unfedAtTurnEnd(G: HegemonyState, playerID: PlayerId): number {
  // Only free pops eat, so only they can go unfed; a shortfall deeper than their
  // number (a Law taking food) still ends at zero food.
  const mouths = (["freemen", "citizens"] as const).reduce(
    (sum, pop) =>
      sum +
      ((effectiveRuleset(G).popIncome[pop].flat.food ?? 0) < 0
        ? countPlayerPopType(G, playerID, pop)
        : 0),
    0,
  );
  return Math.min(mouths, Math.max(0, -G.players[playerID].resources.food));
}

export function getHungerStatus(
  G: HegemonyState,
  playerID: PlayerId,
  foodIncome: number,
): HungerStatus {
  const stockpile = G.players[playerID].resources.food;

  return {
    stockpile,
    income: foodIncome,
    // A shortfall is settled at turn end, so the next income starts from zero at worst.
    projectedStockpile: Math.max(0, stockpile) + foodIncome,
    unfed: unfedAtTurnEnd(G, playerID),
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
  for (const contribution of getLawIncomeContributions(G, playerID)) {
    addIncomeContribution(contributions, income, {
      resource: contribution.resource,
      amount: contribution.amount,
      source: contribution.label,
      settlementId: contribution.settlementId,
      detail: "Standing law",
    });
  }
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
  sourceRules: RulesSource,
) {
  for (const buildingId of settlement.buildings) {
    if (buildingId === "marketplace" && hasLawRule(sourceRules, "grainLevy")) continue;
    const building = getBuildings(content).find((candidate) => candidate.id === buildingId);

    if ("activeLaws" in sourceRules) {
      for (const effect of getStandingEffects(sourceRules, settlement.owner)) {
        if (effect.type === "buildingFood" && effect.building === buildingId)
          addIncomeContribution(contributions, income, {
            resource: "food",
            amount: effect.amount,
            source: settlementLabel,
            settlementId: settlement.id,
            detail: "Sacred Fields: Temple food",
          });
      }
    }

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
          amount: pops * Math.max(0, effect.amount - base),
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
  sourceRules: RulesSource,
  content: GameContent = getAuthoredGameContent(),
): { perPop: number; raisedBy: string | null; income: Resources } {
  const ruleset = effectiveRuleset(sourceRules, settlement.kind);
  const primary = settlementSlaveResource(tile, sourceRules);
  const working =
    pop === "slaves"
      ? settlementWorkingSlaves(tile, settlement, sourceRules)
      : settlement.pops[pop];
  const income = popIncome(pop, settlement.pops[pop], primary, ruleset, working);
  const outputs = classOutputs(pop, primary, ruleset);
  let perPop = outputs[0]?.[1] ?? 0;
  let raisedBy: string | null = null;

  for (const buildingId of settlement.buildings) {
    if (buildingId === "marketplace" && hasLawRule(sourceRules, "grainLevy")) continue;
    const building = getBuildings(content).find((candidate) => candidate.id === buildingId);

    for (const effect of building?.effects ?? []) {
      if (effect.type !== "classOutput" || effect.pop !== pop || outputs.length === 0) {
        continue;
      }

      if (outputs.length === 0) continue;
      for (const [resource, base] of outputs) {
        income[resource] += working * Math.max(0, effect.amount - base);
      }
      if (effect.amount > perPop) {
        perPop = effect.amount;
        raisedBy = building?.name ?? buildingId;
      }
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
