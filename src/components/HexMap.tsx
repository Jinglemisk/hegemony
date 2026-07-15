import { memo, useMemo, useState } from "react";
import type { HegemonyState } from "../game/types";
import {
  BASE_VIEW_BOX,
  HEX_SIZE,
  SEA_IMAGE_VIEW_BOX,
  SHORELINE_RADIUS,
  WORLD_VIEW_BOX,
  ZOOM_STEP,
  cameraTransform,
  getShorelineEdges,
  hexCenter,
  viewBoxToString
} from "../ui/hexGeometry";
import { TileGroup } from "./board/map/TileGroup";
import { useMapCamera } from "./board/map/useMapCamera";

/**
 * The board. After R6 this file composes three pieces rather than being all of
 * them: `useMapCamera` owns pan/zoom, `hexGeometry` owns the maths (and is
 * unit-tested), `TileGroup` owns what stands on a tile.
 */

type MapMode = "current" | "terrain";

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
  const { viewBox, svgRef, cameraLayerRef, canZoomIn, canZoomOut, zoomBy, shouldSuppressTileClick, cameraHandlers } =
    useMapCamera({ onTileAction });

  const centers = useMemo(
    () => G.board.tiles.map((tile) => ({ tile, q: tile.q, r: tile.r, ...hexCenter(tile.q, tile.r, HEX_SIZE) })),
    [G.board.tiles]
  );
  // SHORELINE_RADIUS overhangs the tile so the foam reads as surf against the
  // land rather than a line drawn through it.
  const shorelineEdges = useMemo(() => getShorelineEdges(centers, SHORELINE_RADIUS), [centers]);

  const isTerrainMapMode = mapMode === "terrain";
  const activeMapModeLabel = MAP_MODE_OPTIONS.find((option) => option.mode === mapMode)?.label ?? "Current";

  const handleTileClick = (tileId: string, event: React.MouseEvent<SVGGElement>) => {
    // The camera already fired this tile's action on pointer-up; swallow the
    // click the browser sends afterwards so a press never counts twice.
    if (shouldSuppressTileClick()) {
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
        // The viewBox is fixed; the camera moves via a transform on the layer below.
        viewBox={viewBoxToString(BASE_VIEW_BOX)}
        role="img"
        aria-label={`Hegemony island hex map, ${activeMapModeLabel} mode`}
        preserveAspectRatio="xMidYMid slice"
        {...cameraHandlers}
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

          {centers.map(({ tile, x, y }) => (
            <TileGroup
              isPending={pendingTileId === tile.id}
              isPlacementCandidate={placementActive && highlightSet.has(tile.id)}
              isSelected={selectedTileId === tile.id}
              key={tile.id}
              onTileAction={onTileAction}
              onTileClick={handleTileClick}
              ruleset={G.ruleset}
              tile={tile}
              x={x}
              y={y}
            />
          ))}

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

export const HexMap = memo(HexMapComponent);
