import { describe, expect, it } from "vitest";
import { fitIsland } from "./fit";
import {
  E1,
  E2,
  H_TILE,
  T_FIT,
  bandAlphas,
  boxesAt,
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

  it("opens in the middle band, and fades each layer in its own band", () => {
    expect(T_FIT).toBeGreaterThan(E1);
    expect(T_FIT).toBeLessThan(E2);
    const open = bandAlphas(T_FIT).html;
    expect([open.plates, open.yield, open.faryield, open.popsline]).toEqual([1, 1, 0, 0]);
    // Colony names wait one notch past the opening view, except a pick's candidates,
    // whose plates show at any zoom where plates are drawn.
    expect(open.colony).toBe(0);
    const far = bandAlphas(0).html;
    expect([far.plates, far.faryield]).toEqual([0, 1]);
    expect([open.asked, far.asked, bandAlphas(0, 40).html.asked]).toEqual([1, 1, 1]);
    expect(bandAlphas(0, Infinity, "trade").html.asked).toBe(1);
    expect(bandAlphas(T_FIT, Infinity, "political").html.asked).toBe(0);
    const close = bandAlphas(1).html;
    expect([close.popsline, close.pips]).toEqual([1, 0]);
    // Hexes too small for chips (a phone) keep the far numerals and the capitals' plates.
    const small = bandAlphas(T_FIT, 50).html;
    expect([small.plates, small.cityplate, small.yield, small.faryield]).toEqual([1, 0, 0, 1]);
    // Outside Terrain the flat seals stand in for the town and Port models, and Trade's
    // discs for the goods' rafts.
    const mark = (mode: "terrain" | "political" | "economy" | "trade") => {
      const { layers, html } = bandAlphas(T_FIT, Infinity, mode);
      return [layers.towns, layers.ports, html.seal, layers.goods, html.goodicon];
    };
    expect(mark("terrain")).toEqual([1, expect.any(Number), 0, 1, 0]);
    expect(mark("political")).toEqual([0, 0, 1, 1, 0]);
    expect(mark("economy")).toEqual([0, 0, 1, 1, 0]);
    expect(mark("trade")).toEqual([0, 0, 1, 0, 1]);
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
