import { describe, expect, it } from "vitest";
import { fitIsland } from "./fit";
import {
  H_TILE,
  T_CLOSE,
  T_FIT,
  bandAlphas,
  boxesAt,
  detailAt,
  project,
  stepCamera,
  tiltAt,
  unproject,
  viewOf,
  zoomRange,
} from "./camera";
import type { Cam, Frame, Goal } from "./camera";

const DEG = Math.PI / 180;
const frame: Frame = { W: 1440, H: 900, cx: 900, cy: 480, zFit: 60 };

describe("the living map's camera", () => {
  it("tilts from top-down far out, through 20° at the opening view, to 45° close in", () => {
    expect(tiltAt(0)).toBeCloseTo(0);
    expect(tiltAt(T_FIT)).toBeCloseTo(20 * DEG);
    expect(tiltAt(1)).toBeCloseTo(45 * DEG);
    expect(tiltAt(0.6)).toBeGreaterThan(tiltAt(0.4));
  });

  it("finds the sea under a screen point at any turn and tilt", () => {
    const v = viewOf({ tx: 1.2, ty: -0.7, z: 150, rot: 12 * DEG }, frame);
    const p = project(v, 2.5, 1.5, 0);
    const back = unproject(v, p.x, p.y);
    expect(back.x).toBeCloseTo(2.5, 6);
    expect(back.y).toBeCloseTo(1.5, 6);
  });

  it("zooms toward the pointer: the point under it stays put while the zoom eases", () => {
    const cam: Cam = { tx: 0, ty: 0, z: frame.zFit, rot: 0 };
    const [, zMax] = zoomRange(frame.zFit);
    const under = unproject(viewOf(cam, frame), 1200, 300);
    const goal: Goal = { ...cam, z: zMax, anchor: { sx: 1200, sy: 300, wx: under.x, wy: under.y } };
    let frames = 0;
    while (stepCamera(cam, goal, frame, 10, 0.24) && frames < 500) frames += 1;
    expect(cam.z).toBe(zMax);
    const after = project(viewOf(cam, frame), under.x, under.y, 0);
    expect(after.x).toBeCloseTo(1200, 0);
    expect(after.y).toBeCloseTo(300, 0);
  });

  it("has two bands: the opening view in the overview, one press of + past the threshold", () => {
    expect(bandAlphas(T_FIT).close).toBe(0);
    expect(T_FIT).toBeLessThan(T_CLOSE);
    const [lo] = zoomRange(frame.zFit);
    expect(bandAlphas(detailAt(lo, frame.zFit)).close).toBe(0);
    expect(bandAlphas(detailAt(1.4 * frame.zFit, frame.zFit)).close).toBe(1);

    // The overview names the capitals; close in, every settlement, with its pips and
    // pops. A pick's candidates are named at any zoom.
    const open = bandAlphas(T_FIT).html;
    expect([open.capital, open.plates, open.pips, open.asked]).toEqual([1, 0, 0, 1]);
    const close = bandAlphas(1).html;
    expect([close.capital, close.plates, close.pips, close.asked]).toEqual([1, 1, 1, 1]);
    // Hexes too small for every plate keep the overview's labels close in; a phone's,
    // too small for any, keep the badges alone. A pick still names its candidates.
    const small = bandAlphas(1, 50).html;
    expect([small.capital, small.plates, small.pips]).toEqual([1, 0, 0]);
    const phone = bandAlphas(T_FIT, 30).html;
    expect([phone.capital, phone.plates, phone.asked]).toEqual([0, 0, 1]);
  });

  it("draws the same 3D board in every mode at both bands, under the mode's filter", () => {
    for (const t of [0, T_FIT, 1])
      for (const mode of ["terrain", "political", "economy", "trade"] as const) {
        const { layers } = bandAlphas(t, Infinity, mode);
        expect([layers.towns, layers.ports, layers.goods]).toEqual([1, 1, 1]);
        // Economy fades the land's trees, rocks and fields; no mode hides them.
        expect(layers.terrain).toBe(mode === "economy" ? 0.35 : 1);
      }
    // Each mode hangs its own labels under the badge: Political the realm's name in
    // place of its capital's plate, Economy its readout, Trade its hint by the capital.
    const html = (mode: "terrain" | "political" | "economy" | "trade") =>
      bandAlphas(T_FIT, Infinity, mode).html;
    expect([html("political").realm, html("political").capital]).toEqual([1, 0]);
    expect([html("economy").ecoC, html("economy").ecoF, html("economy").plates]).toEqual([1, 0, 0]);
    expect([html("trade").hint, html("terrain").hint]).toEqual([1, 0]);
  });

  it("opens with every tile on screen and clear of the chrome", () => {
    const hexes = [-2, -1, 0, 1, 2].map((x) =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (60 * i - 30) * DEG;
        return [x * Math.sqrt(3) + Math.cos(a), Math.sin(a), H_TILE] as const;
      }),
    );
    // A panel down the left third of the screen.
    const panel = { left: 0, right: 480, top: 0, bottom: 900 };
    const fit = fitIsland({
      width: 1440,
      height: 900,
      gap: 8,
      exclusions: [panel],
      boxesAt: (s) => boxesAt(s, 900, hexes),
    })!;
    const v = viewOf(
      { tx: 0, ty: 0, z: fit.s, rot: 0 },
      { ...frame, cx: fit.cx, cy: fit.cy, zFit: fit.s },
    );
    for (const [x, y, h] of hexes.flat()) {
      const p = project(v, x, y, h);
      expect(p.x).toBeGreaterThan(panel.right);
      expect(p.x).toBeLessThan(1440);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(900);
    }
  });
});
