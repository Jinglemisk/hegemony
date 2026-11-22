import { describe, expect, it } from "vitest";

import { closeDealsAtYearEnd, dealIncomeLines, settleDealsAtIncome } from "./deals";
import { calculateIncomeBreakdown } from "./economy/income";
import { collectInvariantViolations } from "./invariants";
import { transition } from "./legalMoves";
import type { GameCommand } from "./legalMoves";
import { luxuryHappinessBonus, releaseLuxuriesAfterPortLoss } from "./luxury";
import { portBeside, scenario } from "./testing/scenario";
import { endTurn } from "./turn";
import type { HegemonyState, PlayerId, Pops, TradeBundle, TradeTerms } from "./types";

// Standing deals (docs/plans/trade-deals.md): yearly lines settle at each seat's own
// income, a short payment waits on the partner's answer, ending runs the year out, and a
// lent good counts for its borrower while its owner keeps it.

const NONE: Pops = { citizens: 0, freemen: 0, slaves: 0 };

function side(resources: TradeBundle["resources"] = {}, more: Partial<TradeBundle> = {}) {
  return { resources, goods: [], pops: { ...NONE }, cards: 0, ...more };
}

/** Damon's turn (seat 0) with nothing pending and stocks to trade. */
function turn(): HegemonyState {
  return scenario()
    .opening()
    .withResources("0", { wood: 6, stone: 2, food: 9, gold: 6, influence: 2 })
    .withResources("1", { wood: 0, stone: 6, food: 9, gold: 5, influence: 1 })
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      draft.pendingRiot = null;
    })
    .build();
}

function act(G: HegemonyState, actor: PlayerId, command: GameCommand): HegemonyState {
  const result = transition(G.definition, G, actor, command);
  if (!result.ok) throw new Error(`${actor} ${command.type}: ${result.reasons.join(" ")}`);
  expect(collectInvariantViolations(result.state)).toEqual([]);
  // Transitions return frozen states; these tests step the turn machine by hand.
  return structuredClone(result.state);
}

function refused(G: HegemonyState, actor: PlayerId, command: GameCommand): string[] {
  const result = transition(G.definition, G, actor, command);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.reasons;
}

/** Damon offers Nikos `terms` and Nikos accepts. */
function deal(G: HegemonyState, terms: TradeTerms): HegemonyState {
  const made = act(G, "0", { type: "tradeOffer", to: ["1"], terms, places: {} });
  const id = made.offers.at(-1)!.id;
  return act(made, "1", {
    type: "tradeAnswer",
    offerId: id,
    answer: { kind: "accept", places: {} },
  });
}

/** 2 food a year from Damon for 3 stone a year from Nikos. */
const FOOD_FOR_STONE: TradeTerms = {
  give: side({}, { yearly: { food: 2 } }),
  get: side({}, { yearly: { stone: 3 } }),
};

/** The next year, before anyone has played it. */
function nextYear(G: HegemonyState) {
  G.year += 1;
  for (const player of Object.values(G.players)) player.collectedThisTurn = false;
}

/** A seat's income comes round: its deals settle. */
function income(G: HegemonyState, seat: PlayerId) {
  G.currentPlayer = seat;
  G.players[seat].collectedThisTurn = true;
  settleDealsAtIncome(G, seat);
}

const stocks = (G: HegemonyState, seat: PlayerId) => ({ ...G.players[seat].resources });

describe("yearly deals", () => {
  it("makes the year's exchange at once, and nothing more that year", () => {
    const before = turn();
    const G = deal(before, FOOD_FOR_STONE);

    expect(G.players["0"].resources.food).toBe(before.players["0"].resources.food - 2);
    expect(G.players["0"].resources.stone).toBe(before.players["0"].resources.stone + 3);
    expect(G.players["1"].resources.food).toBe(before.players["1"].resources.food + 2);
    expect(G.players["1"].resources.stone).toBe(before.players["1"].resources.stone - 3);
    expect(G.deals).toHaveLength(1);

    // Nikos plays later this year: the deal has made this year's exchange.
    const nikos = stocks(G, "1");
    expect(dealIncomeLines(G, "1")).toEqual([]);
    income(G, "1");
    expect(stocks(G, "1")).toEqual(nikos);
  });

  it("settles each seat once a year at its own income, both lines in its income", () => {
    const G = deal(turn(), FOOD_FOR_STONE);
    // Damon has collected this year, so his next income is next year's.
    expect(
      calculateIncomeBreakdown(G, "0")
        .filter((line) => line.dealId)
        .map((line) => [line.source, line.resource, line.amount]),
    ).toEqual([
      ["Deal with Nikos", "food", -2],
      ["Deal with Nikos", "stone", 3],
    ]);

    nextYear(G);
    const [damon, nikos] = [stocks(G, "0"), stocks(G, "1")];
    income(G, "0");
    expect(stocks(G, "0")).toEqual({ ...damon, food: damon.food - 2, stone: damon.stone + 3 });
    // Nikos's stock never moves on Damon's turn.
    expect(stocks(G, "1")).toEqual(nikos);
    income(G, "1");
    expect(stocks(G, "1")).toEqual({ ...nikos, food: nikos.food + 2, stone: nikos.stone - 3 });
  });

  it("pays what a short seat holds, and its partner keeps the deal or cancels it", () => {
    const G = deal(turn(), FOOD_FOR_STONE);
    nextYear(G);
    G.players["1"].resources.stone = 1;
    income(G, "1");
    expect(G.players["1"].resources.stone).toBe(0);
    expect(G.deals[0].short["1"]).toEqual({ owed: { stone: 3 }, paid: { stone: 1 } });

    // Damon's income: the deal waits on his answer, and his turn cannot end without one.
    const damon = stocks(G, "0");
    income(G, "0");
    expect(stocks(G, "0")).toEqual(damon);
    expect(calculateIncomeBreakdown(G, "0").some((line) => line.dealId)).toBe(true);
    expect(refused(G, "0", { type: "endTurn" })).toEqual(["Answer Nikos's short payment first."]);

    // Keep: he takes the 1 stone Nikos had and pays his 2 food in full.
    const kept = act(G, "0", { type: "dealShortfall", dealId: G.deals[0].id, keep: true });
    expect(stocks(kept, "0")).toEqual({ ...damon, food: damon.food - 2, stone: damon.stone + 1 });
    expect(kept.deals[0].short).toEqual({});

    // Cancel: the deal closes at once and nothing moves.
    const cancelled = act(G, "0", { type: "dealShortfall", dealId: G.deals[0].id, keep: false });
    expect(stocks(cancelled, "0")).toEqual(damon);
    expect(cancelled.deals).toEqual([]);
  });

  it("runs out the year it is ended in, then closes", () => {
    const G = deal(turn(), FOOD_FOR_STONE);
    nextYear(G);
    income(G, "0");
    const ended = act(G, "0", { type: "dealEnd", dealId: G.deals[0].id });
    expect(refused(ended, "0", { type: "dealEnd", dealId: G.deals[0].id })).toEqual([
      "This deal is already ending.",
    ]);
    // Damon has settled this year; Nikos still does, then the deal is gone.
    expect(dealIncomeLines(ended, "0")).toEqual([]);
    const nikos = stocks(ended, "1");
    income(ended, "1");
    expect(stocks(ended, "1")).toEqual({ ...nikos, food: nikos.food + 2, stone: nikos.stone - 3 });
    closeDealsAtYearEnd(ended);
    expect(ended.deals).toEqual([]);
  });

  it("refuses a yearly line its giver cannot pay now", () => {
    const G = turn();
    expect(
      refused(G, "0", {
        type: "tradeOffer",
        to: ["1"],
        terms: { give: side({ food: 5 }, { yearly: { food: 5 } }), get: side({ gold: 1 }) },
        places: {},
      }),
    ).toEqual(["Holds 9 food, not 10."]);
  });
});

describe("lent goods", () => {
  /** Damon holds a good with a Port beside it. */
  function withGood() {
    const G = turn();
    const good = G.board.luxuries[0];
    good.owner = "0";
    good.claimedAtSettlementId = portBeside(G, "0", good).id;
    return { G, good: good.id };
  }
  const per = (G: HegemonyState) => G.ruleset.economy.luxury.happinessPerGood;

  it("counts for the borrower, with no Port, while the owner keeps it out of other trades", () => {
    const { G: start, good } = withGood();
    const G = deal(start, {
      give: side({}, { lent: [good] }),
      get: side({}, { yearly: { gold: 2 } }),
    });
    expect(G.board.luxuries[0].owner).toBe("0");
    expect(luxuryHappinessBonus(G, "0")).toBe(0);
    expect(luxuryHappinessBonus(G, "1")).toBe(per(G));

    const sale: GameCommand = {
      type: "tradeOffer",
      to: ["2"],
      terms: { give: side({}, { goods: [good] }), get: side({ gold: 1 }) },
      places: {},
    };
    expect(refused(G, "0", sale)).toContain("Tyrian Dye is lent to Nikos.");

    // The owner's last Port beside it falls: the good goes back to the board, the deal ends.
    const port = portBeside(G, "0", G.board.luxuries[0]);
    port.buildings = [];
    releaseLuxuriesAfterPortLoss(G, "0", port.tileId);
    expect(G.deals).toEqual([]);
    expect(luxuryHappinessBonus(G, "1")).toBe(0);
  });

  it("lends for one turn: through the borrower's next turn, or this one when it is theirs", () => {
    const { G: start, good } = withGood();
    let G = deal(start, {
      give: side({}, { lent: [good] }),
      get: side({ gold: 2 }),
      lease: "turn",
    });
    expect(luxuryHappinessBonus(G, "1")).toBe(per(G));

    // Damon passes; the good stays through Nikos's turn and goes back at its end.
    G.pendingPlayerEvent = null;
    expect(endTurn(G).ok).toBe(true);
    expect(G.currentPlayer).toBe("1");
    expect(luxuryHappinessBonus(G, "1")).toBe(per(G));
    G.pendingPlayerEvent = null;
    G.players["1"].resources.food = 20;
    expect(endTurn(G).ok).toBe(true);
    expect(G.deals).toEqual([]);
    expect(luxuryHappinessBonus(G, "1")).toBe(0);
    expect(luxuryHappinessBonus(G, "0")).toBe(per(G));

    // Borrowed on the borrower's own turn: it goes back as that turn ends.
    G = turn();
    const nikos = G.board.luxuries[1];
    nikos.owner = "1";
    nikos.claimedAtSettlementId = portBeside(G, "1", nikos).id;
    G = deal(G, { give: side({ gold: 1 }), get: side({}, { lent: [nikos.id] }), lease: "turn" });
    expect(luxuryHappinessBonus(G, "0")).toBe(per(G));
    G.pendingPlayerEvent = null;
    expect(endTurn(G).ok).toBe(true);
    expect(G.deals).toEqual([]);
    expect(luxuryHappinessBonus(G, "0")).toBe(0);
  });
});
