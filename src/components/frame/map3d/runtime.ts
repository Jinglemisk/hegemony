import { isTyping } from "../../../ui/keys";
import {
  H_TILE,
  R_TOP,
  ROT_MAX,
  ROT_STEP,
  bandAlphas,
  boxesAt,
  clamp,
  clampTarget,
  inFront,
  project,
  stepCamera,
  unproject,
  viewOf,
  zoomRange,
} from "./camera";
import type { Cam, Frame, Goal, Point, View } from "./camera";
import { fitIsland, tokenPx } from "./fit";
import type { Layout } from "./layout";
import type { BoardShape, MapModel } from "./mapModel";
import type { MapMode } from "./modes";
import type { Plates } from "./plates";
import { BONE, GLAZE, SEA, glazeOf } from "./palette";
import { createScene } from "./scene";
import type { Border, Ring } from "./scene";
import { nextTileInDirection } from "./tileTip";

/**
 * The living map's runtime: the camera and its input, the one draw loop, and the
 * HTML that follows the camera. React renders the tile buttons and the labels; this
 * places them each time the camera moves, so a frame never re-renders React.
 *
 * The loop runs on demand: while the camera eases, and while ambient motion is
 * allowed (the page visible, the map on screen, no reduced motion, a GPU). With the
 * camera still, only the sea and its life move, and they draw at 30 frames a second.
 * Nothing heavy happens until `start`: then the opening view is fitted and the shaders
 * compile off the page's clock, and the map shows (`data-ready`) with its first frame.
 */

const DEG = Math.PI / 180;
/** A still camera's frame: 30 a second, less a few ms so a 60 Hz screen draws every other. */
const IDLE_MS = 1000 / 30 - 4;
const SIDES = Array.from({ length: 6 }, (_, i) => (60 * i - 30) * DEG);
/** A drag starts this far from where the pointer went down; before it, a press is a click. */
const DRAG_PX = 5;
/** The mouse this close to the window's edge pans the map that way, this fast (px/s). */
const EDGE_PX = 8;
const EDGE_SPEED = 900;
type Point2 = { x: number; y: number };
/** A hex's drawn width, flat side to flat side, in world units; and the distance from a
 *  tile's centre to its neighbour's. */
const HEX_W = Math.sqrt(3) * R_TOP;
const SQ3 = Math.sqrt(3);
/** How far Political tints an owned tile and its town toward the owner's glaze: enough
 *  to read the realm, not so much that the terrain goes. */
const TINT = 0.5;

export type Marks = {
  selected: string | null;
  focus: string | null;
  /** While a placement asks for a tile: the answers. The rest recede. */
  candidates: ReadonlySet<string> | null;
};

/** Mix two colours channel by channel, as the prototype does. */
function mix(a: number, b: number, k: number) {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    out |= Math.round(x + (y - x) * k) << shift;
  }
  return out;
}

type Placed = {
  el: HTMLElement;
  x: number;
  y: number;
  h: number;
  keys: string[];
  /** A tile's resource badge, on its hex's centre and sized to it; `w20` is its width
   *  at 20px, once measured. */
  far: boolean;
  w20?: number;
  /** A capital's tag, which carries Trade's hint: while the hint shows, it stands over
   *  the tags below it, whose badges its hint reaches in the overview. */
  hint: boolean;
  /** A button, not a label: never taken out of the page. */
  control: boolean;
  /** A ship's chip follows its ship, by the ship's index. */
  ship?: number;
  /** A building's badge: in Economy it keeps above its tile's chip at (x, y). */
  chip?: { x: number; y: number };
};

export function createRuntime({
  stage,
  shape,
  onViewChange,
}: {
  stage: HTMLElement;
  shape: BoardShape;
  /** The player moved the map: anything anchored to a tile's old position is stale. */
  onViewChange: () => void;
}) {
  // The canvas is made here, not by React: a WebGL context lost on unmount must not
  // be handed to the next mount (StrictMode mounts twice).
  const canvas = document.createElement("canvas");
  canvas.className = "lm-canvas";
  stage.prepend(canvas);
  const scene = createScene(canvas, shape);
  const cellIndex = new Map(shape.cells.map((cell, i) => [cell.id, i]));

  let frame: Frame = { W: 0, H: 0, cx: 0, cy: 0, zFit: 1 };
  const cam: Cam = { tx: 0, ty: 0, z: 1, rot: 0 };
  const goal: Goal = { ...cam, anchor: null };
  let model: MapModel | null = null;
  let mode: MapMode = "terrain";
  let plateSize: Plates["size"] = "small";
  let marks: Marks = { selected: null, focus: null, candidates: null };
  let placed: Placed[] = [];
  let tileEls: (HTMLElement | undefined)[] = [];
  let camDirty = true;
  // The tiles are repainted when the board, the mode or the marks change.
  let coloursDirty = true;
  // Started: fitted and compiling. Ready: compiled, so a frame draws without a stall.
  let started = false;
  let ready = false;
  let startTimer = 0;
  // What the last fit was fitted to: the same screen and chrome need no second fit.
  let fitted = "";
  const chromeRects = () => {
    const rect = stage.getBoundingClientRect();
    return [...document.querySelectorAll("[data-exclude]")]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({
        left: r.left - rect.left,
        right: r.right - rect.left,
        top: r.top - rect.top,
        bottom: r.bottom - rect.top,
      }));
  };

  // ---- the opening view: the whole island clear of the chrome -------------------
  /** Fit the opening view, unless the screen and the chrome are as last fitted. */
  function fit() {
    const rect = stage.getBoundingClientRect();
    const W = Math.round(rect.width);
    const H = Math.round(rect.height);
    if (!W || !H) return false;
    const exclusions = chromeRects();
    const key = JSON.stringify([W, H, exclusions.map((r) => Object.values(r).map(Math.round))]);
    if (key === fitted) return false;
    fitted = key;
    // Each tile's footprint, its top and its foot (the coast's walls), and each good.
    const shapes: Point[][] = [
      ...shape.cells.map((cell) =>
        SIDES.flatMap((a): Point[] => [
          [cell.x + Math.cos(a), cell.y + Math.sin(a), H_TILE],
          [cell.x + Math.cos(a), cell.y + Math.sin(a), 0],
        ]),
      ),
      ...(model?.moorings ?? []).map((m): Point[] => [[m.x, m.y, 0]]),
    ];
    const names = (model?.moorings ?? []).map((m) => m.name.length);
    const result = fitIsland({
      width: W,
      height: H,
      gap: tokenPx("--board-gap") || 8,
      exclusions,
      // A good's icon stands on its raft and its name under it, about this big in px at
      // the opening size.
      boxesAt: (s) =>
        boxesAt(s, H, shapes).map((box, i) => {
          const n = i - shape.cells.length;
          if (n < 0) return box;
          const half = Math.max(18, names[n] * 3.5 + 10) / s;
          return [box[0] - half, box[1] + half, box[2] - 18 / s, box[3] + 48 / s] as const;
        }),
    });
    frame = result
      ? { W, H, cx: result.cx, cy: result.cy, zFit: result.s }
      : { W, H, cx: W / 2, cy: H / 2, zFit: Math.min(W, H) / (2 * shape.half - 4) };
    Object.assign(cam, { tx: 0, ty: 0, z: frame.zFit, rot: 0 });
    Object.assign(goal, cam, { anchor: null });
    scene.resize(W, H);
    camDirty = true;
    kick();
    return true;
  }

  // ---- what the tiles look like: their terrain, the owners' paint, placement --------
  /** How far the overview paints a settled tile in its owner's glaze: all the way, giving
   *  way to the mode's own look as the map comes close (1 − the close band). */
  let overview = 1;
  /** A tile's colour: its terrain's; settled, its owner's glaze in the overview, and
   *  close in Political's tint toward it. */
  function wash(tile: MapModel["tiles"][number]) {
    const [lead] = tile.settlements;
    const land = mix(GLAZE[tile.terrain], BONE, 0.5);
    if (!lead) return land;
    const tint = mode === "political" ? TINT : 0;
    return mix(land, glazeOf(lead.owner), overview + (1 - overview) * tint);
  }

  /** Political's borders: each owned tile's sides that face another realm, open land
   *  or the sea, in its realm's glaze. */
  function borders(placing: ReadonlySet<string> | null): Border[] {
    if (!model) return [];
    const at = (x: number, y: number) => `${Math.round(x * 4)},${Math.round(y * 4)}`;
    const lead = new Map(model.tiles.map((t) => [at(t.x, t.y), t.settlements[0]?.owner]));
    return model.tiles.flatMap((tile) => {
      const owner = tile.settlements[0]?.owner;
      if (!owner) return [];
      const recede = placing && !placing.has(tile.id) ? 0.55 : 0;
      return SIDES.flatMap((_, side) => {
        const a = side * 60 * DEG;
        const across = lead.get(at(tile.x + SQ3 * Math.cos(a), tile.y + SQ3 * Math.sin(a)));
        return across === owner
          ? []
          : [{ x: tile.x, y: tile.y, side, colour: mix(glazeOf(owner), SEA.sea, recede) }];
      });
    });
  }

  function paint() {
    if (!model) return;
    const placing = marks.candidates;
    const political = mode === "political";
    const colours: number[] = [];
    const rings: Ring[] = [];
    for (const tile of model.tiles) {
      const i = cellIndex.get(tile.id);
      if (i === undefined) continue;
      const recede = placing && !placing.has(tile.id) ? 0.55 : 0;
      colours[i] = mix(wash(tile), SEA.sea, recede);
      tile.settlements.slice(0, 2).forEach((s, k) => {
        rings.push({
          x: tile.x,
          y: tile.y,
          inner: k > 0,
          colour: mix(glazeOf(s.owner), SEA.sea, recede),
        });
      });
    }
    scene.setTileColours(colours);
    // Political draws its realms' borders in place of each tile's owner ring.
    scene.setOwnerRings(political ? [] : rings);
    scene.setBorders(political ? borders(placing) : []);
    scene.setTint(political ? TINT : 0);
  }

  function markScene() {
    const at = (id: string | null) => {
      const cell = id === null ? undefined : shape.cells[cellIndex.get(id) ?? -1];
      return cell ? { x: cell.x, y: cell.y } : null;
    };
    scene.setMarks({
      candidates: [...(marks.candidates ?? [])].flatMap((id) => at(id) ?? []),
      selected: at(marks.selected),
      focus: at(marks.focus),
    });
    // The rings are drawn, not styled; the stage names the ringed tile for the DOM.
    if (marks.focus) stage.dataset.focusRing = marks.focus;
    else delete stage.dataset.focusRing;
  }

  // ---- the HTML layers --------------------------------------------------------------
  /** Place the labels; with `shipsOnly`, only the chips that follow a ship. */
  function placeLabels(v: View, html: Record<string, number>, shipsOnly = false) {
    for (const L of placed) {
      if (shipsOnly && L.ship === undefined) continue;
      const alpha = L.keys.reduce((n, k) => n * (html[k] ?? 1), 1);
      const at = L.ship === undefined ? null : scene.decks()[L.ship];
      const q = at ? project(v, at.x, at.z, L.h) : project(v, L.x, L.y, L.h);
      // A building's badge, stem and all, stays above its tile's resource badge.
      if (L.chip) q.y = Math.min(q.y, project(v, L.chip.x, L.chip.y, H_TILE).y - 34);
      const on =
        alpha >= 0.01 &&
        inFront(v, q.k) &&
        q.x > -90 &&
        q.x < v.W + 90 &&
        q.y > -40 &&
        q.y < v.H + 60;
      if (L.control) {
        // A good's name is a control: faded out it stays in the tab order (focus
        // shows it), but lets clicks through to the sea.
        L.el.classList.toggle("is-faded", !on);
        if (!inFront(v, q.k)) continue;
      } else {
        L.el.style.display = on ? "" : "none";
        if (!on) continue;
      }
      if (L.far) {
        // A tile's resource badge: its numeral 0.3 of the hex's drawn width up to 24px,
        // small enough that the tile's paint reads first (large: 0.55, up to 32px), and
        // the badge never wider than 0.92 of it, so neighbours' badges never meet.
        const hex = SIDES.map(
          (a) => project(v, L.x + Math.cos(a) * R_TOP, L.y + Math.sin(a) * R_TOP, H_TILE).x,
        );
        const w = Math.max(...hex) - Math.min(...hex);
        if (L.w20 === undefined) {
          L.el.style.fontSize = "20px";
          L.w20 = L.el.offsetWidth || 1;
        }
        const [k, lo, hi] = plateSize === "large" ? [0.55, 15.4, 32] : [0.3, 13, 24];
        const size = Math.min(clamp(k * w, lo, hi), (0.92 * w * 20) / L.w20);
        L.el.style.fontSize = `${size.toFixed(1)}px`;
      }
      L.el.style.translate = `${q.x.toFixed(1)}px ${q.y.toFixed(1)}px`;
      const lift = L.hint && (html.hint ?? 0) > 0 ? 100_000 : 0;
      L.el.style.zIndex = String(Math.round(q.y) + lift);
    }
  }

  /** Each tile's button covers its hex as drawn, its top and the coast's walls
   *  facing the camera, so a click lands where the eye does and its box anchors the
   *  tile's popovers. */
  function placeTiles(v: View) {
    shape.cells.forEach((cell, i) => {
      const el = tileEls[i];
      if (!el) return;
      const at = (k: number, h: number) =>
        project(v, cell.x + Math.cos(SIDES[k % 6]), cell.y + Math.sin(SIDES[k % 6]), h);
      const top = SIDES.map((_, k) => at(k, H_TILE));
      const foot = SIDES.map((_, k) => at(k, 0));
      if ([...top, ...foot].some((p) => !inFront(v, p.k))) {
        // Behind the camera: off screen, but still in the tab order.
        el.style.translate = "-10000px -10000px";
        return;
      }
      // A wall shows on a side open to the sea (inland, the neighbour hides it) whose
      // foot falls outside the top as drawn: the side faces the camera.
      const mid = project(v, cell.x, cell.y, H_TILE);
      const across = (a: Point2, b: Point2, p: Point2) =>
        (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      const wall = SIDES.map((_, s) => {
        if (!cell.seaSides.includes(s)) return false;
        const [a, b] = [top[s], top[(s + 1) % 6]];
        const f = {
          x: (foot[s].x + foot[(s + 1) % 6].x) / 2,
          y: (foot[s].y + foot[(s + 1) % 6].y) / 2,
        };
        return across(a, b, f) * across(a, b, mid) < 0;
      });
      // The outline: round the top, stepping down to the foot along each wall shown.
      const corners = SIDES.flatMap((_, k) => {
        const before = wall[(k + 5) % 6];
        const after = wall[k];
        if (before && after) return [foot[k]];
        if (before) return [foot[k], top[k]];
        if (after) return [top[k], foot[k]];
        return [top[k]];
      });
      const x0 = Math.min(...corners.map((p) => p.x));
      const y0 = Math.min(...corners.map((p) => p.y));
      const x1 = Math.max(...corners.map((p) => p.x));
      const y1 = Math.max(...corners.map((p) => p.y));
      el.style.translate = `${x0.toFixed(1)}px ${y0.toFixed(1)}px`;
      // Nearer tiles stack over farther ones, as their tops hide the walls behind.
      el.style.zIndex = String(Math.round(mid.y));
      el.style.width = `${(x1 - x0).toFixed(1)}px`;
      el.style.height = `${(y1 - y0).toFixed(1)}px`;
      el.style.clipPath = `polygon(${corners
        .map((p) => `${(p.x - x0).toFixed(1)}px ${(p.y - y0).toFixed(1)}px`)
        .join(",")})`;
    });
  }

  // ---- the draw loop: one loop, running only while something moves -----------------
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let pageVisible = !document.hidden;
  let onScreen = true;
  let raf = 0;
  let last = 0;
  let clock = 0;
  let moving = false;
  const ambient = () => !reduceMotion.matches && pageVisible && onScreen && !scene.software;
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };

  /** The bands at this view and mode: the zoom's, thinned where the hexes are drawn
   *  small. */
  const bands = (v: View) => bandAlphas(v.t, HEX_W * v.z, mode);

  /** Everything over the canvas that follows the camera: the labels and the tiles. */
  function placeHtml(v: View) {
    const B = bands(v);
    for (const [k, a] of Object.entries(B.html)) stage.style.setProperty(`--a-${k}`, a.toFixed(3));
    // Board text grows a little as the map comes closer: 13.6px at the opening view,
    // 17px closest in, never under the 12px floor.
    stage.style.setProperty("--lab", `${Math.max(12, 12.5 + 4.5 * v.t).toFixed(2)}px`);
    // A hex's drawn width at the target: the zoom, said (the browser test reads it).
    stage.style.setProperty("--hex", `${(HEX_W * v.z).toFixed(1)}px`);
    stage.classList.toggle("pips-on", B.html.pips > 0.01);
    // Trade's hint takes the pointer only where it shows.
    stage.classList.toggle("hint-on", B.html.hint > 0.01);
    placeLabels(v, B.html);
    placeTiles(v);
    stage.style.setProperty("--turn", `${v.rot.toFixed(4)}rad`);
  }

  function draw(now: number) {
    raf = 0;
    if (!frame.W || !model) return;
    // Nothing but the sea and its life is moving: wait for the next 30th of a second.
    const still =
      !camDirty &&
      !gesture &&
      !edge.x &&
      !edge.y &&
      !goal.anchor &&
      cam.z === goal.z &&
      cam.rot === goal.rot &&
      cam.tx === goal.tx &&
      cam.ty === goal.ty;
    if (still && last && now - last < IDLE_MS) {
      kick();
      return;
    }
    const dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    const live = ambient() && ready;
    if (live) clock += Math.min(0.05, dt);
    // The camera covers about a quarter of the way to its goal each 60th of a second,
    // however fast the frames come.
    const rate = reduceMotion.matches ? 1 : 1 - Math.pow(0.76, Math.min(0.25, dt) * 60);
    const pose = () => `${cam.tx},${cam.ty},${cam.z},${cam.rot}`;
    const before = pose();
    if (edge.x || edge.y) {
      const step = EDGE_SPEED * Math.min(0.05, dt);
      nudge(edge.x * step, edge.y * step);
    }
    moving = stepCamera(cam, goal, frame, shape.reach, rate);
    if (pose() !== before) camDirty = true;
    const v = viewOf(cam, frame);
    if (camDirty) {
      const { layers, close } = bands(v);
      scene.applyLayers(layers, layers.terrain >= 0.99);
      // The owners' paint changes only while the zoom crosses the threshold.
      if (1 - close !== overview) {
        overview = 1 - close;
        coloursDirty = true;
      }
    }
    if (live) scene.animate(clock);
    if (camDirty) {
      camDirty = false;
      placeHtml(v);
    } else if (live) placeLabels(v, bands(v).html, true);
    // Until the shaders are built the map stays hidden: `prepare` kicks the loop again.
    if (!ready) {
      last = 0;
      return;
    }
    scene.setView(v);
    if (coloursDirty) {
      coloursDirty = false;
      paint();
    }
    scene.render();
    if (stage.dataset.ready === undefined) stage.dataset.ready = "";
    if (moving || live || edge.x || edge.y) kick();
    else last = 0;
  }

  // ---- camera input ------------------------------------------------------------------
  const holdGoal = () => Object.assign(goal, cam, { anchor: null });
  const view = () => viewOf(cam, frame);
  function zoomBy(factor: number, sx: number, sy: number) {
    const [lo, hi] = zoomRange(frame.zFit);
    goal.z = clamp(goal.z * factor, lo, hi);
    const p = unproject(view(), sx, sy);
    goal.anchor = { sx, sy, wx: p.x, wy: p.y };
    onViewChange();
    kick();
  }
  function turn(delta: number) {
    goal.rot = clamp(goal.rot + delta, -ROT_MAX, ROT_MAX);
    onViewChange();
    kick();
  }
  /** Moves the goal by screen pixels, the view's turn and zoom taken into account. */
  function nudge(px: number, py: number) {
    const v = view();
    goal.anchor = null;
    goal.tx += (px * v.c + py * v.s) / v.z;
    goal.ty += (-px * v.s + py * v.c) / v.z;
    clampTarget(goal, shape.reach);
  }
  function panScreen(px: number, py: number) {
    nudge(px, py);
    onViewChange();
    kick();
  }

  // Edge scrolling: the mouse at the window's edge pans the map that way, each frame,
  // while it stays there. Never behind a dialog, during a press or a drag, or over
  // chrome that asks not to (the right column, whose pages scroll at that edge).
  const NO_EDGE = { x: 0, y: 0 };
  let edge = NO_EDGE;
  const hover = (e: PointerEvent) => {
    const was = edge;
    edge =
      e.pointerType !== "mouse" ||
      e.buttons ||
      gesture ||
      (e.target as Element).closest?.("[data-no-edge-pan]") ||
      document.querySelector('[aria-modal="true"]')
        ? NO_EDGE
        : {
            x: e.clientX < EDGE_PX ? -1 : e.clientX >= window.innerWidth - EDGE_PX ? 1 : 0,
            y: e.clientY < EDGE_PX ? -1 : e.clientY >= window.innerHeight - EDGE_PX ? 1 : 0,
          };
    if ((edge.x || edge.y) && !was.x && !was.y) {
      onViewChange();
      kick();
    }
  };
  // Out of the window, or the window left: the edge lets go.
  const leave = (e: PointerEvent) => {
    if (!e.relatedTarget) edge = NO_EDGE;
  };
  const blur = () => {
    edge = NO_EDGE;
  };
  function reset() {
    Object.assign(goal, { tx: 0, ty: 0, z: frame.zFit, rot: 0, anchor: null });
    onViewChange();
    kick();
  }

  const pointers = new Map<number, { x: number; y: number }>();
  let gesture:
    | { kind: "drag"; gx: number; gy: number; start: { x: number; y: number }; moved: boolean }
    | { kind: "pinch"; gx: number; gy: number; z: number; rot: number; dist: number; ang: number }
    | null = null;
  // Set by a drag; the click that ends it is not a click.
  let dragged = false;
  const local = (p: { x: number; y: number }) => {
    const r = stage.getBoundingClientRect();
    return { x: p.x - r.left, y: p.y - r.top };
  };
  function startGesture() {
    const pts = [...pointers.values()].map(local);
    if (pts.length === 1) {
      const g = unproject(view(), pts[0].x, pts[0].y);
      gesture = { kind: "drag", gx: g.x, gy: g.y, start: pts[0], moved: dragged };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      const g = unproject(view(), (a.x + b.x) / 2, (a.y + b.y) / 2);
      const dist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      gesture = { kind: "pinch", gx: g.x, gy: g.y, z: cam.z, rot: cam.rot, dist, ang };
      dragged = true;
      onViewChange();
    }
  }
  const down = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // The sea and the canvas give the map focus; a tile or a good takes its own.
    if (!(e.target as Element).closest("button")) stage.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) dragged = false;
    holdGoal();
    startGesture();
  };
  const move = (e: PointerEvent) => {
    if (!gesture || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()].map(local);
    let anchor: { x: number; y: number };
    if (gesture.kind === "drag") {
      const p = pts[0];
      if (!gesture.moved && Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) < DRAG_PX)
        return;
      if (!gesture.moved) {
        gesture.moved = dragged = true;
        stage.classList.add("is-panning");
        onViewChange();
      }
      anchor = p;
    } else {
      const [a, b] = pts;
      const [lo, hi] = zoomRange(frame.zFit);
      anchor = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      cam.z = clamp((gesture.z * Math.hypot(b.x - a.x, b.y - a.y)) / gesture.dist, lo, hi);
      let da = Math.atan2(b.y - a.y, b.x - a.x) - gesture.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      cam.rot = clamp(gesture.rot + da, -ROT_MAX, ROT_MAX);
    }
    const q = unproject(view(), anchor.x, anchor.y);
    cam.tx += gesture.gx - q.x;
    cam.ty += gesture.gy - q.y;
    clampTarget(cam, shape.reach);
    holdGoal();
    camDirty = true;
    kick();
  };
  const up = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size > 0) {
      startGesture();
      return;
    }
    gesture = null;
    stage.classList.remove("is-panning");
    // The click that ends a drag fires before timers run; after it, clicks count again.
    window.setTimeout(() => {
      if (pointers.size === 0) dragged = false;
    });
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = local({ x: e.clientX, y: e.clientY });
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomBy(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y);
  };
  // With the map focused: arrows pan, + and − zoom, Q and E turn, Home resets.
  // On a tile the arrows walk the tiles instead (the tile's own handler).
  const keydown = (e: KeyboardEvent) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const onStage = e.target === stage;
    const step = 90;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
        if (!onStage) return;
        panScreen(
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0,
        );
        break;
      case "+":
      case "=":
        zoomBy(1.4, frame.cx, frame.cy);
        break;
      case "-":
      case "_":
        zoomBy(1 / 1.4, frame.cx, frame.cy);
        break;
      case "q":
      case "Q":
        turn(-ROT_STEP);
        break;
      case "e":
      case "E":
        turn(ROT_STEP);
        break;
      case "Home":
        reset();
        break;
      default:
        return;
    }
    e.preventDefault();
  };
  // 0 returns to the opening view from anywhere but a field.
  const zero = (e: KeyboardEvent) => {
    if (e.key === "0" && !e.altKey && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) reset();
  };

  stage.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointermove", hover);
  window.addEventListener("pointerout", leave);
  window.addEventListener("blur", blur);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  stage.addEventListener("wheel", wheel, { passive: false });
  stage.addEventListener("keydown", keydown);
  window.addEventListener("keydown", zero);
  const resized = new ResizeObserver(() => {
    if (started && fit()) onViewChange();
  });
  resized.observe(stage);
  const seen = new IntersectionObserver((entries) => {
    onScreen = entries[0]?.isIntersecting ?? true;
    kick();
  });
  seen.observe(stage);
  const visibility = () => {
    pageVisible = !document.hidden;
    kick();
  };
  document.addEventListener("visibilitychange", visibility);
  reduceMotion.addEventListener("change", kick);
  let live = true;
  // The chrome and the labels take their size once the fonts land: measure again,
  // and fit again if the chrome moved.
  void document.fonts?.ready.then(() => {
    if (!live) return;
    for (const L of placed) L.w20 = undefined;
    camDirty = true;
    if (started) fit();
    kick();
  });

  return {
    setModel(next: MapModel, layout: Layout) {
      model = next;
      coloursDirty = true;
      scene.setLayout(layout);
      kick();
    },
    /** Show the map in a mode: its washes, its layers and its labels. */
    setMode(next: MapMode) {
      if (next === mode) return;
      mode = next;
      coloursDirty = camDirty = true;
      kick();
    },
    /** Size the resource badges: the player's choice. */
    setPlateSize(next: Plates["size"]) {
      if (next === plateSize) return;
      plateSize = next;
      camDirty = true;
      kick();
    },
    /**
     * Fit the opening view and compile the shaders: the heavy work, done once. Called
     * from a passive effect and run a task later, so a mount that StrictMode takes
     * straight down again (it does so in that same task) never does it.
     */
    start() {
      window.clearTimeout(startTimer);
      startTimer = window.setTimeout(() => {
        started = true;
        fit();
        // The warm-up draws the opening view, so nothing in it is culled unbuilt.
        scene.setView(viewOf(cam, frame));
        void scene.prepare().then(() => {
          if (!live) return;
          ready = true;
          camDirty = true;
          kick();
        });
      });
    },
    /** Back to the opening view: the compass, 0 and Home. */
    reset,
    setMarks(next: Marks) {
      if (next.candidates !== marks.candidates) coloursDirty = true;
      marks = next;
      markScene();
      kick();
    },
    /** Pick up the elements React rendered: the tile buttons and every placed label. */
    collect() {
      tileEls = shape.cells.map(
        (cell) =>
          stage.querySelector<HTMLElement>(`.lm-tile[data-tile-id="${cell.id}"]`) ?? undefined,
      );
      placed = [...stage.querySelectorAll<HTMLElement>("[data-wx]")].map((el) => ({
        el,
        x: Number(el.dataset.wx),
        y: Number(el.dataset.wy),
        h: Number(el.dataset.wh ?? H_TILE),
        keys: (el.dataset.alpha ?? "").split(" ").filter(Boolean),
        far: el.dataset.far !== undefined,
        hint: el.querySelector(".lm-hint") !== null,
        control: el.tagName === "BUTTON",
        ship: el.dataset.ship === undefined ? undefined : Number(el.dataset.ship),
        chip:
          el.dataset.chipX === undefined
            ? undefined
            : { x: Number(el.dataset.chipX), y: Number(el.dataset.chipY) },
      }));
      // Place what React just added before the browser paints it at the corner.
      if (frame.W) placeHtml(viewOf(cam, frame));
      kick();
    },
    /** The tile the arrow key walks to, by where the tiles are on screen now. */
    rove(fromId: string, key: string) {
      const v = view();
      const centers = shape.cells.flatMap((cell) => {
        const p = project(v, cell.x, cell.y, H_TILE);
        return inFront(v, p.k) ? [{ tile: cell, x: p.x, y: p.y }] : [];
      });
      return nextTileInDirection(centers, fromId, key);
    },
    /** Bring a tile the keyboard walked to into view, if it is near an edge or under
     *  the chrome. */
    reveal(id: string) {
      const cell = shape.cells[cellIndex.get(id) ?? -1];
      if (!cell) return;
      const p = project(view(), cell.x, cell.y, H_TILE);
      const { W, H } = frame;
      const covered = chromeRects().some(
        (r) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom,
      );
      if (covered || p.x < W * 0.12 || p.x > W * 0.88 || p.y < H * 0.12 || p.y > H * 0.88) {
        Object.assign(goal, { tx: cell.x, ty: cell.y, anchor: null });
        clampTarget(goal, shape.reach);
        onViewChange();
        kick();
      }
    },
    /** The good whose raft is drawn under a screen point, if any. */
    pickMooring(clientX: number, clientY: number) {
      const p = local({ x: clientX, y: clientY });
      const i = scene.pickGood((p.x / frame.W) * 2 - 1, 1 - (p.y / frame.H) * 2);
      return i === null ? null : (model?.moorings[i]?.vertexId ?? null);
    },
    /** Whether the pointer that just went up was dragging the map. */
    wasDrag: () => dragged,
    /** Whether the view is still moving: a box measured now is stale a frame later. */
    isMoving: () => moving || gesture !== null,
    dispose() {
      live = false;
      window.clearTimeout(startTimer);
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointermove", hover);
      window.removeEventListener("pointerout", leave);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      stage.removeEventListener("wheel", wheel);
      stage.removeEventListener("keydown", keydown);
      window.removeEventListener("keydown", zero);
      resized.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reduceMotion.removeEventListener("change", kick);
      scene.dispose();
      canvas.remove();
    },
  };
}

export type Runtime = ReturnType<typeof createRuntime>;
