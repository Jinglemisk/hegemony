import {
  Color,
  DataTexture,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
} from "three";
import { clamp } from "./camera";
import type { BoardShape } from "./mapModel";
import { SEA } from "./palette";

/**
 * The sea: one plane and one shader. Its foam and waves read a distance field of the
 * coast, baked once per board into a texture, so any coastline (several islands, an
 * inlet) gets the same surf. The grout between the tiles is the sea seen through the
 * joints, painted dark.
 */

const DEG = Math.PI / 180;
const APOTHEM = Math.sqrt(3) / 2;
/** Texels per world unit: the prototype's 256 across 18 units. */
const DENSITY = 256 / 18;

/** The signed distance to the coast, sampled on a square about the origin: negative
 *  on land, stored as (d + 0.5) / 3 so −0.5 … 2.5 fills a byte. */
export function coastField(shape: BoardShape) {
  const n = Math.min(512, Math.ceil(2 * shape.half * DENSITY));
  const at = (i: number) => -shape.half + ((i + 0.5) * 2 * shape.half) / n;
  /** The texels within `r` of the box [x0, x1] × [y0, y1], as index ranges. */
  const texels = (x0: number, x1: number, y0: number, y1: number, r: number) => {
    const index = (v: number) => ((v + shape.half) * n) / (2 * shape.half) - 0.5;
    const lo = (v: number) => clamp(Math.floor(index(v - r)), 0, n - 1);
    const hi = (v: number) => clamp(Math.ceil(index(v + r)), 0, n - 1);
    return [lo(x0), hi(x1), lo(y0), hi(y1)] as const;
  };

  // Each tile marks the texels on its top, and each coast side measures only the texels
  // within 2.5 of it: farther out the byte is already full on the sea, empty on land. An
  // archipelago has several times one island's coast, and this keeps its bake short.
  const land = new Uint8Array(n * n);
  for (const cell of shape.cells) {
    const [i0, i1, j0, j1] = texels(cell.x, cell.x, cell.y, cell.y, 1);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const dx = at(i) - cell.x;
        const dy = at(j) - cell.y;
        if (
          Math.max(
            Math.abs(dx),
            Math.abs(0.5 * dx + APOTHEM * dy),
            Math.abs(-0.5 * dx + APOTHEM * dy),
          ) <= APOTHEM
        )
          land[j * n + i] = 1;
      }
    }
  }
  const d2 = new Float64Array(n * n).fill(Infinity);
  for (const cell of shape.cells) {
    for (const side of cell.seaSides) {
      const a0 = (60 * side - 30) * DEG;
      const a1 = (60 * side + 30) * DEG;
      const [ax, ay] = [cell.x + Math.cos(a0), cell.y + Math.sin(a0)];
      const [bx, by] = [cell.x + Math.cos(a1), cell.y + Math.sin(a1)];
      const vx = bx - ax;
      const vy = by - ay;
      const [i0, i1, j0, j1] = texels(
        Math.min(ax, bx),
        Math.max(ax, bx),
        Math.min(ay, by),
        Math.max(ay, by),
        2.5,
      );
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const [px, py] = [at(i), at(j)];
          const u = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1);
          const dx = px - ax - u * vx;
          const dy = py - ay - u * vy;
          d2[j * n + i] = Math.min(d2[j * n + i], dx * dx + dy * dy);
        }
      }
    }
  }
  const data = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) {
    const d = Math.sqrt(d2[k]);
    data[k] = clamp(((land[k] ? -d : d) + 0.5) / 3, 0, 1) * 255;
  }
  return { data, n };
}

/** One field per board: a remount (StrictMode's, or a new view of the same game) reuses it. */
const fields = new WeakMap<BoardShape, ReturnType<typeof coastField>>();

export function createSea(shape: BoardShape) {
  const { data, n } = fields.get(shape) ?? coastField(shape);
  fields.set(shape, { data, n });
  const field = new DataTexture(data, n, n, RedFormat);
  field.minFilter = field.magFilter = LinearFilter;
  field.needsUpdate = true;
  const uniforms = {
    uTime: { value: 0 },
    uSdf: { value: field },
    uHalf: { value: shape.half },
    uLit: { value: new Color(SEA.lit) },
    uSea: { value: new Color(SEA.sea) },
    uDeep: { value: new Color(SEA.deep) },
    uShallow: { value: new Color(SEA.shallow) },
    uFoam: { value: new Color(SEA.foam) },
    uGrout: { value: new Color(SEA.grout) },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform sampler2D uSdf; uniform float uHalf;
      uniform vec3 uLit; uniform vec3 uSea; uniform vec3 uDeep; uniform vec3 uShallow;
      uniform vec3 uFoam; uniform vec3 uGrout;
      varying vec2 vW;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 uv = (vW + uHalf) / (2.0 * uHalf);
        float d = 2.5;
        if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) d = texture2D(uSdf, uv).r * 3.0 - 0.5;
        if (d < -0.07) { gl_FragColor = vec4(uGrout, 1.0); return; }
        float dw = max(d + 0.04, 0.0);
        float r = length(vW);
        vec3 col = mix(uLit, uSea, smoothstep(3.5, 8.0, r));
        col = mix(col, uDeep, smoothstep(8.0, 22.0, r));
        float n = noise(vW * 1.2 + vec2(uTime * 0.05, -uTime * 0.04));
        float n2 = noise(vW * 3.3 - vec2(uTime * 0.12, uTime * 0.08));
        col *= 0.95 + 0.08 * n + 0.04 * n2;
        col = mix(col, uShallow, (1.0 - smoothstep(0.0, 1.1, dw)) * 0.5);
        float wave = sin(dw * 12.0 + uTime * 1.8 + n * 3.0);
        float bands = smoothstep(0.8, 0.97, wave) * (1.0 - smoothstep(0.1, 0.95, dw)) * (0.55 + 0.45 * n2);
        float surge = 0.075 + 0.04 * sin(uTime * 1.3 + n2 * 6.0);
        float contact = 1.0 - smoothstep(surge * 0.55, surge, dw);
        float foam = clamp(max(contact * (0.8 + 0.2 * n2), bands * 0.8), 0.0, 1.0);
        gl_FragColor = vec4(mix(col, uFoam, foam), 1.0);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(160, 160), material);
  mesh.rotation.x = -Math.PI / 2;
  return {
    mesh,
    uniforms,
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      field.dispose();
    },
  };
}
