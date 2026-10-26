/**
 * Hex maths, with no React and no game state: axial centres, board vertices, and
 * where a luxury vertex's mooring sits. Positions are in hex units times `size`; the
 * map calls these at size 1. See `hexGeometry.test.ts`.
 */

import { axialToPlane } from "../game/mapTopology";
import type { LuxuryVertex } from "../game/mapTopology";

/**
 * Axial (q, r) → centre, for the POINTY-TOP layout, in hex units times `size` (the
 * centre-to-corner radius). Columns step by the hex's width (√3·size) with a
 * half-step of shear per row; rows step by three-quarters of its height (1.5·size).
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

/** A board vertex's position: the centroid of the three hex centres that meet at
 *  it — exact for any hex grid, no corner-index bookkeeping. */
export function vertexCenter(cells: readonly { q: number; r: number }[], size: number) {
  const points = cells.map(({ q, r }) => hexCenter(q, r, size));
  const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return { x, y };
}

/** Where a luxury vertex's marker is drawn: the vertex, pushed `offset` toward the
 *  centre of its open-sea cell. Engine identity never depends on this — it is
 *  presentation. */
export function luxuryMarkerPosition(vertex: LuxuryVertex, size: number, offset: number) {
  const at = vertexCenter(vertex.cells, size);
  const sea = hexCenter(vertex.seaCell.q, vertex.seaCell.r, size);
  const toSea = { x: sea.x - at.x, y: sea.y - at.y };
  const length = Math.hypot(toSea.x, toSea.y) || 1;

  return { x: at.x + (toSea.x / length) * offset, y: at.y + (toSea.y / length) * offset };
}
