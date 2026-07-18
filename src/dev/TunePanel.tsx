import { useEffect, useMemo, useState } from "react";
import "./tunePanel.css";
import { getBuildings, getTerrainDeck } from "../game/content";
import { DEFAULT_RULESET } from "../game/ruleset";
import type { HegemonyState } from "../game/types";
import { buildingSummary, describeBuildingEffect, terrainStats, terrainTotals } from "./aggregates";
import {
  defaultValueAt,
  effectiveValueAt,
  loadOverrides,
  pruneToChanges,
  saveOverrides
} from "./tuning";
import type { OverrideMap, OverrideValue } from "./tuning";

/**
 * DEV-ONLY parameter dashboard. Two jobs in one panel:
 *  1. GLANCE — render every live tunable (ruleset + building effects + terrain
 *     aggregates) so the current game parameters are readable at a glance.
 *  2. TUNE — edit any of them into a localStorage override that is injected at the next
 *     game creation (Apply). Source is never touched; "Copy patch" emits the diff for a
 *     human/agent to make permanent when a value proves out.
 *
 * Mounted only under `import.meta.env.DEV`, so it is tree-shaken from production builds.
 */

const OPEN_KEY = "hegemony-dev-tune-open";
const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

export function TunePanel({ game, resetGame }: { game: HegemonyState; resetGame: () => void }) {
  const forceOpen = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tune");
  const [open, setOpen] = useState<boolean>(() => {
    if (forceOpen) return true;
    try {
      return window.localStorage.getItem(OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [draft, setDraft] = useState<OverrideMap>(() => loadOverrides());

  useEffect(() => {
    try {
      window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
  }, [open]);

  // Backtick toggles the panel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (event.key === "`" && !typing) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changes = useMemo(() => pruneToChanges(draft), [draft]);
  const changeCount = Object.keys(changes).length;

  const setValue = (path: string, value: OverrideValue) => setDraft((prev) => ({ ...prev, [path]: value }));
  const revert = (path: string) =>
    setDraft((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });

  const apply = () => {
    const pruned = pruneToChanges(draft);
    saveOverrides(pruned);
    setDraft(pruned);
    resetGame();
  };
  const resetAll = () => {
    saveOverrides({});
    setDraft({});
    resetGame();
  };
  const copyPatch = () => {
    const lines = Object.keys(changes)
      .sort()
      .map((path) => `${path}: ${defaultValueAt(path)} → ${changes[path]}`);
    const text = ["# Hegemony dev tuning — make permanent:", ...lines].join("\n");
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  if (!open) {
    return (
      <button className="tune-fab" onClick={() => setOpen(true)} title="Open parameter dashboard ( ` )">
        ⚙ TUNE{changeCount > 0 ? ` · ${changeCount}` : ""}
      </button>
    );
  }

  const buildings = getBuildings();
  const deck = getTerrainDeck();
  const stats = terrainStats(deck);
  const totals = terrainTotals(deck);

  return (
    <aside className="tune-panel">
      <header className="tune-head">
        <span className="tune-title">PARAMETERS</span>
        <span className="tune-sub">
          turn {game.turn} · {game.boardLayout} · seed {game.seed}
        </span>
        <button className="tune-x" onClick={() => setOpen(false)} title="Close ( ` )">
          ×
        </button>
      </header>

      <div className="tune-actions">
        <button className="tune-btn primary" onClick={apply} disabled={changeCount === 0}>
          Apply &amp; New Game
        </button>
        <button className="tune-btn" onClick={resetAll} disabled={changeCount === 0}>
          Reset
        </button>
        <button className="tune-btn" onClick={copyPatch} disabled={changeCount === 0}>
          Copy patch
        </button>
        <span className={`tune-badge${changeCount > 0 ? " on" : ""}`}>{changeCount} changed</span>
      </div>
      <p className="tune-hint">
        Edits are temporary overrides in your browser — Apply starts a fresh game (same board) with them. Nothing
        touches code until you Copy patch and ask Claude to make it permanent.
      </p>

      <Section title="Terrain" subtitle="read-only aggregates">
        <table className="tune-table">
          <thead>
            <tr>
              <th>terrain</th>
              <th>tiles</th>
              <th>slots</th>
              <th>Σ yield</th>
              <th>avg</th>
              <th>max</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.terrain}>
                <td>{row.terrain}</td>
                <td>{row.tiles}</td>
                <td>{row.slots}</td>
                <td>{row.totalYield || "—"}</td>
                <td>{row.avgYield === undefined ? "—" : fmt(row.avgYield)}</td>
                <td>{row.maxYield || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tune-totals">
          {totals.tiles} tiles · {totals.slots} slots · wood {totals.wood} · stone {totals.stone} · food {totals.food}
        </div>
      </Section>

      <Section title="Buildings" subtitle="cost · effects · max level">
        {buildings.map((building, buildingIndex) => (
          <div className="tune-building" key={building.id}>
            <div className="tune-building-head">
              <span className="tune-building-name">{building.name}</span>
              <span className="tune-building-eff">{buildingSummary(building)}</span>
            </div>
            <div className="tune-fields">
              {Object.keys(building.cost).map((resource) => (
                <NumberField
                  key={resource}
                  label={`cost ${resource}`}
                  path={`buildings.${building.id}.cost.${resource}`}
                  draft={draft}
                  onChange={setValue}
                  onRevert={revert}
                />
              ))}
              {building.effects.map((effect, effectIndex) => (
                <NumberField
                  key={effectIndex}
                  label={effectLabel(describeBuildingEffect(effect))}
                  path={`buildings.${building.id}.effects.${effectIndex}.amount`}
                  draft={draft}
                  onChange={setValue}
                  onRevert={revert}
                />
              ))}
              <NumberField
                label="max level"
                path={`buildings.${building.id}.maxLevel`}
                draft={draft}
                onChange={setValue}
                onRevert={revert}
              />
            </div>
            {buildingIndex < buildings.length - 1 && <hr className="tune-rule" />}
          </div>
        ))}
      </Section>

      <Section title="Ruleset" subtitle="costs · income · economy">
        <RulesetTree obj={DEFAULT_RULESET as unknown as Record<string, unknown>} prefix="ruleset" draft={draft} onChange={setValue} onRevert={revert} />
      </Section>
    </aside>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="tune-section">
      <button className="tune-section-head" onClick={() => setOpen((value) => !value)}>
        <span className="tune-caret">{open ? "▾" : "▸"}</span>
        <span className="tune-section-title">{title}</span>
        <span className="tune-section-sub">{subtitle}</span>
      </button>
      {open && <div className="tune-section-body">{children}</div>}
    </section>
  );
}

/** A lightweight nested collapsible for ruleset subtrees — collapsed by default so a
 *  deep ruleset opens as a short list of group headers rather than one giant flat list. */
function CollapsibleGroup({
  label,
  defaultOpen = false,
  children
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="tune-subtree">
      <button className="tune-subtree-toggle" onClick={() => setOpen((value) => !value)}>
        <span className="tune-caret">{open ? "▾" : "▸"}</span>
        <span className="tune-subtree-label">{label}</span>
      </button>
      {open && <div className="tune-subtree-body">{children}</div>}
    </div>
  );
}

/** Recursively renders number/boolean leaves of a ruleset subtree as editable fields;
 *  strings (e.g. bank derivation) render read-only, arrays (setup) are skipped. */
function RulesetTree({
  obj,
  prefix,
  draft,
  onChange,
  onRevert
}: {
  obj: Record<string, unknown>;
  prefix: string;
  draft: OverrideMap;
  onChange: (path: string, value: OverrideValue) => void;
  onRevert: (path: string) => void;
}) {
  return (
    <>
      {Object.entries(obj).map(([key, value]) => {
        const path = `${prefix}.${key}`;
        if (typeof value === "number") {
          return <NumberField key={path} label={key} path={path} draft={draft} onChange={onChange} onRevert={onRevert} />;
        }
        if (typeof value === "boolean") {
          return <BoolField key={path} label={key} path={path} draft={draft} onChange={onChange} onRevert={onRevert} />;
        }
        if (typeof value === "string") {
          return (
            <div className="tune-field readonly" key={path}>
              <span className="tune-label">{key}</span>
              <span className="tune-ro">{value}</span>
            </div>
          );
        }
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return (
            <CollapsibleGroup key={path} label={key}>
              <RulesetTree obj={value as Record<string, unknown>} prefix={path} draft={draft} onChange={onChange} onRevert={onRevert} />
            </CollapsibleGroup>
          );
        }
        return null;
      })}
    </>
  );
}

function NumberField({
  label,
  path,
  draft,
  onChange,
  onRevert
}: {
  label: string;
  path: string;
  draft: OverrideMap;
  onChange: (path: string, value: OverrideValue) => void;
  onRevert: (path: string) => void;
}) {
  const def = defaultValueAt(path);
  const value = effectiveValueAt(draft, path);
  const overridden = path in draft;
  return (
    <label className={`tune-field${overridden ? " overridden" : ""}`}>
      <span className="tune-label">{label}</span>
      <input
        className="tune-input"
        type="number"
        step="any"
        value={value === undefined ? "" : Number(value)}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            onRevert(path);
            return;
          }
          const next = Number(raw);
          if (!Number.isNaN(next)) {
            onChange(path, next);
          }
        }}
      />
      {overridden && (
        <button className="tune-revert" title={`revert to ${def}`} onClick={() => onRevert(path)}>
          ↺{typeof def === "number" ? ` ${fmt(def)}` : ""}
        </button>
      )}
    </label>
  );
}

function BoolField({
  label,
  path,
  draft,
  onChange,
  onRevert
}: {
  label: string;
  path: string;
  draft: OverrideMap;
  onChange: (path: string, value: OverrideValue) => void;
  onRevert: (path: string) => void;
}) {
  const value = Boolean(effectiveValueAt(draft, path));
  const overridden = path in draft;
  return (
    <label className={`tune-field${overridden ? " overridden" : ""}`}>
      <span className="tune-label">{label}</span>
      <input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />
      {overridden && (
        <button className="tune-revert" title="revert" onClick={() => onRevert(path)}>
          ↺
        </button>
      )}
    </label>
  );
}

/** Trim a full effect description down to a compact field label (drops the leading sign). */
function effectLabel(description: string): string {
  return description.replace(/^[+−-]\s*\d+(\.\d+)?\s*/, "").slice(0, 22);
}
