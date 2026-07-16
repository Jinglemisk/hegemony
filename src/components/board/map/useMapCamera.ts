import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import {
  BASE_VIEW_BOX,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  cameraTransform,
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
 * How far the floating chrome reaches in over the sea, in CSS pixels — the ledger
 * panel on the left, the two glass spines top and bottom, a slim right margin.
 * These are *provisional*: Step 1 seats the board against the chrome as it floats
 * today; when the rail, verb spine and final panel land (Steps 2–3) these numbers
 * are re-measured. They exist so the resting board clears the panel now, not so
 * they are exact. See `docs/feat/ui-refit.md` §"The camera".
 */
const CHROME_INSET_PX = { top: 92, right: 48, bottom: 96, left: 380 };

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
  const worldInsetFor = (shown: ViewBox, stage: { width: number; height: number }): WorldInset => {
    const worldPerPxX = shown.width / stage.width;
    const worldPerPxY = shown.height / stage.height;

    return {
      top: CHROME_INSET_PX.top * worldPerPxY,
      bottom: CHROME_INSET_PX.bottom * worldPerPxY,
      left: CHROME_INSET_PX.left * worldPerPxX,
      right: CHROME_INSET_PX.right * worldPerPxX
    };
  };

  /**
   * Seat the resting board in the live area — the sea the chrome does not cover.
   * Keeps the current zoom, recentres a window of that size on the board, then
   * lets {@link seatViewBox} slide it clear of the panel and bars. Runs once, when
   * the stage first has a real size; a later manual pan is the player's to keep.
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

    const current = cameraViewBox.current;
    const centered: ViewBox = {
      width: current.width,
      height: current.height,
      x: BASE_VIEW_BOX.x + (BASE_VIEW_BOX.width - current.width) / 2,
      y: BASE_VIEW_BOX.y + (BASE_VIEW_BOX.height - current.height) / 2
    };
    const seated = seatViewBox(centered, worldInsetFor(current, bounds));

    hasSeated.current = true;
    cameraViewBox.current = seated;
    cameraLayerRef.current?.setAttribute("transform", cameraTransform(seated));
    setViewBox(seated);
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
