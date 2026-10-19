import { describe, expect, it } from "vitest";

import { EXPEDITION_TABLES, RIOT_TABLE } from "./data";
import { rollOnTable } from "./tables";
import { fundExpedition, getFundExpeditionStatus } from "./ventures";
import { scenario } from "./testing/scenario";
import type { EventTableDefinition, HegemonyState, TableEffect } from "./types";

function opening(): HegemonyState {
  return scenario()
    .opening()
    .mutate((draft) => {
      draft.pendingPlayerEvent = null;
    })
    .build();
}

describe("the event-table component (docs/archive/plans/event-tables.md)", () => {
  it("every table is a full d6: six rows, faces 1-6, exactly once each", () => {
    for (const table of [RIOT_TABLE, ...EXPEDITION_TABLES]) {
      expect(table.rows.map((row) => row.roll).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it("rolls through the game's own rng: same seed, same roll, same record", () => {
    const run = () => {
      const G = opening();
      const { record } = rollOnTable(G, "0", EXPEDITION_TABLES[0]);
      return { ...record };
    };

    expect(run()).toEqual(run());
  });

  it("clamps modified rolls into 1-6 from both ends", () => {
    for (const modifier of [-10, 10]) {
      const G = opening();
      const { record } = rollOnTable(G, "0", EXPEDITION_TABLES[0], { modifier });
      expect(record.modified).toBe(modifier < 0 ? 1 : 6);
      expect(record.roll).toBeGreaterThanOrEqual(1);
      expect(record.roll).toBeLessThanOrEqual(6);
    }
  });

  it("stores the outcome on lastTableRoll for the UI — no re-roll needed", () => {
    const G = opening();
    const { record } = rollOnTable(G, "0", EXPEDITION_TABLES[1], { modifier: 6 });

    expect(G.lastTableRoll).toEqual(record);
    expect(record.rowLabel).toBe("An alliance of guest-friendship");
    expect(record.outcomes.length).toBeGreaterThan(0);
  });

  it("destroyBuilding falls back to pop loss so roll 1 never inverts below roll 2", () => {
    const G = opening();
    const capitalTile = G.board.tiles.find((tile) => tile.id === "-2,0")!;
    const capital = capitalTile.settlements.find((settlement) => settlement.owner === "0")!;
    expect(capital.buildings).toHaveLength(0);

    const before = capital.pops.citizens + capital.pops.freemen + capital.pops.slaves;
    // Force the roll onto row 1 (losePops 1 + destroyBuilding fallback 1).
    const { popsRemoved } = rollOnTable(G, "0", RIOT_TABLE, { modifier: -10 });

    expect(popsRemoved).toBe(2);
    expect(G.players["0"].settlements).toHaveLength(2); // settlements survive
    expect(before).toBeGreaterThan(0);
  });

  it("destroyBuilding burns a real building when one exists", () => {
    const G = opening();
    const capital = G.board.tiles
      .find((tile) => tile.id === "-2,0")!
      .settlements.find((settlement) => settlement.owner === "0")!;
    capital.buildings.push("temple");

    rollOnTable(G, "0", RIOT_TABLE, { modifier: -10 });

    expect(capital.buildings).toHaveLength(0);
    expect(G.lastTableRoll?.outcomes.join(" ")).toContain("Temple destroyed");
  });

  it("the bribe takes what gold there is, then blood for the shortfall", () => {
    const G = opening();
    G.players["0"].resources.gold = 2;
    const bribeOnly: TableEffect[] = [
      { type: "loseResource", resource: "gold", amount: 6, popLossIfShort: 1 },
    ];
    const table = {
      ...RIOT_TABLE,
      rows: RIOT_TABLE.rows.map((row) => ({ ...row, effects: bribeOnly })),
    };

    const { popsRemoved } = rollOnTable(G, "0", table);

    expect(G.players["0"].resources.gold).toBe(0);
    expect(popsRemoved).toBe(1);
  });

  it("gainPop lands in a settlement with room, or leaves the food fallback", () => {
    const G = opening();
    const voyage = EXPEDITION_TABLES.find((table) => table.id === "colonistsVoyage")!;
    const popsBefore = G.players["0"].settlements.length;

    rollOnTable(G, "0", voyage, { modifier: 6 }); // force row 6: settlers arrive
    expect(G.players["0"].popsGainedFromEvents).toBeGreaterThanOrEqual(1);

    // Now fill every settlement to capacity and roll again: food fallback.
    for (const tileId of G.players["0"].settlements) {
      const settlement = G.board.tiles
        .find((tile) => tile.id === tileId)!
        .settlements.find((candidate) => candidate.owner === "0")!;
      settlement.pops.slaves = G.ruleset.settlements[settlement.kind].popCapacity;
      settlement.pops.citizens = 0;
      settlement.pops.freemen = 0;
    }
    const food = G.players["0"].resources.food;
    rollOnTable(G, "0", voyage, { modifier: 6 });

    // Row 6 grants +2 food alongside; the blocked settler leaves +2 more.
    expect(G.players["0"].resources.food).toBe(food + 4);
    expect(popsBefore).toBe(2);
  });
});

describe("ventures (D10/Q16)", () => {
  it("posts the stake, rolls the chosen table, and burns the once-per-turn throttle", () => {
    const G = opening();
    G.players["0"].resources.gold = 10;

    expect(getFundExpeditionStatus(G, "0", "merchantConvoy").cost).toEqual({ gold: 2 });
    expect(fundExpedition(G, "0", "merchantConvoy").ok).toBe(true);

    expect(G.lastTableRoll?.tableId).toBe("merchantConvoy");
    expect(G.players["0"].ventureUsedThisTurn).toBe(true);
    expect(fundExpedition(G, "0", "grandEmbassy").ok).toBe(false);
  });

  it("refuses a wood-rich player who cannot pay the gold stake", () => {
    const G = opening();
    G.players["0"].resources.gold = 0;
    G.players["0"].resources.wood = 8;

    expect(fundExpedition(G, "0", "colonistsVoyage").ok).toBe(false);
    expect(G.players["0"].resources.wood).toBe(8);
  });

  it("uses the small payouts and a negative gold expectation", () => {
    const convoy = EXPEDITION_TABLES.find((table) => table.id === "merchantConvoy")!;
    expect(convoy.rows.map((row) => row.effects)).toEqual([
      [{ type: "none" }],
      [{ type: "none" }],
      ...[2, 2, 2, 4].map((amount) => [{ type: "gainResource", resource: "gold", amount }]),
    ]);
    const expectedGold =
      convoy.rows.reduce(
        (sum, row) =>
          sum +
          row.effects.reduce(
            (total, effect) => total + (effect.type === "gainResource" ? effect.amount : 0),
            0,
          ),
        0,
      ) / convoy.rows.length;
    expect(expectedGold).toBeLessThan(
      getFundExpeditionStatus(opening(), "0", convoy.id).cost!.gold!,
    );
    expect(
      EXPEDITION_TABLES.find((table) => table.id === "grandEmbassy")!
        .rows.slice(2)
        .map((row) => row.effects),
    ).toEqual(
      [1, 1, 2, 2].map((amount) => [{ type: "gainResource", resource: "influence", amount }]),
    );
    expect(
      EXPEDITION_TABLES.find((table) => table.id === "colonistsVoyage")!.rows[5].effects,
    ).toEqual([
      { type: "gainPop", pop: "freemen", foodFallback: 2 },
      { type: "gainResource", resource: "food", amount: 2 },
    ]);
  });
});

describe("table dice", () => {
  it("die size is table data: a d3 table never rolls above 3", () => {
    const d3: EventTableDefinition = {
      id: "riot",
      name: "Test d3",
      flavor: "",
      die: 3,
      rows: [
        { roll: 1, label: "one", effects: [{ type: "none" }] },
        { roll: 2, label: "two", effects: [{ type: "none" }] },
        { roll: 3, label: "three", effects: [{ type: "none" }] },
      ],
    };

    for (let i = 0; i < 12; i += 1) {
      const G = opening();
      G.rng = i * 7919;
      const { record } = rollOnTable(G, "0", d3, { modifier: i % 2 === 0 ? 10 : 0 });
      expect(record.roll).toBeGreaterThanOrEqual(1);
      expect(record.roll).toBeLessThanOrEqual(3);
      expect(record.modified).toBeLessThanOrEqual(3);
    }
  });
});
