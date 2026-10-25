import { describe, expect, it } from "vitest";
import { scenario } from "../../../game/testing/scenario";
import type { HegemonyState } from "../../../game/types";
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
});
