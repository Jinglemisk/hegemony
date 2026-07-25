import { describe, expect, it } from "vitest";

import {
  EXPEDITION_TABLES,
  OMEN_TABLE,
  PLAYER_EVENT_CARDS,
  RIOT_TABLE,
  SEASONAL_EVENT_CARDS,
} from "../game/data";
import { calculateIncomeBreakdown } from "../game/economy/income";
import { drawSeasonalEvent, getEventEffectChoices } from "../game/events";
import { scenario } from "../game/testing/scenario";
import type { EventCard, HegemonyState, PlayerId } from "../game/types";
import { presentEventEffects, presentTableEffect } from "../ui/effects";

function customSeasonalCard(
  id: string,
  timing: EventCard["timing"],
  effects: EventCard["effects"],
): EventCard {
  return {
    id,
    deck: "seasonal",
    name: id,
    count: 1,
    text: id,
    timing,
    effects,
  };
}

function seasonalContribution(
  G: HegemonyState,
  playerID: PlayerId,
  source: string,
  resource: "gold" | "happiness",
) {
  return calculateIncomeBreakdown(G, playerID)
    .filter((line) => line.source === source && line.resource === resource)
    .reduce((total, line) => total + line.amount, 0);
}

describe("backend-to-backend parity", () => {
  it("binds immediate active-player seasonal effects to the seat that revealed them", () => {
    const G = scenario().build();
    const card = customSeasonalCard("Active Windfall", "immediate", [
      { type: "resourceDelta", scope: "activePlayer", resource: "gold", amount: 3 },
    ]);
    G.currentPlayer = "2";
    G.seasonalDrawPile = [card];
    const before = Object.fromEntries(
      Object.entries(G.players).map(([playerID, player]) => [playerID, player.resources.gold]),
    );

    drawSeasonalEvent(G);

    expect(G.activeSeasonEvent?.playerID).toBe("2");
    expect(G.players["2"].resources.gold).toBe(before["2"] + 3);
    expect(G.players["0"].resources.gold).toBe(before["0"]);
    expect(G.players["1"].resources.gold).toBe(before["1"]);
    expect(G.players["3"].resources.gold).toBe(before["3"]);
  });

  it("keeps season-long active-player income scoped to the revealing seat", () => {
    const G = scenario().build();
    const card = customSeasonalCard("Active Markets", "season", [
      {
        type: "incomeModifier",
        scope: "activePlayer",
        resource: "gold",
        amount: 5,
        duration: "season",
      },
    ]);
    G.currentPlayer = "1";
    G.seasonalDrawPile = [card];

    drawSeasonalEvent(G);

    expect(seasonalContribution(G, "1", card.name, "gold")).toBe(5);
    expect(seasonalContribution(G, "0", card.name, "gold")).toBe(0);
    expect(seasonalContribution(G, "2", card.name, "gold")).toBe(0);
    expect(seasonalContribution(G, "3", card.name, "gold")).toBe(0);
  });
});

describe("frontend-to-frontend parity", () => {
  it("presents every event-card option through one non-empty effect vocabulary", () => {
    for (const card of [...SEASONAL_EVENT_CARDS, ...PLAYER_EVENT_CARDS]) {
      for (const effects of getEventEffectChoices(card)) {
        const presentation = presentEventEffects(effects);
        expect(presentation.text.trim(), card.id).not.toBe("");
        expect(["positive", "negative", "muted", "neutral"], card.id).toContain(presentation.tone);
      }
    }
  });

  it("presents every table effect through the same text-and-tone contract", () => {
    const tables = [RIOT_TABLE, ...EXPEDITION_TABLES, OMEN_TABLE];

    for (const table of tables) {
      for (const row of table.rows) {
        for (const effect of row.effects) {
          const presentation = presentTableEffect(effect);
          expect(presentation.text.trim(), `${table.id} roll ${row.roll}`).not.toBe("");
          expect(
            ["positive", "negative", "muted", "neutral"],
            `${table.id} roll ${row.roll}`,
          ).toContain(presentation.tone);
        }
      }
    }
  });
});
