import { describe, expect, it } from "vitest";

import {
  applyUnrestTokenChange,
  applyUnrestAtTurnEnd,
  drawPlayerEvent,
  getAddPopsEffect,
  getEventPopTargetTileIds,
  happinessContributions,
  happinessLevel,
  resolvePendingPlayerEvent,
  standingHappiness,
  totalPops,
  unrestStatus,
} from "./rules";
import { PLAYER_EVENT_CARDS } from "./data";
import { createGame } from "./turn";
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

    expect(G.pendingRiot).toEqual({ playerID: "0", boughtInsurance: [] });
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
