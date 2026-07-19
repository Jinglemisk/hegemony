# Post-Sprint Debt Audit — Hegemony

Scope: PRs **#24–#35**, merged 2026-07-18 → 2026-07-19 (~19,800 insertions across 101
files). Audited 2026-07-19/20 from `main` @ `52dc334`. Method: four parallel auditors
(dead code · duplication · parameterization · architecture), each finding then
re-verified at the source before being recorded here. Claims that did **not** survive
verification are listed in §8 rather than deleted, so the same wrong conclusion doesn't
get re-derived later.

**Verdict.** The boundary the project cares most about — *the UI never duplicates engine
formulas* — survived the sprint intact. What accumulated is debris, not rot: ~525 lines
of dead code, one live bug on the dev tuning path, and five places where a balance knob
leaks outside `DEFAULT_RULESET`. All of it is mechanically fixable; none of it requires
redesign.

---

## 1. Baseline health

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `npm run lint` | **0 errors**, 40 warnings (31 = unused imports) |
| `vitest run` | **217 passed / 24 files** |
| `npm run build` | clean — 398.6 KB JS (118.6 KB gzip), 82.9 KB CSS |
| `any` / `as any` | **0** |
| non-null assertions | 2 |
| `eslint-disable` | 4, all justified (2 × `react-refresh` on mixed-export files; 2 × `exhaustive-deps`, both documented and correct — the Codex nonce pattern and a mount-once `ResizeObserver`) |
| `TODO`/`FIXME`/`HACK`/`XXX` | **0 across 136 files** |
| commented-out code blocks | **0** |

Type discipline and marker hygiene are genuinely strong and should be stated as the
baseline: this sprint did not erode them.

**Process note.** All 12 PRs in the window merged with **zero reviews and zero review
comments**. That is the mechanism behind §3 and §5 — nothing was positioned to catch
leftovers. It is the cheapest thing on this list to change.

---

## 2. Parameterization — the spine holds, five leaks

`DEFAULT_RULESET` (`src/game/ruleset.ts:157`) is a real single tunable object, and
`TunePanel`'s `RulesetTree` (`src/dev/TunePanel.tsx:253`) walks it recursively — so
**anything added to the ruleset becomes hot-testable with zero panel work.** The engine
reads `G.ruleset` essentially everywhere; `income.ts:39-44` documents deliberately
*removing* a `= DEFAULT_RULESET` default because it silently desynced UI from engine
(the "R7" bug). That instinct is correct and worth preserving.

Every leak below is a value living *outside* that object.

### 2.1 — `cost.ts` bypasses the content-override seam · **HIGHEST**

`src/game/economy/cost.ts:1` imports `BUILDINGS` directly from `../data`, and
`cost.ts:70-72` uses it for `getGrowPopFoodDiscount`. Every other rules module goes
through `getBuildings()` — verified: `status.ts:1`, `civic.ts:1`, `settlement.ts:1`,
`actions.ts:1`, `legalMoves.ts:27`, `income.ts:2`, `tables.ts:2`.

**Consequence:** editing the Granary's `growPopFoodDiscount` in TunePanel changes the
*displayed* effect but not the *actual* grow-pop cost. The panel accepts the edit and
lies about it — the worst failure mode a tuning tool can have.

`src/game/economy/preview.ts:1` has the same direct import but only reads `.name`
(cosmetic; fix together for consistency).

**Fix:** one-line import change in each.

### 2.2 — The terrain override seam is built but never wired

`src/game/content.ts:38-47` fully supports a `terrain` override and `src/dev/tuning.ts:166`
*clears* it — but **nothing ever sets it** (verified: no `applyTerrainOverrides` exists;
the only `setContentOverrides` call passing terrain passes `null`). TunePanel shows
terrain as "read-only aggregates" (`TunePanel.tsx:136-164`).

**Consequence:** tile yields and building slots — the Phase 2 "land repriced" core knob —
cannot be hot-tested. The plumbing exists; only the setter is missing.

### 2.3 — `TableInsuranceOption.modifier` is dead data

`src/game/data.ts:130-132` declares `modifier: 1` on all three riot-insurance options.
Nothing reads it. `src/game/riot.ts:110` re-derives the bonus by counting array length
(`pending.boughtInsurance.length + …`), and `RiotModal.tsx:36` independently recomputes
the same expression.

**Consequence:** setting `modifier: 2` in data silently no-ops. Three encodings of one
number, and the authoritative-looking one is inert.

**Fix:** have `riot.ts` sum `option.modifier`; have `RiotModal` call a shared helper.

### 2.4 — Board radius `3` written twice with different meanings

`src/game/map.ts:8` calls `axialRadius(3)` to build the board; `map.ts:43` tests
`=== 3` to identify the coastal ring.

**Consequence:** changing board size in one place makes *every* tile non-coastal (or all
of them), silently breaking coastal leapfrog (`settlement.ts:149`) and the founding-voyage
rule. **Fix:** `export const BOARD_RADIUS = 3`.

### 2.5 — Panel width `360` duplicated into the camera

`src/styles/base.css:252` defines `--panel-w: calc(360px * var(--ui-scale))`;
`src/components/board/map/useMapCamera.ts:99` hardcodes the same base:
`PANEL_CLEAR_PULL_PX * (leftCard / 360 || 1)`.

Notable because commit `427d066`'s stated goal was to measure the tokens live "with no
second source of truth" — this literal is that second source. Widen the cards and the
pull silently mis-scales.

### 2.6 — Lower priority

- **Happiness icon thresholds shadow ruleset thresholds.** `Sprites.tsx:112` (`<= -10`)
  coincides with `unrest.severeThreshold` (`ruleset.ts:185`); `Sprites.tsx:124` (`>= 10`)
  coincides with `victory.minimums.happiness` (`ruleset.ts:168`). Cosmetic, but the icon
  currently means something by coincidence, not construction.
- **Venture stakes duplicated into a log string.** `ventures.ts:56` hardcodes
  `"5 gold"`/`"8 wood"` against `data.ts:191-192`. Cost is paid correctly from
  `status.cost`; only the log drifts.
- **Surviving `= DEFAULT_RULESET` defaults** at `settlement.ts:14,19,35,57,67` and
  `cost.ts:39`. Verified: **every production caller passes one explicitly**, so nothing
  is broken today — but this is the exact footgun `income.ts:39-44` documents having been
  bitten by once. Make them required to close it permanently.
- **Inline placement knobs:** `settlement.ts:140` (`>= 2`, max colonies per tile) and
  `settlement.ts:85` (`> 1`, city min spacing) belong in `ruleset.placement`.
- **`base.css:22`** — `clamp(0.82, calc(0.82 + (100vw - 1024px) * 0.18 / 416px), 1)`
  couples four magics (`0.18 = 1 − 0.82`, `416 = 1440 − 1024`). Editing the floor
  silently requires editing the slope.

### 2.7 — TunePanel gaps (knobs that exist but aren't reachable)

1. **Event tables — the biggest gap.** `RIOT_TABLE` (`data.ts:104`), `EXPEDITION_TABLES`
   (`:139`), `OMEN_TABLE` (`:199`) are entirely absent: riot pop-loss counts, insurance
   costs, every expedition payout. This is the whole riot-and-venture *risk surface*, and
   the code's own comments call the omen numbers "PROVISIONAL … await the user's eyes" —
   with no way to move them without a source edit.
2. **Terrain** — see §2.2.
3. **Granary grow-pop discount** — editable, accepted, ignored (§2.1).
4. **`bank.derivation`** renders read-only (`RulesetTree:276-283` renders strings as
   text), so the `uniform` vs `scarcity` A/B that `ruleset.ts:17` calls a live knob can't
   be flipped in the panel. Wants an enum/select field.
5. **`ruleset.setup` is invisible** — `RulesetTree:284` only recurses into non-array
   objects, so the setup sequence never renders.

### 2.8 — Correctly parameterized (the baseline to protect)

- `income.ts` drives the entire per-pop formula from `ruleset.popIncome` via `coeff()`
  (`:99`) — no coefficient inline. `bank.ts` has **zero** magic numbers.
- `unrest.ts`, `riot.ts`, `civic.ts`, `victory.ts`, `status.ts` read `G.ruleset` with no
  inline balance values.
- The UI reads it too: `rulebook.tsx:488-514` renders unrest/calm rules *from* `G.ruleset`
  rather than restating them.
- `preview.ts:281-295` explicitly refuses to reimplement income maths and diffs through
  the engine instead — the right instinct, documented.
- **The wheel-zoom tune (`6b92606`) was done correctly:** `WHEEL_ZOOM_STEP = 0.03`
  (`useMapCamera.ts:51`), named, with a comment explaining why it differs from `ZOOM_STEP`.
- `deriveRuleset`/`GAME_MODES` (`ruleset.ts:241-289`) express modes as *patches*, not
  restatements.

---

## 3. Dead code — ~525 lines

### 3.1 — Orphaned component

`src/components/board/command/DeckShelf.tsx` (66 lines) — **verified zero non-self
references** anywhere in `src/`. Superseded by `CommandDock.tsx:76`, which renders the
identical content. `docs/roadmap-appendix.md:132` still lists it as "needs a home". Its
CSS died with it (`src/styles/command.css:606-673`, 9 `.deckTray*` rules).

### 3.2 — Dead CSS: 51 classes, ~457 lines (8% of the stylesheet)

Measured dynamic-aware (excluding template-literal-constructed names such as
`resource-`, `terrain-`, `unrestBanner-`, `placement-`).

| File | Dead lines | % of file |
| --- | --- | --- |
| `ledger.css` | 156 | **23%** |
| `modals.css` | 158 | 11% |
| `command.css` | 58 | 8% |
| `tiles.css` | 21 | 9% |
| `shared.css` | 17 | 18% |
| `pops.css` | 15 | 6% |
| others | 32 | — |
| **total** | **~457** | **8%** |

Three generations of the Codex coexist in `modals.css`: `.compendiumCard*` (oldest),
`.codexCard*` (PR #28's painted deck faces, `modals.css:1132-1200`), both superseded by
`.codexCardGallery` (`:1354`) in PR #33. Also fully dead: `.chronicleDrawer*`
(`command.css:679-738`, replaced by the ConsultRail chronicle tab in PR #27),
`.turnClock*`, `.settlementPick*`.

### 3.3 — Dead exports (declared once, referenced nowhere)

- `src/components/board/helpers.ts:166` — `formatTileName()`. Note
  `docs/design/audits/components.md:108` **already ordered this deleted**; it survived.
- `src/components/board/helpers.ts:100` — `actionTitle()`
- `src/game/controller.ts:136` — `type HegemonyGame`
- `src/ui/formatters.ts:126` — `phaseHint()`
- `src/game/tables.ts:49` — `rollD6()`
- `src/dev/aggregates.ts:94` — `describeCost()`
- `src/sim/format.ts:24` — `formatPartialResources()`

### 3.4 — 31 unused imports, one root cause

The `useGameUi()` migration (PR #27) moved components off props but left the old prop
types imported. `HegemonyState`, `PlayerId`, `Phase`, `GameMoves` are imported-and-unused
across 8 files: `ledger/BuildingsTab.tsx`, `ledger/CitiesTab.tsx`, `ledger/MarketTab.tsx`,
`ledger/PopsTab.tsx`, `modals/CalmModal.tsx`, `modals/PendingPlayerEventModal.tsx`,
`modals/RiotModal.tsx`, `modals/VentureModal.tsx`.

Unrelated singles: `HegemonyBoard.tsx:37`, `board/events.ts:1`, `board/helpers.ts:1,15`,
`modals/FoundColonyPopover.tsx:21`, `modals/UpgradeCityModal.tsx:11`,
`game/economy/income.ts:13`.

---

## 4. Live bug — stale UI state survives `resetGame`

**Verified.** `resetGame` (`src/game/controller.ts:183`) is
`setG(createGameFromUrl())`. `src/App.tsx:10-18` renders `HegemonyBoard` with **no
`key`**, so the board does not remount. Two pieces of UI state are lazily initialized at
mount only and therefore survive into the new game:

- **`seenOmenYear`** (`HegemonyBoard.tsx:106`, `useState(() => G.yearOmen?.year ?? null)`).
  The omen gate is `G.yearOmen.year !== seenOmenYear` (`HegemonyBoard.tsx:610`), and
  `year` restarts at 1 every game. **After a TunePanel reset, the new game's omens are
  silently suppressed for every year number already seen.**
- **`gameOverDismissed`** (`HegemonyBoard.tsx:102`) — a second game's game-over modal is
  suppressed if the first was dismissed.

The irony is load-bearing: `controller.ts:182-183` comments that reset re-rolls the same
board "with new params (clean A/B)" — and stale UI state is exactly what corrupts that
A/B. Dev-path only, but it corrupts the tuning workflow TunePanel exists to serve.

**Fix:** a `key` on `HegemonyBoard` derived from a reset counter or `G.seed`.

---

## 5. Duplication

### 5.1 — Two hand-maintained term registries, no type link

The keyword work (`8e1650d`, `d33f919`, `47e499e`) created a second vocabulary list
beside the one the Codex already owned:

- `src/components/AnnotatedText.tsx:22-88` — `TOKEN_MAP`, 61 terms → click-target chapter
- `src/components/board/ledger/rulebook.tsx` — `keywords:` on all 12 chapters
  (`:146, :194, :240, :281, :320, :367, :399, :452, :481, :529, :577, :607`)

These encode **different** things (one click-target per term vs. many searchable terms per
chapter), so they are not redundant copies — see §8. The real defect is asymmetry and
lack of type safety:

- **11 terms are clickable but return zero Codex search hits** (empirically tested against
  the real haystack — `searchRulebook` at `CodexTab.tsx:55` substring-matches title +
  blurb + keywords + entry labels): `aqueducts, events, forums, granaries, gymnasions,
  marketplaces, odeons, riots, temples, villas, workshops`.
- **Adding a building silently gets neither.** `BUILDING_AFFINITY` and `Sprites.tsx` are
  typed `Record<BuildingId, …>` and *do* fail the build when a building is added; these
  two string lists don't.

**Fix:** derive plurals mechanically, and type at least `TOKEN_MAP`'s building/pop/resource
keys against their engine unions so a new `BuildingId` breaks the build.

### 5.2 — `game/core/format.ts` ‖ `ui/formatters.ts`

Two parallel formatting modules. There *is* a legitimate reason for two (engine emits
lowercase log prose, UI emits Title-Case labels) — but that justifies the casing, not the
arithmetic:

| Concept | Engine | UI | Verdict |
| --- | --- | --- | --- |
| number rounding/trim | `format.ts:47-51` | `formatters.ts:69-72` | identical expression |
| pluralization | `format.ts:15-25` (if-chain) | `formatters.ts:33-37` (table) | same 6 strings, two encodings |
| `capitalize` | `format.ts:43-45` | `helpers.ts:141-143` | **byte-identical**, plus a third inline copy at `AnnotatedText.tsx:147` |
| tile label | `format.ts:27-31` | `helpers.ts:166-170` | identical — and the UI copy is dead (§3.3) |

**Fix:** `format.ts` stays the numeric/pluralization core; `ui/formatters.ts` imports it
and wraps for casing.

### 5.3 — `FoundColonyPopover` never migrated onto `TilePopover`

`TilePopover`'s own docstring says it was *"generalised out of FoundColonyPopover"* — the
original was left behind. `FoundColonyPopover.tsx:23-28,63-95,114-137` (63 lines) and
`TilePopover.tsx:17-22,45-77,81-100` (59 lines) differ only in comment wording, deps
array, and parametrized labels. **It has already drifted:** `FoundColonyPopover.tsx:116`
hardcodes `anchor.bottom + 12` where `TilePopover.tsx:83` uses `POPOVER_GAP`, so changing
the gap now moves four popovers and not the fifth.

### 5.4 — Popover scaffolding (~90 lines across 6 files)

Cancel + confirm footer, ~13 lines × 6 sites (`BuildPopover.tsx:79-92`,
`GrowPopPopover.tsx:83-96`, `LadderPopover.tsx:68-81`, `MovePopsPopover.tsx:46-58` and
`:110-123`, `FoundColonyPopover.tsx:185-201`; a 7th near-copy at
`PlacementModalShell.tsx:42-54`). The disabled expression
`!status.can || !isActive || phase !== "gameplay"` is restated at 4 of them.
Choice grid, ~19 lines × 3 sites. → `<PopoverActions>` + `<ChoiceGrid>`.

### 5.5 — Minor

- `ConsultPanel.tsx:32-46` ‖ `EmpireIntelPanel.tsx:71-79` — identical panel header
  (15 lines × 2). → `<LedgerPanelHeader>`.
- `VentureModal.tsx:82-84` hand-rolls resource-cost formatting instead of calling
  `formatResourceCost`.
- `sim/policies.ts:189-199` ‖ `:227-235` — the income-projection preamble, ~8 identical
  lines. The three bots are otherwise **well** separated (shared `onePlyLookahead`,
  scorer-only divergence). Not urgent.

---

## 6. Architecture

### 6.1 — `src/game/controller.ts` is a React module in the pure-engine directory

The single real breach of the stated invariant. `controller.ts:1-2` imports React hooks;
`:172` exports `useHegemonyGame()`; `:56` reads `window.location.search`; `:97-98`
reads/writes `localStorage`; `:42` imports *outward* from `../dev/tuning`.

**Mitigating:** it contains **no game logic**. Every move is a thin `setG(produce(...))`
wrapper around an engine mutator (`:206-271`). This is a **move, not a rewrite** →
`src/app/useHegemonyGame.ts`. One blocker: the type re-export at `:44`
(`export type { Phase }`) is imported *through* by four UI modules
(e.g. `ui/formatters.ts:4`, `board/helpers.ts:2`) — re-point those at `game/types` first.

### 6.2 — Mixed-concern files

- **`src/sim/cli.ts` (775)** — genuinely mixed: arg parsing (`53-243`), command bodies
  (`244-593`), batch orchestration (`599-739`, `cmdBatch` alone ~140 lines).
  → `sim/cli/args.ts`, `sim/cli/commands.ts`, `sim/batch.ts`. Highest-value split.
- **`src/components/HegemonyBoard.tsx` (628)** — a god *router*, not a god *model*: it
  owns zero game logic, but holds **11 `useState`** (`:99,100,101,102,104,106,111,112,116,117,121`),
  the modal router, both rail routers, the keyboard handler (`:239-256`), and a ~95-line
  inline IIFE popover router (`:487-582`). → extract `SelectionPopoverRouter.tsx` and a
  `useRailRoutes` hook; removes ~150 lines.
- **`src/sim/telemetry.ts` (539)** — snapshot capture + percentile stats + aggregator +
  report shape + CSV. → `telemetry/{stats,csv,report}.ts`.
- **Justified, do not split:** `game/data.ts` (918 — 60% is the two event decks; cohesive
  content), `ledger/rulebook.tsx` (669 — it is a book), `game/legalMoves.ts` (576),
  `economy/income.ts` (400).

### 6.3 — Test coverage gaps

The premise that recent work landed untested is **mostly wrong** — `bank.test.ts`,
`civic.test.ts`, `riot.test.ts`, `phase2.test.ts` all exist, and `policies.test.ts:39-64`
covers the beam bot with determinism *and* an anti-peek assertion that it consumes no game
RNG. Better discipline than the PR velocity suggested. Real gaps, ranked:

1. **`src/game/status.ts` (226, 5 exported validators) — no dedicated test.** This is the
   legality authority the entire UI glow and every bot depends on. **`getMovePopsStatus`
   has 8 call sites and 0 test references** (verified). Highest-value gap.
2. **`events.ts` `applyEventEffects` (`:158-265`, 26 `effect.type` branches)** — no direct
   test; `deck.test.ts` covers it only obliquely. Branch coverage unknown.
3. **`economy/cost.ts` (147)** — no test, despite owning seasonal multipliers and the
   event-discount subsystem.
4. Zero test references: `previewBuildBuilding`, `getFoodShortageStatus` (`income.ts:220`),
   `getEventEffectChoices` (`events.ts:84`).
5. Untested small modules: `ventures.ts` (60), `score.ts` (44), `season.ts` (64).

`actions.ts`/`income.ts` have no same-name test but are well covered indirectly — leave them.

### 6.4 — Healthy, verified

- **No other invariant violation.** `src/game/` imports nothing from `components/`/`ui/`;
  `src/sim/` imports no React. **The UI does not recompute engine formulas** — every
  legality question routes to an engine status function
  (`useMapSelection.ts:80,85,101,108`; `HegemonyBoard.tsx:153-178`); `VictoryTab.tsx:2,12`
  reads `victoryStandings` with a comment stating why; component arithmetic is all layout
  or string formatting. `board/helpers.ts:37-84` documents that its hand-rolled estimators
  were deleted in R7 and now delegate to `previewBuildBuilding`.
- **One `useState<HegemonyState>`** (`controller.ts:174`). All mutation via immer
  `produce` with commit-on-success, so a rejected move returns the previous reference and
  fires no re-render. `HegemonyBoard.tsx:76-83` carries an explicit comment that
  engine-driven dialogs "must not be modelled as UI intent" — the author designed against
  this desync class.
- **`src/ui/` is coherent, not a junk drawer** — four files, one job each, all React-free
  except a type-only `CSSProperties`. `hexGeometry.ts:1-8` documents being extracted so
  geometry could be proven without rendering; it has a 226-line test.
- **`core/` → `economy/` → flat layering is real and documented** (`rules.ts:1-27`).
- **Circular imports: 3, all benign** — every cycle closes through an erased `import type`
  edge. No runtime cycle. Not worth acting on.
- **`ResourceChips`, `DiscRail`, `ModalShell`, `VERBS`-as-data** are properly factored and
  holding.

---

## 7. Ordered remediation — the Phase 2.5 contents

Sequenced by risk-removed-per-unit-effort. Items 1–4 are mechanical, with `tsc` + 217
tests as the safety net.

| # | Item | Why now | Size |
| --- | --- | --- | --- |
| 1 | `cost.ts`/`preview.ts` → `getBuildings()` (§2.1) | The tuning panel currently lies about Granary edits | 2 lines |
| 2 | `key` on `HegemonyBoard` (§4) | Live bug corrupting the A/B tuning loop | 1 line |
| 3 | `BOARD_RADIUS` constant (§2.4) | Pre-empts a silent, total break of coastal rules | small |
| 4 | Sweep debris: `DeckShelf`, 51 CSS classes, 31 imports, 7 dead exports (§3) | ~525 lines; makes the next diff readable | mechanical |
| 5 | `status.ts` test suite (§6.3) | Most load-bearing untested engine module; **Phase 3 will lean on it hard** | medium |
| 6 | Wire the terrain override + event tables into TunePanel (§2.2, §2.7) | Phase 2's core knobs aren't hot-testable | medium |
| 7 | Move `controller.ts` → `src/app/` (§6.1) | Restores the stated invariant; a move, not a rewrite | medium |
| 8 | `riot.ts` reads `option.modifier` (§2.3) | Removes an inert-but-inviting data field | small |
| 9 | Unify `format.ts`/`formatters.ts` (§5.2); `FoundColonyPopover` → `TilePopover` (§5.3) | Already drifted once each | medium |
| 10 | `PopoverActions` + `ChoiceGrid` + `LedgerPanelHeader` (§5.4, §5.5) | Volume, not risk — do last | medium |

Deliberately **not** scheduled: `sim/cli.ts` and `telemetry.ts` splits (§6.2) — real, but
they touch no Phase 3 surface and the sim is not on the critical path.

---

## 8. Claims that did not survive verification

Recorded so they don't get re-derived.

- **"40 disagreements between `TOKEN_MAP` and rulebook keywords."** False, twice-generated
  (once by a naive script of my own, once by an auditor). The two structures encode
  different things — click-target vs. search-terms — and a term legitimately appearing in
  several chapters' search is a *feature*. The four flagged as outright conflicts
  (`cards`, `citizen`, `freeman`, `slave`) are defensible design calls, not bugs.
- **"21 terms clickable but unsearchable."** Overstated. Empirically **11**; the rest are
  rescued by substring matching against chapter blurbs and entry labels.
- **"Recent work landed untested."** Wrong — see §6.3.
- **"Duplicate constant tables."** Checked and negative: `RESOURCE_ORDER`,
  `EMPTY_RESOURCES`, `RESOURCE_LABELS`, `POP_TYPES`, `SETTLEMENT_SORT` are each declared
  exactly once.
- **"Props passed but unused / state set but never read."** None found; `tsc`'s
  excess-property checking would have caught the former, and it is clean.

**Stale-document caveat:** `docs/design/audits/components.md` references
`ActionCommandPanel.tsx` and `PopulationModals.tsx`, neither of which still exists. Do not
trust that file's inventory; its *verdicts* (e.g. the `formatTileName` deletion order at
`:108`) remain valid.
