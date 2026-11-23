import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { overlayRoot, overlayScale } from "../../chrome/canvas";
import { tokenPx } from "./fit";

/** A board's hover tip: over the hovered thing's box, or under it when there is no room above. */
export function BoardTip({ anchor, children }: { anchor: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The anchor is in screen px; the tip draws in the HUD canvas's design px.
    const k = overlayScale();
    const gap = tokenPx("--board-gap") || 8;
    const { offsetWidth: w, offsetHeight: h } = el;
    const left = Math.min(
      innerWidth / k - w - gap,
      Math.max(gap, (anchor.left + anchor.width / 2) / k - w / 2),
    );
    const above = anchor.top / k - h - gap;
    setAt({ left, top: above >= gap ? above : anchor.bottom / k + gap });
  }, [anchor]);

  return createPortal(
    <div
      className="sharedTooltip map-tip"
      ref={ref}
      role="tooltip"
      style={at ? { left: at.left, top: at.top, opacity: 1 } : { left: 0, top: 0, opacity: 0 }}
    >
      {children}
    </div>,
    overlayRoot(),
  );
}
