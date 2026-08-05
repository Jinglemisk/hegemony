# Hegemony Codebase Analysis

Based on review of the last ~17 merged PRs (#49–#67), dominated by the **Phase 3.5 Assembly revision** and **Phase 3.6 architecture hardening** (per-match definitions, canonical atomic `transition`, workflow actors, projections, versioning/invariants, parity enforcement), plus dead-code and hygiene sweeps. Findings below.

---

## 1. Dead code

**Important: `npm run dead-code` (knip) reports ZERO issues, but that's a config artifact.** `knip.json` sets `"entry": ["e2e/**/*.ts"]` and `"ignoreExportsUsedInFile": true` — the latter hides the entire class of dead `export` modifiers below. Nothing is orphaned (no unreachable modules), so these are all safe, mechanical wins.

### High-value dead exports (exported, never imported anywhere)
| Location | Symbol |
|---|---|
| `src/game/turn.ts:176` | `beginTurnFor` (only used in-file) |
| `src/game/turn.ts:31,62` | `createGame`, `nextPlayer` — production never uses them; only tests do |
| `src/game/map.ts:9` | `BOARD_RADIUS` |
| `src/game/invariants.ts:37` | `collectInvariantViolations` |
| `src/game/version.ts:7` | `ENGINE_VERSION` |
| `src/game/definition.ts:6,7,52` | `RULESET_VERSION`, `CONTENT_VERSION`, `createModeDefinition` (test-only) |
| `src/game/definition.ts:43` | `canonicalJson` (in-file only) |
| `src/game/testing/scenario.ts:33` | `TEST_SEED` |
| `src/dev/tuning.ts:226` | `stableTuningHash` |
| `src/components/board/helpers.ts:155` | `createEmptyResources` |
| `src/sim/runner.ts:24,35` | `MAX_ACTIONS_PER_TURN`, `MAX_ACTIONS_PER_ASSEMBLY` |
| `src/ui/anchoring.ts:3-5` | `ANCHOR_MARGIN`, `ANCHOR_GAP`, `ANCHOR_ARROW_INSET` |
| `src/ui/formatters.ts:16` | `SEASON_LABELS` |
| `src/ui/hexGeometry.ts:128` | `coordinateKey` |
| `src/ui/resourceVisuals.ts:25` | `RESOURCE_VISUALS` |
| `src/sim/format.ts:16,20,26` | `formatNumber`, `formatDelta`, `formatResourceDelta` |

Plus ~20 barrel-exported-but-unused helpers (via `rules.ts`): `getGrowPopCost`, `addIncomeContribution`, `isValidPopSelection`, `getResolveRiotStatus`, `resetTurnFlags`, `isContiguousForPlayer`, `playerHoldsCoast`, `rollDie`, `isAtLawCap`, and ~60 type exports that only document state shape.

### Concrete dead code (verified)
- **`src/game/legalMoves.ts:850`** — a stray trailing `import { produce } from "immer";` (dead line at EOF).
- **`src/game/transition.test.ts`** — tests `transition` from `./legalMoves`; `src/game/transition.ts` does **not** exist. Stale filename from before the engine decomposition.
- **`src/sim/lowNumberEconomy.test.ts`** — imports from `../dev/tuningPresets`; the `lowNumberEconomy.ts` it's named after was deleted (PR #61). Misleading name, still valid test.
- **Dead CSS classes**: `.appButton` (base.css:132), `.detailTooltipBelow` (pops.css:169), `.topbarEventTooltipLabel` (ledger.css:420).

---

## 2. Spread-out / duplicated game logic

The top risk: the codebase already fixed one "UI/sim re-derive engine math" bug (documented as R7), but the same class of duplication persists in the hottest spots:

### Critical (drift = bugs)
1. **First-income food grace — identical predicate in 4 files** (`income.ts:270`, `unrest.ts:66`, `activeEffects.ts:165`, `policies.ts:290`). Extract one `firstIncomeGraceActive(G, playerID)`.
2. **Victory tiebreak written twice** — `resolveDeckExhaustion` (victory.ts:177-188) and `leaderByTiebreak` (telemetry.ts:525-534) re-implement the same cards→happiness→pops→seat sort. If the ruleset changes the tiebreak, telemetry silently disagrees with the engine.
3. **Settlement/pop tally loop copy-pasted ~6×** — `score.ts:26`, `victory.ts:76`, `settlement.ts:48`, `policies.ts:527` & `:380`, `sim/format.ts:132`. `victoryCardsHeld` alone sweeps all settlements 24× per call. Consolidate on one `playerStandings`-style selector.
4. **`getBuilding()` exists but is bypassed at 8 call sites** — `status.ts:119`, `actions.ts:341`, `civic.ts:83`, `income.ts:395`, `preview.ts:169`, `cost.ts:100`, `settlement.ts:25`, `tables.ts:305` all re-write `getBuildings(content).find(...)`.

### High
5. **Cost fallback chain** — `status.cost ?? G.ruleset.actionCosts.X` re-states base constants at 5+ call sites (status.ts:44,102; actions.ts:195,247,353) that validators already derived. Cost-only query needed (see verbs.tsx:99/115 abusing `getFoundColonyStatus(G, playerID, "")` with empty tileId just to read `.cost`).
6. **In-transit pop count** in 3 places (`telemetry.ts:80`, `preview.ts:106` & `:228`, `PopsTab.tsx:40`).
7. **Setup placement legality triplicated** — `placeCapital/placeCity/placeColony` validate inline (actions.ts:44-160) with *no* `get*Status` validator, and legalMoves.ts re-derives geometry at :604-663. This is the one move family that skipped the status layer.
8. **`state.ruleset` compat alias** — 162 `G.ruleset.*` uses vs 3 `G.definition.ruleset`. Forces a full FNV-1a hash fallback on **every transition** (definition.ts:174-179), an invariants check, and load-time restore (io.ts:122-126). Comment says "until PR2 removes the alias" — that refactor is overdue.

### Medium / naming
9. **Three parallel formatters** for resources/numbers — `core/format.ts` ("no change", lowercase), `ui/formatters.ts` ("none", Title-Case), `sim/format.ts` (toFixed(1), different order). Same delta renders 3 different ways.
10. **`formatPrize` ×3** — AssemblyBema.tsx:681 and AssemblyColonnade.tsx:197 (byte-identical), plus an engine copy at assembly.ts:806 (UI string in the engine layer).
11. **`beginGameplayTurn` vs `beginTurnFor`** (turn.ts:102 vs :176) share the identical victory→upkeep→income tail; extraction was partial.
12. **Unrest tiers renamed across engine/sim** — `calm/discontent` (unrest.ts) vs `safe/buffer` (policies.ts) for the same concept.
13. **Terminology sprawl** — same operations called `GameCommand`/`move`/`GameMoves`/`ActionStatus`/`VerbId`; tile labels have 4 variants (`formatTileLabel`, `settlementIncomeSource`, `holdingShortLabel`, `settlementPickerLabel`).
14. **God files** — `sim/policies.ts` (1180: policies + stochastic rules + unrest risk + beam search + scoring + assembly heuristics), `game/data.ts` (1058: all authored content), `rulebook.tsx` (1043: data + render helpers), `legalMoves.ts` (850: enumeration + dispatcher + describeCommand + bundles). All have clean split points.
15. **`rules.ts` barrel** still imported by ~13 call sites, hiding which module a consumer actually needs.

---

## 3. Repo hygiene / housekeeping

**Highest priority: uncommitted work.** `git status` shows `?? mprocs.yaml` plus uncommitted edits to `package.json` (new `start` script) and `README.md`. A fresh clone currently gets no `npm start` — this looks like a forgotten commit from PR #52-era work.

- **`.gitignore` contradiction** (medium): line 19 ignores `docs/sim/*.json` and comments "keep the .md write-ups, not the raw reports" — but that directory is forbidden by `scripts/check-docs.mjs` while **16 sim JSONs are actually tracked** in `docs/reports/simulation/`. The ignore pattern is dead; the comment and practice disagree.
- **Stale docs referencing deleted code** (medium): `docs/reports/simulation/2026-07-25-low-number-economy.md:535,558-560` references the deleted `src/sim/economyStudy.ts` / `lowNumberEconomy.ts` — its repro command no longer runs. Archived audits reference the moved `src/game/controller.ts` and other pre-refactor paths (low, but the archived `roadmap-appendix.md` still carries OPEN `**Your answer:**` slots, contradicting "questions.md is the only place" policy).
- **~66 MB ignored scratch** in the worktree (`.playwright-mcp/` 34 MB/309 files, `output/`, `dist/`, `.sim/`, `test-results/`) — all gitignored, safe to delete.
- **Parity-suite intentional overlap** (documented, low): `withinAxisParity.test.ts:80` vs `activeEffectParity.test.ts:207` are near-duplicate seasonal-seat tests.

---

## Recommended cleanup order

1. **Commit `mprocs.yaml` + `package.json`/`README` start-script changes** — active process gap.
2. **Fix `knip.json`** (remove `ignoreExportsUsedInFile`, add `src/main.tsx`/`src/sim/cli.ts` entries) so dead-code gate actually works — then sweep the ~15 high-value dead exports.
3. **Extract single sources of truth** for the food-grace predicate, victory tiebreak, settlement tally, `getBuilding`, and in-transit counts (items 1–6) — these are the real drift risks.
4. **Drop the `state.ruleset` alias** (162 call sites → `getRules(G)` or `G.definition.ruleset`) to kill the per-transition hash fallback and one invariant.
5. **Add `getPlaceCapital/City/ColonyStatus` validators** so setup legality joins the status layer (removes the actions.ts↔legalMoves.ts triplication).
6. **Consolidate formatters** (`sim/format.ts` → delegate to `core/format.ts` + `ui/formatters.ts`), single `formatPrize`, single `authorColor`/`authorName`.
7. **Rename stale test files** (`transition.test.ts`, `lowNumberEconomy.test.ts`); delete dead CSS classes; fix `.gitignore` line 19; refresh the low-number-economy report.
8. **Defer (bigger surgery):** split the god files, remove `migration.ts` once v1 save support drops, retire the `rules.ts` barrel.

The overall trajectory of the last PRs is genuinely clean (the atomic `transition`, actor/projection layers, and parity enforcement are well-done and clearly documented). The remaining debt is concentrated in *duplicated predicates/selectors* and the *uncommitted mprocs work* — both cheap to fix now and increasingly costly later.
