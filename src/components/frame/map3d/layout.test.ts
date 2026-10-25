import { CatmullRomCurve3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { PLAYER_IDS } from "../../../game/data";
import { hexDistance } from "../../../game/mapTopology";
import { boardRulesetPatch } from "../../../game/ruleset";
import { scenario } from "../../../game/testing/scenario";
import type { HegemonyState, HexTile } from "../../../game/types";
import { createSimRng, deriveBotSeed } from "../../../sim/rng";
import { buildNewGame } from "../../../sim/setup";
import { settlementNames } from "../../../ui/settlementNames";
import { layoutMap } from "./layout";
import type { Layout, ModelName, Place } from "./layout";
import { boardShape, mapModel, shapeKey } from "./mapModel";

const DECOR: ModelName[] = ["olive", "cypress", "pine", "outcrop", "looseRock", "boulder", "scrub"];
const FIELDS = [0, 1, 2, 3, 4, 5].map((i) => `field${i}` as ModelName);

describe("the living map's layout", () => {
  const G = scenario().opening().build();
  const shape = boardShape(shapeKey(G.board.tiles));
  const layOut = (state: HegemonyState, seed = state.seed) =>
    layoutMap(mapModel(state, shape, settlementNames(state.board.tiles)), seed);
  /** The trees, rocks and fields standing on one tile. */
  const decorOn = (layout: Layout, tileId: string) => {
    const cell = shape.cells.find((c) => c.id === tileId)!;
    const nearest = (p: Place) =>
      shape.cells.reduce((a, b) =>
        Math.hypot(b.x - p.x, b.y - p.z) < Math.hypot(a.x - p.x, a.y - p.z) ? b : a,
      );
    return [...DECOR, ...FIELDS].flatMap((name) =>
      (layout.models[name] ?? [])
        .filter((p) => nearest(p) === cell)
        .map((p) => `${name}@${p.x.toFixed(4)},${p.z.toFixed(4)}:${(p.sx ?? 1).toFixed(4)}`),
    );
  };

  it("draws the same state the same way, and a building only clears its own tile", () => {
    const first = layOut(G);
    // Made again from nothing (another seed empties the cache): the same placements.
    expect(layOut(G, G.seed + 1).models).not.toEqual(first.models);
    expect(layOut(G)).toEqual(first);

    // A Temple rises in a city on worked land.
    const city = G.board.tiles.find(
      (t) => t.settlements.some((s) => s.kind === "city") && t.resource,
    )!;
    const after = structuredClone(G);
    after.board.tiles.find((t) => t.id === city.id)!.settlements[0].buildings.push("temple");
    const next = layOut(after);

    // Every other tile keeps every tree, rock and field where it stood.
    for (const tile of G.board.tiles.filter((t) => t.id !== city.id)) {
      expect(decorOn(next, tile.id)).toEqual(decorOn(first, tile.id));
    }
    // On its own tile the town takes ground: some decor goes, and what survives has
    // not moved.
    const before = decorOn(first, city.id);
    const survivors = decorOn(next, city.id);
    expect(survivors.length).toBeLessThan(before.length);
    expect(before).toEqual(expect.arrayContaining(survivors));
    expect(next.models.temple).toHaveLength((first.models.temple?.length ?? 0) + 1);
  });

  it("keeps slaves off the buildings' lots, and each Port on its own town's coast", () => {
    const busy = structuredClone(G);
    // Every worked town holds all five buildings, with room and slaves to spare.
    for (const t of busy.board.tiles.filter((t) => t.resource && t.settlements.length === 1)) {
      const [s] = t.settlements;
      s.buildings = ["temple", "marketplace", "estate", "granary", "forum"];
      t.slots = 8;
      s.pops.slaves = 3;
    }
    // Two colonies share a coast with open sea on both halves, each with a Port.
    const coast = busy.board.tiles.find((t) => {
      const sides = shape.cells.find((c) => c.id === t.id)!.seaSides;
      return (
        !t.settlements.length &&
        [0, 1, 5].some((i) => sides.includes(i)) &&
        [2, 3, 4].some((i) => sides.includes(i))
      );
    })!;
    for (const owner of ["1", "2"] as const)
      coast.settlements.push({
        id: `twin-${owner}`,
        tileId: coast.id,
        owner,
        kind: "colony",
        buildings: ["port"],
        pops: { citizens: 1, freemen: 0, slaves: 0 },
      });
    const layout = layOut(busy);

    const lots = layout.towns.flatMap((t) => t.sites.filter((n) => n.building !== "port"));
    const work = [
      ...(layout.models.cut_forest ?? []),
      ...(layout.models.cut_mountain ?? []),
      ...(layout.models.cut_plains ?? []),
      ...(layout.figures.slave ?? []).flatMap((f) => (f.mode === "work" ? [f] : [])),
    ];
    expect(work.length).toBeGreaterThan(20);
    expect(
      work.filter((p) => lots.some((n) => Math.hypot(p.x - n.x, p.z - n.z) < n.radius * 1.15)),
    ).toEqual([]);

    const cell = shape.cells.find((c) => c.id === coast.id)!;
    const [west, east] = layout.towns.filter((t) => t.tileId === coast.id).map((t) => t.sites[0]);
    expect(west.x).toBeLessThan(cell.x);
    expect(east.x).toBeGreaterThan(cell.x);
  });

  it("lays out an Archipelago game: a town for every settlement, every ship at sea", () => {
    const seed = 11;
    const G = buildNewGame({
      seed,
      mode: "standard",
      patch: boardRulesetPatch("archipelago"),
      boardLayout: "archipelago",
      opening: "policy",
      simRng: createSimRng(deriveBotSeed(seed)),
    });
    // Each seat sends a pop from its metropolis to its founding colony, which island
    // hopping may have put on another island.
    const sailing = structuredClone(G);
    const tileOf = (id: string) => sailing.board.tiles.find((t) => t.id === id)!;
    for (const owner of PLAYER_IDS) {
      const [from, to] = sailing.players[owner].settlements.map(tileOf);
      const own = (t: HexTile) => t.settlements.find((s) => s.owner === owner)!.id;
      sailing.transfers.push({
        id: `voyage-${owner}`,
        owner,
        fromSettlementId: own(from),
        toSettlementId: own(to),
        fromTileId: from.id,
        toTileId: to.id,
        pops: { citizens: 1, freemen: 0, slaves: 0 },
      });
    }
    /** The tiles joined to `start` by land. */
    const islandOf = (start: HexTile) => {
      const island = [start];
      for (const t of island)
        for (const n of sailing.board.tiles)
          if (!island.includes(n) && hexDistance(n, t) === 1) island.push(n);
      return island;
    };
    expect(
      sailing.transfers.some((t) => !islandOf(tileOf(t.fromTileId)).includes(tileOf(t.toTileId))),
    ).toBe(true);

    const islands = boardShape(shapeKey(sailing.board.tiles));
    const model = mapModel(sailing, islands, settlementNames(sailing.board.tiles));
    const layout = layoutMap(model, seed);

    const settled = model.tiles.flatMap((t) => t.settlements.map((s) => s.id));
    expect(layout.towns.map((t) => t.settlementId).sort()).toEqual(settled.sort());
    expect(layout.ships).toHaveLength(PLAYER_IDS.length);
    for (const ship of layout.ships) {
      // Drawn as the scene draws it; a tile's top reaches 0.955 from its centre.
      const curve = new CatmullRomCurve3(
        ship.route.map((p) => new Vector3(p.x, 0, p.z)),
        false,
        "centripetal",
      );
      const nearest = Math.min(
        ...curve
          .getSpacedPoints(120)
          .map((p) => Math.min(...model.tiles.map((t) => Math.hypot(t.x - p.x, t.y - p.z)))),
      );
      expect(nearest, ship.id).toBeGreaterThan(1.1);
    }
  });
});
