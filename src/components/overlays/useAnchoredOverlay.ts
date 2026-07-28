import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import {
  positionAnchoredOverlay,
  type AnchoringOptions,
  type FloatingPosition,
} from "../../ui/anchoring";

export function useAnchoredOverlay(
  anchor: DOMRect | RefObject<HTMLElement | null> | null,
  overlayRef: RefObject<HTMLElement | null>,
  options: AnchoringOptions,
  measureKey?: unknown,
) {
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const { arrowInset, gap, margin, preferredPlacement } = options;

  const updatePosition = useCallback(() => {
    const overlay = overlayRef.current;
    const anchorRect = isElementRef(anchor) ? anchor.current?.getBoundingClientRect() : anchor;

    if (!overlay || !anchorRect || typeof window === "undefined") return;

    const { width, height } = overlay.getBoundingClientRect();
    setPosition(
      positionAnchoredOverlay(
        anchorRect,
        { width, height },
        { width: window.innerWidth, height: window.innerHeight },
        { arrowInset, gap, margin, preferredPlacement },
      ),
    );
  }, [anchor, arrowInset, gap, margin, overlayRef, preferredPlacement]);

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

function isElementRef(
  value: DOMRect | RefObject<HTMLElement | null> | null,
): value is RefObject<HTMLElement | null> {
  return Boolean(value && "current" in value);
}
