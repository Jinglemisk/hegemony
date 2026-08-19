/** Shared geometry for portal-based tooltips and popovers. */

export const ANCHOR_MARGIN = 12;
export const ANCHOR_GAP = 10;
export const ANCHOR_ARROW_INSET = 18;

export type VerticalPlacement = "above" | "below";

export type FloatingPosition = {
  top: number;
  left: number;
  arrowLeft: number;
  placement: VerticalPlacement;
};

export type FloatingSize = { width: number; height: number };
export type ViewportSize = { width: number; height: number };

export type AnchoringOptions = {
  preferredPlacement?: VerticalPlacement;
  margin?: number;
  gap?: number;
  arrowInset?: number;
};

/**
 * Positions, flips, and clamps an overlay within the viewport — or refuses to.
 *
 * `null` means "the anchor has no box, so there is nowhere to anchor to". A
 * `display: contents` trigger measures {0,0,0,0}, and the arithmetic below would
 * take that at face value: no space above, no space below, both clamps bottom
 * out at the margin, and the overlay lands in the top-left corner of the screen
 * looking deliberate. That is exactly how the End Turn tooltip shipped at
 * (10, 10) on top of the event slips. A helper that fails INTO a corner will do
 * it again the next time a trigger loses its box, so it fails to nothing
 * instead: the caller already knows how to hold an unplaced overlay invisible,
 * and a tooltip that does not appear is a bug someone fixes rather than a
 * misplacement everyone learns to ignore.
 */
export function positionAnchoredOverlay(
  anchor: Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">,
  floating: FloatingSize,
  viewport: ViewportSize,
  options: AnchoringOptions = {},
): FloatingPosition | null {
  if (anchor.width <= 0 && anchor.height <= 0) {
    return null;
  }

  const margin = options.margin ?? ANCHOR_MARGIN;
  const gap = options.gap ?? ANCHOR_GAP;
  const arrowInset = options.arrowInset ?? ANCHOR_ARROW_INSET;
  const preferred = options.preferredPlacement ?? "below";
  const centerX = anchor.left + anchor.width / 2;
  const spaceBelow = viewport.height - anchor.bottom - margin - gap;
  const spaceAbove = anchor.top - margin - gap;
  const preferredSpace = preferred === "below" ? spaceBelow : spaceAbove;
  const oppositeSpace = preferred === "below" ? spaceAbove : spaceBelow;
  const placement =
    preferredSpace >= floating.height || preferredSpace >= oppositeSpace
      ? preferred
      : preferred === "below"
        ? "above"
        : "below";
  const rawTop = placement === "below" ? anchor.bottom + gap : anchor.top - floating.height - gap;
  const left = clampToViewport(
    centerX - floating.width / 2,
    floating.width,
    viewport.width,
    margin,
  );
  const top = clampToViewport(rawTop, floating.height, viewport.height, margin);
  const maximumArrowLeft = Math.max(arrowInset, floating.width - arrowInset);
  const arrowLeft = Math.max(arrowInset, Math.min(centerX - left, maximumArrowLeft));

  return { top, left, arrowLeft, placement };
}

function clampToViewport(position: number, size: number, viewportSize: number, margin: number) {
  return Math.max(margin, Math.min(position, Math.max(margin, viewportSize - size - margin)));
}
