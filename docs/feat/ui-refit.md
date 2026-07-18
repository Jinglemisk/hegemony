# Phase 1.5 — the interface refit · build plan

> The appendix (`docs/roadmap-appendix.md:68`) says: *"Gets `docs/feat/ui-refit.md`
> once Q17–Q19 are answered; build follows that plan."* That document was never
> written — the first refit attempt went from prose Q&A straight to code and drifted
> from the showcase. This is that plan, written late (2026-07-17) and grounded in the
> layout the owner actually ratified.

## Cold-start — how to execute this from a fresh session

This document is self-contained: a session with no memory of the design
conversation can execute it. Do this, in order:

1. **Read the two references.** `docs/design/showcases/DECIDED-UI-LAYOUT.html` — the
   ratified layout mock, codename KYKLOS, **mode A** (ignore the A/B/C toggle; A is
   the target). And `docs/design/showcases/hegemony-target-mock.html` — a rough but
   faithful render of *our* target screen with the reconciliations already applied
   (open it in a browser; toggle "Annotate reconciliations" to see every place we
   chose our answer over KYKLOS). These two are the picture; the sections below are
   the spec.
2. **The layout is ratified — do not re-open it.** Owner selected KYKLOS mode A,
   as-drawn (glass/shadow chrome approved), 2026-07-17. No new design deliberation
   (D13). If something is genuinely ambiguous, ask; do not invent a new layout.
3. **Build in the step order** (§"One PR"). Steps are commits on `feat/ui-refit`, not
   separate PRs. The map/camera is Step 1 because everything sits on it.
4. **Use the element-migration map** (§"nothing drops") as the checklist: every
   current surface has a named destination and format. When a step is done, every row
   it owns must be accounted for.
5. **Verify per the protocol** (§"Verification"). The R6 lesson is load-bearing: DOM
   assertions passed while the map was silently transposed — **screenshot anything
   visual** and diff it against the mock.

## The contract

The layout is **`docs/design/showcases/DECIDED-UI-LAYOUT.html`** — codename **KYKLOS,
"The Circle Command"** — in its **Mode A · Spines** arm (the file's boot default;
owner-selected 2026-07-17). The A/B/C toggle in that file is a design scratchpad, not
a shipping feature: we build A and delete the toggle from our mental model. B and C
(elliptical "domes") are **out of scope**.

KYKLOS supersedes the earlier `katalogos-stylized.html` mock, which was a
docked-column design. Do not audit against Katalogos anymore.

### The three laws (from KYKLOS's own notes)

1. **The circle law.** Discs are things you *press, repeatedly* — verbs and menu
   tabs. The **one square** is End Turn: the commit shape, so it can never be misfired
   for a verb. (It is the only square *control* — building-slot chits and card
   thumbnails are square too, but they are read-outs, not buttons.)
2. **Discs thread on an edge, ~3/5 out over the sea.** The rails are thin backing
   spines (rail 30px, top 48px, bottom 64px); the discs sit on the spine's edge and
   overhang the water. A rail is a strip, never a container.
3. **The sea is the one dark value.** The map/sea is the only dark field; chrome and
   the text on the sea (season line, whose-turn) read light — ivory with a
   text-shadow. Dark ink concentrates in the ceremony register: tooltips and key-hint
   chips in the black glaze (`--vase`), and the End Turn commit as the one dark-**red**
   mass (`--clay-deep`, *not* `--vase` — the mock's own note over-states this; the CSS
   at `DECIDED-UI-LAYOUT.html:268` is the truth).

**Surface treatment — owner ruling (2026-07-17): ship KYKLOS as drawn.** Shown a
true-scale replica (glass-blur spines + floating rounded, shadowed ivory cards) against
a flattened alternative, the owner chose *as drawn*: "frankly i like the as-drawn
version more." So this PR builds the KYKLOS chrome with its own treatment — bone-glass
`backdrop-filter: blur(9px)` spines, `border-radius:12px` + `box-shadow: var(--float)`
floating cards — **not** a flat placeholder. This refines (does not delete) the flat-UI
preference (`memory: hegemony-flat-ui-preference`): the objection was always to *nested
content boxes*, and that still holds — the ledger content **inside** a card stays flat
(hairline rules, clay left-accents, no boxed rows), exactly as KYKLOS's own panel body
already is. The floating card is an approved surface; its contents are not little
boxes. This also answers the Q36 element-3 "Katalogos chrome" wince-check for the
*chrome treatment*; the rest of the reskin (polychrome board, stylized icons) remains a
later pass.

## Authority split — who wins when KYKLOS and the Q-answers disagree

Synthesised from the owner's two dated rulings (the 2026-07-17 Q17/Q19 appendix
annotations): **KYKLOS is authoritative on *arrangement* (where chrome sits, what shape
it is, how the canvas fills the screen). The ratified Q-answers remain authoritative on
*where information lives*.** Reconciliations:

| Question | KYKLOS shows | Ratified answer | We ship |
|---|---|---|---|
| Q17 verb bar | verbs centre-bottom, End Turn square bottom-right | "bottom bar for sure" | **agree** — verbs on the bottom spine, End Turn square. Resources move to the **top**, split around the season medallion (KYKLOS's arrangement; the Q17 "fused band" is dropped). |
| Q19 deck counts | inside the Codex panel | **top bar** beside the season dial | **Q-answer wins** — decks stay in the top bar. |
| Q19 chronicle ticker | none | one-line ticker in the bottom bar | **Q-answer wins** — the newest line still tickers at bottom-left (End Turn owns bottom-right). |
| Q19 chronicle shape | floating card + disc tab, closed-collapses | collapsible drawer, closed by default | **KYKLOS arrangement** — a floating ivory card that collapses to a disc tab with an unread count; still closed-by-default (Q-answer's behaviour survives, the drawer *shape* does not). |

Q18 (compendium): contents unchanged, but its *entry point* moves — KYKLOS makes it
the **Codex** rail disc (arrangement, so KYKLOS wins). The ratified `?`-key shortcut
and Escape-to-close survive; the season-dial entry is replaced by the disc.

## Non-goals (owner, 2026-07-17)

- **The map tiles are not redesigned.** Terrain art, chit, settlement seals, pop beads
  stay as they are. (A post-refit PR may revisit; not now.) KYKLOS's div+clip-path
  hexes are a prototype shortcut — we keep our SVG map.
- **The ledger *substance* is not rewritten.** Pops, resource deltas, availability,
  levels, the pop×building affinity grid, per-building benefit preview, and
  per-settlement expand/collapse are all **kept**. The tabs move into the floating
  panel with their contents intact.
- **The Build verb is additive, and net-new.** It is the one verb KYKLOS carries that
  our array lacks; building it (Step 3) *adds* a map-first door — settlements glow →
  click → popover picks the building — without deleting the Cities / Buildings build
  affordances. No picker is removed by this refit.

## What survives from the current build

Intact, no rework: `GameUiContext`, `ModalShell`, `ResourceChips`, `hexGeometry`,
`economy/preview.ts`, and the scope-3 map-first popovers (Grow / Move / Found /
ladder). All five tab **contents**. The compendium. Of the R3 `VERBS` data array,
**six** verbs (grow / move / found / upgrade / calm / venture) port 1:1 with their cost
sublabels — but KYKLOS lists **seven**, and the seventh, **Build**, is net-new (our
`VerbId` union has no `"build"`). Adding it is Step 3 work: a `VerbId` + `VERBS` entry,
a `VerbHandlers`/`VerbContext` field, a new `mapSelection` mode, and the `armSelection`
wiring in `HegemonyBoard.tsx`.

Retired or reshaped: `.workbench` / `.mapColumn` grid (the map stops being a grid
cell), `.mapFrame` border, `.intelTabs` (→ the disc rail), the fused `CommandBar`
(splits three ways: verbs → bottom spine, resources → top, End Turn → square). Their
responsive rules in `src/styles/responsive.css` (`.workbench`, `.commandBar*`,
`.panel`) are rewritten in the same step, not left orphaned.

## One PR, built in a safe internal order

Owner ruling (2026-07-17): **the whole layout refit ships as one PR** on
`feat/ui-refit`. The steps below are *commit order within that one branch*, sequenced
to keep the tree green and the game playable at every commit — they are **not**
separate PRs, and the branch is not opened for review until all three are together
coherent. (This sits fine with Q21's "one PR per phase"; the one wrinkle is that
carving the reskin out — below — makes Phase 1.5 land as two PRs, layout then skin,
which is exactly what the D13 split intends.)

- **Step 0 · reconcile (this doc).** This plan + the Q17/Q19 appendix annotations.
  Already on the branch.
- **Step 1 · full-bleed stage + camera live-area.** The map SVG fills the viewport;
  sea becomes the page field. `useMapCamera` learns the KYKLOS `live()` rectangle (the
  area *not* under chrome) and clamps/reseats the board so it never hides beneath a
  panel. Existing chrome keeps its homes but floats over the sea. Done first because
  the camera is the only new mechanism and everything else sits on top of it.
- **Step 2 · left rail + floating ledger panel.** 30px spine + 6 menu discs
  (Cities · Pops · Build · Market · Victory · Codex). Each opens the floating `.panel`
  card carrying the **existing** tab contents, unchanged. Delete `.intelTabs`. Panel
  closable, boots to Cities.
- **Step 3 · bottom verb spine + End Turn square + top resource split.** 7 verb discs
  on the bottom spine (Build arms the map); End Turn as the dark-red square
  bottom-right; resources split left/right around the season medallion up top; the
  chronicle newest line tickers bottom-left. Retires the fused `CommandBar`.

The PR lands when steps 1–3 are together coherent and the suite (183+ tests) is green.

**Out of this PR — the reskin (Q36 keep ×5)** stays a separate follow-up: it can only
begin once this layout lands, and it needs the owner wince-check on the ceremony
chrome against the *correct* layout. Folding a taste review into a structural PR is
what the D13 split exists to prevent.

**Explicitly not in scope:** converting the panels to read-only "report" grammar or
deleting any build picker. The owner is content with the ledger substance.

**On landing (doc-maintenance, `memory: hegemony-doc-maintenance`):** strike the refit
items in root `todo.md`, and refresh `rules.md` only if a player-facing interaction
wording actually changed. No `v0.1-rules-spec` change — this PR touches no rules.

## The camera — the one hard part

An earlier draft of this section framed the port as "SVG viewBox vs KYKLOS's CSS
transform"; the audit corrected it. Our camera is **already** a transform-on-a-
static-world-layer — the same family as KYKLOS. `HexMap.tsx:120` fixes the `<svg>`
viewBox (`BASE_VIEW_BOX`) and `useMapCamera.ts:103` writes a `matrix()` transform onto
an inner `<g>` (documented at `hexGeometry.ts:151`). So the coordinate *mechanism* is
compatible; the "bordered frame" half is `.mapFrame`, which we drop.

The real work is the **clamp domain**. Today `clampViewBox` (`hexGeometry.ts:183`)
clamps in world/viewBox units against a fixed `WORLD_VIEW_BOX` (board + ~5% sea
margin) — blind to viewport size and to chrome. KYKLOS's `live()` / `clamp()` clamp the
board *centre* in **screen pixels** against `SW/SH` minus the chrome rectangles.
Porting is therefore not "teach it a rectangle" — it is making the clamp viewport- and
chrome-aware: convert the `live()` screen rect into world coordinates each layout
(needs the live `svg.getBoundingClientRect()` and the `preserveAspectRatio="… slice"`
scale from `HexMap.tsx:123`), or rewrite `clampViewBox` to take the live-area. The
reference is the **mode-A** branch only — `live()`'s straight-edge case
(`DECIDED-UI-LAYOUT.html:678`, `railEdge = RAIL + BUB_OUT`) and the rectangular
`clamp()`; the `pushOut` / ellipse code around `693-720` is B/C dome math and out of
scope.

Two consequences to plan for: **(1)** `hexGeometry.test.ts`'s clamp assertions are
written against `WORLD_VIEW_BOX` and will change with the port (or keep the
world-bound clamp and layer the live-area on top). **(2)** Step 1's `live()` depends on
the *final* chrome dimensions (rail, verb spine, panel) that don't exist until
Steps 2–3, so the interim camera clamps against provisional geometry and is re-tuned
once the chrome lands.

## The element-migration map — nothing drops

Every surface the current UI renders, its destination, and what changes. This is the
completeness checklist: at the end of the PR every row must be accounted for. Current
homes are in `src/components/HegemonyBoard.tsx` (the shell) and its children;
class names are the reskin/CSS hooks. **Contents are preserved unless "format" says
otherwise** — this is a re-home, not a rewrite (owner: keep ledger substance).

| Element | Was — component / class | Now — home | Format change |
|---|---|---|---|
| **Resources** (6) | `CommandBar` → `.commandBarResources` (`ResourceGrid`) | **Top bar, split** around the season medallion — `resL` = wood/stone/food, `resR` = gold/influence/happiness | one flat group → two; icon + value + delta kept; income-breakdown tooltip kept |
| **Verbs** | `CommandBar` → `.commandBarVerbs` (6 from `VERBS`) | **Bottom verb spine**, 7 discs centred | pills → round discs; label + cost sublabel + kbd hint; armed = clay; **Build added (7th, net-new)** |
| **End Turn** | `CommandBar` → `.commandBarEnd` | **Bottom-right, the one dark-red SQUARE** | pill → 76px square, `--clay-deep` |
| **Chronicle ticker** | `CommandBar` → `.commandBarTicker` | **Bottom-left**, on the sea, left of the verbs | one-line, light-on-sea text |
| **Ledger tabs** (Cities/Build/Pops/Market/Victory) | `EmpireIntelPanel` → `.intelTabs` (horizontal 5-up) | **Left 30px disc rail**, 6 discs: Cities · Pops · Build · Market · Victory · **Codex** | horizontal text tabs → vertical icon discs; count badges on Pops/Victory |
| **Ledger bodies** (the 5 tab contents) | `.intelBody` inside the left `.panel` grid cell | **Floating `.panel` card** (ivory, rounded, shadowed — as-drawn), boots to Cities, closable | contents verbatim (affinity grid, benefit preview, expand/collapse all kept) |
| **Compendium** | opened by `SeasonStatus`'s `.seasonDialButton` | **Codex disc** (6th rail disc) + `?` key | entry point moves; contents unchanged; season-dial entry removed |
| **Deck counts** (`DeckShelf`) | `SeasonStatus` → `.deckTray` | **Beside the season dial** — a caption in the season cluster | compact "Seasonal N/M · Events N/M", light-on-sea |
| **Season clock** (year, seasons-left, dial) | `SeasonStatus` → `.turnClock` / `SeasonDial` | **Top-centre**: season medallion + "Spring · Year N / N seasons remain" hanging on the sea | medallion disc; text light-on-sea |
| **Whose-turn** (`turnActor`) | `SeasonStatus` → `.turnActor` | **Bottom-right, above End Turn** ("Your turn / Name") on the sea | moved off the top bar; the roster's acting-underline already names the actor, so this becomes a commit-side reinforcement |
| **Event cards** (`TopbarEvents`) | top bar left → `.topbarEvents` | **Top bar left** (after the rail) | unchanged |
| **Player roster** (`PlayerScoreboard`) | top bar right → `.scoreboardPanel` | **Top bar right** | unchanged; acting seat keeps its underline |
| **Map** (`HexMap`) | `.mapColumn` → `.mapFrame` grid cell | **Full-bleed stage background** (sea + world layer) | frame/border removed; fills viewport; camera learns the live-area |
| **Zoom control** | in the map column | **Bottom-left**, on the sea | unchanged |
| **Map-first popovers** (Found/Grow/Move/Ladder) | anchored over the map (`TilePopover`) | **unchanged** — anchored over the full-bleed map | none |
| **Build picker** | Cities/Buildings tab chips (kept) | **+ new**: Build verb arms the map → `BuildPopover` picks the building | additive; the panel chips stay |
| **Blocking modals** (calm, venture, upgradeCity, populationPrompt, compendium) | `ModalShell` overlay | **unchanged** — still block, still centre-screen | none (Q15: these defer income / are deliberate) |
| **Event modals** (riot, pendingPlayerEvent, gameOver) | `ModalShell` overlay | **unchanged** | none |
| **Setup / placement captions** | `.mapSetupCaption` over the map | **unchanged** | none |
| Board/seed chip (`DeckShelf` `.deckTrayBoard`) | `.turnClock` | with the deck caption (or Codex) | minor; keep the identifier visible somewhere top-of-screen |

If a future element isn't in this table, it hasn't been placed — add a row before
building it.

## Per-step file plan

Concrete create / edit / delete per step. File paths are current as of 2026-07-17;
confirm before editing. Reuse KYKLOS's values (`DECIDED-UI-LAYOUT.html`): rail 30px,
top 48px, bottom 64px, disc 46px (menu) / 54px (verb), End Turn 76px square, panel
308–314px, `--glass` bone, `--float` shadow.

**Step 1 · full-bleed stage + camera live-area**
- Edit `src/styles/base.css` — `.shell` becomes a full-bleed stage; sea background
  (KYKLOS `radial-gradient(... #2e8a9a → #206e7c → #17505c)`); drop the `.mapFrame`
  border; `.workbench`/`.mapColumn` stop being a grid that boxes the map. Chrome keeps
  its current homes but floats over the sea for this step.
- Edit `src/components/board/map/HexMap.tsx` — SVG fills the stage; remove the frame.
- Edit `src/components/board/map/useMapCamera.ts` + `src/ui/hexGeometry.ts` — teach the
  clamp the live-area (see §"The camera"); `clampViewBox` at `hexGeometry.ts:183`.
- Edit `src/ui/hexGeometry.test.ts` — update clamp assertions to the live-area model.

**Step 2 · left rail + floating ledger panel**
- Edit `src/components/board/ledger/EmpireIntelPanel.tsx` — `.intelTabs` horizontal →
  vertical 30px disc rail with 6 discs (add **Codex**); wrap `.intelBody` in a floating
  `.panel` card; add open/close + boots-to-Cities.
- Edit `src/styles/intel.css` — `.intelTabs` → rail discs; add the floating panel card
  (rounded + `--float` shadow, as-drawn).
- Edit `src/components/HegemonyBoard.tsx` — panel is no longer a `.workbench` grid cell;
  it floats. Wire the Codex disc to the compendium; keep the `?` key.
- Edit `src/components/board/topbar/SeasonStatus.tsx` — season dial no longer opens the
  compendium (Codex disc does); move `DeckShelf` counts into the season caption; drop
  `turnActor` from here (moves to the bottom-right turnbox in Step 3).
- Delete: `.intelTabs` horizontal styles once the rail replaces them.

**Step 3 · bottom verb spine + End Turn square + top resource split**
- Edit `src/components/board/command/verbs.tsx` — add the **Build** verb: `VerbId`
  `"build"`, a `VERBS` entry, `VerbHandlers.onBuildRequest`, `VerbContext.canBuild`.
- Edit `src/components/board/map/mapSelection.ts` + `useMapSelection.ts` — add a
  `"build"` selection mode (candidates = settlements that can build).
- New `src/components/board/map/BuildPopover.tsx` — the map-first building picker
  (mirror `GrowPopPopover`; reuse the affinity + benefit-preview logic from the tabs).
- Replace `CommandBar` with three placed pieces (new files, or restructure in place):
  the bottom **verb spine** (7 discs), the **End Turn square** (bottom-right), the
  **top resource split** (resL/resR around the medallion), plus the **ticker**
  (bottom-left) and the **whose-turn** turnbox (bottom-right, above End Turn).
- Edit `src/styles/command.css` + `src/styles/responsive.css` — retire `.commandBar*`;
  add spine / square / split / ticker / turnbox classes.
- Edit `src/components/HegemonyBoard.tsx` — wire `onBuildRequest → armSelection({kind:
  "build"})`; render the new pieces instead of `CommandBar`.

## Verification protocol

Run at **every commit**, not just at the end:

1. **Tests green.** `npx vitest run` — currently exactly **183 passing, 21 files**. The
   number may rise (new camera/rail tests) but must never regress or go red.
2. **Screenshot the visual.** Serve (`python3 -m http.server` in the build output, or
   the dev server) and screenshot with Playwright, then compare against
   `docs/design/showcases/hegemony-target-mock.html`. **This is mandatory for anything
   that moves pixels** — the R6 regression passed every DOM assertion (37 tiles, 42
   edges) while rendering the map transposed and overlapping. DOM presence ≠ correct
   layout. Diff the picture.
3. **Game still playable.** Each step keeps a fully playable build — grow, move, found,
   build, calm, venture, end turn all reachable; no dialog covers the board during a
   map-first selection (selection rule 1).
4. **Type-check / lint** clean.

## Visual references

- **In-repo, durable:** `docs/design/showcases/DECIDED-UI-LAYOUT.html` (KYKLOS, mode A
  = target) and `docs/design/showcases/hegemony-target-mock.html` (our reconciled
  target, with an annotate toggle).
- **Hosted (owner convenience, may expire):** target mock
  `https://claude.ai/code/artifact/848d49e0-9a22-4112-aab4-496929fd4972` · chrome
  inspector `https://claude.ai/code/artifact/6d4741fb-3f0d-412a-a62e-ef384e164dcd`.
