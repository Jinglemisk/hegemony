/**
 * Hex maths, with no React and no game state: the pointy-top outline, axial
 * centres, and where a luxury vertex's mooring sits. See `hexGeometry.test.ts`.
 */

import { axialToPlane } from "../game/mapTopology";
import type { LuxuryVertex } from "../game/mapTopology";

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

export function getHexCorners(x: number, y: number, size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);

    return {
      x: x + Math.cos(angle) * size,
      y: y + Math.sin(angle) * size,
    };
  });
}
