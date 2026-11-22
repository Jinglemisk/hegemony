import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import {
  positionAnchoredOverlay,
  type AnchoringOptions,
  type FloatingPosition,
} from "../../ui/anchoring";
import { overlayScale } from "../chrome/canvas";

export function useAnchoredOverlay(
  anchor: DOMRect | RefObject<HTMLElement | null> | null,
  overlayRef: RefObject<HTMLElement | null>,
  options: AnchoringOptions,
  measureKey?: unknown,
) {
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const { align, arrowInset, gap, margin, preferredPlacement } = options;

  const updatePosition = useCallback(() => {
    const overlay = overlayRef.current;
    const anchorRect = isElementRef(anchor) ? anchor.current?.getBoundingClientRect() : anchor;

    if (!overlay || !anchorRect || typeof window === "undefined") return;

    // Measured in screen px, placed in the HUD canvas's design px: divide by its scale.
    const k = overlayScale();
    const { width, height } = overlay.getBoundingClientRect();
    setPosition(
      positionAnchoredOverlay(
        {
          top: anchorRect.top / k,
          right: anchorRect.right / k,
          bottom: anchorRect.bottom / k,
          left: anchorRect.left / k,
          width: anchorRect.width / k,
          height: anchorRect.height / k,
        },
        { width: width / k, height: height / k },
        { width: window.innerWidth / k, height: window.innerHeight / k },
        { align, arrowInset, gap, margin, preferredPlacement },
      ),
    );
  }, [align, anchor, arrowInset, gap, margin, overlayRef, preferredPlacement]);

  useLayoutEffect(() => {
    const anchorElement = isElementRef(anchor) ? anchor.current : anchor;
    const overlay = overlayRef.current;

    if (!anchorElement || !overlay || typeof window === "undefined") return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    resizeObserver?.observe(overlay);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver?.disconnect();
    };
  }, [anchor, measureKey, overlayRef, updatePosition]);

  return position;
}

export function isElementRef(
  value: DOMRect | RefObject<HTMLElement | null> | null,
): value is RefObject<HTMLElement | null> {
  return Boolean(value && "current" in value);
}
