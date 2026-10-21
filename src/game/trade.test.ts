import { describe, expect, it } from "vitest";

import { outOfTurnActors } from "./actors";
import { baseVoteWeight, openAssembly } from "./assembly/assembly";
import { TEST_OPENING_SETUP } from "./config";
import { PLAYER_IDS } from "./data";
import { standingHappiness } from "./happiness";
import { collectInvariantViolations } from "./invariants";
import { enumerateLegalCommands, transition } from "./legalMoves";
import type { GameCommand } from "./legalMoves";
import { luxuryHappinessBonus } from "./luxury";
import { projectForPlayer } from "./projection";
import { settlementCapacity } from "./settlement";
import { owned, scenario } from "./testing/scenario";
import { TRADE_RESOURCES } from "./trade";
import { titleHolders } from "./victory";
import { calculateIncome } from "./economy/income";
import { realmPops } from "./core/query";
import type { HegemonyState, PlayerId, Pops, TradeBundle, TradeTerms } from "./types";

// Player trade, PR 1 (docs/plans/player-trade.md): offers to the table or named seats,
// answers out of turn, and one settlement that rechecks both sides and moves everything.

const NONE: Pops = { citizens: 0, freemen: 0, slaves: 0 };
const capital = (seat: PlayerId) => TEST_OPENING_SETUP[Number(seat)].capital.tileId;
const colony = (seat: PlayerId) => TEST_OPENING_SETUP[Number(seat)].colony.tileId;

function side(resources: TradeBundle["resources"] = {}, more: Partial<TradeBundle> = {}) {
  return { resources, goods: [], pops: { ...NONE }, ...more };
}
function terms(give: TradeBundle, get: TradeBundle): TradeTerms {
  return { give, get };
}

/** Seat 0's turn with nothing pending and stocks to trade. */
function turn(): HegemonyState {
  const G = scenario()
    .opening()
    .withResources("0", { wood: 6, stone: 2, food: 4, gold: 3, influence: 2 })
    .withResources("1", { wood: 0, stone: 4, food: 6, gold: 5, influence: 1 })
    .withResources("2", { wood: 1, stone: 1, food: 2, gold: 2, influence: 3 })
    .withResources("3", { wood: 2, stone: 0, food: 0, gold: 1, influence: 0 })
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
      draft.pendingRiot = null;
    })
    .build();
  expect(G.currentPlayer).toBe("0");
  return G;
}

function act(G: HegemonyState, actor: PlayerId, command: GameCommand): HegemonyState {
  const result = transition(G.definition, G, actor, command);
  expect(result.ok, `${actor} ${JSON.stringify(command)}: ${result.ok ? "" : result.reasons}`).toBe(
    true,
  );
  if (!result.ok) throw new Error(result.reasons.join(" "));
  return result.state;
}

function refused(G: HegemonyState, actor: PlayerId, command: GameCommand): string[] {
  const result = transition(G.definition, G, actor, command);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.reasons;
}

function offer(G: HegemonyState, actor: PlayerId, t: TradeTerms, to: PlayerId[] = []) {
  const next = act(G, actor, { type: "tradeOffer", to, terms: t });
  return { G: next, id: next.offers.at(-1)!.id };
}

function tableTotals(G: HegemonyState) {
  return Object.fromEntries(
    TRADE_RESOURCES.map((resource) => [
      resource,
      PLAYER_IDS.reduce((sum, seat) => sum + G.players[seat].resources[resource], 0),
    ]),
  );
}

function tablePops(G: HegemonyState) {
  return PLAYER_IDS.reduce((sum, seat) => {
    const pops = realmPops(G, seat);
    return sum + pops.citizens + pops.freemen + pops.slaves;
  }, 0);
}

describe("player trade", () => {
  it("settles atomically: exactly the named stocks move and every table total holds", () => {
    let G = turn();
    const before = tableTotals(G);
    const made = offer(G, "0", terms(side({ wood: 2 }), side({ food: 1, gold: 1 })));
    G = made.G;
    expect(G.offers[0]).toMatchObject({ from: "0", to: ["1", "2", "3"], toTable: true });

    G = act(G, "1", {
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "accept", places: {} },
    });
    G = act(G, "0", { type: "tradeSettle", offerId: made.id, partner: "1", places: {} });

    expect(G.players["0"].resources).toMatchObject({ wood: 4, food: 5, gold: 4 });
    expect(G.players["1"].resources).toMatchObject({ wood: 2, food: 5, gold: 4 });
    expect(G.players["2"].resources).toMatchObject({ wood: 1, food: 2, gold: 2 });
    expect(tableTotals(G)).toEqual(before);
    expect(G.offers).toEqual([]);
    expect(G.log.at(-1)?.moment).toMatchObject({ kind: "trade", from: "0", partner: "1" });
    expect(collectInvariantViolations(G)).toEqual([]);
  });

  it("lets nobody give what it does not hold, so a seat short of food gives no food", () => {
    const G = turn();
    // Short of food after income: the seat can take food but give none.
    G.players["0"].resources.food = -2;
    expect(
      refused(G, "0", {
        type: "tradeOffer",
        to: [],
        terms: terms(side({ food: 1 }), side({ wood: 1 })),
      }),
    ).toContain("Holds 0 food, not 1.");
    const made = offer(G, "0", terms(side({ stone: 2 }), side({ food: 2 })));
    // Seat 3 holds no food: it cannot accept, though it may decline.
    expect(
      refused(made.G, "3", {
        type: "tradeAnswer",
        offerId: made.id,
        answer: { kind: "accept", places: {} },
      }),
    ).toContain("Holds 0 food, not 2.");
    const settled = act(
      act(made.G, "2", {
        type: "tradeAnswer",
        offerId: made.id,
        answer: { kind: "accept", places: {} },
      }),
      "0",
      { type: "tradeSettle", offerId: made.id, partner: "2", places: {} },
    );
    expect(settled.players["0"].resources.food).toBe(0);
    expect(settled.players["2"].resources.food).toBe(0);
  });

  it("moves each good's happiness, and Beloved, with the goods", () => {
    let G = turn();
    // Three goods lift seat 0 from the opening's level to Beloved's minimum and past it.
    const goods = G.board.luxuries.slice(0, 3);
    for (const good of goods) {
      good.owner = "0";
      good.claimedAtSettlementId = owned(G, capital("0"), "0").id;
    }
    expect(titleHolders(G).beloved).toBe("0");
    const per = G.ruleset.economy.luxury.happinessPerGood;
    const levels = { "0": standingHappiness(G, "0"), "1": standingHappiness(G, "1") };

    const ids = goods.map((good) => good.id);
    const made = offer(G, "0", terms(side({}, { goods: ids }), side({ gold: 5 })), ["1"]);
    G = act(made.G, "1", {
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "accept", places: {} },
    });
    G = act(G, "0", { type: "tradeSettle", offerId: made.id, partner: "1", places: {} });

    expect(G.board.luxuries.slice(0, 3).map((good) => good.owner)).toEqual(["1", "1", "1"]);
    expect(luxuryHappinessBonus(G, "0")).toBe(0);
    expect(luxuryHappinessBonus(G, "1")).toBe(3 * per);
    expect(standingHappiness(G, "0")).toBe(levels["0"] - 3 * per);
    expect(standingHappiness(G, "1")).toBe(levels["1"] + 3 * per);
    expect(titleHolders(G).beloved).toBe("1");
  });

  it("rechecks at settlement when two open offers spend the same goods", () => {
    let G = turn();
    const first = offer(G, "0", terms(side({ wood: 6 }), side({ stone: 2 })));
    const second = offer(first.G, "0", terms(side({ wood: 6 }), side({ gold: 2 })));
    G = second.G;
    G = act(G, "1", {
      type: "tradeAnswer",
      offerId: first.id,
      answer: { kind: "accept", places: {} },
    });
    G = act(G, "2", {
      type: "tradeAnswer",
      offerId: second.id,
      answer: { kind: "accept", places: {} },
    });

    G = act(G, "0", { type: "tradeSettle", offerId: first.id, partner: "1", places: {} });
    expect(
      refused(G, "0", { type: "tradeSettle", offerId: second.id, partner: "2", places: {} }),
    ).toContain("Holds 0 wood, not 6.");
    // The second offer stands, to its own recheck; withdrawing closes it.
    expect(G.offers.map((open) => open.id)).toEqual([second.id]);
    G = act(G, "0", { type: "tradeWithdraw", offerId: second.id });
    expect(G.offers).toEqual([]);
  });

  it("lets only the named seats answer, out of turn and only with an answer", () => {
    const made = offer(turn(), "0", terms(side({ wood: 1 }), side({ stone: 1 })), ["2"]);
    const G = made.G;
    expect(G.offers[0]).toMatchObject({ to: ["2"], toTable: false });
    // Every seat sees it.
    expect(projectForPlayer(G.definition, G, "3").state.offers).toHaveLength(1);
    expect(outOfTurnActors(G)).toEqual([{ seat: "2", commands: ["tradeAnswer"] }]);

    expect(
      refused(G, "1", { type: "tradeAnswer", offerId: made.id, answer: { kind: "decline" } }),
    ).toEqual(["This player is not an eligible actor."]);
    expect(refused(G, "2", { type: "endTurn" })).toEqual(["This player is not an eligible actor."]);
    expect(enumerateLegalCommands(G, "2")).toEqual([
      { type: "tradeAnswer", offerId: made.id, answer: { kind: "accept", places: {} } },
      { type: "tradeAnswer", offerId: made.id, answer: { kind: "decline" } },
    ]);
    expect(enumerateLegalCommands(G, "1")).toEqual([]);

    const answered = act(G, "2", {
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "decline" },
    });
    expect(outOfTurnActors(answered)).toEqual([]);
    expect(
      refused(answered, "2", {
        type: "tradeAnswer",
        offerId: made.id,
        answer: { kind: "decline" },
      }),
    ).toEqual(["This player is not an eligible actor."]);
  });

  it("settles a counter on the counter's terms", () => {
    let G = turn();
    const made = offer(G, "0", terms(side({ wood: 2 }), side({ stone: 2 })));
    const counter = terms(side({ wood: 3 }), side({ stone: 2 }));
    G = act(made.G, "1", {
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "counter", terms: counter, places: {} },
    });
    G = act(G, "0", { type: "tradeSettle", offerId: made.id, partner: "1", places: {} });
    expect(G.players["0"].resources).toMatchObject({ wood: 3, stone: 4 });
    expect(G.players["1"].resources).toMatchObject({ wood: 3, stone: 2 });
  });

  it("refuses pops with no room at the receiving settlement, counting pops on the way", () => {
    const G = turn();
    const target = owned(G, capital("1"), "1");
    // The capital has room for one more, and a pop already on its way takes it.
    target.pops = { citizens: 1, freemen: settlementCapacity(target, G) - 2, slaves: 0 };
    owned(G, colony("1"), "1").pops = {
      ...NONE,
      freemen: settlementCapacity(owned(G, colony("1"), "1"), G),
    };
    G.transfers.push({
      id: "transfer-rigged",
      owner: "1",
      fromSettlementId: owned(G, colony("1"), "1").id,
      toSettlementId: target.id,
      fromTileId: colony("1"),
      toTileId: capital("1"),
      pops: { ...NONE, freemen: 1 },
    });

    const made = offer(
      G,
      "0",
      terms(side({}, { pops: { ...NONE, slaves: 1 } }), side({ gold: 2 })),
    );
    const accept = (to: string): GameCommand => ({
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "accept", places: { to } },
    });
    expect(refused(made.G, "1", accept(capital("1")))).toContain("No room there for the pops.");
    expect(refused(made.G, "1", accept(colony("1")))).toContain("No room there for the pops.");
    expect(
      enumerateLegalCommands(made.G, "1").filter((command) => command.type === "tradeAnswer"),
    ).toEqual([{ type: "tradeAnswer", offerId: made.id, answer: { kind: "decline" } }]);
  });

  it("sends a slave's unrest and a citizen's vote with them at once", () => {
    let G = turn();
    const giver = owned(G, capital("0"), "0");
    giver.pops = { citizens: 2, freemen: 0, slaves: 2 };
    const room = owned(G, colony("1"), "1");
    room.pops = { ...NONE, freemen: 1 };
    const pops = { citizens: 1, freemen: 0, slaves: 2 };
    const before = {
      votes: [baseVoteWeight(G, "0"), baseVoteWeight(G, "1")],
      happiness: [standingHappiness(G, "0"), standingHappiness(G, "1")],
      pops: tablePops(G),
    };

    const made = offer(G, "0", terms(side({}, { pops }), side({ gold: 3 })), ["1"]);
    G = act(made.G, "1", {
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "accept", places: { to: colony("1") } },
    });
    expect(
      refused(G, "0", { type: "tradeSettle", offerId: made.id, partner: "1", places: {} }),
    ).toContain("Name the settlement the pops leave.");
    G = act(G, "0", {
      type: "tradeSettle",
      offerId: made.id,
      partner: "1",
      places: { from: capital("0") },
    });

    // They leave at once, on the move under their new owner.
    expect(owned(G, capital("0"), "0").pops).toEqual({ citizens: 1, freemen: 0, slaves: 0 });
    expect(G.transfers.at(-1)).toMatchObject({
      owner: "1",
      giver: "0",
      toTileId: colony("1"),
      pops,
    });
    expect(tablePops(G)).toBe(before.pops);
    // The citizen votes for its new owner, and the slaves' unrest is the new owner's.
    expect([baseVoteWeight(G, "0"), baseVoteWeight(G, "1")]).toEqual([
      before.votes[0] - 1,
      before.votes[1] + 1,
    ]);
    expect(standingHappiness(G, "0")).toBeGreaterThan(before.happiness[0]);
    expect(standingHappiness(G, "1")).toBeLessThan(before.happiness[1]);
    expect(collectInvariantViolations(G)).toEqual([]);

    // They arrive as their owner's turn opens.
    G = act(G, "0", { type: "endTurn" });
    expect(G.currentPlayer).toBe("1");
    expect(owned(G, colony("1"), "1").pops).toEqual({ citizens: 1, freemen: 1, slaves: 2 });
  });

  it("has the new owner feed a traded citizen, and the giver no longer", () => {
    let G = turn();
    owned(G, capital("0"), "0").pops.citizens = 2;
    const food = { giver: calculateIncome(G, "0").food, receiver: calculateIncome(G, "1").food };

    const made = offer(
      G,
      "0",
      terms(side({}, { pops: { ...NONE, citizens: 1 } }), side({ gold: 1 })),
      ["1"],
    );
    G = act(made.G, "1", {
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "accept", places: { to: colony("1") } },
    });
    G = act(G, "0", {
      type: "tradeSettle",
      offerId: made.id,
      partner: "1",
      places: { from: capital("0") },
    });
    expect(calculateIncome(G, "0").food).toBe(food.giver + 1);

    G = act(G, "0", { type: "endTurn" });
    expect(calculateIncome(G, "1").food).toBe(food.receiver - 1);
  });

  it("closes a turn's open offers when it ends", () => {
    const made = offer(turn(), "0", terms(side({ wood: 1 }), side({ stone: 1 })));
    const G = act(made.G, "0", { type: "endTurn" });
    expect(G.offers).toEqual([]);
  });

  it("keeps trade out of a game that turns it off", () => {
    const G = scenario({ patch: { trade: { enabled: false } } })
      .opening()
      .withResources("0", { wood: 2 })
      .mutate((draft) => {
        draft.pendingPlayerEvent = null;
      })
      .build();
    expect(
      refused(G, "0", {
        type: "tradeOffer",
        to: [],
        terms: terms(side({ wood: 1 }), side({ stone: 1 })),
      }),
    ).toContain("Trade is off in this game.");
  });
});

describe("trade in the Assembly's preparation", () => {
  function preparation(): HegemonyState {
    const G = turn();
    G.year = 2;
    openAssembly(G, "0");
    return G;
  }

  /** Every seat still to seal holds its peace. */
  function sealAll(G: HegemonyState) {
    for (const seat of PLAYER_IDS) G = act(G, seat, { type: "assemblyPass" });
    return G;
  }

  it("lets any seat offer until it is Ready, then closes open offers as the ballots begin", () => {
    let G = preparation();
    // A seat offers before it seals, and another answers.
    const made = offer(G, "2", terms(side({ influence: 2 }), side({ gold: 2 })), ["1"]);
    G = sealAll(made.G);
    for (const seat of ["0", "2", "3"] as const) G = act(G, seat, { type: "assemblyReady" });

    // A Ready seat makes no new offer, but still answers and settles.
    expect(
      refused(G, "2", {
        type: "tradeOffer",
        to: [],
        terms: terms(side({ gold: 1 }), side({ wood: 1 })),
      }),
    ).toEqual(["This player is not an eligible actor."]);
    expect(outOfTurnActors(G)).toEqual([{ seat: "2", commands: ["tradeSettle", "tradeWithdraw"] }]);
    const another = offer(G, "1", terms(side({ gold: 1 }), side({ wood: 1 })), ["0"]);
    G = another.G;
    G = act(G, "0", { type: "tradeAnswer", offerId: another.id, answer: { kind: "decline" } });

    expect(G.offers).toHaveLength(2);
    G = act(G, "1", { type: "assemblyReady" });
    expect(G.offers).toEqual([]);
    expect(G.assembly?.phase).toBe("closing");
  });

  it("counts a citizen traded in the preparation as its new owner's vote", () => {
    let G = preparation();
    owned(G, capital("1"), "1").pops.citizens = 2;
    owned(G, colony("0"), "0").pops = { ...NONE, freemen: 1 };
    const votes = [baseVoteWeight(G, "0"), baseVoteWeight(G, "1")];

    const made = offer(
      G,
      "1",
      terms(side({}, { pops: { ...NONE, citizens: 1 } }), side({ gold: 2 })),
      ["0"],
    );
    G = act(made.G, "0", {
      type: "tradeAnswer",
      offerId: made.id,
      answer: { kind: "accept", places: { to: colony("0") } },
    });
    G = act(G, "1", {
      type: "tradeSettle",
      offerId: made.id,
      partner: "0",
      places: { from: capital("1") },
    });
    expect([baseVoteWeight(G, "0"), baseVoteWeight(G, "1")]).toEqual([votes[0] + 1, votes[1] - 1]);

    // On the ballot the citizen's vote is cast by the new owner.
    const card = G.politicianDecks.demosthenes[0];
    G = act(G, "0", { type: "assemblyDraw", politician: "demosthenes" });
    expect(G.assembly?.held["0"]?.card.id).toBe(card);
    G = act(G, "0", { type: "assemblyPropose" });
    for (const seat of ["1", "2", "3"] as const) G = act(G, seat, { type: "assemblyPass" });
    for (const seat of PLAYER_IDS) G = act(G, seat, { type: "assemblyReady" });
    expect(G.assembly?.phase).toBe("voting");
    while (G.assembly?.phase === "voting") {
      const voter = G.assembly.activePlayer;
      G = act(G, voter, { type: "assemblyVote", yea: true });
    }
    const cast = Object.fromEntries(
      G.assembly!.results[0].votes.map((vote) => [vote.playerID, vote.weight]),
    );
    expect([cast["0"], cast["1"]]).toEqual([votes[0] + 1, votes[1] - 1]);
  });
});
