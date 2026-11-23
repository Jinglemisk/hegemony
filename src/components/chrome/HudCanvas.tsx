import type { ReactNode } from "react";
import { OVERLAY_ROOT_ID } from "./canvas";
import { useTextScale } from "./textScale";

/**
 * The HUD's design canvas: a (100vw / k) × (100vh / k) box scaled by --k from its
 * top-left corner, so chrome is authored in design px and anchors to the logical
 * edges. It passes the pointer through to the map; its direct children take it
 * back. Tooltips and popovers portal into its overlay layer, last, over the rest.
 *
 * The board draws two: the chrome that reads before the map (top bar, seal, alarms,
 * the left window) in one without an overlay layer, and the rest after the map in
 * the DOM, so Tab follows the screen; the second, later, paints over the first.
 */
export function HudCanvas({
  children,
  overlays = true,
}: {
  children: ReactNode;
  /** Holds the overlay layer tooltips and popovers portal into (one canvas only). */
  overlays?: boolean;
}) {
  // Reading the setting applies the stored Text size from the first frame.
  useTextScale();
  return (
    <div className="hud-canvas">
      {children}
      {overlays ? <div className="hud-overlays" id={OVERLAY_ROOT_ID} /> : null}
    </div>
  );
}
