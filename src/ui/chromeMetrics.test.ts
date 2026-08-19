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
 * The point of this module is that the board frame stopped carrying its own copies
 * of the chrome's dimensions — a `{ top: 96, bottom: 100 }` literal and a bare `360`
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
  "var(--board-reserve-l)": 432,
  "var(--board-reserve-r)": 432,
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
  it("holds clear exactly what --board-reserve-* declares", () => {
    // The board's clearance is NOT a tablet's width. Deriving it from one made
    // the island pay for every column the ledger gained.
    expect(sideInsetPx(fakeMeasure())).toEqual({ left: 432, right: 432 });
  });

  it("follows --ui-scale down, because the tokens it reads already have", () => {
    expect(
      sideInsetPx(fakeMeasure({ "var(--board-reserve-l)": 216, "var(--board-reserve-r)": 216 }))
        .left,
    ).toBe(216);
  });

  it("never lets a narrow viewport collapse the board against a tablet", () => {
    const collapsed = fakeMeasure({
      "var(--board-reserve-l)": 0,
      "var(--board-reserve-r)": 0,
    });

    expect(sideInsetPx(collapsed).left).toBe(MIN_SIDE_INSET_PX);
  });
});

describe("chromeInsetPx", () => {
  it("hands the camera all four clearances at once", () => {
    expect(chromeInsetPx(fakeMeasure())).toEqual({
      top: 96,
      bottom: 100,
      left: 432,
      right: 432,
    });
  });
});
