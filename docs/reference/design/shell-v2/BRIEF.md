# Shell v2 · design brief (Katalogos round 1)

The brief every Round 1 layout candidate was built to, kept as the design reference for the
winning layout in `mock/`. Paths are relative to the repository root. ROUND was the working
folder `docs/reference/design/katalogos-v2/round-1/`, which was never committed; all seven
candidates survive in the Round One archive artifact.

## Why this round exists

The owner picked Katalogos (arm B of "Three Tables") and judged the mock "woefully
unfinished, random gaps between components, very amateurish". The idea is right; the
fidelity and execution are not (Q76). This round produces four full-scene layout
candidates at shipping fidelity. The owner picks one; later rounds fill every surface.

The candidate's stylesheet is meant to become the production stylesheet. The React build
will render the same class names verbatim, so write CSS you would ship.

## Target feel

A high-utility, simple RTS/strategy UI modelled on Imperator: Rome: a quiet thin top bar
for resources, a large bottom-left area where most information is read, verbs on edges
that face the centre, end turn bottom right. Dense but calm; every pixel has a job; no
decoration that is not information. Keep the Katalogos visual language (Q76): bone and
ivory paper, ink rules, tabular numerals, Cinzel only for proper names and titles,
Alegreya / Alegreya Sans for text, the ceramic palette. Raise execution, do not restyle.

## Owner sketches (look at both PNGs)

- `docs/reference/design/sketches/2026-09-25-layout-primary.png` · PRIMARY: thin top
  resource bar; a large bottom-left information area (about 35% of width, 35% of height at
  1920×1080) whose top-right corner is one large quarter-round curve; verb discs ride that
  curve (along the top edge and down the arc), facing the centre; a vertical strip on the
  right edge, full height below the top bar, holding the rival player icons (its inner edge
  faces the centre and can hold consult buttons); hourglass end turn bottom right.
- `docs/reference/design/sketches/2026-09-25-layout-secondary.png` · SECONDARY: same top
  bar and same bottom-left area with the curved corner; verb discs in one row along a thin
  bottom strip to the right of the area; hourglass end turn at the far bottom right. No
  right strip: place the rival icons where they read at a glance without eating the island
  (for example the right end of the top bar, or a small stack top-right).

## Starting material

- Reference mock: `ROUND/reference/three-tables.html` (arm B). Reuse its `<script id="data">`
  JSON (the app's real glyph paths, the classic 37-hex board, the opening), its scene
  constants (SETTLE, YEAR, RES, LEVEL, PIECES, ROSTER, VERBS, ADVISORY, CARDS, LAWS) and its
  board renderer and exclusion-rectangle fit (`renderBoard`, `fitBoard`). Its screenshot at
  1440 is `ROUND/reference/shot-1440.png`; its gate result is `ROUND/reference/gates.json`.
- Strategy paper: `docs/reports/product/2026-09-06-asymmetric-table.md` §5 and §6.
- Audit of the failed rebuild: `docs/reports/audits/2026-09-06-asymmetric-shell-audit.md`
  (defects D1–D18 are the mistakes not to repeat).
- Placeholder raster icons (Imperator: Rome art, prototype only): `ROUND/icons/<family>/<name>.png`,
  128px, same optical weight. Families: resources, pops, settlements, buildings, market,
  unrest, assembly, chrome, terrain, victory, events. From a candidate page use
  `../icons/...`. Vector glyphs are in the reference's data JSON.

## The scene (identical in every candidate)

Year V of XIV. Damon (Kyanos, blue) is acting. This year's card: Drought, "Plains slaves
yield nothing this year." Resources: wood 6, stone 3, food 4, gold 9, influence 5, each
with next-turn delta; the level +1 (riot at −3, revolt at −6). Pieces: colonies 2 of 4 left,
cities 3 of 3. The bottom-left area is open on the ARGOS settlement subject: the
three-column view (Slaves · Freemen · Citizens, each column's count, printed value ×1 or ×2
and yield; Marketplace makes freemen ×2), the building lines, slots used, and the
settlement's actions. Its tabs: Cities · Ladder · Build · Market, plus the ARGOS subject tab.
The area's header names the realm and carries the Idea purchase ("National Idea · 6
influence") and the piece counts.

Verbs (Q72), each a disc with its price: Grow (2 food slave · 3 food freeman), Promote
(2 gold), Move (1 food), Found (4 wood 1 food · 2 left), Upgrade (3 wood 3 stone · 3 left),
Build (one price each), Calm (2 gold or 2 influence), Venture (2 gold), and one Exchange disc
that bundles the Dole (3 influence → 1 food) and the bank (sell 3 wood, stone or food → 1
gold; buy 1 → 2 gold) and expands on hover to show those options as small discs. Hotkeys
1–9 shown discreetly.

Rivals (Q70): player icons only (Damon, Nikos, Theron, Kyros in their glaze colours;
Nikos carries a threat mark: one condition from a third card). Hovering an icon shows a
tooltip with the count of each pop class, cities and colonies.

Also present, compactly: the ticker line ("Year V · Nikos claimed the Purple Dye mooring off
NAXOS."), consult entry points (Chronicle, Codex, Victory, Agora), and the hourglass END
TURN with an advisory badge (2). No dev rig, no notes panel, no frame switcher: the page
fills the viewport it is given.

The island: the map is a canvas the player drags to pan (owner ruling, 2026-09-27), so
the chrome may overlap the map and a small opening frame is not a defect. The opening view
fits all 37 hexes against the chrome as exclusion rectangles, so no tile starts under
chrome; after that the player moves the map. Board share describes the opening view only
and is not a ranking criterion.

## Stylesheet contract (production CSS)

- Files: `index.html` (markup plus the small script that renders the scene and fits the
  board) and `shell.css` (all styling). Google Fonts link allowed. Nothing else external.
- Tokens on `:root`: colours, type scale, one spacing scale, one grid unit, icon sizes,
  radii, shadows. Every length in the CSS comes from a token or is derived from tokens.
- Gate declarations on `:root` (the gate reads these):
  `--gate-space: "0 4 8 12 16 24 32 48 64"` (or your own scale; one scale, used everywhere),
  `--gate-grid: 4` (or 8), `--gate-icons: "16 20 24 32 48"` (your set), `--gate-hit: 24`
  (or more), `--gate-text: 12`. Panel body text sits at 14px or above; 12px is the floor.
- Class names are component-semantic (`.topbar`, `.realm`, `.realm-tabs`, `.settle-cols`,
  `.verb`, `.verb-disc`, `.rival`, `.tooltip`, `.endturn` …) so a React component can
  render them as they are.
- No `style=""` attributes except custom properties that carry data (`--owner`, `--i`),
  no one-off pixel nudges, no `!important`, no magic numbers outside tokens.
- Markup for the gate: `data-c="<name>"` on every component box (panel, header, tab, row,
  cell, disc, icon button). `data-gate-flex` on a component whose children are deliberately
  distributed. `data-gate-skip` on hidden-by-default layers (tooltips, the expanded
  exchange). `data-gate-hover="rival"` on the Nikos icon and `data-gate-hover="exchange"`
  on the Exchange disc so the gate captures those hover states. The island is
  `<svg id="board">` with one `[data-tile]` group per hex.

## The gate

    node docs/reference/design/shell-v2/gates.mjs docs/reference/design/shell-v2/mock

It loads the page at 1280×720, 1440×900 and 1920×1080 and fails on: gaps or insets off the
spacing scale; region edges off the grid; near-miss alignments (edges 1–3px apart);
overlapping top-level panels; clipped, truncated or spilling text; text below the floor;
icons off the declared sizes; hit targets below the floor; tiles under chrome or off screen;
page errors. It writes `gates.json`, `shot-1280.png`, `shot-1440.png`, `shot-1920.png`
and the hover shots into the candidate folder. Board and island share are reported, not
gated. Since the map pans, they describe only the opening view, not how much map a player
can reach.

## Deliverables per candidate folder

`index.html`, `shell.css`, the gate outputs, and `NOTES.md` (at most 12 lines: grid unit,
spacing scale, type scale, the component list, and any trade-off the owner should know).
Work only inside your own candidate folder.
