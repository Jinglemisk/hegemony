import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { H_TILE } from "./camera";
import { ART_SEED, FIELD_SHAPES, rng } from "./layout";
import type { ModelName, Town } from "./layout";
import type { MaterialName } from "./palette";

/**
 * The model kit, the prototype's: a model is parts, each baked into world space and
 * merged into one geometry per material, so a model draws as one instanced mesh per
 * material. Every part outlined goes into a keyline hull as well, whose back faces
 * the keyline material pushes out along smoothed normals: the vase-black line.
 */

type PartOptions = {
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  /** Leave the part out of the keyline hull (thin parts, which would only blot). */
  line?: false;
};
type Add = (
  mat: MaterialName,
  part: BufferGeometry,
  x?: number,
  y?: number,
  z?: number,
  o?: PartOptions,
) => void;
export type Template = { meshes: [MaterialName, BufferGeometry][]; outline: BufferGeometry | null };

const quiet = { line: false } as const;

type V = number[];

/** A convex solid from triangles, each face turned outward from the centre. */
function solid(tris: V[][]) {
  const points = tris.flat();
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const cz = points.reduce((sum, p) => sum + p[2], 0) / points.length;
  const pos: number[] = [];
  for (const [a, b, c] of tris) {
    const [ux, uy, uz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const [wx, wy, wz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const [nx, ny, nz] = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
    const mx = (a[0] + b[0] + c[0]) / 3 - cx;
    const my = (a[1] + b[1] + c[1]) / 3 - cy;
    const mz = (a[2] + b[2] + c[2]) / 3 - cz;
    const flip = nx * mx + ny * my + nz * mz < 0;
    pos.push(...a, ...(flip ? c : b), ...(flip ? b : c));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Primitives standing on y = 0. */
const part = {
  box: (w: number, h: number, d: number) => new BoxGeometry(w, h, d).translate(0, h / 2, 0),
  cyl: (rt: number, rb: number, h: number, n = 8) =>
    new CylinderGeometry(rt, rb, h, n).translate(0, h / 2, 0),
  cone: (r: number, h: number, n = 8) => new ConeGeometry(r, h, n).translate(0, h / 2, 0),
  ball: (r: number, w = 8, h = 6) => new SphereGeometry(r, w, h),
  dome: (r: number) => new SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  bowl: (r: number) => new SphereGeometry(r, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
  torus: (r: number, t: number) => new TorusGeometry(r, t, 6, 28),
  log: (r: number, l: number) =>
    new CylinderGeometry(r, r, l, 6).rotateZ(Math.PI / 2).translate(0, r, 0),
  /** A pitched roof along x. */
  gable(l: number, w: number, h: number) {
    const [a, b, c] = [
      [-l / 2, 0, -w / 2],
      [-l / 2, 0, w / 2],
      [-l / 2, h, 0],
    ];
    const [A, B, C] = [
      [l / 2, 0, -w / 2],
      [l / 2, 0, w / 2],
      [l / 2, h, 0],
    ];
    return solid([
      [a, b, c],
      [A, B, C],
      [a, c, C],
      [a, C, A],
      [b, B, C],
      [b, C, c],
      [a, A, B],
      [a, B, b],
    ]);
  },
  /** A flag: a thin triangular slab. */
  pennant(l: number, h: number, t = 0.008) {
    const p = [
      [0, 0, -t],
      [0, h, -t],
      [l, h / 2, -t],
      [0, 0, t],
      [0, h, t],
      [l, h / 2, t],
    ];
    return solid([
      [p[0], p[1], p[2]],
      [p[3], p[4], p[5]],
      [p[0], p[1], p[4]],
      [p[0], p[4], p[3]],
      [p[1], p[2], p[5]],
      [p[1], p[5], p[4]],
      [p[0], p[2], p[5]],
      [p[0], p[5], p[3]],
    ]);
  },
  /** A leaning, faceted crag. */
  crag() {
    const [a, b, c, d] = [
      [-0.15, 0, -0.1],
      [0.12, 0, -0.12],
      [0.16, 0, 0.11],
      [-0.14, 0, 0.13],
    ];
    const [A, B, C, D] = [
      [-0.09, 0.34, -0.05],
      [0.045, 0.52, -0.03],
      [0.075, 0.3, 0.06],
      [-0.05, 0.27, 0.09],
    ];
    return solid([
      [a, b, B],
      [a, B, A],
      [b, c, C],
      [b, C, B],
      [c, d, D],
      [c, D, C],
      [d, a, A],
      [d, A, D],
      [A, B, C],
      [A, C, D],
      [a, d, c],
      [a, c, b],
    ]);
  },
  /** One tile of the tholos's conical roof, between two radii and two bearings. */
  roofTile(inner: number, outer: number, a0: number, a1: number) {
    const at = (r: number, a: number, lift: number) => [
      r * Math.cos(a),
      0.115 * (1 - r / 0.218) + lift,
      r * Math.sin(a),
    ];
    const [a, b, c, d] = [at(inner, a0, 0), at(outer, a0, 0), at(outer, a1, 0), at(inner, a1, 0)];
    const [A, B, C, D] = [
      at(inner, a0, 0.004),
      at(outer, a0, 0.004),
      at(outer, a1, 0.004),
      at(inner, a1, 0.004),
    ];
    return solid([
      [A, B, C],
      [A, C, D],
      [a, d, c],
      [a, c, b],
      [a, b, B],
      [a, B, A],
      [b, c, C],
      [b, C, B],
      [c, d, D],
      [c, D, C],
      [d, a, A],
      [d, A, D],
    ]);
  },
};

/** Positions and normals only, unindexed, so parts merge by concatenation. */
function bake(geo: BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const out = new BufferGeometry();
  out.setAttribute("position", g.getAttribute("position").clone());
  out.setAttribute("normal", g.getAttribute("normal").clone());
  if (g !== geo) g.dispose();
  geo.dispose();
  return out;
}

function merge(list: BufferGeometry[]) {
  const n = list.reduce((sum, g) => sum + g.getAttribute("position").count, 0);
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    pos.set(g.getAttribute("position").array, o * 3);
    nor.set(g.getAttribute("normal").array, o * 3);
    o += g.getAttribute("position").count;
  }
  const out = new BufferGeometry();
  out.setAttribute("position", new BufferAttribute(pos, 3));
  out.setAttribute("normal", new BufferAttribute(nor, 3));
  return out;
}

/** Keyline hulls need one normal per corner, or the outline cracks at every edge. */
function smoothed(geo: BufferGeometry) {
  const p = geo.getAttribute("position").array;
  const nrm = geo.getAttribute("normal").array;
  const sum = new Map<string, [number, number, number]>();
  const key = (i: number) =>
    `${Math.round(p[i] * 1e4)},${Math.round(p[i + 1] * 1e4)},${Math.round(p[i + 2] * 1e4)}`;
  for (let i = 0; i < p.length; i += 3) {
    const s = sum.get(key(i)) ?? [0, 0, 0];
    sum.set(key(i), [s[0] + nrm[i], s[1] + nrm[i + 1], s[2] + nrm[i + 2]]);
  }
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const s = sum.get(key(i))!;
    const l = Math.hypot(...s) || 1;
    out.set([s[0] / l, s[1] / l, s[2] / l], i);
  }
  geo.setAttribute("normal", new BufferAttribute(out, 3));
  return geo;
}

function template(build: (add: Add) => void): Template {
  const parts = new Map<MaterialName, BufferGeometry[]>();
  const lines: BufferGeometry[] = [];
  const m = new Matrix4();
  const add: Add = (mat, geo, x = 0, y = 0, z = 0, o = {}) => {
    m.compose(
      new Vector3(x, y, z),
      new Quaternion().setFromEuler(new Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0)),
      new Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1),
    );
    const g = bake(geo).applyMatrix4(m);
    parts.set(mat, [...(parts.get(mat) ?? []), g]);
    if (o.line !== false) lines.push(g);
  };
  build(add);
  const meshes = [...parts].map(
    ([mat, list]) => [mat, merge(list)] as [MaterialName, BufferGeometry],
  );
  const outline = lines.length ? smoothed(merge(lines)) : null;
  for (const list of parts.values()) for (const g of list) g.dispose();
  return { meshes, outline };
}

// ---- the parts the models share ---------------------------------------------------

function temple(add: Add, x: number, y: number, z: number, k: number) {
  add("stone", part.box(0.27 * k, 0.016 * k, 0.19 * k), x, y, z);
  add("marble", part.box(0.24 * k, 0.028 * k, 0.16 * k), x, y + 0.016 * k, z);
  add("stone", part.box(0.15 * k, 0.1 * k, 0.09 * k), x, y + 0.044 * k, z);
  for (const cz of [-0.065, 0.065]) {
    for (const cx of [-0.09, -0.03, 0.03, 0.09]) {
      const column = part.cyl(0.011 * k, 0.013 * k, 0.1 * k, 6);
      add("marble", column, x + cx * k, y + 0.044 * k, z + cz * k, quiet);
    }
  }
  add("marble", part.box(0.25 * k, 0.02 * k, 0.17 * k), x, y + 0.144 * k, z);
  add("clay", part.gable(0.26 * k, 0.18 * k, 0.05 * k), x, y + 0.164 * k, z);
}

function house(
  add: Add,
  x: number,
  z: number,
  ry: number,
  w: number,
  d: number,
  roof: MaterialName = "clay",
  y = 0,
) {
  add("marble", part.box(w, w * 0.7, d), x, y, z, { ry });
  add(roof, part.gable(w * 1.1, d * 1.18, w * 0.48), x, y + w * 0.7, z, { ry });
}

function sheaf(add: Add, x: number, y: number, z: number, k: number) {
  add("stubble", part.cyl(0.023 * k, 0.043 * k, 0.15 * k, 7), x, y, z, quiet);
  add("wheat", part.cone(0.042 * k, 0.08 * k, 7), x, y + 0.15 * k, z, quiet);
  add("bark", part.torus(0.027 * k, 0.004 * k), x, y + 0.085 * k, z, {
    rx: Math.PI / 2,
    line: false,
  });
}

function stook(add: Add, x: number, y: number, z: number, k: number) {
  sheaf(add, x - 0.026 * k, y, z, k);
  sheaf(add, x + 0.026 * k, y, z, k);
  sheaf(add, x, y + 0.025 * k, z + 0.025 * k, k);
}

function inField(points: readonly { x: number; z: number }[], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a, b] = [points[i], points[j]];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Ripe grain: short, jittered rows that stop at the field's outline, every stem
 *  bending under a plump ear. */
function wheatRows(add: Add, variant: number) {
  const r = rng(ART_SEED, `ripe-grain:${variant}`);
  // A stem is an open tube: its caps are too small to see, and a field draws thousands.
  const stem = (mat: MaterialName, a: V, b: V, rt: number, rb: number) => {
    const [dx, dy, dz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(dx, dy, dz);
    const tube = new CylinderGeometry(rt, rb, len, 4, 1, true).translate(0, len / 2, 0);
    add(mat, tube, a[0], a[1], a[2], {
      rx: Math.atan2(dz, dy),
      rz: -Math.atan2(dx, Math.hypot(dy, dz)),
      line: false,
    });
  };
  for (let row = -4; row <= 4; row++) {
    for (let i = -7; i <= 7; i++) {
      const x = i * 0.026 + (r() - 0.5) * 0.012;
      const z = row * 0.025 + (r() - 0.5) * 0.012;
      if (!inField(FIELD_SHAPES[variant].points, x, z)) continue;
      const edge = Math.min(1, (x / 0.175) ** 2 + (z / 0.1) ** 2);
      const h = 0.235 + r() * 0.045 + (1 - edge) * 0.015;
      const dx = (r() - 0.35) * 0.036;
      const dz = (r() - 0.5) * 0.032;
      const shoulder = [x + dx * 0.65, h * 0.72, z + dz * 0.65];
      const tip = [x + dx, h, z + dz];
      stem("grainBase", [x, 0, z], shoulder, 0.0027, 0.0045);
      stem("grainStem", shoulder, tip, 0.0016, 0.0027);
      const lean = 0.42 + r() * 0.48;
      const side = r() < 0.5 ? -1 : 1;
      const ear = {
        sx: 0.95,
        sy: 3.25 + r() * 0.5,
        sz: 0.85,
        rx: 0.15 + r() * 0.3,
        rz: -side * lean,
        line: false,
      } as const;
      const earX = tip[0] + side * Math.sin(lean) * 0.027;
      const grain = (i + row) % 3 ? "grainHead" : "grainGold";
      add(grain, part.ball(0.0125, 6, 4), earX, h + 0.017, tip[2] + 0.004, ear);
      for (let leaf = 0; leaf < 1 + Number((i + row) % 2 === 0); leaf++) {
        const sign = leaf ? -side : side;
        const blade = {
          sx: 0.7,
          sy: 3.7,
          sz: 0.28,
          rx: (r() - 0.5) * 0.8,
          rz: -sign * (0.55 + r() * 0.5),
          line: false,
        } as const;
        const [lx, ly] = [x + dx * 0.4 + sign * 0.015, h * (0.43 + leaf * 0.18)];
        add("grainLeaf", part.ball(0.01, 4, 3), lx, ly, z + dz * 0.4, blade);
      }
    }
  }
}

/** A sanctuary's figure standing in a robe; an offering bearer holds out a bowl of grain. */
function sanctuaryFigure(add: Add, robe: MaterialName, offering = false) {
  add("skin", part.cyl(0.004, 0.004, 0.027, 4), -0.007, 0, 0, quiet);
  add("skin", part.cyl(0.004, 0.004, 0.027, 4), 0.007, 0, 0, quiet);
  add(robe, part.cyl(0.014, 0.023, 0.061, 7), 0, 0.016, 0, quiet);
  add("linen", part.box(0.008, 0.044, 0.033), -0.006, 0.03, 0, { rz: 0.25, line: false });
  add("skin", part.ball(0.012, 7, 5), 0, 0.089, 0, quiet);
  for (const side of [-1, 1]) {
    const arm = part.cyl(0.0035, 0.004, 0.032, 4);
    add("skin", arm, side * 0.017, offering ? 0.044 : 0.031, offering ? 0.027 : 0.005, {
      rx: offering ? -0.8 : -0.15,
      rz: side * 0.12,
      line: false,
    });
  }
  if (offering) {
    add("bronze", part.bowl(0.022), 0, 0.065, 0.035, quiet);
    for (const x of [-0.008, 0.008])
      add("grainGold", part.ball(0.007, 6, 4), x, 0.066, 0.034, quiet);
  }
}

/** Every model the map draws, built once per scene. */
export function createTemplates(): Record<ModelName, Template> {
  const fields = Object.fromEntries(
    FIELD_SHAPES.map((_, i) => [
      `field${i}`,
      template((add) => {
        wheatRows(add, i);
        if (i % 3 === 1) stook(add, -0.115, 0, 0.025, 0.4);
      }),
    ]),
  ) as Record<`field${0 | 1 | 2 | 3 | 4 | 5}`, Template>;
  return {
    // The capital: an acropolis with a temple, steps and houses, and its flagpole.
    capital: template((add) => {
      add("rock", part.cyl(0.43, 0.48, 0.07, 7));
      add("rock", part.cyl(0.27, 0.33, 0.09, 7), 0, 0.07, -0.02, { ry: 0.45 });
      add("stone", part.box(0.1, 0.03, 0.06), 0, 0.07, 0.33);
      add("stone", part.box(0.1, 0.03, 0.05), 0, 0.1, 0.29);
      add("stone", part.box(0.1, 0.03, 0.04), 0, 0.13, 0.26);
      temple(add, 0, 0.16, -0.03, 1.35);
      house(add, -0.34, 0.2, 0.5, 0.07, 0.06, "clay", 0.07);
      house(add, 0.34, 0.2, -0.5, 0.07, 0.06, "clay", 0.07);
      house(add, -0.31, -0.24, 0.9, 0.065, 0.055, "clay", 0.07);
      add("bronze", part.cyl(0.006, 0.007, 0.32, 5), 0.21, 0.16, 0.1, quiet);
    }),
    capitalFlag: template((add) => {
      add("owner", part.box(0.1, 0.055, 0.008).translate(0.05, 0, 0), 0.21, 0.42, 0.1);
    }),
    // A city: stone walls and marble towers round its houses and hall.
    city: template((add) => {
      const R = 0.33;
      for (let i = 0; i < 8; i++) {
        const a = i * (Math.PI / 4) + Math.PI / 8;
        const wall = part.box(2 * R * Math.sin(Math.PI / 8) + 0.012, 0.09, 0.034);
        add("stone", wall, R * Math.cos(a), 0, R * Math.sin(a), { ry: -a - Math.PI / 2 });
      }
      for (let i = 0; i < 4; i++) {
        const [x, z] = [R * Math.cos(i * (Math.PI / 2)), R * Math.sin(i * (Math.PI / 2))];
        add("marble", part.box(0.075, 0.16, 0.075), x, 0, z);
        add("clay", part.cone(0.066, 0.06, 4), x, 0.16, z, { ry: Math.PI / 4 });
      }
      add("door", part.box(0.04, 0.07, 0.02), 0, 0, R + 0.035, quiet);
      house(add, -0.15, -0.11, 0.25, 0.1, 0.08);
      house(add, 0.14, -0.14, -0.3, 0.095, 0.08);
      house(add, -0.16, 0.12, -0.2, 0.09, 0.075);
      house(add, 0.15, 0.1, 0.35, 0.09, 0.075);
      add("marble", part.box(0.12, 0.11, 0.1), 0, 0, -0.01);
      add("clay", part.gable(0.13, 0.12, 0.055), 0, 0.11, -0.01);
      add("bronze", part.cyl(0.005, 0.006, 0.13, 5), -R, 0.16, 0, quiet);
    }),
    cityFlag: template((add) => {
      add("owner", part.box(0.075, 0.042, 0.007).translate(0.0375, 0, 0), -0.33, 0.245, 0);
    }),
    // A colony: timber-roofed houses behind a bark palisade.
    colony: template((add) => {
      house(add, -0.05, -0.02, 0.25, 0.13, 0.1, "timber");
      house(add, 0.1, 0.07, -0.5, 0.095, 0.08, "timber");
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (1.12 + (i / 8) * 0.78);
        const stake = part.cyl(0.011, 0.013, 0.085, 5);
        add("bark", stake, 0.22 * Math.cos(a), 0, -0.03 + 0.22 * Math.sin(a), quiet);
      }
      add("bark", part.cyl(0.007, 0.008, 0.3, 5), 0.13, 0, -0.12, quiet);
    }),
    colonyFlag: template((add) => {
      add("owner", part.pennant(0.1, 0.06), 0.137, 0.235, -0.12);
    }),
    // The buildings, each fronting on +z: the lane it stands on.
    temple: template((add) => temple(add, 0, 0, 0, 1)),
    granary: template((add) => {
      add("clay", part.cyl(0.068, 0.074, 0.075, 12));
      add("clayDark", part.dome(0.068), 0, 0.075, 0);
      add("door", part.box(0.032, 0.045, 0.02), 0, 0, 0.066, quiet);
      add("wheat", part.cone(0.022, 0.075, 6), 0.095, 0, 0.035);
      add("wheat", part.cone(0.02, 0.065, 6), 0.1, 0, -0.035);
    }),
    marketplace: template((add) => {
      add("stone", part.box(0.28, 0.015, 0.13));
      add("stone", part.box(0.26, 0.075, 0.025), 0, 0.015, -0.045);
      for (let i = 0; i < 5; i++) {
        add("marble", part.cyl(0.009, 0.009, 0.075, 5), -0.12 + i * 0.06, 0.015, 0.045, quiet);
      }
      add("clay", part.box(0.29, 0.018, 0.13), 0, 0.09, 0);
      add("linen", part.box(0.07, 0.006, 0.05), -0.07, 0.06, 0.1, { rx: 0.3 });
      add("timber", part.box(0.035, 0.03, 0.03), 0.06, 0, 0.1);
      add("clay", part.ball(0.02, 6, 5), 0.1, 0.02, 0.095);
    }),
    estate: template((add) => {
      house(add, -0.06, -0.04, 0.2, 0.1, 0.08);
      for (let i = 0; i < 3; i++) {
        add("wheat", part.box(0.15, 0.012, 0.022), 0.03, 0, 0.055 + i * 0.035, quiet);
      }
      for (const [x, z] of [
        [0.09, -0.07],
        [0.13, -0.01],
      ]) {
        add("bark", part.cyl(0.008, 0.01, 0.05, 5), x, 0, z, quiet);
        add("leaf", part.ball(0.034, 7, 5), x, 0.07, z);
      }
    }),
    // The Forum, which the prototype did not draw: a paved square before a short
    // stoa, a speaker's step and a bronze stele.
    forum: template((add) => {
      add("stone", part.box(0.26, 0.014, 0.2));
      add("marble", part.box(0.24, 0.018, 0.06), 0, 0.014, -0.065);
      add("stone", part.box(0.24, 0.08, 0.02), 0, 0.032, -0.088);
      for (let i = 0; i < 5; i++) {
        add("marble", part.cyl(0.009, 0.01, 0.08, 5), -0.1 + i * 0.05, 0.032, -0.045, quiet);
      }
      add("marble", part.box(0.25, 0.016, 0.075), 0, 0.112, -0.062);
      add("clay", part.box(0.26, 0.012, 0.085), 0, 0.128, -0.062, { rx: -0.12 });
      add("stone", part.box(0.06, 0.028, 0.045), 0.05, 0.014, 0.05);
      add("bronze", part.box(0.022, 0.07, 0.01), -0.07, 0.014, 0.055);
    }),
    // A Port: a stone landing, a timber pier on piles out over the sea, a house.
    port: template((add) => {
      add("stone", part.box(0.06, 0.12, 0.09), 0, -0.12, 0);
      add("timber", part.box(0.5, 0.02, 0.085), 0.28, -0.115, 0);
      for (const x of [0.16, 0.34, 0.5]) {
        for (const z of [-0.04, 0.04]) {
          add("bark", part.cyl(0.011, 0.011, 0.13, 5), x, -0.24, z, quiet);
        }
      }
      add("bronze", part.cyl(0.012, 0.014, 0.03, 6), 0.49, -0.095, 0.028);
      house(add, -0.13, 0, 0, 0.09, 0.075);
    }),
    boat: template((add) => {
      add("timber", part.bowl(0.05), 0, 0.012, 0, { sx: 2.4, sy: 0.75, sz: 1 });
      add("timber", part.box(0.2, 0.008, 0.07), 0, 0.006, 0);
      add("bark", part.cyl(0.005, 0.006, 0.13, 5), 0.01, 0.01, 0, quiet);
      add("linen", part.box(0.006, 0.07, 0.08), 0.016, 0.055, 0);
    }),
    // A luxury good: amphorae on a moored raft, and its holder's pennant.
    good: template((add) => {
      add("timber", part.box(0.17, 0.022, 0.12), 0, -0.008, 0);
      for (const [x, z] of [
        [-0.04, -0.025],
        [0.02, 0.03],
        [0.05, -0.03],
      ]) {
        add("clay", part.ball(0.025, 8, 6), x, 0.038, z);
        add("clay", part.cyl(0.008, 0.011, 0.03, 6), x, 0.055, z);
      }
      add("bark", part.cyl(0.007, 0.008, 0.17, 5), -0.072, 0, 0.045, quiet);
    }),
    goodFlag: template((add) => {
      add("owner", part.pennant(0.075, 0.045), -0.072, 0.12, 0.045);
    }),
    // Where a slave works, at the resource's edge: cut wood, a quarry face, sheaves.
    cut_forest: template((add) => {
      add("bark", part.cyl(0.027, 0.035, 0.065, 7), -0.095, 0, -0.035);
      add("timber", part.cyl(0.026, 0.026, 0.004, 7), -0.095, 0.065, -0.035, quiet);
      for (const z of [-0.035, 0.012, 0.059]) add("bark", part.log(0.023, 0.16), 0.025, 0, z);
      for (const z of [-0.012, 0.035]) add("timber", part.log(0.022, 0.165), 0.025, 0.043, z);
      add("bark", part.log(0.021, 0.16), 0.025, 0.084, 0.012);
      add("timber", part.cyl(0.004, 0.005, 0.12, 5), -0.095, 0.065, -0.035, {
        rz: -0.25,
        line: false,
      });
      add("stone", part.box(0.035, 0.027, 0.01), -0.069, 0.157, -0.035);
    }),
    cut_mountain: template((add) => {
      // An open excavation: high back and return walls, a shaded floor, two cut benches.
      add("rock", part.box(0.21, 0.27, 0.055), 0, 0, 0.055);
      add("rock", part.box(0.045, 0.2, 0.13), -0.09, 0, 0.005);
      add("quarry", part.box(0.16, 0.22, 0.012), 0.015, 0.015, 0.021, quiet);
      add("earth", part.box(0.16, 0.006, 0.12), 0.018, 0, -0.025, quiet);
      add("quarry", part.box(0.15, 0.06, 0.035), 0.015, 0.005, 0.005);
      add("stone", part.box(0.075, 0.035, 0.04), 0.025, 0.005, -0.05);
      for (const x of [-0.025, 0.025, 0.065]) {
        add("rock", part.box(0.003, 0.18, 0.002), x, 0.04, 0.013, quiet);
      }
      add("quarry", part.box(0.05, 0.045, 0.045), 0.09, 0, -0.085, { ry: 0.3 });
      add("timber", part.cyl(0.004, 0.005, 0.15, 5), -0.04, 0, -0.06, { rz: -0.3, line: false });
      add("stone", part.box(0.075, 0.012, 0.012), 0, 0.135, -0.06, { rz: -0.2 });
    }),
    cut_plains: template((add) => {
      stook(add, -0.11, 0, -0.075, 0.8);
      sheaf(add, 0.12, 0, -0.07, 0.85);
      add("timber", part.cyl(0.004, 0.005, 0.055, 5), 0.07, 0, -0.1, { rz: -0.25, line: false });
      const sickle = new TorusGeometry(0.024, 0.004, 4, 10, Math.PI * 1.2);
      add("bronze", sickle, 0.078, 0.069, -0.1, quiet);
    }),
    // Broad crowns, bare trunks and tiered outlines read even at the opening zoom.
    olive: template((add) => {
      add("bark", part.cyl(0.017, 0.028, 0.24, 7), 0, 0, 0, { rz: -0.1 });
      add("bark", part.cyl(0.009, 0.016, 0.13, 6), 0, 0.15, 0, { rz: 0.65 });
      add("bark", part.cyl(0.009, 0.016, 0.13, 6), 0.015, 0.15, 0, { rz: -0.75 });
      add("leafDark", part.ball(0.105, 8, 6), 0, 0.285, 0.025, { sx: 1.25, sy: 0.85 });
      add("leafSoft", part.ball(0.105, 8, 6), -0.075, 0.325, -0.015, { sx: 1.05, sy: 0.85 });
      add("leafSoft", part.ball(0.095, 8, 6), 0.075, 0.33, 0.005, { sy: 0.9 });
      add("leaf", part.ball(0.09, 8, 6), -0.01, 0.385, -0.035, { sx: 1.15, sy: 0.8 });
    }),
    cypress: template((add) => {
      add("bark", part.cyl(0.012, 0.021, 0.2, 6));
      add("leafDark", part.ball(0.085, 8, 6), 0, 0.32, 0, { sy: 2.2 });
      add("leafDark", part.cone(0.076, 0.38, 8), 0, 0.3, 0);
      add("leafSoft", part.cone(0.048, 0.24, 8), -0.008, 0.46, -0.008, quiet);
    }),
    pine: template((add) => {
      add("bark", part.cyl(0.014, 0.025, 0.42, 7));
      add("leafDark", part.cone(0.16, 0.24, 9), 0, 0.18, 0);
      add("leafSoft", part.cone(0.135, 0.23, 9), 0, 0.31, 0, { ry: 0.3 });
      add("leaf", part.cone(0.095, 0.22, 9), 0, 0.44, 0, { ry: 0.15 });
    }),
    outcrop: template((add) => add("crag", part.crag())),
    looseRock: template((add) =>
      add("stone", part.crag(), 0, 0, 0, { sx: 1.25, sy: 0.64, sz: 1.25 }),
    ),
    boulder: template((add) => {
      add("crag", new IcosahedronGeometry(0.1, 0), 0, 0.06, 0, { sx: 1.3, sy: 0.85 });
      add("stone", new IcosahedronGeometry(0.06, 0), 0.09, 0.035, 0.04, { sy: 0.7 });
    }),
    scrub: template((add) => {
      add("bark", part.cyl(0.006, 0.014, 0.07, 5), 0, 0, 0, quiet);
      add("leafDark", part.ball(0.073, 7, 5), 0, 0.075, 0, { sx: 1.2, sy: 0.8 });
      add("leafSoft", part.ball(0.053, 7, 5), -0.05, 0.095, -0.02, { sy: 0.85 });
      add("leafSoft", part.ball(0.047, 7, 5), 0.055, 0.065, 0.015, { sy: 0.8 });
    }),
    ...fields,
    // The Oracle (Delphi): a tholos on a stepped platform, drawn in every band.
    oracleCore: template((add) => {
      add("stone", part.cyl(0.34, 0.36, 0.025, 20));
      add("rock", part.cyl(0.29, 0.31, 0.025, 20), 0, 0.025, 0);
      add("marble", part.cyl(0.24, 0.26, 0.025, 20), 0, 0.05, 0);
      add("stone", part.cyl(0.11, 0.11, 0.13, 16), 0, 0.075, -0.02);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const column = part.cyl(0.011, 0.012, 0.13, 6);
        add("marble", column, 0.165 * Math.cos(a), 0.075, -0.02 + 0.165 * Math.sin(a), quiet);
      }
      add("marble", part.cyl(0.185, 0.185, 0.018, 24), 0, 0.205, -0.02);
      // A dark soffit under an overhanging cone: the roof rises unbroken to its centre.
      add("clayDark", part.cyl(0.218, 0.218, 0.008, 24), 0, 0.223, -0.02, quiet);
      add("clay", part.cone(0.218, 0.115, 24), 0, 0.231, -0.02, quiet);
      for (let row = 0; row < 4; row++) {
        for (let i = 0; i < 24; i++) {
          const inner = 0.026 + row * 0.047;
          const a = ((i + (row % 2) * 0.5) * Math.PI) / 12;
          const tile = part.roofTile(inner, inner + 0.046, a + 0.009, a + Math.PI / 12 - 0.009);
          add((i + row * 2) % 7 === 0 ? "clayLight" : "clay", tile, 0, 0.232, -0.02, quiet);
        }
      }
      add("bronze", part.cyl(0.008, 0.012, 0.02, 8), 0, 0.344, -0.02, quiet);
      add("bronze", part.ball(0.012, 8, 6), 0, 0.369, -0.02);
    }),
    // Close in: the omphalos, the tripod over the cleft, and the laurel.
    oracleDetail: template((add) => {
      add("stone", part.cyl(0.035, 0.038, 0.012, 12), 0.17, 0.075, 0.12);
      add("marble", part.dome(0.028), 0.17, 0.087, 0.12);
      add("bronze", part.torus(0.024, 0.003), 0.17, 0.095, 0.12, { rx: Math.PI / 2, line: false });
      add("door", part.box(0.13, 0.004, 0.022), -0.37, 0, 0.12, { ry: 0.5, line: false });
      add("door", part.box(0.07, 0.004, 0.018), -0.42, 0, 0.16, { ry: -0.4, line: false });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        // The legs splay out at the foot and lean in under the cauldron.
        const leg = part
          .cyl(0.004, 0.004, 0.12, 5)
          .rotateX(0.2)
          .rotateY(Math.atan2(-Math.cos(a), -Math.sin(a)));
        add("bronze", leg, -0.38 + 0.045 * Math.cos(a), 0, 0.13 + 0.045 * Math.sin(a), quiet);
      }
      add("bronze", part.bowl(0.034), -0.38, 0.13, 0.13);
      add("bronze", part.torus(0.034, 0.004), -0.38, 0.13, 0.13, { rx: Math.PI / 2, line: false });
      add("bark", part.cyl(0.008, 0.011, 0.07, 5), 0.33, 0, -0.2, { rz: 0.12, line: false });
      add("leafDark", part.ball(0.045, 8, 6), 0.335, 0.1, -0.2, { sy: 0.85 });
      add("leafDark", part.ball(0.034, 8, 6), 0.3, 0.085, -0.17);
      add("leafDark", part.ball(0.032, 8, 6), 0.365, 0.08, -0.23);
    }),
    oraclePythia: template((add) => {
      // Hips rest on the tripod's rim; the skirt and bent knees reach toward the steps.
      add("linen", part.ball(0.027, 7, 5), 0, 0.143, 0.012, { sy: 0.6, sz: 1.25, line: false });
      add("linen", part.cyl(0.014, 0.022, 0.055, 7), 0, 0.145, 0, { rx: -0.1, line: false });
      for (const side of [-1, 1]) {
        const knee = { rx: -0.12, line: false } as const;
        add("linen", part.cyl(0.012, 0.014, 0.062, 6), side * 0.014, 0.083, 0.034, knee);
        add("skin", part.ball(0.008, 6, 4), side * 0.014, 0.081, 0.043, { sz: 1.6, line: false });
        const arm = { rx: -0.55, line: false } as const;
        add("skin", part.cyl(0.0035, 0.004, 0.04, 4), side * 0.021, 0.149, 0.026, arm);
      }
      add("skin", part.ball(0.013, 8, 6), 0, 0.215, -0.006, quiet);
      add("marble", part.dome(0.015), 0, 0.218, -0.009, { sy: 0.8, sz: 1.3, line: false });
      add("leaf", part.torus(0.013, 0.003), 0, 0.219, -0.006, { rx: Math.PI / 2, line: false });
    }),
    oraclePriest: template((add) => {
      sanctuaryFigure(add, "marble");
      add("timber", part.cyl(0.0025, 0.003, 0.12, 5), 0.027, 0, 0.012, quiet);
    }),
    oraclePilgrim: template((add) => sanctuaryFigure(add, "linen")),
    oracleOffering: template((add) => sanctuaryFigure(add, "ochre", true)),
    // The pops: the silhouette tells the class, and the owner's glaze shows only on a
    // sash, a cap or a waistband. A citizen in a long robe and a wreath.
    citizen: template((add) => {
      add("linen", part.cone(0.024, 0.078, 8), 0, 0, 0, quiet);
      const sash = part.cyl(0.0158, 0.0178, 0.009, 10).translate(0, -0.0045, 0);
      add("owner", sash, 0, 0.036, 0, { rz: 0.45, line: false });
      add("skin", part.ball(0.012, 8, 6), 0, 0.085, 0, quiet);
      add("leaf", part.torus(0.011, 0.0035), 0, 0.091, 0, { rx: Math.PI / 2, line: false });
    }),
    // A freeman in a short tunic and a pointed cap.
    freeman: template((add) => {
      add("skin", part.cyl(0.0042, 0.0042, 0.03, 4), -0.0065, 0, 0, quiet);
      add("skin", part.cyl(0.0042, 0.0042, 0.03, 4), 0.0065, 0, 0, quiet);
      add("linen", part.cyl(0.0135, 0.018, 0.038, 8), 0, 0.026, 0, quiet);
      add("skin", part.ball(0.0115, 8, 6), 0, 0.075, 0, quiet);
      add("owner", part.cone(0.0125, 0.02, 8), 0, 0.081, 0, quiet);
    }),
    // A slave, bare to the waist, with a yoke and two baskets on the shoulders.
    slave: template((add) => {
      add("skin", part.cyl(0.0042, 0.0042, 0.026, 4), -0.0065, 0, 0, quiet);
      add("skin", part.cyl(0.0042, 0.0042, 0.026, 4), 0.0065, 0, 0, quiet);
      add("owner", part.cyl(0.0145, 0.0155, 0.012, 8), 0, 0.022, 0, quiet);
      add("skin", part.cyl(0.0115, 0.0135, 0.03, 8), 0, 0.034, 0, quiet);
      add("skin", part.ball(0.011, 8, 6), 0, 0.074, 0, quiet);
      add("timber", part.box(0.08, 0.005, 0.006), 0, 0.062, 0, quiet);
      add("wheat", part.cyl(0.009, 0.007, 0.016, 6), -0.038, 0.042, 0, quiet);
      add("wheat", part.cyl(0.009, 0.007, 0.016, 6), 0.038, 0.042, 0, quiet);
    }),
    // A ship carrying pops, its sail banded in the owner's glaze.
    ship: template((add) => {
      add("timber", part.bowl(0.06), 0, 0.016, 0, { sx: 2.6, sy: 0.8, sz: 1 });
      add("timber", part.box(0.27, 0.01, 0.09), 0, 0.01, 0);
      add("bark", part.cyl(0.006, 0.007, 0.18, 5), 0.015, 0.015, 0, quiet);
      add("linen", part.box(0.007, 0.1, 0.11), 0.022, 0.07, 0);
    }),
    shipBand: template((add) => add("owner", part.box(0.009, 0.024, 0.112), 0.022, 0.12, 0, quiet)),
    // A riot's torch: a staff and its flame.
    torch: template((add) => {
      add("bark", part.cyl(0.009, 0.012, 0.22, 5));
      add("flame", part.cone(0.03, 0.08, 6), 0, 0.22, 0);
      add("flameCore", part.cone(0.016, 0.05, 6), 0, 0.225, 0.01, quiet);
    }),
    // The titles' laurel: a gold ring of leaves, turning over a capital.
    laurel: template((add) => {
      add("gold", part.torus(0.14, 0.011), 0, 0, 0, { rx: Math.PI / 2 });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        add("leaf", part.ball(0.022, 6, 4), 0.14 * Math.cos(a), 0.012, 0.14 * Math.sin(a), {
          ry: -a + 0.6,
          sx: 0.45,
          sy: 0.35,
          sz: 1.1,
        });
      }
    }),
    // A gull: two bent wings and a body, too small for a keyline.
    gull: template((add) => {
      add("linen", part.box(0.046, 0.003, 0.014), -0.02, 0, 0, { rz: -0.35, line: false });
      add("linen", part.box(0.046, 0.003, 0.014), 0.02, 0, 0, { rz: 0.35, line: false });
      add("marble", part.ball(0.007, 6, 4), 0, 0, 0, { sz: 1.8, line: false });
    }),
  };
}

export function disposeTemplate(tpl: Template) {
  for (const [, geo] of tpl.meshes) geo.dispose();
  tpl.outline?.dispose();
}

/** The towns' worn ground: each clearing and building lobe, a fan round its centre. */
export function groundGeometry(towns: readonly Town[]) {
  const pos: number[] = [];
  for (const town of towns) {
    for (const { centre: c, ring, y } of town.ground) {
      ring.forEach((p, i) => {
        const q = ring[(i + 1) % ring.length];
        pos.push(c.x, y, c.z, q.x, y, q.z, p.x, y, p.z);
      });
    }
  }
  return flatGeometry(pos);
}

/** The towns' lanes: a ribbon along a smooth curve through each lane's points. */
export function laneGeometry(towns: readonly Town[]) {
  const pos: number[] = [];
  for (const town of towns) {
    const c = town.ground[0].centre;
    for (const lane of town.lanes) {
      const curve = new CatmullRomCurve3(lane.map((p) => new Vector3(p.x, H_TILE + 0.004, p.z)));
      const pts = curve.getPoints(18);
      for (let i = 0; i < pts.length - 1; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        const d = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const w = 0.012 + Math.sin(i * 1.7 + c.x) * 0.002;
        const nx = (-(b.z - a.z) / d) * w;
        const nz = ((b.x - a.x) / d) * w;
        pos.push(a.x - nx, a.y, a.z - nz, b.x + nx, b.y, b.z + nz, b.x - nx, b.y, b.z - nz);
        pos.push(a.x - nx, a.y, a.z - nz, a.x + nx, a.y, a.z + nz, b.x + nx, b.y, b.z + nz);
      }
    }
  }
  return flatGeometry(pos);
}

function flatGeometry(pos: number[]) {
  // With nothing to draw, one empty triangle under the sea: the mesh still draws, so
  // the warm-up builds its shader before the first town needs it.
  if (!pos.length) pos.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
