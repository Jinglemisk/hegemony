import { describe, expect, it } from "vitest";

import { RIOT_TABLE } from "./data";
import { rollOnTable } from "./tables";
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
    expect(RIOT_TABLE.rows.map((row) => row.roll).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rolls through the game's own rng: same seed, same roll, same record", () => {
    const run = () => {
      const G = opening();
      const { record } = rollOnTable(G, "0", RIOT_TABLE);
      return { ...record };
    };

    expect(run()).toEqual(run());
  });

  it("clamps modified rolls into 1-6 from both ends", () => {
    for (const modifier of [-10, 10]) {
      const G = opening();
      const { record } = rollOnTable(G, "0", RIOT_TABLE, { modifier });
      expect(record.modified).toBe(modifier < 0 ? 1 : 6);
      expect(record.roll).toBeGreaterThanOrEqual(1);
      expect(record.roll).toBeLessThanOrEqual(6);
    }
  });

  it("stores the outcome on lastTableRoll for the UI — no re-roll needed", () => {
    const G = opening();
    const { record } = rollOnTable(G, "0", RIOT_TABLE, { modifier: 6 });

    expect(G.lastTableRoll).toEqual(record);
    expect(record.rowLabel).toBe("The mob disperses");
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
