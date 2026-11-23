import { describe, expect, it } from "vitest";
import { meets, settleRealmNames } from "./crowd";
import type { Box, RealmName } from "./crowd";

const box = (x: number, y: number, w = 120, h = 30): Box => ({
  left: x - w / 2,
  right: x + w / 2,
  top: y - h / 2,
  bottom: y + h / 2,
});
const at = (name: RealmName, p: ReturnType<typeof settleRealmNames>[number]) => {
  const { box: b } = name;
  const cx = (b.left + b.right) / 2 + p.dx;
  const cy = (b.top + b.bottom) / 2 + p.dy;
  const hw = ((b.right - b.left) / 2) * p.scale;
  const hh = ((b.bottom - b.top) / 2) * p.scale;
  return { left: cx - hw, right: cx + hw, top: cy - hh, bottom: cy + hh };
};

describe("settleRealmNames", () => {
  it("leaves names that do not meet where they are", () => {
    const names = [
      { box: box(200, 200), along: [], size: 3 },
      { box: box(500, 200), along: [], size: 2 },
    ];
    expect(settleRealmNames(names, [], 800, 600)).toEqual([
      { dx: 0, dy: 0, scale: 1, hidden: false },
      { dx: 0, dy: 0, scale: 1, hidden: false },
    ]);
  });

  it("moves the smaller realm's name along its own land, the larger keeping its place", () => {
    // Two names side by side would read "DAMONTHERON"; the smaller realm has land below.
    const names = [
      { box: box(300, 200), along: [{ x: 300, y: 260 }], size: 2 },
      { box: box(400, 200), along: [], size: 5 },
    ];
    const [small, large] = settleRealmNames(names, [], 800, 600);
    expect(large).toEqual({ dx: 0, dy: 0, scale: 1, hidden: false });
    expect(small.hidden).toBe(false);
    expect(small.scale).toBe(1);
    expect(meets(at(names[0], small), at(names[1], large), 6)).toBe(false);
    // Half way to its tile still meets; the tile itself clears.
    expect(small).toMatchObject({ dx: 0, dy: 60 });
  });

  it("shrinks a name with nowhere to move, and hides it when shrinking is not enough", () => {
    const large = { box: box(400, 200, 120, 30), along: [], size: 5 };
    // 150 px apart: the 200 px name meets the other at full size, and clears at 0.72.
    const shrinks = { box: box(250, 200, 200, 30), along: [], size: 2 };
    const [, shrunk] = settleRealmNames([large, shrinks], [], 800, 600);
    expect(shrunk.hidden).toBe(false);
    expect(shrunk.scale).toBeLessThan(1);
    expect(meets(at(shrinks, shrunk), large.box, 6)).toBe(false);

    const smothered = { box: box(410, 205), along: [], size: 1 };
    expect(settleRealmNames([large, smothered], [], 800, 600)[1].hidden).toBe(true);
  });

  it("never moves a name under the chrome", () => {
    const large = { box: box(400, 200), along: [], size: 5 };
    const small = {
      box: box(400, 200),
      along: [
        { x: 400, y: 40 },
        { x: 400, y: 330 },
        { x: 400, y: 590 },
      ],
      size: 2,
    };
    // Below is nearer, but under the chrome: it goes up instead.
    const chrome = [{ left: 0, right: 800, top: 240, bottom: 360 }];
    const [, moved] = settleRealmNames([large, small], chrome, 800, 600);
    expect(moved).toMatchObject({ dx: 0, dy: -80, scale: 1, hidden: false });
  });
});
