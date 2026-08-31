import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HegemonyState, HexTile } from "../game/types";
import {
  BASE_VIEW_BOX,
  HEX_SIZE,
  LUXURY_MARKER_OFFSET,
  SHORELINE_RADIUS,
  boardExtent,
  cameraTransform,
  getShorelineEdges,
  getSideBySidePositions,
  hexCenter,
  luxuryMarkerPosition,
  viewBoxToString,
} from "../ui/hexGeometry";
import { selectLuxuryVertices } from "../game/mapTopology";
import { settlementNames } from "../ui/settlementNames";
import { MAX_SHOWN_SETTLEMENTS, NAME_LAYOUT, YIELD_LAYOUT } from "../ui/boardEmblems";
import type { NameSlot } from "../ui/boardEmblems";
import { TileGround, TileTokens } from "./board/map/TileGroup";
import type { SettlementPlacement } from "./board/map/TileGroup";
import { LuxuryVertexMarker } from "./board/map/LuxuryVertexMarker";
import { useBoardFrame } from "./board/map/useBoardFrame";

/**
 * The board. After R6 this file composes three pieces rather than being all of
 * them: `useBoardFrame` decides where the board sits, `hexGeometry` owns the
 * maths (and is unit-tested), `TileGroup` owns what stands on a tile.
 *
 * There is no camera and no map mode. The whole island is always on screen at
 * its one true framing, and every tile says what it is where it stands — a
 * second "terrain mode" was a copy of the board with the yields turned off, and
 * a board you can drag is a board no other surface can point at.
 */

type Box = { x0: number; x1: number; y0: number; y1: number };
type TileCenter = { tile: HexTile; x: number; y: number };

function overlaps(a: Box, b: Box) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

const NAME_SLOTS: readonly NameSlot[] = ["below", "above"];

/**
 * Arrow-key navigation over the board, by geometry rather than by index.
 *
 * The 37 hexes were 37 tab stops, so leaving the map cost 37 presses of Tab —
 * the standard answer for a grid is one tab stop and arrows inside it, which is
 * what {@link nextTileInDirection} feeds. It reads the drawn centres rather than
 * the q/r pair on purpose: "the tile to the right" is a fact about where a hex
 * was painted, and deriving it from axial coordinates would silently commit this
 * function to an orientation that `hexCenter` owns.
 *
 * The cone is 120° wide, because a pointy-top hex has no northern neighbour and
 * ArrowUp has to reach the two tiles 30° either side of vertical. Inside the
 * cone the winner is the nearest tile DIVIDED by how squarely it lies in the
 * pressed direction: the true east neighbour and the south-east one are exactly
 * the same distance away on this grid, so distance alone made ArrowRight walk
 * diagonally down the board.
 */
const ARROW_DIRECTIONS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function nextTileInDirection(centers: readonly TileCenter[], fromId: string, key: string) {
  const direction = ARROW_DIRECTIONS[key];
  const origin = centers.find(({ tile }) => tile.id === fromId);

  if (!direction || !origin) {
    return null;
  }

  let best: { id: string; cost: number } | null = null;

  for (const candidate of centers) {
    if (candidate.tile.id === fromId) {
      continue;
    }

    const dx = candidate.x - origin.x;
    const dy = candidate.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const alignment = (dx * direction[0] + dy * direction[1]) / distance;

    if (alignment < 0.5) {
      continue;
    }

    const cost = distance / alignment;

    if (!best || cost < best.cost) {
      best = { id: candidate.tile.id, cost };
    }
  }

  return best?.id ?? null;
}

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
  const highlightSet = useMemo(() => new Set(highlightTileIds ?? []), [highlightTileIds]);

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
  // The land itself, which is what the frame fits — not the coordinate window,
  // which carries a hundred units of its own sea on every side.
  const extent = useMemo(() => boardExtent(centers), [centers]);
  const { viewBox, svgRef, cameraLayerRef } = useBoardFrame(extent);
  // SHORELINE_RADIUS overhangs the tile so the foam reads as surf against the
  // land rather than a line drawn through it.
  const shorelineEdges = useMemo(() => getShorelineEdges(centers, SHORELINE_RADIUS), [centers]);
  // The moorings where luxury goods will sit (slice 1: neutral fixtures). Derived,
  // never stored — the same selector slice 2's asset registry will seed from.
  const luxuryVertices = useMemo(
    () =>
      selectLuxuryVertices(G.board.tiles, {
        count: G.ruleset.economy.luxury.coastalGoods,
        random: G.ruleset.economy.luxury.randomPlacement,
        seed: G.seed,
      }),
    [G.board.tiles, G.ruleset.economy.luxury, G.seed],
  );
  // Named once for the whole board: the mapping has to see every settlement at
  // once to guarantee no two share a name.
  const names = useMemo(() => settlementNames(G.board.tiles), [G.board.tiles]);
  const nameList = useMemo(() => [...new Set(names.values())].sort(), [names]);
  const { widths: nameWidths, register: registerNameMetric } = useMeasuredNameWidths(nameList);
  const plans = useMemo(
    () => planPlacements(centers, names, nameWidths),
    [centers, names, nameWidths],
  );
  // The board's single tab stop. It follows focus, so Tab returns you to the hex
  // you were last on rather than to the top-left corner of the island.
  const [rovingTileId, setRovingTileId] = useState<string | null>(null);
  const tabStopTileId =
    (rovingTileId && centers.some(({ tile }) => tile.id === rovingTileId) ? rovingTileId : null) ??
    selectedTileId ??
    centers[0]?.tile.id ??
    null;

  const roveTo = (fromId: string, key: string) => {
    const nextId = nextTileInDirection(centers, fromId, key);

    if (!nextId) {
      return false;
    }

    setRovingTileId(nextId);
    svgRef.current
      ?.querySelector<SVGGElement>(`[data-tile-id="${nextId}"]`)
      ?.focus({ preventScroll: true });
    return true;
  };

  const tileState = (tileId: string) => ({
    isSelected: selectedTileId === tileId,
    isPending: pendingTileId === tileId,
    isPlacementCandidate: placementActive && highlightSet.has(tileId),
    isDimmed: placementActive && !highlightSet.has(tileId),
  });

  return (
    <>
      <svg
        ref={svgRef}
        className={`hexMap${placementActive ? " placementMode" : ""}`}
        // The viewBox is fixed; the fitted frame is applied as a transform on the
        // layer below, so the board scales without the sea scaling with it.
        viewBox={viewBoxToString(BASE_VIEW_BOX)}
        role="img"
        aria-label="Hegemony island hex map"
        preserveAspectRatio="xMidYMid slice"
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
            .hexMap itself. A backdrop inside this layer would scale with the board
            rather than with the stage, which is what stretched the old chart's
            frame and sea-monsters. The sea belongs to the stage; only the island
            is drawn in here. */}
        <g ref={cameraLayerRef} className="mapBoardLayer" transform={cameraTransform(viewBox)}>
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
              isTabStop={tile.id === tabStopTileId}
              key={tile.id}
              names={names}
              onTileAction={onTileAction}
              onTileFocus={setRovingTileId}
              onTileRove={roveTo}
              state={tileState(tile.id)}
              tile={tile}
              x={x}
              y={y}
            />
          ))}

          {luxuryVertices.map((vertex) => {
            const at = luxuryMarkerPosition(vertex, HEX_SIZE, LUXURY_MARKER_OFFSET);

            return <LuxuryVertexMarker key={vertex.id} vertex={vertex} x={at.x} y={at.y} />;
          })}

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
