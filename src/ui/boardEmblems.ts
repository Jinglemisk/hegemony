import type { Terrain } from "../game/types";

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
