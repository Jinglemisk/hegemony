import { describe, expect, it } from "vitest";
import {
  EXPEDITION_TABLES,
  OMEN_TABLE,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  SEASONAL_EVENT_CARDS,
} from "../game/data";
import type { EventEffect, TableEffect } from "../game/types";
import { presentEventEffect, presentTableEffect } from "./effects";

/**
 * The presenter split (parity theme 4) added `magnitude` / `subject` /
 * `condition` / `turns` beside the flat `text`, so a ceremony can carve the
 * number and demote the words around it.
 *
 * `text` is the contract with roughly a dozen existing callers — ledger rows,
 * chips, tooltips, the sim's log formatter — none of which were touched. These
 * pins are here so the split can never quietly reword one of them: every
 * sentence below is the string the presenter produced BEFORE the split.
 */
describe("the flat sentence survives the split", () => {
  const eventCases: Array<[EventEffect, string]> = [
    [{ type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: -3 }, "-3 Gold"],
    [
      {
        type: "scaledResourceDelta",
        scope: "activePlayer",
        resource: "food",
        amountPerPops: 2,
        popStep: 3,
        minimum: 1,
      },
      "+2 Food per 3 pops",
    ],
    [{ type: "happinessDelta", scope: "activePlayer", amount: 2 }, "+2 Happiness"],
    [
      {
        type: "scaledHappinessDelta",
        scope: "allPlayers",
        amountPerPops: -1,
        popStep: 4,
        minimumMagnitude: 1,
      },
      "-1 Happiness per 4 pops",
    ],
    [
      { type: "timedHappinessDelta", scope: "activePlayer", amountPerTurn: -2, turns: 3 },
      "-2 Happiness per turn for 3 turns",
    ],
    [
      {
        type: "incomeModifier",
        scope: "activePlayer",
        resource: "wood",
        amount: 1,
        duration: "season",
      },
      "+1 Wood income",
    ],
    [
      { type: "buildingCostMultiplier", multiplier: 2, duration: "season", excludes: [] },
      "Double building costs this season",
    ],
    [
      { type: "addPops", pop: "citizens", amount: 1, target: "ownedSettlementWithCapacity" },
      "Add 1 citizen",
    ],
    [
      {
        type: "actionCostDiscount",
        action: "growPop",
        pop: "citizens",
        resource: "food",
        amount: 5,
        duration: "turn",
        consume: "nextMatchingAction",
      },
      "Next citizen grown: -5 Food",
    ],
    [
      { type: "resourceExchange", from: "wood", to: "gold", maxAmount: 4, ratio: 1 },
      "Exchange up to 4 Wood for 4 Gold",
    ],
    [
      {
        type: "resourceDeltaPerPop",
        scope: "activePlayer",
        resource: "gold",
        pop: "freemen",
        amountPerPop: 1,
        minimum: 2,
      },
      "+1 Gold per freeman, minimum 2",
    ],
    [{ type: "choice", options: [] }, "Choose one option"],
  ];

  const tableCases: Array<[TableEffect, string]> = [
    [{ type: "none" }, "—"],
    [{ type: "losePops", count: 1 }, "-1 pop"],
    [{ type: "losePops", count: 2 }, "-2 pops"],
    [{ type: "loseResource", resource: "gold", amount: 3 }, "-3 Gold"],
    [
      { type: "loseResource", resource: "food", amount: 4, popLossIfShort: 1 },
      "-4 Food (short: -1 pop)",
    ],
    [{ type: "destroyBuilding", popLossFallback: 1 }, "-1 building"],
    [{ type: "gainResource", resource: "gold", amount: 9 }, "+9 Gold"],
    [{ type: "gainPop", pop: "slaves", foodFallback: 2 }, "+1 slave"],
    [{ type: "yearIncomeModifier", resource: "food", amount: -1 }, "-1 Food income, all year"],
  ];

  it.each(eventCases)("presents %o as its unchanged sentence", (effect, text) => {
    expect(presentEventEffect(effect).text).toBe(text);
  });

  it.each(tableCases)("presents %o as its unchanged sentence", (effect, text) => {
    expect(presentTableEffect(effect).text).toBe(text);
  });
});

describe("the carved parts are drawn from that same sentence", () => {
  const authoredEventEffects = flatten(
    [...SEASONAL_EVENT_CARDS, ...PLAYER_EVENT_CARDS].flatMap((card) => card.effects),
  );
  const authoredTableEffects = [RIOT_TABLE, ...EXPEDITION_TABLES, OMEN_TABLE].flatMap((table) =>
    table.rows.flatMap((row) => row.effects),
  );

  /**
   * The one invariant that keeps a ceremony honest: a carved numeral or subject
   * must be something the flat sentence also says. If they could disagree, the
   * blow band and the ledger row would be reporting different games.
   */
  it("never carves a figure or a subject the sentence does not contain", () => {
    const presented = [
      ...authoredEventEffects.map((effect) => presentEventEffect(effect)),
      ...authoredTableEffects.map((effect) => presentTableEffect(effect)),
    ];

    for (const effect of presented) {
      if (effect.magnitude) {
        expect(effect.text, effect.text).toContain(effect.magnitude.replace(/^[+-]/, ""));
      }
      if (effect.subject) {
        expect(effect.text, effect.text).toContain(effect.subject);
      }
    }
  });

  it("carries a turn count only where the effect is actually timed", () => {
    for (const effect of authoredEventEffects) {
      const turns = presentEventEffect(effect).turns;

      if (effect.type === "timedHappinessDelta") {
        expect(turns, effect.type).toBe(effect.turns);
      } else {
        expect(turns, effect.type).toBeUndefined();
      }
    }
  });
});

/** `choice` nests options; the presenters see the flattened list everywhere else. */
function flatten(effects: readonly EventEffect[]): EventEffect[] {
  return effects.flatMap((effect) =>
    effect.type === "choice" ? [effect, ...flatten(effect.options.flat())] : [effect],
  );
}
