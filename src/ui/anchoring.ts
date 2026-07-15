/**
 * Anchoring a floating panel to something on screen (ladder rung R8).
 *
 * Two places do this — the building tooltip and the found-colony popover — and
 * both had their own copy of the horizontal clamp, written differently enough to
 * look like different rules while computing exactly the same number.
 *
 * Only the genuinely shared step lives here. The two differ on *vertical*
 * placement for real reasons — the popover measures its own height and picks the
 * side with room, the tooltip uses a fixed threshold — so forcing those together
 * would change behaviour, not remove duplication.
 */

/** Horizontal gap kept between a floating panel and the viewport edge. */
export const ANCHOR_MARGIN = 12;

/**
 * Centre a panel of `width` under `centerX`, then pull it back inside the
 * viewport. When the panel is wider than the viewport it pins to `margin`.
 */
export function clampAnchoredLeft(centerX: number, width: number, margin: number) {
  return Math.max(margin, Math.min(centerX - width / 2, window.innerWidth - width - margin));
}
