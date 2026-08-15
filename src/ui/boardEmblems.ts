import type { Terrain } from "../game/types";

/**
 * The board's drawn vocabulary, in BOARD COORDINATES — the emblems and seals cut
 * into a tile, and the geometry of the two pieces of text that stand on one.
 *
 * It lives apart from the components because two of them need to agree on it: the
 * tile draws a label, and the placement pass in HexMap has to know how much room
 * that label takes before anything is drawn.
 */

/**
 * The engraved terrain emblems, in board coordinates.
 *
 * These are NOT the icon set. The glyphs in `icons/glyphs.ts` are drawn on a 24
 * grid for chrome at 14–24px; these are cut into a 90px hex at a third of ink and
 * have to survive being read forty at a time, at an angle, under settlement
 * tokens. Two different jobs, two different drawings — the alternative is one
 * compromise that is slightly wrong in both places.
 *
 * They carry terrain KIND on their own. That is what lets the terrain colour ramp
 * be almost flat (`--t-plains` through `--t-mountain` span four steps of the same
 * bone), which in turn is what lets owner glazes be the only saturated thing on
 * the board.
 */
export const TERRAIN_EMBLEMS: Record<Terrain, string> = {
  /** Three firs, staggered — a wood, not one tree. */
  forest: "M-11 5 -6 -4 -1 5zM1 5 6 -4 11 5zM-5 -2 0 -11 5 -2z",
  /** A ridge line with a false summit: mountains are a profile, not a triangle. */
  mountain: "M-12 6 -2 -8 3 -1 6 -5 12 6",
  /** Furrows, uneven, the way a field is ploughed around a stone. */
  plains: "M-10 0h7M-10 5h13M1 0h9M-4 -5h9",
  /** A low swell with a smaller one behind it. */
  hill: "M-11 5a11 9 0 0 1 22 0M-4 -2a5 4 0 0 1 8 0",
  /** The omphalos: a navel-stone in its ring. The oracle is a hole in the map. */
  oracle: "M0 -8a8 8 0 1 1 0 16 8 8 0 1 1 0-16zM0 -3a3 3 0 1 1 0 6 3 3 0 1 1 0-6z",
};

/**
 * The seal glyphs settlements wear, drawn to sit inside a ~20px disc.
 *
 * A city is a temple front — the thing a polis builds first. A colony is a
 * pennant on a staff — a claim planted, not yet a city. The two silhouettes are
 * deliberately unalike in outline, because on a board this dense the owner's
 * glaze is doing colour work and the seal has to do all the shape work.
 */
export const SETTLEMENT_SEALS = {
  capital: "M-8 1h16M-6 1v-7M-2 1v-7M2 1v-7M6 1v-7M-9 -8 0 -14 9 -8z",
  city: "M-8 1h16M-5 1v-7M5 1v-7M-9 -8 0 -14 9 -8z",
  colony: "M-4 3v-16M-4 -13h9l-3 3.5 3 3.5h-9",
} as const;

/**
 * The yield numeral. Its size is set as an ATTRIBUTE on the element rather than in
 * CSS, because inside a fixed viewBox a text size is geometry, not styling.
 *
 * `y` is 24 rather than the prototype's 30 for the same reason the name plate had
 * to be rebuilt: 30 is 0.53 of a 57px prototype hex and 0.67 of this 45-unit one,
 * so the numeral had drifted a sixth of a hex lower than it was drawn. Putting it
 * back where the prototype has it is also what clears the band a name needs when
 * it has to flip above its seal.
 */
export const YIELD_LAYOUT = { y: 24, fontSize: 16, digitWidth: 9.6, height: 11 } as const;

/**
 * The settlement name and the ivory plate under it.
 *
 * Every number here used to be the prototype's, verbatim, and that is exactly how
 * the plates ended up narrower than the names they carried. `a-table.html` has no
 * viewBox: it draws in SCREEN pixels on a 57px hex with `.hex-name` at 10.5px. This
 * board draws in world units on a 45-unit hex — and `.nameText` set no size at all,
 * so the text inherited the document's 16px as 16 world units. The plate kept the
 * prototype's 7.6-per-character while the text ran half again as wide as the face
 * that constant was measured against, so every name overflowed by a quarter to a
 * half. The plate is measured now; these are the pieces a constant can still own.
 */
export const NAME_LAYOUT = {
  fontSize: 13,
  plateHeight: 16,
  /** Total horizontal padding — half of it either side of the name. */
  platePad: 12,
  /** The text's baseline, below the plate's top edge. */
  baseline: 12,
  /**
   * A per-character estimate, used for the one frame before the board has measured
   * its names for real (`useMeasuredNameWidths`). Generous on purpose: a plate too
   * wide for a frame is invisible, a plate too narrow clips a name.
   */
  charAdvance: 10.4,
  /** Clearance a label keeps from anything already placed. */
  gutter: 6,
  /** The plate's top edge, in tile-local units, for each of the two slots. */
  slotY: { below: 32, above: -43 },
} as const;

export type NameSlot = keyof typeof NAME_LAYOUT.slotY;

/** At most two settlements are drawn side by side; the rest collapse into +n. */
export const MAX_SHOWN_SETTLEMENTS = 2;
