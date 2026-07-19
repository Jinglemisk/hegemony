/**
 * Hex and camera maths, with no React and no game state (ladder rung R6). This
 * was buried in the bottom third of a 632-line component, which meant the
 * board's geometry — the part most likely to be wrong and easiest to prove —
 * could only be exercised by rendering the whole map.
 *
 * Everything here is a pure function of its arguments. See `hexGeometry.test.ts`.
 */

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

/** The board at rest: the frame every zoom level is expressed relative to. */
export const BASE_VIEW_BOX: ViewBox = { x: -372, y: -270, width: 744, height: 540 };

/**
 * The furthest you may pull back — base plus a margin of sea on every side. The
 * board is full-bleed against the sea, and the margin does triple duty: the
 * pan/zoom-out limit, the room the live-area reseat pans into to lift the board
 * clear of the chrome, and — since the fit-to-live seat zooms OUT to fit the whole
 * board on wide screens (`slice` scales it to cover the width, so a 21:9 monitor
 * wants ~0.45×) — the headroom that zoom needs. Generous on purpose; the resting
 * fit never reaches the floor, it only needs the room to exist.
 */
// 1.0 (was 0.7): the between-panels reseat (2026-07-19) fits the WHOLE board into
// the narrower sea BETWEEN the two widened ledger cards, which on a laptop wants to
// zoom out past the old 0.7 floor. The extra headroom only enables that resting
// zoom-out (and a little more manual pan-out); wide monitors never reach the floor.
const WORLD_MARGIN = 1.0;
export const WORLD_VIEW_BOX: ViewBox = {
  x: BASE_VIEW_BOX.x - BASE_VIEW_BOX.width * WORLD_MARGIN,
  y: BASE_VIEW_BOX.y - BASE_VIEW_BOX.height * WORLD_MARGIN,
  width: BASE_VIEW_BOX.width * (1 + WORLD_MARGIN * 2),
  height: BASE_VIEW_BOX.height * (1 + WORLD_MARGIN * 2)
};

export const MIN_ZOOM = BASE_VIEW_BOX.width / WORLD_VIEW_BOX.width;
export const MAX_ZOOM = 1.18;
export const ZOOM_STEP = 0.08;

/** Two colonies on one tile sit either side of centre; one sits on it. */
const TWO_COLONY_POSITIONS = [-14, 14];

export function getColonyXPositions(count: number) {
  if (count <= 1) {
    return [0];
  }

  return TWO_COLONY_POSITIONS;
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
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r
  };
}

/** The foam is drawn just OUTSIDE the tile, which is itself inset from HEX_SIZE. */
export const SHORELINE_RADIUS = HEX_SIZE + 3;

export function getHexCorners(x: number, y: number, size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);

    return {
      x: x + Math.cos(angle) * size,
      y: y + Math.sin(angle) * size
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
    [1, -1]
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

export function getZoomLevel(viewBox: ViewBox) {
  return BASE_VIEW_BOX.width / viewBox.width;
}

/**
 * The camera is a CSS transform on a static viewBox rather than a live viewBox
 * swap — the browser can composite a matrix without re-rasterising the SVG, so
 * panning stays smooth.
 */
export function cameraTransform(viewBox: ViewBox) {
  const scale = BASE_VIEW_BOX.width / viewBox.width;
  const translateX = BASE_VIEW_BOX.x - viewBox.x * scale;
  const translateY = BASE_VIEW_BOX.y - viewBox.y * scale;

  return `matrix(${scale} 0 0 ${scale} ${translateX} ${translateY})`;
}

/** Zoom about a focus point, keeping whatever is under it pinned there. */
export function zoomViewBox(
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

/** Keeps the camera inside the world — no pan or zoom can show past the sea. */
export function clampViewBox(viewBox: ViewBox): ViewBox {
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

/**
 * The resting seat of the camera: take a window centred on the board and slide it
 * so the board centre lands at the centre of the *live* area rather than the raw
 * window. Chrome on the left (the ledger) pushes the window left so the board
 * shows to its right; a heavier bottom bar lifts it up. The result is clamped to
 * the world, so a reseat can never expose a non-sea edge — if the world margin is
 * too small to honour the full shift the board simply gets as clear as it can.
 *
 * This is a resting move only. Panning and zooming still use {@link clampViewBox}
 * directly, so a drag's feel is unchanged and the player can pull any corner out
 * from under the chrome by hand.
 */
export function seatViewBox(rest: ViewBox, inset: WorldInset): ViewBox {
  return clampViewBox({
    ...rest,
    x: rest.x + (inset.right - inset.left) / 2,
    y: rest.y + (inset.bottom - inset.top) / 2
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Sub-thousandth differences are float noise, not a camera move. */
export function viewBoxesEqual(a: ViewBox, b: ViewBox) {
  return (
    Math.abs(a.x - b.x) < 0.001 &&
    Math.abs(a.y - b.y) < 0.001 &&
    Math.abs(a.width - b.width) < 0.001 &&
    Math.abs(a.height - b.height) < 0.001
  );
}
