/**
 * The one place JavaScript is allowed to know how big the chrome is.
 *
 * Before the overhaul three separate numbers were kept in sync by hand between
 * `useMapCamera` and `base.css` — a `{ top: 96, bottom: 100 }` literal that
 * tracked `--chrome-top`/`--chrome-bot`, a bare `360` that was `--panel-w`'s
 * value, and a DOM probe that only worked when mounted inside `.shell` because
 * the tokens lived there rather than on `:root`. Any bar-height change silently
 * mis-seated the board. Now CSS owns every length and this module reads them.
 *
 * Everything here is measured, never assumed: custom properties do not resolve
 * through `getComputedStyle`, so the only honest way to turn `calc(64px *
 * var(--ui-scale))` into pixels is to hand it to the layout engine and ask how
 * wide the result came out.
 */

/** The floor each side inset is held to, so a very narrow viewport still leaves
 *  the board somewhere to be rather than collapsing it against a card. */
export const MIN_SIDE_INSET_PX = 70;

export type ChromeInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** Turns a CSS length expression into pixels. Real one measures; tests fake it. */
export type MeasureLength = (expression: string) => number;

/**
 * Resolve a CSS length expression (a var/calc over the design tokens) to CSS
 * pixels by measuring a probe element.
 *
 * The probe mounts on `document.body`, which is only safe because the tokens are
 * on `:root` — they were on `.shell` until the overhaul, and a body-mounted probe
 * read every one of them as 0. If a token ever moves back down into a scope,
 * this function is where it breaks, loudly and in one place.
 */
export function measureCssLength(expression: string): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;width:${expression}`;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();

  return width;
}

/**
 * Clearance held under the top and bottom bars, in CSS px.
 *
 * `--camera-inset-top`/`--camera-inset-bot` are each their bar's real height plus
 * a breath of sea, so a tile edge never kisses the meander. Changing a bar's
 * height moves the camera with it, with no second number to remember.
 */
export function verticalInsetPx(measure: MeasureLength = measureCssLength) {
  return {
    top: measure("var(--camera-inset-top)"),
    bottom: measure("var(--camera-inset-bot)"),
  };
}

/**
 * The resting board sits in the sea BETWEEN the two ledger tablets (2026-07-19,
 * owner ask — the tablets widened toward the centre to reclaim the empty sea they
 * used to float over). Each side reserves exactly a tablet's reach: its edge
 * offset plus its width.
 *
 * It used to reserve that reach LESS an 84px pull, because the frame fitted the
 * coordinate window rather than the island and so carried ~100px/side of sea it
 * did not need — the pull cancelled a fudge with a fudge. The frame measures the
 * land now (`boardExtent`), so the honest reserve is the honest number.
 */
export function sideInsetPx(measure: MeasureLength = measureCssLength) {
  const cardOffset = measure("calc(var(--rail-w) + var(--bub-out) + 14px)");
  const leftCard = measure("var(--panel-w)");
  const rightCard = measure("var(--chron-w)");

  return {
    left: Math.max(MIN_SIDE_INSET_PX, cardOffset + leftCard),
    right: Math.max(MIN_SIDE_INSET_PX, cardOffset + rightCard),
  };
}

/** All four clearances the camera holds, in CSS px, read fresh from the tokens. */
export function chromeInsetPx(measure: MeasureLength = measureCssLength): ChromeInsets {
  return { ...verticalInsetPx(measure), ...sideInsetPx(measure) };
}
