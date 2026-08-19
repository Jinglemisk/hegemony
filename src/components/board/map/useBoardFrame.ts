import { useEffect, useRef, useState } from "react";
import {
  BASE_VIEW_BOX,
  WORLD_VIEW_BOX,
  cameraTransform,
  clamp,
  seatViewBox,
  viewBoxesEqual,
  type ViewBox,
  type WorldInset,
} from "../../../ui/hexGeometry";
import { chromeInsetPx } from "../../../ui/chromeMetrics";

/**
 * Where the board sits. It is a FIXED frame, not a camera: there is no pan, no
 * zoom and no gesture arbitration, and a press on a tile is just a press on a
 * tile.
 *
 * The board is 37 hexes on one island and every one of them is meant to be on
 * screen at once — a strategy map you have to drag around is a map that is
 * lying about how big the game is. Free pan also meant the resting frame was
 * only ever true until the first scroll wheel tick, so no other surface could
 * assume where a tile would be.
 *
 * What remains is one decision, made on every resize: fit the whole board into
 * the live area — the sea the chrome does not cover — with a margin of open sea
 * all round it.
 */

/**
 * The band of open sea held between the island and the chrome, as a share of the
 * live area's short side.
 *
 * It is not decoration. Luxury goods are claimed at a vertex SHARED by two tiles
 * (docs/plans/luxury-goods.md), so a marker for one sits half on the island's
 * outline and half off it — a coastal claim draws into the water by design. A
 * frame fitted tight to the land would clip those markers against the bars the
 * moment Phase 4 lands. The margin is proportional so 1280 gets the same scene
 * smaller rather than a differently-cropped one.
 */
const SEA_MARGIN_RATIO = 0.08;
const SEA_MARGIN_MIN_PX = 32;
const SEA_MARGIN_MAX_PX = 80;

export function useBoardFrame(extent: ViewBox) {
  // Rest at the base frame so the very first paint is already board-sized; the
  // fit below then replaces it as soon as the stage reports a real size.
  const [viewBox, setViewBox] = useState(BASE_VIEW_BOX);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraLayerRef = useRef<SVGGElement | null>(null);

  /**
   * Convert the fixed CSS-pixel chrome inset into world units for the current
   * frame and stage size. Under `preserveAspectRatio="… slice"` a screen pixel is
   * a fixed slice of world along each axis, so the shown window's size over the
   * stage's size is the world-per-pixel scale.
   */
  const worldInsetFor = (
    shown: ViewBox,
    stage: { width: number; height: number },
    inset: { top: number; bottom: number; left: number; right: number },
  ): WorldInset => {
    const worldPerPxX = shown.width / stage.width;
    const worldPerPxY = shown.height / stage.height;

    return {
      top: inset.top * worldPerPxY,
      bottom: inset.bottom * worldPerPxY,
      left: inset.left * worldPerPxX,
      right: inset.right * worldPerPxX,
    };
  };

  /**
   * Fit the island into the live area (KYKLOS `fit()`), then slide that window so
   * it sits centred in the live area rather than under the chrome.
   *
   * The map SVG covers the stage (`preserveAspectRatio="… slice"`), so px-per-
   * world is `s·BASE.w / vbW` where `s = max(stageW/BASE.w, stageH/BASE.h)`.
   * Choosing `vbW = BASE.w·s / kFit`, with `kFit` the px-per-world that lands the
   * island inside the live rectangle, pulls the board back until it fits — on a
   * wide monitor `slice` would otherwise blow it up to cover the width.
   */
  const fitToLive = () => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const bounds = svg.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    // Every clearance is read from the CSS tokens (ui/chromeMetrics.ts) — the
    // frame holds no bar heights or panel widths of its own.
    const inset = chromeInsetPx();
    const liveWidth = Math.max(120, bounds.width - inset.left - inset.right);
    const liveHeight = Math.max(120, bounds.height - inset.top - inset.bottom);
    const margin = clamp(
      Math.min(liveWidth, liveHeight) * SEA_MARGIN_RATIO,
      SEA_MARGIN_MIN_PX,
      SEA_MARGIN_MAX_PX,
    );
    const sliceScale = Math.max(
      bounds.width / BASE_VIEW_BOX.width,
      bounds.height / BASE_VIEW_BOX.height,
    );
    const fitScale = Math.min(
      (liveWidth - 2 * margin) / extent.width,
      (liveHeight - 2 * margin) / extent.height,
    );
    // vbW in [BASE.w, WORLD.w]: never draw the board LARGER than its own frame,
    // never pull back past the sea the world box covers.
    const fitWidth = clamp(
      (BASE_VIEW_BOX.width * sliceScale) / fitScale,
      BASE_VIEW_BOX.width,
      WORLD_VIEW_BOX.width,
    );
    const fitHeight = fitWidth * (BASE_VIEW_BOX.height / BASE_VIEW_BOX.width);
    // Centred on the ISLAND, not on the coordinate window — the two are the same
    // only as long as the board stays symmetric about the origin.
    const centered: ViewBox = {
      width: fitWidth,
      height: fitHeight,
      x: extent.x + extent.width / 2 - fitWidth / 2,
      y: extent.y + extent.height / 2 - fitHeight / 2,
    };
    const seated = seatViewBox(centered, worldInsetFor(centered, bounds, inset));

    cameraLayerRef.current?.setAttribute("transform", cameraTransform(seated));
    setViewBox((current) => (viewBoxesEqual(current, seated) ? current : seated));
  };

  // Re-fit whenever the stage changes size. Unlike the old camera this has no
  // "seat once" guard: with no manual pan to preserve, the fit is simply true
  // again at the new size, and the observer also covers the first layout pass
  // reporting 0×0.
  useEffect(() => {
    const svg = svgRef.current;

    if (!svg || typeof ResizeObserver === "undefined") {
      return;
    }

    fitToLive();

    const observer = new ResizeObserver(() => fitToLive());
    observer.observe(svg);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extent]);

  return { viewBox, svgRef, cameraLayerRef };
}
