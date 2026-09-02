import { AXIAL_DIRECTIONS, occupiedCoordinates } from "./map";
import { shuffleWithSeed } from "./core/rng";

/**
 * Board vertex topology (docs/plans/luxury-goods.md, slice 1).
 *
 * A luxury good sits at the shared vertex of two coastal tiles, claimable by a Port
 * on either. Everything here is pure geometry over tile coordinates: vertex identity
 * is the sorted triple of hex cells that meet at the point, never a floating-point
 * position, so engine rules and replays can name a vertex without ever agreeing on
 * pixel maths with the renderer.
 */

export type BoardVertexId = string;

export interface AxialCell {
  q: number;
  r: number;
}

/** A geometric vertex of the board: the three hex cells that meet at one point.
 *  Cells that hold no tile are open sea. */
export interface BoardVertex {
  id: BoardVertexId;
  /** The three meeting cells, in canonical (q, then r) order. */
  cells: [AxialCell, AxialCell, AxialCell];
  /** Ids of the cells occupied by real tiles. */
  tileIds: string[];
}

/** A vertex where a luxury good can sit: exactly two tiles and open sea meet. The
 *  two tiles are necessarily adjacent and — with the sea on their shared corner —
 *  necessarily coastal. */
export interface LuxuryVertex {
  id: BoardVertexId;
  cells: [AxialCell, AxialCell, AxialCell];
  /** The two adjacent coastal tiles a future Port can claim from. */
  tileIds: [string, string];
  /** The open-sea cell, for the renderer's seaward marker offset. */
  seaCell: AxialCell;
}

function cellKey({ q, r }: AxialCell) {
  return `${q},${r}`;
}

function canonicalCells(cells: AxialCell[]): [AxialCell, AxialCell, AxialCell] {
  const sorted = [...cells].sort((a, b) => a.q - b.q || a.r - b.r);
  return sorted as [AxialCell, AxialCell, AxialCell];
}

/**
 * Every vertex of the board, each listed once under a stable order-independent id.
 *
 * Corner i of a hex is where the hex meets its neighbours behind edges i−1 and i
 * (in {@link AXIAL_DIRECTIONS} order), so each tile contributes six cell-triples
 * and shared corners deduplicate through the canonical id.
 */
export function boardVertices(tiles: readonly AxialCell[]): BoardVertex[] {
  const occupied = occupiedCoordinates(tiles);
  const byId = new Map<BoardVertexId, BoardVertex>();

  for (const tile of tiles) {
    for (let corner = 0; corner < 6; corner += 1) {
      const before = AXIAL_DIRECTIONS[(corner + 5) % 6];
      const after = AXIAL_DIRECTIONS[corner];
      const cells = canonicalCells([
        { q: tile.q, r: tile.r },
        { q: tile.q + before.q, r: tile.r + before.r },
        { q: tile.q + after.q, r: tile.r + after.r },
      ]);
      const id = cells.map(cellKey).join("|");

      if (!byId.has(id)) {
        byId.set(id, {
          id,
          cells,
          tileIds: cells.map(cellKey).filter((key) => occupied.has(key)),
        });
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** The vertices where a luxury good can sit: exactly two occupied cells. */
export function luxuryEligibleVertices(tiles: readonly AxialCell[]): LuxuryVertex[] {
  return boardVertices(tiles).flatMap((vertex) => {
    if (vertex.tileIds.length !== 2) {
      return [];
    }
    const tileKeys = new Set(vertex.tileIds);
    const seaCell = vertex.cells.find((cell) => !tileKeys.has(cellKey(cell)));

    return seaCell
      ? [
          {
            id: vertex.id,
            cells: vertex.cells,
            tileIds: vertex.tileIds as [string, string],
            seaCell,
          },
        ]
      : [];
  });
}

/** Axial → planar embedding at unit hex size. The renderer's `hexCenter` is this
 *  times its pixel size — one formula, owned here, so the engine's angular order
 *  and the drawn board can never disagree about where a cell sits. */
export function axialToPlane(q: number, r: number) {
  return { x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r };
}

function vertexPlanePosition(vertex: { cells: readonly AxialCell[] }) {
  // A hex-grid vertex is the centroid of the three hex centres that meet at it.
  const points = vertex.cells.map(({ q, r }) => axialToPlane(q, r));
  return {
    x: (points[0].x + points[1].x + points[2].x) / 3,
    y: (points[0].y + points[1].y + points[2].y) / 3,
  };
}

export interface LuxuryPlacementOptions {
  /** How many vertices to seat goods at (ruleset `economy.luxury.coastalGoods`). */
  count: number;
  /** false = evenly spaced around the coast; true = a seeded random draw
   *  (ruleset `economy.luxury.randomPlacement`). */
  random: boolean;
  /** The match seed — placement is a pure function of board + options. */
  seed: number;
}

/**
 * Which eligible vertices hold the board's luxury goods. Deterministic per match:
 * derived from the board and the seed, never stored, so every consumer — renderer,
 * simulator, and slice 2's asset registry — selects the same six moorings.
 *
 * Even spacing walks the coast in angular order around the board's centre and takes
 * every Nth vertex, with a seed-chosen starting phase so different matches vary
 * without bunching. Random is a seeded shuffle.
 */
export function selectLuxuryVertices(
  tiles: readonly AxialCell[],
  options: LuxuryPlacementOptions,
): LuxuryVertex[] {
  const eligible = luxuryEligibleVertices(tiles);
  const count = Math.min(Math.max(0, Math.floor(options.count)), eligible.length);

  if (count === 0) {
    return [];
  }
  if (options.random) {
    return sortById(shuffleWithSeed(eligible, options.seed).cards.slice(0, count));
  }

  const centre = tiles
    .map(({ q, r }) => axialToPlane(q, r))
    .reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  centre.x /= tiles.length;
  centre.y /= tiles.length;

  const byAngle = [...eligible].sort((a, b) => angleFrom(centre, a) - angleFrom(centre, b));
  const step = byAngle.length / count;
  const phase = (options.seed >>> 0) % Math.max(1, Math.floor(step));

  return sortById(
    Array.from(
      { length: count },
      (_, index) => byAngle[(phase + Math.round(index * step)) % byAngle.length],
    ),
  );
}

function angleFrom(centre: { x: number; y: number }, vertex: { cells: readonly AxialCell[] }) {
  const position = vertexPlanePosition(vertex);
  return Math.atan2(position.y - centre.y, position.x - centre.x);
}

function sortById(vertices: LuxuryVertex[]) {
  return [...vertices].sort((a, b) => a.id.localeCompare(b.id));
}
