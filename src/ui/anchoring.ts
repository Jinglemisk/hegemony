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

/** Positions, flips, and clamps an overlay within the viewport. */
export function positionAnchoredOverlay(
  anchor: Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">,
  floating: FloatingSize,
  viewport: ViewportSize,
  options: AnchoringOptions = {},
): FloatingPosition {
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
