import { describe, expect, it } from "vitest";
import {
  getHexCorners,
  hexCenter,
  hexPoints,
  LUXURY_MARKER_OFFSET,
  luxuryMarkerPosition,
  vertexCenter,
} from "./hexGeometry";
import type { AxialCell } from "../game/mapTopology";

/** Tiles are drawn at a hex radius of 45 here; any radius would do. */
const HEX_SIZE = 45;

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
});

describe("luxury vertex projection", () => {
  // The vertex where tiles (0,0), (1,0) and the sea cell (1,-1) meet.
  const vertex = {
    id: "0,0|1,-1|1,0",
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 1, r: 0 },
    ] as [AxialCell, AxialCell, AxialCell],
    tileIds: ["0,0", "1,0"] as [string, string],
    seaCell: { q: 1, r: -1 },
  };

  it("puts a vertex equidistant from the three hex centres that meet at it", () => {
    const at = vertexCenter(vertex.cells, HEX_SIZE);
    const distances = vertex.cells.map(({ q, r }) => {
      const centre = hexCenter(q, r, HEX_SIZE);
      return Math.hypot(centre.x - at.x, centre.y - at.y);
    });

    expect(distances[1]).toBeCloseTo(distances[0], 6);
    expect(distances[2]).toBeCloseTo(distances[0], 6);
    // …and that distance is the hex radius: corners sit at HEX_SIZE from centre.
    expect(distances[0]).toBeCloseTo(HEX_SIZE, 6);
  });

  it("moors the marker the offset distance seaward of its vertex", () => {
    const at = vertexCenter(vertex.cells, HEX_SIZE);
    const marker = luxuryMarkerPosition(vertex, HEX_SIZE, LUXURY_MARKER_OFFSET);
    const sea = hexCenter(vertex.seaCell.q, vertex.seaCell.r, HEX_SIZE);

    expect(Math.hypot(marker.x - at.x, marker.y - at.y)).toBeCloseTo(LUXURY_MARKER_OFFSET, 6);
    // Seaward: the marker is closer to the sea cell's centre than the vertex is.
    expect(Math.hypot(marker.x - sea.x, marker.y - sea.y)).toBeLessThan(
      Math.hypot(at.x - sea.x, at.y - sea.y),
    );
  });
});
