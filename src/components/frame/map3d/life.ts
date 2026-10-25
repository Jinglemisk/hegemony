import { axialToPlane, hexDistance } from "../../../game/mapTopology";

/**
 * The life on the map, as plans: where each pop strolls, the pilgrims' round at the
 * Oracle, and the sea route a ship sails. A plan is a pure function of the board and a
 * seeded stream, so the same state always moves the same way; the scene reads it at
 * its clock (`walkAt`). Coordinates are the scene's: x east, z south.
 */

type XZ = { x: number; z: number };
type Stop = XZ & { y?: number; pause: number };
type Leg = { a: Stop; b: Stop; t0: number; walk: number; end: number };
/** A loop of legs: walk from stop to stop at a steady pace, pausing at each. */
export type Walk = { legs: Leg[]; period: number; offset: number };

/** A tile centre, as the map model gives it (its y is the scene's z). */
type Ground = { x: number; y: number };

/** The loop through `stops`, each leg walked at `pace` world units a second. */
function loop(stops: Stop[], pace: number) {
  let t0 = 0;
  const legs = stops.map((a, i) => {
    const b = stops[(i + 1) % stops.length];
    const walk = Math.max(0.01, Math.hypot(b.x - a.x, b.z - a.z) / pace);
    const leg = { a, b, t0, walk, end: t0 + walk + b.pause };
    t0 = leg.end;
    return leg;
  });
  return { legs, period: t0 };
}

/** A point on a tile, between `inner` and 0.7 from its centre. */
function pointOn(t: Ground, r: () => number, inner: number) {
  const a = r() * Math.PI * 2;
  const d = inner + r() * (0.7 - inner);
  return { x: t.x + d * Math.cos(a), z: t.y + d * Math.sin(a) };
}

/**
 * A pop's stroll: six stops about its home tile (outside the town's `inner` radius),
 * every third maybe on a neighbouring tile of its realm, crossing by the shared edge.
 */
export function walkPlan(
  r: () => number,
  home: Ground,
  near: readonly Ground[],
  inner: number,
): Walk {
  const stops: Stop[] = [];
  let at = home;
  for (let k = 0; k < 6; k++) {
    const go =
      near.length && k % 3 === 2 && r() < 0.75 ? near[Math.floor(r() * near.length)] : home;
    if (go !== at) stops.push({ x: (at.x + go.x) / 2, z: (at.y + go.y) / 2, pause: 0 });
    stops.push({ ...pointOn(go, r, go === home ? inner : 0.3), pause: 0.6 + r() * 2.4 });
    at = go;
  }
  if (at !== home) stops.push({ x: (at.x + home.x) / 2, z: (at.y + home.y) / 2, pause: 0 });
  const { legs, period } = loop(stops, 0.09);
  return { legs, period, offset: r() * period };
}

/** The Oracle's round: up the steps to the tripod, a pause, and back down. Four
 *  walkers share it, a quarter of the way apart, each in their own lane. */
export function pilgrimagePlan(oracle: Ground, index: number): Walk {
  const lane = (index - 1.5) * 0.012;
  const stops = [
    [0.56, 0.35, 0],
    [0.4, 0.3, 0],
    [0.27, 0.2, 0.025],
    [0.19, 0.13, 0.075],
    [0.29, 0.19, 0.025],
    [0.44, 0.21, 0],
    [0.6, 0.19, 0],
  ].map(([x, z, y], i) => ({
    x: oracle.x + x + lane,
    z: oracle.y - 0.08 + z + lane,
    y,
    pause: i === 3 ? 1.4 : 0.1,
  }));
  const { legs, period } = loop(stops, 0.055);
  return { legs, period, offset: (index * period) / 4 };
}

/** Where a walker is at `time`, which way it heads, and whether it is under way. */
export function walkAt(plan: Walk, time: number) {
  const u = (time + plan.offset) % plan.period;
  for (const L of plan.legs) {
    if (u >= L.end) continue;
    const k = Math.min(1, (u - L.t0) / L.walk);
    return {
      x: L.a.x + (L.b.x - L.a.x) * k,
      z: L.a.z + (L.b.z - L.a.z) * k,
      y: (L.a.y ?? 0) + ((L.b.y ?? 0) - (L.a.y ?? 0)) * k,
      dx: L.b.x - L.a.x,
      dz: L.b.z - L.a.z,
      moving: k < 1,
    };
  }
  const { a } = plan.legs[0];
  return { x: a.x, z: a.z, y: a.y ?? 0, dx: 1, dz: 0, moving: false };
}

/** A tile on the board, by its axial cell and its centre in the scene. */
type Cell = Ground & { q: number; r: number };

const STEPS = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];
/** A ship's route passes no nearer than this to a tile's centre: clear of its coast. */
const CLEAR = 1.2;
/** A route starts and ends this far off its tile's centre: a ship arrives bow first,
 *  so a little farther out than the prototype's 1.25, clear of the coast's wall. */
const OFFSHORE = 1.4;

/**
 * A ship's route between two tiles, as points: off the first's coast, through the open
 * sea, to off the second's. The shortest way through the sea cells (any board: several
 * islands, inlets, a tile far inland sails from the sea nearest it), then pulled
 * straight wherever the water allows, so the scene's curve through it never crosses land.
 * An end beside a `moored` good lies a step farther out, so the ship's chip, where it
 * lingers, keeps off the good's name.
 */
export function seaRoute(
  tiles: readonly Cell[],
  from: Cell,
  to: Cell,
  moored: readonly XZ[] = [],
): XZ[] {
  const land = new Set(tiles.map((t) => `${t.q},${t.r}`));
  // The scene's origin, on the engine's plane.
  const o = axialToPlane(tiles[0].q, tiles[0].r);
  const [ox, oz] = [tiles[0].x - o.x, tiles[0].y - o.y];
  const centre = (q: number, r: number) => {
    const p = axialToPlane(q, r);
    return { x: p.x + ox, z: p.y + oz };
  };
  // The water: every open cell within two of the board's bounds.
  const qs = tiles.map((t) => t.q);
  const rs = tiles.map((t) => t.r);
  const [q0, r0] = [Math.min(...qs) - 2, Math.min(...rs) - 2];
  const water = new Set<string>();
  for (let q = q0; q <= Math.max(...qs) + 2; q++) {
    for (let r = r0; r <= Math.max(...rs) + 2; r++) {
      if (!land.has(`${q},${r}`)) water.add(`${q},${r}`);
    }
  }
  /** Breadth first through the water from `starts`, until it reaches `goal`. */
  const spread = (starts: string[], within: ReadonlySet<string>, goal?: ReadonlySet<string>) => {
    const came = new Map<string, string | null>(starts.map((key) => [key, null]));
    const queue = [...starts];
    for (const key of queue) {
      if (goal?.has(key)) return { came, end: key };
      const [q, r] = key.split(",").map(Number);
      for (const [dq, dr] of STEPS) {
        const next = `${q + dq},${r + dr}`;
        if (within.has(next) && !came.has(next)) {
          came.set(next, key);
          queue.push(next);
        }
      }
    }
    return { came, end: undefined };
  };
  // The open sea: the water joined to the edge (a lake inside the land is not).
  const open = new Set(spread([`${q0},${r0}`], water).came.keys());
  const sea = [...open].map((key) => {
    const [q, r] = key.split(",").map(Number);
    return { q, r, key };
  });
  const nearest = (t: Cell) => {
    const d = Math.min(...sea.map((c) => hexDistance(c, t)));
    return new Set(sea.filter((c) => hexDistance(c, t) === d).map((c) => c.key));
  };

  // The shortest way from the sea beside `from` to the sea beside `to`.
  const { came, end } = spread([...nearest(from)], open, nearest(to));
  const path: XZ[] = [];
  for (let key = end ?? null; key !== null; key = came.get(key) ?? null) {
    const [q, r] = key.split(",").map(Number);
    path.unshift(centre(q, r));
  }
  /** Off a tile's coast, toward the sea cell it sails from: the cell's centre is
   *  √3 from a tile beside it, and the route starts OFFSHORE from that tile, or a step
   *  farther out where a good is moored there and the water allows. */
  const offshore = (t: Cell, c: XZ) => {
    const d = Math.hypot(t.x - c.x, t.y - c.z);
    const at = (out: number) => {
      const k = (Math.sqrt(3) - out) / d;
      return { x: c.x + (t.x - c.x) * k, z: c.z + (t.y - c.z) * k };
    };
    const [near, far] = [at(OFFSHORE), at(OFFSHORE + 1)];
    const beside = moored.some((g) => Math.hypot(g.x - near.x, g.z - near.z) < 1);
    return beside && !tiles.some((u) => Math.hypot(u.x - far.x, u.y - far.z) < CLEAR) ? far : near;
  };
  const points = [offshore(from, path[0]), ...path, offshore(to, path[path.length - 1])];

  // Pull the route straight: from each point, on to the farthest one in clear water.
  // Two ends at the same spot (a tile behind another, both sailing from one cell) are
  // never joined: that ship goes out to sea and back.
  const clear = (a: XZ, b: XZ) => {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.1);
    if (n === 0) return false;
    for (let i = 1; i < n; i++) {
      const x = a.x + ((b.x - a.x) * i) / n;
      const z = a.z + ((b.z - a.z) * i) / n;
      if (tiles.some((t) => Math.hypot(t.x - x, t.y - z) < CLEAR)) return false;
    }
    return true;
  };
  const route = [points[0]];
  for (let i = 0; i < points.length - 1;) {
    let j = points.length - 1;
    while (j > i + 1 && !clear(points[i], points[j])) j--;
    route.push(points[j]);
    i = j;
  }
  return route;
}
