import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HegemonyState, HexTile } from "../game/types";
import {
  BASE_VIEW_BOX,
  HEX_SIZE,
  SHORELINE_RADIUS,
  WORLD_VIEW_BOX,
  ZOOM_STEP,
  cameraTransform,
  getShorelineEdges,
  getSideBySidePositions,
  hexCenter,
  viewBoxToString,
} from "../ui/hexGeometry";
import { settlementNames } from "../ui/settlementNames";
import { MAX_SHOWN_SETTLEMENTS, NAME_LAYOUT, YIELD_LAYOUT } from "../ui/boardEmblems";
import type { NameSlot } from "../ui/boardEmblems";
import { TileGround, TileTokens } from "./board/map/TileGroup";
import type { SettlementPlacement } from "./board/map/TileGroup";
import { useMapCamera } from "./board/map/useMapCamera";

/**
 * The board. After R6 this file composes three pieces rather than being all of
 * them: `useMapCamera` owns pan/zoom, `hexGeometry` owns the maths (and is
 * unit-tested), `TileGroup` owns what stands on a tile.
 */

type MapMode = "current" | "terrain";

const MAP_MODE_OPTIONS: Array<{ mode: MapMode; label: string; iconHref: string }> = [
  {
    mode: "current",
    label: "Current",
    iconHref: new URL("../../assets/map-modes/current-map-mode.svg", import.meta.url).href,
  },
  {
    mode: "terrain",
    label: "Terrain",
    iconHref: new URL("../../assets/map-modes/terrain-map-mode.svg", import.meta.url).href,
  },
];

type Box = { x0: number; x1: number; y0: number; y1: number };
type TileCenter = { tile: HexTile; x: number; y: number };

function overlaps(a: Box, b: Box) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

const NAME_SLOTS: readonly NameSlot[] = ["below", "above"];

/**
 * Every distinct name on the board, measured once in the face and size it will be
 * drawn in.
 *
 * The board needs the answer BEFORE it draws anything: a plate has to be as wide as
 * its name, and a name can only know whether it has room by comparing its own box
 * with its neighbours'. So the widths come from a hidden row of the same `<text>`
 * elements rather than from a per-character constant — which is what was wrong in
 * the first place, and what would go wrong again the first time the face, the size
 * or the letter-spacing moved.
 */
function useMeasuredNameWidths(names: readonly string[]) {
  const nodes = useRef(new Map<string, SVGTextElement>());
  const [widths, setWidths] = useState<ReadonlyMap<string, number>>(new Map());

  useLayoutEffect(() => {
    let live = true;

    const measure = () => {
      const measured = new Map<string, number>();

      for (const [name, node] of nodes.current) {
        if (typeof node.getComputedTextLength !== "function") {
          return;
        }

        const width = node.getComputedTextLength();

        if (width > 0) {
          measured.set(name, width);
        }
      }

      if (live && measured.size > 0) {
        setWidths(measured);
      }
    };

    measure();
    // Cinzel may still be loading at first paint, and the fallback serif has its
    // own metrics — ask again once the real face is in.
    const fonts: FontFaceSet | undefined = document.fonts;

    if (fonts) {
      void fonts.ready.then(measure);
    }

    return () => {
      live = false;
    };
  }, [names]);

  const register = (name: string) => (node: SVGTextElement | null) => {
    if (node) {
      nodes.current.set(name, node);
    } else {
      nodes.current.delete(name);
    }
  };

  return { widths, register };
}

/**
 * Where every settlement's name hangs, decided for the whole board in one pass.
 *
 * Two settlements on adjacent hexes are 78 world units apart, and a plate wide
 * enough to hold an eight-letter name at a size still legible on a 1280 screen is
 * about that wide — so at the resting camera two neighbours simply cannot both
 * hang their names under their seals. OLYNTHOS ran into AIGAI and the pair read as
 * one word.
 *
 * The board neither shrinks the type until nobody can read it nor hides the lesser
 * name: a label that would land on one already placed flips to the slot ABOVE its
 * seal. Same-row neighbours — the case that fails — then sit in two different bands
 * and both stay whole, in place, with no leader lines to follow. Yield numerals go
 * in first as fixed obstacles, because a name reading through a "10" is the same
 * defect.
 *
 * Tiles are visited in board order, so a name never swaps slots between frames.
 */
function planPlacements(
  centers: readonly TileCenter[],
  names: Map<string, string>,
  nameWidths: ReadonlyMap<string, number>,
) {
  const taken: Box[] = [];

  for (const { tile, x, y } of centers) {
    if (tile.settlements.length > 0 || !tile.resource) {
      continue;
    }

    const half = (String(tile.resource.amount).length * YIELD_LAYOUT.digitWidth) / 2;

    taken.push({
      x0: x - half,
      x1: x + half,
      y0: y + YIELD_LAYOUT.y - YIELD_LAYOUT.height,
      y1: y + YIELD_LAYOUT.y,
    });
  }

  const plans = new Map<string, { placements: SettlementPlacement[]; overflow: number }>();

  for (const { tile, x, y } of centers) {
    if (tile.settlements.length === 0) {
      continue;
    }

    // A city outranks a colony for the centre slot: a city is the thing you look
    // for when scanning the board.
    const ordered = [...tile.settlements].sort((left, right) =>
      left.kind === "colony" && right.kind !== "colony" ? 1 : right.kind === "colony" ? -1 : 0,
    );
    const shown = ordered.slice(0, MAX_SHOWN_SETTLEMENTS);
    const offsets = getSideBySidePositions(shown.length);

    const placements = shown.map((settlement, index) => {
      const offsetX = offsets[index];
      const name = names.get(settlement.id) ?? "POLIS";
      const nameWidth = nameWidths.get(name) ?? name.length * NAME_LAYOUT.charAdvance;
      const half = (nameWidth + NAME_LAYOUT.platePad) / 2 + NAME_LAYOUT.gutter;
      const boxAt = (slot: NameSlot): Box => ({
        x0: x + offsetX - half,
        x1: x + offsetX + half,
        y0: y + NAME_LAYOUT.slotY[slot],
        y1: y + NAME_LAYOUT.slotY[slot] + NAME_LAYOUT.plateHeight,
      });
      // Below is home; above is the escape. If neither is clear the name stays
      // home rather than moving somewhere just as bad.
      const slot = NAME_SLOTS.find(
        (candidate) => !taken.some((box) => overlaps(box, boxAt(candidate))),
      );

      taken.push(boxAt(slot ?? "below"));

      return { settlement, offsetX, slot: slot ?? "below", nameWidth };
    });

    plans.set(tile.id, { placements, overflow: ordered.length - shown.length });
  }

  return plans;
}

function HexMapComponent({
  G,
  confirmation,
  pendingTileId,
  selectedTileId,
  highlightTileIds,
  placementActive = false,
  onTileAction,
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
  const {
    viewBox,
    svgRef,
    cameraLayerRef,
    canZoomIn,
    canZoomOut,
    zoomBy,
    shouldSuppressTileClick,
    cameraHandlers,
  } = useMapCamera({ onTileAction });

  const centers = useMemo(
    () =>
      G.board.tiles.map((tile) => ({
        tile,
        q: tile.q,
        r: tile.r,
        ...hexCenter(tile.q, tile.r, HEX_SIZE),
      })),
    [G.board.tiles],
  );
  // SHORELINE_RADIUS overhangs the tile so the foam reads as surf against the
  // land rather than a line drawn through it.
  const shorelineEdges = useMemo(() => getShorelineEdges(centers, SHORELINE_RADIUS), [centers]);
  // Named once for the whole board: the mapping has to see every settlement at
  // once to guarantee no two share a name.
  const names = useMemo(() => settlementNames(G.board.tiles), [G.board.tiles]);
  const nameList = useMemo(() => [...new Set(names.values())].sort(), [names]);
  const { widths: nameWidths, register: registerNameMetric } = useMeasuredNameWidths(nameList);
  const plans = useMemo(
    () => planPlacements(centers, names, nameWidths),
    [centers, names, nameWidths],
  );
  const tileState = (tileId: string) => ({
    isSelected: selectedTileId === tileId,
    isPending: pendingTileId === tileId,
    isPlacementCandidate: placementActive && highlightSet.has(tileId),
    isDimmed: placementActive && !highlightSet.has(tileId),
  });

  const isTerrainMapMode = mapMode === "terrain";
  const activeMapModeLabel =
    MAP_MODE_OPTIONS.find((option) => option.mode === mapMode)?.label ?? "Current";

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
        {/* The names, drawn once with nothing on them so they can be measured. It
            sits outside the camera layer because `getComputedTextLength` answers in
            the element's own units, which zoom does not touch. */}
        <g className="nameMetrics" aria-hidden="true">
          {nameList.map((name) => (
            <text
              className="nameText"
              fontSize={NAME_LAYOUT.fontSize}
              key={name}
              ref={registerNameMetric(name)}
            >
              {name}
            </text>
          ))}
        </g>

        {/* No sea image: KYKLOS paints the water as a static gradient + texture on
            .hexMap itself. A backdrop inside this layer would pan and zoom with the
            board, which is what dragged the old chart's frame and sea-monsters
            across the screen. Only the world moves. */}
        <g ref={cameraLayerRef} className="mapCameraLayer" transform={cameraTransform(viewBox)}>
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

          {/* Two passes over the same tiles. A name plate hangs into the tile
              below it, and SVG paints in document order, so ground and tokens
              cannot be interleaved without every plate being half-buried. */}
          {centers.map(({ tile, x, y }) => (
            <TileGround
              key={tile.id}
              names={names}
              onTileAction={onTileAction}
              onTileClick={handleTileClick}
              state={tileState(tile.id)}
              tile={tile}
              x={x}
              y={y}
            />
          ))}

          {centers.map(({ tile, x, y }) => {
            const plan = plans.get(tile.id);

            return plan ? (
              <TileTokens
                key={tile.id}
                names={names}
                overflow={plan.overflow}
                placements={plan.placements}
                state={tileState(tile.id)}
                x={x}
                y={y}
              />
            ) : null;
          })}

          {confirmation
            ? centers
                .filter(({ tile }) => tile.id === confirmation.tileId)
                .map(({ tile, x, y }) => (
                  <g key={`confirm-${tile.id}`} transform={`translate(${x} ${y})`}>
                    <foreignObject
                      className="tileConfirmObject"
                      height={34}
                      width={152}
                      x={-76}
                      y={49}
                    >
                      <div
                        className="tileConfirmPrompt"
                        onClick={(event) => event.stopPropagation()}
                      >
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
