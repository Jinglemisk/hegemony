import { describe, expect, it } from "vitest";
import { PLAYER_EVENT_CARDS, YEAR_CARDS } from "./data";
import { drawPlayerEvent, getEventPopTargets, resolvePendingPlayerEvent } from "./events";
import { happinessLevel } from "./happiness";
import { enactForEval } from "./assembly";
import { getAuthoredResolutionCard } from "./assembly/deck";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { revealYearCard } from "./year";
import { owned, scenario } from "./testing/scenario";
import type { EventCard } from "./types";

function card(id: string): EventCard {
  return PLAYER_EVENT_CARDS.find((entry) => entry.id === `player-${id}`)!;
}

function game() {
  return scenario()
    .withSettlement("0", "0,0", "capital", { citizens: 1, freemen: 1, slaves: 0 })
    .withSettlement("0", "3,0", "colony", { citizens: 0, freemen: 0, slaves: 4 })
    .withSettlement("1", "-2,0", "capital", { citizens: 1, freemen: 0, slaves: 0 })
    .mutate((G) => {
      G.phase = "gameplay";
      G.currentPlayer = "0";
      G.activeYearCard = null;
    })
    .build();
}

describe("the year deck", () => {
  it("is fourteen cards in the paper's mix", () => {
    expect(Object.fromEntries(YEAR_CARDS.map((entry) => [entry.name, entry.count]))).toEqual({
      Drought: 2,
      Wildfire: 2,
      "Silent Mines": 1,
      Piracy: 2,
      Ostracism: 2,
      Blockade: 1,
      Plague: 2,
      Festival: 2,
    });
    expect(YEAR_CARDS.reduce((sum, entry) => sum + entry.count, 0)).toBe(14);
  });
});

describe("v2 player deck", () => {
  it("has the paper's twelve kinds and forty explicit copies", () => {
    expect(
      Object.fromEntries(PLAYER_EVENT_CARDS.map((entry) => [entry.name, entry.count])),
    ).toEqual({
      "Good Stores": 4,
      Timber: 4,
      Shipment: 4,
      Profit: 4,
      Patronage: 4,
      "Free Settlers": 3,
      "Captured Laborers": 3,
      Rats: 3,
      Bandits: 3,
      Fire: 3,
      "Local Unrest": 3,
      "Public Calm": 2,
    });
    expect(PLAYER_EVENT_CARDS.reduce((sum, entry) => sum + entry.count, 0)).toBe(40);
    expect(PLAYER_EVENT_CARDS.every((entry) => entry.effects.length === 1)).toBe(true);
    expect(new Set(PLAYER_EVENT_CARDS.map((entry) => entry.effects[0].type))).toEqual(
      new Set(["resourceDelta", "addPops", "unrestTokens"]),
    );
  });

  it("pays flat gains and floors each harm at the held stock", () => {
    for (const [id, resource] of [
      ["good-stores", "food"],
      ["timber", "wood"],
      ["shipment", "stone"],
      ["profit", "gold"],
      ["patronage", "influence"],
    ] as const) {
      const G = game();
      const before = G.players["0"].resources[resource];
      G.pendingPlayerEvent = { card: card(id), playerID: "0" };
      expect(resolvePendingPlayerEvent(G, "0").ok).toBe(true);
      expect(G.players["0"].resources[resource]).toBe(before + 2);
    }
    for (const [id, resource] of [
      ["rats", "food"],
      ["bandits", "gold"],
      ["fire", "wood"],
    ] as const) {
      const G = game();
      G.players["0"].resources[resource] = 1;
      G.pendingPlayerEvent = { card: card(id), playerID: "0" };
      expect(resolvePendingPlayerEvent(G, "0").ok).toBe(true);
      expect(G.players["0"].resources[resource]).toBe(0);
    }
  });

  it("places only slaves or freemen in an owned settlement with room, through legal commands", () => {
    for (const [id, pop] of [
      ["free-settlers", "freemen"],
      ["captured-laborers", "slaves"],
    ] as const) {
      const G = game();
      G.playerDrawPile = [card(id)];
      drawPlayerEvent(G, "0");
      expect(enumerateLegalCommands(G, "0")).toEqual([
        { type: "resolveEvent", targetTileId: "0,0" },
      ]);
      expect(resolvePendingPlayerEvent(G, "1", "-2,0").ok).toBe(false);
      expect(resolvePendingPlayerEvent(G, "0", "3,0").ok).toBe(false);
      expect(resolvePendingPlayerEvent(G, "0", "-2,0").ok).toBe(false);
      const before = owned(G, "0,0", "0").pops[pop];
      const result = transition(G.definition, G, "0", {
        type: "resolveEvent",
        targetTileId: "0,0",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(owned(result.state, "0,0", "0").pops[pop]).toBe(before + 1);
      expect(owned(result.state, "0,0", "0").pops.citizens).toBe(1);
      expect(result.state.players["0"].popsGainedFromEvents).toBe(1);
      expect(result.state.pendingPlayerEvent).toBeNull();
      const effect = card(id).effects[0];
      if (effect.type !== "addPops") throw new Error("not a pop card");
      expect(getEventPopTargets(G, "0", effect)).toEqual([
        { tileId: "0,0", filled: 2, capacity: 8, room: 6 },
      ]);
    }
  });

  it("discards a pop card when no settlement has room and reshuffles only the player deck", () => {
    const G = game();
    owned(G, "0,0", "0").pops.freemen = 7;
    G.playerDrawPile = [];
    G.playerDiscardPile = [card("free-settlers")];
    const years = structuredClone(G.yearDrawPile);
    drawPlayerEvent(G, "0");
    expect(G.pendingPlayerEvent).toBeNull();
    expect(G.lastPlayerEvent?.id).toBe("player-free-settlers");
    expect(G.playerDiscardPile).toEqual([card("free-settlers")]);
    expect(G.yearDrawPile).toEqual(years);
  });

  it("token cards place one, clear one and clear all through their real paths", () => {
    const G = game();
    G.players["0"].unrestTokens = 1;
    const level = happinessLevel(G, "0");
    G.pendingPlayerEvent = { card: card("local-unrest"), playerID: "0" };
    expect(resolvePendingPlayerEvent(G, "0").ok).toBe(true);
    expect(G.players["0"].unrestTokens).toBe(2);
    expect(happinessLevel(G, "0")).toBe(level - 1);
    G.pendingPlayerEvent = { card: card("public-calm"), playerID: "0" };
    resolvePendingPlayerEvent(G, "0");
    expect(G.players["0"].unrestTokens).toBe(1);
    const directive = getAuthoredResolutionCard("the-streets-burn")!;
    enactForEval(G, { kind: "enact", card: directive, proposer: "1", target: "0" });
    expect(G.players["0"].unrestTokens).toBe(2);
    expect(G.players["1"].unrestTokens).toBe(0);
    G.yearDrawPile = YEAR_CARDS.filter((entry) => entry.name === "Plague");
    revealYearCard(G);
    expect(Object.values(G.players).map((player) => player.unrestTokens)).toEqual([3, 1, 1, 1]);
    G.yearDrawPile = YEAR_CARDS.filter((entry) => entry.name === "Festival");
    revealYearCard(G);
    expect(Object.values(G.players).map((player) => player.unrestTokens)).toEqual([0, 0, 0, 0]);
    G.pendingPlayerEvent = { card: card("public-calm"), playerID: "0" };
    resolvePendingPlayerEvent(G, "0");
    expect(G.players["0"].unrestTokens).toBe(0);
  });
});
