import { CatmullRomCurve3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { axialToPlane, hexDistance } from "../../../game/mapTopology";
import { seaRoute } from "./life";

/** The cells within `radius` of a centre cell, placed as the map places them. */
const hex = (radius: number, cq = 0, cr = 0) =>
  Array.from({ length: (2 * radius + 1) ** 2 }, (_, i) => ({
    q: cq - radius + (i % (2 * radius + 1)),
    r: cr - radius + Math.floor(i / (2 * radius + 1)),
  }))
    .filter((c) => hexDistance(c, { q: cq, r: cr }) <= radius)
    .map((c) => ({ ...c, ...axialToPlane(c.q, c.r) }));

describe("a ship's sea route", () => {
  it("keeps to open water between any two tiles, on any board", () => {
    const boards = {
      classic: hex(3),
      // Two islands with a strait between them.
      islands: [...hex(1, -2, 0), ...hex(1, 2, 0)],
      // Land round a lake: the lake is no way out to sea.
      lake: hex(2).filter((c) => c.q || c.r),
    };
    let movedOut = 0;
    for (const [name, tiles] of Object.entries(boards)) {
      for (const from of tiles) {
        for (const to of tiles) {
          if (to === from) continue;
          // A good moored by either end moves it a step out, where the water allows.
          const plain = seaRoute(tiles, from, to);
          const moored = seaRoute(tiles, from, to, [plain[0], plain[plain.length - 1]]);
          if (Math.hypot(moored[0].x - plain[0].x, moored[0].z - plain[0].z) > 0.9) movedOut++;
          for (const points of [plain, moored]) {
            // Drawn as the scene draws it.
            const route = points.map((p) => new Vector3(p.x, 0, p.z));
            const curve = new CatmullRomCurve3(route, false, "centripetal");
            const nearest = Math.min(
              ...curve
                .getSpacedPoints(120)
                .map((p) => Math.min(...tiles.map((t) => Math.hypot(t.x - p.x, t.y - p.z)))),
            );
            // A tile's top reaches 0.955 from its centre.
            expect(nearest, `${name}: ${from.q},${from.r} to ${to.q},${to.r}`).toBeGreaterThan(1.1);
          }
        }
      }
    }
    expect(movedOut).toBeGreaterThan(0);
  });
});
