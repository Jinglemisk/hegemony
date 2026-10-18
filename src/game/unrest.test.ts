import { describe, expect, it } from "vitest";

import {
  applyUnrestTokenChange,
  applyUnrestAtTurnEnd,
  drawPlayerEvent,
  getAddPopsEffect,
  getEventPopTargetTileIds,
  happinessContributions,
  happinessLevel,
  movePops,
  resolvePendingPlayerEvent,
  standingHappiness,
  totalPops,
  turnEndUnrest,
  unfedAtTurnEnd,
  unrestStatus,
} from "./rules";
import { baseVoteWeight } from "./assembly";
import { PLAYER_EVENT_CARDS } from "./data";
import { resolveHunger } from "./hunger";
import { createGame, endTurn } from "./turn";
import { victoryMetricValue } from "./victory";
import type { HegemonyState, PlayerId, Pops, Settlement } from "./types";

// Opt into the scripted 4-player two-city opening (dev preload, off by default), so
// every player starts in gameplay with two cities already placed.
const SEED = 0xc0ffee;
const preloadedGame = (seed: number) => createGame(seed, undefined, "classic", true);

function ownedSettlements(G: HegemonyState, id: PlayerId): Settlement[] {
  return G.players[id].settlements.map((tileId) => {
    const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
    const settlement = tile?.settlements.find((candidate) => candidate.owner === id);
    if (!settlement) throw new Error(`no ${id} settlement on ${tileId}`);
    return settlement;
  });
}

function playerPopTotal(G: HegemonyState, id: PlayerId): number {
  return ownedSettlements(G, id).reduce((sum, settlement) => sum + totalPops(settlement.pops), 0);
}

/** Overwrite a player's two settlements' pops (metropolis first, then founding colony). */
function setPops(G: HegemonyState, id: PlayerId, capital: Pops, colony: Pops) {
  const [first, second] = ownedSettlements(G, id);
  first.pops = { ...capital };
  if (second) second.pops = { ...colony };
}

const NONE: Pops = { citizens: 0, freemen: 0, slaves: 0 };

describe("the happiness level", () => {
  it("is read off the board: Temples up, half the slaves and every token down", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 0, slaves: 3 }, { citizens: 0, freemen: 0, slaves: 2 });
    ownedSettlements(G, "0")[0].buildings = ["temple"];
    G.players["0"].unrestTokens = 1;

    // +1 Temple, −2 for five slaves (the odd one is free), −1 token.
    expect(happinessLevel(G, "0")).toBe(-2);
    expect(happinessContributions(G, "0").map((term) => [term.id, term.amount])).toEqual([
      ["temples", 1],
      ["luxuries", 0],
      ["slaves", -2],
      ["tokens", -1],
      ["calm", 0],
    ]);
  });

  it("does not move on its own: the same board gives the same level next turn", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 0, slaves: 4 }, NONE);

    applyUnrestAtTurnEnd(G, "0");
    applyUnrestAtTurnEnd(G, "0");

    expect(happinessLevel(G, "0")).toBe(-2);
    expect(G.pendingRiot).toBeNull();
  });

  it("counts calm for the year it was bought and leaves it out of Beloved", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 0, slaves: 6 }, NONE);
    G.players["0"].calmActive = true;

    expect(happinessLevel(G, "0")).toBe(-1);
    expect(standingHappiness(G, "0")).toBe(-3);

    // Calm counts at turn end in the same year; the year boundary expires it.
    applyUnrestAtTurnEnd(G, "0");
    expect(G.pendingRiot).toBeNull();
    expect(happinessLevel(G, "0")).toBe(-1);
  });

  it("places one token and clears one without going below zero", () => {
    const G = preloadedGame(SEED);

    applyUnrestTokenChange(G, "0", "placeOne");
    applyUnrestTokenChange(G, "0", "placeOne");
    expect(G.players["0"].unrestTokens).toBe(2);

    applyUnrestTokenChange(G, "0", "clearOne");
    expect(G.players["0"].unrestTokens).toBe(1);
    applyUnrestTokenChange(G, "0", "clearOne");
    applyUnrestTokenChange(G, "0", "clearOne");
    expect(G.players["0"].unrestTokens).toBe(0);
  });
});

describe("turn-end unrest", () => {
  it("at −3 clears the tokens and parks a riot, removing nobody until the roll", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 3, freemen: 3, slaves: 0 }, NONE);
    G.players["0"].unrestTokens = 3;

    const before = playerPopTotal(G, "0");
    applyUnrestAtTurnEnd(G, "0");

    expect(G.pendingRiot).toEqual({
      playerID: "0",
      boughtInsurance: [],
      tokensCleared: 3,
      concessionTileId: null,
    });
    expect(playerPopTotal(G, "0")).toBe(before);
    expect(G.players["0"].unrestTokens).toBe(0);
    expect(happinessLevel(G, "0")).toBe(0);
  });

  it("at −6 revolts: half the slaves leave, the tokens clear, nothing is rolled", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 1, slaves: 5 }, { citizens: 0, freemen: 0, slaves: 4 });
    G.players["0"].unrestTokens = 2;
    const rng = G.rng;

    // −4 for nine slaves, −2 tokens.
    expect(happinessLevel(G, "0")).toBe(-6);
    applyUnrestAtTurnEnd(G, "0");

    expect(G.pendingRiot).toBeNull();
    expect(G.rng).toBe(rng);
    expect(ownedSettlements(G, "0").map((settlement) => settlement.pops.slaves)).toEqual([2, 3]);
    expect(G.players["0"]).toMatchObject({ unrestTokens: 0, popsLostToUnrest: 4, revolts: 1 });
    expect(playerPopTotal(G, "0")).toBe(7);
    // The Chronicle line carries the revolt for the seat's card and the rivals' toast.
    const [capital, colony] = ownedSettlements(G, "0");
    expect(G.log.at(-1)?.moment).toEqual({
      kind: "revolt",
      slaves: 9,
      left: [
        { tileId: capital.tileId, pop: "slaves" },
        { tileId: capital.tileId, pop: "slaves" },
        { tileId: colony.tileId, pop: "slaves" },
        { tileId: capital.tileId, pop: "slaves" },
      ],
      tokensCleared: 2,
      level: happinessLevel(G, "0"),
    });
  });
});

describe("pops on the move", () => {
  it("still count for the level: moving a slave off the riot line avoids nothing", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 0, slaves: 5 }, { citizens: 0, freemen: 0, slaves: 1 });
    G.pendingPlayerEvent = null;
    G.players["0"].resources.food = 10;
    const [capital, colony] = ownedSettlements(G, "0");

    expect(happinessLevel(G, "0")).toBe(-3);
    expect(movePops(G, "0", capital.tileId, colony.tileId, { ...NONE, slaves: 1 }).ok).toBe(true);

    // Five stand and one is on the road: the realm still holds six.
    expect(capital.pops.slaves + colony.pops.slaves).toBe(5);
    expect(happinessContributions(G, "0").find((term) => term.id === "slaves")).toEqual({
      id: "slaves",
      amount: -3,
      detail: "6 slaves (1 on the move)",
    });
    expect(endTurn(G).ok).toBe(true);
    expect(G.pendingRiot).toMatchObject({ playerID: "0" });
  });

  it("still count for the titles and the vote, but hunger cannot take them", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 2, freemen: 1, slaves: 0 }, NONE);
    G.pendingPlayerEvent = null;
    G.players["0"].resources.food = 10;
    const [capital, colony] = ownedSettlements(G, "0");
    const before = {
      pops: victoryMetricValue(G, "0", "pops"),
      citizens: victoryMetricValue(G, "0", "citizens"),
      votes: baseVoteWeight(G, "0"),
    };

    expect(movePops(G, "0", capital.tileId, colony.tileId, { ...NONE, citizens: 1 }).ok).toBe(true);
    expect({
      pops: victoryMetricValue(G, "0", "pops"),
      citizens: victoryMetricValue(G, "0", "citizens"),
      votes: baseVoteWeight(G, "0"),
    }).toEqual(before);

    // Three food short with two mouths standing: two leave, and the turn can end.
    G.players["0"].resources.food = -3;
    expect(unfedAtTurnEnd(G, "0")).toBe(2);
    expect(endTurn(G).ok).toBe(true);
    expect(
      resolveHunger(G, "0", [
        { tileId: capital.tileId, pop: "freemen" },
        { tileId: capital.tileId, pop: "citizens" },
      ]).ok,
    ).toBe(true);
    expect(G.currentPlayer).toBe("1");
  });

  it("count toward a revolt's half, which is taken from the settlements", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 0, slaves: 12 }, NONE);
    G.pendingPlayerEvent = null;
    G.players["0"].resources.food = 10;
    const [capital, colony] = ownedSettlements(G, "0");
    expect(movePops(G, "0", capital.tileId, colony.tileId, { ...NONE, slaves: 1 }).ok).toBe(true);

    // Twelve slaves, one of them on the road: six leave the eleven that stand.
    expect(turnEndUnrest(structuredClone(G), "0")).toMatchObject({
      outcome: "revolt",
      slaves: 12,
      leaving: 6,
    });
    applyUnrestAtTurnEnd(G, "0");
    expect(capital.pops.slaves).toBe(5);
    expect(G.transfers).toHaveLength(1);
  });
});

describe("the end-turn confirm", () => {
  it("names the outcome and offers only a calm that changes it", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 1, slaves: 0 }, NONE);
    G.pendingPlayerEvent = null;
    G.players["0"].resources.gold = 2;
    G.players["0"].resources.influence = 0;

    G.players["0"].unrestTokens = 2;
    expect(turnEndUnrest(G, "0")).toBeNull();

    // At −3, calm (+2) holds the line.
    G.players["0"].unrestTokens = 3;
    expect(turnEndUnrest(G, "0")).toMatchObject({
      outcome: "riot",
      level: -3,
      calm: { payment: "gold", cost: { gold: 2 }, level: -1, outcome: "none" },
    });

    // At −6 it lifts to −4: a riot instead of a revolt.
    G.players["0"].unrestTokens = 6;
    expect(turnEndUnrest(G, "0")).toMatchObject({
      outcome: "revolt",
      calm: { level: -4, outcome: "riot" },
    });

    // At −8 calm changes nothing, so it is not offered.
    G.players["0"].unrestTokens = 8;
    expect(turnEndUnrest(G, "0")?.calm).toBeNull();
  });
});

describe("unrest status (ledger warning)", () => {
  it("classifies the level's tier and riot risk", () => {
    const G = preloadedGame(SEED);
    setPops(G, "0", { citizens: 1, freemen: 0, slaves: 0 }, NONE);

    expect(unrestStatus(G, "0").tier).toBe("calm");

    G.players["0"].unrestTokens = 2;
    expect(unrestStatus(G, "0")).toMatchObject({ tier: "discontent", riotAtRisk: false });

    G.players["0"].unrestTokens = 3;
    expect(unrestStatus(G, "0")).toMatchObject({ tier: "unrest", riotAtRisk: true, tokens: 3 });

    G.players["0"].unrestTokens = 6;
    expect(unrestStatus(G, "0")).toMatchObject({ tier: "revolt", riotAtRisk: true });
  });
});

describe("pops gained from events (ledger tally)", () => {
  it("counts inorganic pops added by an addPops card", () => {
    const G = preloadedGame(SEED);
    const card = PLAYER_EVENT_CARDS.find((candidate) => candidate.id === "player-free-settlers")!;
    G.playerDrawPile.unshift(card);
    G.pendingPlayerEvent = null;

    drawPlayerEvent(G, "0");
    const effect = getAddPopsEffect(card.effects)!;
    const target = getEventPopTargetTileIds(G, "0", effect)[0];
    const before = G.players["0"].popsGainedFromEvents;

    const result = resolvePendingPlayerEvent(G, "0", target);

    expect(result.ok).toBe(true);
    expect(G.players["0"].popsGainedFromEvents).toBe(before + effect.amount);
  });
});
