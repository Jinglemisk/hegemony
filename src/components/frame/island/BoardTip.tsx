import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { tokenPx } from "./fit";

/** A board's hover tip: over the hovered thing's box, or under it when there is no room above. */
export function BoardTip({ anchor, children }: { anchor: DOMRect; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const gap = tokenPx("--board-gap") || 8;
    const { offsetWidth: w, offsetHeight: h } = el;
    const left = Math.min(
      innerWidth - w - gap,
      Math.max(gap, anchor.left + anchor.width / 2 - w / 2),
    );
    const above = anchor.top - h - gap;
    setAt({ left, top: above >= gap ? above : anchor.bottom + gap });
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
    document.body,
  );
}
