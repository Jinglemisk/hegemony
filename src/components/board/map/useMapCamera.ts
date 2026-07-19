import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import {
  BASE_VIEW_BOX,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_VIEW_BOX,
  ZOOM_STEP,
  cameraTransform,
  clamp,
  clampViewBox,
  getZoomLevel,
  seatViewBox,
  viewBoxesEqual,
  zoomViewBox,
  type ViewBox,
  type WorldInset
} from "../../../ui/hexGeometry";

/**
 * Pan, zoom and click-vs-drag arbitration for the board (ladder rung R6). None of
 * this knows what a tile *is* — it moves a camera over an SVG and reports which
 * element a press landed on, so the map component can stay about the board.
 *
 * Two things here are load-bearing and easy to break:
 *
 * 1. The camera writes a `transform` attribute straight to the DOM through
 *    `requestAnimationFrame`, and only commits to React state when the gesture
 *    settles. Rendering every pointer move through React would re-render 37 tiles
 *    per frame; this keeps a drag at compositor speed.
 * 2. A press that moves more than a few pixels is a pan, not a tile click — and
 *    the tile's own onClick still fires afterwards, so the drag has to suppress
 *    the click that follows it.
 */

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewBox: ViewBox;
  hasMoved: boolean;
  startTileId: string | null;
};

/** Below this many pixels of travel, a press is still a click. */
const DRAG_CLICK_THRESHOLD = 5;
/** How long a completed drag keeps eating the click it would otherwise fire. */
const TILE_CLICK_SUPPRESS_MS = 160;
/** Idle gap after the last wheel tick before the zoom is committed to state. */
const WHEEL_COMMIT_MS = 90;

/**
 * Top/bottom clearance held under the two opaque full-width spines, in CSS px.
 * Left/right are NOT fixed — they are measured per-seat from the live ledger-card
 * widths (see {@link sideInsetPx}), so the board tracks --ui-scale automatically.
 */
const CHROME_INSET_TB = { top: 96, bottom: 100 };

/**
 * How far to pull the side inset IN from each ledger card's full reach, in CSS px
 * at ui-scale 1. The seat fits the whole BASE_VIEW_BOX (744 wide) into the live
 * area, but the tile cluster is ~540 wide, so the frame carries ~100px/side of its
 * own sea margin. Reserving the card's full reach therefore over-clears (board too
 * small, dead sea); pulling in ~84 lets that built-in margin sit under the card
 * instead, landing the tiles ~40px clear of the card at a laptop width. Wider
 * monitors go height-bound and clear by more — never less.
 */
const PANEL_CLEAR_PULL_PX = 84;

/** Resolve a CSS length expression (a var/calc) to CSS pixels by measuring a probe.
 *  Custom properties don't resolve through getComputedStyle, so we measure. The
 *  chrome tokens (--panel-w, --rail-w, …) live on `.shell`, NOT :root, so the probe
 *  MUST be hosted inside `.shell` to inherit them — on document.body they read 0. */
function measureCssLength(expression: string): number {
  const host = document.querySelector(".shell") ?? document.body;
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;width:${expression}`;
  host.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

/**
 * The resting board sits in the sea BETWEEN the two ledger cards (2026-07-19, owner
 * ask — the cards widened toward the centre to reclaim the empty sea they used to
 * float over). Each side reserves a card's reach — its edge offset plus its width —
 * less a sea overlap, so the board fills the gap and clears each card by a small
 * margin. Left/right stay SYMMETRIC so the board centres on the viewport, under the
 * medallion (an asymmetric left of 210 once shoved it 70px right — the old "map is
 * off" bug). Reads the live CSS tokens, so it follows --ui-scale and any --panel-w
 * change with no second source of truth.
 */
function sideInsetPx() {
  const cardOffset = measureCssLength("calc(var(--rail-w) + var(--bub-out) + 14px)");
  const leftCard = measureCssLength("var(--panel-w)");
  const rightCard = measureCssLength("var(--chron-w)");
  const pull = PANEL_CLEAR_PULL_PX * (leftCard / 360 || 1);

  return {
    left: Math.max(70, cardOffset + leftCard - pull),
    right: Math.max(70, cardOffset + rightCard - pull)
  };
}

/** Buttons and the confirm prompt own their own pointers — never pan under them. */
function isMapDragBlockedTarget(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest(".tileConfirmPrompt, button"));
}

function getTileMapTargetId(target: EventTarget) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<SVGGElement>(".svgButton")?.dataset.tileId ?? null;
}

export function useMapCamera({ onTileAction }: { onTileAction: (tileId: string) => void }) {
  // Rest at the base frame (zoom 1.0), not fully pulled back — the reseat below
  // then slides it clear of the chrome. Starting at BASE means the very first
  // paint is already board-sized, so there is no zoom-out flash before the seat.
  const [viewBox, setViewBox] = useState(BASE_VIEW_BOX);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraLayerRef = useRef<SVGGElement | null>(null);
  const cameraViewBox = useRef<ViewBox>(BASE_VIEW_BOX);
  const hasSeated = useRef(false);
  const dragState = useRef<DragState | null>(null);
  const pendingAnimationFrame = useRef<number | null>(null);
  const pendingViewBox = useRef<ViewBox | null>(null);
  const wheelCommitTimeout = useRef<number | null>(null);
  const suppressNextTileClick = useRef(false);
  const tileClickSuppressTimeout = useRef<number | null>(null);

  const zoomLevel = getZoomLevel(viewBox);
  const canZoomIn = zoomLevel < MAX_ZOOM - 0.01;
  const canZoomOut = zoomLevel > MIN_ZOOM + 0.01;

  useEffect(() => {
    return () => {
      if (pendingAnimationFrame.current !== null) {
        window.cancelAnimationFrame(pendingAnimationFrame.current);
      }

      if (wheelCommitTimeout.current !== null) {
        window.clearTimeout(wheelCommitTimeout.current);
      }

      if (tileClickSuppressTimeout.current !== null) {
        window.clearTimeout(tileClickSuppressTimeout.current);
      }
    };
  }, []);

  /**
   * Convert the fixed CSS-pixel chrome inset into world units for the current zoom
   * and stage size. Under `preserveAspectRatio="… slice"` a screen pixel is a
   * fixed slice of world along each axis, so the shown window's size over the
   * stage's size is the world-per-pixel scale.
   */
  const worldInsetFor = (
    shown: ViewBox,
    stage: { width: number; height: number },
    inset: { top: number; bottom: number; left: number; right: number }
  ): WorldInset => {
    const worldPerPxX = shown.width / stage.width;
    const worldPerPxY = shown.height / stage.height;

    return {
      top: inset.top * worldPerPxY,
      bottom: inset.bottom * worldPerPxY,
      left: inset.left * worldPerPxX,
      right: inset.right * worldPerPxX
    };
  };

  /**
   * Seat the resting board in the live area — the sea the chrome does not cover —
   * *fitting the whole board there* (KYKLOS `fit()`). The map SVG covers the stage
   * (`preserveAspectRatio="… slice"`), so a screen pixel is `(BASE.w/vbW)·s` world
   * units where `s = max(stageW/BASE.w, stageH/BASE.h)`. Choosing the window width
   * `vbW = BASE.w·s / kFit`, with `kFit` the px-per-world that fits BASE into the
   * live rectangle, zooms the board out until it fits (on a wide monitor `slice`
   * would otherwise blow it up to cover the width). Then {@link seatViewBox} slides
   * that window so the board sits centred in the live area, not under the chrome.
   * Runs once, when the stage first has a real size; a later manual pan is kept.
   */
  const reseatToLive = () => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const bounds = svg.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const side = sideInsetPx();
    const inset = { top: CHROME_INSET_TB.top, bottom: CHROME_INSET_TB.bottom, left: side.left, right: side.right };
    const liveWidth = Math.max(120, bounds.width - inset.left - inset.right);
    const liveHeight = Math.max(120, bounds.height - inset.top - inset.bottom);
    const pad = 28;
    const sliceScale = Math.max(bounds.width / BASE_VIEW_BOX.width, bounds.height / BASE_VIEW_BOX.height);
    const fitScale = Math.min(
      (liveWidth - 2 * pad) / BASE_VIEW_BOX.width,
      (liveHeight - 2 * pad) / BASE_VIEW_BOX.height
    );
    // vbW in [BASE.w, WORLD.w] → zoom in [MIN_ZOOM, 1.0]: never zoom past the base
    // frame at rest, never past the sea.
    const fitWidth = clamp((BASE_VIEW_BOX.width * sliceScale) / fitScale, BASE_VIEW_BOX.width, WORLD_VIEW_BOX.width);
    const fitHeight = fitWidth * (BASE_VIEW_BOX.height / BASE_VIEW_BOX.width);
    const centered: ViewBox = {
      width: fitWidth,
      height: fitHeight,
      x: BASE_VIEW_BOX.x + (BASE_VIEW_BOX.width - fitWidth) / 2,
      y: BASE_VIEW_BOX.y + (BASE_VIEW_BOX.height - fitHeight) / 2
    };
    const seated = seatViewBox(centered, worldInsetFor(centered, bounds, inset));

    hasSeated.current = true;
    cameraViewBox.current = seated;
    setViewBox(seated);
    cameraLayerRef.current?.setAttribute("transform", cameraTransform(seated));
  };

  // Seat the board clear of the chrome as soon as the stage has a real size. The
  // observer covers the first layout pass reporting 0×0; once seated it stops, so
  // a later manual pan is never yanked back.
  useEffect(() => {
    const svg = svgRef.current;

    if (!svg || typeof ResizeObserver === "undefined") {
      return;
    }

    const seatOnce = () => {
      if (!hasSeated.current) {
        reseatToLive();
      }
    };

    seatOnce();

    const observer = new ResizeObserver(seatOnce);
    observer.observe(svg);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCameraViewBox = (nextViewBox: ViewBox) => {
    const next = clampViewBox(nextViewBox);
    cameraViewBox.current = next;
    pendingViewBox.current = next;

    if (pendingAnimationFrame.current === null) {
      pendingAnimationFrame.current = window.requestAnimationFrame(() => {
        pendingAnimationFrame.current = null;

        if (pendingViewBox.current) {
          cameraLayerRef.current?.setAttribute("transform", cameraTransform(pendingViewBox.current));
          pendingViewBox.current = null;
        }
      });
    }

    return next;
  };

  const commitCameraState = () => {
    const next = cameraViewBox.current;
    setViewBox((current) => (viewBoxesEqual(current, next) ? current : next));
  };

  const clearWheelCommit = () => {
    if (wheelCommitTimeout.current !== null) {
      window.clearTimeout(wheelCommitTimeout.current);
      wheelCommitTimeout.current = null;
    }
  };

  const suppressTileClickOnce = () => {
    suppressNextTileClick.current = true;

    if (tileClickSuppressTimeout.current !== null) {
      window.clearTimeout(tileClickSuppressTimeout.current);
    }

    tileClickSuppressTimeout.current = window.setTimeout(() => {
      suppressNextTileClick.current = false;
      tileClickSuppressTimeout.current = null;
    }, TILE_CLICK_SUPPRESS_MS);
  };

  const finishCameraInteraction = () => {
    svgRef.current?.classList.remove("isCameraMoving");
    clearWheelCommit();
    commitCameraState();
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || isMapDragBlockedTarget(event.target)) {
      return;
    }

    clearWheelCommit();
    dragState.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBox: cameraViewBox.current,
      hasMoved: false,
      startTileId: getTileMapTargetId(event.target)
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("isDraggingSea");
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragState.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const clientDeltaX = event.clientX - drag.startClientX;
    const clientDeltaY = event.clientY - drag.startClientY;

    if (!drag.hasMoved) {
      if (Math.hypot(clientDeltaX, clientDeltaY) < DRAG_CLICK_THRESHOLD) {
        return;
      }

      drag.hasMoved = true;
      event.currentTarget.classList.add("isCameraMoving");
    }

    const deltaX = (clientDeltaX / bounds.width) * drag.startViewBox.width;
    const deltaY = (clientDeltaY / bounds.height) * drag.startViewBox.height;

    applyCameraViewBox({
      ...drag.startViewBox,
      x: drag.startViewBox.x - deltaX,
      y: drag.startViewBox.y - deltaY
    });
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragState.current;

    if (drag?.pointerId === event.pointerId) {
      if (drag.startTileId && !drag.hasMoved) {
        // A still press on a tile IS the tile click — fire it here and eat the
        // browser's own click, so a press never counts twice.
        suppressTileClickOnce();
        onTileAction(drag.startTileId);
      } else if (drag.hasMoved && drag.startTileId) {
        // A drag that began on a tile must not also select it.
        suppressTileClickOnce();
      }

      dragState.current = null;
      event.currentTarget.classList.remove("isDraggingSea");
      finishCameraInteraction();
    }
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const ratioX = (event.clientX - bounds.left) / bounds.width;
    const ratioY = (event.clientY - bounds.top) / bounds.height;
    const current = cameraViewBox.current;
    // Zoom about the cursor, so the tile under it stays under it.
    const focus = {
      x: current.x + current.width * ratioX,
      y: current.y + current.height * ratioY,
      ratioX,
      ratioY
    };
    const direction = event.deltaY > 0 ? -1 : 1;
    event.currentTarget.classList.add("isCameraMoving");
    applyCameraViewBox(zoomViewBox(current, getZoomLevel(current) + direction * ZOOM_STEP, focus));
    clearWheelCommit();
    wheelCommitTimeout.current = window.setTimeout(finishCameraInteraction, WHEEL_COMMIT_MS);
  };

  const zoomBy = (delta: number) => {
    clearWheelCommit();
    applyCameraViewBox(zoomViewBox(cameraViewBox.current, getZoomLevel(cameraViewBox.current) + delta));
    commitCameraState();
  };

  /** Guards a tile's own onClick against the one that follows a drag. */
  const shouldSuppressTileClick = () => suppressNextTileClick.current;

  return {
    viewBox,
    baseViewBox: BASE_VIEW_BOX,
    svgRef,
    cameraLayerRef,
    canZoomIn,
    canZoomOut,
    zoomBy,
    shouldSuppressTileClick,
    /** Spread onto the <svg>. */
    cameraHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
      onWheel: handleWheel
    }
  };
}
