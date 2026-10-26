import { describe, expect, it } from "vitest";
import {
  settlementClassColumn,
  settlementNetYield,
  tileSlaveColumn,
} from "../../../game/economy/income";
import { happinessLevel } from "../../../game/happiness";
import { claimableLuxuriesAt } from "../../../game/luxury";
import { scenario } from "../../../game/testing/scenario";
import { unrestOutcome, unrestStatus } from "../../../game/unrest";
import { publicCensus } from "../../../ui/frameSelectors";
import { settlementNames } from "../../../ui/settlementNames";
import { layoutMap } from "./layout";
import { boardShape, mapModel, shapeKey } from "./mapModel";

describe("the map modes", () => {
  it("show the engine's numbers: the ledger's yields, the realms' levels, the open goods", () => {
    const G = structuredClone(scenario().opening().build());
    // An Estate raises a worked town's slave column; Unrest tokens push one realm past
    // the riot line.
    const worked = G.board.tiles.find((t) => t.resource && t.settlements[0]?.pops.slaves)!;
    worked.settlements[0].buildings.push("estate");
    const rioter = G.players["2"];
    rioter.unrestTokens = 9;
    const model = mapModel(G, boardShape(shapeKey(G.board.tiles)), settlementNames(G.board.tiles));

    for (const tile of G.board.tiles) {
      const drawn = model.tiles.find((t) => t.id === tile.id)!;
      // Economy: an open tile's slave column, each settlement's net and slot yield.
      expect(drawn.perSlave).toBe(tileSlaveColumn(G, tile).perPop);
      for (const s of tile.settlements) {
        const card = drawn.settlements.find((d) => d.id === s.id)!;
        expect(card.net).toEqual(settlementNetYield(tile, s, G));
        if (drawn.resource)
          expect(card.worksFor).toBe(
            settlementClassColumn(tile, s, "slaves", G).income[drawn.resource],
          );
      }
      // Trade: the goods a Port here would take, said.
      expect(drawn.labels.trade.includes("a Port here would claim")).toBe(
        claimableLuxuriesAt(G, tile.id).length > 0,
      );
    }
    const estate = model.tiles.find((t) => t.id === worked.id)!.settlements[0];
    expect(estate.worked).toBeGreaterThan(0);
    // The slot yield checked above is the raised column.
    expect(settlementClassColumn(worked, worked.settlements[0], "slaves", G).raisedBy).not.toBe(
      null,
    );
    expect(model.tiles.find((t) => t.id === worked.id)!.labels.economy).toContain(
      `${estate.name} makes`,
    );

    // Political and Unrest: each realm's counts, level and tier, and the riot it is at.
    for (const realm of model.realms) {
      expect(realm.census).toEqual(publicCensus(G, realm.owner));
      expect(realm.happiness).toBe(happinessLevel(G, realm.owner));
      expect(realm.tier).toBe(unrestStatus(G, realm.owner).tier);
      expect(realm.riot ?? "none").toBe(unrestOutcome(G, realm.owner).tier);
    }
    expect(model.realms.find((r) => r.owner === "2")!.riot).not.toBeNull();

    // The rioting realm's cities burn torches and smoke; the others' hearths smoke.
    const layout = layoutMap(model, G.seed);
    const cities = (owner: string) =>
      model.tiles.filter((t) =>
        t.settlements.some((s) => s.owner === owner && s.kind !== "colony"),
      );
    expect(layout.riots).toHaveLength(cities("2").length);
    expect(layout.models.torch).toHaveLength(2 * cities("2").length);
    expect(layout.hearths).toHaveLength(["0", "1", "3"].flatMap(cities).length);
  });
});
