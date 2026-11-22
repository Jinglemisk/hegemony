import type { ReactNode } from "react";
import { OVERLAY_ROOT_ID } from "./canvas";
import { useTextScale } from "./textScale";

/**
 * The HUD's design canvas: a (100vw / k) × (100vh / k) box scaled by --k from its
 * top-left corner, so chrome is authored in design px and anchors to the logical
 * edges. It passes the pointer through to the map; its direct children take it
 * back. Tooltips and popovers portal into its overlay layer, last, over the rest.
 */
export function HudCanvas({ children }: { children: ReactNode }) {
  // Reading the setting applies the stored Text size from the first frame.
  useTextScale();
  return (
    <div className="hud-canvas">
      {children}
      <div className="hud-overlays" id={OVERLAY_ROOT_ID} />
    </div>
  );
}
