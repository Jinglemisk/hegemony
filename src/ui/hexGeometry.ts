/**
 * Hex and camera maths, with no React and no game state (ladder rung R6). This
 * was buried in the bottom third of a 632-line component, which meant the
 * board's geometry — the part most likely to be wrong and easiest to prove —
 * could only be exercised by rendering the whole map.
 *
 * Everything here is a pure function of its arguments. See `hexGeometry.test.ts`.
 */

import { axialToPlane } from "../game/mapTopology";
import type { LuxuryVertex } from "../game/mapTopology";

export type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HexCenter = { q: number; r: number; x: number; y: number };
export type ShorelineEdge = { x1: number; y1: number; x2: number; y2: number };

/**
 * How much of each edge of the shown window is hidden behind floating chrome,
 * in world units — the KYKLOS `live()` idea (the area the player can actually
 * *see* of the sea) ported into the camera's own coordinate space. A left-heavy
 * inset (the ledger panel) means the resting board must sit to the right of the
 * window's centre so nothing important hides under the panel.
 */
export type WorldInset = { top: number; right: number; bottom: number; left: number };

export const HEX_SIZE = 45;

/** The board's own frame: the coordinate system every tile is drawn in, and the
 *  window the fitted board frame is expressed relative to. */
export const BASE_VIEW_BOX: ViewBox = { x: -372, y: -270, width: 744, height: 540 };

/**
 * How far the world extends past the board — base plus a margin of sea on every
 * side. It is the room {@link seatViewBox} slides into to lift the board clear of
 * the chrome, and the headroom the fit needs: `slice` scales the map to COVER the
 * stage, so fitting the whole island into the sea between two ledger tablets
 * means pulling back well past 1× on a wide monitor. Generous on purpose; the
 * fit never reaches the floor, it only needs the room to exist.
 */
const WORLD_MARGIN = 1.0;
export const WORLD_VIEW_BOX: ViewBox = {
  x: BASE_VIEW_BOX.x - BASE_VIEW_BOX.width * WORLD_MARGIN,
  y: BASE_VIEW_BOX.y - BASE_VIEW_BOX.height * WORLD_MARGIN,
  width: BASE_VIEW_BOX.width * (1 + WORLD_MARGIN * 2),
  height: BASE_VIEW_BOX.height * (1 + WORLD_MARGIN * 2),
};

/** Two settlements on one tile sit either side of centre; one sits on it. The
 *  offset is half a seal plus a keyline's clearance — a tile may hold a city and
 *  a rival's colony at once, and the two seals must not touch. */
const SIDE_BY_SIDE_POSITIONS = [-22, 22];

export function getSideBySidePositions(count: number) {
  return count <= 1 ? [0] : SIDE_BY_SIDE_POSITIONS;
}

/**
 * The bounding box of the drawn island, in world units.
 *
 * The frame used to fit {@link BASE_VIEW_BOX} instead, which is the coordinate
 * window rather than the land: it carries about a hundred units of its own sea on
 * every side, so fitting it meant the real margin around the island was that
 * built-in sea PLUS whatever margin was asked for, and the board came out a third
 * smaller than the space it was given. Every other length in the frame — the
 * tablets' reserve, the sea margin — had a fudge factor in it to compensate.
 * Measure the land and the fudges go away.
 */
export function boardExtent(centers: readonly { x: number; y: number }[]): ViewBox {
  if (centers.length === 0) {
    return BASE_VIEW_BOX;
  }

  // A pointy-top hex is `size` tall from centre to vertex and `size·cos30` wide
  // from centre to flat.
  const halfWidth = HEX_SIZE * Math.cos(Math.PI / 6);
  const xs = centers.map(({ x }) => x);
  const ys = centers.map(({ y }) => y);
  const minX = Math.min(...xs) - halfWidth;
  const maxX = Math.max(...xs) + halfWidth;
  const minY = Math.min(...ys) - HEX_SIZE;
  const maxY = Math.max(...ys) + HEX_SIZE;

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * POINTY-TOP hex outline, as an SVG `points` string: corners at −30° + 60°·i put
 * vertices straight up and down, and flats on the left and right.
 *
 * The orientation here and the spacing in {@link hexCenter} are one decision, not
 * two — mixing a pointy-top outline with flat-top spacing overlaps every tile.
 */
export function hexPoints(size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${Math.cos(angle) * size},${Math.sin(angle) * size}`;
  }).join(" ");
}

/**
 * Axial (q, r) → pixel centre, for the POINTY-TOP layout that {@link hexPoints}
 * draws. Columns step by the hex's width (√3·size) with a half-step of shear per
 * row; rows step by three-quarters of its height (1.5·size).
 *
 * Transposing these two — 1.5·size on x, √3·size on y — is the flat-top layout,
 * and silently produces a board of overlapping tiles.
 */
export function hexCenter(q: number, r: number, size: number) {
  // The unit embedding is the engine's (mapTopology owns the formula, so the
  // luxury-vertex angular order and the drawn board can never disagree).
  const plane = axialToPlane(q, r);
  return { x: plane.x * size, y: plane.y * size };
}

/** A board vertex's pixel position: the centroid of the three hex centres that
 *  meet at it — exact for any hex grid, no corner-index bookkeeping. */
export function vertexCenter(cells: readonly { q: number; r: number }[], size: number) {
  const points = cells.map(({ q, r }) => hexCenter(q, r, size));
  const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return { x, y };
}

/** How far a luxury marker stands off its vertex, into open water — past the foam
 *  ({@link SHORELINE_RADIUS}) so the good reads as moored off the coast, not on it. */
export const LUXURY_MARKER_OFFSET = 14;

/** Where a luxury vertex's marker is drawn: the vertex, pushed toward the centre of
 *  its open-sea cell. Engine identity never depends on this — it is presentation. */
export function luxuryMarkerPosition(vertex: LuxuryVertex, size: number, offset: number) {
  const at = vertexCenter(vertex.cells, size);
  const sea = hexCenter(vertex.seaCell.q, vertex.seaCell.r, size);
  const toSea = { x: sea.x - at.x, y: sea.y - at.y };
  const length = Math.hypot(toSea.x, toSea.y) || 1;

  return { x: at.x + (toSea.x / length) * offset, y: at.y + (toSea.y / length) * offset };
}

/** The foam is drawn just OUTSIDE the tile, which is itself inset from HEX_SIZE. */
export const SHORELINE_RADIUS = HEX_SIZE + 3;

export function getHexCorners(x: number, y: number, size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);

    return {
      x: x + Math.cos(angle) * size,
      y: y + Math.sin(angle) * size,
    };
  });
}

/** Axial neighbour, indexed to match the corner order of {@link getHexCorners}. */
export function getNeighborCoordinate(q: number, r: number, sideIndex: number) {
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  const [deltaQ, deltaR] = directions[sideIndex];

  return [q + deltaQ, r + deltaR];
}

export function coordinateKey(q: number, r: number) {
  return `${q},${r}`;
}

/** Every hex edge with no neighbour behind it — i.e. where the land meets the sea. */
export function getShorelineEdges(centers: HexCenter[], size: number): ShorelineEdge[] {
  const occupied = new Set(centers.map(({ q, r }) => coordinateKey(q, r)));
  const edges: ShorelineEdge[] = [];

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

export function viewBoxToString(viewBox: ViewBox) {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

/**
 * The frame is a CSS transform on a static viewBox rather than a live viewBox
 * swap — the browser can composite a matrix without re-rasterising the SVG, so a
 * re-fit on resize costs one matrix rather than 37 re-rasterised hexes.
 */
export function cameraTransform(viewBox: ViewBox) {
  const scale = BASE_VIEW_BOX.width / viewBox.width;
  const translateX = BASE_VIEW_BOX.x - viewBox.x * scale;
  const translateY = BASE_VIEW_BOX.y - viewBox.y * scale;

  return `matrix(${scale} 0 0 ${scale} ${translateX} ${translateY})`;
}

/** Keeps the frame inside the world — no fit can show past the sea. */
export function clampViewBox(viewBox: ViewBox): ViewBox {
  const width = Math.min(viewBox.width, WORLD_VIEW_BOX.width);
  const height = Math.min(viewBox.height, WORLD_VIEW_BOX.height);
  const maxX = WORLD_VIEW_BOX.x + WORLD_VIEW_BOX.width - width;
  const maxY = WORLD_VIEW_BOX.y + WORLD_VIEW_BOX.height - height;

  return {
    x: clamp(viewBox.x, WORLD_VIEW_BOX.x, maxX),
    y: clamp(viewBox.y, WORLD_VIEW_BOX.y, maxY),
    width,
    height,
  };
}

/**
 * Seat a window centred on the board so the board's centre lands at the centre of
 * the *live* area rather than the raw window. Chrome on the left (the ledger)
 * pushes the window left so the board shows to its right; a heavier bottom bar
 * lifts it up. The result is clamped to the world, so a seat can never expose a
 * non-sea edge — if the world margin is too small to honour the full shift the
 * board simply gets as clear as it can.
 */
export function seatViewBox(rest: ViewBox, inset: WorldInset): ViewBox {
  return clampViewBox({
    ...rest,
    x: rest.x + (inset.right - inset.left) / 2,
    y: rest.y + (inset.bottom - inset.top) / 2,
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Sub-thousandth differences are float noise, not a re-fit. */
export function viewBoxesEqual(a: ViewBox, b: ViewBox) {
  return (
    Math.abs(a.x - b.x) < 0.001 &&
    Math.abs(a.y - b.y) < 0.001 &&
    Math.abs(a.width - b.width) < 0.001 &&
    Math.abs(a.height - b.height) < 0.001
  );
}
