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

**The auditor** — `node .playwright-mcp/audit.mjs` drives every surface at 1920,
1440 and 1280 and reports four geometric facts about every element on the page:

| class       | means                                              |
| ----------- | -------------------------------------------------- |
| `OVERFLOW`  | the box escapes the nearest ancestor that clips it |
| `TRUNCATED` | content is larger than its own clipped box         |
| `OFFSCREEN` | a visible element sits outside the viewport        |
| `COLLISION` | two unrelated text-bearing elements overlap        |

Spillage is not a matter of taste, it is arithmetic — so it is machine-found and
machine-closed. `report.json` holds the raw rows; the ledger holds the ones
worth a human decision.

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

### Systemic — every surface pays for these

| ID      | sev     | surface                 | defect                                                                                                                                                                                                          | status |
| ------- | ------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| SHELL-1 | major   | top bar                 | The resource spine's icon row is out of phase with its number row — icons sit ~50px right of the number they belong to, and the first one lands on the Player card. This is the owner's "sit completely loose". | open   |
| SHELL-2 | major   | top bar                 | `strong.topbarEventName` truncates by 14px at every width — "Warehouse Fire", "Civil Discord", "Spring Floods" all clipped.                                                                                     | open   |
| SHELL-3 | major   | top bar                 | `span.topbarEventEffect` truncates by 13px at every width, cutting the effect's icon in half — the stray glyph beside the card edge.                                                                            | open   |
| SHELL-4 | minor   | top bar                 | `.resourceSpine` escapes the viewport 2px upward at 1280.                                                                                                                                                       | open   |
| PANEL-1 | blocker | all 8 tabs              | `.intelBody` overflows `.empireIntel` by 4px on every single tab. The panel frame does not contain its own content.                                                                                             | open   |
| PANEL-2 | blocker | build, chronicle, codex | Tab content runs off the **bottom of the page** instead of scrolling inside the frame — 888px of building cards, 356px of chronicle. The frame reserves no room for the season dial or the End Turn seal.       | open   |

### Per surface

| ID       | sev     | surface   | defect                                                                                                                                                                                | status |
| -------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| CODEX-1  | blocker | codex     | 10 of 15 section tabs sit off the right edge, the furthest by 1013px, **at every width**. Two-thirds of the rulebook is unreachable — a horizontal stack where the content is a menu. | open   |
| BUILD-1  | blocker | build     | Every building card carries two full-width `Raise in <city>` buttons, so seven cards need ~1700px of column. Combined with PANEL-2 the list simply falls off the page.                | open   |
| ASM-1    | blocker | assembly  | A law's clause spans (`.clauseGain`, `.clauseBut`, `.clauseCost`) render **on top of each other** at 100% overlap. The text of the thing being voted on is illegible.                 | open   |
| BOARD-1  | major   | board     | Settlement name plaques are narrower than the names they carry (`AIGAI`, `SIKYON`, `BOURA`, `PHLIOUS` all truncate).                                                                  | open   |
| BOARD-2  | major   | board     | Neighbouring labels collide — `OLYNTHOS` over `AIGAI` — and labels overlap the yield numbers of adjacent hexes.                                                                       | open   |
| CITIES-1 | major   | cities    | The settlement rows are the pre-overhaul layout: a cryptic icon strip (`0/3 · 4/10`) and a chevron. The showcase's per-settlement building slots are absent.                          | open   |
| ASM-2    | major   | assembly  | The board reads through the Assembly's backdrop — hex numbers and settlement names visible across the scene.                                                                          | open   |
| POPS-1   | major   | pops      | `Net / turn` collides with the season dial at 1280.                                                                                                                                   | open   |
| TGT-1    | major   | targeting | The placement caption sits on top of the `Build` mechanics heading (89% overlap).                                                                                                     | open   |
| ASM-3    | minor   | assembly  | `.tugBar` truncates by 3px.                                                                                                                                                           | open   |

Parity rows (`PAR-*`) are appended by the showcase audits and carry the same
severity scale.

<!-- END LEDGER -->
