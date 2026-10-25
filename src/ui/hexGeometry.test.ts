import { describe, expect, it } from "vitest";
import { hexCenter, luxuryMarkerPosition, vertexCenter } from "./hexGeometry";
import type { AxialCell } from "../game/mapTopology";

/** Any hex size would do; one other than 1, so a dropped `size` factor shows. */
const HEX_SIZE = 45;

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
    const offset = 14;
    const at = vertexCenter(vertex.cells, HEX_SIZE);
    const marker = luxuryMarkerPosition(vertex, HEX_SIZE, offset);
    const sea = hexCenter(vertex.seaCell.q, vertex.seaCell.r, HEX_SIZE);

    expect(Math.hypot(marker.x - at.x, marker.y - at.y)).toBeCloseTo(offset, 6);
    // Seaward: the marker is closer to the sea cell's centre than the vertex is.
    expect(Math.hypot(marker.x - sea.x, marker.y - sea.y)).toBeLessThan(
      Math.hypot(at.x - sea.x, at.y - sea.y),
    );
  });
});
