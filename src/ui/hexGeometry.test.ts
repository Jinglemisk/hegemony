import { describe, expect, it } from "vitest";
import {
  BASE_VIEW_BOX,
  HEX_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_VIEW_BOX,
  cameraTransform,
  clampViewBox,
  getColonyXPositions,
  SHORELINE_RADIUS,
  getHexCorners,
  hexCenter,
  getNeighborCoordinate,
  getShorelineEdges,
  getZoomLevel,
  hexPoints,
  viewBoxesEqual,
  zoomViewBox
} from "./hexGeometry";

/** Geometry only became testable when R6 pulled it out of the 632-line component. */

describe("hex shape", () => {
  it("draws six corners at hex radius", () => {
    const corners = getHexCorners(0, 0, HEX_SIZE);

    expect(corners).toHaveLength(6);

    for (const corner of corners) {
      expect(Math.hypot(corner.x, corner.y)).toBeCloseTo(HEX_SIZE, 6);
    }
  });

  it("emits a closed six-point outline", () => {
    expect(hexPoints(HEX_SIZE).split(" ")).toHaveLength(6);
  });

  it("corners are 60° apart, starting at -30°", () => {
    const [first, second] = getHexCorners(0, 0, HEX_SIZE);
    const angleOf = (p: { x: number; y: number }) => (Math.atan2(p.y, p.x) * 180) / Math.PI;

    expect(angleOf(first)).toBeCloseTo(-30, 6);
    expect(angleOf(second) - angleOf(first)).toBeCloseTo(60, 6);
  });
});

describe("layout agrees with the outline", () => {
  // The pairing R6 broke: the outline stayed pointy-top while the layout was
  // rewritten flat-top, so every tile overlapped its neighbours. Note that BOTH
  // layouts put centres √3·size apart — they are the same tiling rotated 90° —
  // so a distance check passes either way and proves nothing. The bug is the
  // MISMATCH, so each test below measures the layout against the outline's own
  // bounding box rather than against a remembered constant.

  const corners = getHexCorners(0, 0, HEX_SIZE);
  const outlineWidth = Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x));
  const outlineHeight = Math.max(...corners.map((c) => c.y)) - Math.min(...corners.map((c) => c.y));

  it("spaces columns by the outline's real width", () => {
    // Flat-top spacing steps 1.5·size while a pointy-top outline is √3·size
    // wide — a 13% overlap on every tile, which is what the board looked like.
    const columnStep = hexCenter(1, 0, HEX_SIZE).x - hexCenter(0, 0, HEX_SIZE).x;

    expect(columnStep).toBeCloseTo(outlineWidth, 6);
  });

  it("keeps same-row neighbours level", () => {
    // Pointy-top hexes in one row share a y. Flat-top spacing shears them.
    expect(hexCenter(1, 0, HEX_SIZE).y).toBeCloseTo(0, 6);
  });

  it("spaces rows by three-quarters of the outline's height", () => {
    // Rows interlock: each drops 3/4 of a hex so the points nest between.
    const rowStep = hexCenter(0, 1, HEX_SIZE).y - hexCenter(0, 0, HEX_SIZE).y;

    expect(rowStep).toBeCloseTo(outlineHeight * 0.75, 6);
    expect(hexCenter(0, 1, HEX_SIZE).x).toBeCloseTo(outlineWidth / 2, 6);
  });

  it("draws foam outside the tile, not through it", () => {
    expect(SHORELINE_RADIUS).toBeGreaterThan(HEX_SIZE);
  });
});

describe("neighbours", () => {
  it("are their own inverse across opposite sides", () => {
    // Side i and side i+3 point opposite ways: stepping both returns home.
    for (let side = 0; side < 3; side += 1) {
      const [q, r] = getNeighborCoordinate(0, 0, side);
      const [backQ, backR] = getNeighborCoordinate(q, r, side + 3);

      expect([backQ, backR]).toEqual([0, 0]);
    }
  });

  it("gives six distinct neighbours", () => {
    const seen = new Set(
      Array.from({ length: 6 }, (_, side) => getNeighborCoordinate(4, -2, side).join(","))
    );

    expect(seen.size).toBe(6);
  });
});

describe("shoreline", () => {
  it("wraps a lone hex on all six sides", () => {
    const edges = getShorelineEdges([{ q: 0, r: 0, x: 0, y: 0 }], HEX_SIZE);

    expect(edges).toHaveLength(6);
  });

  it("drops the shared edge between two neighbours", () => {
    // A hex and one neighbour: 12 sides total, but the touching pair is inland.
    const centers = [
      { q: 0, r: 0, x: 0, y: 0 },
      { q: 1, r: 0, x: HEX_SIZE * 1.5, y: HEX_SIZE * 0.866 }
    ];

    expect(getShorelineEdges(centers, HEX_SIZE)).toHaveLength(10);
  });

  it("leaves no shoreline inside a fully enclosed hex", () => {
    const ring = Array.from({ length: 6 }, (_, side) => {
      const [q, r] = getNeighborCoordinate(0, 0, side);
      return { q, r, x: 0, y: 0 };
    });
    const centers = [{ q: 0, r: 0, x: 0, y: 0 }, ...ring];
    const edges = getShorelineEdges(centers, HEX_SIZE);

    // The enclosed centre contributes nothing. Each ring hex touches the centre
    // plus two ring neighbours, so 3 of its 6 sides face open sea: 6 × 3 = 18.
    expect(edges.length).toBe(18);
  });
});

describe("camera", () => {
  it("clamps zoom to the allowed band", () => {
    expect(getZoomLevel(zoomViewBox(BASE_VIEW_BOX, 99))).toBeCloseTo(MAX_ZOOM, 6);
    expect(getZoomLevel(zoomViewBox(BASE_VIEW_BOX, 0.001))).toBeCloseTo(MIN_ZOOM, 6);
  });

  it("never pans past the world edge", () => {
    const runaway = clampViewBox({ x: -99999, y: 99999, width: BASE_VIEW_BOX.width, height: BASE_VIEW_BOX.height });

    expect(runaway.x).toBeGreaterThanOrEqual(WORLD_VIEW_BOX.x);
    expect(runaway.y + runaway.height).toBeLessThanOrEqual(WORLD_VIEW_BOX.y + WORLD_VIEW_BOX.height + 0.001);
  });

  it("never shows more than the world", () => {
    const tooWide = clampViewBox({ x: 0, y: 0, width: WORLD_VIEW_BOX.width * 4, height: WORLD_VIEW_BOX.height * 4 });

    expect(tooWide.width).toBeLessThanOrEqual(WORLD_VIEW_BOX.width);
    expect(tooWide.height).toBeLessThanOrEqual(WORLD_VIEW_BOX.height);
  });

  it("keeps the focus point pinned while zooming", () => {
    // Zoom about the box's own centre: the centre must not drift.
    const start = zoomViewBox(BASE_VIEW_BOX, 1);
    const centerBefore = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
    const zoomed = zoomViewBox(start, 1.1, { ...centerBefore, ratioX: 0.5, ratioY: 0.5 });
    const centerAfter = { x: zoomed.x + zoomed.width / 2, y: zoomed.y + zoomed.height / 2 };

    expect(centerAfter.x).toBeCloseTo(centerBefore.x, 6);
    expect(centerAfter.y).toBeCloseTo(centerBefore.y, 6);
  });

  it("is identity at the base frame", () => {
    expect(cameraTransform(BASE_VIEW_BOX)).toBe("matrix(1 0 0 1 0 0)");
  });

  it("treats float noise as no movement", () => {
    expect(viewBoxesEqual(BASE_VIEW_BOX, { ...BASE_VIEW_BOX, x: BASE_VIEW_BOX.x + 0.0001 })).toBe(true);
    expect(viewBoxesEqual(BASE_VIEW_BOX, { ...BASE_VIEW_BOX, x: BASE_VIEW_BOX.x + 1 })).toBe(false);
  });
});

describe("colony placement", () => {
  it("centres a lone colony and splits a shared tile", () => {
    expect(getColonyXPositions(0)).toEqual([0]);
    expect(getColonyXPositions(1)).toEqual([0]);
    expect(getColonyXPositions(2)).toEqual([-14, 14]);
  });
});
