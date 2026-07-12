import { describe, expect, it } from "vitest";

import {
  applyUnrestUpkeep,
  calculateIncome,
  drawPlayerEvent,
  getAddPopsEffect,
  getEventPopTargetTileIds,
  resolvePendingPlayerEvent,
  totalPops,
  unrestStatus
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

describe("unrest upkeep", () => {
  it("parks a mild riot at the -5 threshold instead of removing pops (D9)", () => {
    const G = preloadedGame(SEED);
    // Grace on -> the food-deficit path is skipped, isolating the threshold.
    G.players["0"].hasCollectedGameplayIncome = false;
    setPops(G, "0", { citizens: 3, freemen: 3, slaves: 3 }, { citizens: 0, freemen: 0, slaves: 3 });
    G.players["0"].resources.happiness = -5;

    const before = playerPopTotal(G, "0");
    applyUnrestUpkeep(G, "0");

    // The riot table replaces the old flat removal: nothing is lost until the roll.
    expect(G.pendingRiot).toMatchObject({ playerID: "0", tier: "unrest", boughtInsurance: [] });
    expect(playerPopTotal(G, "0")).toBe(before);
    expect(G.players["0"].resources.happiness).toBe(-5);
  });

  it("parks a severe riot (revolt) at the -10 threshold — the rebound waits for the roll", () => {
    const G = preloadedGame(SEED);
    G.players["0"].hasCollectedGameplayIncome = false;
    setPops(G, "0", { citizens: 3, freemen: 3, slaves: 3 }, { citizens: 0, freemen: 0, slaves: 3 });
    G.players["0"].resources.happiness = -12;

    applyUnrestUpkeep(G, "0");

    expect(G.pendingRiot).toMatchObject({ playerID: "0", tier: "revolt" });
    expect(G.players["0"].resources.happiness).toBe(-12);
  });

  it("starves a pop after two consecutive food-deficit turns, then resets the counter", () => {
    const G = preloadedGame(SEED);
    // Grace off; huge citizen upkeep guarantees a deep food deficit regardless of tiles.
    G.players["0"].hasCollectedGameplayIncome = true;
    G.players["0"].resources.happiness = 0; // keep thresholds out of it
    setPops(G, "0", { citizens: 8, freemen: 0, slaves: 0 }, NONE);
    G.players["0"].consecutiveFoodDeficitTurns = 1;
    expect(calculateIncome(G, "0").food).toBeLessThanOrEqual(-2);

    const before = playerPopTotal(G, "0");
    applyUnrestUpkeep(G, "0");

    expect(playerPopTotal(G, "0")).toBe(before - 1);
    expect(G.players["0"].consecutiveFoodDeficitTurns).toBe(0);
  });

  it("resets the deficit counter on a non-deficit turn (no pop lost)", () => {
    const G = preloadedGame(SEED);
    G.players["0"].hasCollectedGameplayIncome = true;
    G.players["0"].resources.happiness = 0;
    setPops(G, "0", { citizens: 0, freemen: 1, slaves: 0 }, NONE); // -1 food > -2 threshold
    G.players["0"].consecutiveFoodDeficitTurns = 1;
    expect(calculateIncome(G, "0").food).toBeGreaterThan(-2);

    const before = playerPopTotal(G, "0");
    applyUnrestUpkeep(G, "0");

    expect(G.players["0"].consecutiveFoodDeficitTurns).toBe(0);
    expect(playerPopTotal(G, "0")).toBe(before);
  });

  it("applies a timed happiness modifier each turn, then expires it", () => {
    const G = preloadedGame(SEED);
    G.players["0"].hasCollectedGameplayIncome = false; // isolate from the food path
    setPops(G, "0", { citizens: 3, freemen: 0, slaves: 0 }, NONE);
    G.players["0"].resources.happiness = 0;
    // -1/turn for 3 turns keeps happiness above the -5 threshold throughout.
    G.players["0"].timedHappinessModifiers = [{ amountPerTurn: -1, turnsRemaining: 3, source: "Civil Discord" }];

    applyUnrestUpkeep(G, "0");
    expect(G.players["0"].resources.happiness).toBe(-1);
    applyUnrestUpkeep(G, "0");
    expect(G.players["0"].resources.happiness).toBe(-2);
    applyUnrestUpkeep(G, "0");
    expect(G.players["0"].resources.happiness).toBe(-3);
    expect(G.players["0"].timedHappinessModifiers).toHaveLength(0);

    // Expired: a fourth upkeep no longer moves happiness.
    applyUnrestUpkeep(G, "0");
    expect(G.players["0"].resources.happiness).toBe(-3);
  });

  it("does not drift happiness toward zero on its own", () => {
    const G = preloadedGame(SEED);
    G.players["0"].hasCollectedGameplayIncome = false;
    setPops(G, "0", { citizens: 1, freemen: 0, slaves: 0 }, NONE);
    G.players["0"].resources.happiness = -3; // above the -5 threshold, no active cause

    applyUnrestUpkeep(G, "0");

    expect(G.players["0"].resources.happiness).toBe(-3);
  });
});

describe("unrest status (ledger warning)", () => {
  it("classifies the happiness tier and riot risk", () => {
    const G = preloadedGame(SEED);

    G.players["0"].resources.happiness = 3;
    expect(unrestStatus(G, "0").tier).toBe("calm");

    G.players["0"].resources.happiness = -2;
    expect(unrestStatus(G, "0")).toMatchObject({ tier: "discontent", riotAtRisk: false });

    G.players["0"].resources.happiness = -5;
    expect(unrestStatus(G, "0")).toMatchObject({ tier: "unrest", riotAtRisk: true });

    G.players["0"].resources.happiness = -10;
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
