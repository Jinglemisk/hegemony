---
status: active
phase: "UI overhaul (ui-overhaul worktree)"
updated: 2026-08-15
---

# The Lacquered Board — UI overhaul work plan

Read `THIS-WORKTREE.md` at the repo root first: it defines the branch rules, the
autonomous one-pass run loop, and the owner-ratified run policies (SVG-only icons;
work clean / future-proof — refactor rather than patch, engine-touching commits
prefixed `engine:`; push per phase; leave-red-and-continue when stuck; never wait
for the owner).

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                      |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Partly   | Presentation-only additions, always additive and `engine:`-prefixed: `IncomeContribution.settlementId`, `LogEntry.about`, `Politician.tendency`. No rule, cost, legality or balance change; the full suite stays green |
| Frontend         | Yes      | Every surface: tokens, type roles, the icon registry's totality, the board's grammar, seven panels, the ceremony register, the Assembly scenes                                                                         |
| Simulation & AI  | No       | The sim reads engine state and never renders; nothing here changes what it observes, values or logs                                                                                                                    |

The engine-side additions carry data the frontend needs and the rules never read.
Each is justified at its definition site and listed in `RUN-LOG.md`.

## Outcome

The shipped frontend reproduces the six prototype scenes and seven panel rebuilds in
`docs/plans/ui-overhaul-prototypes/` (pixel-faithful in structure, not necessarily to
the pixel), with every visual decision driven by tokens, zero metatext in persistent
chrome, and a dedicated icon for every typed effect. The rules engine is untouched.

Reference pitch with before/after screenshots:
https://claude.ai/code/artifact/e9b9fc1d-4d72-4ea6-a03f-22327529b3cd

## Non-goals

- No new mechanics, no rule changes, no balance changes — ever. Engine-side
  _presentation_ refactors (structured log entries, a settlement-name field) are
  allowed under the work-clean policy in `THIS-WORKTREE.md`, always additive,
  always `engine:`-prefixed, with parity/scenario suites kept meaningful.
- No responsive/mobile redesign beyond keeping the existing `--ui-scale` behavior
  working at 1280×800 and 1440×900.
- No new art commissioning for scenes — the existing card paintings, sea chart
  (`assets/map/aegean-sea-board.png`), season medallions, and mask pipeline cover
  everything except the new effect-icon batch (Phase 0b below).
- Codex content stays prose; it only inherits type roles and loses its lede.

## Settled inputs (owner-ratified, 2026-08-04 → 2026-08-15)

- Direction: Katalogos type discipline + Painted Table density ("the lacquered board").
- **Light chrome:** top/bottom bars are bone slip with a clay meander edge — never
  dark slabs. Vase-black is reserved for _objects_: the END TURN seal, dice, ostraka,
  tooltips.
- **Symmetry:** resource spine dead-center in the top bar (event slips left, roster
  right); verbs dead-center in the bottom rail; tab icons vertically centered in
  their rails.
- **Twin dials:** season clock protruding bottom-left (outer year-progress ring,
  inner rotating season wheel under a fixed needle at the top-right, year numeral in
  the hub) mirrored by a circular Greek-seal END TURN button bottom-right.
- Settlements get names (ARGOS, THERMON…) — coordinates retreat to tooltips.
- Politician stelae show "HIS LAWS TEND TO" + two example effects in icon grammar
  instead of italic creeds.
- Paradox-style **dedicated icon per effect** (owner request, 2026-08-15): every
  typed effect renders with its own glyph; enforced by parity test.
- Player glazes replace Tailwind primaries: Kyanos `#2f5d9e` Δ · Melichron `#dfa437`
  Ν · Porphyra `#7c4d79` Θ · Kinnabari `#a83226` Κ, each with a 1.5px ivory keyline
  and Greek-letter blazon.

## Design tokens (Phase 0 lands these in `src/styles/base.css`)

### Palette (keep existing Kerameikos hexes; add semantic status)

| Token                       | Value                 | Role                                         |
| --------------------------- | --------------------- | -------------------------------------------- |
| `--bone`                    | `#f4e6c8`             | bars, tablets (panel ground)                 |
| `--ivory`                   | `#fff8e7`             | cards, dial faces, figures on dark objects   |
| `--slip`                    | `#d8c8a8`             | tab rails, tracks                            |
| `--vase-black`              | `#181210`             | objects only: seal, dice, ostraka, tooltips  |
| `--ink` + 5-step alpha ramp | `#241910`             | text (ramp already exists)                   |
| `--clay` / `--clay-deep`    | `#c0461c` / `#8f2e13` | the one accent / pressed                     |
| **`--pos`**                 | `#5e6e3a`             | NEW — positive deltas/text only              |
| **`--neg`**                 | `#8f2e13`             | NEW — negative deltas/text only              |
| **`--warn`**                | `#b0702a`             | NEW — expiring, low, approaching riot        |
| `--aegean`                  | `#1f6977`             | politics register (Assembly/Agora only)      |
| `--p1..p4`                  | glazes above          | owner marks only (seals, rims, roster discs) |

Hard rule: owner color and status color never share a pixel class. Status color
appears only in text and signed deltas, always paired with a sign — never
color-alone.

### Type roles (nine; kill the 47 ad-hoc sizes)

| Role      | Face              | @1440      | Use                                     |
| --------- | ----------------- | ---------- | --------------------------------------- |
| `display` | Cinzel 700        | 24–34px    | rite titles, Assembly head, game over   |
| `title`   | Cinzel 700        | 15px       | panel headings                          |
| `verb`    | Cinzel 700        | 12–13px    | buttons, tabs, END TURN                 |
| `label`   | Cinzel 600        | 11px floor | THE micro-label (replaces ~12 variants) |
| `body`    | Alegreya 400      | 14–15px    | chronicle, card text                    |
| `body-em` | Alegreya 500 it.  | 14px       | flavor, quotes                          |
| `stat`    | Alegreya 600 tnum | 15px       | every inline number                     |
| `stat-lg` | Alegreya 800 tnum | 19–26px    | resource spine, die results, tallies    |
| `caption` | Alegreya 400      | 12.5px     | tooltips, timestamps                    |

Self-host Cinzel + Alegreya (woff2, OFL). Marcellus retires. The global
`button { font-family: var(--disp); font-weight: 700 }` at `base.css:98-117` dies —
that one rule is most of why the current UI shouts. `.num` utility =
`font-variant-numeric: tabular-nums lining-nums` on every stat cell.

Spacing: one 8px-grid scale (4/8/12/20/32) as tokens; sweep the 40+ ad-hoc padding
shorthands onto it opportunistically per phase (not as a big-bang).

## The audit facts that gate the work (verified 2026-08-04)

- 47 distinct font sizes across 237 declarations, half px / half rem; no type tokens.
- 96 of 106 `font-family` declarations use the display face.
- Zero `!important`; ~88 color tokens on `.shell` (`base.css:185-308`); icons are
  alpha masks tinted by `currentColor` (`shared.css:44-51`) — restyle-friendly.
- JS↔CSS couplings that MUST be extracted before touching bar/panel geometry:
  - `useMapCamera.ts:58` `CHROME_INSET_TB = { top: 96, bottom: 100 }` tracks
    `--chrome-top`/`--chrome-bot` by hand.
  - `useMapCamera.ts:99` hardcodes the literal `360` = `--panel-w`'s value.
  - `useMapCamera.ts:70-107` resolves tokens with a DOM probe that must live inside
    `.shell` — tokens are on `.shell`, not `:root`. Moving tokens to `:root` is the
    fix, but verify the probe first.
  - `base.css:286-289` `--chrome-top: calc(73px * var(--ui-scale))` is "kept in sync
    by the topbar's own height — measure before changing either."
- ~60 metatext sites catalogued (see Phase 1).
- `assembly.css` = 1,769 lines of single/double-letter classes (`.mb .av .tk .y .p
.n`…), 69 font-size declarations, several ≤7.5px. Rename before restyling.
- 21-value z-index ladder with unexplained one-offs (34, 95, 180, 950) — tokenize.

## Phase plan

Work happens as commits on this branch, one visual decision per commit. After every
phase: `npm run check`, `npm run test:parity`, and a screenshot pass at 1440×900 and
1280×800 (Playwright captures in `.playwright-mcp/` of this worktree become the
regression baseline).

### Phase 0a — tokens & guards (SMALL)

1. Move the token block from `.shell` to `:root` (verify the camera probe
   `useMapCamera.ts:70-107` still resolves; adjust the probe mount if needed).
2. Add `--pos/--neg/--warn`, the nine type-role classes, the spacing scale, and a
   z-index token ladder to `base.css`. Self-host Cinzel/Alegreya in `index.html`.
3. Extract `CHROME_INSET_TB`, the literal `360`, and `--chrome-top` into one
   constants module read from CSS tokens, with a focused test.
4. Delete the global display-face button rule; make `body` default Alegreya, Cinzel
   opt-in via `.disp`/role classes.
5. Add `scripts/check-ui-system.mjs` (run from `npm run docs:check` or a new
   `npm run ui:check`): fails on (a) `font-size:` outside the role sheet,
   (b) raw hex outside `base.css`, (c) `title="` sentences in `src/components`
   outside Tooltip/MechanicsDetails. Grandfather-list the current violations and
   ratchet the count down per phase — the script fails if the count _rises_.

Done when: check+parity green; grep counts recorded; app renders unchanged (this
phase is invisible).

### Phase 0b — the effect-icon system (SVG line icons, owner-ratified)

Paradox-style: every typed effect has a dedicated glyph. The codebase already has
the discriminated unions and exhaustive registries (`src/ui/effects.ts` presenters,
`src/parity/featureParity.ts`, `CONTENT_MANIFEST`) — the icon system is one more
projection over the same types.

**All glyphs are hand-drawn inline SVG line icons.** No AI-generated art, no new
PNGs — the only raster icons that remain are the existing resource masks (and even
those may be re-drawn as SVG for consistency if it's clean to do). Construction
rules: 24px viewBox grid, ~1.7 stroke, `stroke="currentColor"` `fill="none"`,
round caps/joins, one optional solid mass max, self-consistent across the whole
set. The prototypes' verb/bust/tab glyphs in `ui-overhaul-prototypes/` are the
style reference.

1. `src/ui/icons/` — one SVG component (or a path-data table rendered by a single
   `<Icon>` component) per glyph. Keep path data in one module so line-weight and
   grid stay uniform.
2. `src/ui/iconRegistry.ts`: a **total** map from effect discriminant (and resource,
   pop-class, action, politician, building, season, venture kinds) → glyph.
   A missing entry is a type error, not a runtime fallback.
3. Extend the manifest-backed presentation test (same pattern as the existing "every
   typed effect has a non-empty semantic projection" test in
   `src/parity/featureParity.test.ts`) so an effect kind without a registry entry
   fails the suite.
4. `<EffectIcon kind=…/>`: renders the glyph at 14 (inline) / 18 (verbs) / 24
   (rails), tinted by `currentColor`.
5. Rendering rule (identity vs judgment): the icon carries _identity_; the signed
   colored numeral carries _judgment_; the sentence lives in the tooltip. An effect
   row is `[EffectIcon][signed value][short object]`, e.g. ⚱ +2 per freeman.

Glyph inventory (~50–70): resources ×6 (+ a proper happiness glyph — the current
PNG has no alpha; prototypes use the `.happy-ic` theatre-mask SVG, adopt it);
verbs ×7; pop classes ×3 + promote/demote rungs ×2; buildings ×9; effect modifiers
×~15 (income/turn, one-time gain, cost up/down, capacity, yield, upkeep,
duration-turns, per-class multipliers, riot, starvation, deficit, stockpile,
laurel, voice); Assembly ×~8 (law, directive, stele, ostrakon, bema, repeal, veto,
bribe); politicians ×4; events/tables ×~6 (omen, season, fate, d6, d20, venture
wind-rose); UI micro ×~8 (chevron, close, hourglass, laurel, plus/minus, search,
pin).

### Phase 1 — the great deletion (SMALL)

Delete/relocate the ~60 metatext sites. Known list (from the 2026-08-04 audit;
re-grep after merge — lines may have drifted):

- Panel ledes: `CodexTab.tsx:202`, `MarketTab.tsx:26-28` and `:74`,
  `VictoryTab.tsx:18-22`, `AgoraTab.tsx:52-64` and `:76`.
- Hot-seat harness copy inside scenes: `AssemblyBema.tsx:608-611`,
  `AssemblyFoot.tsx:57-61`, `AssemblyFoot.tsx:138-140`.
- Debug telemetry in chrome: `CommandDock.tsx:80-82` (deck counts · shuffled · seed).
- `verbs.tsx:69`: make `blockedHint` optional; hints render only in the tooltip
  ladder (MechanicsDetails), never as printed chrome.
- Modal lectures: `UpgradeCityModal.tsx:141`, `CalmModal.tsx:40`, `RiotModal.tsx:93`,
  `VentureModal.tsx:35`, `SeasonStatus.tsx:17` title, `EmpireIntelPanel.tsx:94` title.
- Empty states rewritten in game voice ("five stelae stand empty", "no deeds
  recorded"), not dev voice.
- TUNE fab: dock it top-left of the map well (it must never overlap END TURN — it
  currently intercepts clicks on it).

Done when: no sentence explains a mechanic from persistent chrome; every explanation
reachable by hover; ratchet counts drop accordingly.

### Phase 2 — the ceramic shell (MEDIUM)

Reference: `ui-overhaul-prototypes/a-table.html` + `proto.css`.

- Bars: bone slip gradient, ink figures, clay meander edge (data-URI SVG strip),
  soft outer shadow. No dark bars anywhere.
- Symmetry: resource spine absolutely centered in the top bar (`stat-lg` 26px values,
  signed colored deltas, masked icons at 21px); event slips left; roster right (glaze
  discs + Greek letters, acting seat clay-underlined). Verbs centered in the bottom
  rail (icon 23 + `verb` label + cost as icon+numeral; blocked = 38% opacity with the
  unmet cost at full-opacity `--neg`). `DiscRail` → docked tablet rails with
  vertically centered tabs.
- **Twin dials** (new components, both 128px discs protruding above the rail,
  drop-shadow, z above tablets):
  - `SeasonClock` (rework of `SeasonDial`): outer ring = year progress arc,
    `year / maxYears` clockwise from 12 o'clock, 8 tick marks; inner annulus = four
    season sectors that rotate so the active season sits under a **fixed needle at
    45° (top-right)**; hub = year numeral (`display` role) + season name in clay
    `label`. Data: current year, max years, season index — all already in the
    projection.
  - `EndTurnSeal` (replaces the End Turn square): clay-gradient disc, beaded ring
    (dashed stroke), ivory hourglass, END TURN in `verb` caps, acting player name
    beneath. Disabled state: desaturated + the blocking reason in its tooltip
    (attention-funnel behavior can come later; the seal is the anchor).
  - Naming gotcha from prototyping: `.seal` already means settlement-seal; use
    distinct class names (`.turn-seal`).
- The map well: `assets/map/aegean-sea-board.png` full-bleed under the board
  (replaces the flat teal + grid); tablets lie on it with laid shadows; the
  camera constants module from Phase 0a absorbs the new bar heights.

Done when: prototype A is reproduced by the live app at 1440 and 1280 with real
state; screenshot baseline updated.

### Phase 3 — the board (MEDIUM)

Reference: prototype A's SVG board.

- Terrain ramp: plains `#e2d4b6` · hill `#d5c5a4` · forest `#cabb97` · mountain
  `#bfae8c` · oracle `#ede4cd`; kind carried by engraved emblems (ink @ ~30%,
  centered); yield numeral 17px Alegreya 800 at bottom-center; slot pips hidden at
  rest (show on selection/targeting).
- Tokens: settlement seals (city = temple-front glyph, colony = pennant, on owner
  glaze disc with ivory keyline), pop beads (solid citizen / ring freeman / black
  slave) arced under the seal, owner rims as inner hex strokes, ivory name plates.
- **Names:** deterministic name assignment per founded settlement; the engine keeps
  coordinates as identity; UI renders names, coordinates in tooltip. Prefer a
  content-side deterministic mapping; if save-persistent names are the cleaner
  long-term design, adding a name field engine-side is allowed under the
  work-clean policy (`engine:` commit, no rule/balance impact, saves stay
  compatible or get a proper migration).
- States: selection = clay inner stroke; legal target = dashed aegean stroke + wash;
  non-targets dim during targeting. Kill the white dashed coastline and white pips.
- Fix the Found-targeting instruction banner rendering through the action bar
  (observed bug: banner text overlaps verb buttons).

Done when: no Tailwind primaries on the map; every owner mark carries keyline +
blazon; "City 1,1" appears nowhere in the UI.

### Phase 4 — panels & ceremony (MEDIUM)

References: `f-panels.html` (all seven tabs at true width), `c-event.html`,
`d-venture.html`. One tab per commit/PR-sized change:

1. **Cities:** empire strip; oxblood alarm banner component (32px number + caps
   consequence) replacing the beige unrest text; named settlement cards with bead
   rows, socket rows, signed colored income.
2. **Pops → The Ladder:** three tiers with 26px counts and income chips; promote/
   demote as labeled rungs _between_ tiers with icon costs; "where they live" bead
   map; NET/TURN anchor row. Delete the GROWN/IN TRANSIT/GAINED/DEATHS grid (data
   moves to tooltips).
3. **Build:** building cards (engraved tile icon, effect in icon grammar, one cost
   as icon+numeral — base-vs-effective moves to the tooltip per the presentation
   contract); target buttons "RAISE IN <CITY>"; blocked cards dim 55% except the
   unmet cost in `--neg` ("NEEDS 2 MORE STONE").
4. **Market:** delete both lectures; rows = icon 26px + HELD 22px + SELL (filled
   dark) / BUY (outline) rate buttons; deficit state mutes SELL, rings BUY in clay,
   renders the count in `--neg`; TREASURY 28px anchor.
5. **Victory:** "N/3 LAURELS HELD" heldline; laurel cards with leader glaze disc,
   `tnum` progress vs minimum, meter; held = olive ring + HELD stamp; full standings
   in hover.
6. **Agora:** Voice plaque; aegean law slabs (same component as Assembly standing
   laws); orator rows with medallion + epithet + stele notches; NEXT ASSEMBLY anchor.
7. **Chronicle:** glaze-disc filters; season breaks as labels; entries in game voice
   with inline colored deltas; collapse duplicate resolution entries and the doubled
   header. If log entries are engine-authored strings, the clean fix is structured
   log entries (typed event + data) rendered by a UI presenter — allowed under the
   work-clean policy as an `engine:` refactor; string-munging presentation-side is
   the fallback, not the goal.

Then ceremony, all through the existing `ModalShell` with a ceremony prop:
routine picks unchanged; fates/dice/game-over take the dark scrim + mood frame
(olive gift / oxblood wound — `c-event.html`), the one big number, duration pips,
mood-verb buttons (CLAIM / ENDURE IT / TAKE THE GOLD); venture d6 with the 84px
lacquer die and 400ms face-flip (`prefers-reduced-motion`: settle instantly).

Done when: each tab matches its prototype at panel width; ceremonies reproduce
prototypes C/D; reduced-motion verified.

### Phase 5 — the Assembly scenes (LARGE)

References: `b-assembly.html` (proposal), `e-assembly-vote.html` (voting).

0. First: rename `assembly.css` single-letter classes to readable names (pure
   mechanical rename, TSX+CSS pairs — the audit is blunt that the file is
   unreviewable otherwise).
1. Proposal: night scene over the dimmed chart; stations tracker (I·II·III joined by
   meander); politician stelae with bust medallion, epithet, **"HIS LAWS TEND TO" +
   two example effects** rendered from each politician's actual deck via the
   canonical presenters + EffectIcon (author these two representative effects in
   content, don't hand-write UI strings); DRAW as clay seal with influence cost;
   law card at the bema (meander band, colored trade-off clauses, prize pill);
   seats with face-down ostraka; states in game voice.
2. Voting: one resolution on trial at a time ("CARD I OF II", next card stacked
   beneath); tally = 56px numerals over the olive/oxblood tug bar with ivory
   tie-notch; verdict line with consequence; ostraka ΝΑΙ/ΟΥ per cast seat; active
   voter plaque with full-size YEA/NAY seals + VETO/BRIBE minors with influence
   costs; voting order as a line, not a sentence.
3. Standing law: passed card → colonnade stele → Agora slab (one component, three
   lives); repeal = crack-and-fall ceremony.

Done when: both phases reproduce the prototypes with live state (use the tune
panel's Start-at-Assembly flag for testing); assembly.css reads like the rest of
the codebase.

## Sync ritual

1. `git fetch origin && git merge origin/main` (merge, never rebase) — **once at run
   start**; no mid-run merges expected while the owner is away. After the owner
   returns and merges new PRs to main, run it again and restyle any new UI surfaces
   (`git diff --stat <last-sync>..origin/main -- src/components src/styles`).
2. `npm run check && npm run test:parity` — green before styling anything.

## Acceptance and validation (autonomous run — the owner is away)

- Per phase: `check` + `test:parity` + `ui:check` ratchet + lint; the agent drives
  the real app with Playwright and visually compares 1440×900 / 1280×800 screenshots
  against the prototypes, fixing defects before commit. Push after each phase.
- Stuck policy (owner-ratified): after honest fix attempts, leave it red, mark the
  commit `WIP-RED:`, log the blocker in `RUN-LOG.md`, continue with the next phase.
- Effect-icon totality: the extended parity test fails on any typed effect without
  a registry entry.
- The owner reviews on return via RUN-LOG.md + the side-by-side A/B in
  `THIS-WORKTREE.md`; owner playtest replaces per-phase gates at that point.

## Retirement

On adoption: this plan moves to `docs/archive/plans/` with the adoption PR; delete
`THIS-WORKTREE.md`; the prototypes folder may be deleted or archived. On rejection:
remove the worktree and branch; nothing else to clean up.
