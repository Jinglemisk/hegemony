import { useEffect, useState } from "react";

/**
 * The HUD canvas: the shell is drawn on a 1440×900 design canvas and scaled
 * uniformly to the screen, k = min(width / 1440, height / 900), held to 0.75…2.
 * The 3D map stays outside it at native resolution.
 *
 * Coordinates: getBoundingClientRect and pointer events are in SCREEN px; a box
 * drawn inside the canvas is in DESIGN px. Divide a screen length by
 * `overlayScale()` to get design px.
 */

const DESIGN_W = 1440;
const DESIGN_H = 900;

/** The element overlays portal into: the canvas's overlay layer, or the body when no canvas is mounted. */
export const OVERLAY_ROOT_ID = "hud-overlays";

/** The canvas's scale for a screen of this size. */
export function fitScale(width: number, height: number): number {
  const k = Math.min(width / DESIGN_W, height / DESIGN_H);
  return Math.min(2, Math.max(0.75, Number.isFinite(k) && k > 0 ? k : 1));
}

/** The canvas's scale for the current window, kept up to date on resize. */
export function useFitScale(): number {
  const [k, setK] = useState(() =>
    typeof window === "undefined" ? 1 : fitScale(window.innerWidth, window.innerHeight),
  );
  useEffect(() => {
    const update = () => setK(fitScale(window.innerWidth, window.innerHeight));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return k;
}

/** Where a tooltip or popover portals: inside the scaled canvas when one is mounted. */
export function overlayRoot(): HTMLElement {
  return document.getElementById(OVERLAY_ROOT_ID) ?? document.body;
}

/** Screen px per design px where overlays draw (1 when they portal to the body). */
export function overlayScale(root: HTMLElement = overlayRoot()): number {
  const canvas = root.closest<HTMLElement>(".hud-canvas");
  if (!canvas || !canvas.offsetWidth) return 1;
  return canvas.getBoundingClientRect().width / canvas.offsetWidth || 1;
}
