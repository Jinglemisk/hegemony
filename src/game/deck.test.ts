import { describe, expect, it } from "vitest";
import { PLAYER_EVENT_CARDS, YEAR_CARDS } from "./data";
import { drawPlayerEvent, getEventPopTargets, resolvePendingPlayerEvent } from "./events";
import { totalPops } from "./core/pops";
import { happinessLevel } from "./happiness";
import { enactForEval } from "./assembly";
import { getAuthoredResolutionCard } from "./assembly/deck";
import { collectInvariantViolations } from "./invariants";
import { enumerateLegalCommands, transition } from "./legalMoves";
import { projectForPlayer, projectForSpectator } from "./projection";
import { settlementCapacity } from "./settlement";
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
        { type: "resolveEvent", decline: true },
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
    expect(G.playerDrawPile).toEqual([]);
    expect(G.yearDrawPile).toEqual(years);
    // Nothing is left to decline: the card is gone to the discards, not the deck.
    expect(enumerateLegalCommands(G, "0").some((move) => move.type === "resolveEvent")).toBe(false);
  });

  it("skips a settlement whose last room is held by a pop on the move", () => {
    const G = game();
    const capital = owned(G, "0,0", "0");
    const effect = card("free-settlers").effects[0];
    if (effect.type !== "addPops") throw new Error("not a pop card");
    // The capital holds just the card's room.
    capital.pops.freemen +=
      settlementCapacity(capital, G) - totalPops(capital.pops) - effect.amount;
    expect(getEventPopTargets(G, "0", effect).map((target) => target.tileId)).toEqual(["0,0"]);
    G.transfers.push({
      id: "on-the-move",
      owner: "0",
      fromSettlementId: owned(G, "3,0", "0").id,
      toSettlementId: capital.id,
      fromTileId: "3,0",
      toTileId: "0,0",
      pops: { citizens: 0, freemen: 0, slaves: 1 },
    });
    expect(getEventPopTargets(G, "0", effect)).toEqual([]);
    G.playerDrawPile = [card("free-settlers")];
    drawPlayerEvent(G, "0");
    expect(G.pendingPlayerEvent).toBeNull();
    expect(G.playerDiscardPile).toEqual([card("free-settlers")]);
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

describe("declining a pop card", () => {
  const popCards = ["player-free-settlers", "player-captured-laborers"];

  it.each(popCards)("declines %s to the bottom of the player deck, for nothing", (cardId) => {
    const G = scenario().stackPlayerEvent(cardId).opening().build();
    expect(G.pendingPlayerEvent?.card.id).toBe(cardId);
    const moves = enumerateLegalCommands(G, "0");
    expect(moves.at(-1)).toEqual({ type: "resolveEvent", decline: true });
    expect(moves.slice(0, -1).every((move) => "targetTileId" in move)).toBe(true);

    const result = transition(G.definition, G, "0", { type: "resolveEvent", decline: true });
    if (!result.ok) throw new Error(result.reasons.join());
    const after = result.state;
    expect(after.pendingPlayerEvent).toBeNull();
    expect(after.playerDrawPile).toHaveLength(G.playerDrawPile.length + 1);
    expect(after.playerDrawPile.slice(0, -1)).toEqual(G.playerDrawPile);
    expect(after.playerDrawPile.at(-1)?.id).toBe(cardId);
    expect(after.playerDiscardPile).toEqual(G.playerDiscardPile);
    expect(after.players["0"].resources).toEqual(G.players["0"].resources);
    expect(after.players["0"].popsGainedFromEvents).toBe(0);
    for (const tileId of G.players["0"].settlements)
      expect(owned(after, tileId, "0").pops).toEqual(owned(G, tileId, "0").pops);
    expect(after.log.at(-1)?.message).toMatch(/declined .+\. It goes to the bottom/);
    // The deck still holds all forty cards, every copy once.
    expect(collectInvariantViolations(after, { strictCardConservation: true })).toEqual([]);
  });

  it("declines only a pop card, and never with a target", () => {
    const flat = scenario().stackPlayerEvent("player-good-stores").opening().build();
    expect(transition(flat.definition, flat, "0", { type: "resolveEvent", decline: true }).ok).toBe(
      false,
    );
    const pop = scenario().stackPlayerEvent("player-free-settlers").opening().build();
    expect(
      transition(pop.definition, pop, "0", {
        type: "resolveEvent",
        targetTileId: "-2,0",
        decline: true,
      }).ok,
    ).toBe(false);
  });

  it("names the declined card to the table and keeps the pile's order hidden", () => {
    const G = scenario().stackPlayerEvent("player-free-settlers").opening().build();
    const result = transition(G.definition, G, "0", { type: "resolveEvent", decline: true });
    if (!result.ok) throw new Error(result.reasons.join());
    const after = result.state;
    for (const view of [
      projectForPlayer(after.definition, after, "0"),
      projectForPlayer(after.definition, after, "1"),
      projectForSpectator(after.definition, after),
    ]) {
      expect(view.state.playerDrawPile).toHaveLength(after.playerDrawPile.length);
      expect(view.state.playerDrawPile.every((hidden) => hidden.id === "__hidden_event__")).toBe(
        true,
      );
      expect(view.state.log.at(-1)?.message).toContain("declined Free Settlers");
    }
  });

  it("is forced placement again with the rule switched off", () => {
    const G = scenario({ patch: { events: { optionalPops: false } } })
      .stackPlayerEvent("player-captured-laborers")
      .opening()
      .build();
    expect(enumerateLegalCommands(G, "0")).toEqual([
      { type: "resolveEvent", targetTileId: "-2,0" },
      { type: "resolveEvent", targetTileId: "3,0" },
    ]);
    expect(transition(G.definition, G, "0", { type: "resolveEvent", decline: true }).ok).toBe(
      false,
    );
  });
});
