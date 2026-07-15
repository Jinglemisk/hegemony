# Hegemony — Direction Dossier
### The full source documents behind Brandbook §X ("The Chrome Question")

Three complete art-direction *specifications* were written independently from the same brief (same audit ground truth, same five hard constraints), then scored by three adversarial judges, each reading through a different lens. This dossier is the unabridged material the brandbook's summary cards were distilled from.

**Contents**
1. Direction: Katalogos — the Catalogue of Ships *(winner — became Brandbook §III–IX)*
2. Direction: The Painted Table *(playtest-lens winner — board grammar grafted)*
3. Direction: Strategos — the Black-Figure Command Deck *(engineering steals grafted)*
4. Judge 1 — Brand distinctiveness & craft
5. Judge 2 — Shipping feasibility (solo dev, incremental migration)
6. Judge 3 — Playtest readability (a player at 1280×800, mid-game)

---



---

# 1 · KATALOGOS — full specification

# KATALOGOS — The Catalogue of Ships

THESIS: The interface is a finely set museum catalog laid open beside the artifact: one warm paper ground, hierarchy carried entirely by inscriptional type, hairline rules, and air — all ornament, color, and ceremony is concentrated in the artifacts themselves (the board, the cards, the moments).
AXES: Representation: lean-abstract (seals, beads, engravings — not miniatures) · Ceremony: quiet-high (silent chrome, print-grade moments) · Density: airy (whitespace is the panel border).

# KATALOGOS — The Catalogue of Ships
## Art direction for Hegemony · complete spec

---

## 1. Name, thesis, axes

**KATALOGOS** — after the Catalogue of Ships in Iliad Book 2: the most beautiful list in Western literature. The UI is that list. Everything around the board is set like a fine-press exhibition catalog: one continuous warm paper ground, no boxes, no frames, no panel backgrounds. Hierarchy is inscriptional capitals, old-style text, hairline rules, tabular numerals, and generous air. The board is the artifact on the page; the event cards are the plates; modals are pages you turn. Ornament exists *only* where the game is happening — never in the furniture.

- **Representation:** lean-abstract. Tokens are ceramic seals, beads, and engraved emblems — museum objects, not miniatures.
- **Ceremony:** quiet-high. The chrome is nearly silent; when the game speaks (event card, riot roll, game over), it speaks at full print fidelity.
- **Density:** airy. Whitespace replaces every border we delete. Fewer things per view, each set perfectly.

The test for every future component: *"Would this appear in a Getty exhibition catalog?"* If it needs a colored background box to feel important, it is set wrong.

---

## 2. Palette

### 2.1 The paper (tans: 10 → 3)
| Token | Hex | Role | Maps from existing |
|---|---|---|---|
| `--ground` | `#F4E6C8` | THE page. Shell, panels, topbar, verb bar, resource spine — everything. No gradients, no per-panel tints. | `--bone` (kept verbatim) |
| `--plate` | `#FFF8E7` | Ceremony surfaces only: modal plates, tooltips, card mattes, hovered ledger rows. Never a persistent panel. | `--ivory` (kept verbatim) |
| `--terrain` | `#D8C8A8` | Base ceramic hex ground (ramp in §6 derives from it mathematically, not as new tokens). | `--terrain-neutral` (kept) |

Delete: `--panel`, `--panel-strong`, `--panel-soft`, `--terrain-neutral-light`, `--terrain-neutral-soft`, all per-card gradient copies, the hero-tableau wash behind panels. The `light-hero-tableau.png` backdrop goes; the sea chart under the board is the only pictorial ground that survives (§6).

### 2.2 The ink (near-blacks: 7 → 2 + alpha ramp)
| Token | Hex | Role |
|---|---|---|
| `--engraving` | `#181210` | Icon masks, display type ≥18px, token linework. (`--vase-black`, kept.) |
| `--ink` | `#241910` | All body/label text. (`--fg`, kept. `--ink-2 #241915` and `#722420`-as-text are deleted, remapped here.) |
| `--ink-soft` | `rgb(36 25 16 / 62%)` | Secondary text. (merges `--muted` 66% + `--subtle` 48% — two steps become one) |
| `--rule` | `rgb(36 25 16 / 16%)` | THE hairline. Merges `--line`, `--ledger-rule`, `--ledger-rule-strong`, `--hex-line`, `--button-line`. One value, everywhere. |
| `--rule-strong` | `rgb(36 25 16 / 34%)` | Table header rules, tooltip borders only. |

`--line-strong` (red 48% border) is deleted — ornate red borders no longer exist.

### 2.3 Accent & status
| Token | Hex | Role |
|---|---|---|
| `--accent` | `#C0461C` | The single accent: active tab bar, selected hex, primary button fill, rolled table row, links. (`--clay`, kept.) |
| `--accent-deep` | `#8F2E13` | Pressed states, accent-on-plate text. (`--clay-deep`; `--oxblood #722420` deleted, remapped here.) |
| `--pos` | `#5E6E3A` | Positive deltas. (`--olive`, kept.) |
| `--neg` | `#8F2E13` | Negative deltas, unmet costs, riot. (= `--accent-deep`; unrest `#B13A28` deleted, remapped.) |
| `--warn` | `#D98A35` | Warnings, expiring effects, low-happiness band. (`--ochre`, kept.) |
| `--info` | `#1F6977` | Legal targets, hyper-neutral highlights, focus rings. (`--aegean`, kept.) |

**Disambiguation rule (hard):** status colors appear only in text, deltas, and pill numerals — always paired with a sign or glyph, never color-alone. Owner colors appear only on board tokens, territory strokes, and roster swatches. The two systems never occupy the same pixel class, so olive-the-status and olive-the-player cannot collide.

### 2.4 Player colors (re-derived, 6 seats, colorblind-safe)
Replace the Tailwind primaries (`#1e3a8a/#eab308/#7c3aed/#c1121f`) with pigments a ceramicist owned, spread on a **lightness ladder** so they survive protan/deutan hue-collapse:

| Seat | Name | Hex | approx L* | Derivation |
|---|---|---|---|---|
| P1 | Kyanos | `#1F6977` | 40 | = `--aegean` |
| P2 | Miltos | `#9C2F1B` | 34 | `--clay-deep` warmed +sat |
| P3 | Ochra | `#D98A35` | 64 | = `--ochre` |
| P4 | Chloros | `#55673A` | 41 | `--olive` −6 L |
| P5 | Porphyra | `#6E3A5C` | 33, blue-shifted | Tyrian purple, new; sits between clay and aegean in hue |
| P6 | Glaukos | `#3B3E48` | 27, cool | slate "black-figure" seat; cool vs the warm inks so it never reads as neutral engraving |

Pairwise ΔE(Lab) ≥ 24 for all 15 pairs; the risky pairs under deuteranopia (Miltos/Chloros, Miltos/Porphyra) are separated by ≥7 L* plus Porphyra's blue shift. Every owner mark additionally carries a **1.5px `--plate` keyline**, so every token holds ≥3:1 contrast against `--terrain` (ochre, the lightest, hits ~3.2:1 against #D8C8A8 via its keyline + engraved bone glyph). 4-player games use P1–P4, which are fully safe under all three dichromacies.

---

## 3. Typography

### 3.1 Families (self-hosted, both SIL OFL)
- **Display: Cinzel** (400/700/900). Inscriptional Roman capitals cut from Trajanic proportions — the webfont realization of the current Copperplate instinct, and it ships on every OS instead of macOS only. OFL 1.1, self-host woff2 (~3 weights ≈ 90KB). Stack: `"Cinzel", Copperplate, "Copperplate Gothic Light", Georgia, serif`.
- **Body: Alegreya** (400/500/700 + italics). Old-style serif designed for long-form literature, excellent at 12–15px on screen, real italics, Greek glyph coverage (flavor text, letter-forms like Δ on dice tables), and OpenType `tnum`/`lnum`. OFL 1.1. Stack: `"Alegreya", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`.

### 3.2 Ratified role scale (9 roles, @1440; scale ×0.93 at ≤1280 via one `rem` change)
| Role | Family/weight | Size | Tracking | Case | Use |
|---|---|---|---|---|---|
| `display` | Cinzel 700 | 24px | +0.06em | CAPS | Modal titles, game-over |
| `title` | Cinzel 700 | 15px | +0.05em | CAPS | Panel headings (LEDGER, CHRONICLE) |
| `verb` | Cinzel 700 | 13px | +0.10em | CAPS | Buttons, END TURN, tab labels |
| `label` | Cinzel 600 | 11px | +0.14em | CAPS | THE micro-label — replaces all 12 hand-rolled variants |
| `body` | Alegreya 400 | 14px/1.5 | 0 | — | Chronicle, card text, descriptions |
| `body-em` | Alegreya 500 italic | 14px | 0 | — | Flavor lines, quotes |
| `stat` | Alegreya 600 | 14px | 0 | tnum lnum | Every inline number |
| `stat-lg` | Alegreya 700 | 19px | 0 | tnum lnum | Resource spine, year numeral, die results |
| `caption` | Alegreya 400 | 12px/1.4 | 0 | `--ink-soft` | Tooltips, helper text, timestamps |

**Tabular numerals plan:** a single utility class `.num { font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum","lnum"; }` applied to every stat cell, resource pill, cost, die column, and delta. Alegreya's tabular lining figures are verified in the family; no secondary numeral font. Deltas always render signed (`+4`, `−1.5`) with U+2212 minus, right-aligned in fixed-width columns so ledger rows line up like a real ledger. Kills the 36-size anarchy: CI greps for `font-size:` outside the role sheet.

---

## 4. Layout anatomy

One ground, zero panel backgrounds; zones are separated by **full-height 1px `--rule` hairlines** and nothing else.

### 4.1 @1440×900 (12px outer padding, 10px gutters)
```
┌─────────────────────────────────────────────────────────────── 1416 ─┐
│ TOPBAR 56px: [Season medallion+Year] │ [2 event entries] │ [roster]  │
├──────────────┬───────────────────────────────────────┬──────────────┤
│ LEDGER 300   │            BOARD  ~832 × 694          │ CHRONICLE    │
│ ┌44 rail─┐   │   (sea chart ground, SVG hexes)       │ 264          │
│ │tabs ▼  │256│                                       │  scrolls     │
│ └────────┘   │                                       │  internally  │
│              ├───────────────────────────────────────┤              │
│              │ VERB BAR 56px: 7 verbs ···· [END TURN]│              │
├──────────────┴───────────────────────────────────────┴──────────────┤
│ RESOURCE SPINE 40px: full-width, 6 stats + happiness, hairline above │
└──────────────────────────────────────────────────────────────────────┘
```
- **Topbar (56px):** left — season medallion (the one pictorial chrome element, 44px) + `stat-lg` year. Center — the two event cards become **catalog entries**: `label` kicker ("SEASON — TIMBER LEVIES") + one `caption` effect line, a hairline between them; clicking opens the full ornate card as a Level-2 modal. No card frames in the bar. Right — roster: four entries of swatch-dot (10px owner disc) + `verb`-role name + tiny `stat` VP/actions; the acting player gets a 2px `--accent` underline, not a border box.
- **Ledger (300px = 44 rail + 256 content):** the roadmap's **vertical tab rail**, left edge. Each tab: 20px engraved icon over a 9px `label`; active = `--accent` icon/text + 2px accent bar on the rail's outer edge. Rail and content separated by a hairline. Scales to 8+ tabs (Cities, Build, Pops, Market, Victory, + Assembly, Trade, Ideas later) without crowding.
- **Board:** gains ~170px width vs today (662 → 832 at 1440) by shrinking chrome and deleting frame padding. `mapFrame` loses its border-radius and border entirely — the sea chart bleeds to the hairlines.
- **Verb bar (56px, docked under board):** 7 verbs as text-buttons (§5) reading left→right in play order — Grow · Move · Found · Upgrade · Build · Calm · Venture — then a hairline, then **END TURN** as the only filled button on screen. Costs render inline in `stat` under each verb label.
- **Chronicle (264px):** right column, alone (Actions moved to the verb bar). Entries in `body` 13px, season breaks as `label` + hairline. Deck counters (Seasonal 28/29 · Events 73/74) sit as a `caption` line pinned at its top.
- **Resource spine (40px):** full-width bottom line. Six resources + happiness as `icon 16px + stat-lg value + signed delta`, separated by 32px gaps, hairline above, no pills, no boxes. Delta ticks animate here (§9).

### 4.2 @1280×800
Same skeleton, three compressions: ledger rail goes icon-only (40px; labels in tooltips) → ledger 276; chronicle narrows to 232 (or collapses to a 40px rail toggle if a future tab needs room — the toggle is already in the grammar); topbar/verb bar drop to 52px; resource spine 36px; root `rem` ×0.93. Board ≈ 728×616 — still wider than today's map at 1440. No page scroll at either size; only ledger content and chronicle scroll internally.

### 4.3 Float vs dock, z-model
Docked: everything above. Floating: tooltips, the drag-ghost for Move, toasts, modals. **Elevation = shadow is reserved for floating layers only** — persistent chrome has zero box-shadow. Z: board 0 · chrome 10 · topbar 60 · tooltip 100 · modal scrim 200 · modal 210 · toast 300.

---

## 5. Component grammar

### 5.1 The ONE panel treatment
There is no panel. A "panel" is: `title`-role heading with an 18px engraved icon, a hairline beneath, 24px of air, content. Sections inside separate with 20px air + optional hairline. The ornate red corner marks, `logModal` gradient stack, backdrop blurs, and per-panel borders are all deleted. Grouping is done by proximity (8px grid: 4/8/12/20/32).

### 5.2 Buttons
| Kind | Spec |
|---|---|
| **Primary** (END TURN, modal confirm) | Filled `--accent`, `--plate` text, `verb` role, 2px radius, 40px height. Hover: `--accent-deep`. Press: translateY(1px). The only filled element in persistent chrome. |
| **Verb** | Text-only: 18px engraved icon + `verb` label + `stat` cost line. Hover: 1px `--accent` baseline underline slides in (120ms) + icon tints accent. Press: ink. No border, no background, ever. |
| **Ghost** (cancel, minor) | `verb` role in `--ink-soft`; hover → `--ink` + hairline underline. |
| **Disabled — must read at a glance** | Whole verb drops to 34% opacity **and** the specific unmet cost numeral renders solid `--neg` at full opacity — the red number is the at-a-glance "why not". Cursor `not-allowed`; hover shows a caption tooltip naming the blocker ("Requires 4 influence"). |

### 5.3 Stat rows & chips
Chips are abolished. A stat is `icon 14px + .num value + signed delta` on the text baseline. Ledger city rows: 28px line-height, hairline between cities only (not between stats), city name in `verb` role, stats in a fixed 5-column tnum grid so every row's numbers align vertically down the panel — the ledger literally reads as a ledger. Hover: row washes `--plate`.

### 5.4 Tooltip
`--plate` ground, 1px `--rule-strong` border, 2px radius, `caption` text (title line in `label`), 8×12px padding, shadow `0 4px 16px rgb(24 18 16 / 14%)`, 150ms delay, 120ms fade. Informational only — nothing is *only* in a tooltip.

### 5.5 Tabs
Horizontal (modal internals): `verb` label, inactive `--ink-soft`, active `--ink` + 2px `--accent` underline flush to the section hairline. Vertical (ledger rail): as §4. No tab pills, no background swaps.

### 5.6 Hierarchy without boxes — the four tools
1. Type role (nine, only nine). 2. Air (8px grid; a section break is 32px, worth a border). 3. The hairline (`--rule`, 1px, never doubled in chrome). 4. The accent (one clay element per region max). If a design needs a fifth tool, the design is wrong.

---

## 6. Board treatment

The board is the artifact; the painterly sea chart stays as its mat. Terrain stays quiet per the rollback note — kind = shape/emblem, **color = owner**, resource hues never touch terrain.

### 6.1 Hex ground
One ceramic ramp derived from `--terrain #D8C8A8`, ΔL* ≈ 4 per step, all within the tan family (this is a derived ramp, not new palette tans): plains `#E2D4B6` · hills `#D8C8A8` · forest `#CDBB99` · mountain `#C2AE8B`. Stroke: 1px `rgb(36 25 16 / 22%)` shared edges (replaces the heavy white/blue tile borders in the current build — those chunky strokes are half the "debug" feel). Kind emblem: existing engraved terrain-atlas mark, centered, 26px, `--engraving` at 16% opacity — legible on inspection, silent at glance.

### 6.2 Interaction states (flat, stroke-based, no glows)
- **Hover:** fill lightens one ramp step, stroke `rgb(36 25 16 / 45%)`.
- **Selected:** 2.5px `--accent` inner stroke.
- **Legal target:** 2px dashed `--info` stroke + 8% `--info` wash, opacity pulsing 55↔100% at 1.2s.
- **Illegal during targeting:** all non-targets drop to 80% opacity — the map itself becomes the affordance.

### 6.3 Tokens (kills the white-pip debug look)
- **Settlements — ceramic seals:** circular discs, owner-color fill, 1.5px `--plate` keyline, engraved bone glyph from the existing masks (`capital-star`, `city-gate`, `colony-flag`). Size ladder at zoom 1: Metropolis 38px, City 33px, Colony 27px. Placed at hex center. These replace the flat squares/triangles.
- **Territory:** owned hexes get a 2px owner-color **inner stroke** (never a fill — constraint A). Contested/adjacent stays unstroked.
- **Pops — beads:** 8px bone beads with 1px engraving outline, arced along the hex's lower edge; at 5+ they collapse to one bead + `.num` count in `--engraving` on a small bone lozenge. Social class shows on hex-hover tooltip and in the Ledger, not on-map (abstract axis: the map counts, the catalog describes).
- **Buildings — ceramic tesserae:** 15px square bone tiles, 1px engraved icon, docked as a cluster in the hex's upper-right third. **Empty slots are invisible at rest**; they appear as 20%-ink dotted squares only while the hex is selected or Build targeting is live. Quiet terrain is non-negotiable.
- **Fog/unexplored (future):** terrain ramp at 55% opacity, no emblem, no stroke.

### 6.4 Zoom levels
- **Far (<0.8×):** seals + territory strokes only; beads/tesserae hidden.
- **Mid (0.8–1.3×):** everything above.
- **Near (>1.3×):** adds settlement name in `label` role on a bone underline beneath the seal.

---

## 7. Modal grammar

**One scaffold, a ceremony dial.** Scaffold: warm scrim (`--engraving` at 50%, 4px backdrop blur) → centered `--plate` sheet, 2px radius, shadow `0 24px 64px rgb(24 18 16 / 28%)` (the one big shadow in the game) → `display` title → hairline → body → hairline → right-aligned action row (ghost cancel · primary confirm). Enter: fade + 8px rise, 240ms.

| Dial | Width | Adds | Used for |
|---|---|---|---|
| **0 — Picker** | 420px | nothing | Grow, Move, simple confirms (replaces the unthemed white dialog) |
| **1 — Table/Report** | 560px | 28px engraved seal icon above title + double hairline (two rules 3px apart) under it | Calm, Venture stake, Market detail, riot table, compendium pages (replaces the plain cream card) |
| **2 — Card** | 640px | the ornate parchment card art IS the content, mounted on a minimal plate matte with only an acknowledge button below | Event reveals — the existing card art untouched, now the *only* ornate thing on screen when it appears |
| **3 — Rite** | full-bleed | scrim to 80%, laurel engraving, `display` at 40px, card-stack recap | Game over, era transitions |

**Event tables (d6/d20):** set as a catalog table — die column in `stat-lg` tnum right-aligned, hairline-separated rows, outcome text in `body`. d20 tables run two columns of 10. On roll: the die numeral flips through 3 values over 400ms, settles, and the rolled row takes a 3px `--accent` left bar + `--ground` wash while others drop to `--ink-soft`. No 3D dice — the number is the drama, per "decks for economy, dice for drama."

**Escape/backdrop (fixed globally):** Esc and backdrop-click close dial 0–1. Dial 2–3 with pending game-state resolution ignore both and nudge the confirm button 150ms; once resolved they close normally. Focus is trapped; focus ring is 2px `--info`.

---

## 8. Icon plan

**The survivor: the engraved terracotta line family** (icon/terrain atlases). The flat resource silhouettes and the modern green/red theatre masks are retired; everything is re-cut in one language.

**Construction rules:** 24px design grid, 2px stroke at 24px with subtle engraving taper, 45°-faceted corners (ceramic-cut, not rounded), open counters, max one solid-fill mass per glyph, no interior color. Delivered as **single-ink masks** (existing pipeline: Nano Banana 512px source → `remove-bg` → mask derivation) and tinted by CSS: `--engraving` in chrome, `--plate` on owner tokens, `--accent` on active states, status colors on deltas. Ceremony engravings (modal seals, laurel, medallion) additionally ship as 1024px duotone PNGs.

**Regeneration batch (~36 masks + 6 duotones):**
1. **Resources ×6** — wood, stone, gold, food, influence, unrest, re-cut engraved (drop-in replacement for `assets/resource-icons/*-mask.png`).
2. **Verbs ×7** — grow (sprouting kernel), move (footprint pair), found (cornerstone), upgrade (column capital), build (mason's square), calm (kylix with olive sprig), venture (trireme prow).
3. **Phase 1 gaps** — bank/corridor (trapeza money-changer's table), social ladder (3-rung ladder with figures), riot (broken amphora), ventures ×3 (voyage trireme, expedition amphora-and-oar, mercenary hoplon), event tables ×4 (seasonal wheel-of-months, player scroll, riot broken-amphora small, venture wind-rose).
4. **Pops ×3** — citizen (laureled profile), freeman (bare profile), slave (bound profile) — profiles echo vase figures.
5. **Buildings ×4** re-cut to grid; settlement glyphs ×3 kept (already compliant).
6. **Happiness ×2** — engraved comedy/tragedy pair replacing the colored masks; magnitude shown by the `.num` beside them, not by face variants.
7. **UI micro ×8** — chevron, close, d6, d20, hourglass (End Turn), laurel, plus/minus.
8. **Duotones ×6** — season medallion ×4, laurel rite, compendium frontispiece.

Sizes used: 14 (inline stat), 18 (verbs), 24 (rail tabs), 28 (modal seals), with masks scaling cleanly since they're single-ink.

---

## 9. Motion

Durations: **120ms** hover/underline · **200ms** state changes (`ease-out`) · **240ms** modal enter, `cubic-bezier(0.2, 0.8, 0.2, 1)` · **400ms** die flip · **600ms** resource tick & turn handoff.

**Animates:** resource deltas (numeral counts to new value; signed delta rises 8px and fades over 600ms in the spine); turn handoff (acting underline slides across the roster, medallion crossfades on season change); modal fade+rise; legal-target pulse; die numeral flip; chronicle entries fade in 200ms.

**Never animates:** terrain, tokens at rest (no bobbing, no idle loops), tab switches (instant), layout reflow, panel scroll (native), hairlines. Chrome in a museum does not move. `prefers-reduced-motion`: everything collapses to 100ms opacity fades; the die shows its result immediately with the row highlight only.

---

## 10. Trade-offs, failure modes, migration

**Sacrificed:** toy-like tactility — no bevels, no chunky game-buttons; players who expect board-game chrome may initially read the shell as austere. The hero tableau behind panels is deleted (its love is transferred to the sea chart + cards). Chip-style scannability gives way to typographic alignment — it demands the tnum grid actually ships, or ledgers get noisy.

**Where it could fail:** (1) Discoverability — text-only verbs risk not reading as clickable; mitigated by cursor, hover underline, and the disabled-cost-in-red convention, but watch first playtests. (2) Density creep — Assembly voting and player trade (Phases 3–4) will pressure the airy grid; the grammar holds only with discipline (the four tools, §5.6). If a future screen truly can't fit, the answer is a dial-1 modal, not a box. (3) Hairlines on low-quality displays can shimmer at fractional DPR — use `transform: translateZ(0)`-free 1px borders and test at 1.25× scaling. (4) Cinzel below 11px loses its incisions — the 11px `label` floor is a hard floor.

**Migration estimate (token-driven CSS + asset batch, no rewrite):**
| Area | Size | Notes |
|---|---|---|
| Palette/token collapse | **S** | Mostly deletions + remaps in `base.css`; grep-driven |
| Typography | **M** | Self-host 2 families, sweep ~50 literal combos into 9 role classes |
| Layout (verb bar, vertical rail, spine) | **M** | Grid rework in `base.css` + moving Actions content; component logic untouched |
| Component grammar (de-boxing) | **M** | Deleting borders is fast; re-spacing with air takes care |
| Board tokens & states | **M–L** | SVG token components (seals, beads, tesserae) + zoom tiers in `HexMap.tsx` |
| Modal consolidation | **M** | One scaffold component + dial prop; Escape handling global |
| Icon regeneration | **L** | ~36 masks + 6 duotones through the existing banana/remove-bg/mask pipeline |
| Motion | **S** | A dozen transitions, one reduced-motion block |

Start tomorrow: land the token collapse + hairline sweep first — it deletes the box-on-box problem in a day and everything else lands on a calm page.


---

# 2 · THE PAINTED TABLE — full specification

# The Painted Table

THESIS: The screen is one physical table: the antique sea chart is the table surface, and every UI region is a flat-rendered material object laid upon it — a ceramic ledger tablet, an ivory chart margin, a black vase-foot rail, a papyrus chronicle scroll — distinguished by fill, tone, and silhouette, never by borders.
AXES: Representation: direct (objects, lacquered pieces, materials). Ceremony: matte-tactile in chrome, high only at card/modal/game-over moments. Density: dense — board-game table density is embraced, whitespace spent on the map.

# HEGEMONY — Art Direction: THE PAINTED TABLE

**Thesis.** The screen is one physical table. The antique sea chart (already the best asset after the event cards) stops being a backdrop *inside* a frame and becomes the table itself, full-bleed. Everything else is an object laid flat on that table: a bone-ceramic ledger tablet, an ivory chart margin along the top, a vase-black lacquer rail along the bottom, ceramic hex pieces floating on the sea, lacquered game tokens on the pieces, and — only at moments — a card lifted off the table into the light. Materiality is achieved with **fill + edge + silhouette**, never gloss, never drop-shadow stacks, never a border around a border.

**Axes.** Representation: **direct** — things look like objects you could pick up. Ceremony: **matte-tactile baseline, high only at moments** (cards, resolutions, game over). Density: **dense is fine** — a board-game table is busy; clarity comes from material zoning, not emptiness.

**The one law that satisfies Constraint B:** *material = fill + thickness-edge, never outline.* Every chrome object gets exactly (1) a solid fill in one of three material tones, (2) a single 2px "thickness" edge on its bottom (same hue, darkened ~12%), and (3) nothing else. Interior structure is hairline rules that inset 12px from edges so they read as lines *ruled on* the material, not cell borders. Outlines exist nowhere in persistent chrome. The ornate red corner-mark frames, chip borders, and button borders all die.

---

## 1. Palette

All values live in `src/styles/base.css` on `.shell`; this direction **reuses the existing Kerameikos tokens** and collapses the drift.

### 1a. Material tans — collapse 10 to 3

| Token | Hex | Maps to existing | Role |
|---|---|---|---|
| `--ivory` | `#fff8e7` | existing `--ivory` | Paper: chart margin, chronicle scroll, routine modal sheets, text-on-dark |
| `--bone` | `#f4e6c8` | existing `--bone` | Ceramic slip: ledger tablet, ceremony tablets, hex "plains" ground |
| `--slip-shade` | `#d8c8a8` | existing `--terrain-neutral` | Deep slip: hex ground variation, inactive tabs, thickness edges (via darken) |

Every other tan (`--panel` at 78%, `--panel-strong`, per-card gradient drifts, `#eee1c4` as a standalone) is deleted or re-expressed as one of these three at full opacity. Panels are **opaque** — a laid object is not translucent. `backdrop-filter` is removed from chrome (kept only on the modal scrim).

### 1b. Inks — collapse 7 to 2 + alpha ladder

| Token | Value | Maps to | Role |
|---|---|---|---|
| `--vase-black` | `#181210` | existing | Lacquer: bottom rail, tooltips, token glyphs, black-figure moments |
| `--ink` | `#241910` | existing `--fg` | All body text |
| `--ink-66 / -48 / -30 / -12` | `rgb(36 25 16 / N%)` | existing `--muted`/`--subtle`/`--line` | muted text / subtle text / engraved emblems / hairlines |

Rule: **no third literal near-black ever.** Any gray is `--ink` at an alpha step. `#241915` (`--ink-2`) is deleted.

### 1c. Accents & status (unchanged hexes, ratified roles)

- `--clay #c0461c` — the one interactive accent: active verb, links, acting-player underline, selected tab tick.
- `--clay-deep #8f2e13` — primary action fill (END TURN), **negative status** (losses, deficits).
- `--ochre #d98a35` — **warning** (approaching riot, low food) and legal-target board wash. Also the gold resource; context disambiguates (warnings are text/rims, resource is icon+numeral).
- `--olive #5e6e3a` — **positive status** (+deltas, surplus). Also wood resource; same disambiguation.
- `--aegean #1f6977` — selection/focus color on the board and focus rings. Never a fill.
- `--oxblood #722420` — ceremonial danger only: riot modal, game-over defeat.

Contrast (approx WCAG): `--ink` on `--ivory` ≈ 13.5:1; `--ink-66` on `--bone` ≈ 6.3:1 (AA); `--ivory` on `--vase-black` ≈ 14:1; `--ivory` on `--clay-deep` ≈ 7.8:1; `--clay` on `--ivory` ≈ 4.6:1 (large/bold text only — never 11px labels).

### 1d. Player glazes — re-derived, replacing the Tailwind primaries

Owner colors are **glazes on lacquered pieces**, never terrain tints (Constraint A). Every owner token carries a 1.5px `--ivory` rim (so glaze never touches terrain tan directly) and an engraved `--ivory` Greek-letter blazon (Α Β Γ Δ Ε Ζ) — redundant coding that makes color-blind safety structural, not chromatic.

| Token | Name | Hex | ~L* | Replaces |
|---|---|---|---|---|
| `--player-1` | Kyanos (lapis) | `#2f5d9e` | 40 | `#1e3a8a` |
| `--player-2` | Kinnabari (cinnabar) | `#a83226` | 40 | `#c1121f` |
| `--player-3` | Melichron (honey) | `#dfa437` | 71 | `#eab308` |
| `--player-4` | Leukos (vase-white) | `#f2e3c2` | 90 | — (rim/blazon in `--vase-black`) |
| `--player-5` | Porphyra (murex) | `#7c4d79` | 42 | `#7c3aed` |
| `--player-6` | Chloros (laurel) | `#55672f` | 41 | — |

Default 4-player seating uses 1–4: blue/red/honey/white — pairwise safe under protanopia, deuteranopia, and tritanopia (blue–yellow axis intact for red–green CVD; L* deltas ≥ 31 between the light pair and dark pair; the dark pair blue-vs-red separates on the intact yellow-blue axis). Seats 5–6 (murex, laurel) rely on the letter blazon against seats 2 and 6 respectively — acceptable because the blazon ships on every token from day one. Pairwise ΔE(76) across the set ≥ 25.

Kinnabari (`#a83226`) is deliberately darker and browner than `--clay` so accent-red and player-red never confuse; it sits between existing `unrest #b13a28` and `--oxblood`.

---

## 2. Type

### 2a. Families (self-hosted woff2, no CDN)

- **Display: Marcellus** (OFL 1.1, Google Fonts, single 400 weight, ~30KB woff2). Trajan-like inscriptional capitals — the correct Greco-Roman voice, and it rescues the Copperplate intent from macOS-only. Fallback stack: `Marcellus, Copperplate, "Copperplate Gothic Light", Georgia, serif`. Weight is faked never; hierarchy in display comes from size + tracking + case.
- **Body: Source Serif 4** (OFL 1.1, variable axis 200–900, ~115KB woff2). Old-style-flavored, excellent at 13–15px, and — decisive — real `tnum`/`lnum` support. Fallback: `"Source Serif 4", "Iowan Old Style", "Palatino Linotype", Georgia, serif`.

### 2b. Role scale (ratified — 8 roles, kills the 36 sizes / 12 micro-labels)

| Role | Family | @1440 | @1280 | Weight | Tracking | Case |
|---|---|---|---|---|---|---|
| `type-ceremony` | Marcellus | 28px | 24px | 400 | 0.06em | caps |
| `type-title` | Marcellus | 19px | 17px | 400 | 0.08em | caps |
| `type-label` | Marcellus | 11px | 11px | 400 | 0.14em | caps, `--ink-66` |
| `type-body` | Source Serif | 15px | 14px | 400 | 0 | — |
| `type-body-strong` | Source Serif | 15px | 14px | 600 | 0 | — |
| `type-stat` | Source Serif | 17px | 16px | 600 | 0 | tnum |
| `type-stat-large` | Source Serif | 22px | 20px | 650 | 0 | tnum |
| `type-caption` | Source Serif | 13px | 12.5px | 400 | 0 | `--ink-66` |

Implementation: 8 utility classes (or `@mixin`-style custom properties); a lint pass deletes every literal `font-size` outside these. Line-heights: display 1.1, body 1.45, stats 1.2.

**Tabular numerals plan:** `.type-stat`, `.type-stat-large`, all resource pills, ledger yield columns, d6/d20 table dice columns, and roster counts get `font-variant-numeric: tabular-nums lining-nums;`. Marcellus never renders game numbers (its figures are display-only); any numeral adjacent to a Marcellus label is set in Source Serif stat role.

---

## 3. Layout anatomy

The shell background changes from parchment gradients to the **sea chart, full-bleed** (`--hero-tableau` retires from behind-panels duty; the board backdrop asset becomes `--table-chart`, the `body` background). Panels no longer float on parchment; they lie on the sea. Shell padding drops to 0 — objects meet the viewport edge like a photographed tabletop.

### Zones @1440×900

| Zone | Geometry | Material | Contents |
|---|---|---|---|
| **Chart margin** (top) | 0,0 → 1440×60 | `--ivory`, 1px `--ink-12` rule beneath, 2px thickness edge | Left: 2 event-card slips (~200px each, art thumbnail + title, click→ceremony modal). Center: season medallion (48px) + year + turn owner. Right: roster, up to 6 seats × ~118px |
| **Ledger tablet** (left) | 16,76 → 336×740 | `--bone`, cut top corners (12px 45° chamfer — a stone tablet), 2px bottom thickness edge | 40px **vertical tab spine** on its left edge + 296px content. Tabs: Cities, Build, Pops, Market, Victory + room for 4 more (roadmap) |
| **Board** | ~368,76 → ~1012×740 | none — hexes lie directly on the sea | Map + zoom pips bottom-left inside board space |
| **Chronicle spindle** (right) | 1440−44, 76 → 44×740 | `--ivory` rail rendered as a rolled scroll edge | Click/hover-hold opens 380px papyrus overlay sliding over the sea (z50, does **not** reflow the map) |
| **Vase-foot rail** (bottom) | 0,832 → 1440×68 | `--vase-black` lacquer band, full-width | Left: 6 resource pills (ivory tnum numerals + tinted mask icons, ~440px). Center: **verb tray** — 7 verbs à ~68px. Right: deck counters + END TURN clay seal (~300px) |

**Map gain:** today's map column is ~745px wide at 1440; this layout yields ~1012px — **+35% board width**, from deleting the right actions panel (verbs → rail) and collapsing chronicle to a spindle.

### Zones @1280×800

Chart margin 52px; ledger 300px (36px spine, tab labels go icon+2-letter); rail 64px (verbs 60px, labels stay); spindle 40px. Board ≈ 908×684 — versus ~610px today. Event-card slips collapse to art-only 48px squares with tooltip titles. Roster seats compress to token + 2 stats.

### Float vs dock / elevation model

- **z0** table (sea chart) → **z1** hex pieces → **z2** board tokens → **z10** laid chrome (margin, tablet, rail, spindle) → **z50** chronicle overlay, dropdowns → **z70** tooltips → **z100** modal scrim + raised object.
- **Shadow policy:** laid objects (z10 and below) get *only* the 2px thickness edge — no blur, ever. Floating objects (z50+) get exactly one shadow: `0 8px 24px rgb(24 18 16 / 28%)`. "Does it cast a shadow?" is the literal definition of floating. Existing `--shadow`/`--lift-shadow` are replaced by this single `--float-shadow`.

---

## 4. Component grammar

### The ONE panel treatment: "the laid object"

Opaque material fill + 2px bottom thickness edge (`color-mix(in srgb, <material> 88%, #181210)`) + 10px radius (or chamfered corners on the ledger tablet only). No border, no backdrop-filter, no gradient. Interior hierarchy: `type-label` section heads, 1px `--ink-12` hairlines inset 12px from both edges, spacing steps of 8/12/20px. That is the entire vocabulary. The ornate corner-mark frame asset is retired from chrome and reserved for ceremony modals.

### Buttons

- **Primary (END TURN):** circular-ended seal bar, `--clay-deep` fill, `--ivory` Marcellus caps, hourglass mask icon in ivory. Hover: fill lightens to `--clay`. It is the only saturated fill on the rail — unmissable.
- **Verb (on the vase-foot rail):** no fill, no border. Engraved icon 20px + `type-label` in `--bone`; cost line beneath in 12px tnum `--bone` at 70%. Hover: text/icon → `--ivory` + 4% ivory fill wash. Active/armed verb: `--clay` lozenge fill behind, ivory content. **Disabled: content drops to 32% bone and the cost line swaps to the blocking reason** ("need 20 gold") — on the black rail the dimming is unambiguous at a glance, no opacity-on-border mush.
- **Ghost (inline actions, "view table", tab-like links):** `--clay` caps text, hairline underline appears on hover. Never a box.

### Chips & stat rows

Chips are abolished. A stat is `icon(14px mask, semantic tint) + tnum numeral + optional (+delta)` set inline; a stat *row* in the ledger is a two-column hairline-ruled line (label left, stats right). Deltas: `--olive` positive, `--clay-deep` negative, parenthesized, `type-caption` size.

### Tooltip

Black-figure: `--vase-black` fill, 8px radius, `--ivory` text, `--ochre` numerals, terracotta-tinted icon — the inverse material instantly reads as "hovering above the table." One `--float-shadow`. 240ms delay, 120ms fade.

### Vertical tab system (ledger spine)

Tabs are clay index-tabs protruding from the tablet's left edge, like markers in a codex. Inactive: `--slip-shade` fill, `--ink-66` icon + 10px vertical label. Active: **same `--bone` fill as the tablet content, physically connected** (no seam — one shape), `--ink` icon, 3px `--clay` tick on its outer edge. Hover: slip lightens. No borders anywhere; the active state is literal material continuity. Scales to 9+ tabs at 44px each.

---

## 5. Board treatment

The hexes become **ceramic pieces laid on the sea**: each hex is separated from its neighbors by a 2.5px gap where the sea chart shows through — the "grout" that makes the board tactile without a single stroked border. The current white dashed coastline ring is deleted; the sea gap *is* the coastline.

### Ground ramp (Constraint A honored — terrain stays quiet)

- Plains `--bone #f4e6c8` · Hills `--slip-shade #d8c8a8` · Forest `#cbbd9a` (slip-shade −8% lightness; one new derived token `--slip-deep`) · Mountain `#bfb49b` (stone-gray shifted slip).
- Tile kind is carried by **shape emblem**: the existing engraved terrain emblems, rendered as masks in `--ink-30`, top-center, ~22px. Zero resource hue on terrain — the green/orange checkerboard in today's screenshot is gone; resource identity lives in the emblem and in the ledger/pills.
- Subtle radial slip variation (±2% lightness noise per tile, deterministic by coordinate) so 37 tiles read as handmade pieces, not vector fill.

### States

- **Hover:** ground lightens +3%, cursor tile lifts nothing (no transform on terrain — Constraint C, quiet board). 120ms.
- **Selected:** 2px `--aegean` inner rim (inset 3px) + emblem darkens to `--ink-48`.
- **Legal target:** 2px `--ochre` inner rim + 5% ochre fill wash. Static — no pulsing.
- **Owned:** 2.5px inner glaze rim in the owner's player color (inset 1px, under any state rim). This is the *only* owner color that ever touches the tile ground, and it's a rim, not a tint.
- **Fog / out-of-play:** ground drops to `--terrain-neutral-shade #9f8e70` at 80% saturation of ambient, emblem at `--ink-12`, no grout highlight — reads as unfired clay.

### Tokens (kills the white-pip debug look)

All tokens are **flat lacquered pieces**: solid glaze fill, 1.5px `--ivory` rim, engraved ivory glyph, single-pixel `--vase-black` outer contact line (the piece's own silhouette, not a UI border).

- **Settlements** (existing mask assets reused): Metropolis = 36px stepped-plinth disc, capital-star glyph; City = 30px disc, city-gate glyph; Colony = 24px disc, pennant glyph. Owner glaze fill + ivory glyph + 9px Greek-letter blazon at disc base.
- **Pops:** glass-counter beads in an arc along the tile's lower edge. Citizen = 10px solid bead (owner glaze, ivory rim); Freeman = 10px ring bead (glaze ring, bone center); Slave = 8px `--vase-black` bead. More than 5 pops: one bead of each present class + a 14px vase-black count chip with ivory tnum numeral.
- **Building slots:** up to 4 shallow sockets, 14px squares of `--ink` at 6% carved *into* the tile ground (recess, not box), row above the pop arc. Built = engraved building icon token, `--vase-black` glyph on `--bone` square — buildings stay neutral pieces; ownership is already declared by the settlement and glaze rim, so the board doesn't drown in owner color.

### Zoom levels (2 LODs)

- **Far** (hex short-radius < 38px): settlement disc + blazon, pop *count* chip only, no sockets, emblem hidden on owned tiles.
- **Near** (≥ 38px): full detail — emblem, sockets, individual beads.
Zoom pips stay bottom-left of the board space, restyled as two vase-black round buttons.

---

## 6. Modal grammar

**One scaffold:** *the raised object.* Scrim = `--vase-black` at 45% with 2px blur; a single material object centered, entering with a 4px rise + fade (180ms). One `--float-shadow`. Escape and backdrop-click always close — **except** blocking resolutions (riot table, mandatory event), where Escape no-ops and the footer states "This must be resolved." All three current modal grammars converge here.

**The ceremony dial** (same scaffold, material + ornament stepped up):

- **Dial 0 — routine picker** (Grow, Move target, confirmations): `--ivory` paper sheet, 360–440px, `type-title`, body copy, verb buttons. No frame, no texture.
- **Dial 1 — act tablet** (Calm, Venture, bank exchange, compendium, d6/d20 event tables): `--bone` ceramic tablet, 560px, chamfered corners matching the ledger, **one** engraved keyline border (the single ornament allowed at moments per Constraint B), `type-ceremony` title with a Greek-key hairline flourish beneath.
- **Dial 2 — event card:** the existing ornate parchment cards, presented at ~420×620, untouched — they are the fidelity north star.
- **Dial 3 — game over:** full-bleed black-figure vase panel: `--vase-black` field, terracotta figures (Nano Banana batch), victor's glaze color in the laurel.

**Event-table presentation (d6/d20):** rows are hairline-ruled ledger lines on the tablet; left column = die face numeral(s) in `type-stat` tnum within a 28px engraved die glyph; d20 tables render as two 10-row columns. Pre-roll: all rows equal. Rolled: the struck row gets a `--clay` 8% wash + 3px clay left tick + the physical die icon lands beside it; other rows drop to `--ink-48`. Insurance/mitigation options render as ghost buttons in the row.

---

## 7. Icon plan

**The one language: engraved single-color line glyphs** — the terracotta atlas family survives and becomes law; the modern self-colored theatre masks and all emoji-in-text die.

**Construction rules:** 24-unit grid, 2-unit stroke at 24px, squared caps, 45° miters (Greek-key spirit), interior detail strokes 1.5-unit, solid fills only as counters ≤20% of glyph area, silhouette must survive at 14px. Every icon ships as a **mask** (currentColor-tintable, the existing `resourceCssVars` pipeline extends to all icons) in one neutral source; ceremony surfaces may additionally use the terracotta duotone engraved render of the *same drawing* — one drawing, two renders, so chrome and cards stop speaking different languages.

**Sizes/formats:** source 512px via Nano Banana → `remove-bg` → mask derivation (existing pipeline, Constraint E); shipped at 24 (verbs, tabs), 20 (panel titles), 14 (inline stats). SVG hand-cleans preferred where a glyph is geometric (dice, ladder).

**Survives as-is:** 6 resource masks, 3 settlement glyph masks, terrain emblems, building line icons.
**Regeneration batch (Nano Banana, one style-locked session):**

1. Bank / trapeza — money-changer's table with scale
2. Calm — laurel branch over amphora
3. Social ladder — three-rung ladder with figure
4. Venture: voyage — trireme prow
5. Venture: oracle — tripod with vapor
6. Venture: caravan — laden mule
7. Riot — toppled amphora with torch
8. Event table: seasonal — wheat wreath tablet
9. Event table: events — lightning tablet
10. Event table: riot — cracked tablet
11. Event table: venture — wave tablet
12. Happiness masks pair — engraved comedy/tragedy (replacing the green/red modern masks; tint via status colors in CSS)
13. d6 + d20 die glyphs
14. Compendium — open scroll
15. Chronicle spindle — rolled scroll end
16. Greek-letter blazons Α–Ζ (vector, not banana)
17. Forward slot: Assembly (voting urn with pebbles) — draw now, ship Phase 3

---

## 8. Motion

**Durations/easings:** micro 120ms, standard 180ms, ceremony 320ms. One easing for settling: `cubic-bezier(0.2, 0, 0, 1)`; ceremony entries: `cubic-bezier(0.16, 1, 0.3, 1)`.

**Animates:**
- Resource deltas: +N/−N floats up 12px and fades from the pill, 320ms, `--olive`/`--clay-deep`.
- Token placement: piece lands with scale 1.06→1.0 settle, 180ms — the click of a piece put down.
- Modal raise: opacity + 4px translate, 180ms; scrim 120ms.
- Dice: 400ms — three-frame face flicker then hard settle + row highlight; no physics, no 3D.
- Turn handoff: `--clay` acting-underline slides across roster seats, 240ms; incoming player's seat blazon does one settle tick.
- Chronicle overlay: slides 380px from the spindle, 240ms.

**Never animates:** terrain, panel layout, text reflow, tab content (instant swap), hover states beyond 120ms fills, nothing idles or loops — a table at rest is still. Legal-target rims are static. `prefers-reduced-motion` collapses everything to opacity 120ms.

---

## 9. Trade-offs, risks, migration

**Sacrifices.** (1) Airy minimalism — this is a dense, warm, material screen; players who want a cool dashboard won't get one. (2) The parchment-app feel of today's shell: chrome sits on teal sea, a bigger visual commitment; if the chart margin/rail tones are mistuned the top and bottom can feel like different apps. (3) Translucency and blur (cheap depth) are surrendered for opaque materials — depth must be earned by tone discipline. (4) A dark mode / black-figure full theme is explicitly deferred.

**Where it could fail.** Tone-only hierarchy collapses if the 3-tan ramp is loosened — one rogue `#efe0bd` and the materials go muddy; enforce with a stylelint color allowlist. The vase-black rail is high-contrast real estate: if verbs overflow (Phase 3+ adds verbs) the rail must scroll-snap or group before it shrinks type. Nano Banana style-lock across 17 glyphs is the flakiest step — budget a re-roll day and lock a reference sheet prompt. The sea-gap grout depends on the map SVG owning its own background; if map pans under chrome, grout must clip.

**Migration estimate (evolution, not rewrite — Constraint E):**

| Area | Size | Notes |
|---|---|---|
| Token collapse + material vars in `base.css` | **S** | mostly deletions; new `--player-1..6`, `--slip-deep`, `--float-shadow` |
| Webfonts + 8-role type sweep | **M** | 2 woff2 files; mechanical replacement of ~50 font combos |
| Shell/layout re-zone (margin, rail, spindle, verb move) | **L** | the big one; ledger vertical tabs land here per the existing todo |
| Board: grout, ground ramp, token/bead/socket SVG | **M–L** | pure SVG/CSS in HexMap; settlement masks reuse |
| Modal unification + ceremony dial + Escape handling | **M** | one scaffold component, three dials |
| Icon regeneration batch | **M** | existing banana + remove-bg + mask pipeline |
| Motion pass | **S** | one easing token, 6 keyframes |

Start order for a developer tomorrow: token collapse → type roles → panel de-boxing (delete frames, add thickness edges) → rail + verb move → board tokens → modals → icons.


---

# 3 · STRATEGOS — full specification

# STRATEGOS — The Black-Figure Command Deck

THESIS: Full-bleed Aegean map framed by slim vase-black ceramic chrome: the board is the sunlit clay, the interface is the black glaze — a flat AAA-strategy HUD (Civ VI / Old World lineage) that speaks Kerameikos natively, with inscriptional caps, one panel treatment, and ceremony spent only on cards.
AXES: Representation: direct-but-emblematic (real tokens, engraved glyphs, no illustration on terrain) · Ceremony: low in chrome, high at card/dice moments (a sharp dial, not a slider) · Density: high, disciplined — more information per pixel than today, delivered via type and hairlines instead of boxes.

# STRATEGOS — The Black-Figure Command Deck
## Complete art direction for Hegemony

**Thesis.** The map is the vase's clay ground; the interface is the black glaze painted around it. Chrome collapses to two slim vase-black bands (top command band, bottom verb bar) plus floating dark slabs (ledger, chronicle) over a full-bleed board. Hierarchy comes from inscriptional caps, tabular numerals, and 1px hairlines — never from nested boxes. Ornament budget is spent at exactly three moments: event/venture cards, dice tables, game over. Everything else is flat, fired, and quiet.

**Axes.**
- *Abstract ↔ direct:* direct-but-emblematic. Real ceramic tokens on tiles, engraved line glyphs, zero illustration on terrain (honors the rollback in `docs/resource-color-rollback-note.md`).
- *Casual ↔ ceremony:* chrome is casual-readable at all times; ceremony is a dial that snaps to 11 only for cards, riots, and game over.
- *Density:* high. The dark bands hold more data than today's parchment panels because dark ground + bone type + tnum numerals reads denser cleanly.

**The three-value composition** (this is the whole trick): vase-black chrome (dark) / painterly teal sea (mid, kept as-is — it is the contrast anchor) / ceramic island + parchment cards (light). Every screen reads as a black-figure amphora: dark glaze, clay figures, incised line.

---

## 1. PALETTE

### 1.1 Core ramp (collapsed)

**Inks — exactly 3** (replaces today's 7 near-blacks):

| Token | Hex | Role | Maps from |
|---|---|---|---|
| `--glaze-0` | `#181210` | Chrome ground: bands, rail, tooltips, dark slabs | `--vase-black` (exists) |
| `--glaze-1` | `#241915` | Raised chrome: floating panels, hover rows, modal tier-0 | `--ink-2` (exists) |
| `--ink` | `#241910` | Text/line ink on light surfaces (cards, board labels) | `--fg` (exists) |

Every other near-black in the codebase is deleted and re-pointed at one of these three.

**Tans — exactly 3** (replaces 10 near-dupes):

| Token | Hex | Role | Maps from |
|---|---|---|---|
| `--ivory` | `#FFF8E7` | Card/parchment surfaces, brightest text on dark | `--ivory` (exists) |
| `--bone` | `#F4E6C8` | Body text on dark chrome, icon tint on dark, card body ground | `--bone` (exists) |
| `--ceramic` | `#D8C8A8` | Hex terrain ground — the ONLY tan allowed on the board | `--terrain-neutral` (exists) |

Delete `--terrain-neutral-light`, `--terrain-neutral-shade`, and every literal tan in component CSS; derive shades as alpha of `--ink` over `--ceramic`.

**Chroma (unchanged, these are the brand):** `--clay #C0461C` (accent/action), `--clay-deep #8F2E13`, `--ochre #D98A35`, `--olive #5E6E3A`, `--aegean #1F6977`, `--oxblood #722420`, `--stone #8F8571`. All already exist in `.shell`.

**Hairlines & surfaces on dark** (new tokens, one place):
- `--line-on-dark: rgb(244 230 200 / 16%)` (from the showcase's `--line-dark`)
- `--line-on-dark-strong: rgb(244 230 200 / 30%)`
- `--slab: rgb(24 18 16 / 92%)` — the one panel fill, always with `backdrop-filter: blur(10px)`
- `--muted-on-dark: rgb(244 230 200 / 68%)`, `--subtle-on-dark: rgb(244 230 200 / 44%)`

Contrast: `--bone` on `--glaze-0` ≈ **12.8:1**; `--muted-on-dark` ≈ 8.4:1; ivory on `--clay` ≈ **5.0:1** (primary button); clay on glaze-0 ≈ 3.4:1 — clay is therefore *accent-only* on dark (rules, active-tab notches, ≥18px display numerals), never body text.

### 1.2 Player colors — re-derived (kill the Tailwind primaries)

Today's `#1e3a8a/#eab308/#7c3aed/#c1121f` are off-brand and clash. Replace with the classic boardgame six restated in fired ceramic. Every settlement token also carries an engraved Greek ordinal (Α Β Γ Δ Ε Ϛ) as shape redundancy, so color is never the sole channel.

| Seat | Name | Hex | approx L* | Notes |
|---|---|---|---|---|
| 1 | Aegean | `#1F6977` | ~40 | existing token, cool anchor |
| 2 | Oxblood | `#7A1F14` | ~22 | darker + duller than UI `--clay` so it never reads as "action" |
| 3 | Honey | `#D98A35` | ~64 | = `--ochre`; brightest chroma seat |
| 4 | Olive | `#5E6E3A` | ~44 | existing token |
| 5 | Glaze | `#181210` | ~8 | black-figure seat; 1.5px bone inner keyline mandatory |
| 6 | Slip | `#FFF8E7` | ~97 | white-ground seat; 1.5px ink keyline mandatory |

Colorblind math: luminance ladder 8 / 22 / 40 / 44 / 64 / 97 L*. The only near-pair is Aegean/Olive (ΔL* ≈ 4) — they are hue-opposed on the blue axis (cyan vs green), which survives deutan and protan vision; the ordinal glyph covers tritan. Against `--ceramic` ground (L* ≈ 81) every token ≤ L*64 clears ΔL* ≥ 17, and all tokens wear a 2px `--ink` keyline regardless, so the ground never swallows them. Yes, Honey = the gold resource hue — acceptable because resource hues live only in pills/icons (constraint A) and owner color lives only on tokens/rims; the two never co-occur on the same surface.

### 1.3 Status colors

| Meaning | On light (cards/board) | On dark chrome | Reconciliation |
|---|---|---|---|
| Positive | `--olive #5E6E3A` | `--olive-lit #9DAE6B` | olive stays "growth/yield" |
| Negative | `--clay-deep #8F2E13` | `--clay-lit #E06A4A` | keeps negative in the clay family but never equal to `--clay` action color |
| Warning | `--ochre #D98A35` | `--ochre-lit #E8A44B` | ochre = attention/cost, matching cost chips |

Happiness ≤ 0 states use negative; riot-imminent (−4) uses warning pulsing to negative at −5. Retire the self-colored green/red theatre masks (see §8).

---

## 2. TYPE

### 2.1 Families (self-hosted, licensed)

- **Display: Cinzel** (SIL OFL 1.1, Google Fonts, self-host woff2 ~30KB/weight; weights 600+700). The free inscriptional Trajan — Roman square capitals, exactly the Copperplate intent but cross-platform. Fallback stack: `Cinzel, Copperplate, "Copperplate Gothic Light", Georgia, serif`.
- **Body: Alegreya** (SIL OFL 1.1, self-host; weights 400/500/700 + italic 400). Old-style calligraphic serif that stays legible at 13px UI sizes, warmer than Iowan and available everywhere. Fallback: `Alegreya, "Iowan Old Style", "Palatino Linotype", Georgia, serif`.
- Ship both as `@font-face` woff2 with `font-display: swap`; total budget ≈ 180KB.

### 2.2 Ratified role scale (@1440 — 8 roles, 7 sizes, kills the 36-size anarchy)

| Role | Family | px | Weight | Tracking | Case | Use |
|---|---|---|---|---|---|---|
| DISPLAY | Cinzel | 28 | 700 | 0.06em | UPPER | Card titles, game over, modal tier-2 |
| PANEL-TITLE | Cinzel | 15 | 700 | 0.08em | UPPER | Ledger/Chronicle headers, modal tier-0/1 titles |
| VERB | Cinzel | 13 | 700 | 0.10em | UPPER | Verb bar, primary buttons, tab labels |
| SECTION-LABEL | Cinzel | 11 | 600 | 0.14em | UPPER | The one micro-label (replaces all 12 re-implementations), `--muted-on-dark`/`--muted` |
| BADGE | Cinzel | 10 | 700 | 0.12em | UPPER | Cost chips, count badges, seat ordinals |
| STAT-NUM | Alegreya | 15 | 700 | 0 | — | All quantities; `font-variant-numeric: lining-nums tabular-nums` |
| BODY | Alegreya | 14 | 400 | 0 | Sentence | Card text, tooltips, descriptions; line-height 1.45 |
| CAPTION | Alegreya | 13 | 400 | 0.01em | Sentence | Chronicle entries, table rows, footnotes |

At 1280×800 the scale drops one notch via a root `font-size` step (16 → 15px) — roles are defined in rem so this is one line.

**Tabular numerals plan:** every resource pill, ledger stat, cost chip, and dice-table result uses the STAT-NUM role with `tnum lnum` (Alegreya ships both features; verify with `font-feature-settings` smoke test at build — if a subset build strips them, keep the full-feature woff2 for the numeric weight only). Cinzel numerals appear only in DISPLAY contexts (year numeral, card headers) where alignment doesn't matter. No numeral ever renders in old-style figures inside chrome.

---

## 3. LAYOUT ANATOMY

The shell becomes full-bleed: delete the 16px page padding, the `max-width: 1520px` clamps, the 3-column `.workbench` grid, and the parchment `--hero-tableau` page background (the map IS the background). `100svh`, zero page scroll, unchanged.

### 3.1 Zone map @ 1440×900

```
┌──────────────────────────────────────────────────────────────┐
│ TOP COMMAND BAND — 52px, --glaze-0, hairline bottom          │
│ [medallion 44px][resources 6× ~88px][event slivers 2× 120px] │
│ [———— turn banner (center) ————][roster 4-6 chips][menu]     │
├──┬───────────────────────────────────────────────────────────┤
│L │                                                           │
│E │                                                           │
│D │            FULL-BLEED MAP  1388 × 784                     │
│G │            (painterly sea edge-to-edge)          ┌──────┐ │
│E │  ┌─────────────┐                                 │CHRON.│ │
│R │  │ LEDGER PANEL│ (slide-out overlay, 300px)      │ feed │ │
│  │  └─────────────┘                                 └──────┘ │
│52│                                                           │
├──┴───────────────────────────────────────────────────────────┤
│ VERB BAR — 64px, --glaze-0, hairline top                     │
│ [7 verb buttons, centered][deck chips][END TURN 176px, clay] │
└──────────────────────────────────────────────────────────────┘
```

**Pixel budgets @1440×900:** top band 52 · verb bar 64 · ledger rail 52 (always visible, icon tabs) · ledger panel 300 (overlay, slides from rail, pinnable) · chronicle slab 320×~240 (bottom-right float, collapsed to a 1-line ticker by default) · map viewport **1388×784 always** (vs today's ~740×745 — the map more than doubles in width even before closing panels; constraint C satisfied loudly).

**@1280×800:** band 48 · bar 60 · rail 48 · panel 288 · map 1232×692. Roster chips compress to color-dot + score; resource pills drop deltas into hover; event slivers become icon-only. Nothing wraps, nothing scrolls.

**Where everything lives:**
- **Season medallion + year** — top-left, first object, 44px disc (bone line-engraving on glaze).
- **Resources** — top band, left cluster after medallion (Civ-style): masked icon + STAT-NUM + delta. No pill boxes — icon/number pairs separated by 20px, hairline-free. Replaces the bottom resource band entirely.
- **Event cards** — two 120×36 "slivers" in the band: card-back thumbnail + truncated name; click opens the tier-1 card modal. The parchment card art appears at ceremony size only.
- **Turn banner** — dead center: `YOUR TURN — DAMON` in VERB role, seat-color underline rule 2px.
- **Roster** — top-right: per seat a chip = seat-color disc (ordinal engraved) + name + score numerals; acting seat gets a clay underline sweep. Scales 2–6 seats by dropping name → ordinal only below 1366px.
- **Ledger** — left vertical icon rail (constraint F: vertical tabs, room for 8+): Cities, Build, Pops, Market, Victory, + future Compendium/Assembly. Rail is part of chrome; panel is a `--slab` overlay that pushes nothing.
- **Verbs** — bottom bar center: Grow · Move · Found · Upgrade · Build · Calm · Venture. Deck-count chips (Seasonal 28/29, Events 73/74) sit right-of-verbs as BADGE-role text. **END TURN** anchors the right end, solid clay.
- **Chronicle** — bottom-right floating slab above the verb bar; default = latest entry as one ticker line; click expands to 240px feed; pin available.

**Floats vs docks:** bands and rail are docked (part of chrome); ledger panel, chronicle, tooltips, modals float. Nothing else floats — no free windows.

**Z / elevation model (5 layers, tokened):** `z-0` map & tiles → `z-10` tile overlays (hover/selection strokes) → `z-100` chrome bands + rail → `z-110` floating slabs (ledger panel, chronicle) → `z-200` tooltips → `z-300` modal scrim + stele → `z-400` toasts/turn banner sweep. Elevation is expressed by exactly two shadows: `--shadow-slab: 0 8px 28px rgb(0 0 0 / 35%)` (floats) and `--shadow-stele: 0 28px 80px rgb(0 0 0 / 42%)` (modals, from the showcase's `--shadow-dark`). Delete all other shadows.

---

## 4. COMPONENT GRAMMAR

### 4.1 The ONE panel treatment: the Glaze Slab

```css
.slab {
  background: var(--slab);            /* rgb(24 18 16 / 92%) */
  backdrop-filter: blur(10px);
  border: 0;
  border-top: 1px solid rgb(192 70 28 / 45%);  /* single clay hairline — the only ornament */
  border-radius: 10px;
  box-shadow: var(--shadow-slab);
}
```
That's it. No corner marks, no double frames, no inner borders — the ornate red corner ornaments die everywhere except cards. Docked bands are the same recipe with `border-radius: 0` and the hairline on the map-facing edge. **Internal hierarchy with zero nested boxes:** SECTION-LABEL runs in `--muted-on-dark` + 1px `--line-on-dark` rules between groups + an 8px spacing grid (8/16/24). Rows separate by rule, never by background; hover rows tint `--glaze-1`.

### 4.2 Buttons

- **Primary (END TURN, modal confirm):** solid `--clay`, ivory VERB text, radius 8, no border; hover → `--clay-deep` + 1px translateY; active → flat. The only filled button on screen.
- **Verb:** transparent on the bar; 20px bone masked icon over VERB label; hover → text ivory + 2px clay underline slides in (150ms); the affordance is the underline, not a box. Cost renders as an ochre BADGE chip beside the label (`FOUND · 20 wood`-style, icon+numeral).
- **Ghost:** text-only, `--muted-on-dark`, underline on hover. Used for "cancel", tab actions, chronicle expand.
- **Disabled — reads at a glance:** icon and label drop to `--subtle-on-dark` (44% bone), the cost chip disappears entirely, and a 1px strike-rule renders under the label instead of the hover underline. Three simultaneous signals; no 45%-opacity mush over a border. Hover still allowed → tooltip states the unmet requirement ("Needs 20 wood — you have 14").

### 4.3 Chips, stat rows, tooltip, tabs

- **Stat row (ledger):** `[masked icon 16px] [label CAPTION] [spring] [value STAT-NUM] [delta ±colored]` — one line, rule below, no container.
- **Cost/count chip:** BADGE text in status color, no background below 3 characters; ≥3 chars get a `rgb(244 230 200 / 8%)` wash, radius 4 — a tint, not a box.
- **Tooltip:** glaze slab, 6px radius, max-width 280, BODY text, PANEL-TITLE header, 120ms fade + 4px rise; clay hairline top. One tooltip component everywhere (verbs, pills, tiles, roster).
- **Tabs (vertical rail):** 48px icon cells; active = 3px clay notch on the left edge + icon tinted `--clay` + label tooltip; inactive = bone 60%. Horizontal tab variant (inside modals) = same grammar rotated: 2px clay underline. No tab pills, no tab boxes, room for every roadmap tab.

---

## 5. BOARD TREATMENT

### 5.1 Ground

Keep the painterly teal chart sea full-bleed. Island hexes are flat ceramic with a whisper of terrain value (all within ΔL* ≤ 5 of `--ceramic #D8C8A8`, hue shifts ≤ 8°, honoring the rollback):

- plains `#DFD2AE` · hill `#DCC9A0` · forest `#D2C9A4` · mountain `#CFC3AC`

Terrain *kind* is carried by the existing engraved emblem (terrain atlas) rendered at 20% `--ink` opacity, ~34px, upper-center of the hex — an incision in the clay, never a picture. Hex mortar lines: 1px `--hex-line` (exists). Resource hues never touch terrain (constraint A); yields appear only in tooltips and ledger.

### 5.2 Interaction states (stroke-only, fills stay quiet)

- **Hover:** 2px inset ivory 70% stroke, 120ms.
- **Selected:** 2.5px `--clay` stroke + 6px clay outer glow at 25%; persists until deselect/Escape.
- **Legal target:** 2px `--aegean` stroke + `rgb(31 105 119 / 10%)` fill wash; appears with a single 250ms ease-out, **no idle pulsing**.
- **Illegal-hover during a verb:** 1.5px `--stone` stroke, cursor not-allowed.
- **Neutral/unowned:** ground desaturated to `#CEC4B0`, emblem at 12%.
- **Fog (future):** bone paper fill `#EADCBC` + faint meander border, no emblem.

### 5.3 Tokens on tiles (kills the white-pip debug look)

All tokens are "fired ceramic pieces": flat owner-color fill, 2px `--ink` keyline, one 1px bone inner ring, tiny baked shadow (`0 1px 2px rgb(24 18 16/30%)`). Sizes at zoom 1:

- **Settlement disc — 36px**, center-lower hex. Owner-color glaze; kind glyph in bone using the existing masks (`--capital-glyph` star = Metropolis, `--city-glyph` gate = City, `--colony-glyph` flag = Colony); seat ordinal (Α–Ϛ) engraved at the disc base, 8px. Replaces the primary-color squares/triangles.
- **Pop beads — 12px**, ranked along the hex's lower edge, bone-fill with ink keyline; ladder by shape: citizen = disc with center ink dot, freeman = hollow disc, slave = short bar. >4 pops collapses to one bead + `×N` STAT-NUM chip. Replaces circled-dot pips.
- **Building sockets — 10px**, up to 4 across the hex's upper edge: empty = 30%-ink recessed rounded square; built = socket filled bone with the building's line glyph in ink. Replaces white squares.
- **Owner rim:** owned tiles get a 4px inner hex stroke in seat color at 22% opacity — ownership readable at any zoom without coloring terrain.

### 5.4 Zoom (3 stops: 0.75 / 1.0 / 1.4)

- **0.75:** hide sockets and beads; settlement disc + `×N` pop chip + owner rim only.
- **1.0:** everything above.
- **1.4:** add hover yield hints (icon+numeral badge, tooltip-style) and socket tooltips.

---

## 6. MODAL GRAMMAR — the Stele, with a ceremony dial

One scaffold: centered element over scrim `rgb(24 18 16 / 55%)` + 4px backdrop blur, entering 300ms `cubic-bezier(0.2, 0.8, 0.2, 1)` (rise 12px + fade). Three tiers of the same skeleton:

- **Tier 0 — routine picker** (Grow target, Move, Build choice, Calm/Venture confirm): a 420px glaze slab. PANEL-TITLE, BODY copy, stat rows, ghost-cancel + clay-primary. Matches chrome exactly — replaces both the plain cream card and the unthemed white dialog. Escape closes, backdrop-click closes, Enter confirms.
- **Tier 1 — card ceremony** (season/player events, ventures, riot): a 560px **ivory parchment card** — this is where the ornate engraved frame and sepia/terracotta duotone art live and ONLY where they live. DISPLAY title, art plate, BODY rules text. Escape/backdrop close *unless the card demands resolution*; blocking cards (riot roll) hide the close affordance and ignore Escape until rolled.
- **Tier 2 — game over:** full-bleed tableau, black-figure hero art on `--glaze-0`, meander border, laurel + DISPLAY at 40px, per-seat score ledger in STAT-NUM. No close; only "New Game / Review Board".

**Event tables (d6/d20):** inside tier 1, a ruled ledger — each outcome one CAPTION row `[die numeral in Cinzel] [rule] [result text]`; d20 tables split into two 1–10 / 11–20 columns inside an `overflow-x` guard. On roll: die glyph settles (see §9), the rolled row gets an ochre 12% wash + clay left notch, others drop to 55%. The same table component serves the compendium modal (constraint F).

---

## 7. ICON PLAN — one language: **Engraved Slip Line**

**Survivor:** the engraved terracotta line family (buildings, pops, terrain emblems). **Retired:** flat-tinted resource silhouettes get re-cut into line style (masks regenerate, CSS mask plumbing unchanged), the modern green/red theatre masks, and every emoji-like inline glyph.

**Construction rules:** 24px design grid, 2px stroke at 24px (scale stroke with size), rounded joins, 45° terminal cuts (incised look), single-color silhouette+line — no interior fills, no self-coloring. Delivered as white-on-transparent **mask PNGs at 512px** through the existing Nano Banana → `remove-bg` → mask pipeline; tinted by context via CSS mask: `--bone` on dark chrome, `--ink` on parchment, `--clay` when active/accent, status colors for happiness states. Used at 16 / 20 / 24 / 32px.

**Regeneration batch** (one Banana session, consistent prompt scaffold "Greek vase incised line icon, single-weight engraving"):

1. Resources ×6 re-cut in line style (wood, stone, gold, food, influence, unrest)
2. Happiness pair (comic/tragic masks) in line style — replaces the modern vectors
3. **Phase 1 gaps:** bank/trapeza (moneychanger's table), Calm (olive branch over krater), social ladder (three-rung ladder with pop silhouettes), ventures ×3 (trireme under sail / oracle tripod / charter scroll), riot (toppled krater with flame), event-table glyphs ×4 (season wheel, player scroll, riot d6, venture d6)
4. Dice pair: d6 pip cube + d20 (roadmap)
5. Chrome verbs ×7 + END TURN hourglass + compendium scroll + chronicle quill
6. Future-proof while the kiln is hot: assembly (Phase 3), port/amphora luxury badge (Phase 4)

~28 masks total. Numbers/rates never appear inside any icon (constraint F) — costs are always live text chips beside the glyph.

---

## 8. MOTION

**Durations/easings (4 tokens):** `--t-fast 120ms ease-out` (hover, tooltip) · `--t-move 200ms cubic-bezier(0.2,0.8,0.2,1)` (panel slide, tab notch, underlines) · `--t-modal 300ms` same curve (stele in/out) · `--t-drama 450ms` (dice settle, card flip).

**What animates:**
- Resource deltas: numeral ticks over 300ms + a `+N`/`−N` ghost drifts up 10px and fades over 600ms in status color.
- Turn handoff: roster chip's clay underline sweeps to the next seat (400ms); center banner crossfades.
- Dice: 3-frame glyph tumble settling in 450ms, then the table-row highlight lands after a 150ms beat — the pause is the drama.
- Ledger panel slide (200ms), chronicle expand (200ms), legal-target strokes appearing (250ms, once).

**What NEVER animates:** terrain, hex fills, idle loops of any kind, panel content on tab switch (instant swap — strategy players punish laggy tabs), scrolling embellishments, the sea. `prefers-reduced-motion` collapses everything to opacity-only at 80ms.

---

## 9. TOKEN MIGRATION MAP (constraint E receipts)

| Decision | Existing token it lands on |
|---|---|
| `--glaze-0/-1` | `--vase-black`, `--ink-2` |
| `--ceramic` + terrain whispers | `--terrain-neutral` family (collapse 4→1 + computed) |
| Slab replaces `--panel/--panel-strong/--panel-soft` | re-point all three, delete gradients |
| `--line-on-dark` | new; light-side `--line` retained for cards only |
| Buttons | re-point `--button-bg/--button-line` → transparent/none; primary = `--clay` |
| Shadows | `--shadow`, `--lift-shadow` → the two new shadows |
| Player colors | replace the 4 Tailwind literals in player config with the 6-seat table |
| Icons | same mask-PNG + CSS-mask plumbing, new source files |
| Fonts | `--font-display/--font-body` values swap; stacks keep current fallbacks |

CSS refactor + asset batch only; React structure changes are layout-level (shell grid, overlay panels), no canvas/WebGL, no rewrite.

---

## 10. TRADE-OFFS & RISKS

**Sacrificed:**
- The all-parchment "sitting at a wooden table" warmth. Chrome becomes videogame-confident; the boardgame soul retreats into the board and the cards. That's the bet: warmth at the moments, command the rest of the time.
- The parchment hero-tableau page background and today's decorated panel frames (including the corner ornaments the user's eye may secretly enjoy) — gone entirely from persistent chrome.
- Some glanceability of the always-open ledger: it becomes a slide-out, so city stats are one click away instead of zero (mitigated by pinning + richer on-map tokens).

**Failure modes:**
- Dark slabs over the busy teal sea can shimmer at panel edges → the 92% opacity + blur is load-bearing; do not lower it.
- Cinzel below 11px degrades → BADGE (10px) is capped at 4–6 characters, tracking 0.12em, uppercase only; if it fails in review, BADGE falls back to Alegreya 700.
- Black-figure seat (Glaze) vs vase-black chrome could merge in the roster → roster chips always sit on `--glaze-1` cells with the bone keyline; verify in the first build.
- Alegreya `tnum` survival through font subsetting must be smoke-tested before committing the pipeline.

**Migration estimate:** tokens/palette **S** · type system **S–M** (webfont hosting + role sweep across ~50 literal combos) · shell layout **L** (full-bleed grid, overlay ledger, verb bar, resource relocation) · component grammar **M** · board tokens **M** (SVG token components + state strokes) · modal unification **M** · icon batch **M** (28 masks through an existing pipeline) · motion **S**. Total: one focused theming phase, shippable behind the existing `.shell` scope with the current parchment theme as the rollback branch.


---

# 4 · JUDGE — Brand distinctiveness & craft

RANKING: KATALOGOS — The Catalogue of Ships > The Painted Table > STRATEGOS — The Black-Figure Command Deck

## KATALOGOS — The Catalogue of Ships — 78/100
CONSTRAINTS: A (quiet terrain, color=owner) PASS — best-in-class: derived tan ramp ΔL*≈4, owner as inner stroke only, hard 'status colors vs owner colors never share a pixel class' rule; RISK that 16%-ink terrain emblems are over-quiet (kind illegible at glance). B (one panel treatment, no boxes) PASS — the only direction that abolishes the panel outright; RISK: 1px 16%-alpha hairlines doing ALL zoning shimmer at fractional DPR (admitted) and can read as wireframe if spacing discipline slips. C (board space, no scroll) PASS — 832px board @1440, explicit 1280 compression, only internal scroll. D (type roles/tnum) PASS — strongest spec: 9 roles, verified Alegreya tnum, U+2212 signed deltas, CI grep enforcement. E (evolution, existing pipeline) PASS — token remaps are grep-driven deletions; RISK: icon batch is the largest (~36 masks + 6 duotones), rated L honestly. F (forward-compat) PASS — vertical rail to 8+, dial-1 modal as the density escape valve; density-creep under Phase 3–4 Assembly/Trade is the admitted structural weakness.
BEST IDEAS: The status-vs-owner pixel-class disambiguation rule (steal verbatim regardless of winner); unmet-cost numeral rendered solid red inside a dimmed verb (best disabled-state answer of the three); empty building slots invisible until selection/targeting; the 'four tools' hierarchy doctrine as a review checklist; CI grep banning literal font-size; ledger rows on a fixed 5-column tnum grid so the ledger literally ledgers.
FATAL FLAWS: Austerity bet: 'quiet-high museum catalog' risks reading as an editorial website, not a game — text-only verbs with no fill anywhere may fail first-click discoverability (admitted, unmitigated beyond hover states). Cinzel is the stock 'antiquity' Google font — every classical-themed jam game uses it; the type voice is tasteful but not ownable. Ochra (P3, L*64) vs terrain (L*~81) clears 3:1 only via keyline hand-waving — the lightest seat is genuinely marginal. Whole identity is one rogue border away from collapse; it demands the strictest ongoing governance of the three.

## The Painted Table — 71/100
CONSTRAINTS: A PASS — owner glaze as rim never tint, emblems in ink-30; RISK: ochre triple-duty (warning + gold resource + legal-target wash) puts a resource hue onto terrain as a state wash — defensible but the weakest A reading of the three. B RISK — the fill+thickness-edge law is clean and genuinely border-free, but four distinct material metaphors (chamfered tablet, scroll spindle, lacquer rail, ivory margin) is four panel treatments wearing one law; protruding clay index-tabs and 'rolled scroll edge' are silhouette ornament creeping back in — not box-on-box, but ornament-by-skeuomorphism. C PASS — 1012px board (+35%), 1280 plan solid; chronicle demoted to a hidden spindle costs glanceability in a log-heavy economic game. D PASS with a self-inflicted handicap: Marcellus ships one weight, so display hierarchy leans entirely on size/tracking — fragile at the 11px label floor. E PASS — token collapse maps to existing hexes; shell re-zone honestly rated L; 17-glyph style-locked Banana batch flagged as the flakiest step. F PASS — 44px spine scales to 9+ tabs; verb-rail overflow at Phase 3+ flagged with a mitigation.
BEST IDEAS: The black-figure inverted tooltip (vase-black ground, ivory text, ochre numerals) — instantly reads as 'above the table', steal it whoever wins; the sea-gap grout where the chart shows through between hexes (coastline = absence, kills every stroked border); Greek-letter blazons Α–Ζ making CVD safety structural on day one; the 2px same-hue-darkened thickness edge as the universal border replacement; deterministic ±2% per-tile lightness noise so vector hexes read handmade; 'one drawing, two renders' icon policy unifying chrome masks and card duotones; stylelint color allowlist as palette enforcement.
FATAL FLAWS: Leukos (P4, #f2e3c2) is 2 points of lightness away from --bone #f4e6c8 — the default 4th seat's glaze is visually identical to the plains hex fill and the ledger tablet; rim + blazon carry everything, and the 2.5px owned-tile rim in near-bone on bone ground is functionally invisible. Rim soup: owner rim + selection rim + legal-target rim can stack three colored inset rings on one tile. The three-material screen (ivory top / bone left / black bottom) risks reading as three apps taped together — admitted, and it is the direction's central compositional gamble. Toy-tactile 'direct objects' axis quietly contradicts the user's recorded 'flat AAA-strategy' vision.

## STRATEGOS — The Black-Figure Command Deck — 63/100
CONSTRAINTS: A PASS — terrain whispers ΔL*≤5, owner as 22% inner rim, Honey/gold hue collision explicitly defended by surface separation. B MIXED — one slab recipe with a single clay hairline is disciplined on paper, but rgb(24,18,16/92%) + backdrop-blur(10px) is glassmorphism, and the 6px clay outer glow on selected hexes violates its own flat doctrine; the blur is admitted to be 'load-bearing' over the busy sea — a fragile foundation. C PASS, loudest — 1388×784 full-bleed map; but bought by demoting the ledger to a slide-out and the chronicle to a one-line ticker, a glanceability regression the game's economic loop will punish. D PASS — 8 roles, tnum smoke-test flagged, 10px Cinzel BADGE with a stated fallback. E PASS — the token-migration receipts table is the best constraint-E work in the field; layout honestly L. F PASS — rail scales, tier system covers compendium/tables, d20 overflow guard specified.
BEST IDEAS: The token-migration receipts table format (every decision names the existing token it lands on) — adopt as a deliverable requirement for whichever direction wins; -lit status variants (--olive-lit/--clay-lit/--ochre-lit) solving status color on dark, needed by any dark-surface moment (tooltips, game over) in all directions; the three-signal disabled verb (dim + cost chip removed + strike-rule); the 150ms beat between die settle and row highlight ('the pause is the drama'); the black-figure full-bleed game-over tableau; seat ordinals Α–Ϛ.
FATAL FLAWS: Most generic execution of the three: dark blurred HUD slabs, resources top-left, left icon rail, clay accent — this is the default modern-4X skin with Kerameikos color names; it cites Civ VI/Old World and then borrows their furniture rather than their discipline. The brand's actual equity — parchment, the event cards, the warm table — is exiled to modals, producing a two-world identity where chrome and ceremony feel like different games. Directly contradicts the recorded user preference for 'flat AAA-strategy look ON THE PARCHMENT THEME'. Glaze seat (#181210 = chrome color) as a player color is a self-identified hazard patched with keylines rather than removed.

---
LENS: brand distinctiveness + craft, judged against ground truth (03-board-clean.png, modal-venture.png): the current build is box-on-box chrome, Tailwind-primary tokens on resource-tinted terrain, white debug pips. Constraint letters below follow the brief as embedded in the directions: A quiet terrain / color=owner only; B one panel treatment, no nested boxes; C board space + no page scroll at 1440/1280; D ratified type roles + tabular numerals; E evolution on existing tokens/pipeline, not a rewrite; F forward-compat (8+ vertical tabs, d6/d20 tables, compendium, Phases 3–4).

VERDICT — KATALOGOS (78) > PAINTED TABLE (71) > STRATEGOS (63).

1. KATALOGOS wins on craft, and this lens weighs craft heavily. It is the only direction that is fully specifiable today: every color is a named remap of an existing token, the type system has enforcement teeth (CI grep), tnum/minus-sign/alignment behavior is specified to the glyph, and the status-vs-owner disambiguation rule is the single smartest systemic idea across all three documents. It also honors the two recorded user preferences simultaneously — hates box-backgrounds, wants the parchment theme — where Strategos sacrifices the second. Its ornament budget (everything spent on cards/board, chrome silent) is exactly how you honor Kerameikos without pastiche: the vase is the artifact, the catalog never competes. Held to 78, not higher, because: the voice risks generic premium-editorial (Cinzel is the stock antiquity font; a 4X in Kinfolk clothing is distinctive by context, not by invention), text-only verbs are a real discoverability gamble in a game UI, and the whole identity depends on governance — hairlines-and-air degrades into wireframe the first time a dev ships a border. Ochra-on-terrain contrast is marginal and the emblem-at-16%-ink may over-quiet terrain kind.

2. PAINTED TABLE (71) is the most ownable concept in the field — nobody else's 4X looks like a photographed tabletop with a lacquer rail and sea-grout coastlines — and if the brief scored distinctiveness alone it would win. It loses on craft seams: Leukos #f2e3c2 as the default fourth seat against bone #f4e6c8 surfaces is a shipping-blocker color decision hiding in a table (ΔL* ≈ 1–2; the blazon becomes the only channel, which the direction elsewhere calls a fallback, not a primary); up to three colored inset rims can stack on one tile; ochre works three jobs; and the material metaphors (tablet, scroll, lacquer, margin) are ornament re-entering through silhouette — not box-on-box, but a cousin of it, and a demanding read of constraint B flags it. The single-weight Marcellus choice is romantic and under-powered. Still, its idea inventory is the richest: the black-figure tooltip, thickness-edge law, grout coastline, and blazons should be stolen into the winner regardless.

3. STRATEGOS (63) has the best one-sentence thesis (black glaze / teal sea / clay ground = the screen is an amphora) and the best constraint-E receipts, but the execution vocabulary is the most trend-derivative: 92%-opacity blurred dark slabs are 2020s glassmorphism wearing a chiton, and the layout (resources top-left, left icon rail, bottom verb bar, ticker chronicle) is Civ VI furniture recolored. It punishes the game's own loop — an economics-first prototype whose players live in the ledger gets its ledger demoted to a slide-out. Worst, it splits the brand in two: parchment (the current equity — the event cards are everyone's fidelity north star) survives only inside modals, so chrome and ceremony read as different products. It also contradicts the recorded preference for the parchment theme. Its transferable assets are real: the -lit status variants for dark surfaces, the receipts-table deliverable format, the disabled-verb three-signal pattern, and the game-over black-figure tableau (which is where its amphora thesis SHOULD live — as the ceremony register of another direction, not as the whole app).

CROSS-CUTTING FLAGS FOR THE ORCHESTRATOR: (a) all three independently converge on Cinzel/Marcellus + Alegreya/Source Serif, kill the Tailwind seats, collapse tans to ivory/bone/ceramic, adopt vertical ledger tabs, a single modal scaffold with a ceremony dial, and one engraved-mask icon language — treat those convergences as ratified regardless of winner. (b) All three player-palette tables contain exactly one weak seat (Katalogos: Ochra contrast; Painted Table: Leukos-on-bone; Strategos: Glaze-on-chrome) — whichever wins, the 5th/6th seat colors need a dedicated verification pass on real terrain before Phase 2. (c) Katalogos's icon batch is the largest (~42 assets) and is its only L-sized migration item; if schedule pressure hits, Painted Table's 'one drawing, two renders' policy is the cheapest way to cut that batch down.


---

# 5 · JUDGE — Shipping feasibility

RANKING: KATALOGOS — The Catalogue of Ships > The Painted Table > STRATEGOS — The Black-Figure Command Deck

## KATALOGOS — The Catalogue of Ships — 82/100
CONSTRAINTS: A (quiet terrain, no resource hues): PASS — derived ceramic ramp from existing --terrain-neutral, owner color as inner stroke only. B (one panel treatment, no box-on-box): PASS — 'there is no panel' is the cheapest possible compliance; de-boxing is deletion, not construction. C (board primacy): PASS — +170px board width from chrome deletion, verified plausible against 03-board-clean.png (~750px board today). D (type/numeral discipline): PASS with one gap — Alegreya does ship tnum/lnum, but the spec asserts 'verified in the family' without the font-subsetting smoke test STRATEGOS correctly demands; steal that test. E (incremental migration): STRONGEST OF THE THREE — every remap I checked lands on a real token in base.css (--bone→--ground, --ivory→--plate, --fg→--ink, --terrain-neutral kept); the shell stays light parchment so each migration step (token collapse → type → de-box → verb bar → board tokens → icons) is a shippable intermediate state; nothing forces a big-bang. F (growth: vertical rail, compendium, Assembly): PASS-WITH-RISK — 44px rail explicitly sized for 8+ tabs, dial-1 modal is a real answer for Assembly, but 'airy' density is the axis Phase 3-4 will attack; the spec's own §5.6 discipline is a promise, not a mechanism.
BEST IDEAS: Disabled-verb grammar: whole verb at 34% opacity but the unmet cost numeral solid --neg at FULL opacity — the best at-a-glance blocker signal of the three, steal regardless of winner. CI grep banning font-size outside the role sheet. The ceremony-dial modal scaffold (0-3) with Escape semantics defined per dial. Lightness-ladder player palette with per-token --plate keyline.
FATAL FLAWS: No fatal flaw, but two priced-in costs the spec undersells: (1) the icon batch is the LARGEST of the three (~36 masks + 6 duotones = 42 pieces, including re-cutting 6 resource masks, 3 pop icons, 4 buildings, and 8 UI micro-glyphs that Painted Table simply reuses) — that is an L that will straddle multiple sessions of Nano Banana style-lock roulette; (2) heaviest webfont bill (Cinzel 3 weights + Alegreya 3 weights + italics, realistically 250KB+, not the quoted ~90KB+Alegreya). Text-only verbs with zero fill/border is a real first-playtest discoverability gamble; the mitigation is hover-only, which a new player never triggers.

## The Painted Table — 67/100
CONSTRAINTS: A: PASS — owner color as glaze rim only, terrain in the 3-tan family, resource hue off terrain. B: PASS and cleverly cheap — 'fill + 2px thickness edge, never outline' is one CSS recipe; opaque panels delete backdrop-filter complexity. C: PASS — +35% board width claim checks out arithmetically, and 'no transform on terrain' honored. D: PASS, best font story of the three — Marcellus single 400 weight (~30KB) + Source Serif 4 variable with guaranteed tnum ≈ 145KB total, cheapest and lowest-risk numerals. E: RISK — token collapse and type are genuinely incremental, but the direction only COHERES when chart-margin + vase-foot rail + spindle + full-bleed sea land together; the self-assessed 'L, the big one' on shell re-zone hides that these are coupled steps whose intermediate states (parchment panels floating naked on teal) look broken while the game keeps evolving. Also unbudgeted: the sea chart asset is currently sized/composed as a board backdrop inside mapFrame — stretching it full-bleed to 1440×900 body background likely needs asset regeneration (ships/compass landing under chrome, resolution), a Nano Banana line-item the migration table omits. F: RISK — clay index-tabs 'physically connected, no seam' with chamfered tablet corners is the fussiest tab CSS of the three; the spec itself admits the black rail overflows when Phase 3+ adds verbs and hand-waves 'scroll-snap or group'.
BEST IDEAS: STEAL THESE EVEN IF IT LOSES: (1) Marcellus + Source Serif 4 variable — cheaper, safer webfonts than Cinzel/Alegreya, with tnum guaranteed; (2) Greek-letter blazons Α–Ζ on every owner token from day one — colorblind safety made structural, not chromatic; (3) the smallest icon batch (~17) achieved by REUSING the 6 resource masks, 3 settlement masks, and terrain emblems as-is — the discipline of 'one drawing, two renders' should constrain KATALOGOS's 42-piece batch; (4) stylelint color allowlist enforcing the 3-tan ramp; (5) drawing the Assembly icon now 'while the kiln is hot'; (6) black-figure inverse tooltip as the floating-layer signal.
FATAL FLAWS: The chronicle spindle is an interaction REGRESSION dressed as a material metaphor — the always-visible log (which the current build treats as first-class, see screenshot) goes behind a hover-hold on a 44px rail, and building the slide-over overlay is net-new component work that buys back functionality the game already has. The Leukos vase-white player (#f2e3c2, L*≈90) on bone plains hexes (#f4e6c8) is separated only by a 1.5px ivory rim that is invisible-by-definition and a 1px black contact line — a shipping-day legibility bug baked into the palette. Sea-gap grout requires the map SVG to own its background and clip on pan; the spec flags this itself but doesn't size the fix.

## STRATEGOS — The Black-Figure Command Deck — 52/100
CONSTRAINTS: A: PASS — terrain whispers within ΔL*≤5 of --ceramic, owner rim at 22%. B: PASS — the .slab recipe is genuinely one treatment. C: PASS loudly — 1388×784 map is the biggest board of the three. D: PASS — 8 roles, and it is the ONLY spec that flags the tnum-through-subsetting smoke test; credit for that. E: FAIL AS WRITTEN — this is the rewrite disguised as a theme my lens exists to punish. Re-pointing --panel/--panel-strong at a dark slab instantly breaks every component that sets --fg text on --panel: dark-on-dark. You cannot land the token collapse first and keep a working app; you must run a parallel on-dark token set (--line-on-dark, --muted-on-dark, --subtle-on-dark, plus THREE new lit status colors --olive-lit/--clay-lit/--ochre-lit) and sweep all 14 CSS files component-by-component while the game evolves underneath. The spec's own closing line — 'shippable behind .shell with the current parchment theme as the rollback branch' — is a confession: this is a big-bang theme swap with an escape hatch, not incremental migration. The shipping light-icon-atlas/hero assets are light-themed (dark variants exist only under docs/reference/), so ceremony chrome assets need regeneration too. F: RISK — the icon rail scales, but tab labels live only in tooltips (weakest discoverability), and the ledger becoming a slide-out overlay is an interaction redesign layered on top of the reskin.
BEST IDEAS: (1) §9 token-migration receipts table — the best-written constraint-E paperwork of the three; whichever direction wins should produce exactly this artifact before touching base.css. (2) The tnum-survival-through-subsetting smoke test — adopt into KATALOGOS immediately. (3) Disabled state as three simultaneous signals (dim + cost chip removed + strike-rule) with hover tooltip stating 'Needs 20 wood — you have 14'. (4) The tokened 7-layer z-model and exactly-two-shadows policy. (5) Status-color lit-variant discipline if dark ceremony surfaces (game-over tableau) ever ship in another direction. (6) BADGE fallback plan (Cinzel 10px → Alegreya 700) — specifying the fallback before the failure is good engineering.
FATAL FLAWS: (1) Polarity inversion of the entire chrome makes every intermediate migration state a half-dark half-light app — the worst possible condition for a solo dev shipping Phase 2/3 features mid-migration; effort estimates ('tokens S') are only true if you accept the big bang. (2) backdrop-filter: blur(10px) on slabs declared 'load-bearing' over a full-bleed pannable SVG map is a continuous repaint tax; the one direction with a real runtime-performance risk, unmeasured. (3) Ledger as slide-out overlay trades away zero-click city stats the current build has (screenshot ground truth: ledger always open) — a design regression sold as map real estate. (4) All existing screenshots, docs imagery, and the light asset suite are invalidated at once; docs-trail-code discipline (per project memory) multiplies that cost.

---
SHIPPING FEASIBILITY VERDICT (solo dev, incremental migration, game evolving underneath)

Ranking: KATALOGOS (82) > Painted Table (67) > STRATEGOS (52).

Ground truth verified against the repo before scoring: tokens live on .shell in src/styles/base.css:96-137 and every existing-token claim in all three specs checks out; 4,479 lines of CSS across 14 files with 122 literal font-size declarations (the 'type sweep = M' estimates are honest); player colors are 4 Tailwind literals in src/game/data.ts:23-26; the board is per-polygon SVG in src/components/HexMap.tsx (687 lines); 8 modal components already exist under src/components/board/modals/. The current screenshot (03-board-clean.png) confirms: light parchment shell, always-open ledger left + actions/chronicle right, resource band bottom, ornate red-corner panel frames, colored terrain checkerboard, white-pip debug tokens.

WHY KATALOGOS WINS ON THIS LENS: it is the only direction where every migration step leaves a shippable app. The shell stays on the existing light ground (--ground IS --bone verbatim), the topology stays docked-3-column (closest to today's layout — verb bar and resource spine are moves, not inversions), and de-boxing is mostly deletion. A solo dev can land token-collapse Monday, type roles Wednesday, de-box one panel per evening, and never block Phase 2 feature work. Its real costs: the largest icon batch of the three (~42 pieces vs Painted Table's ~17 — it re-cuts resources, pops, buildings, and UI micro-glyphs the others reuse), the heaviest webfont bill, and a genuine discoverability gamble on text-only verbs. None fatal; all parallelizable or reversible.

WHY PAINTED TABLE IS SECOND: honest self-assessment (shell re-zone = L) and the cheapest asset/font story, but its identity only emerges when chart-margin + rail + spindle + full-bleed sea land TOGETHER — coupled steps with ugly intermediate states. Two unpriced items: the sea chart asset is composed as a board backdrop, not a 1440×900 body background (regeneration needed), and the chronicle spindle is net-new overlay work that regresses an always-visible log. The Leukos white player on bone plains is a baked-in legibility bug.

WHY STRATEGOS LOSES: it is the rewrite disguised as a theme. Inverting chrome polarity means the token collapse CANNOT land first — re-pointing --panel to a dark slab breaks dark-on-dark text everywhere until all 14 CSS files are swept, forcing a parallel on-dark token set plus three new status colors. Its own closing line ('current parchment theme as the rollback branch') admits big-bang. Add blur-over-pannable-SVG performance risk, a ledger-overlay interaction regression, and invalidation of the entire light asset/screenshot/docs suite in one stroke. Best paperwork (§9 receipts table), worst incremental path.

CROSS-POLLINATION ORDERS if KATALOGOS proceeds: adopt Painted Table's Marcellus/Source-Serif-4 cost model as a fallback if Cinzel+Alegreya blow the font budget, its Α–Ζ blazons, its asset-reuse discipline to shrink the 42-piece batch toward ~25, and its stylelint color allowlist; adopt STRATEGOS's tnum-subsetting smoke test, its token-migration receipts table as the pre-flight artifact, and its exactly-two-shadows z-model.


---

# 6 · JUDGE — Playtest readability

RANKING: The Painted Table > STRATEGOS — The Black-Figure Command Deck > KATALOGOS — The Catalogue of Ships

## The Painted Table — 78/100
CONSTRAINTS: A (tokens-on-tiles): MOSTLY PASS with one named defect — token recipe (glaze fill + 1.5px ivory rim + 1px vase-black contact line + Greek blazon) is the second-strongest of the three, and class-coded pop beads (solid/ring/black) keep the social ladder readable on-map. FAIL within A: seat 4 Leukos #f2e3c2 vs plains ground --bone #f4e6c8 — the glaze and the ground are within ~ΔE 2, so the 2.5px owner territory rim for the white seat is literally invisible on plains tiles, in the DEFAULT 4-player seating. B (material/no-outline grammar): PASS — fill + thickness-edge law is coherent and enforceable. C (board primacy/quiet board): PASS — 908×684 board at 1280 (vs ~610 today), no terrain transforms, resource hue off terrain, only the chronicle overlay ever covers the map. D (type roles/tnum): PASS — 8 roles, tnum plan explicit, Marcellus never renders game numbers. E (evolution not rewrite): PASS with the largest single item (shell re-zone is L). F (roadmap scalability): PASS — 44px spine tabs scale to 9+, but the black rail is flagged by its own authors as the choke point when Phase 3 adds verbs.
BEST IDEAS: 1) Disabled verb swaps its cost line for the blocking reason ('need 20 gold') — the best why-not affordance of the three. 2) Class-coded pop beads (solid=citizen, ring=freeman, black=slave) — board state the other two hide or blur. 3) Black-figure inverted tooltip = instant 'this floats above the table' signal. 4) Vase-black verb rail: dimmed-verb legality is unambiguous on dark ground. 5) Sea-grout gaps replacing the chunky white coastline dashes. 6) Material-continuity active tab (tab and panel are one shape).
FATAL FLAWS: Leukos-on-plains: a white piece and a white territory rim on a near-identical bone tile is the vase-relief mistake reborn — an 'authentic vase-white seat' aesthetic choice that erases ownership readability for one of four default players. Fixable (reseat P4, darken the rim, force the black contact line to 2px), but as spec'd it ships broken. Second: legal-target = static ochre rim + 5% wash — ochre is simultaneously the warning color and the gold resource hue, it is low-contrast on tan tiles, and it does not pulse; finding legal targets mid-verb is the weakest of the three. Third: at 1280 the event slips collapse to art-only 48px squares — active season/player event effects (e.g. 'Timber Levies +2 wood per 6 pops') become hover-only, a direct glance regression from today's topbar.

## STRATEGOS — The Black-Figure Command Deck — 68/100
CONSTRAINTS: A: PASS on tokens proper — the best-armored recipe (owner glaze + 2px ink keyline + 1px bone inner ring + ordinal + baked shadow) on the biggest hexes of any direction (map 1232×692 at 1280); Slip/Glaze extreme seats carry mandatory keylines. RISK within A: the 4px owner rim at 22% opacity — olive or aegean at 22% over #D8C8A8 is a whisper; territory ownership, half of board state, is the faintest of the three directions. Always-visible 30%-ink empty sockets re-add slot furniture the other two suppress. B: PASS — one slab recipe, one hairline, corner marks die. C: PASS on map size, FAIL on 'never lose the map under chrome' — the ledger is a 300px 92%-opaque slab that floats OVER the map (pinned or not), and the chronicle is another floating slab; the two panels a player consults most both occlude tiles. D: PASS (8 roles, tnum smoke-test called out); 10px Cinzel BADGE is a legibility gamble they at least flagged. E: PASS — explicit token migration receipts, best-documented of the three. F: PASS — rail scales, table component reused for compendium, icons number-free.
BEST IDEAS: 1) The three-value composition (dark glaze / mid sea / light clay) — instant figure-ground; chrome-vs-board zoning is the best of the three and worth borrowing even on a parchment shell. 2) Turn banner dead-center in the top band — whose-turn is a zero-search read. 3) Luminance-ladder player colors + engraved seat ordinals (Α–Ϛ) as structural CVD redundancy. 4) The 150ms beat between dice settle and row highlight. 5) Resource cluster top-left Civ-style with no pill boxes.
FATAL FLAWS: This is an economy game and the direction demotes the economy panel: city yields, build slots, and pop classes go from zero clicks (docked ledger) to one click, and when opened the panel sits ON the map — the layout structurally trades the lens's 'never lose the map under chrome' for map pixels you then cover to play. Second: the disabled-verb treatment DELETES the cost chip — three signals tell you a verb is off, none tells you why without hovering; both rivals show the blocker inline. Third: at 1280 resource deltas move into hover and event slivers go icon-only — the two per-turn glance reads (what am I gaining, what event is live) both retreat behind tooltips exactly at the target laptop size. The 22% owner rims mean territory reads worse than today's build despite the best tokens.

## KATALOGOS — The Catalogue of Ships — 61/100
CONSTRAINTS: A: RISK — settlement seals (owner fill + plate keyline + engraved glyph) are fine, but 8px bone beads on #D8C8A8-family terrain are the lowest-contrast tokens proposed anywhere in the three specs, pop CLASS is exiled entirely to tooltip/ledger, empty build slots are invisible at rest, and terrain emblems at 16% opacity are 'silent at glance' by design — the map is the prettiest and the least informative of the three. No vase-relief repeat, but constraint A is satisfied by removing information rather than making it legible. B: PASS — the strictest de-boxing of the three (no panel exists at all). C: PASS on occlusion (nothing ever floats over the map except modals — best of the three), RISK on size: 728×616 at 1280 is the smallest board, i.e. the smallest hexes and tokens, in the direction with the faintest tokens. D: PASS on the system, FAIL on its own terms at 1280 — the global ×0.93 rem scale drives the 11px Cinzel label to ~10.2px, below the spec's own declared 'hard floor'; the micro-label layer degrades exactly at the lens's target resolution. E: PASS (S/M items, one L icon batch). F: RISK — the spec itself admits Assembly/Trade density will pressure the airy grid and offers only discipline as mitigation.
BEST IDEAS: 1) Disabled verb renders the unmet cost numeral in solid red at full opacity while the rest dims — the red number IS the why-not; steal this into any winner. 2) Illegal tiles drop to 80% opacity during targeting — the map itself becomes the affordance. 3) Empty build slots appear only while selected or Build-targeting (quiet terrain done right; graft onto Painted Table's sockets). 4) Full-width bottom resource spine with stat-lg tnum numerals and signed-delta animation. 5) The fixed 5-column tnum ledger grid — rows align like a real ledger. 6) 'Would this appear in a Getty catalog' as a component test.
FATAL FLAWS: At 1280 mid-game this is one uninterrupted tan sheet: text-only Cinzel verbs with no fill and no border sit on the same paper as the ledger and spine, separated only by 1px hairlines — 'find my legal verbs' depends on the player already knowing where the verb bar is, and the spec's own risk section concedes the discoverability bet. The board is glance-poor by doctrine: you cannot tell citizen from slave, built from empty, or forest from plains without hovering or reading the ledger — the direction answers 'can I read board state at a glance' with 'no, read the catalog,' which is honest museum curation and bad playtesting. Add the self-violated 11px type floor and the smallest hexes of the three, and the target laptop is precisely where this direction is weakest.

---
PLAYTEST READABILITY VERDICT (judged as a player at 1280×800, mid-game, against ground truth in scratchpad/shots/03-board-clean.png and 02-main-1280x800.png)

Ground truth first: today's build fails the lens in four ways all three directions correctly attack — (1) the green/orange resource checkerboard makes terrain scream and tokens whisper; (2) settlements are naked Tailwind-primary squares/triangles and pops/buildings are white debug pips; (3) verbs live in a right-hand panel that costs ~310px of board; (4) at 1280 the board shrinks to ~610px while triple-bordered parchment boxes keep their pixels. Every direction fixes (1) and (2); they diverge on who pays for (3) and (4).

1. THE PAINTED TABLE — 78. Wins the lens on aggregate. It is the only direction that keeps the ledger docked AND grows the board to ~908px at 1280, keeps pop class readable on-map (solid/ring/black beads — the only direction where the social-ladder mechanic is visible on the board), and has the best verb legality story: verbs on a vase-black rail where 32% dimming is unambiguous and the cost line literally swaps to the blocking reason. Its constraint-A sin is specific and must be fixed before adoption: the Leukos seat (#f2e3c2) is a white piece with a white territory rim sitting on bone plains (#f4e6c8) in the default 4-player seating — ownership for one of four players evaporates on the most common tile type. That is the vase-relief mistake in a new costume: authenticity ('vase-white seat') over legibility. Also punished: ochre legal-target rims (static, low contrast on tan, and ochre is already the warning color and the gold hue) and the 1280 event slips collapsing to hover-only art squares.

2. STRATEGOS — 68. The best tokens and the biggest map, undone by structure. Individually, its ceramic tokens (glaze + 2px ink keyline + bone ring + seat ordinal) on 1232px-wide hexes would score highest on constraint A's token half — but board state is more than tokens: its 22%-opacity owner rims make territory the faintest of the three, and its layout moves the ledger — the panel an economy game lives in — into a dark slab that floats OVER the map, directly violating 'never lose the map under chrome' the moment you actually play. Its disabled verbs delete the cost chip (why-not becomes hover-only), and at 1280 both resource deltas and event effects retreat into tooltips. It reads gorgeously in a screenshot with all panels closed; mid-game with ledger pinned and chronicle expanded it occludes more board than Painted Table ever does.

3. KATALOGOS — 61. The most disciplined spec and the safest from occlusion (nothing ever floats over the map), but it answers the lens's central question by subtraction: pop class off-map, empty slots invisible, terrain emblems at 16% opacity, 8px bone beads on tan — the board becomes an artifact you admire and a catalog you must read to play. At 1280 it is weakest exactly where the lens looks: the smallest board of the three (728px), text-only verbs on an undifferentiated tan sheet, and a ×0.93 scale that pushes its own 11px Cinzel 'hard floor' to ~10.2px. Its disabled-verb red-cost-numeral convention and 'illegal tiles dim to 80% during targeting' are the two best single interaction ideas in the whole exercise and should be stolen regardless.

STEAL LIST FOR THE WINNER: KATALOGOS's red unmet-cost numeral + illegal-tile dimming + slots-appear-on-targeting; STRATEGOS's dead-center turn banner, luminance-ladder seat colors with Greek ordinals, and dark-band figure-ground for the verb rail (Painted Table already half-has this). MANDATORY FIX FOR PAINTED TABLE: retire or re-derive Leukos (or hard-require the vase-black contact line at 2px and swap its territory rim to vase-black), replace ochre legal-target rims with aegean, and keep event-slip effect text visible at 1280.