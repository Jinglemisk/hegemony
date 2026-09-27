import { describe, expect, it } from "vitest";

import { getTurnAdvisory } from "./advisory";
import { scenario } from "./testing/scenario";

describe("turn advisory", () => {
  it("reports blockers, economic harm, and available actions without mutating state", () => {
    const G = scenario().opening().withResources("0", "wealthy").build();
    G.pendingPlayerEvent = { card: G.playerDrawPile[0], playerID: "0" };
    G.players["0"].resources.happiness = -1;
    const snapshot = JSON.stringify(G);

    const blocked = getTurnAdvisory(G, "0");

    expect(blocked.canCommit).toBe(false);
    expect(blocked.items.map((item) => item.id)).toContain("event");
    expect(JSON.stringify(G)).toBe(snapshot);

    G.pendingPlayerEvent = null;
    const playableSnapshot = JSON.stringify(G);
    const ids = getTurnAdvisory(G, "0").items.map((item) => item.id);

    expect(ids).toContain("calm");
    expect(ids).toContain("ladder");
    expect(ids).toContain("venture");
    expect(JSON.stringify(G)).toBe(playableSnapshot);
  });

  it("warns when a rival already holds enough cards to win at their next dawn", () => {
    const G = scenario()
      .opening()
      .withSettlement("1", "0,0", "city", { citizens: 6, freemen: 4, slaves: 0 })
      .withSettlement("1", "1,-2", "city", { citizens: 0, freemen: 0, slaves: 0 })
      .withHappiness("1", 12)
      .build();
    G.pendingPlayerEvent = null;

    const threat = getTurnAdvisory(G, "0").items.find((item) => item.id === "victory-threat");

    expect(threat?.tone).toBe("warning");
    expect(threat?.detail).toContain(G.players["1"].name);
  });
});
