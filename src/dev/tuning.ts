import { getAuthoredGameContent, installGameContent } from "../game/content";
import type { GameContent } from "../game/content";
import { DEFAULT_RULESET, deriveRuleset, mergeRulesetPatches } from "../game/ruleset";
import type { Ruleset, RulesetPatch } from "../game/ruleset";
import type { BuildingDefinition } from "../game/types";
import { getTuningPreset, isTuningPresetId } from "./tuningPresets";
import type { TuningPresetId } from "./tuningPresets";

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
const PRESET_STORAGE_KEY = "hegemony-dev-tuning-preset-v1";

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

export function loadTuningPresetId(): TuningPresetId | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(PRESET_STORAGE_KEY);
    return isTuningPresetId(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveTuningPresetId(id: TuningPresetId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(PRESET_STORAGE_KEY, id);
    else window.localStorage.removeItem(PRESET_STORAGE_KEY);
  } catch {
    // Storage unavailable — the preset still applies for the current reset only.
  }
}

// ── Dev fast-forward flag ────────────────────────────────────────────────────────────
// A persistent dev toggle, kept OUT of the tuning override map (which is for balance A/B
// that translates to a code patch). When on, every new game is fast-forwarded to the
// first Assembly — spring of Year 2, sixteen turns of seed-driven play in — so playtesting
// the rivalry layer never begins with sixteen End Turn clicks. Set from the TUNE panel;
// read by the controller at game creation. Same effect as the `?dev=assembly` URL param,
// but sticky across reloads.

const START_AT_ASSEMBLY_KEY = "hegemony-dev-start-at-assembly";

export function loadStartAtAssembly(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(START_AT_ASSEMBLY_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveStartAtAssembly(on: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(START_AT_ASSEMBLY_KEY, on ? "1" : "0");
  } catch {
    // Storage unavailable (private mode etc.) — the toggle simply won't persist.
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
function presetBaseline(presetId: TuningPresetId | null): {
  ruleset: Ruleset;
  content: GameContent;
} {
  const preset = getTuningPreset(presetId);
  const authored = getAuthoredGameContent();
  return {
    ruleset: preset ? deriveRuleset(DEFAULT_RULESET, preset.rulesetPatch) : DEFAULT_RULESET,
    content: preset ? preset.createContent(authored) : authored,
  };
}

export function tuningBaselineRuleset(presetId: TuningPresetId | null): Ruleset {
  return presetBaseline(presetId).ruleset;
}

export function defaultValueAt(
  path: string,
  presetId: TuningPresetId | null = null,
): OverrideValue | undefined {
  const segments = path.split(".");
  const baseline = presetBaseline(presetId);
  if (segments[0] === "ruleset") {
    return getByPath(baseline.ruleset, segments.slice(1)) as OverrideValue | undefined;
  }
  if (segments[0] === "buildings") {
    const building = baseline.content.buildings.find((candidate) => candidate.id === segments[1]);
    return building
      ? (getByPath(building, segments.slice(2)) as OverrideValue | undefined)
      : undefined;
  }
  return undefined;
}

/** The effective value at a path under a given override map — the override if present, else the code default. */
export function effectiveValueAt(
  map: OverrideMap,
  path: string,
  presetId: TuningPresetId | null = null,
): OverrideValue | undefined {
  return path in map ? map[path] : defaultValueAt(path, presetId);
}

/** Drop any override keys that equal their code default, so a "changed back" field
 *  doesn't linger in the diff or the persisted patch. */
export function pruneToChanges(
  map: OverrideMap,
  presetId: TuningPresetId | null = null,
): OverrideMap {
  const out: OverrideMap = {};
  for (const [path, value] of Object.entries(map)) {
    if (value !== defaultValueAt(path, presetId)) {
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
    effects: building.effects.map((effect) => ({ ...effect })),
  }));
}

/** Apply the `buildings.*` overrides onto a deep copy of `base`; returns null when there
 *  are none, so the caller can clear the content override rather than install a clone. */
export function applyBuildingOverrides(
  base: BuildingDefinition[],
  map: OverrideMap,
): BuildingDefinition[] | null {
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

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function stableTuningHash(value: unknown): string {
  const canonical = canonicalJson(value);
  let hash = 5381;
  for (let index = 0; index < canonical.length; index += 1) {
    hash = ((hash << 5) + hash + canonical.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export type ResolvedTuning = {
  ruleset: Ruleset;
  rulesetPatch: RulesetPatch | null;
  content: GameContent;
  presetId: TuningPresetId | null;
  resolvedContentHash: string;
  manualPatchHash: string | null;
};

/** Pure browser/simulator resolver. Precedence is mode → preset → explicit ruleset
 *  patch → manual dot-path overrides. Content is freshly cloned by every preset. */
export function resolveTuning(
  base: Ruleset,
  presetId: TuningPresetId | null,
  map: OverrideMap = {},
  explicitPatch: RulesetPatch | null = null,
): ResolvedTuning {
  const preset = getTuningPreset(presetId);
  const manualRuleset = rulesetPatchFromOverrides(map) as RulesetPatch | null;
  const rulesetPatch = mergeRulesetPatches(
    mergeRulesetPatches(preset?.rulesetPatch ?? null, explicitPatch),
    manualRuleset,
  );
  const authored = getAuthoredGameContent();
  const presetContent = preset ? preset.createContent(authored) : authored;
  const manualBuildings = applyBuildingOverrides(presetContent.buildings, map);
  const content = manualBuildings
    ? { ...presetContent, buildings: manualBuildings }
    : presetContent;

  return {
    ruleset: rulesetPatch ? deriveRuleset(base, rulesetPatch) : base,
    rulesetPatch,
    content,
    presetId,
    resolvedContentHash: stableTuningHash(content),
    manualPatchHash: Object.keys(map).length > 0 ? stableTuningHash(map) : null,
  };
}

/**
 * The one browser integration point: called from the controller at game creation.
 * Installs the complete resolved content package and returns the resolved ruleset.
 * Production clears the package back to authored content and returns `base` unchanged.
 */
export function resolveTunedRuleset(base: Ruleset): Ruleset {
  if (!import.meta.env.DEV) {
    installGameContent(null);
    return base;
  }
  const map = loadOverrides();
  const resolved = resolveTuning(base, loadTuningPresetId(), map);
  installGameContent(resolved.content);
  return resolved.ruleset;
}
