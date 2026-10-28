import {
  BackSide,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ColorManagement,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PCFShadowMap,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  RedFormat,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { Material } from "three";
import { FOV, H_TILE, R_TOP, clamp } from "./camera";
import type { View } from "./camera";
import type { Circling, Figure, FigureModel, Floating, Layout, ModelName, Place } from "./layout";
import { walkAt } from "./life";
import type { BoardShape } from "./mapModel";
import { createTemplates, disposeTemplate, groundGeometry, laneGeometry } from "./models";
import type { Template } from "./models";
import {
  BONE,
  GLOW,
  INK,
  LIGHT,
  MATERIAL,
  OCHRE,
  ROUTE,
  SEA,
  SMOKE,
  TRADE_ROUTE,
  VAPOUR,
  VASE_BLACK,
} from "./palette";
import type { MaterialName } from "./palette";
import { createSea } from "./sea";

/**
 * The living map's three.js world: the raised island (one instanced prism per tile,
 * every tile the same height, its sides the coast's walls), the sea, the rings that
 * mark owners, candidates, the pick and the keyboard's focus, and the models, one
 * instanced mesh per model and material, placed where `layout.ts` says: standing,
 * afloat, swaying, walking, sailing, circling or turning, with smoke over the towns.
 * It draws what it is told; `runtime.ts` decides what and when.
 */

const DEG = Math.PI / 180;
/** The owner ring's radius on the tile. */
const R_OWN = 0.84;

/** The zoom-band layer each model fades with (see `bandAlphas`); the rest always show. */
const LAYER: Partial<Record<ModelName, string>> = {
  capital: "towns",
  city: "towns",
  colony: "towns",
  oracleCore: "towns",
  good: "goods",
  goodFlag: "goods",
  temple: "detail",
  granary: "detail",
  marketplace: "detail",
  estate: "detail",
  forum: "detail",
  cut_forest: "detail",
  cut_mountain: "detail",
  cut_plains: "detail",
  port: "ports",
  boat: "ports",
  olive: "terrain",
  cypress: "terrain",
  pine: "terrain",
  outcrop: "terrain",
  looseRock: "terrain",
  boulder: "terrain",
  scrub: "terrain",
  field0: "terrain",
  field1: "terrain",
  field2: "terrain",
  field3: "terrain",
  field4: "terrain",
  field5: "terrain",
  oracleDetail: "landmark",
  oraclePythia: "pops",
  oraclePriest: "pops",
  oraclePilgrim: "pops",
  oracleOffering: "pops",
  citizen: "pops",
  freeman: "pops",
  slave: "pops",
  ship: "moves",
  shipBand: "moves",
  torch: "events",
  laurel: "events",
  gull: "lifeAmb",
};
/** Figures cast no shadow: at their size it is only a smudge. Ships, gulls and the
 *  laurel move on, and the shadow map is drawn only when the casters change; so do
 *  the sea life's boats (their layer's) and a flame, which glows. */
const SHADOWLESS = new Set<ModelName>([
  "oraclePythia",
  "oraclePriest",
  "oraclePilgrim",
  "oracleOffering",
  "citizen",
  "freeman",
  "slave",
  "ship",
  "shipBand",
  "laurel",
  "gull",
]);
/** Pops at sea ride their ship, drawn with it from the middle band. */
const RIDERS = ["citizen", "freeman", "slave"] as const;
/** What sails a transfer's route. */
const SAILS = new Set<ModelName>(["ship", "shipBand"]);
/** What follows the pops and the transfers: redrawn without the standing models. */
const LIVING = new Set<ModelName>([...RIDERS, "oraclePilgrim", "oracleOffering", ...SAILS]);
/** A transfer's ship, and a trader's. */
const SHIP_SCALE = { moves: 1.6, lifeShips: 1.25 } as Record<string, number>;
/** The layers whose models stand on a tile: on a settled tile, Political tints them
 *  toward the owner's glaze, per instance (`Place.tint`). */
const TINTED = new Set(["towns", "detail", "ports", "terrain"]);
/** What bobs on the swell. */
const AFLOAT = new Set<ModelName>(["good", "goodFlag", "boat"]);
const FIELDS = new Set<ModelName>(["field0", "field1", "field2", "field3", "field4", "field5"]);

/** A model's instances: its meshes (one per material, then the keyline hull), how
 *  many they hold, and where each instance stands. */
type Model = {
  name: ModelName;
  tpl: Template;
  layer?: string;
  meshes: InstancedMesh[];
  capacity: number;
  places: Place[];
  afloat: (Floating & { color?: number })[];
  figures: Figure[];
  circling: Circling[];
};

export type Ring = { x: number; y: number; inner: boolean; colour: number };
export type Border = { x: number; y: number; side: number; colour: number };

export function createScene(canvas: HTMLCanvasElement, shape: BoardShape) {
  // The look is the prototype's, drawn with three.js r128 defaults: colours as given,
  // no colour management, and lights as bright as the old (legacy) lighting made them.
  ColorManagement.enabled = false;
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(SEA.deep, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  // What casts a shadow stands still: the tiles (they darken the walls in their joints)
  // and the models. So the shadow map is drawn only when the casters change, with a new
  // layout or a zoom band that shows or hides a layer, not every frame; the swell and
  // the wind sway things too little to need one.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV / DEG, 1, 0.05, 300);
  scene.add(new HemisphereLight(LIGHT.sky, LIGHT.ground, 0.44 * Math.PI));
  // The icons are lit from the upper left; on the map that is the north-west, above.
  const sun = new DirectionalLight(LIGHT.sun, 0.52 * Math.PI);
  sun.position.set(-6, 10, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = shape.half - 1.5;
  Object.assign(sun.shadow.camera, {
    left: -reach,
    right: reach,
    top: reach,
    bottom: -reach,
    near: 1,
    far: 30,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.015;
  scene.add(sun);

  const disposables: { dispose(): void }[] = [];
  const own = <T extends { dispose(): void }>(thing: T) => {
    disposables.push(thing);
    return thing;
  };

  // Three tone steps, like the icons' three-stop gradients.
  const ramp = own(new DataTexture(new Uint8Array([100, 178, 255]), 3, 1, RedFormat));
  ramp.minFilter = ramp.magFilter = NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  const toon = (color: number) => own(new MeshToonMaterial({ color, gradientMap: ramp }));
  const materials = Object.fromEntries([
    ...Object.entries(MATERIAL).map(([name, color]) => [name, toon(color)]),
    ...Object.entries(GLOW).map(([name, color]) => [name, own(new MeshBasicMaterial({ color }))]),
  ]) as Record<MaterialName, Material>;
  // The vase-black keyline: back faces pushed out along smoothed normals.
  const keyline = own(new MeshBasicMaterial({ color: VASE_BLACK, side: BackSide }));
  keyline.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "vec3 transformed = position + normal * 0.0065;",
    );
  };

  // A layer that fades owns clones of its materials, so one opacity fades the layer.
  const layered = new Map<string, Material[]>();
  const clones = new Map<string, Material>();
  const layerMat = (name: MaterialName | "keyline", layer?: string) => {
    const base = name === "keyline" ? keyline : materials[name];
    if (!layer) return base;
    const key = `${name}|${layer}`;
    let clone = clones.get(key);
    if (!clone) {
      clone = own(base.clone());
      clone.onBeforeCompile = base.onBeforeCompile;
      clone.transparent = true;
      clone.userData.base = base.opacity;
      clones.set(key, clone);
      layered.set(layer, [...(layered.get(layer) ?? []), clone]);
    }
    return clone;
  };

  const sea = createSea(shape);
  disposables.push(sea);
  scene.add(sea.mesh);

  // The tiles: one instanced prism, coloured per tile. It reaches below the sea so
  // the coast's walls meet the water without a seam.
  const hexGeo = own(
    new CylinderGeometry(R_TOP, R_TOP, H_TILE + 0.08, 6, 1).translate(
      0,
      (H_TILE + 0.08) / 2 - 0.08,
      0,
    ),
  );
  const tiles = own(new InstancedMesh(hexGeo, toon(0xffffff), shape.cells.length));
  const m4 = new Matrix4();
  const colour = new Color();
  shape.cells.forEach((cell, i) => {
    tiles.setMatrixAt(i, m4.makeTranslation(cell.x, 0, cell.y));
    tiles.setColorAt(i, colour.set(BONE));
  });
  tiles.receiveShadow = true;
  tiles.castShadow = true;
  tiles.frustumCulled = false;
  scene.add(tiles);

  // The engraved rule round each tile's top.
  const rule: number[] = [];
  for (const cell of shape.cells) {
    for (let i = 0; i < 6; i++) {
      const a0 = (60 * i - 30) * DEG;
      const a1 = (60 * i + 30) * DEG;
      const h = H_TILE + 0.003;
      rule.push(cell.x + Math.cos(a0) * R_TOP, h, cell.y + Math.sin(a0) * R_TOP);
      rule.push(cell.x + Math.cos(a1) * R_TOP, h, cell.y + Math.sin(a1) * R_TOP);
    }
  }
  const ruleGeo = own(new BufferGeometry());
  ruleGeo.setAttribute("position", new Float32BufferAttribute(rule, 3));
  scene.add(
    new LineSegments(
      ruleGeo,
      own(new LineBasicMaterial({ color: INK, transparent: true, opacity: 0.35 })),
    ),
  );

  // The rings: hexagonal bands lying on the tops.
  const ringGeo = (ri: number, ro: number) =>
    own(new RingGeometry(ri, ro, 6, 1, Math.PI / 2).rotateX(-Math.PI / 2));
  // They lie a hair over the top and paint in order, so the pick covers a candidate
  // and the keyboard's focus covers the pick.
  const flat = (color: number) => own(new MeshBasicMaterial({ color, depthWrite: false }));
  const edgeRing = ringGeo(R_TOP - 0.075, R_TOP);
  // The keyboard's focus is two-tone, an ochre band inside an ink one, so it reads on
  // every wash: alone, the ochre all but vanished on the ochre seat's Political tiles.
  const focusInk = new Mesh(ringGeo(R_TOP - 0.12, R_TOP), flat(INK));
  const focusOchre = new Mesh(ringGeo(R_TOP - 0.09, R_TOP - 0.03), flat(OCHRE));
  const owners = own(
    new InstancedMesh(ringGeo(R_OWN - 0.04, R_OWN + 0.04), flat(0xffffff), shape.cells.length * 2),
  );
  const candidates = own(new InstancedMesh(edgeRing, flat(OCHRE), shape.cells.length));
  // Political's realm borders: a band inside each owned tile's side that faces another
  // realm, open land or the sea. One segment, turned to each side by its instance.
  const r0 = R_TOP - 0.1 / Math.cos(30 * DEG);
  const corner = (r: number, a: number) => [r * Math.cos(a * DEG), H_TILE, r * Math.sin(a * DEG)];
  const sideGeo = own(new BufferGeometry());
  sideGeo.setAttribute(
    "position",
    new Float32BufferAttribute(
      [corner(R_TOP, -30), corner(R_TOP, 30), corner(r0, 30), corner(r0, -30)].flat(),
      3,
    ),
  );
  sideGeo.setIndex([0, 2, 1, 0, 3, 2]);
  const borderMat = flat(0xffffff);
  borderMat.side = DoubleSide;
  const borders = own(new InstancedMesh(sideGeo, borderMat, shape.cells.length * 6));
  owners.frustumCulled = candidates.frustumCulled = borders.frustumCulled = false;
  // Colour every instanced mesh now: a colour attribute added later is a new shader
  // program, compiled mid-game in one long frame.
  owners.setColorAt(0, colour);
  borders.setColorAt(0, colour);
  owners.count = candidates.count = borders.count = 0;
  const selected = new Mesh(edgeRing, flat(INK));
  const focus = new Group().add(focusInk, focusOchre);
  selected.visible = focus.visible = false;
  [owners, borders, candidates, selected, focusInk, focusOchre].forEach(
    (ring, i) => (ring.renderOrder = i + 1),
  );
  scene.add(owners, borders, candidates, selected, focus);

  // The models, instanced: one mesh per material plus the keyline hull. Every model
  // has its meshes from the start, empty, so the warm-up builds every shader.
  const templates = createTemplates();
  /** The layers' opacities as last applied. */
  let alphas: Record<string, number> = {};
  const euler = new Euler();
  /** Heading first, then the lean: a figure stooping, a gull banking. */
  const turned = new Euler(0, 0, 0, "YXZ");
  const quat = new Quaternion();
  const at = new Vector3();
  const size = new Vector3();
  const meshesFor = (model: Model, capacity: number) => {
    const made = model.tpl.meshes.map(([mat, geo]) => {
      const mesh = new InstancedMesh(geo, layerMat(mat, model.layer), capacity);
      mesh.castShadow = !SHADOWLESS.has(model.name) && model.layer !== "lifeAmb" && !(mat in GLOW);
      // What may cast: the land's decor does only while drawn whole (see `applyLayers`).
      mesh.userData.cast = mesh.castShadow;
      mesh.receiveShadow = true;
      // Colour the owner's glaze, and a settlement's tint, now: a colour attribute added
      // later is a new shader program, compiled mid-game in one long frame.
      if (mat === "owner" || TINTED.has(model.layer ?? ""))
        mesh.setColorAt(0, colour.set(0xffffff));
      return mesh;
    });
    if (model.tpl.outline)
      made.push(new InstancedMesh(model.tpl.outline, layerMat("keyline", model.layer), capacity));
    for (const mesh of made) {
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.userData.layer = model.layer;
      mesh.visible = (alphas[model.layer ?? ""] ?? 1) > 0.01;
      scene.add(mesh);
    }
    return made;
  };
  // A model drawn in two layers is two models: the pops riding a ship, the trade ships
  // and the fishing boats are the sea life's, not the towns' or the transfers'.
  const specs = [
    ...(Object.keys(templates) as ModelName[]).map((name) => [name, LAYER[name]] as const),
    ...RIDERS.map((name) => [name, "passengers"] as const),
    ...[...SAILS].map((name) => [name, "lifeShips"] as const),
    ["boat", "lifeAmb"] as const,
  ];
  const models = specs.map(([name, layer]) => {
    const model: Model = {
      name,
      tpl: templates[name],
      layer,
      meshes: [],
      capacity: 8,
      places: [],
      afloat: [],
      figures: [],
      circling: [],
    };
    model.meshes = meshesFor(model, model.capacity);
    return model;
  });
  const goods = models.find((model) => model.name === "good")!;
  const dropMeshes = (model: Model) => {
    for (const mesh of model.meshes) {
      scene.remove(mesh);
      mesh.dispose();
    }
  };

  /** How far a settlement's models lean toward their owner's glaze (Political's tint). */
  let tinting = 0;
  const glaze = new Color();
  /** Tint a settlement's models, every material but the keyline, one colour each. */
  const tint = (model: Model) => {
    for (const [k, mesh] of model.meshes.entries()) {
      if (!model.tpl.meshes[k]) continue;
      model.places.forEach((p, i) =>
        mesh.setColorAt(i, colour.set(0xffffff).lerp(glaze.set(p.tint ?? 0xffffff), tinting)),
      );
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };
  /** Write one instance's pose into every mesh of its model. */
  const pose = (model: Model, i: number) => {
    for (const mesh of model.meshes) mesh.setMatrixAt(i, m4);
  };
  /** How many instances a model draws: what stands, floats, walks or circles, or its
   *  layer's ships. */
  const countOf = (model: Model) =>
    SAILS.has(model.name)
      ? fleet(model, ships).length
      : model.places.length + model.afloat.length + model.figures.length + model.circling.length;
  const posed = (model: Model) => {
    for (const mesh of model.meshes) {
      mesh.count = countOf(model);
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  /** A model's instances where they stand. */
  const stand = (model: Model) => {
    model.places.forEach((p, i) => {
      const k = p.s ?? 1;
      euler.set(0, p.ry ?? 0, 0);
      m4.compose(
        at.set(p.x, p.y, p.z),
        quat.setFromEuler(euler),
        size.set(p.sx ?? k, p.sy ?? k, p.sz ?? k),
      );
      pose(model, i);
    });
    posed(model);
  };
  /** The swell: things afloat bob and rock. */
  const bob = (model: Model, time: number) => {
    model.afloat.forEach((p, i) => {
      euler.set(
        Math.sin(time * 1.1 + p.phase) * 0.06,
        p.ry,
        Math.sin(time * 0.9 + p.phase * 1.3) * 0.04,
      );
      m4.compose(
        at.set(p.x, p.y + Math.sin(time * 1.4 + p.phase) * 0.012, p.z),
        quat.setFromEuler(euler),
        size.set(p.s, p.s, p.s),
      );
      pose(model, i);
    });
    posed(model);
  };
  /** The wind: ripe grain sways field by field. */
  const sway = (model: Model, time: number) => {
    model.places.forEach((p, i) => {
      const phase = p.x * 2.7 + p.z * 1.9;
      euler.set(
        Math.sin(time * 1.05 + phase) * 0.025,
        p.ry ?? 0,
        Math.sin(time * 0.9 + phase) * 0.032,
      );
      m4.compose(at.set(p.x, p.y, p.z), quat.setFromEuler(euler), size.set(p.sx!, p.sy!, p.sz!));
      pose(model, i);
    });
    posed(model);
  };

  // The ships: each sails its route to and fro at its pace, a transfer's pops on deck.
  // The transfers' come first, then the traders'.
  let ships: Layout["ships"] = [];
  let transfers = 0;
  let voyages: CatmullRomCurve3[] = [];
  const decks: { x: number; y: number; z: number; rx: number; ry: number; rz: number }[] = [];
  const tangent = new Vector3();
  /** The ships a sailing model draws: the transfers', or the traders' (sea life). */
  const fleet = <T>(model: Model, all: readonly T[]) =>
    model.layer === "lifeShips" ? all.slice(transfers) : all.slice(0, transfers);
  /** Where each ship is at `time`, and which way it heads. */
  const steer = (time: number) => {
    decks.length = voyages.length;
    voyages.forEach((voyage, i) => {
      const w = time * ships[i].speed + ships[i].phase;
      const u = clamp(0.5 - 0.5 * Math.cos(w), 0, 1);
      const p = voyage.getPointAt(u, at);
      voyage.getTangentAt(u, tangent);
      const fwd = Math.sin(w) >= 0 ? 1 : -1;
      decks[i] = {
        x: p.x,
        y: 0.02 + Math.sin(time * 1.6 + i) * 0.01,
        z: p.z,
        rx: Math.sin(time * 1.3 + i) * 0.05,
        ry: Math.atan2(-tangent.z * fwd, tangent.x * fwd),
        rz: Math.sin(time * 0.8 + i) * 0.03,
      };
    });
  };
  const sail = (model: Model) => {
    fleet(model, decks).forEach((d, i) => {
      euler.set(d.rx, d.ry, d.rz);
      m4.compose(
        at.set(d.x, d.y, d.z),
        quat.setFromEuler(euler),
        size.setScalar(SHIP_SCALE[model.layer!]),
      );
      pose(model, i);
    });
    posed(model);
  };
  /** The sea life circling: a fishing boat rocks round its patch of water; a gull
   *  wheels over the coast, banked, flapping. */
  const circle = (model: Model, time: number) => {
    const gull = model.name === "gull";
    model.circling.forEach((p, i) => {
      const a = time * p.speed + p.phase;
      const x = p.x + p.rad * Math.cos(a);
      const z = p.z + p.rad * Math.sin(a);
      if (gull) {
        turned.set(0, Math.atan2(-Math.sin(a), Math.cos(a)), 0.35);
        const flap = 1.2 + 0.25 * Math.sin(time * 7 + p.phase);
        m4.compose(
          at.set(x, p.h + 0.03 * Math.sin(time * 2 + p.phase), z),
          quat.setFromEuler(turned),
          size.set(1.2, flap, 1.2),
        );
      } else {
        euler.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), Math.sin(time * 1.2 + p.phase) * 0.05);
        m4.compose(
          at.set(x, Math.sin(time * 1.5 + p.phase) * 0.008, z),
          quat.setFromEuler(euler),
          size.setScalar(1.1),
        );
      }
      pose(model, i);
    });
    posed(model);
  };
  /** The titles' laurel turns slowly over its capital, rising and falling. */
  const spin = (model: Model, time: number) => {
    model.places.forEach((p, i) => {
      euler.set(0.25, time * 0.5, 0);
      m4.compose(
        at.set(p.x, p.y + Math.sin(time * 1.2) * 0.025, p.z),
        quat.setFromEuler(euler),
        size.setScalar(1),
      );
      pose(model, i);
    });
    posed(model);
  };
  /** Where a figure is at `time` (x, y, z), which way it faces, and how far it stoops:
   *  a slave bends to the work, a walker strolls its plan with a bob in its step, a
   *  rider stands on its ship's deck, fore and aft, six to a file. */
  const stance = (f: Figure, time: number) => {
    if (f.mode === "work") {
      const bend = 0.35 * Math.max(0, Math.sin(time * 2.4 + f.phase));
      return [f.x, H_TILE, f.z, f.fx, f.fz, bend];
    }
    if (f.mode === "ride") {
      const d = decks[f.ship];
      const [c, s] = [Math.cos(d.ry), Math.sin(d.ry)];
      const lx = (f.slot % 6) * 0.05 - 0.06;
      const lz = Math.floor(f.slot / 6) * 0.04;
      return [d.x + lx * c + lz * s, 0.035, d.z - lx * s + lz * c, c, -s, 0];
    }
    const w = walkAt(f.plan, time);
    const step = w.moving ? Math.abs(Math.sin(time * 9 + f.phase)) * 0.004 : 0;
    return [w.x, H_TILE + w.y + step, w.z, w.dx, w.dz, 0];
  };
  const walk = (model: Model, time: number) => {
    model.figures.forEach((f, i) => {
      const [x, y, z, fx, fz, bend] = stance(f, time);
      turned.set(bend, Math.atan2(fx, fz), 0);
      m4.compose(at.set(x, y, z), quat.setFromEuler(turned), size.setScalar(f.scale));
      pose(model, i);
    });
    posed(model);
  };
  /** How a model moves at `time`, or null for one that stands still. */
  const motion = (model: Model) =>
    SAILS.has(model.name)
      ? sail
      : model.circling.length
        ? circle
        : model.name === "laurel"
          ? spin
          : AFLOAT.has(model.name)
            ? bob
            : FIELDS.has(model.name)
              ? sway
              : model.figures.length
                ? walk
                : null;

  // The ships' routes: a dashed white line through the transfers' (pops on the move),
  // a dotted bronze one through the traders', each hidden when no ship sails it. The
  // dashes are cut in the geometry, so the lines share the rules' shader: a new one
  // would compile mid-game, in one long frame.
  const routeLine = (color: number, opacity: number, layer: string, dash: number, gap: number) => {
    const mat = own(new LineBasicMaterial({ color, transparent: true }));
    mat.opacity = mat.userData.base = opacity;
    layered.set(layer, [...(layered.get(layer) ?? []), mat]);
    const line = new LineSegments(new BufferGeometry(), mat);
    line.userData = { layer, empty: true };
    line.frustumCulled = false;
    scene.add(line);
    /** Draw its routes, as dashes `dash` long with `gap` between. */
    const draw = (routes: readonly CatmullRomCurve3[]) => {
      const points: Vector3[] = [];
      for (const voyage of routes) {
        const n = Math.ceil(voyage.getLength() / 0.02);
        const p = voyage.getSpacedPoints(n);
        const step = voyage.getLength() / n;
        for (let i = 0; i < n; i++)
          if ((i * step) % (dash + gap) < dash) points.push(p[i], p[i + 1]);
      }
      line.geometry.dispose();
      line.geometry = new BufferGeometry().setFromPoints(points);
      line.userData.empty = !routes.length;
      line.visible = Boolean(routes.length) && (alphas[layer] ?? 1) > 0.01;
    };
    return { line, draw };
  };
  const moveRoutes = routeLine(ROUTE, 0.6, "moves", 0.1, 0.08);
  const tradeRoutes = routeLine(TRADE_ROUTE, 0.8, "tradeRoutes", 0.04, 0.08);

  // Smoke: a city's hearths, four thin puffs at a time, and a riot's, twelve dark ones
  // over each of the realm's cities, both rising and drifting east as they swell.
  const smokeGeo = own(new SphereGeometry(1, 8, 6));
  const plume = (color: number, opacity: number, layer: string, riot: boolean) => {
    const mat = own(new MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
    mat.opacity = mat.userData.base = opacity;
    layered.set(layer, [...(layered.get(layer) ?? []), mat]);
    const n = riot ? 12 : 4;
    let mesh = new InstancedMesh(smokeGeo, mat, n);
    let sources: { x: number; z: number }[] = [];
    const place = (mesh: InstancedMesh) => {
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.userData = { layer, empty: true };
      scene.add(mesh);
    };
    place(mesh);
    const rise = (time: number) => {
      if (!mesh.visible) return;
      sources.forEach((o, k) => {
        for (let i = 0; i < n; i++) {
          const ph = (time * (riot ? 0.22 : 0.12) + i / n) % 1;
          const r = riot ? 0.04 + ph * 0.11 : 0.018 + ph * 0.035;
          // A riot's smoke rises from both its torches, by turns.
          const ox = riot ? o.x + (i % 2 ? 0.32 : -0.3) : o.x;
          const oz = riot ? o.z + 0.18 : o.z;
          m4.compose(
            at.set(
              ox + Math.sin(ph * 4 + i) * 0.04 + ph * (riot ? 0.14 : 0.08),
              H_TILE + (riot ? 0.3 : 0.16) + ph * (riot ? 0.8 : 0.45),
              oz - ph * 0.05,
            ),
            quat.identity(),
            size.set(r, r * 0.85, r),
          );
          mesh.setMatrixAt(k * n + i, m4);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    return {
      rise,
      /** Smoke from these points now, posed at `time`. */
      from(points: readonly { x: number; z: number }[], time: number) {
        sources = [...points];
        if (sources.length * n > mesh.instanceMatrix.count) {
          scene.remove(mesh);
          mesh.dispose();
          mesh = new InstancedMesh(smokeGeo, mat, 2 ** Math.ceil(Math.log2(sources.length * n)));
          place(mesh);
        }
        mesh.count = sources.length * n;
        mesh.userData.empty = !sources.length;
        mesh.visible = Boolean(sources.length) && (alphas[layer] ?? 1) > 0.01;
        // Posed now even while hidden, so a band that shows it shows it in place.
        const shown = mesh.visible;
        mesh.visible = true;
        rise(time);
        mesh.visible = shown;
      },
      dispose: () => mesh.dispose(),
    };
  };
  const hearths = plume(SMOKE.hearth, 0.3, "lifeAmb", false);
  const riots = plume(SMOKE.riot, 0.42, "events", true);

  // The Oracle's vapour: seven puffs rising from the tripod, close in.
  const oracles = shape.cells.filter((cell) => cell.terrain === "oracle");
  const vapourMat = own(
    new MeshBasicMaterial({ color: VAPOUR, transparent: true, depthWrite: false }),
  );
  vapourMat.opacity = vapourMat.userData.base = 0.2;
  layered.set("landmarkVapour", [vapourMat]);
  const PUFFS = 7;
  const vapour = own(
    new InstancedMesh(own(new SphereGeometry(1, 8, 6)), vapourMat, oracles.length * PUFFS || 1),
  );
  vapour.count = oracles.length * PUFFS;
  vapour.frustumCulled = false;
  vapour.userData.layer = "landmarkVapour";
  scene.add(vapour);
  const steam = (time: number) => {
    oracles.forEach((o, k) => {
      for (let i = 0; i < PUFFS; i++) {
        const ph = (time * 0.09 + i / PUFFS) % 1;
        const r = 0.014 + ph * 0.04;
        m4.compose(
          at.set(
            o.x - 0.38 + Math.sin(ph * 5 + i) * 0.025,
            H_TILE + 0.05 + ph * 0.42,
            o.y + 0.05 - ph * 0.04,
          ),
          quat.identity(),
          size.set(r, r * 1.3, r),
        );
        vapour.setMatrixAt(k * PUFFS + i, m4);
      }
    });
    vapour.instanceMatrix.needsUpdate = true;
  };
  steam(0);

  // The towns' worn ground and lanes: one mesh each, for every town.
  const ground = new Mesh(groundGeometry([]), layerMat("townSoil", "terrain"));
  const lanes = new Mesh(laneGeometry([]), layerMat("pathSoil", "terrain"));
  for (const mesh of [ground, lanes]) {
    mesh.receiveShadow = true;
    mesh.userData.layer = "terrain";
    scene.add(mesh);
  }

  // Without a GPU (a software renderer) a frame of the full board takes a third of a
  // second, so the map holds still there and draws only when something changes.
  const gl = renderer.getContext();
  const gpu = gl.getExtension("WEBGL_debug_renderer_info");
  const software = /swiftshader|llvmpipe|software/i.test(
    String(gl.getParameter(gpu ? gpu.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
  );

  let laidOut = "";
  let peopled = "";
  let time = 0;
  let disposed = false;
  const ray = new Raycaster();
  const ndc = new Vector2();

  return {
    software,
    /** Point the camera as the view says; the target sits at the frame's (cx, cy). */
    setView(v: View) {
      camera.aspect = v.W / v.H;
      camera.setViewOffset(v.W, v.H, v.W / 2 - v.cx, v.H / 2 - v.cy, v.W, v.H);
      camera.position.set(v.tx + v.d * v.sp * v.s, v.d * v.cp, v.ty + v.d * v.sp * v.c);
      camera.up.set(-v.s * v.cp, v.sp, -v.c * v.cp);
      camera.lookAt(v.tx, 0, v.ty);
    },
    resize(W: number, H: number) {
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(W, H, false);
    },
    /** Each tile's colour, in the shape's order. */
    setTileColours(colours: readonly number[]) {
      colours.forEach((c, i) => tiles.setColorAt(i, colour.set(c)));
      if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    },
    /** Owner rings: the lead owner's on the tile's rim, a second colony's inside it. */
    setOwnerRings(rings: readonly Ring[]) {
      rings.forEach((r, i) => {
        const k = r.inner ? 0.86 : 1;
        owners.setMatrixAt(
          i,
          m4.compose(at.set(r.x, H_TILE + 0.004, r.y), quat.identity(), new Vector3(k, 1, k)),
        );
        owners.setColorAt(i, colour.set(r.colour));
      });
      owners.count = rings.length;
      owners.instanceMatrix.needsUpdate = true;
      if (owners.instanceColor) owners.instanceColor.needsUpdate = true;
    },
    /** Political's realm borders: each a tile's side, 0 to 5 as `SIDES` counts them,
     *  in its realm's glaze. */
    setBorders(sides: readonly Border[]) {
      sides.forEach((b, i) => {
        euler.set(0, (-60 * b.side * Math.PI) / 180, 0);
        borders.setMatrixAt(
          i,
          m4.compose(at.set(b.x, 0.004, b.y), quat.setFromEuler(euler), size.set(1, 1, 1)),
        );
        borders.setColorAt(i, colour.set(b.colour));
      });
      borders.count = sides.length;
      borders.instanceMatrix.needsUpdate = true;
      if (borders.instanceColor) borders.instanceColor.needsUpdate = true;
    },
    /** How far each settlement's models lean toward its owner's glaze: Political's tint. */
    setTint(k: number) {
      if (k === tinting) return;
      tinting = k;
      for (const model of models) if (TINTED.has(model.layer ?? "")) tint(model);
    },
    setMarks(marks: {
      candidates: readonly { x: number; y: number }[];
      selected: { x: number; y: number } | null;
      focus: { x: number; y: number } | null;
    }) {
      marks.candidates.forEach((c, i) =>
        candidates.setMatrixAt(i, m4.makeTranslation(c.x, H_TILE + 0.005, c.y)),
      );
      candidates.count = marks.candidates.length;
      candidates.instanceMatrix.needsUpdate = true;
      selected.visible = Boolean(marks.selected);
      if (marks.selected) selected.position.set(marks.selected.x, H_TILE + 0.006, marks.selected.y);
      focus.visible = Boolean(marks.focus);
      if (marks.focus) focus.position.set(marks.focus.x, H_TILE + 0.008, marks.focus.y);
    },
    /** Stand every model where the layout says; the same layout again is a no-op. A
     *  change of pops or transfers alone moves only the figures and the ships, which
     *  cast no shadow. */
    setLayout(layout: Layout) {
      const still = layout.key !== laidOut;
      if (!still && layout.lifeKey === peopled) return;
      laidOut = layout.key;
      peopled = layout.lifeKey;
      ships = [...layout.ships, ...layout.traders];
      transfers = layout.ships.length;
      voyages = ships.map(
        (ship) =>
          new CatmullRomCurve3(
            ship.route.map((p) => new Vector3(p.x, 0.02, p.z)),
            false,
            "centripetal",
          ),
      );
      steer(time);
      moveRoutes.draw(voyages.slice(0, transfers));
      tradeRoutes.draw(voyages.slice(transfers));
      const afloat: Partial<Record<ModelName, Model["afloat"]>> = {
        good: layout.goods,
        goodFlag: layout.flags,
        boat: layout.boats,
      };
      for (const model of models) {
        if (!still && !LIVING.has(model.name)) continue;
        // The fishing boats circle; the Ports' boats ride at their piers.
        const fishing = model.layer === "lifeAmb";
        model.places = layout.models[model.name] ?? [];
        model.afloat = fishing ? [] : (afloat[model.name] ?? []);
        model.circling = model.name === "gull" ? layout.gulls : fishing ? layout.fishers : [];
        // A pop on a ship is drawn by the riders' models, the rest by the town's.
        model.figures = (layout.figures[model.name as FigureModel] ?? []).filter(
          (f) => (f.mode === "ride") === (model.layer === "passengers"),
        );
        const count = countOf(model);
        if (count > model.capacity) {
          dropMeshes(model);
          model.capacity = 2 ** Math.ceil(Math.log2(count));
          model.meshes = meshesFor(model, model.capacity);
        }
        const tints = SAILS.has(model.name)
          ? fleet(model, ships)
          : [...model.places, ...model.afloat, ...model.figures];
        model.meshes.forEach((mesh, k) => {
          if (model.tpl.meshes[k]?.[0] !== "owner") return;
          tints.forEach((p, i) => mesh.setColorAt(i, colour.set(p.color ?? 0xffffff)));
          mesh.instanceColor!.needsUpdate = true;
        });
        if (TINTED.has(model.layer ?? "")) tint(model);
        (motion(model) ?? stand)(model, time);
        for (const mesh of model.meshes) mesh.boundingSphere = null;
      }
      if (!still) return;
      hearths.from(layout.hearths, time);
      riots.from(layout.riots, time);
      ground.geometry.dispose();
      ground.geometry = groundGeometry(layout.towns);
      lanes.geometry.dispose();
      lanes.geometry = laneGeometry(layout.towns);
      // The casters moved: draw the shadows again.
      renderer.shadowMap.needsUpdate = true;
    },
    /** Which good, by its index, is drawn under a point in normalised device coordinates. */
    pickGood(x: number, y: number) {
      ray.setFromCamera(ndc.set(x, y), camera);
      return ray.intersectObjects(goods.meshes, false)[0]?.instanceId ?? null;
    },
    /** One opacity per layer, from the zoom bands. A layer faded out is not drawn, and
     *  casts no shadow; the land's trees, rocks and fields cast only while `land`, drawn
     *  whole (Economy shows them faded). */
    applyLayers(next: Record<string, number>, land: boolean) {
      alphas = next;
      for (const [layer, mats] of layered) {
        const a = alphas[layer] ?? 1;
        for (const m of mats) m.opacity = (m.userData.base as number) * a;
      }
      scene.traverse((o) => {
        const layer = o.userData.layer as string | undefined;
        if (!layer) return;
        if (layer === "terrain" && o.userData.cast && o.castShadow !== land) {
          o.castShadow = land;
          if (o.visible) renderer.shadowMap.needsUpdate = true;
        }
        const visible = (alphas[layer] ?? 1) > 0.01 && !o.userData.empty;
        if (o.visible === visible) return;
        o.visible = visible;
        if (o.castShadow) renderer.shadowMap.needsUpdate = true;
      });
    },
    /** The ambient clock: the sea's waves, the swell, the wind, the walkers, the ships,
     *  the boats and gulls, the laurel, the smoke and the Oracle's vapour. */
    animate(seconds: number) {
      time = seconds;
      sea.uniforms.uTime.value = seconds;
      steer(seconds);
      if (vapour.visible) steam(seconds);
      hearths.rise(seconds);
      riots.rise(seconds);
      for (const model of models) {
        if (model.meshes[0]?.visible && countOf(model)) motion(model)?.(model, seconds);
      }
    },
    /** Where each ship is now, for its chip. */
    decks: () => decks as readonly { x: number; z: number }[],
    /**
     * Build every shader without stalling the page, while the canvas is out of the
     * page (display: none until the map is ready). The programs compile, then every
     * mesh, hidden and empty ones too, draws once: a GPU that builds its pipelines at
     * the first draw (a software one does) builds them now. A fence says when the GPU
     * is done, so no frame shown waits on it; a software compositor's readback of the
     * first frame would otherwise wait out all of it, page and input stalled.
     */
    async prepare() {
      // Where the GPU says when a program is linked, wait for that; elsewhere the
      // fence below covers the compile too.
      if (renderer.extensions.has("KHR_parallel_shader_compile"))
        await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
      if (disposed) return;
      const restore: (() => void)[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          o.visible = true;
          restore.push(() => (o.visible = false));
        }
        if (o instanceof InstancedMesh && o.count === 0) {
          // A stand-in, drawn once for its pipeline: it must not land in the shadows.
          const cast = o.castShadow;
          o.count = 1;
          o.castShadow = false;
          restore.push(() => {
            o.count = 0;
            o.castShadow = cast;
          });
        }
      });
      renderer.render(scene, camera);
      for (const undo of restore) undo();
      // The warm-up drew every layer's shadow; draw them again as the bands show them.
      renderer.shadowMap.needsUpdate = true;
      const gl = renderer.getContext();
      if (!(gl instanceof WebGL2RenderingContext)) return;
      const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      await new Promise<void>((resolve) => {
        const poll = () => {
          const lost = gl.isContextLost();
          if (fence && !lost && gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) {
            window.setTimeout(poll, 16);
            return;
          }
          if (fence && !lost) gl.deleteSync(fence);
          resolve();
        };
        poll();
      });
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      for (const thing of disposables) thing.dispose();
      for (const model of models) dropMeshes(model);
      for (const tpl of Object.values(templates)) disposeTemplate(tpl);
      moveRoutes.line.geometry.dispose();
      tradeRoutes.line.geometry.dispose();
      hearths.dispose();
      riots.dispose();
      ground.geometry.dispose();
      lanes.geometry.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
