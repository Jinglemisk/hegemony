import { hexDistance } from "../../../game/mapTopology";
import type { BuildingId, MaterialResource, PlayerId } from "../../../game/types";
import { H_TILE, R_TOP, smooth } from "./camera";
import { pilgrimagePlan, seaRoute, walkPlan } from "./life";
import type { Walk } from "./life";
import type { MapModel, MapSettlement, MapTile } from "./mapModel";
import { glazeOf } from "./palette";

/**
 * Where every model on the living map stands: the towns and their buildings, the
 * work sites, the trees, rocks and fields, the Ports' boats, the goods and the Oracle,
 * and who is about: one figure per pop, the pilgrims, a ship for each transfer, and
 * the sea life (trade ships, fishing boats, gulls, smoke, a riot's torches, the
 * titles' laurel).
 * The prototype's placement, as pure functions of the map model and the match seed,
 * so the same state always looks the same and the scene only draws what this says.
 *
 * A tile's decor is a fixed inventory of seeded points, cached per tile. A town takes
 * a prefix of its tile's inventory, the points farthest from the town first, so a
 * new building removes the trees nearest town and never moves a survivor. Nothing
 * reads another tile, so a change on one tile never reshuffles another's trees.
 *
 * Coordinates are the scene's: x east, z south (the map model's y), y up.
 */

export type ModelName =
  | "capital"
  | "city"
  | "colony"
  | BuildingId
  | "boat"
  | "good"
  | "goodFlag"
  | "cut_forest"
  | "cut_mountain"
  | "cut_plains"
  | "olive"
  | "cypress"
  | "pine"
  | "outcrop"
  | "looseRock"
  | "boulder"
  | "scrub"
  | `field${0 | 1 | 2 | 3 | 4 | 5}`
  | "oracleCore"
  | "oracleDetail"
  | "oraclePythia"
  | "oraclePriest"
  | FigureModel
  | "ship"
  | "shipBand"
  | "torch"
  | "laurel"
  | "gull";

/** The figures: a pop's class, or a pilgrim at the Oracle. */
export type FigureModel = "citizen" | "freeman" | "slave" | "oraclePilgrim" | "oracleOffering";

/** One instance of a model: where, which way, how big, and its owner's glaze. */
export type Place = {
  x: number;
  y: number;
  z: number;
  ry?: number;
  s?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: number;
};

/** Something afloat that bobs on the swell: a good's raft, its pennant, a boat. */
export type Floating = { x: number; y: number; z: number; ry: number; s: number; phase: number };

type XZ = { x: number; z: number };

/** Someone about the board: a slave at work, a walker, or a pop riding a ship. */
export type Figure = { scale: number; phase: number; color: number } & (
  | { mode: "work"; x: number; z: number; fx: number; fz: number }
  | { mode: "walk"; plan: Walk }
  | { mode: "ride"; ship: number; slot: number }
);

/** A ship sailing to and fro along its sea route: a transfer's, carrying its pops,
 *  or a trader's, at its own pace. */
export type Ship = {
  id: string;
  route: XZ[];
  phase: number;
  speed: number;
  color: number;
  label: string;
};

/** Something circling a point at height `h`: a fishing boat, a gull. */
export type Circling = XZ & { rad: number; h: number; phase: number; speed: number };

/** A building's address in its town: its door faces the lane that ends at `junction`. */
export type Site = {
  building: BuildingId;
  x: number;
  z: number;
  ry: number;
  radius: number;
  junction?: XZ;
};

/** A town's worn ground, as fans round a centre at a height, and its lanes. */
export type Town = {
  tileId: string;
  settlementId: string;
  centre: XZ;
  sites: Site[];
  ground: { centre: XZ; ring: XZ[]; y: number }[];
  lanes: XZ[][];
};

export type Layout = {
  /** What the standing models were made from: the same key stands them the same. */
  key: string;
  /** And the figures and ships, which also follow the pops and the transfers. */
  lifeKey: string;
  models: Partial<Record<ModelName, Place[]>>;
  towns: Town[];
  goods: Floating[];
  flags: (Floating & { color: number })[];
  boats: Floating[];
  figures: Partial<Record<FigureModel, Figure[]>>;
  ships: Ship[];
  /** Sea life: each realm's Ports trading with its coast, fishing boats off the
   *  island and gulls over its Ports, from the seed. */
  traders: Ship[];
  fishers: Circling[];
  gulls: Circling[];
  /** Smoke: a town's hearths, and a rioting realm's cities (at their tiles' centres). */
  hearths: XZ[];
  riots: (XZ & { owner: PlayerId })[];
};

const SQ3 = Math.sqrt(3);
/** A town's centre sits this far north of its tile's, clear of the name plate. */
export const MAIN_Z = -0.08;
/** Resource volume per slot: the trees, crags or fields one slot stands for. */
const RESOURCE_UNIT = 4;
const FIELD_AREA = 0.016;
/** The model kit's own seed: the fields are art, the same in every match. */
export const ART_SEED = 42;
/** The figures' scale on the board. */
const FIGURE_SCALE = 1.25;
/** A building's lot, past its radius: no slave works on it. */
const LOT = 1.15;
/** How far east each of a tile's six sides lies (see `openSeaSides`). */
const EAST = [1, 0.5, -0.5, -1, -0.5, 0.5];

/** A seeded stream from a key: FNV-1a into mulberry32, the prototype's. */
export function rng(seed: number, key: string) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The fields: irregular, elongated outlines that share the grain model; their
 *  measured area pays the field budget. */
export const FIELD_SHAPES = Array.from({ length: 6 }, (_, variant) => {
  const r = rng(ART_SEED, `field-outline:${variant}`);
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const k = 0.78 + r() * 0.25;
    return {
      x: Math.cos(a) * (variant % 2 ? 0.175 : 0.145) * k,
      z: Math.sin(a) * (variant % 2 ? 0.07 : 0.093) * k,
    };
  });
  const area =
    Math.abs(
      points.reduce((n, p, i) => {
        const q = points[(i + 1) % points.length];
        return n + p.x * q.z - q.x * p.z;
      }, 0),
    ) / 2;
  return { points, area, radius: Math.max(...points.map((p) => Math.hypot(p.x, p.z))) };
});

/** How far out a point is in the hex's own measure (0 at the centre). */
const hexSupport = (x: number, z: number) =>
  Math.max(Math.abs(x), Math.abs(x * 0.5 + (z * SQ3) / 2), Math.abs(x * 0.5 - (z * SQ3) / 2));

/** The labels' lanes, in a tile's own coordinates: the yield chip's across the middle,
 *  and on a settled tile the name plate's to the south. */
function labelClear(x: number, z: number, radius = 0, settled = true) {
  return (
    !(Math.abs(x) < 0.29 + radius && z > -0.025 - radius && z < 0.115 + radius) &&
    (!settled || !(Math.abs(x) < 0.52 + radius && z > 0.38 - radius && z < 0.61 + radius))
  );
}

type Point = {
  x: number;
  z: number;
  spacing: number;
  noise: number;
  choice: number;
  species: number;
  variant: number;
  ry: number;
  priority: number;
  key: string;
};
type TownPoint = { x: number; z: number; key: string; jitter: number };
type Item = {
  model: ModelName;
  x: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  radius: number;
  cost: number;
  end: number;
  key: string;
};

/** What a tile's placement is built from: fixed for a match, so made once. */
type TileSeed = {
  resources: Point[];
  town: TownPoint[];
  /** The noise lattice's values, by cell. */
  lattice: Map<number, number>;
  /** The phase of the town's outline. */
  edge: number;
};

let cache = {
  seed: NaN,
  tiles: new Map<string, TileSeed>(),
  inventories: new Map<string, Item[]>(),
};

/** One tile, as the placement reads it. */
type Tile = Pick<MapTile, "id" | "x" | "y" | "terrain" | "slots">;

/** The spacing test's grid: a cell as wide as the widest spacing, 20 cells a side. */
const CELL = 0.11;
const cellOf = (x: number, z: number) =>
  Math.floor((x + 1.1) / CELL) * 20 + Math.floor((z + 1.1) / CELL);

function decor(seed: number) {
  if (cache.seed !== seed) cache = { seed, tiles: new Map(), inventories: new Map() };
  const hash01 = (key: string) => rng(seed, key)();

  /** Smooth value noise over a tile: where the woods thicken and the fields lie. */
  function terrainNoise(t: Tile, x: number, z: number) {
    const u = x * 1.7 + 7;
    const v = z * 1.7 + 7;
    const ix = Math.floor(u);
    const iz = Math.floor(v);
    const a = smooth(0, 1, u - ix);
    const b = smooth(0, 1, v - iz);
    const { lattice } = tileSeed(t);
    const n = (dx: number, dz: number) => {
      const key = (ix + dx) * 1000 + iz + dz;
      let value = lattice.get(key);
      if (value === undefined) {
        value = hash01(`land:${t.id}:${ix + dx}:${iz + dz}`);
        lattice.set(key, value);
      }
      return value;
    };
    return (n(0, 0) * (1 - a) + n(1, 0) * a) * (1 - b) + (n(0, 1) * (1 - a) + n(1, 1) * a) * b;
  }

  /** A tile's candidate points: Poisson-spaced resource points, denser where the
   *  noise is high, and the building addresses round a town. */
  function tileSeed(t: Tile): TileSeed {
    const known = cache.tiles.get(t.id);
    if (known) return known;
    const made: TileSeed = {
      resources: [],
      town: [],
      lattice: new Map(),
      edge: hash01(`edge:${t.id}`),
    };
    cache.tiles.set(t.id, made);
    const { resources, town } = made;
    const r = rng(seed, `candidates:${t.id}`);
    const grid = new Map<number, Point[]>();
    const crowded = (x: number, z: number, spacing: number) => {
      const at = cellOf(x, z);
      for (const cell of [
        at - 21,
        at - 20,
        at - 19,
        at - 1,
        at,
        at + 1,
        at + 19,
        at + 20,
        at + 21,
      ]) {
        const near = grid.get(cell);
        if (near?.some((p) => Math.hypot(x - p.x, z - p.z) < (spacing + p.spacing) / 2))
          return true;
      }
      return false;
    };
    for (let i = 0; i < 9000; i++) {
      const x = (r() - 0.5) * 1.64;
      const z = (r() - 0.5) * 1.85;
      if (hexSupport(x, z) > (R_TOP * SQ3) / 2 - 0.105) continue;
      const noise = terrainNoise(t, x, z);
      const spacing = 0.06 + 0.05 * (1 - noise);
      if (r() > 0.22 + noise * 0.78 || crowded(x, z, spacing)) continue;
      const choice = r();
      const p = {
        x,
        z,
        spacing,
        noise,
        choice,
        species: Math.floor(r() * 3),
        variant: Math.floor(r() * 6),
        ry: r() * Math.PI * 2,
        priority: -Math.log(Math.max(1e-6, r())) / (0.15 + noise * noise),
        key: `${t.id}:r${resources.length}`,
      };
      resources.push(p);
      grid.set(cellOf(x, z), [...(grid.get(cellOf(x, z)) ?? []), p]);
    }
    const b = rng(seed, `town-candidates:${t.id}`);
    for (let i = 0; i < 3000; i++) {
      const x = (b() - 0.5) * 1.15;
      const z = MAIN_Z + (b() - 0.5) * 1.05;
      if (
        hexSupport(x, z) > 0.69 ||
        !labelClear(x, z, 0.065) ||
        town.some((p) => Math.hypot(x - p.x, z - p.z) < 0.145)
      )
        continue;
      town.push({ x, z, key: `${t.id}:b${town.length}`, jitter: b() });
    }
    return made;
  }

  /** A town's fixed, noncircular boundary. Growth scales the outline, never rerolls it. */
  function townEdge(t: Tile, a: number) {
    return (
      0.88 +
      0.27 * terrainNoise(t, Math.cos(a) * 0.8, Math.sin(a) * 0.8) +
      0.055 * Math.sin(a * 3 + tileSeed(t).edge * 6.28)
    );
  }
  function townDistance(t: Tile, p: XZ, centre: XZ) {
    const dx = p.x - centre.x;
    const dz = p.z - centre.z;
    return Math.hypot(dx, dz / 0.88) / townEdge(t, Math.atan2(dz / 0.88, dx));
  }

  /**
   * Every building's address in a town, reserved up front, so a new building never
   * moves one that stands. Each faces a bent lane in from the town's centre. The
   * Port stands on the coast, facing the sea at `toSea` (radians).
   */
  function buildingSites(
    t: Tile,
    side: number,
    buildings: readonly BuildingId[],
    toSea: number | null,
  ): Site[] {
    const c = { x: side * 0.32, z: MAIN_Z };
    const used: (TownPoint & { radius: number; building: BuildingId })[] = [];
    const specs: [BuildingId, number, number][] = [
      ["temple", 0.31, 0.13],
      ["marketplace", 0.36, 0.13],
      ["estate", 0.43, 0.13],
      ["granary", 0.47, 0.09],
      ["forum", 0.4, 0.12],
    ];
    const core = side ? 0.17 : 0.265;
    const anchors = new Map<BuildingId, Site>();
    for (const [building, distance, radius] of specs) {
      const off = (p: TownPoint) => Math.abs(Math.hypot(p.x - c.x, p.z - c.z) - distance);
      const pick = (clear: typeof used) =>
        tileSeed(t)
          .town.filter(
            (q) =>
              (!side || q.x * side > 0.1) &&
              Math.hypot(q.x - c.x, q.z - c.z) > core + radius * 0.64 &&
              clear.every((n) => Math.hypot(q.x - n.x, q.z - n.z) > radius + n.radius + 0.015),
          )
          .sort((a, b) => off(a) + a.jitter * 0.065 - (off(b) + b.jitter * 0.065))[0];
      // A crowded town (two colonies share the tile) may have no room left beside the
      // addresses it keeps for buildings it lacks: then only those it has stand in the way.
      const p =
        pick(used) ??
        (buildings.includes(building)
          ? pick(used.filter((n) => buildings.includes(n.building)))
          : undefined);
      if (!p) continue;
      used.push({ ...p, radius, building });
      // A bent approach ends just in front of the door; its tangent sets the facing.
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const bend = (hash01(`path:${t.id}:${building}`) - 0.5) * 0.3;
      const junction = { x: c.x + dx * 0.48 - dz * bend, z: c.z + dz * 0.48 + dx * bend };
      anchors.set(building, {
        building,
        x: t.x + p.x,
        z: t.y + p.z,
        radius,
        ry: Math.atan2(junction.x - p.x, junction.z - p.z),
        junction: { x: t.x + junction.x, z: t.y + junction.z },
      });
    }
    const sites = buildings.flatMap((b) => anchors.get(b) ?? []);
    if (buildings.includes("port") && toSea !== null) {
      sites.push({
        building: "port",
        x: t.x + Math.cos(toSea) * 0.8,
        z: t.y + Math.sin(toSea) * 0.8,
        radius: 0.12,
        ry: Math.atan2(-Math.sin(toSea), Math.cos(toSea)),
      });
    }
    return sites;
  }

  /**
   * A tile's whole resource inventory, in the order a town gives it up: wild land
   * spends it by priority; a town (on `side`) from the points farthest from it in.
   * Each item costs volume; an item closes the budget exactly at each slot's edge.
   * It runs to `slots` (a city may hold more than its tile prints); a longer run only
   * adds items at the end, so every budget takes the same prefix.
   */
  function inventoryFor(t: Tile, side: number | null, slots = t.slots) {
    const key = `${t.id}:${t.terrain}:${slots}:${side === null ? "wild" : `town:${side}`}`;
    const known = cache.inventories.get(key);
    if (known) return known;
    const centres = side ? [-0.32, 0.32].map((x) => ({ x, z: MAIN_Z })) : [{ x: 0, z: MAIN_Z }];
    const reserveRadius = side ? 0.235 : 0.4;
    // The prototype's four buildings keep their lots clear of decor. Keeping the
    // Forum's too would thin a crowded tile below its open slots; its lot is cleared
    // when it stands (see `settle`), and those trees go first anyway.
    const reserved =
      side === null || side
        ? []
        : buildingSites(t, 0, ["temple", "marketplace", "estate", "granary"], null);
    const rank = (p: Point) =>
      Math.min(...centres.map((c) => townDistance(t, p, c))) + p.noise * 0.035;
    const points = tileSeed(t).resources.filter(
      (p) => labelClear(p.x, p.z, 0.065, side !== null) && (!side || p.x * side > 0.09),
    );
    points.sort(side === null ? (a, b) => a.priority - b.priority : (a, b) => rank(b) - rank(a));
    const items: Item[] = [];
    let spent = 0;
    for (const p of points) {
      if (spent >= slots * RESOURCE_UNIT) break;
      // Invisible accounting boundaries close exactly on one unit; they have no patch.
      const remaining = RESOURCE_UNIT - (spent % RESOURCE_UNIT);
      const cost = Math.min(p.choice < 0.3 ? 0.5 : p.choice < 0.73 ? 1 : 1.5, remaining);
      let model: ModelName;
      let sx: number;
      let sy: number;
      let ry = p.ry;
      let radius: number;
      if (t.terrain === "forest") {
        model = (["cypress", "pine", "olive"] as const)[p.species];
        const k = Math.cbrt(cost);
        sx = k * 0.78;
        sy = k * 1.05;
        radius = (model === "cypress" ? 0.085 : model === "pine" ? 0.16 : 0.18) * sx;
      } else if (t.terrain === "mountain") {
        model = cost === 0.5 ? "looseRock" : "outcrop";
        const k = Math.cbrt(cost);
        sx = k * 0.68;
        sy = k * 0.94;
        radius = (model === "looseRock" ? 0.26 : 0.21) * sx;
      } else if (t.terrain === "plains") {
        const shape = FIELD_SHAPES[p.variant];
        model = `field${p.variant as 0 | 1 | 2 | 3 | 4 | 5}`;
        sx = Math.sqrt((cost * FIELD_AREA) / shape.area);
        sy = 1;
        // Furrows run along the slope of the noise.
        const dx = terrainNoise(t, p.x + 0.04, p.z) - terrainNoise(t, p.x - 0.04, p.z);
        const dz = terrainNoise(t, p.x, p.z + 0.04) - terrainNoise(t, p.x, p.z - 0.04);
        ry = Math.atan2(dx, dz) + (p.choice - 0.5) * 0.55;
        radius = (shape.radius + 0.048) * sx;
      } else break;
      if (
        hexSupport(p.x, p.z) + radius > (R_TOP * SQ3) / 2 - 0.008 ||
        !labelClear(p.x, p.z, radius, side !== null)
      )
        continue;
      if (
        side !== null &&
        (centres.some((c) => townDistance(t, p, c) < reserveRadius) ||
          reserved.some(
            (n) => Math.hypot(p.x + t.x - n.x, p.z + t.y - n.z) < n.radius * 1.34 + radius * 0.45,
          ))
      )
        continue;
      items.push({
        model,
        x: p.x,
        z: p.z,
        sx,
        sy,
        sz: sx,
        ry,
        radius,
        cost,
        end: spent + cost,
        key: p.key,
      });
      spent += cost;
    }
    cache.inventories.set(key, items);
    return items;
  }

  return { tileSeed, townEdge, townDistance, buildingSites, inventoryFor };
}

/** A town's size on its tile: a side town (two colonies share the tile) is smallest. */
const townRadius = (side: number, s: MapSettlement) =>
  side ? 0.235 : s.capital ? 0.4 : s.kind === "city" ? 0.35 : 0.265;

/** The cut a slave leaves by what they make. */
const CUT: Record<MaterialResource, ModelName> = {
  wood: "cut_forest",
  stone: "cut_mountain",
  gold: "cut_mountain",
  food: "cut_plains",
};

/** What one settlement puts on its tile: its town, buildings, work sites and decor. */
function settle(
  d: ReturnType<typeof decor>,
  t: MapTile,
  s: MapSettlement,
  side: number,
  toSea: number | null,
) {
  const centre = { x: t.x + side * 0.32, z: t.y + MAIN_Z };
  const local = { x: side * 0.32, z: MAIN_Z };
  const sites = d.buildingSites(t, side, s.buildings, toSea);
  const contains = (p: XZ, padding: number) =>
    d.townDistance(t, p, local) < townRadius(side, s) + padding ||
    sites.some(
      (n) =>
        n.building !== "port" && Math.hypot(p.x + t.x - n.x, p.z + t.y - n.z) < n.radius + padding,
    );

  // The decor left on the tile: a prefix of the town's inventory, as long as its open
  // slots pay for. On a hill (nothing to work), scrub thins as buildings rise.
  let items: Pick<Item, "model" | "x" | "z" | "sx" | "sy" | "sz" | "ry" | "radius">[];
  if (t.terrain === "hill") {
    const far = (p: XZ) => Math.hypot(p.x + t.x - centre.x, p.z + t.y - centre.z);
    items = d
      .tileSeed(t)
      .resources.filter(
        (p) =>
          labelClear(p.x, p.z, 0.16, true) &&
          hexSupport(p.x, p.z) < (R_TOP * SQ3) / 2 - 0.17 &&
          (!side || p.x * side > 0.08),
      )
      .sort((a, b) => far(b) - far(a))
      .slice(0, Math.max(3, 9 - s.built))
      .map((p, i) => hillItem(p, i))
      .filter((p) => !contains(p, 0.08));
  } else {
    // A Forum, or a building that had to leave its kept address, may stand where a
    // tree would: the tree gives way.
    const budget = s.openSlots * RESOURCE_UNIT;
    items = d
      .inventoryFor(t, side, Math.max(t.slots, s.slots))
      .filter((p) => p.end <= budget && !contains(p, 0));
  }

  // Slaves work the resources nearest town, at the edge that faces it, each standing
  // on the town's side of the work, off the buildings' lots while there is room.
  const near = (p: XZ) => Math.hypot(p.x + t.x - centre.x, p.z + t.y - centre.z);
  const work = [...items]
    .sort((a, b) => near(a) - near(b))
    .map((resource) => {
      const x = t.x + resource.x;
      const z = t.y + resource.z;
      const dist = Math.hypot(centre.x - x, centre.z - z);
      const ux = (centre.x - x) / dist;
      const uz = (centre.z - z) / dist;
      const edge = resource.radius + 0.035;
      const cut = { x: x + ux * edge, y: H_TILE + 0.005, z: z + uz * edge };
      return {
        ...cut,
        ry: Math.atan2(ux, uz),
        s: 0.67,
        worker: { x: cut.x + ux * 0.075, z: cut.z + uz * 0.075 },
      };
    });
  const onLot = (p: XZ) =>
    sites.some((n) => n.building !== "port" && Math.hypot(p.x - n.x, p.z - n.z) < n.radius * LOT);
  const clear = work.filter((w) => !onLot(w) && !onLot(w.worker));
  const cuts = [...clear, ...work.filter((w) => !clear.includes(w))].slice(0, s.worked);

  // The worn ground: the clearing's irregular outline, and a small lobe joining each
  // building to it instead of a plinth.
  const ring = (n: number, at: (a: number) => XZ) =>
    Array.from({ length: n }, (_, i) => at((i / n) * Math.PI * 2));
  const ground = [
    {
      centre,
      y: H_TILE + 0.0015,
      ring: ring(64, (a) => {
        const r = townRadius(side, s) * d.townEdge(t, a);
        return { x: centre.x + Math.cos(a) * r, z: centre.z + Math.sin(a) * r * 0.88 };
      }),
    },
    ...sites
      .filter((n) => n.building !== "port")
      .map((n) => ({
        centre: { x: n.x, z: n.z },
        y: H_TILE + 0.002,
        ring: ring(12, (a) => {
          const r = n.radius * (1.15 + 0.18 * Math.sin(a * 3 + n.x));
          return { x: n.x + Math.cos(a) * r, z: n.z + Math.sin(a) * r };
        }),
      })),
  ];
  // A lane from the centre to each door; the nearest two buildings share a short one.
  const lanes = sites.map((n) => {
    const j = n.junction ?? { x: (centre.x + n.x) / 2, z: (centre.z + n.z) / 2 - 0.035 };
    const door = {
      x: n.x + Math.sin(n.ry) * n.radius * 0.8,
      z: n.z + Math.cos(n.ry) * n.radius * 0.8,
    };
    return [centre, j, door];
  });
  const buildings = sites.filter((n) => n.junction);
  if (buildings.length > 1) {
    const [a, ...rest] = buildings;
    const gap = (n: Site) => Math.hypot(n.x - a.x, n.z - a.z);
    const b = [...rest].sort((p, q) => gap(p) - gap(q))[0];
    const [ja, jb] = [a.junction!, b.junction!];
    lanes.push([ja, { x: (ja.x + jb.x) / 2 + 0.025, z: (ja.z + jb.z) / 2 }, jb]);
  }

  return {
    centre,
    sites,
    items,
    cuts,
    town: { tileId: t.id, settlementId: s.id, centre, sites, ground, lanes },
  };
}

/** Hill scrub: every third a boulder. */
const hillItem = (p: Point, i: number) => {
  const s = 0.8 + p.choice * 0.4;
  return {
    model: (i % 3 ? "scrub" : "boulder") as ModelName,
    x: p.x,
    z: p.z,
    sx: s,
    sy: s,
    sz: s,
    ry: p.ry,
    radius: 0,
  };
};

/** The scale of the town model on its tile. */
const townScale = (side: number, s: MapSettlement) =>
  side || s.capital ? 0.64 : s.kind === "city" ? 0.72 : 0.9;

/**
 * Which way a Port faces, by the open-sea side it stands on: toward the good it
 * claimed, or the open sea. A side town's Port keeps to its own half of the coast,
 * off a side its neighbour's Port took; there the good only picks among those sides.
 */
function portBearing(
  model: MapModel,
  t: MapTile,
  s: MapSettlement,
  side: number,
  taken: number | null,
) {
  const good = model.moorings.find((m) => m.claimedBy === s.id) ?? null;
  const toGood = good ? Math.atan2(good.sy - t.y, good.sx - t.x) : 0;
  if (!side) {
    if (good) return { a: toGood, good, at: null };
    const at = t.seaSides[t.seaSides.length >> 1];
    return at === undefined ? null : { a: (at * Math.PI) / 3, good, at };
  }
  const outward = (i: number) => EAST[i] * side;
  const free = t.seaSides.filter((i) => i !== taken);
  const own = free.filter((i) => outward(i) > 0);
  // With no open side of its own, the one nearest the tile's middle, off the
  // neighbour's lanes. Then the side nearest the good, or else the most outward.
  const pool = own.length ? own : free.length ? free : t.seaSides;
  const nearGood = (i: number) => (good ? Math.cos((i * Math.PI) / 3 - toGood) : outward(i));
  const [at] = [...pool].sort(
    (p, q) => (own.length ? 0 : outward(q) - outward(p)) || nearGood(q) - nearGood(p),
  );
  return at === undefined ? null : { a: (at * Math.PI) / 3, good, at };
}

export function layoutMap(model: MapModel, seed: number): Layout {
  const d = decor(seed);
  const models: Layout["models"] = {};
  const put = (name: ModelName, place: Place) => (models[name] ??= []).push(place);
  const towns: Town[] = [];
  const boats: Floating[] = [];
  const figures: Layout["figures"] = {};
  const meet = (name: FigureModel, figure: Figure) => (figures[name] ??= []).push(figure);
  const scaleOf = (name: FigureModel) => FIGURE_SCALE * (name === "slave" ? 1.18 : 1);
  const rioting = new Set(model.realms.filter((r) => r.riot).map((r) => r.owner));
  const laurelled = new Set(model.realms.filter((r) => r.titles).map((r) => r.owner));
  const hearths: XZ[] = [];
  const riots: Layout["riots"] = [];

  for (const t of model.tiles) {
    if (!t.settlements.length) {
      const items =
        t.terrain === "hill"
          ? d
              .tileSeed(t)
              .resources.filter(
                (p) =>
                  labelClear(p.x, p.z, 0.16, false) &&
                  hexSupport(p.x, p.z) < (R_TOP * SQ3) / 2 - 0.17,
              )
              .slice(0, 10)
              .map(hillItem)
          : d.inventoryFor(t, null);
      for (const it of items) put(it.model, decorPlace(t, it));
      continue;
    }
    const shared = t.settlements.length > 1;
    let taken: number | null = null;
    t.settlements.forEach((s, k) => {
      const side = shared ? (k ? 1 : -1) : 0;
      const bearing = s.buildings.includes("port") ? portBearing(model, t, s, side, taken) : null;
      taken = bearing?.at ?? taken;
      const plan = settle(d, t, s, side, bearing?.a ?? null);
      const kind = s.capital ? "capital" : s.kind;
      const base = { x: plan.centre.x, y: H_TILE + 0.003, z: plan.centre.z, s: townScale(side, s) };
      put(kind, base);
      for (const n of plan.sites) {
        if (n.building === "port" && bearing) {
          put("port", { x: n.x, y: H_TILE, z: n.z, ry: n.ry });
          // Its boat rides off the pier, on the side away from the good.
          const [ux, uz] = [Math.cos(bearing.a), Math.sin(bearing.a)];
          const g = bearing.good;
          const away = g && (g.vx - t.x) * -uz + (g.vy - t.y) * ux > 0 ? -1 : 1;
          const x = t.x + ux * 1.2 - uz * 0.14 * away;
          const z = t.y + uz * 1.2 + ux * 0.14 * away;
          boats.push({ x, y: 0, z, ry: n.ry, s: 1.3, phase: x * 2.1 + z });
        } else put(n.building, { x: n.x, y: H_TILE + 0.004, z: n.z, ry: n.ry, s: 0.78 });
      }
      if (t.resource) for (const cut of plan.cuts) put(CUT[t.resource], cut);
      for (const it of plan.items) put(it.model, decorPlace(t, it));
      towns.push(plan.town);
      // A city's hearths smoke; a rioting realm's cities burn torches instead.
      if (s.kind !== "colony") {
        if (rioting.has(s.owner)) {
          riots.push({ x: t.x, z: t.y, owner: s.owner });
          put("torch", { x: t.x - 0.3, y: H_TILE, z: t.y + 0.2 });
          put("torch", { x: t.x + 0.32, y: H_TILE, z: t.y + 0.16 });
        } else hearths.push({ x: plan.centre.x + 0.13, z: plan.centre.z + 0.06 });
      }
      // The titles' laurel turns over a capital whose realm holds enough to win.
      if (s.capital && laurelled.has(s.owner)) put("laurel", { x: t.x, y: 0.66, z: t.y + MAIN_Z });

      // One figure per pop: a slave at each work site, the rest strolling the town's
      // tile and its realm's neighbours.
      const color = glazeOf(s.owner);
      const near = model.tiles.filter(
        (o) => hexDistance(o, t) === 1 && o.settlements.some((n) => n.owner === s.owner),
      );
      const inner = s.capital ? 0.5 : s.kind === "city" ? 0.42 : 0.3;
      const figure = (name: FigureModel, tag: string) => ({
        scale: scaleOf(name),
        phase: rng(seed, `${s.id}:${tag}`)() * Math.PI * 2,
        color,
      });
      plan.cuts.forEach(({ worker, x, z }, i) =>
        meet("slave", {
          ...figure("slave", `w${i}`),
          mode: "work",
          x: worker.x,
          z: worker.z,
          fx: x - worker.x,
          fz: z - worker.z,
        }),
      );
      const stroll = (name: FigureModel, tag: string) =>
        meet(name, {
          ...figure(name, tag),
          mode: "walk",
          plan: walkPlan(rng(seed, `walk:${s.id}:${tag}`), t, near, inner),
        });
      // A slave with no work site drawn (on a hill, say) strolls too.
      for (let i = 0; i < s.classes.slaves - plan.cuts.length; i++) stroll("slave", `s${i}`);
      for (let i = 0; i < s.classes.freemen; i++) stroll("freeman", `f${i}`);
      for (let i = 0; i < s.classes.citizens; i++) stroll("citizen", `c${i}`);
    });
  }

  // The Oracle: a tholos on a stepped platform; the tripod, the omphalos, the Pythia
  // and two priests come in close.
  for (const t of model.tiles.filter((tile) => tile.terrain === "oracle")) {
    const shrine = { x: t.x, y: H_TILE, z: t.y - 0.08 };
    put("oracleCore", shrine);
    put("oracleDetail", shrine);
    put("oraclePythia", { x: t.x - 0.38, y: H_TILE, z: t.y + 0.05 });
    put("oraclePriest", { x: t.x - 0.23, y: H_TILE, z: t.y - 0.38, s: FIGURE_SCALE, ry: 0.9 });
    put("oraclePriest", {
      x: t.x + 0.32,
      y: H_TILE + 0.025,
      z: t.y - 0.04,
      s: FIGURE_SCALE,
      ry: 2.5,
    });
    // Pilgrims climb to the tripod and come down again; the last bears an offering.
    for (let i = 0; i < 4; i++) {
      const name = i < 3 ? "oraclePilgrim" : "oracleOffering";
      meet(name, {
        scale: scaleOf(name),
        phase: i * 1.7,
        color: 0xffffff,
        mode: "walk",
        plan: pilgrimagePlan(t, i),
      });
    }
  }

  // The goods, moored off their vertex, each with its holder's pennant once claimed.
  const goods = model.moorings.map((m) => ({
    x: m.x,
    y: 0.02,
    z: m.y,
    ry: Math.atan2(-(m.y - m.vy), m.x - m.vx),
    s: 1.35,
    phase: m.x * 2.1 + m.y,
  }));
  const flags = model.moorings.flatMap((m, i) =>
    m.owner ? [{ ...goods[i], color: glazeOf(m.owner) }] : [],
  );

  // A ship for each transfer, its pops riding on deck, each in their class's figure.
  const byId = new Map(model.tiles.map((t) => [t.id, t]));
  const ships: Ship[] = [];
  for (const transfer of model.transfers) {
    const [from, to] = [byId.get(transfer.from), byId.get(transfer.to)];
    if (!from || !to) continue;
    const color = glazeOf(transfer.owner);
    const ship = ships.length;
    ships.push({
      id: transfer.id,
      route: seaRoute(model.tiles, from, to, goods),
      phase: rng(seed, `ship:${transfer.id}`)() * Math.PI * 2,
      speed: 0.11,
      color,
      label: transfer.label,
    });
    const { citizens, freemen, slaves } = transfer.pops;
    [
      ...Array<FigureModel>(citizens).fill("citizen"),
      ...Array<FigureModel>(freemen).fill("freeman"),
      ...Array<FigureModel>(slaves).fill("slave"),
    ].forEach((name, slot) =>
      meet(name, { scale: scaleOf(name), phase: slot, color, mode: "ride", ship, slot }),
    );
  }

  const key = layoutKey(model, seed);
  return {
    key,
    lifeKey: [key, ...lifeKey(model)].join(";"),
    models,
    towns,
    goods,
    flags,
    boats,
    figures,
    ships,
    ...seaLife(model, seed),
    hearths,
    riots,
  };
}

/**
 * The sea's life, the prototype's: up to three Ports trade with their realm's nearest
 * other coastal settlement, three fishing boats circle off the island, and gulls wheel
 * over the first two Ports that hold a good (or over the coast's two ends).
 */
function seaLife(model: MapModel, seed: number) {
  const settled = model.tiles.flatMap((t) => t.settlements.map((s) => ({ t, s })));
  const holds = (id: string) => model.moorings.some((m) => m.claimedBy === id);
  const coastal = (t: MapTile) => t.seaSides.length > 0;
  const traders: Ship[] = [];
  for (const { t, s } of settled) {
    if (traders.length >= 3 || !holds(s.id)) continue;
    const [dest] = settled
      .filter((o) => o.s.owner === s.owner && o.t !== t && coastal(o.t))
      .sort((a, b) => hexDistance(a.t, t) - hexDistance(b.t, t));
    if (!dest) continue;
    traders.push({
      id: `trade:${s.id}`,
      route: seaRoute(model.tiles, t, dest.t),
      phase: 0.7 + traders.length * 1.9,
      speed: 0.07,
      color: glazeOf(s.owner),
      label: "",
    });
  }

  // The boats keep to open water, a little past the island's farthest tile.
  const reach = Math.max(...model.tiles.map((t) => Math.hypot(t.x, t.y)));
  const r = rng(seed, "fish");
  const fishers: Circling[] = [];
  for (let tries = 0; fishers.length < 3 && tries < 60; tries++) {
    const a = r() * Math.PI * 2;
    const R = reach + 1.2 + r() * 0.5;
    const rad = 0.18 + r() * 0.12;
    const phase = r() * Math.PI * 2;
    const [x, z] = [R * Math.cos(a), R * Math.sin(a)];
    if (model.tiles.some((t) => Math.hypot(t.x - x, t.y - z) < 1.25 + rad)) continue;
    fishers.push({ x, z, rad, h: 0, phase, speed: 0.12 });
  }

  // Off a tile's coast: out through its open sides, or away from the island's centre.
  const offshore = (t: MapTile) => {
    const sides = t.seaSides.map((i) => (i * Math.PI) / 3);
    let [dx, dz] = [
      sides.reduce((n, a) => n + Math.cos(a), 0),
      sides.reduce((n, a) => n + Math.sin(a), 0),
    ];
    if (Math.hypot(dx, dz) < 1e-6) [dx, dz] = [t.x, t.y];
    const l = Math.hypot(dx, dz) || 1;
    return { x: t.x + (dx / l) * 0.9, z: t.y + (dz / l) * 0.9 };
  };
  const ports = settled.filter(({ s }) => holds(s.id)).map(({ t }) => t);
  const shore = model.tiles.filter(coastal).sort((a, b) => a.x - b.x);
  const anchors = (ports.length ? ports.slice(0, 2) : [shore[0], shore[shore.length - 1]])
    .filter(Boolean)
    .map(offshore);
  const gulls = anchors.flatMap((p, j) =>
    [0, 1, 2].map((i) => ({
      ...p,
      rad: 0.22 + i * 0.12,
      h: 0.62 + i * 0.12,
      phase: i * 2.1 + j * 1.3,
      speed: 0.45 + i * 0.12,
    })),
  );
  return { traders, fishers, gulls };
}

function decorPlace(t: Tile, it: Pick<Item, "x" | "z" | "sx" | "sy" | "sz" | "ry">): Place {
  return { x: t.x + it.x, y: H_TILE, z: t.y + it.z, sx: it.sx, sy: it.sy, sz: it.sz, ry: it.ry };
}

/** Everything the standing models read, as a string: the same key, the same models. */
function layoutKey(model: MapModel, seed: number) {
  const towns = model.tiles.map((t) =>
    [
      t.resource,
      ...t.settlements.map((s) =>
        [s.id, s.owner, s.kind, s.capital, s.buildings.join("+"), s.slots, s.built, s.worked].join(
          ":",
        ),
      ),
    ].join("|"),
  );
  const goods = model.moorings.map((m) => `${m.vertexId}:${m.owner}:${m.claimedBy}`);
  // A riot's torches and the laurel stand with the towns.
  const realms = model.realms.map((r) => `${r.owner}:${r.riot}:${r.titles}`);
  return [seed, ...towns, ...goods, ...realms].join(";");
}

/** What else the figures and ships read: the pops by class, and the transfers. */
function lifeKey(model: MapModel) {
  const pops = model.tiles.flatMap((t) =>
    t.settlements.map(
      (s) => `${s.id}:${s.classes.citizens}:${s.classes.freemen}:${s.classes.slaves}`,
    ),
  );
  const ships = model.transfers.map((t) =>
    [t.id, t.owner, t.from, t.to, t.pops.citizens, t.pops.freemen, t.pops.slaves].join(":"),
  );
  return [...pops, ...ships];
}
