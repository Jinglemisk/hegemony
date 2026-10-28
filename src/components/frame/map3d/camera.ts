import type { UnitBox } from "./fit";
import type { MapMode } from "./modes";

/**
 * The living map's camera, as pure functions: the owner-approved prototype's model
 * (2026-10-16/17: turn ±15° that stays where left, tilt 20° at the opening view
 * rising to 45° close in).
 *
 * World units are hexes (centre to corner is 1) on the sea plane, with the island's
 * centre at the origin, x east and y south as on the engine's plane; `h` is height above
 * the sea. The camera looks at a target on the plane; `z` is screen pixels per world
 * unit at that target. The target sits at the frame's (cx, cy): the middle of the
 * room the chrome leaves, not the middle of the screen.
 */

const DEG = Math.PI / 180;
export const FOV = 34 * DEG;
const TILT_FIT = 20 * DEG;
const TILT_MAX = 45 * DEG;
export const ROT_MAX = 15 * DEG;
export const ROT_STEP = 5 * DEG;
/** The zoom range, as multiples of the opening view's zoom. */
const Z_MIN = 0.6;
const Z_MAX = 4.8;
/** The opening view on the 0..1 detail scale that drives the tilt and the bands. */
export const T_FIT = Math.log(1 / Z_MIN) / Math.log(Z_MAX / Z_MIN);
/** The one threshold on the same scale: the overview below it, close in above it. The
 *  opening view sits in the overview, and one press of + (×1.4) crosses it. The look
 *  changes there once, crossfading across ±BW. */
export const T_CLOSE = 0.36;
const BW = 0.04;
/** A tile's top above the sea, and the radius of its drawn top (the rest is grout). */
export const H_TILE = 0.2;
export const R_TOP = 0.955;

export type Cam = { tx: number; ty: number; z: number; rot: number };
/** A world point: x, y on the plane, and h above the sea. */
export type Point = readonly [number, number, number];
/** Where the camera is heading. An anchor pins a world point under a screen point
 *  while the zoom eases, so a wheel zooms toward the pointer. */
export type Goal = Cam & { anchor: { sx: number; sy: number; wx: number; wy: number } | null };
/** The screen the map draws on: its size, where the target sits, the opening zoom. */
export type Frame = { W: number; H: number; cx: number; cy: number; zFit: number };
export type View = Cam &
  Frame & {
    /** The detail scale, 0 at the farthest zoom and 1 at the closest. */
    t: number;
    phi: number;
    /** Focal length and camera distance, in px and world units. */
    f: number;
    d: number;
    c: number;
    s: number;
    cp: number;
    sp: number;
  };

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const zoomRange = (zFit: number) => [Z_MIN * zFit, Z_MAX * zFit] as const;

export const detailAt = (z: number, zFit: number) =>
  clamp(Math.log(z / (Z_MIN * zFit)) / Math.log(Z_MAX / Z_MIN), 0, 1);

/** Top-down at the farthest zoom, 20° at the opening view, 45° at the closest. */
export const tiltAt = (t: number) =>
  t <= T_FIT
    ? TILT_FIT * smooth(0, T_FIT, t)
    : TILT_FIT + (TILT_MAX - TILT_FIT) * smooth(T_FIT, 1, t);

export function viewOf(cam: Cam, frame: Frame): View {
  const f = frame.H / 2 / Math.tan(FOV / 2);
  const t = detailAt(cam.z, frame.zFit);
  const phi = tiltAt(t);
  return {
    ...cam,
    ...frame,
    t,
    phi,
    f,
    d: f / cam.z,
    c: Math.cos(cam.rot),
    s: Math.sin(cam.rot),
    cp: Math.cos(phi),
    sp: Math.sin(phi),
  };
}

/** A world point on screen; `k` is its px per world unit (≤ 0 behind the camera). */
export function project(v: View, wx: number, wy: number, h: number) {
  const dx = wx - v.tx;
  const dy = wy - v.ty;
  const x1 = v.c * dx - v.s * dy;
  const y1 = v.s * dx + v.c * dy;
  const k = v.f / (v.d - y1 * v.sp - h * v.cp);
  return { x: v.cx + x1 * k, y: v.cy + (y1 * v.cp - h * v.sp) * k, k };
}

/** The sea-plane point under a screen point. */
export function unproject(v: View, sx: number, sy: number) {
  const u = (sy - v.cy) / v.f;
  const y1 = (u * v.d) / (v.cp + u * v.sp);
  const x1 = ((sx - v.cx) * (v.d - y1 * v.sp)) / v.f;
  return { x: v.tx + v.c * x1 + v.s * y1, y: v.ty - v.s * x1 + v.c * y1 };
}

/** In front of the camera, and not so near it that it fills the screen. */
export const inFront = (v: View, k: number) => k > 0 && k < 3.5 * v.z;

/** The target never leaves the island: it stays within `reach` of the centre. */
export function clampTarget(o: { tx: number; ty: number }, reach: number) {
  const r = Math.hypot(o.tx, o.ty);
  if (r > reach) {
    o.tx *= reach / r;
    o.ty *= reach / r;
  }
}

/**
 * One frame of the camera easing toward its goal (a fixed share of the way per
 * frame, all of it under reduced motion). Returns whether it is still moving.
 */
export function stepCamera(cam: Cam, goal: Goal, frame: Frame, reach: number, rate: number) {
  const lz = Math.log(cam.z);
  const gz = Math.log(goal.z);
  cam.z = Math.exp(lz + (gz - lz) * rate);
  cam.rot += (goal.rot - cam.rot) * rate;
  if (goal.anchor) {
    const p = unproject(viewOf(cam, frame), goal.anchor.sx, goal.anchor.sy);
    cam.tx += goal.anchor.wx - p.x;
    cam.ty += goal.anchor.wy - p.y;
    clampTarget(cam, reach);
    goal.tx = cam.tx;
    goal.ty = cam.ty;
  } else {
    cam.tx += (goal.tx - cam.tx) * rate;
    cam.ty += (goal.ty - cam.ty) * rate;
  }
  const settled =
    Math.abs(gz - Math.log(cam.z)) < 1e-3 &&
    Math.abs(goal.rot - cam.rot) < 1e-4 &&
    Math.hypot(goal.tx - cam.tx, goal.ty - cam.ty) < 1e-3;
  if (settled) {
    Object.assign(cam, { tx: goal.tx, ty: goal.ty, z: goal.z, rot: goal.rot });
    goal.anchor = null;
  }
  return !settled;
}

/** How wide a hex must be drawn (px, flat to flat, each a narrow fade) for what hangs
 *  under its badge: one short label (a capital's name, Economy's readout), every
 *  settlement's plate, and Economy's full card, three rows. Narrower, they would reach
 *  the next row's badges, so a phone keeps the badges alone until it zooms in. */
const LABEL_ROOM = [44, 50] as const;
const ROOM = [56, 64] as const;
const CARD_ROOM = [110, 120] as const;

/**
 * The zoom bands: one function of the camera and the mode that every layer's fade
 * hangs on. `html` drives the overlay through `--a-<key>` variables, `layers` the 3D
 * layers' opacity. There are two bands, the overview and close in, with one threshold
 * (T_CLOSE) between them.
 *
 * Every mode draws the same 3D board, the terrain in its own colours and the towns,
 * Ports and goods as models. In the overview each settled tile is painted solid in its
 * owner's colour; close in, the paint gives way to the mode's light filter (the
 * runtime's paint, by `close`): Political tints each owned tile and the models on it
 * toward the owner's colour; Economy fades the land's trees, rocks and fields; Trade
 * adds the trading ships and their routes, and each realm's trade hint by its capital.
 * Each tile's resource badge stands on its centre in every mode at both bands; what
 * hangs under it is the mode's: a name plate (Terrain, Political, Trade), the realm's
 * name under its capital (Political), or Economy's readout.
 *
 * The overview names only the capitals. Close in come every settlement's plate with
 * its slots and pops, the buildings, the figures and the sea's life. Each good's icon
 * and name show at every zoom. While a pick is armed, its candidates' plates (`asked`)
 * show at any zoom in the modes that draw them.
 *
 * `hexPx` is a hex's drawn width. Where hexes are small (a phone), the labels under the
 * badges would crowd them, so each waits until the hexes have room for it.
 */
export function bandAlphas(t: number, hexPx = Infinity, mode: MapMode = "terrain") {
  const close = smooth(T_CLOSE - BW, T_CLOSE + BW, t);
  const fits = smooth(...LABEL_ROOM, hexPx);
  const room = smooth(...ROOM, hexPx);
  // The close band's labels, where the hexes have room for them.
  const near = close * room;
  const card = close * smooth(...CARD_ROOM, hexPx);
  const board = {
    towns: 1,
    goods: 1,
    ports: 1,
    terrain: 1,
    moves: 1,
    passengers: 1,
    events: 1,
    detail: close,
    landmark: close,
    landmarkVapour: close,
    pops: close,
    lifeShips: close,
    lifeAmb: close,
    tradeRoutes: 0,
  };
  const layers: Record<MapMode, Record<string, number>> = {
    terrain: board,
    political: board,
    economy: { ...board, terrain: 0.35, pops: close * 0.3 },
    trade: { ...board, lifeShips: 1, tradeRoutes: 1 },
  };
  // Every mode's labels: the capitals' plates at both bands, every plate close in, a
  // pick's candidates' at any zoom. The goods' icons and names show at every zoom.
  const labels = {
    capital: fits,
    plates: near,
    asked: 1,
    pips: near,
    oracle: near,
    ship: near,
    event: 0,
    realm: 0,
    realmline: 0,
    ecoC: 0,
    ecoF: 0,
    ecoE: 0,
    building: 0,
    port: 0,
    hint: 0,
  };
  const html: Record<MapMode, Record<string, number>> = {
    terrain: { ...labels, event: 1 },
    // The realm's name hangs under its capital, in place of the capital's plate.
    // Its glaze and counts, a second line, wait for the room of Economy's full card.
    political: { ...labels, capital: 0, event: 1, realm: fits, realmline: card },
    // Economy's cards hang under every tile instead.
    economy: {
      ...labels,
      capital: 0,
      plates: 0,
      asked: 0,
      ecoC: fits - card,
      ecoF: card,
      ecoE: fits,
      building: near,
    },
    // Each Port's chip names the good it holds; each realm's trade hint hangs under its
    // capital.
    trade: { ...labels, ship: 1, port: 1, hint: 1 },
  };
  return { close, layers: layers[mode], html: html[mode] };
}

/**
 * The opening view's boxes for `fitIsland`: each shape's screen box at zoom `s`, at
 * the opening tilt with no turn, relative to where the island's centre lands and in
 * units of `s`, so the fit can treat the perspective as a scale and a shift.
 */
export function boxesAt(s: number, H: number, shapes: readonly (readonly Point[])[]): UnitBox[] {
  // At the opening zoom the tilt is the opening tilt.
  const v = viewOf({ tx: 0, ty: 0, z: s, rot: 0 }, { W: 0, H, cx: 0, cy: 0, zFit: s });
  return shapes.map((points) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [x, y, h] of points) {
      const p = project(v, x, y, h);
      xs.push(p.x / s);
      ys.push(p.y / s);
    }
    return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  });
}
