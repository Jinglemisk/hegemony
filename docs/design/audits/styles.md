# Hegemony CSS Styling-System Audit

Scope: /Users/jinglemisk/Desktop/hegemony/src/styles.css (barrel, @import only) + 14 slice files in /Users/jinglemisk/Desktop/hegemony/src/styles/ (4,502 lines total). Color values also flow in from TS: src/ui/resourceVisuals.ts, src/game/data.ts (PLAYER_COLORS), src/components/board/topbar/SeasonDial.tsx (SEASON_TINT), src/components/ResourceGrid.tsx (unrest override).

## 1. TOKENS

**Yes, there is a real token layer, but it is scoped to `.shell`, not `:root`.** Only `--font-display` and `--font-body` live on `:root` (base.css:4-12). Everything else is declared on `.shell` (base.css:95-137):

- **Named palette (11):** `--vase-black #181210`, `--ink-2 #241915`, `--clay #c0461c`, `--clay-deep #8f2e13`, `--ochre #d98a35`, `--bone #f4e6c8`, `--ivory #fff8e7`, `--oxblood #722420`, `--olive #5e6e3a`, `--aegean #1f6977`, `--stone #8f8571`
- **Terrain neutrals (5):** `--terrain-neutral #d8c8a8`, `--terrain-neutral-light #eee1c4`, `--terrain-neutral-shade #9f8e70`, `--terrain-neutral-line #5f4a35`, `--terrain-neutral-soft rgb(216 200 168/17%)`
- **Semantic aliases (13):** `--accent`→clay, `--accent-2`→aegean, `--fg #241910`, `--muted rgb(36 25 16/66%)`, `--subtle …/48%`, `--panel rgb(255 248 231/78%)`, `--panel-strong …/94%`, `--panel-soft rgb(192 70 28/10%)`, `--line rgb(36 25 16/18%)`, `--line-strong rgb(192 70 28/48%)`, `--button-bg rgb(255 248 231/86%)`, `--button-line rgb(36 25 16/24%)`, `--hex-line rgb(36 25 16/28%)`
- **Shadows (2):** `--shadow 0 20px 46px rgb(72 42 21/20%)`, `--lift-shadow 0 12px 24px rgb(72 42 21/18%)`
- **Ledger set (4):** `--ledger-rule rgb(36 25 16/14%)`, `--ledger-rule-strong …/22%`, `--ledger-accent rgb(192 70 28/70%)`, `--ledger-hover rgb(192 70 28/8%)`
- **Asset-URL tokens (7):** `--hero-tableau`, `--icon-atlas`, `--terrain-atlas`, `--ui-atlas`, `--capital-glyph`, `--city-glyph`, `--colony-glyph` — all pointing at `light-*` prefixed PNGs (a dark set was clearly anticipated)
- **Per-terrain (tiles.css):** `--terrain-hue`, `--terrain-hue-light`, `--terrain-hue-soft`, `--terrain-tint` per `.terrainTint-*` class
- **Sprite coords:** `--sprite-x/--sprite-y` per `.sprite-*` class (sprites.css)
- **JS-injected at runtime:** `--resource-color/--resource-tile/--resource-soft/--resource-line/--resource-shadow` (resourceVisuals.ts), `--player-color` (HexMap.tsx from PLAYER_COLORS), `--season-tint` (SeasonDial.tsx), `--settlement-mask` (intel.css swaps glyph masks)

**Dead tokens (defined, never consumed):** `--ink-2`, `--oxblood`, `--hex-line`, `--terrain-tint` (set in tiles.css:8, never read), and JS-injected `--resource-soft`/`--resource-line` (never read by any CSS).

**Missing token categories entirely:** spacing (all gaps/paddings are raw px: 1–24px, ~30 distinct values), border-radius (12 raw values: 0/3/4/5/6/7/8/10/12/14px, 50%, 999px), z-index (13 raw values incl. 1000), font-size (36 raw values), transition durations (120/140/160/2400ms raw), breakpoints (raw in media queries).

**Where raw values bypass tokens (the big leak):** alpha-literal `rgb(R G B / x%)` colors that ARE token colors but re-encoded per use:
- `rgb(255 248 231 / x%)` = ivory: **60 occurrences** across every file (panels, tooltips at /99%, gradients, insets)
- `rgb(36 25 16 / x%)` = fg ink: **28** (borders, tooltip borders /38-42%, text /76-82%)
- `rgb(143 46 19 / x%)` = clay-deep: **26** (framed-icon borders /40-46%, card pinstripes /18-36%, hairlines /13%)
- `rgb(192 70 28 / x%)` = clay: **17** (selected states /16-20%, unrest banners, glows /48%)
- `rgb(72 42 21 / x%)` = shadow brown: **14** (nearly all small shadows)
- `rgb(80 35 18 / x%)` = card-frame brown #502312: **10** (event/placement/table card borders — this hue has no token at all)
- `rgb(24 18 16 / x%)` ≈ vase-black: **10** (modal backdrops /66-78%, pip strokes /85-92%)
Plus literal hexes duplicating tokens: `#241910` raw 5x (`:root` color + color-mix() strokes in tiles.css:42,102 and sprites.css:168), `#f4e6c8` raw on `:root`/`body`/shell-fallback (forced because tokens live on `.shell`), `#fff8e7`/`#181210` raw in tiles.css:126-127, tileConfirm buttons `#2f7d46`/`#b13a28` (tiles.css:214-224).

Untokenized color families: success/danger (`#2f7d46`, `#b13a28` + their rgb twins, ~16 uses), the entire event-card parchment gradient family (`#fff4d8`, `#eed5aa`, `#d4a05f`, `#e0b87e`, `#efd8ad`, `#dcc08c`), the sea (`#4b8994`, `#76aeb2`, `#2f707e`, `rgb(24 62 70)`, `rgb(8 22 28)`), placement gold `#f6d98a`, hover clay `#d15225`, and PLAYER_COLORS in game/data.ts.

## 2. PALETTE EXTRACTION
See the `palette` field — 60 entries, grouped by family with near-duplicate call-outs. Headline groupings:
- **10 distinct parchment tans** form a de facto ramp: #fff8e7 (ivory) → #fff4d8 → #f4e6c8 (bone) → #eee1c4 → #efd8ad → #eed5aa → #e0b87e → #dcc08c → #d4a05f → #d8c8a8. The 6 card-gradient tans are near-dupes that a brandbook should collapse to ~3 stops.
- **7 near-black inks:** #0b0705, #181210 (vase-black), rgb(24 18 16)≈#18120f (near-dupe of vase-black), #241910 (fg), rgb(36 25 16)≈#24190f (near-dupe of fg), #241915 (ink-2, dead), #27150d. Should collapse to 2-3.
- **Olive #5e6e3a vs forest hue #586f3f** are near-dupes; **ochre #d98a35 vs plains #d69c35 vs hill-light #d09955** are near-dupes.
- **danger #b13a28 ≡ rgb(177 58 40)** and **success #2f7d46 ≡ rgb(47 125 70)** — same colors, two encodings each.
- **PLAYER_COLORS (#1e3a8a, #eab308, #7c3aed, #c1121f) are off-palette** — saturated Tailwind-style primaries that clash with the ceramic/Kerameikos scheme; a brandbook should re-derive them (aegean/ochre/oxblood/clay directions exist in the token set already).

## 3. TYPOGRAPHY
Two family stacks (see `fonts`): display (Copperplate small-caps feel, uppercase headings/numbers/buttons) and body (Iowan Old Style/Palatino). No webfonts — system-font roulette; Copperplate is macOS-only, so Windows falls to Georgia and the whole personality shifts.

- **36 distinct font-size values**: 0.5, 0.54, 0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.85, 0.86, 0.9, 0.92, 0.944(!), 0.95, 1, 1.06, 1.1, 1.15, 1.18, 1.22, 1.25, 1.3, 1.32, 1.42(clamp) rem + 7.2px (SVG) + 3 clamp() expressions. Modal sizes cluster at 0.72/0.78/0.8 (41 combined uses) — an unratified "body-small" scale.
- **Weights:** 400, 500, 600, 650, 700 (23 uses, the default voice), 900 (tile metrics).
- **Letter-spacing:** global reset `* { letter-spacing: 0 }` (base.css:16), then 11 ad hoc values 0.01–0.12em.
- **De facto text styles:** roughly 8 intended roles — (1) display heading (display/700/uppercase ~1–1.42rem), (2) big numeral (display/tabular-nums 1.18–1.32rem), (3) row title (display/uppercase 0.72–0.86rem), (4) body (0.78–0.84rem/1.25–1.35lh), (5) MICRO-LABEL (uppercase/700/ls 0.03–0.12em/0.5–0.68rem) — re-implemented ~12 times with different numbers (turnClockLabel 0.54, topbarEventLabel 0.5, gameOverKicker 0.6, deckTrayLabel 0.58, placementPreviewTag 0.56, rosterActingTag 0.54, etc.), (6) muted caption (0.66–0.74rem), (7) stat numeral (tabular-nums 0.7–0.92rem), (8) SVG text. But because every instance re-declares raw values, there are ~50+ literal combos.

## 4. LAYOUT SYSTEM
- **App shell:** `.shell` is a 2-row CSS grid (`auto minmax(0,1fr)`), `height:100svh; overflow:hidden` — a no-page-scroll app shell on desktop; at ≤1120px it flips to `height:auto; overflow:visible` and the page scrolls.
- **Topbar:** 3-col grid; strategy variant `.strategyTopbar` overrides to `1fr auto 1fr`, max-width 1700px (base `.topbar` is 1520px — two competing max-widths).
- **Workbench:** 3-col grid `minmax(280px,350px) / minmax(470px,1fr) / minmax(300px,372px)` (base.css:209); `.strategyWorkbench` overrides to `minmax(300px,320px) / minmax(640px,1fr) / minmax(300px,320px)` (intel.css:5). The 640px min center column implies a ~1280px+ design target.
- **Positioning:** map zoom/mode controls and setup caption are absolute inside `.mapFrame`; tooltips are absolute (resourceTooltip, scoreTooltip, topbarEventTooltip) with hover-reveal, except `.detailTooltip` and `.foundColonyPopover` which are `position:fixed` and JS-placed. Mobile relocates tooltips to `position:fixed; top:92px` (resourceTooltip) / `top:88px` (scoreTooltip) — magic offsets tied to topbar height.
- **Modern features in use:** container query (`@container (max-width:112px)` on band resource pills, ledger.css:286), `color-mix()` for hex strokes, `100svh`, `scrollbar-gutter`, `border-image` (Greek-key PNG frame, slice 270), `mask-image` icon tinting, `mix-blend-mode`.
- **Breakpoints:** 1280 / 1120 (collapse to 1 column) / 760 / 460 — each declared TWICE in responsive.css (legacy block lines 4-102, strategy block lines 104-174).
- **Magic numbers:** `-21px` negative margin (intel.css:465, documented as 5px gap + 16px chevron), `-4px` scrollbar-gutter trick (intel.css:136), `calc(100vh - 170px)` tooltip cap, `bottom:60px` caption, `max-height:168px` picker grid, aspect-ratio 2/3 event card.
- **Z-index inventory (13 values, no scale):** -1 (shell::before, card ::before/::after), 1 (mapColumn, terrainChip::after, turnLogGroupHeading), 2 (chip badge), 4 (setup caption), 5 (map controls), 10 (workbench), 12 (intelTabs sticky), 20 (modalBackdrop, intelPanel), 60 (topbar), 70 (resourcePill:hover), 80 (resourceTooltip, intelPanel:hover), 90 (eventModalBackdrop, topbarEventTooltip, scoreTooltip), 95 (foundColonyPopover), 1000 (detailTooltip). **Smell:** `.modalBackdrop` at z-20 sits BELOW `.topbar` (z-60) and the hover-raised panels (70-80) — the log/population modal backdrop does not cover the topbar; tooltips at 90 tie with the event-modal backdrop.

## 5. DUPLICATION & DRIFT
- **`!important` count: 0.** Genuinely clean on that axis. Specificity stays low (mostly 1-2 classes); the deepest chains are `.bandResourceGrid .resourceValue > strong` style overrides.
- **Cascade-order coupling instead:** the barrel comment says it all — "ORDER MATTERS: responsive.css overrides earlier rules and must stay last." Later files silently re-style earlier files' classes: `.panel` declared twice within base.css itself (188 and 216); `.logModal` in base.css + ledger.css; `.scoreboardPanel` in deck.css + ledger.css; `.cityIdentity` in intel.css + pops.css; `.topResourceGrid` twice inside the SAME 760px media block (responsive.css:52,75). Top cross-file repeat offenders: `.resourcePill` (10 declaration blocks), `.bandResourceGrid` (10), `.hexMap` (8), `.compactResourceTooltip` (8), `.scoreTooltip` (7), `.candidateButton` (7).
- **The "un-button" anti-pattern:** the global `button` rule (base.css:58-93) applies border/hover-lift/translateY to every button, so ~10 components each re-declare `box-shadow:none; transform:none; border:0; background:none` to undo it (intelTabs, holdingSummaryButton, candidateButton, commandVerb, marketTradeButton, ladderButton, buildingChipOption, eventChoiceButton, placementPickerChip, ghostButton). This is the single largest source of repeated blocks.
- **Card-surface recipe duplicated 3x:** `.eventCardSurface` (modals.css:20-39), `.placementCardSurface` (220-239), `.eventTableModal` (669-686) — same 2px `rgb(80 35 18/72%)` border, radius 14, triple-layer parchment gradient, `0 28px 70px rgb(0 0 0/48%)` + double inset-ring shadow, with drifting final gradient stops (#d4a05f vs #e0b87e).
- **Tooltip recipe duplicated 5x:** resourceTooltip, topbarEventTooltip, scoreTooltip, detailTooltip, foundColonyPopover — same `rgb(255 248 231/99%)` ground, `rgb(36 25 16/38-42%)` border, radius 8, translateY(±4px) + opacity 140ms reveal, with drifting shadow values.
- **Ledger-row recipe duplicated 5x:** holdingMatrix/buildingLedgerRow/popEconomyRow (intel.css:145) + marketRow (intel.css:672) + netEconomyPanel (pops.css:202) — `border-left:2px var(--ledger-accent); padding:9px 2px 11px 12px`.
- **resourcePill triple box-shadow** repeated verbatim 3x (base + both keyframes' 100% states, resources.css).
- **Naming conventions:** consistent camelCase component classes (not BEM), but THREE competing modifier styles: dash-suffix (`.unrestBanner-unrest`, `.sprite-wood`, `.terrainTint-hill`), bare state classes (`.selected`, `.pending`, `.positive`, `.selectedChoice`, `.actingSeat`), and attribute selectors (`[aria-pressed="true"]`, `[aria-expanded="true"]`, `[aria-disabled="true"]`). Global utility-ish `.positive`/`.negative` (resources.css:304-310) collide with scoped variants (`.resourceDelta.positive`, `.scoreTooltip em.positive` which maps positive→olive instead of green).
- **Dead CSS:** `.primaryButton::before` (resources.css:317) styles a pseudo-element that no rule gives `content` to; `.resourcePill::before { content:none }` neutralizes nothing that exists; dead tokens listed in section 1; deck.css's actual deck rules vs its name (it mostly holds `.scoreboardPanel` and label styles — misfiled).

## 6. THEMING READINESS
**Today a re-skin is medium-hard: the semantic token layer exists and is well-designed, but ~200 alpha-literal colors would silently ignore any token swap.** What works already: semantic aliases (--accent, --panel, --line, --fg, --muted, --ledger-*), asset URLs as tokens with `light-` prefixes (dark art set was anticipated), mask-based icons (resourceMask-*, settlement glyphs) tinted via vars = art-free recolor, JS-injected per-entity vars (--player-color, --resource-*, --season-tint) already parameterized, zero !important.

**Structural changes needed for a token-driven theme:**
1. **Move tokens from `.shell` to `:root`** (or a `[data-theme]` root) — right now `:root`/`body` hardcode #f4e6c8/#241910 because they can't see `.shell` scope.
2. **Kill alpha literals:** add RGB-triplet tokens (`--ivory-rgb: 255 248 231`) or `color-mix(in srgb, var(--ivory) 78%, transparent)` so the 60/28/26/17 ivory/ink/clay-deep/clay alpha variants derive from tokens. This is ~80% of the migration work, mechanical and grep-able.
3. **Tokenize the missing families:** card parchment ramp (--card-hi/--card-mid/--card-lo/--card-frame for #fff4d8/#eed5aa/#d4a05f/rgb(80 35 18)), success/danger (--ok/--danger for #2f7d46/#b13a28), sea (--sea-hi/mid/deep + --map-chrome), shadow-brown base.
4. **Extract component recipes:** one `.cardSurface`, one `.tooltipSurface`, one `.ledgerRow`, and a `.buttonReset`/flat-button variant to end the un-button pattern — after that, a theme only touches tokens, not 3-5 divergent copies.
5. **Move PLAYER_COLORS + RESOURCE_VISUALS raw hexes** into the same token source (either CSS vars read by TS, or a single palette module generating both) — currently a reskin must edit CSS AND three TS files.
6. **Raster dependencies:** the Greek-key border-image, hero tableau, icon/terrain/ui atlases, and happiness theatre PNGs bake the palette into art; the URL tokens make swapping mechanical, but a dark/alternate theme needs a parallel asset set (mask-based icons are exempt).
7. Optional hygiene while in there: spacing/radius/z-index scales, a ratified type scale (est. 8 styles replacing 36 sizes), merge the duplicate media-query blocks in responsive.css, and fix the modalBackdrop-below-topbar z-index inversion.

## TOP FINDINGS
- Token layer exists but is scoped to .shell instead of :root, and ~200 alpha-literal colors — rgb(255 248 231/x) x60, rgb(36 25 16/x) x28, rgb(143 46 19/x) x26, rgb(192 70 28/x) x17 — re-encode token colors per use, so a token swap today would only restyle ~40% of the UI
- Zero !important and low specificity, but the system leans on cascade-order coupling instead: responsive.css must load last, .panel/.logModal/.scoreboardPanel/.cityIdentity are declared in multiple files, and .resourcePill has 10 separate declaration blocks
- Three near-identical hand-copied component recipes drift across files: the parchment card surface (x3 in modals.css with different gradient stops), the tooltip surface (x5), and the ledger row (x5) — these plus the ~10x 'undo the global button hover' pattern are the bulk of duplication
- Typography is 2 good family stacks but 36 raw font-size values, 6 weights, 11 letter-spacings, and a micro-label style re-implemented ~12 times with slightly different numbers (0.5-0.68rem); Copperplate is macOS-only with no webfont fallback strategy
- The parchment family has 10 near-duplicate tans and the ink family 7 near-blacks that a brandbook should collapse to ~3 stops each; success/danger green/red, the sea gradient, and the whole event-card tan ramp have no tokens at all
- PLAYER_COLORS in src/game/data.ts (#1e3a8a/#eab308/#7c3aed/#c1121f) are off-palette Tailwind-style primaries clashing with the ceramic theme, and resource colors live in a separate TS file (ui/resourceVisuals.ts) — a reskin currently requires editing CSS plus three TS files
- Z-index has 13 ad hoc values with a real inversion: .modalBackdrop (z-20) renders below .topbar (z-60) and hover-raised tooltips (70-90); .detailTooltip jumps to 1000
- Dead weight found: unused tokens --ink-2, --oxblood, --hex-line, --terrain-tint, --resource-soft/--resource-line; .primaryButton::before styles a pseudo-element that never gets content; duplicate breakpoint blocks and a repeated .topResourceGrid rule inside responsive.css

## PALETTE
- #241910 | --fg (ink) | Primary text color; also raw in :root color and in color-mix() hex-tile stroke formulas (tiles.css, sprites.css). Alpha twin rgb(36 25 16 / x%) used 28x for --muted/--subtle/--line, tooltip borders, backdrops — near-dupe of #24190f family
- #181210 | --vase-black | Filled building-slot pips, colony overflow dots, terrain-mode tile-metric fill. Near-dupe alpha twin rgb(24 18 16 / x%) used 10x for modal backdrops (66-78%), pip strokes (85-92%), inset rings
- #0b0705 | near-black numeral | SVG tileMetric fill and bandResourceGrid resource numerals/deltas (4x) — a third, undocumented near-black
- #241915 | --ink-2 (DEAD) | Defined on .shell, never referenced anywhere
- #27150d | event-card heading ink | eventCardBody h2 only — fourth near-black
- #fff8e7 | --ivory | Light ground: button text on dark, tile strokes/highlights, pip fills. Alpha twin rgb(255 248 231 / x%) is the single most-used color in the codebase (60x): panels 78-94%, tooltips 99%, foam strokes, gradients, inset rings
- #f4e6c8 | --bone | Page/body background (raw on :root and body because tokens are .shell-scoped), shell fallback, framed-icon grounds, pill gradient bottom. Alpha twin rgb(244 230 200 / x%) 3x
- #fff4d8 | card parchment top (untokenized) | Top stop of event/placement/table card gradients and foundColony popover + its arrow (5x, modals.css)
- #eed5aa | card parchment mid (untokenized) | Mid stop of the three card-surface gradients (3x, modals.css)
- #d4a05f | card parchment base (untokenized) | Bottom stop of eventCard/placementCard gradients (2x)
- #e0b87e | card parchment base variant (near-dupe of #d4a05f) | Bottom stop of eventTableModal gradient — drifted copy of the card recipe
- #efd8ad | popover parchment base (near-dupe of #eed5aa) | foundColonyPopover gradient bottom
- #dcc08c | card art-frame ground | eventCardArtFrame background behind card art
- #eee1c4 | --terrain-neutral-light | Terrain tint fallback light stop
- #d8c8a8 | --terrain-neutral | Neutral terrain ground; alpha twin rgb(216 200 168 / 17-34%) for --terrain-neutral-soft and terrainChip fallback
- #9f8e70 | --terrain-neutral-shade | Terrain chip shade gradient fallback
- #5f4a35 | --terrain-neutral-line | Neutral hex stroke base; alpha twin rgb(95 74 53 / 24-28%) for hex hover drop-shadows
- #ffffff | pure white | placementCaption text (#fff) and rgb(255 255 255 / 48-55%) inset highlights on resourcePill/tooltip rows (4x)
- #c0461c | --clay (primary accent) | Accent everywhere: --accent, active tabs, acting player, end-turn gradient top, scrollbar thumbs, season autumn tint. Alpha twin rgb(192 70 28 / x%) 17x: selected states 16-20%, --panel-soft 10%, --line-strong 48%, --ledger-accent 70%, unrest banners, pending-tile glow
- #8f2e13 | --clay-deep | End-turn/resolve gradient bottom, settlement glyph tint, card kickers/labels. Alpha twin rgb(143 46 19 / x%) 26x: framed-icon borders 40-46%, card pinstripes 18-36%, ledger hairlines 13%, riot row ground 10%
- #d15225 | clay hover (untokenized) | eventResolveButton hover gradient top — lightened clay with no token
- #502312 | card frame brown (untokenized, written as rgb(80 35 18 / x%)) | 10x: 2px borders and inset rings of all three card surfaces, foundColony popover/arrow border, placement cancel/close borders
- #722420 | --oxblood (DEAD) | Defined on .shell, never referenced
- #b13a28 | danger red (untokenized; = rgb(177 58 40)) | Negative deltas, over-capacity text, tileConfirmCancel bg, resourceFlashDecrease, negative cost list at /92% — 11 combined uses across two encodings
- #2f7d46 | success green (untokenized; = rgb(47 125 70)); also happiness resource color in resourceVisuals.ts | Positive deltas, tileConfirmAccept bg, resourceFlashIncrease borders/fills — 8 combined uses plus TS
- #5e6e3a | --olive | scoreTooltip positive, popSummaryGain, season spring tint; alpha twin rgb(94 110 58 / 42%) is forest --terrain-hue-soft
- #586f3f | forest terrain hue (near-dupe of --olive) | terrainTint-forest --terrain-hue
- #c6bd70 | forest light | terrainTint-forest --terrain-hue-light
- #354927 | wood resource dark (TS, resourceVisuals.ts) | wood --resource-color text/icons
- #52703a | wood tile green (TS) | wood --resource-tile hex fill
- #9bbf52 | food green (TS; = rgb(155 191 82)) | food resource color/tile; alpha twin is plains --terrain-hue-soft (42%)
- #d98a35 | --ochre (= rgb(217 138 53); also gold resource color in TS) | Ochre token, gold resource, hill --terrain-hue-soft base, unrest discontent banner borders/fills, pending-tile outer glow
- #d69c35 | plains hue (near-dupe of --ochre) | terrainTint-plains --terrain-hue
- #ffd970 | plains light | terrainTint-plains --terrain-hue-light
- #d09955 | hill light (near-dupe of ochre family) | terrainTint-hill --terrain-hue-light
- #8b5a2f | hill hue brown | terrainTint-hill --terrain-hue
- #f6d98a | placement candidate gold (untokenized; = rgb(246 217 138)) | Colony-placement candidate hex stroke + pulse glow (modals.css)
- #1f6977 | --aegean (= rgb(31 105 119); also influence resource color in TS) | --accent-2 focus outlines, winter season tint, shell radial wash, foam drop-shadows, influence resource
- #4b8994 | sea gradient top (untokenized) | hexMap sea background gradient stop 1
- #76aeb2 | sea gradient mid (untokenized) | hexMap sea gradient stop 2 (54%)
- #2f707e | sea gradient deep (untokenized) | hexMap sea gradient stop 3
- #183e46 | map control chrome (untokenized, written rgb(24 62 70 / 82%)) | Zoom/mode control buttons and setup caption grounds over the sea
- #08161c | map shadow (untokenized, written rgb(8 22 28 / 24-55%)) | 6x: shadows/glows for map controls and placement caption text-shadow
- #8f8571 | --stone (also stone resource color in TS; = rgb(143 133 113)) | Stone token + resource color/tile; alpha twin is mountain --terrain-hue-soft
- #7d8582 | mountain hue (near-dupe of --stone, cooler) | terrainTint-mountain --terrain-hue
- #d4d1c3 | mountain light | terrainTint-mountain --terrain-hue-light
- #482a15 | shadow brown (untokenized base of --shadow/--lift-shadow, written rgb(72 42 21 / x%)) | 14x: --shadow, --lift-shadow, and nearly every small component shadow (framed icons, pills, season dial, chip badges)
- #000000 | pure black shadow | rgb(0 0 0 / 42-48%) card-surface and popover drop shadows (4x, modals.css)
- #1e3a8a | PLAYER_COLORS[0] navy (TS, game/data.ts) | Player 0 settlements/roster dots via --player-color; off the ceramic palette
- #eab308 | PLAYER_COLORS[1] yellow (TS) | Player 1 color; off-palette Tailwind yellow-500
- #7c3aed | PLAYER_COLORS[2] violet (TS) | Player 2 color; off-palette Tailwind violet-600
- #c1121f | PLAYER_COLORS[3] red (TS) | Player 3 color; near danger-red but not identical (#b13a28)

## FONTS
- --font-display: Copperplate, "Copperplate Gothic Light", "Iowan Old Style", Georgia, serif
- --font-body: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif
