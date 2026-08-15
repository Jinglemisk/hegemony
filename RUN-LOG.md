# RUN-LOG — the UI overhaul autonomous pass

Append-only. One section per phase: what shipped · commits · deviations (and why) ·
anything left red · screenshots taken. This file is the owner's re-entry point.

Branch: `ui-overhaul` · worktree: `~/Desktop/hegemony-ui-overhaul` · run started
2026-08-15. Rules and policies: `THIS-WORKTREE.md`. Plan: `docs/plans/ui-overhaul.md`.

---

## Phase 00 — run scaffold

**Shipped.** The three planning documents and this log, committed as the run's first
commit so every later diff sits on top of a recorded intent.

- `THIS-WORKTREE.md` — branch rules, run loop, owner-ratified policies.
- `docs/plans/ui-overhaul.md` — the technical plan, phases 0a → 6.
- `docs/plans/ui-overhaul-prototypes/` — six screenshot-verified reference scenes
  plus `proto.css`.
- `RUN-LOG.md` — this file.

**Deviations.** None.

**Red.** None.

**Screenshots.** None yet.

---

## Phase 0a — tokens & guards

**Shipped.** The invisible groundwork: one token table, one type vocabulary, one
place that knows how big the chrome is, and a ratchet that stops the old habits
coming back.

- **Self-hosted faces.** Cinzel (display) + Alegreya (body), 24 woff2 files /
  565 KiB in `assets/fonts`, `@font-face` in `src/styles/fonts.css`. Latin,
  latin-ext, greek and greek-ext subsets — the Greek ones are not optional, the UI
  writes real Greek (blazons Δ Ν Θ Κ, ostraka ΝΑΙ / ΟΥ). Marcellus and Source
  Serif 4 retired; the Google Fonts `<link>` is gone from `index.html`.
- **Tokens moved to `:root`.** The whole table left `.shell`, which now carries
  layout only. Two things were broken by the old scoping and are fixed by the
  move: the camera's probe had to be mounted inside `.shell` to read anything, and
  anything portalled out of the shell lost the palette.
- **New tokens.** `--pos/--neg/--warn` plus their `-lit` twins for lacquer
  objects; the four player glazes under their real names (and `--p4` corrected
  from olive `#55673a` to Porphyra `#7c4d79` — it was colliding with `--olive`);
  the terrain ramp; a five-step 8px spacing scale; a nine-rung named z ladder.
- **Nine type roles** in the new `src/styles/type.css`: display / title / verb /
  label / body / body-em / stat / stat-lg / caption, with `.num` tabular figures
  and the `.pos/.neg/.warn` text colours. Sizes are rem, so they ride `--ui-scale`
  with the rest of the chrome.
- **The global button rule is dead.** `button { font-family: var(--disp);
font-weight: 700 }` fired on every button in the app; the display register is
  opt-in now via the role classes.
- **Camera couplings extracted** into `src/ui/chromeMetrics.ts` with a focused
  test: the `{ top: 96, bottom: 100 }` literal became `--camera-inset-top/-bot`
  (each derived from its bar's height), and the bare `360` became
  `--panel-w-base`. `useMapCamera` now holds no dimensions at all.
- **`npm run ui:check`** — `scripts/check-ui-system.mjs`. Counts three habits and
  fails only when a count RISES: font sizes outside the role sheet (224), raw
  hexes outside `base.css` (75), and `title=` sentences explaining mechanics in
  printed chrome (20). Those are the starting budgets; later phases turn them down.

**Commits.** `758f040` fonts · `4685215` tokens + roles · `388b380` camera
metrics · `db0b58d` ratchet.

**Deviations.**

- The plan calls Phase 0a invisible. Killing the global button font rule is item 4
  of that phase and is _not_ invisible — every unstyled button dropped from Cinzel
  700 to Alegreya. Followed the plan; the phases that follow restyle those buttons
  deliberately, which is the point.
- The audit's starting counts were quoted as 237 font-size declarations and ~60
  metatext sites. The ratchet measures 224 and 20 against its own definitions
  (`title=` holding a full sentence, comments stripped). Recorded as measured
  rather than reconciled to the audit's prose — the number that matters is that it
  only goes down from here.
- The metrics test injects a fake measurer rather than driving real CSS: jsdom has
  no layout engine, so `var()`/`calc()` never resolve there. Testing the
  composition against the exact expression strings also pins the token _names_,
  which is the thing that actually rots.

**Red.** None. `check` · `test:parity` (65) · `chromeMetrics` (7) · `lint` ·
`ui:check` all green.

**Screenshots.** `.playwright-mcp/p0a-{table,assembly}-1440x900.png`. Both scenes
render; the only visible change is the typeface. Confirmed the two known bugs
still present for later phases: the TUNE fab sits on top of END TURN, and the
board shows `CITY -2,0` / `COLONY 3,0` rather than names.

---

## Phase 0b — the effect-icon system

**Shipped.** 94 hand-drawn SVG line icons, one grid, one line weight, and a total
map from every typed effect to its own glyph.

- **`src/ui/icons/glyphs.ts`** — the whole alphabet as path data in one module, so
  drift in line weight or optical size is visible by reading rather than by
  diffing screenshots. Rules enforced in the suite: 24×24 grid, stroke-only in
  `currentColor`, round caps, at most one solid mass per glyph.
- **`src/ui/icons/Icon.tsx` + `src/styles/icons.css`** — three sizes and only
  three (14 inline / 18 verb / 24 rail), stroke width set once and deliberately
  NOT scaled with the icon, so a 14px glyph renders a ~1px line instead of a fat
  one. Icons are `aria-hidden` unless given a label; a glyph beside its own text
  should not be announced twice.
- **`src/ui/iconRegistry.ts`** — fifteen families, every one `satisfies
Record<Union, GlyphId>`, so a new effect kind without an icon is a compile
  error. Includes the nouns (resources, pops, settlements, terrain, seasons,
  verbs, buildings, orators, tables) and the six effect vocabularies.
- **`<EffectIcon family=… effect=… />`** takes the effect the caller already
  holds rather than a glyph name, so each union is narrowed in exactly one place
  in the frontend.
- **`src/ui/iconRegistry.test.ts`**, added to `npm run test:parity` (95 tests
  now). Beyond totality it asserts the thing types cannot say: **no two members of
  the same family share a glyph.** Eleven law effects must be eleven pictures. It
  also checks every registry entry resolves to real path data, that no glyph
  strays off the grid, the one-solid-mass rule, and that no glyph was drawn and
  then forgotten.

**Deviations.**

- **Six glyphs were redrawn after looking at them**, which is the only way this
  works. The contact sheet at 14/18/24/44px (`.playwright-mcp/glyphs.png`, script
  in `.playwright-mcp/sheet.mjs`) caught: `stone` indistinguishable from
  `mountain`; `influence` drawn as an Ionic capital and reading as a table (now a
  ribboned medal — influence is standing, not a second currency); `plains` drawn
  as two wave lines and reading as the sea; `gymnasion` drawn as a running track
  and reading as an eye, which `omen` already owns; `spring` too close to the
  Grow sprout; and all four orators wearing their distinguishing marks _inside_
  the head silhouette, where at 14px they vanished and the four became one man.
- **Sharing a glyph across families is allowed, within a family is not.** Forest
  terrain and the wood resource are the same tree because they are the same
  thing; the bank's rate step and the forum both get the scales. The test draws
  the line exactly there.
- **Cross-family sizing:** the plan's inventory listed ~50–70 glyphs; the set came
  in at 94 because the nine buildings, five terrains, four seasons and four
  orators all needed their own architecture rather than the shared atlas cells
  they had been aliased onto (the sprite atlas mapped forum→marketplace,
  aqueduct→granary, and odeon/villa/gymnasion all→temple).
- **The die's pips are rings, not filled dots.** Three solid masses would have
  made it the one glyph in the set that reads as a sticker, and at 14px a 1.6r
  ring closes into a dot anyway.
- Glyphs are declared but not yet _placed_ — Phases 1–5 replace the PNG mask and
  atlas call sites surface by surface. The ratchet counts are unchanged for that
  reason.

**Commits.** `742c87b`.

**Red.** None. `check` · `lint` · `test:parity` (95) · `ui:check` green.

**Screenshots.** `.playwright-mcp/glyphs.png` — the full set at four sizes. This
is the sheet to look at first if a later phase's icons ever stop matching.

---

## Phase 1 — the great deletion

**Shipped.** Fourteen sites where the UI explained a mechanic in printed chrome
are gone. Nothing that was a _fact_ was lost — facts were kept and shortened;
what went is the teaching.

- **Panel ledes:** Codex ("the whole rulebook, as this board plays it…"), both
  Market lectures (the unit-of-account paragraph and the spread warning), the
  Victory scoring rule, the Agora's convening rules and the Voice footnote.
- **The Victory tab gained a heldline** — `2/3 LAURELS HELD` — because that is
  what the deleted paragraph was really carrying. A count is a fact you can act
  on; the rule behind it is one hover away in the Codex, which is the whole
  bargain of this phase.
- **The Agora note became one line of game voice:** `NEXT ASSEMBLY · SPRING OF
YEAR 3` instead of a paragraph about when the Assembly convenes and how long a
  Law stands.
- **The Assembly stopped explaining its own harness:** the proposal hint under the
  seats and the two hot-seat notes in the foot. The seats already show who has
  spoken; the waiting note is now `YOU HAVE SPOKEN · 2 STILL TO DECIDE`.
- **Deck telemetry left the bottom spine** (`Seasonal 32 · Events 82 · Classic ·
Seed private`). None of it is a move the player can make.
- **Modal lectures:** Calm's stacking rule, the riot-insurance instruction line,
  the venture subtitle, and the upgrade note about population carrying over.
- **Lecturing titles** shortened to names: the season dial's four-sentence
  explanation of the game clock, the victory-card `title`.
- **Empty states in the game's voice:** "No settlements yet" → "No walls have
  risen yet"; "No stelae stand" → "No stele bears his name"; "No colony can be
  upgraded into a city right now" → "No colony is ready to become a city".
- **`blockedHint` is optional** and documented as tooltip-only. End Turn's was
  deleted outright — it repeated its own hint word for word.
- **The TUNE fab moved to the top-left of the map well.** It was fixed
  bottom-right at `z-index: 9999`, lying directly on END TURN and swallowing
  clicks on the one button that must never be blocked. Confirmed fixed in the
  screenshot.

**Deviations.**

- **The `printed-mechanics` rule was rewritten, and it is narrower than the habit
  it names.** The first version counted any `title=` with three words and scored
  20 — nearly all of them short labels like "3 cities". Widening it to catch
  printed prose scored 601, mostly source comments and type signatures; after
  stripping comments and test files it still could not tell a lecture from a
  status line in the game's own voice ("The house has risen"), which is exactly
  the register the overhaul wants MORE of. A check that fires on both would be
  switched off within a week. So the rule now counts only what it can judge
  honestly — a `title=` holding a sentence rather than a name, with
  interpolations collapsed before measuring — and the script says so in a comment
  at the site. Printed prose is removed by hand and recorded here. **Budget: 20 →
  0**, so that half of the habit is now a hard gate rather than a ratchet.
- `font-size` (224) and `raw-hex` (75) are unchanged — this phase deleted text,
  not styling. They come down in Phases 2–5.

**Commits.** `0495109` ledes · `f9fdfbf` assembly harness copy · `0692eaa` chrome
telemetry and titles · `91ed9fc` modals and empty states · `33cd0d9` verbs ·
`9f02695` TUNE fab · `ae1c4d3` ratchet.

**Red.** None. `check` · `lint` · `test:parity` (95) · `ui:check` green.

**Screenshots.** `.playwright-mcp/p1-{table,assembly,market,victory}-1440x900.png`.
END TURN is now unobstructed; the Market tab is rates and buttons with no prose
above or below them.

---

## Phase 2 — the ceramic shell

**Shipped.** The frame is bone ceramic on a painted chart, symmetric, with a dial
at each end of the bottom rail.

- **Two bone bars.** `--bar-face` slip gradient, ink figures, a clay meander strip
  along each bar's inner edge, soft outer shadow. No dark slabs anywhere in the
  chrome — vase-black and clay are now spent only on objects you press or throw.
- **The sea is the chart.** `assets/map/aegean-sea-board.png` full-bleed under the
  board, replacing the teal gradient and its two texture passes, with a vignette
  so the bone tablets read as lying ON the table.
- **Symmetry.** Event slips left (capped at `calc(50vw - 220px)` so a long omen
  name can never slide under the numbers), the resource spine pinned to the
  viewport's true centre, the roster hard right. The season medallion left the top
  bar entirely.
- **The resource spine:** one row of six, `stat-lg stat-xl` 26px values with signed
  colour-and-sign deltas and the new SVG glyphs at 21px. A stockpile that changes
  now flashes the _numeral_; the old flash filled the pill with a green or red
  plate for a second and a half, which on a bar of six numbers read as an alarm
  every turn. `prefers-reduced-motion` settles instantly.
- **The roster** is four glazed discs with Greek blazons (Δ Ν Θ Κ) and ivory
  keylines, the acting seat underlined in clay — previously four bare coloured
  squares told apart by hue alone.
- **Twin dials.** `SeasonClock` (outer arc = game spent, inner annulus = the four
  seasons rotating under a needle fixed at 45°, hub = year in Roman numerals) and
  `EndTurnSeal` (clay disc, beaded ring, ivory hourglass from the glyph table,
  acting player beneath). Both protrude above the rail and above the tablets.
- **Verbs** rebuilt flat and centred: glyph + name + price. Blocked dims to 38%
  **except the part of the price you cannot pay**, which stays at full opacity in
  `--neg` — the answer to "why can't I?" is on screen without hovering.
- **Docked tablets.** `DiscRail` → `TabRail`: a 46px slip spine at each edge with
  its tabs vertically centred, the open tab continuous with its bone page. The
  floating rounded cards are gone.

**Deviations.**

- **`PLAYER_COLORS` was deleted from `src/game/data.ts`.** Four Tailwind primaries
  (`#1e3a8a`, `#eab308`, `#7c3aed`, `#c1121f`) living in the engine's data table
  and fighting the palette in nine components. They are now
  `src/ui/playerGlazes.ts` — glaze, colour, blazon per seat — which is where a
  frontend fact belongs. Purely presentational, no rule or save touched, so it is
  **not** an `engine:` commit; nothing in `src/game` read it.
- **`.verb` collided with `.verb`.** The type role and the dock's button class
  shared a name, and every roster glaze picked up the button's flex box and
  min-width and stopped being a disc. The button is `.railVerb` now. Roles
  describe text; component classes describe things; they must never share a name.
  Cost: one wasted screenshot cycle, and worth recording as the rule it produced.
- **SVG text sizes moved onto the elements as `fontSize` attributes.** Inside a
  fixed viewBox a font-size is geometry — the same kind of number as `r` or `cx` —
  and putting the dials' four text sizes in CSS would have meant either weakening
  the role sheet or inventing roles for artwork.
- **Season sector and seal gradient colours became tokens** (`--season-*`,
  `--clay-lit`, `--clay-shade`) rather than sitting as loose hexes in a component
  sheet. The ratchet caught them, which is what it is for.
- **Superseded rules were deleted, not left dormant** — `.verbDisc`, `.verbKnob`,
  `.endTurnSquare`, `.dockSeason*`, `.seatSwatch*`, `.topResourceHalf`,
  `.seasonBanner`, `.ledgerRail*`, `.railDisc*`, `.consultRail*`, `.seasonDial*`
  — plus the now-dead `SeasonDial`/`SeasonStatus` components and `DiscRail`.
  Ratchet: **font-size 224 → 211**, raw-hex 75 → 74.
- **`.playwright-mcp/` is now eslint-ignored.** It is a gitignored scratch
  directory for screenshots and the throwaway scripts that drive them; linting
  build artefacts is noise.
- `src/ui/icons/EffectIcon.tsx` is written and tested but not yet placed — Phase 4
  puts it on every effect row. `npm run dead-code` will name it until then.

**Commits.** `a4a217f` glazes · `90d2b2d` bars + chart · `3b9dbcf` topbar ·
`5d83903` dials · `a8385bd` tablets · `373519f` fab + ratchet.

**Red.** None. `check` · `lint` · `test:parity` (95) · `ui:check` green at both
widths.

**Screenshots.** `.playwright-mcp/p2-table-{1440x900,1280x800}.png`,
`p2-assembly-1280x800.png`, plus `crop-top*`/`crop-bottom` for the two bars.

---

## Phase 3 — the board

**Shipped.** The board reads by shape now. One grammar governs it: **shape says
what · colour says whose · stroke says state.**

- **Terrain ramp** `--t-plains` → `--t-mountain`: four steps of the same bone,
  deliberately almost flat, because **kind is carried by an engraved emblem**
  (`src/ui/boardEmblems.ts` — three firs, a ridge with a false summit, uneven
  furrows, a double swell, the omphalos) at 30% ink. That flatness is what buys
  the owner glazes their loudness.
- **Settlement tokens:** a glazed seal with an ivory keyline (city = temple front,
  colony = pennant), **pop beads** arced beneath (solid = citizen, ring = freeman,
  black = slave — three shapes, no colour, so the ladder survives beside four
  glazes), an **owner rim** as an inner hex stroke, and an **ivory name plate**.
- **Names.** ARGOS, THERMON, PYLOS… `src/ui/settlementNames.ts` derives a
  deterministic name from the settlement's own engine-allocated id, deduped
  board-wide so two places never share one. `City -2,0` now appears nowhere: the
  map, the Cities tab, every settlement picker, the build tooltips and the income
  breakdown all say the place's name. Coordinates survive in tooltips and
  accessible labels, where a debugging fact belongs.
- **States are strokes.** Selection = clay; a legal target = dashed aegean (the
  one place the politics colour touches the board, and it means "the rules accept
  this", not "this is good"); pending = dashed clay. **Non-targets dim to 42%** —
  quieter than lighting up the right answers on a board this dense.
- **Slot pips are hidden at rest** and appear only while you are choosing where to
  build. Forty permanent "0/3"s were forty numbers nobody read.
- **The white dashed coastline is gone.** It was the loudest line on the board and
  carried no information — the island's edge is already the edge. A soft ink
  shadow remains.
- **Fixed the Found-banner overlap.** The targeting caption sat 60px off the
  viewport's bottom, which is _inside_ the command rail: the instruction printed
  straight through the verb buttons, character over character. It clears the whole
  rail now, dials included, and it is a bone-on-lacquer object rather than a teal
  pill.

**Deviations.**

- **One `engine:` commit** (`2438baa`). `IncomeContribution` gained an optional
  `settlementId`. The engine mints its own label — `"City on plains -2,0"` — and
  the simulator, telemetry and tests all read it, so that string stays exactly as
  it was; the id is purely additive and lets the frontend put ARGOS on the row
  without the engine having to know that settlements have names. No rule, no
  balance, no save shape changed. Full suite re-run: **489 tests green.**
- **Names are derived, not stored.** The plan allowed an engine name field with a
  migration. Deriving from the id gives the same guarantee — stable across a
  reload, a rewind and a different machine — for no state and no migration, so the
  field would have been carrying a string the rules never read.
- **The board draws in two passes.** A name plate hangs below its hex into the
  neighbour's, and SVG has no z-index — paint order is the only lever — so a
  single pass had every plate half-buried under the tile drawn after it
  ("OLYNTHOS" arriving as "OLYNTHO"). `TileGroup` split into `TileGround` and
  `TileTokens`; `HexMap` runs all the ground, then everything standing on it.
- **The tile inset dropped from 2 to 1.** At 2 the sea showed through every seam
  and the island read as forty separate counters rather than one landmass.
- `getColonyXPositions` became `getSideBySidePositions` (a tile can hold a city
  _and_ a rival's colony) and widened 14 → 22 to clear the bigger seals; its test
  moved with it rather than a second constant appearing in the component.
- Board text sizes moved onto their elements as `fontSize` attributes, for the
  same reason as the dials': inside the world's coordinate system a size is
  geometry that pans and zooms with the tile.
- Superseded styles deleted: `.terrainTint-*`, the old `.hexTile`, `.oracleMark`,
  `.tileSlotsGlyph`, `.tileYieldGlyph`, `.tileMetric`, `.settlementShape`,
  `.cityShape`, `.colonyOverflow`. Ratchet: **raw-hex 74 → 61**, font-size 211 → 210.

**Commits.** `663c898` names · `19a2b6e` tokens + two-pass · `ab1a4bc` ramp,
emblems, states · `dfe1ca0` ratchet · `2438baa` engine id · `bbeaa44` name sweep.

**Red.** None. `check` · `lint` · **full `test:run` (489)** · `ui:check` ·
`format:check` green.

**Screenshots.** `.playwright-mcp/p3-table-{1440x900,1280x800}.png`,
`p3-targeting.png` (dimming + dashed targets + the banner clearing the rail),
`board3.png` (the board close up).
