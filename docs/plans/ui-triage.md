---
title: UI triage — the defect ledger
status: active
phase: "—"
updated: 2026-08-15
---

# UI triage — the defect ledger

The overhaul shipped its seven phases and then the owner drove it and found it
full of holes: icons spilling out of their bars, a rule ledger whose menu runs
off the screen, panels that never got the layout the showcase designed for them,
an Assembly that reads as broken.

This file is the ledger that closes those holes. It exists because the failure
mode of a long fix-up run is not being wrong, it is **losing the list** — a
session ends, context compacts, and the twelve defects nobody wrote down come
back. Every defect here has a stable ID, an owner surface and a status, and a
row only moves to `fixed` when the auditor re-runs clean over it.

## How a defect gets here

Two feeds, deliberately different in kind:

**The auditor** — `npm run ui:audit` drives every surface at 1920, 1440 and 1280
and reports four geometric facts about every element on the page:

| class       | means                                              |
| ----------- | -------------------------------------------------- |
| `OVERFLOW`  | the box escapes the nearest ancestor that clips it |
| `TRUNCATED` | content is larger than its own clipped box         |
| `OFFSCREEN` | a visible element sits outside the viewport        |
| `COLLISION` | two unrelated text-bearing elements overlap        |

Spillage is not a matter of taste, it is arithmetic — so it is machine-found and
machine-closed. `report.json` holds the raw rows; the ledger holds the ones
worth a human decision.

**Read `OFFSCREEN:bottom` with care.** The probe measures against the viewport at
scroll position zero, so a _working_ scroll region whose content is longer than
its window reports every row below the fold. A 1400px list in a 630px tablet is
correct behaviour and reports ~100 rows. `OVERFLOW`, `TRUNCATED`, `COLLISION` and
`OFFSCREEN:right/top` are the trustworthy classes; bottom-side rows are judged by
scrolling the surface in a browser, not by the count.

**The parity audits** — each showcase prototype in
`docs/plans/ui-overhaul-prototypes/` read against the component that was
supposed to implement it. This feed catches the opposite failure: nothing is
overflowing because the designed thing was never built.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                                                                        |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | N/A      | Presentation only. No rule, cost, query or execution change is in scope; the parity and scenario suites must stay green precisely because nothing beneath the UI moves. Any commit that must touch `src/game` is prefixed `engine:` and reviewed separately.                             |
| Frontend         | Yes      | Every row below names a surface and closes on evidence: the geometry auditor re-runs clean over it, and the surface is driven in a real browser at 1920, 1440 and 1280 and looked at. Accessibility travels with the fix — a control the design turns into a glyph still needs its name. |
| Simulation & AI  | N/A      | The headless sim never renders. No bot behaviour, scoring or search is touched.                                                                                                                                                                                                          |

## Severity

- **blocker** — a designed feature is absent, or the surface is unusable at a
  supported width.
- **major** — present but structurally wrong; a redesign of that region, not a
  nudge.
- **minor** — cosmetic drift from the showcase.

## Invariants that still hold

Unchanged from the overhaul run and not up for renegotiation here:

- No game-rule or balance changes. Engine-touching commits stay `engine:`-prefixed.
- SVG line icons only — no new raster art.
- `npm run ui:check` is a ratchet: the counts may fall, never rise.
- `check`, `lint`, `test:run`, `test:parity`, `docs:check`, `format:check` stay green.
- Push the branch; never open a PR, never merge to main.

## The ledger

<!-- BEGIN LEDGER -->

Baseline: **689 defects** across 17 surfaces at three widths
(`OFFSCREEN 354 · OVERFLOW 262 · TRUNCATED 59 · COLLISION 14`). The rows below
are the causes behind those 689 — one row per decision, not per element.

**After wave 1: 156.** `OVERFLOW 262 → 7`, `OFFSCREEN:top 247 → 0`.

### Final state

| checker            | start     | end                                        |
| ------------------ | --------- | ------------------------------------------ |
| `ui:audit`         | **689**   | **0** across 19 surfaces × 3 widths        |
| `ui:conduct`       | **362**   | **5**, every one a repeated glossary token |
| `ui:check` budgets | 224/75/20 | **131 / 47 / 0**                           |

`NAMELESS 0 · CONTRAST 0 · NOFOCUS 0 · TINY 0`. No console errors on any surface.
Suites: 524 tests, 95 parity.

**A large share of the run went into the checkers, not the UI.** Six
false-positive classes were found and removed, each of which had been reported as
a defect and would have been "fixed" by damaging something that already worked:

1. `OFFSCREEN` counted content below the fold of a working scroll region — 101 rows.
2. `COLLISION` used bounding boxes, so a `<strong>` on line three "overlapped" the
   `<em>` wrapping all four lines at 100%. This one sent an agent chasing a
   phantom clause bug in the Assembly.
3. `COLLISION` measured where things are _laid out_, not where they are _painted_,
   so a card clipped 80px under a tablet "collided" with the End Turn seal.
4. The focus probe called `.focus()`, and `:focus-visible` deliberately does not
   match programmatic focus — 277 rows, all fiction.
5. `TINY` ignored WCAG 2.5.8's inline-in-a-sentence exemption, which this app
   leans on for hundreds of glossary links. Padding them to 24px was tried first
   and produced 53 fresh collisions — the evidence that the exemption is real.
6. The focus probe read computed style mid-transition, so controls that were
   visibly lighting up measured as inert.

Every correction was checked the same way: restore the old rule and confirm it
still catches a defect known to be real. **A detector softened until it passes is
worse than no detector, because its clean run reads as proof.**

**Two real defects were hiding under those fictions** and would not have been
found without fixing the ruler first: a focused hex was painted identically to a
hovered one (and in targeting mode had no indicator at all), and the End Turn
seal's tooltip opened at viewport (10, 10) because `display: contents` gave its
trigger a zero-size rect.

### Owner rulings taken during the run

Two questions were escalated rather than guessed, because either answer led to
materially different work. Both were answered:

- **The Assembly is a full-bleed takeover.** The showcase draws it as a
  1440×900 night scene; the shipped Assembly was a ~900px card floating inside
  the live chrome, per an earlier ruling that predated the showcase. The owner
  has now ruled for the showcase: the scene covers the viewport and the vignette
  darkens the whole app, chrome included. **This supersedes the rationale
  recorded in `AssemblyPanel.tsx`**, and roughly a third of the Assembly's
  parity rows dissolve with it rather than needing a fix of their own.
- **The effect presenters get split.** `src/ui/effects.ts` will return an
  effect's parts — magnitude, subject, condition, turns — alongside the flat
  `text` it returns today, so the ceremonies can carve their one big number the
  way both prototypes compose around. UI layer only; `.text` stays, so every
  existing caller keeps working.

### Systemic — every surface pays for these

| ID      | sev     | surface                 | defect                                                                                                                                                                                                          | status    |
| ------- | ------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| SHELL-1 | major   | top bar                 | The resource spine's icon row is out of phase with its number row — icons sit ~50px right of the number they belong to, and the first one lands on the Player card. This is the owner's "sit completely loose". | **fixed** |
| SHELL-2 | major   | top bar                 | `strong.topbarEventName` truncates by 14px at every width — "Warehouse Fire", "Civil Discord", "Spring Floods" all clipped.                                                                                     | **fixed** |
| SHELL-3 | major   | top bar                 | `span.topbarEventEffect` truncates by 13px at every width, cutting the effect's icon in half — the stray glyph beside the card edge.                                                                            | **fixed** |
| SHELL-4 | minor   | top bar                 | `.resourceSpine` escapes the viewport 2px upward at 1280.                                                                                                                                                       | **fixed** |
| PANEL-1 | blocker | all 8 tabs              | `.intelBody` overflows `.empireIntel` by 4px on every single tab. The panel frame does not contain its own content.                                                                                             | **fixed** |
| PANEL-2 | blocker | build, chronicle, codex | Tab content runs off the **bottom of the page** instead of scrolling inside the frame — 888px of building cards, 356px of chronicle. The frame reserves no room for the season dial or the End Turn seal.       | **fixed** |

### Per surface

| ID       | sev     | surface   | defect                                                                                                                                                                                                                                                                                                                                                                                                                                         | status    |
| -------- | ------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| CODEX-1  | blocker | codex     | 10 of 15 section tabs sit off the right edge, the furthest by 1013px, **at every width**. Two-thirds of the rulebook is unreachable — a horizontal stack where the content is a menu.                                                                                                                                                                                                                                                          | open      |
| BUILD-1  | blocker | build     | Every building card carries two full-width `Raise in <city>` buttons, so seven cards need ~1700px of column. Combined with PANEL-2 the list simply falls off the page.                                                                                                                                                                                                                                                                         | open      |
| ASM-1    | blocker | assembly  | A law's clause spans (`.clauseGain`, `.clauseBut`, `.clauseCost`) render **on top of each other** at 100% overlap. The text of the thing being voted on is illegible.                                                                                                                                                                                                                                                                          | open      |
| BOARD-1  | major   | board     | Settlement name plaques are narrower than the names they carry (`AIGAI`, `SIKYON`, `BOURA`, `PHLIOUS` all truncate).                                                                                                                                                                                                                                                                                                                           | **fixed** |
| BOARD-2  | major   | board     | Neighbouring labels collide — `OLYNTHOS` over `AIGAI` — and labels overlap the yield numbers of adjacent hexes.                                                                                                                                                                                                                                                                                                                                | **fixed** |
| CITIES-1 | major   | cities    | The settlement rows are the pre-overhaul layout: a cryptic icon strip (`0/3 · 4/10`) and a chevron. The showcase's per-settlement building slots are absent.                                                                                                                                                                                                                                                                                   | open      |
| ASM-2    | major   | assembly  | The board reads through the Assembly's backdrop — hex numbers and settlement names visible across the scene.                                                                                                                                                                                                                                                                                                                                   | open      |
| POPS-1   | major   | pops      | `Net / turn` collides with the season dial at 1280. Not reproducible as written — measured at 1366×768, 1280×800 and 1280×720 the anchor sits inside the panel frame and clears the dial by ~8px every time. What it was seeing is real but one frame up: the row wrapped its chips onto a second line, and at 1366×768 that second line pushed the anchor 14px out through the bottom of the frame. Closed by the stacked anchor (QA-POPS-4). | **fixed** |
| TGT-1    | major   | targeting | An armed verb's tooltip covers the placement caption it duplicates (89% overlap). Recorded fixed after wave 2, but the stand-down only reached the two verbs that declared a pressed state — Grow and Move armed the map with no pressed state at all, so both kept painting over their own caption until QA-DOCK-3.                                                                                                                           | **fixed** |
| ASM-3    | minor   | assembly  | `.tugBar` truncates by 3px.                                                                                                                                                                                                                                                                                                                                                                                                                    | open      |

Parity rows (`PAR-*`) live in
[the parity companion](./ui-triage-parity.md) and carry the same severity scale.

### Known-open, deliberately

Nothing here is a surprise; each was reasoned rather than missed.

| ID       | what                                                                                                                                                                                                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CER-1    | **Fate cards have no voice.** `EventCard` has no flavour field; `card.text` _is_ the rules sentence. The duplication is fixed (a card no longer says its one thing twice), but the showcase's quoted line has nowhere to come from. Needs an authored `flavor` field — an `engine:` commit, and the owner's call.                       |
| ICON-1   | **`AtlasIcon` is a fourth icon system** — tinted PNG masks for pops, buildings, settlement kinds and terrain, across 11 files. `POP_GLYPHS`, `BUILDING_GLYPHS`, `SETTLEMENT_GLYPHS` and `TERRAIN_GLYPHS` already exist as line art for every one. Same defect as the happiness raster, one register over.                               |
| SHELL-3  | The compass rose is **painted into the sea plate** (`center / cover`), so its position moves with the viewport while the dials' is fixed. No CSS placement separates them at every width; needs the ornament off the plate or a different crop.                                                                                         |
| ASM-11   | The repeal crack-and-fall ceremony. Needs exit-animation state retention. Out of scope since the original run.                                                                                                                                                                                                                          |
| TYPE-1   | The venture title renders 24px against a 27px spec, and the Assembly tally 52–54px against 56 below 1440. Both are `--ui-scale` behaving as documented — "1280 gets the same scene smaller, not a different one". Honouring the spec would break the uniform scale for one element.                                                     |
| DUP-1    | 5 repeated glossary tokens (`Gold` x5 in a venture odds table). Each links to the same chapter, and each is read _in its sentence_, which is what disambiguates it. Numbering them would fix an ambiguity that only exists when tabbing the page as a list.                                                                             |
| CHRON-2  | **The chronicle mis-glyphs card titles** - "Granary Rats" draws the _granary building_ glyph, because `AnnotatedText` matches the word inside a card name. This is wrong information, not noise, and it is the last one left. Needs either the engine to mark card names in log entries, or the annotator to know it is inside a title. |
| TICKER-1 | The dock ticker prints `-5 wood` where the chronicle prints `-5 Wood` with its glyph - one event, two voices. Rendering the ticker through `<AnnotatedText links={false} />` would settle it.                                                                                                                                           |

### Opened by the fixes

Honest bookkeeping: wave 1 narrowed the tablets to the design's 306px/286px, and
content that had been built for 360px now has less room than it assumes.

| ID    | sev   | surface | defect                                                                                                                                                                                                                | status           |
| ----- | ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| REG-1 | major | cities  | `strong.title` truncates by 22px (`AIGAI`) and 31px (`SIKYON`) in the settlement card; the `city · mountain` subtitle by 47px. A 5-letter name truncates as badly as a 6-letter one, so the cause is not name length. | open             |
| REG-2 | major | agora   | `.steleNotches` overflows by 67px — it cannot wrap.                                                                                                                                                                   | open             |
| REG-3 | minor | pops    | The ladder rung button pair overflows by 5px.                                                                                                                                                                         | open             |
| REG-4 | minor | chrome  | New collisions between right-tablet content and the two floating dials (`spring, Year 2` × `DAMON ACTS`, `Colony` × `END TURN`).                                                                                      | **not a defect** |

**REG-4, and the two `tab-build` × ticker rows with it, were never real.** Eight
COLLISION rows accused the floating bottom chrome of painting over panel content.
Driven at all three widths, every one of them has the panel side of the pair
BELOW THE FOLD of a working scroll region: the tablets end exactly at the dials'
top edge (`--tablet-bot`) and clip, the ticker lives inside the dock bar, and
`elementFromPoint` at each overlap centre finds the seal and never the card. The
auditor was reading `getBoundingClientRect`, which reports where a row is laid
out, not where it is painted. COLLISION now clips each line box to the ancestors
that clip it — the same correction OFFSCREEN already carries — and the class was
re-checked against TGT-1, a genuine overlap between two painted elements, which
it still reports at 89%. **Nothing in the frame moved, because nothing in the
frame was wrong.**

<!-- END LEDGER -->
