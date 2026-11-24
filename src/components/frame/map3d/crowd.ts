/**
 * Political's realm names never print over one another. Each name stands at the middle
 * of its realm's land; where two would meet, the larger realm keeps its place and the
 * other moves along its own land, then shrinks, and only then gives way altogether. A
 * pure function of the boxes on screen, so the runtime measures and this decides.
 */

/** A box on the stage, in px. */
export type Box = { left: number; top: number; right: number; bottom: number };
type Point = { x: number; y: number };

export const meets = (a: Box, b: Box, pad = 2) =>
  a.left < b.right + pad &&
  a.right > b.left - pad &&
  a.top < b.bottom + pad &&
  a.bottom > b.top - pad;

export type RealmName = {
  /** Where it stands now, at full size (already clear of the chrome where it could be). */
  box: Box;
  /** Its realm's tiles' centres on screen: where else on its land it may stand. */
  along: readonly Point[];
  /** Its realm's land, in tiles: the larger realm keeps its place. */
  size: number;
};

export type NamePlace = { dx: number; dy: number; scale: number; hidden: boolean };

/** How far a name may shrink, step by step, before it gives way. */
export const NAME_SCALES = [1, 0.85, 0.72] as const;
/** The clear space kept between two names, and between a moved name and the chrome. */
const GAP = 6;

export function settleRealmNames(
  names: readonly RealmName[],
  /** The chrome a moved name must stay out of, and the stage it must stay inside. */
  chrome: readonly Box[],
  W: number,
  H: number,
): NamePlace[] {
  const placed: Box[] = [];
  const out: NamePlace[] = names.map(() => ({ dx: 0, dy: 0, scale: 1, hidden: true }));
  const order = names.map((_, i) => i).sort((a, b) => names[b].size - names[a].size || a - b);
  for (const i of order) {
    const { box, along } = names[i];
    const home = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const away = (p: Point) => Math.hypot(p.x - home.x, p.y - home.y);
    // Its own place first, then along its land, nearest first: half way to each of its
    // tiles, and each tile.
    const spots = [
      home,
      ...along
        .flatMap((p) => [{ x: (home.x + p.x) / 2, y: (home.y + p.y) / 2 }, p])
        .filter((p) => away(p) > 1)
        .sort((a, b) => away(a) - away(b)),
    ];
    const fit = NAME_SCALES.flatMap((scale) =>
      spots.map((p, k) => {
        const b = {
          left: p.x - (w * scale) / 2,
          right: p.x + (w * scale) / 2,
          top: p.y - (h * scale) / 2,
          bottom: p.y + (h * scale) / 2,
        };
        return { p, k, scale, b };
      }),
    ).find(
      ({ k, b }) =>
        // Its own place was cleared of the chrome already; a move must not undo that.
        (k === 0 ||
          (b.left >= 0 &&
            b.top >= 0 &&
            b.right <= W &&
            b.bottom <= H &&
            !chrome.some((r) => meets(b, r, GAP)))) &&
        !placed.some((o) => meets(b, o, GAP)),
    );
    if (!fit) continue;
    placed.push(fit.b);
    out[i] = { dx: fit.p.x - home.x, dy: fit.p.y - home.y, scale: fit.scale, hidden: false };
  }
  return out;
}
