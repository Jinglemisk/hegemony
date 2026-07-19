import { BUILDINGS } from "../game/data";
import { setContentOverrides } from "../game/content";
import { DEFAULT_RULESET, deriveRuleset } from "../game/ruleset";
import type { Ruleset } from "../game/ruleset";
import type { BuildingDefinition } from "../game/types";

/**
 * The DEV tuning model. A tuning session is a flat map of dot-path → value overrides,
 * persisted to localStorage so it survives reloads but never touches source. The panel
 * (src/dev/TunePanel.tsx) edits it; {@link resolveTunedRuleset} injects it at game
 * creation. Nothing here runs in a production build — the whole module is dev-gated at
 * its one call site and localStorage-guarded for non-browser (test/sim) contexts.
 *
 * Path grammar (the leaf is always a number or boolean):
 *   ruleset.<...>                      e.g. ruleset.actionCosts.foundColony.wood
 *   buildings.<id>.cost.<resource>     e.g. buildings.villa.cost.wood
 *   buildings.<id>.maxLevel
 *   buildings.<id>.effects.<i>.amount  e.g. buildings.gymnasion.effects.0.amount
 */

export type OverrideValue = number | boolean;
export type OverrideMap = Record<string, OverrideValue>;

const STORAGE_KEY = "hegemony-dev-overrides";

export function loadOverrides(): OverrideMap {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch {
    return {};
  }
}

export function saveOverrides(map: OverrideMap): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private mode etc.) — tuning simply won't persist.
  }
}

// ── Path helpers ─────────────────────────────────────────────────────────────────────

function getByPath(root: unknown, segments: string[]): unknown {
  let cur: unknown = root;
  for (const key of segments) {
    if (cur == null || typeof cur !== "object") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** Set `value` at `segments` in `obj`, creating plain-object links for missing parents
 *  (used to build a {@link deriveRuleset} patch; JS lets array indices be string keys). */
function setByPath(obj: Record<string, unknown>, segments: string[], value: unknown): void {
  let cur = obj;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const next = cur[key];
    if (next == null || typeof next !== "object") {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[segments[segments.length - 1]] = value;
}

/** The authored (code) value a path resolves to, for diffing and default display. */
export function defaultValueAt(path: string): OverrideValue | undefined {
  const segments = path.split(".");
  if (segments[0] === "ruleset") {
    return getByPath(DEFAULT_RULESET, segments.slice(1)) as OverrideValue | undefined;
  }
  if (segments[0] === "buildings") {
    const building = BUILDINGS.find((candidate) => candidate.id === segments[1]);
    return building ? (getByPath(building, segments.slice(2)) as OverrideValue | undefined) : undefined;
  }
  return undefined;
}

/** The effective value at a path under a given override map — the override if present, else the code default. */
export function effectiveValueAt(map: OverrideMap, path: string): OverrideValue | undefined {
  return path in map ? map[path] : defaultValueAt(path);
}

/** Drop any override keys that equal their code default, so a "changed back" field
 *  doesn't linger in the diff or the persisted patch. */
export function pruneToChanges(map: OverrideMap): OverrideMap {
  const out: OverrideMap = {};
  for (const [path, value] of Object.entries(map)) {
    if (value !== defaultValueAt(path)) {
      out[path] = value;
    }
  }
  return out;
}

// ── Applying overrides ─────────────────────────────────────────────────────────────

/** The ruleset PATCH implied by the `ruleset.*` overrides (the input to deriveRuleset),
 *  or null when the map touches no ruleset paths. Exposed so the headless sim can fold a
 *  tune-panel patch into its own ruleset-patch pipeline. */
export function rulesetPatchFromOverrides(map: OverrideMap): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  let touched = false;
  for (const [path, value] of Object.entries(map)) {
    const segments = path.split(".");
    if (segments[0] !== "ruleset") {
      continue;
    }
    setByPath(patch, segments.slice(1), value);
    touched = true;
  }
  return touched ? patch : null;
}

/** Build a {@link Ruleset} patch from the `ruleset.*` overrides and derive it onto `base`. */
export function applyRulesetOverrides(base: Ruleset, map: OverrideMap): Ruleset {
  const patch = rulesetPatchFromOverrides(map);
  return patch ? deriveRuleset(base, patch as never) : base;
}

function cloneBuildings(base: BuildingDefinition[]): BuildingDefinition[] {
  return base.map((building) => ({
    ...building,
    cost: { ...building.cost },
    effects: building.effects.map((effect) => ({ ...effect }))
  }));
}

/** Apply the `buildings.*` overrides onto a deep copy of `base`; returns null when there
 *  are none, so the caller can clear the content override rather than install a clone. */
export function applyBuildingOverrides(base: BuildingDefinition[], map: OverrideMap): BuildingDefinition[] | null {
  const buildingPaths = Object.entries(map).filter(([path]) => path.startsWith("buildings."));
  if (buildingPaths.length === 0) {
    return null;
  }
  const clone = cloneBuildings(base);
  for (const [path, value] of buildingPaths) {
    const segments = path.split(".");
    const building = clone.find((candidate) => candidate.id === segments[1]);
    if (building) {
      setByPath(building as unknown as Record<string, unknown>, segments.slice(2), value);
    }
  }
  return clone;
}

/**
 * The one integration point: called from the controller at game creation. Installs the
 * building content override (or clears it) and returns the ruleset patched with the
 * `ruleset.*` overrides. A no-op that returns `base` unchanged when not in dev or when
 * no overrides are set.
 */
export function resolveTunedRuleset(base: Ruleset): Ruleset {
  if (!import.meta.env.DEV) {
    setContentOverrides({ buildings: null, terrain: null });
    return base;
  }
  const map = loadOverrides();
  setContentOverrides({ buildings: applyBuildingOverrides(BUILDINGS, map) });
  return applyRulesetOverrides(base, map);
}
