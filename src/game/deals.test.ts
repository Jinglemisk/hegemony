import { describe, expect, it } from "vitest";

import { DEAL_RESOURCES, closeDealsAtYearEnd, dealIncomeLines, settleDealsAtIncome } from "./deals";
import { calculateIncomeBreakdown } from "./economy/income";
import { collectInvariantViolations } from "./invariants";
import { transition } from "./legalMoves";
import type { GameCommand } from "./legalMoves";
import { luxuryHappinessBonus, releaseLuxuriesAfterPortLoss } from "./luxury";
import { portBeside, scenario } from "./testing/scenario";
import { endTurn } from "./turn";
import type { HegemonyState, PlayerId, Pops, Resource, TradeBundle, TradeTerms } from "./types";

// Standing deals (rules.md, Standing deals): yearly lines settle at each seat's own
// income, where a seat pays its line and takes what its partner has paid; a short payment
// waits on the partner's answer, ending runs the year out, and a lent good counts for its
// borrower while its owner keeps it.

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

/** The next year, before anyone has played it, with `opener` to play first. */
function nextYear(G: HegemonyState, opener: PlayerId = "0") {
  G.year += 1;
  G.yearOpener = opener;
  for (const player of Object.values(G.players)) player.collectedThisTurn = false;
}

/** A seat's income comes round: its deals settle. */
function income(G: HegemonyState, seat: PlayerId) {
  G.currentPlayer = seat;
  G.players[seat].collectedThisTurn = true;
  settleDealsAtIncome(G, seat);
}

const stocks = (G: HegemonyState, seat: PlayerId) => ({ ...G.players[seat].resources });

/** Everything on the table: every seat's stocks, and the payments waiting on deals. A
 *  deal moves stock between seats, so nothing it does may change these totals. */
function table(G: HegemonyState) {
  const total = (resource: Resource) =>
    Object.values(G.players).reduce((sum, player) => sum + player.resources[resource], 0) +
    G.deals.reduce(
      (sum, open) =>
        sum + Object.values(open.waiting).reduce((held, line) => held + (line[resource] ?? 0), 0),
      0,
    );
  return Object.fromEntries(DEAL_RESOURCES.map((resource) => [resource, total(resource)]));
}

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

  it("settles each seat at its own income: it pays its line and takes what was paid", () => {
    const G = deal(turn(), FOOD_FOR_STONE);
    G.players["1"].resources.stone = 9;
    const start = table(G);
    // Damon has collected this year. Next year Nikos plays first, so his payment is
    // there when Damon's income comes.
    expect(
      calculateIncomeBreakdown(G, "0")
        .filter((line) => line.dealId)
        .map((line) => [line.source, line.resource, line.amount]),
    ).toEqual([
      ["Deal with Nikos", "food", -2],
      ["Deal with Nikos", "stone", 3],
    ]);

    // Damon plays first: he pays, and Nikos has paid nothing yet for him to take.
    nextYear(G, "0");
    expect(dealIncomeLines(G, "0").map((line) => [line.resource, line.amount])).toEqual([
      ["food", -2],
    ]);
    const [damon, nikos] = [stocks(G, "0"), stocks(G, "1")];
    income(G, "0");
    expect(stocks(G, "0")).toEqual({ ...damon, food: damon.food - 2 });
    // Nikos's stock never moves on Damon's turn.
    expect(stocks(G, "1")).toEqual(nikos);
    income(G, "1");
    expect(stocks(G, "1")).toEqual({ ...nikos, food: nikos.food + 2, stone: nikos.stone - 3 });
    expect(table(G)).toEqual(start);

    // Nikos plays first the year after: Damon takes both of Nikos's payments.
    nextYear(G, "1");
    income(G, "1");
    expect(stocks(G, "1")).toEqual({ ...nikos, food: nikos.food + 2, stone: nikos.stone - 6 });
    expect(dealIncomeLines(G, "0").map((line) => [line.resource, line.amount])).toEqual([
      ["food", -2],
      ["stone", 6],
    ]);
    income(G, "0");
    expect(stocks(G, "0")).toEqual({ ...damon, food: damon.food - 4, stone: damon.stone + 6 });
    expect(table(G)).toEqual(start);
  });

  it("pays what a short seat holds, and its partner keeps the deal or cancels it", () => {
    const G = deal(turn(), FOOD_FOR_STONE);
    const start = table(G);
    nextYear(G, "1");
    G.players["1"].resources.stone = 1;
    const short = table(G);
    income(G, "1");
    expect(G.players["1"].resources.stone).toBe(0);
    expect(G.deals[0].short["1"]).toEqual({ owed: { stone: 3 }, paid: { stone: 1 } });

    // Damon's income: the deal waits on his answer, and his turn cannot end without one.
    const [damon, nikos] = [stocks(G, "0"), stocks(G, "1")];
    income(G, "0");
    expect(stocks(G, "0")).toEqual(damon);
    expect(calculateIncomeBreakdown(G, "0").some((line) => line.dealId)).toBe(true);
    expect(refused(G, "0", { type: "endTurn" })).toEqual(["Answer Nikos's short payment first."]);

    // Keep: he takes the 1 stone Nikos had and pays his 2 food in full.
    const kept = act(G, "0", { type: "dealShortfall", dealId: G.deals[0].id, keep: true });
    expect(stocks(kept, "0")).toEqual({ ...damon, food: damon.food - 2, stone: damon.stone + 1 });
    expect(kept.deals[0].short).toEqual({});
    expect(table(kept)).toEqual(short);

    // Cancel: Damon has paid nothing this year, so he takes nothing and Nikos's stone
    // goes back to him at his next income. Then the deal is gone.
    const cancelled = act(G, "0", { type: "dealShortfall", dealId: G.deals[0].id, keep: false });
    expect(stocks(cancelled, "0")).toEqual(damon);
    expect(stocks(cancelled, "1")).toEqual(nikos);
    expect(cancelled.deals[0].waiting).toEqual({ "1": { stone: 1 } });
    expect(refused(cancelled, "0", { type: "dealEnd", dealId: G.deals[0].id })).toEqual([
      "This deal is already ending.",
    ]);
    nextYear(cancelled, "1");
    income(cancelled, "1");
    expect(stocks(cancelled, "1")).toEqual({ ...nikos, stone: 1 });
    expect(cancelled.deals).toEqual([]);
    expect(table(cancelled)).toEqual(short);
    expect(short).not.toEqual(start);
  });

  it("makes no stock when a seat pays nothing and its partner cancels", () => {
    // Nikos owes 3 stone a year, holds none and plays first. He took Damon's 2 food on
    // credit before this rule, and a cancel left it with him.
    const G = deal(turn(), FOOD_FOR_STONE);
    nextYear(G, "1");
    G.players["1"].resources.stone = 0;
    const before = table(G);
    const nikos = stocks(G, "1");
    income(G, "1");
    expect(stocks(G, "1")).toEqual(nikos);
    income(G, "0");
    const cancelled = act(G, "0", { type: "dealShortfall", dealId: G.deals[0].id, keep: false });
    expect(cancelled.deals).toEqual([]);
    expect(table(cancelled)).toEqual(before);
  });

  it("lets a seat that paid its side take a short payment when it cancels", () => {
    // Damon plays first and pays in full; Nikos then pays 1 stone of 3 and takes the food.
    const G = deal(turn(), FOOD_FOR_STONE);
    nextYear(G, "0");
    income(G, "0");
    G.players["1"].resources.stone = 1;
    const before = table(G);
    income(G, "1");
    nextYear(G, "0");
    const damon = stocks(G, "0");
    income(G, "0");
    const cancelled = act(G, "0", { type: "dealShortfall", dealId: G.deals[0].id, keep: false });
    expect(stocks(cancelled, "0")).toEqual({ ...damon, stone: damon.stone + 1 });
    expect(cancelled.deals).toEqual([]);
    expect(table(cancelled)).toEqual(before);
  });

  it("runs out the year it is ended in, then closes once the last payment is taken", () => {
    const G = deal(turn(), FOOD_FOR_STONE);
    const start = table(G);
    nextYear(G, "0");
    income(G, "0");
    const ended = act(G, "0", { type: "dealEnd", dealId: G.deals[0].id });
    expect(refused(ended, "0", { type: "dealEnd", dealId: G.deals[0].id })).toEqual([
      "This deal is already ending.",
    ]);
    // Damon has settled this year: his next income only takes what Nikos still pays.
    expect(dealIncomeLines(ended, "0").map((line) => [line.resource, line.amount])).toEqual([
      ["stone", 3],
    ]);
    const [damon, nikos] = [stocks(ended, "0"), stocks(ended, "1")];
    income(ended, "1");
    expect(stocks(ended, "1")).toEqual({ ...nikos, food: nikos.food + 2, stone: nikos.stone - 3 });
    closeDealsAtYearEnd(ended);
    expect(ended.deals).toHaveLength(1);
    expect(collectInvariantViolations(ended)).toEqual([]);

    nextYear(ended, "1");
    expect(collectInvariantViolations(ended)).toEqual([]);
    income(ended, "1");
    expect(stocks(ended, "1")).toEqual({ ...nikos, food: nikos.food + 2, stone: nikos.stone - 3 });
    income(ended, "0");
    expect(stocks(ended, "0")).toEqual({ ...damon, stone: damon.stone + 3 });
    expect(ended.deals).toEqual([]);
    expect(table(ended)).toEqual(start);
  });

  it("makes no stock when a short seat ends the deal before its partner is asked", () => {
    // Nikos plays first and pays in full; Damon then pays 1 food of 2 and ends the deal.
    const G = deal(turn(), FOOD_FOR_STONE);
    nextYear(G, "1");
    income(G, "1");
    G.players["0"].resources.food = 1;
    const before = table(G);
    income(G, "0");
    const ended = act(G, "0", { type: "dealEnd", dealId: G.deals[0].id });
    closeDealsAtYearEnd(ended);
    nextYear(ended, "1");
    const nikos = stocks(ended, "1");
    income(ended, "1");
    expect(stocks(ended, "1")).toEqual({ ...nikos, food: nikos.food + 1 });
    expect(ended.deals).toEqual([]);
    expect(table(ended)).toEqual(before);
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

  it("hands back a year's payment when the Port falls before its owner has settled", () => {
    const { G: start, good } = withGood();
    const G = deal(start, {
      give: side({}, { lent: [good] }),
      get: side({}, { yearly: { gold: 2 } }),
    });
    // Nikos plays first and pays the year's 2 gold; the Port falls before Damon's income.
    nextYear(G, "1");
    const before = table(G);
    const [damon, nikos] = [stocks(G, "0"), stocks(G, "1")];
    income(G, "1");
    const port = portBeside(G, "0", G.board.luxuries[0]);
    port.buildings = [];
    releaseLuxuriesAfterPortLoss(G, "0", port.tileId);
    expect(luxuryHappinessBonus(G, "1")).toBe(0);
    expect(collectInvariantViolations(G)).toEqual([]);
    income(G, "0");
    expect(stocks(G, "0")).toEqual(damon);

    nextYear(G, "1");
    income(G, "1");
    expect(stocks(G, "1")).toEqual(nikos);
    expect(G.deals).toEqual([]);
    expect(table(G)).toEqual(before);
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
