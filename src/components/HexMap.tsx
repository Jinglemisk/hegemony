import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from "react";
import type { HegemonyState } from "../game/types";
import { PLAYER_COLORS } from "../game/data";
import { settlementBuildingSlots } from "../game/rules";
import { resourceCssVars } from "../ui/resourceVisuals";
import { TerrainSprite } from "./Sprites";

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startViewBox: ViewBox;
};

const HEX_SIZE = 45;
const TILE_ART_SIZE = 88;
const COLONY_POSITIONS = [-14, 14];
const BASE_VIEW_BOX: ViewBox = { x: -310, y: -270, width: 620, height: 540 };
const WORLD_VIEW_BOX: ViewBox = {
  x: BASE_VIEW_BOX.x - BASE_VIEW_BOX.width * 0.05,
  y: BASE_VIEW_BOX.y - BASE_VIEW_BOX.height * 0.05,
  width: BASE_VIEW_BOX.width * 1.1,
  height: BASE_VIEW_BOX.height * 1.1
};
const SEA_IMAGE_BLEED = 28;
const SEA_IMAGE_VIEW_BOX: ViewBox = {
  x: WORLD_VIEW_BOX.x - SEA_IMAGE_BLEED,
  y: WORLD_VIEW_BOX.y - SEA_IMAGE_BLEED,
  width: WORLD_VIEW_BOX.width + SEA_IMAGE_BLEED * 2,
  height: WORLD_VIEW_BOX.height + SEA_IMAGE_BLEED * 2
};
const MIN_ZOOM = BASE_VIEW_BOX.width / WORLD_VIEW_BOX.width;
const MAX_ZOOM = 1.18;
const ZOOM_STEP = 0.08;
const SEA_BACKDROP_HREF = new URL("../../assets/map/aegean-sea-board.png", import.meta.url).href;

export function HexMap({
  G,
  confirmation,
  pendingTileId,
  selectedTileId,
  onTileAction
}: {
  G: HegemonyState;
  confirmation: {
    label: string;
    tileId: string;
    onCancel: () => void;
    onConfirm: () => void;
  } | null;
  pendingTileId: string | null;
  selectedTileId: string | null;
  onTileAction: (tileId: string) => void;
}) {
  const [viewBox, setViewBox] = useState(BASE_VIEW_BOX);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraViewBox = useRef<ViewBox>(BASE_VIEW_BOX);
  const dragState = useRef<DragState | null>(null);
  const pendingAnimationFrame = useRef<number | null>(null);
  const pendingViewBox = useRef<ViewBox | null>(null);
  const wheelCommitTimeout = useRef<number | null>(null);
  const zoomLevel = getZoomLevel(viewBox);
  const centers = useMemo(
    () =>
      G.board.tiles.map((tile) => ({
        tile,
        x: HEX_SIZE * Math.sqrt(3) * (tile.q + tile.r / 2),
        y: HEX_SIZE * 1.5 * tile.r
      })),
    [G.board.tiles]
  );
  const shorelineEdges = useMemo(
    () =>
      getShorelineEdges(
        centers.map(({ tile, x, y }) => ({ q: tile.q, r: tile.r, x, y })),
        HEX_SIZE + 3
      ),
    [centers]
  );
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
    };
  }, []);

  const applyCameraViewBox = (nextViewBox: ViewBox) => {
    const next = clampViewBox(nextViewBox);
    cameraViewBox.current = next;
    pendingViewBox.current = next;

    if (pendingAnimationFrame.current === null) {
      pendingAnimationFrame.current = window.requestAnimationFrame(() => {
        pendingAnimationFrame.current = null;

        if (pendingViewBox.current) {
          svgRef.current?.setAttribute("viewBox", viewBoxToString(pendingViewBox.current));
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

  const finishCameraInteraction = () => {
    svgRef.current?.classList.remove("isCameraMoving");
    clearWheelCommit();
    commitCameraState();
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || isInteractiveMapTarget(event.target)) {
      return;
    }

    clearWheelCommit();
    dragState.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBox: cameraViewBox.current
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("isDraggingSea", "isCameraMoving");
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragState.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.startClientX) / bounds.width) * drag.startViewBox.width;
    const deltaY = ((event.clientY - drag.startClientY) / bounds.height) * drag.startViewBox.height;

    applyCameraViewBox({
      ...drag.startViewBox,
      x: drag.startViewBox.x - deltaX,
      y: drag.startViewBox.y - deltaY
    });
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragState.current?.pointerId === event.pointerId) {
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
    wheelCommitTimeout.current = window.setTimeout(finishCameraInteraction, 90);
  };

  const zoomBy = (delta: number) => {
    clearWheelCommit();
    applyCameraViewBox(zoomViewBox(cameraViewBox.current, getZoomLevel(cameraViewBox.current) + delta));
    commitCameraState();
  };

  return (
    <>
      <div className="mapZoomControls" aria-label="Map zoom controls">
        <button aria-label="Zoom in" disabled={!canZoomIn} onClick={() => zoomBy(ZOOM_STEP)}>
          +
        </button>
        <button aria-label="Zoom out" disabled={!canZoomOut} onClick={() => zoomBy(-ZOOM_STEP)}>
          -
        </button>
      </div>
      <svg
        ref={svgRef}
        className="hexMap"
        viewBox={viewBoxToString(viewBox)}
        role="img"
        aria-label="Hegemony island hex map"
        preserveAspectRatio="xMidYMid slice"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onWheel={handleWheel}
      >
        <image
          className="seaBackdrop"
          href={SEA_BACKDROP_HREF}
          x={SEA_IMAGE_VIEW_BOX.x}
          y={SEA_IMAGE_VIEW_BOX.y}
          width={SEA_IMAGE_VIEW_BOX.width}
          height={SEA_IMAGE_VIEW_BOX.height}
          preserveAspectRatio="xMidYMid slice"
        />
        <rect
          className="seaDragPlane"
          x={WORLD_VIEW_BOX.x}
          y={WORLD_VIEW_BOX.y}
          width={WORLD_VIEW_BOX.width}
          height={WORLD_VIEW_BOX.height}
        />
        <g className="shorelineFoam" aria-hidden="true">
          {shorelineEdges.map(({ x1, y1, x2, y2 }, index) => (
            <path
              className={index % 3 === 0 ? "shorelineFoamBreak" : "shorelineFoamLine"}
              d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`}
              key={`${x1}-${y1}-${x2}-${y2}`}
            />
          ))}
        </g>
        {centers.map(({ tile, x, y }) => {
          const city = tile.settlements.find((settlement) => settlement.kind !== "colony");
          const colonies = tile.settlements.filter((settlement) => settlement.kind === "colony");
          const shownColonies = colonies.slice(0, 2);
          const overflowColonies = Math.max(0, colonies.length - shownColonies.length);
          const isSelected = selectedTileId === tile.id;
          const isPending = pendingTileId === tile.id;
          const usedBuildingSlots = city?.buildings.length ?? 0;
          const totalBuildingSlots = city ? settlementBuildingSlots(tile, city) : tile.buildingSlots;
          return (
            <g key={tile.id} style={resourceCssVars(tile.resource.type)} transform={`translate(${x} ${y})`}>
              <foreignObject
                className="terrainObject"
                height={TILE_ART_SIZE}
                width={TILE_ART_SIZE}
                x={-TILE_ART_SIZE / 2}
                y={-TILE_ART_SIZE / 2}
              >
                <TerrainSprite terrain={tile.terrain} className="mapTerrain" />
              </foreignObject>
              <g
                aria-label={`Hex ${tile.id}, ${tile.terrain} tile, ${tile.resource.amount} ${tile.resource.type}`}
                className="svgButton"
                onClick={() => onTileAction(tile.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onTileAction(tile.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <polygon
                  className={`hexTile terrain-${tile.terrain} ${isSelected ? "selected" : ""} ${isPending ? "pending" : ""}`}
                  points={hexPoints(HEX_SIZE - 2)}
                />
              </g>
              <g className="tileMetrics" aria-hidden="true">
                <text className="tileMetric tileMetricYield" x={0} y={34}>
                  +{tile.resource.amount}
                </text>
                <text className="tileMetric tileMetricCapacity" x={0} y={-28}>
                  {usedBuildingSlots}/{totalBuildingSlots}
                </text>
              </g>
              {city ? (
                <foreignObject
                  className="settlementObject settlementGlyphObject cityObject"
                  height={42}
                  width={42}
                  x={-21}
                  y={-17}
                >
                  <div
                    className={`settlementGlyph ${city.kind === "capital" ? "capitalGlyph" : "cityGlyph"}`}
                    style={{ "--player-color": PLAYER_COLORS[city.owner] } as CSSProperties}
                  >
                    <i />
                  </div>
                </foreignObject>
              ) : null}
              {shownColonies.map((colony, index) => (
                <g
                  className="colonyGlyphDocked"
                  transform={`translate(${COLONY_POSITIONS[index]} 4)`}
                  key={`${colony.owner}-${index}`}
                >
                  <foreignObject className="settlementObject settlementGlyphObject colonyObject" height={32} width={32} x={-16} y={-16}>
                    <div
                      className="settlementGlyph colonyGlyph"
                      style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
                    >
                      <i />
                    </div>
                  </foreignObject>
                </g>
              ))}
              {overflowColonies > 0 ? (
                <g className="colonyOverflow" transform="translate(0 4)" aria-hidden="true">
                  <circle r={9} />
                  <text y={3.2}>+{overflowColonies}</text>
                </g>
              ) : null}
            </g>
          );
        })}
        {confirmation
          ? centers
              .filter(({ tile }) => tile.id === confirmation.tileId)
              .map(({ tile, x, y }) => (
                <g key={`confirm-${tile.id}`} transform={`translate(${x} ${y})`}>
                  <foreignObject className="tileConfirmObject" height={34} width={152} x={-76} y={49}>
                    <div className="tileConfirmPrompt" onClick={(event) => event.stopPropagation()}>
                      <span>{confirmation.label}</span>
                      <button
                        aria-label={`Confirm ${confirmation.label}`}
                        className="tileConfirmButton tileConfirmAccept"
                        onClick={(event) => {
                          event.stopPropagation();
                          confirmation.onConfirm();
                        }}
                      >
                        ✓
                      </button>
                      <button
                        aria-label={`Cancel ${confirmation.label}`}
                        className="tileConfirmButton tileConfirmCancel"
                        onClick={(event) => {
                          event.stopPropagation();
                          confirmation.onCancel();
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </foreignObject>
                </g>
              ))
          : null}
      </svg>
    </>
  );
}

function hexPoints(size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${Math.cos(angle) * size},${Math.sin(angle) * size}`;
  }).join(" ");
}

function viewBoxToString(viewBox: ViewBox) {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

function getZoomLevel(viewBox: ViewBox) {
  return BASE_VIEW_BOX.width / viewBox.width;
}

function zoomViewBox(
  current: ViewBox,
  zoomLevel: number,
  focus: { x: number; y: number; ratioX: number; ratioY: number } = {
    x: current.x + current.width / 2,
    y: current.y + current.height / 2,
    ratioX: 0.5,
    ratioY: 0.5
  }
) {
  const nextZoom = clamp(zoomLevel, MIN_ZOOM, MAX_ZOOM);
  const nextWidth = BASE_VIEW_BOX.width / nextZoom;
  const nextHeight = BASE_VIEW_BOX.height / nextZoom;

  return clampViewBox({
    x: focus.x - nextWidth * focus.ratioX,
    y: focus.y - nextHeight * focus.ratioY,
    width: nextWidth,
    height: nextHeight
  });
}

function clampViewBox(viewBox: ViewBox): ViewBox {
  const width = Math.min(viewBox.width, WORLD_VIEW_BOX.width);
  const height = Math.min(viewBox.height, WORLD_VIEW_BOX.height);
  const maxX = WORLD_VIEW_BOX.x + WORLD_VIEW_BOX.width - width;
  const maxY = WORLD_VIEW_BOX.y + WORLD_VIEW_BOX.height - height;

  return {
    x: clamp(viewBox.x, WORLD_VIEW_BOX.x, maxX),
    y: clamp(viewBox.y, WORLD_VIEW_BOX.y, maxY),
    width,
    height
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function viewBoxesEqual(a: ViewBox, b: ViewBox) {
  return (
    Math.abs(a.x - b.x) < 0.001 &&
    Math.abs(a.y - b.y) < 0.001 &&
    Math.abs(a.width - b.width) < 0.001 &&
    Math.abs(a.height - b.height) < 0.001
  );
}

function isInteractiveMapTarget(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest(".svgButton, .tileConfirmPrompt, button"));
}

function getShorelineEdges(
  centers: Array<{ q: number; r: number; x: number; y: number }>,
  size: number
) {
  const occupied = new Set(centers.map(({ q, r }) => coordinateKey(q, r)));
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  centers.forEach(({ q, r, x, y }) => {
    getHexCorners(x, y, size).forEach((corner, index, corners) => {
      const [neighborQ, neighborR] = getNeighborCoordinate(q, r, index);

      if (!occupied.has(coordinateKey(neighborQ, neighborR))) {
        const nextCorner = corners[(index + 1) % corners.length];
        edges.push({ x1: corner.x, y1: corner.y, x2: nextCorner.x, y2: nextCorner.y });
      }
    });
  });

  return edges;
}

function getHexCorners(x: number, y: number, size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);

    return {
      x: x + Math.cos(angle) * size,
      y: y + Math.sin(angle) * size
    };
  });
}

function getNeighborCoordinate(q: number, r: number, sideIndex: number) {
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1]
  ];
  const [deltaQ, deltaR] = directions[sideIndex];

  return [q + deltaQ, r + deltaR];
}

function coordinateKey(q: number, r: number) {
  return `${q},${r}`;
}
