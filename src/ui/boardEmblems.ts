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
