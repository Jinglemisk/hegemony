import { describe, expect, it } from "vitest";

import { collectIncome } from "./actions";
import { applyResourceDeltaWithFloors, canAfford } from "./core/resources";
import { getPlayerEventCards } from "./content";
import { resolvePendingPlayerEvent } from "./events";
import { rollOnTable } from "./tables";
import { materialTile, scenario } from "./testing/scenario";
import type { EventTableDefinition, Resources } from "./types";

describe("configured stockpile floors", () => {
  it("clamps real income without changing the calculated food deficit", () => {
    const builder = scenario({ patch: { economy: { stockpileFloors: { food: 0 } } } });
    const G = builder.build();
    const tile = materialTile(G);
    builder
      .withSettlement("0", tile.id, "capital", { citizens: 5, freemen: 0, slaves: 0 })
      .withResources("0", { food: 1 })
      .mutate((state) => {
        state.phase = "gameplay";
        state.currentPlayer = "0";
        state.pendingPlayerEvent = null;
      });

    expect(collectIncome(G, "0").ok).toBe(true);
    expect(G.players["0"].resources.food).toBe(0);
    expect(G.log.find((entry) => entry.message.includes("collected income"))?.message).toContain(
      "-1 food",
    );
  });

  it("uses the same floor for event losses and reports the applied amount", () => {
    const G = scenario({ patch: { economy: { stockpileFloors: { wood: 2 } } } })
      .withResources("0", { wood: 3 })
      .build();
    const card = getPlayerEventCards(G.definition.content).find(
      (candidate) => candidate.id === "player-warehouse-fire",
    )!;
    G.pendingPlayerEvent = { card, playerID: "0" };

    expect(resolvePendingPlayerEvent(G, "0").ok).toBe(true);
    expect(G.players["0"].resources.wood).toBe(2);
    expect(G.log.some((entry) => entry.message.includes("-1 wood"))).toBe(true);
  });

  it("uses the configured floor when a table loss exceeds spendable stock", () => {
    const G = scenario({ patch: { economy: { stockpileFloors: { wood: 2 } } } })
      .withResources("0", { wood: 3 })
      .build();
    const table: EventTableDefinition = {
      id: "riot",
      name: "Floor test",
      flavor: "",
      die: 1,
      rows: [
        {
          roll: 1,
          label: "Loss",
          effects: [{ type: "loseResource", resource: "wood", amount: 5 }],
        },
      ],
    };

    const result = rollOnTable(G, "0", table);
    expect(G.players["0"].resources.wood).toBe(2);
    expect(result.record.outcomes).toContain("Lost 1 wood.");
  });

  it("does not floor unconfigured food or happiness and does not replace affordability", () => {
    const resources: Resources = {
      wood: 0,
      stone: 0,
      gold: 0,
      food: 1,
      influence: 0,
      happiness: 0,
    };
    const delta: Resources = {
      wood: -3,
      stone: 0,
      gold: 0,
      food: -3,
      influence: -3,
      happiness: -3,
    };
    applyResourceDeltaWithFloors(resources, delta, { wood: 0, influence: 0 });

    expect(resources).toMatchObject({ wood: 0, food: -2, influence: 0, happiness: -3 });
    expect(canAfford(resources, { wood: 1 })).toBe(false);
  });
});
