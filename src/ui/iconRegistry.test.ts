import { describe, expect, it } from "vitest";
import {
  ACTIVE_EFFECT_MECHANIC_PARITY,
  BUILDING_EFFECT_PARITY,
  DIRECTIVE_EFFECT_PARITY,
  EVENT_EFFECT_PARITY,
  LAW_EFFECT_PARITY,
  TABLE_EFFECT_PARITY,
} from "../parity/featureParity";
import { EFFECT_REGISTRY_FAMILIES, ICON_REGISTRY_FAMILIES } from "./iconRegistry";
import { GLYPHS, type GlyphId } from "./icons/glyphs";

/**
 * The icon system's own parity suite, in the same spirit as
 * `featureParity.test.ts`: the manifests are the authority, and the registry has
 * to keep up with them or the run goes red.
 *
 * Types already make each map total — `satisfies Record<Union, GlyphId>` refuses
 * a missing key at compile time. What types cannot say is the part that actually
 * matters to a player: that eleven law effects are eleven *different pictures*,
 * and that every picture is one this codebase can draw.
 */

const EFFECT_PARITY_MANIFESTS = {
  eventEffect: EVENT_EFFECT_PARITY,
  tableEffect: TABLE_EFFECT_PARITY,
  lawEffect: LAW_EFFECT_PARITY,
  directiveEffect: DIRECTIVE_EFFECT_PARITY,
  buildingEffect: BUILDING_EFFECT_PARITY,
  activeEffectMechanic: ACTIVE_EFFECT_MECHANIC_PARITY,
} as const;

describe("every typed effect has an icon", () => {
  for (const family of EFFECT_REGISTRY_FAMILIES) {
    const registry = ICON_REGISTRY_FAMILIES[family];
    const manifest = EFFECT_PARITY_MANIFESTS[family];

    it(`${family}: covers exactly the discriminants the parity manifest ships`, () => {
      expect(Object.keys(registry).sort()).toEqual(Object.keys(manifest).sort());
    });
  }
});

/**
 * The no-duplicate rule, over EVERY family rather than the effect ones.
 *
 * The noun families sat outside this check until ICON-1, because they were not
 * what drew the UI: pops, buildings and settlement kinds came off a painted
 * sprite atlas whose sheet had four building cells for nine buildings. The forum
 * wore the marketplace's stall; the aqueduct and the villa shared the granary's
 * roof; the odeon and the gymnasion shared the temple. Five buildings, three
 * borrowed pictures, and nothing in the suite could say so — the duplication was
 * in a CSS class table the registry never saw.
 *
 * Every one of those is an `<Icon>` off this registry now, so the guarantee that
 * caught it for effects can finally cover them too.
 */
describe("no family shows two things the same picture", () => {
  for (const [family, registry] of Object.entries(ICON_REGISTRY_FAMILIES)) {
    it(`${family}: gives each member its OWN glyph`, () => {
      const glyphs = Object.values(registry) as GlyphId[];
      const duplicates = glyphs.filter((glyph, index) => glyphs.indexOf(glyph) !== index);

      // Sharing across families is intended (a tree is a tree); sharing WITHIN
      // one is the shrug-icon failure the plan exists to prevent.
      expect(duplicates).toEqual([]);
    });
  }
});

describe("every registry entry names a glyph that exists", () => {
  for (const [family, registry] of Object.entries(ICON_REGISTRY_FAMILIES)) {
    it(`${family}: resolves to drawable path data`, () => {
      for (const [key, glyph] of Object.entries(registry)) {
        const shapes = GLYPHS[glyph as GlyphId];

        expect(shapes, `${family}.${key} → ${glyph}`).toBeDefined();
        expect(shapes.length, `${family}.${key} → ${glyph} is empty`).toBeGreaterThan(0);
      }
    });
  }
});

describe("the glyph set is drawn by one hand", () => {
  const shapes = Object.entries(GLYPHS);

  it("keeps every glyph inside the 24 grid", () => {
    // Numbers are read straight off the path data; a coordinate outside -1…25 is
    // someone drawing at a different scale, which is the first way a set drifts.
    for (const [id, glyph] of shapes) {
      for (const shape of glyph) {
        const numbers =
          shape.kind === "path"
            ? (shape.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
            : shape.kind === "circle"
              ? [shape.cx, shape.cy, shape.r]
              : [shape.x, shape.y, shape.w, shape.h];

        for (const value of numbers) {
          expect(Math.abs(value), `${id} has a coordinate off the grid: ${value}`).toBeLessThan(26);
        }
      }
    }
  });

  it("allows at most one solid mass per glyph", () => {
    for (const [id, glyph] of shapes) {
      const solids = glyph.filter((shape) => "solid" in shape && shape.solid);

      expect(solids.length, `${id} has ${solids.length} solid masses`).toBeLessThanOrEqual(1);
    }
  });

  it("has no glyph nobody asks for", () => {
    const used = new Set<GlyphId>(
      Object.values(ICON_REGISTRY_FAMILIES).flatMap(
        (registry) => Object.values(registry) as GlyphId[],
      ),
    );
    // The UI-furniture glyphs are reached by name rather than through a registry,
    // so they are declared here — the list is short on purpose, and anything that
    // falls off it is a glyph that was drawn and then forgotten.
    const furniture: GlyphId[] = [
      "unhappiness",
      "maskPlain",
      "promote",
      "demote",
      "hourglass",
      "law",
      "directive",
      "stele",
      "repeal",
      "ostrakon",
      "bema",
      "veto",
      "bribe",
      "die",
      "laurel",
      "treasury",
      "voice",
      "crowd",
      "citizens",
      "chronicle",
      "codex",
      "city",
      "stockpile",
      "chevronDown",
      "chevronRight",
      "cross",
      "plus",
      "minus",
      "search",
      "pin",
      "costUp",
      "gain",
      "loss",
      // The luxury amphora: the map marker, the dossier's goods count, and the
      // Port's claim picker reach it by name.
      "luxury",
    ];

    for (const glyph of furniture) {
      used.add(glyph);
    }

    expect(Object.keys(GLYPHS).filter((id) => !used.has(id as GlyphId))).toEqual([]);
  });
});
