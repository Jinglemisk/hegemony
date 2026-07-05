import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from "react";
import type { HegemonyState, MaterialResource } from "../game/types";
import { PLAYER_COLORS } from "../game/data";
import { settlementBuildingSlots } from "../game/rules";
import { resourceCssVars } from "../ui/resourceVisuals";

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
  hasMoved: boolean;
  startTileId: string | null;
};

type MapMode = "current" | "terrain";

const HEX_SIZE = 45;
const CITY_ICON_CENTER_Y = 4;
const BUILDING_SLOT_PIP_SIZE = 7.2;
const BUILDING_SLOT_PIP_GAP = 9.6;
const BUILDING_SLOT_ROW_MAX_WIDTH = 60;
const RESOURCE_YIELD_PIP_RADIUS = 4.4;
const RESOURCE_YIELD_PIP_HALO = 1.8;
const RESOURCE_YIELD_PIP_DOT_RADIUS = 1.5;
const RESOURCE_YIELD_PIP_GAP = 12.4;
const BUILDING_SLOT_PIP_Y = -22;
const RESOURCE_YIELD_PIP_Y = 27;
const TWO_COLONY_POSITIONS = [-14, 14];
const DRAG_CLICK_THRESHOLD = 5;
const TILE_CLICK_SUPPRESS_MS = 160;
const BASE_VIEW_BOX: ViewBox = { x: -372, y: -270, width: 744, height: 540 };
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
const MAP_MODE_OPTIONS: Array<{ mode: MapMode; label: string; iconHref: string }> = [
  {
    mode: "current",
    label: "Current",
    iconHref: new URL("../../assets/map-modes/current-map-mode.svg", import.meta.url).href
  },
  {
    mode: "terrain",
    label: "Terrain",
    iconHref: new URL("../../assets/map-modes/terrain-map-mode.svg", import.meta.url).href
  }
];

function HexMapComponent({
  G,
  confirmation,
  pendingTileId,
  selectedTileId,
  highlightTileIds,
  placementActive = false,
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
  highlightTileIds?: readonly string[];
  placementActive?: boolean;
  onTileAction: (tileId: string) => void;
}) {
  const [mapMode, setMapMode] = useState<MapMode>("current");
  const highlightSet = useMemo(() => new Set(highlightTileIds ?? []), [highlightTileIds]);
  const [viewBox, setViewBox] = useState(WORLD_VIEW_BOX);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraLayerRef = useRef<SVGGElement | null>(null);
  const cameraViewBox = useRef<ViewBox>(WORLD_VIEW_BOX);
  const dragState = useRef<DragState | null>(null);
  const pendingAnimationFrame = useRef<number | null>(null);
  const pendingViewBox = useRef<ViewBox | null>(null);
  const wheelCommitTimeout = useRef<number | null>(null);
  const suppressNextTileClick = useRef(false);
  const tileClickSuppressTimeout = useRef<number | null>(null);
  const zoomLevel = getZoomLevel(viewBox);
  const activeMapModeLabel = MAP_MODE_OPTIONS.find((option) => option.mode === mapMode)?.label ?? "Current";
  const isTerrainMapMode = mapMode === "terrain";
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

      if (tileClickSuppressTimeout.current !== null) {
        window.clearTimeout(tileClickSuppressTimeout.current);
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
        suppressTileClickOnce();
        onTileAction(drag.startTileId);
      } else if (drag.hasMoved && drag.startTileId) {
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

  const handleTileClick = (tileId: string, event: ReactMouseEvent<SVGGElement>) => {
    if (suppressNextTileClick.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onTileAction(tileId);
  };

  return (
    <>
      <div className="mapModeControls" aria-label="Map mode controls">
        {MAP_MODE_OPTIONS.map((option) => (
          <button
            aria-label={`${option.label} map mode`}
            aria-pressed={mapMode === option.mode}
            className={mapMode === option.mode ? "activeMapModeButton" : ""}
            key={option.mode}
            onClick={() => setMapMode(option.mode)}
            title={`${option.label} map mode`}
          >
            <img alt="" src={option.iconHref} />
          </button>
        ))}
      </div>
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
        className={`hexMap ${isTerrainMapMode ? "terrainMapMode" : "currentMapMode"}${placementActive ? " placementMode" : ""}`}
        viewBox={viewBoxToString(BASE_VIEW_BOX)}
        role="img"
        aria-label={`Hegemony island hex map, ${activeMapModeLabel} mode`}
        preserveAspectRatio="xMidYMid slice"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onWheel={handleWheel}
      >
        <g ref={cameraLayerRef} className="mapCameraLayer" transform={cameraTransform(viewBox)}>
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
            const colonyXPositions = getColonyXPositions(shownColonies.length);
            const overflowColonies = Math.max(0, colonies.length - shownColonies.length);
            const isSelected = selectedTileId === tile.id;
            const isPending = pendingTileId === tile.id;
            const isPlacementCandidate = placementActive && highlightSet.has(tile.id);
            const usedBuildingSlots = city?.buildings.length ?? 0;
            const totalBuildingSlots = city ? settlementBuildingSlots(tile, city, G.ruleset) : tile.buildingSlots;
            const buildingSlotPips = getBuildingSlotPips(totalBuildingSlots, usedBuildingSlots);
            const resourceYieldPips = getResourceYieldPipPositions(getResourceYieldPipCount(tile.resource));
            return (
              <g key={tile.id} style={resourceCssVars(tile.resource.type)} transform={`translate(${x} ${y})`}>
                <g
                  aria-label={`Hex ${tile.id}, ${tile.terrain} tile, ${tile.resource.amount} ${tile.resource.type}`}
                  className="svgButton"
                  data-tile-id={tile.id}
                  onClick={(event) => handleTileClick(tile.id, event)}
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
                    className={`hexTile terrain-${tile.terrain} ${isSelected ? "selected" : ""} ${isPending ? "pending" : ""} ${isPlacementCandidate ? "placementCandidate" : ""}`}
                    points={hexPoints(HEX_SIZE - 2)}
                  />
                </g>
                <g className="tileMetrics" aria-hidden="true">
                  {buildingSlotPips.length > 0 ? (
                    <g className="buildingSlotPips" transform={`translate(0 ${BUILDING_SLOT_PIP_Y})`}>
                      {buildingSlotPips.map((pip) => (
                        <rect
                          className={pip.filled ? "buildingSlotPip filledSlotPip" : "buildingSlotPip hollowSlotPip"}
                          height={BUILDING_SLOT_PIP_SIZE}
                          key={`slot-${pip.index}`}
                          rx={1.8}
                          width={BUILDING_SLOT_PIP_SIZE}
                          x={pip.x - BUILDING_SLOT_PIP_SIZE / 2}
                          y={-BUILDING_SLOT_PIP_SIZE / 2}
                        />
                      ))}
                    </g>
                  ) : null}
                  <g className="resourceYieldPips" transform={`translate(0 ${RESOURCE_YIELD_PIP_Y})`}>
                    {resourceYieldPips.map((pip, index) => (
                      <g key={`yield-${index}`}>
                        <circle
                          className="resourceYieldPipHalo"
                          cx={pip.x}
                          cy={pip.y}
                          r={RESOURCE_YIELD_PIP_RADIUS + RESOURCE_YIELD_PIP_HALO}
                        />
                        <circle className="resourceYieldPip" cx={pip.x} cy={pip.y} r={RESOURCE_YIELD_PIP_RADIUS} />
                        <circle
                          className="resourceYieldPipDot"
                          cx={pip.x}
                          cy={pip.y}
                          r={RESOURCE_YIELD_PIP_DOT_RADIUS}
                        />
                      </g>
                    ))}
                  </g>
                </g>
                {city ? (
                  <g
                    className="settlementShape cityShape"
                    style={{ "--player-color": PLAYER_COLORS[city.owner] } as CSSProperties}
                    transform={`translate(0 ${CITY_ICON_CENTER_Y}) scale(0.85)`}
                  >
                    <rect height={20} rx={2} width={20} x={-10} y={-10} />
                  </g>
                ) : null}
                {shownColonies.map((colony, index) => (
                  <g
                    className="colonyShapeDocked"
                    transform={`translate(${colonyXPositions[index]} 4)`}
                    key={`${colony.owner}-${index}`}
                  >
                    <g
                      className="settlementShape colonyShape"
                      style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
                      transform="scale(0.85)"
                    >
                      <path d="M 0 -11 L 10 8 L -10 8 Z" />
                    </g>
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
        </g>
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

function getColonyXPositions(count: number) {
  if (count <= 1) {
    return [0];
  }

  return TWO_COLONY_POSITIONS;
}

function getBuildingSlotPips(total: number, used: number) {
  const count = Math.max(0, Math.min(8, Math.round(total)));
  const filledCount = Math.max(0, Math.min(count, Math.round(used)));
  const gap = count > 1 ? Math.min(BUILDING_SLOT_PIP_GAP, BUILDING_SLOT_ROW_MAX_WIDTH / (count - 1)) : 0;
  const startX = -((count - 1) * gap) / 2;

  return Array.from({ length: count }, (_, index) => ({
    index,
    x: startX + index * gap,
    filled: index < filledCount
  }));
}

function getResourceYieldPipCount(yieldValue: { type: MaterialResource; amount: number }) {
  const tiers: Record<MaterialResource, number[]> = {
    wood: [1, 2, 3, 4],
    stone: [2, 4, 6, 8],
    gold: [1, 2, 3, 4],
    food: [4, 6, 8, 10]
  };
  const thresholdIndex = tiers[yieldValue.type].findIndex((threshold) => yieldValue.amount <= threshold);

  return thresholdIndex === -1 ? 4 : thresholdIndex + 1;
}

function getResourceYieldPipPositions(count: number) {
  const clamped = Math.max(1, Math.min(4, Math.round(count)));
  const startX = -((clamped - 1) * RESOURCE_YIELD_PIP_GAP) / 2;

  return Array.from({ length: clamped }, (_, index) => ({
    x: startX + index * RESOURCE_YIELD_PIP_GAP,
    y: 0
  }));
}

function viewBoxToString(viewBox: ViewBox) {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

function getZoomLevel(viewBox: ViewBox) {
  return BASE_VIEW_BOX.width / viewBox.width;
}

function cameraTransform(viewBox: ViewBox) {
  const scale = BASE_VIEW_BOX.width / viewBox.width;
  const translateX = BASE_VIEW_BOX.x - viewBox.x * scale;
  const translateY = BASE_VIEW_BOX.y - viewBox.y * scale;

  return `matrix(${scale} 0 0 ${scale} ${translateX} ${translateY})`;
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

function isMapDragBlockedTarget(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest(".tileConfirmPrompt, button"));
}

function getTileMapTargetId(target: EventTarget) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<SVGGElement>(".svgButton")?.dataset.tileId ?? null;
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

export const HexMap = memo(HexMapComponent);
