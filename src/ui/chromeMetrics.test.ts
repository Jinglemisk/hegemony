// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  MIN_SIDE_INSET_PX,
  chromeInsetPx,
  measureCssLength,
  sideInsetPx,
  verticalInsetPx,
  type MeasureLength,
} from "./chromeMetrics";

/**
 * The point of this module is that the camera stopped carrying its own copies of
 * the chrome's dimensions — a `{ top: 96, bottom: 100 }` literal and a bare `360`
 * that both had to be re-typed whenever CSS changed. These tests guard the two
 * ways that regresses: the arithmetic drifting, and the probe reading a token the
 * layout engine cannot see.
 *
 * jsdom has no layout engine, so `var()`/`calc()` never resolve here. Rather than
 * pretend otherwise, the composition is tested against a fake measurer keyed by
 * the exact expressions the module asks for — which also pins the token NAMES, so
 * renaming `--panel-w` in CSS without following it here fails the suite.
 */

const TOKEN_PX: Record<string, number> = {
  "calc(var(--rail-w) + var(--bub-out) + 14px)": 72,
  "var(--panel-w)": 360,
  "var(--chron-w)": 360,
  "var(--panel-w-base)": 360,
  "var(--camera-inset-top)": 96,
  "var(--camera-inset-bot)": 100,
};

/** Fails loudly on an expression the CSS does not define — the real failure mode. */
function fakeMeasure(overrides: Record<string, number> = {}): MeasureLength {
  const table = { ...TOKEN_PX, ...overrides };

  return (expression) => {
    if (!(expression in table)) {
      throw new Error(`no token declared for ${expression}`);
    }

    return table[expression];
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("measureCssLength", () => {
  it("leaves no probe behind on the body it mounts to", () => {
    measureCssLength("var(--panel-w)");

    expect(document.body.children).toHaveLength(0);
  });
});

describe("verticalInsetPx", () => {
  it("takes each bar's clearance straight off its camera-inset token", () => {
    expect(verticalInsetPx(fakeMeasure())).toEqual({ top: 96, bottom: 100 });
  });
});

describe("sideInsetPx", () => {
  it("reserves each tablet's reach less the sea overlap, symmetrically", () => {
    // offset 72 + tablet 360 - pull 84 = 348, and the two sides must agree or the
    // board slides off-centre (the old "map is off" bug).
    expect(sideInsetPx(fakeMeasure())).toEqual({ left: 348, right: 348 });
  });

  it("shrinks the overlap with --ui-scale, so clearance stays visually equal", () => {
    const halfScale = fakeMeasure({
      "calc(var(--rail-w) + var(--bub-out) + 14px)": 43,
      "var(--panel-w)": 180,
      "var(--chron-w)": 180,
    });

    // 43 + 180 - (84 x 0.5) = 181.
    expect(sideInsetPx(halfScale).left).toBe(181);
  });

  it("never lets a narrow viewport collapse the board against a tablet", () => {
    const collapsed = fakeMeasure({
      "calc(var(--rail-w) + var(--bub-out) + 14px)": 0,
      "var(--panel-w)": 0,
      "var(--chron-w)": 0,
    });

    expect(sideInsetPx(collapsed).left).toBe(MIN_SIDE_INSET_PX);
  });

  it("survives a reference token that reads 0 rather than dividing by nothing", () => {
    const unresolved = fakeMeasure({ "var(--panel-w-base)": 0 });

    expect(Number.isFinite(sideInsetPx(unresolved).left)).toBe(true);
  });
});

describe("chromeInsetPx", () => {
  it("hands the camera all four clearances at once", () => {
    expect(chromeInsetPx(fakeMeasure())).toEqual({
      top: 96,
      bottom: 100,
      left: 348,
      right: 348,
    });
  });
});
