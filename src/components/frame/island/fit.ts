/**
 * The island's opening view: the largest hex whose tiles (and mooring labels)
 * clear every piece of chrome by one gap, centred as near the viewport's middle
 * as the chrome allows. Ported from the Hybrid arc mock's `fitBoard`.
 *
 * Everything here is in "hex units", where a hex is 1 from centre to corner; a
 * scale `s` is screen pixels per hex unit. After the opening view the player
 * pans and zooms freely — this only decides where the map starts.
 */

/** [x0, x1, y0, y1] in hex units, relative to the island's origin. */
export type UnitBox = readonly [number, number, number, number];

export type ScreenRect = { left: number; right: number; top: number; bottom: number };

export type IslandFit = { s: number; cx: number; cy: number };

export type FitInput = {
  width: number;
  height: number;
  /** Clearance between the island and the chrome, and the viewport's edge. */
  gap: number;
  exclusions: readonly ScreenRect[];
  /** Boxes that must stay clear at scale `s` (tiles, plus labels that grow as hexes shrink). */
  boxesAt: (s: number) => readonly UnitBox[];
};

/** The free centre for hex size `s`, or null when no position clears the chrome. */
function centreAt(s: number, input: FitInput): [number, number] | null {
  const { width: W, height: H, gap: M, exclusions } = input;
  const boxes = input.boxesAt(s);
  const minOf = (i: number) => Math.min(...boxes.map((box) => box[i]));
  const maxOf = (i: number) => Math.max(...boxes.map((box) => box[i]));
  const cyMin = Math.ceil(-minOf(2) * s + M);
  const cyMax = Math.floor(H - maxOf(3) * s - M);

  if (cyMin > cyMax) {
    return null;
  }

  const lo = Math.ceil(-minOf(0) * s + M);
  const hi = Math.floor(W - maxOf(1) * s - M);

  if (lo > hi) {
    return null;
  }

  const mid = Math.round((cyMin + cyMax) / 2);
  const want = Math.min(hi, Math.max(lo, W / 2));

  for (let d = 0; d <= cyMax - cyMin; d += 1) {
    for (const cy of d ? [mid - d, mid + d] : [mid]) {
      if (cy < cyMin || cy > cyMax) {
        continue;
      }

      // Every horizontal band of centres that would put a box on a piece of chrome.
      const bans: Array<[number, number]> = [];

      for (const [x0, x1, y0, y1] of boxes) {
        for (const rect of exclusions) {
          if (cy + y0 * s < rect.bottom + M && cy + y1 * s > rect.top - M) {
            bans.push([rect.left - M - x1 * s, rect.right + M - x0 * s]);
          }
        }
      }

      const candidates = [want, ...bans.flat().map(Math.ceil), ...bans.flat().map(Math.floor)];
      let best: number | null = null;

      for (const c of candidates) {
        if (c < lo || c > hi || bans.some(([a, b]) => c > a && c < b)) {
          continue;
        }

        if (best === null || Math.abs(c - want) < Math.abs(best - want)) {
          best = c;
        }
      }

      if (best !== null) {
        return [best, cy];
      }
    }
  }

  return null;
}

/** The largest clear hex size, to a sixteenth of a pixel, and where it sits. */
export function fitIsland(input: FitInput, minScale = 16): IslandFit | null {
  const boxes = input.boxesAt(minScale);
  const spanX = Math.max(...boxes.map((box) => box[1])) - Math.min(...boxes.map((box) => box[0]));
  const spanY = Math.max(...boxes.map((box) => box[3])) - Math.min(...boxes.map((box) => box[2]));
  const sMax = Math.floor(
    Math.min((input.height - 2 * input.gap) / spanY, (input.width - 2 * input.gap) / spanX),
  );

  for (let s = sMax; s >= minScale; s -= 1) {
    if (!centreAt(s, input)) {
      continue;
    }

    let fit = s;

    for (let f = s + 1 - 1 / 16; f > s; f -= 1 / 16) {
      if (centreAt(f, input)) {
        fit = f;
        break;
      }
    }

    const [cx, cy] = centreAt(fit, input)!;
    return { s: fit, cx, cy };
  }

  return null;
}
