---
status: active
phase: "v2"
updated: 2026-09-28
---

# v2 migration: the shallow economy in the Hybrid arc shell

## Outcome

On the branch `feat/v2`, Hegemony plays by the shallow-economy rules inside the Hybrid arc
shell, while `main` keeps today's game. A player reads every income as counts on printed
numbers and every price as one number, and acts through six verb discs on the realm panel's
curved edge. The owner can run the old and new games side by side and decides when
`feat/v2` replaces `main`.

## How to run this plan

- Work in the worktree `hegemony-v2`, next to the primary checkout, on branch `feat/v2`.
  It was cut from `main` on 2026-09-28 with dependencies installed.
- One step per session. Open a session with "start step N in docs/plans/v2-migration.md".
  A step is done when its checks pass, its work is committed and pushed to `feat/v2`, and
  its box below is ticked with a one-line evidence note.
- Keep each step's fan-out small: one agent or a few. No overnight mega-workflows. Round 1
  of the layout work cost about 6M tokens and hit the weekly usage limit, and workflow
  resume did not replay pipeline agents from cache. Every agent writes its result to disk,
  so a rerun skips finished work.
- Every step keeps all three axes working: `npm run check`, `npm run lint`,
  `npm run test:run`, `npm run test:parity`, and a bot batch through `npm run sim`
  (commands in [simulation](../reference/simulation.md)).
- `main` receives docs only until the owner merges `feat/v2`.

## Non-goals

- Player trade. [Its plan](player-trade.md) stays blocked; the bank's gold corridor bridges
  until it ships.
- Multiplayer and server work.
- Final tuning. Every number in the paper is a placeholder: Step 11 settles structure and a
  human session settles feel.
- More HTML mock rounds. The mock is the reference; the remaining surfaces are designed in
  the app.

## Settled inputs

**Systems.** The [direction paper](../reports/balance/2026-09-05-shallow-economy.md) v0.2,
with the owner's rulings in its section 8, plus these later rulings:

- One Temple and one Granary per settlement, like every building (2026-09-25).
- No per-player cap on active luxuries; each counts +2 happiness (2026-09-25).
- Setup keeps one citizen; every later citizen comes by promotion (2026-09-25).
- Happiness ships as the clamped integer bank. The level model is built only if Step 11
  shows riots persist (2026-09-06).
- National Ideas follow [their plan](national-ideas.md): one picked at setup, one bought
  with influence.
- Luxury goods as shipped on `main`: coastal only, claimed by a Port that is never free.

**Shell.** The [Hybrid arc mock](../reference/design/shell-v2/mock/index.html), picked by
the owner on 2026-09-28 from seven candidates. Its [brief](../reference/design/shell-v2/BRIEF.md)
and [gate script](../reference/design/shell-v2/gates.mjs) sit beside it.

- Layout after Imperator: Rome. A quiet top bar carries resources, rival icons and consult
  icons. A large bottom-left realm panel has a curved top-right edge, the six verb discs
  sit on that edge, and end turn is bottom right. The map is a canvas the player drags to
  pan.
- Discs, in order:
  - Grow: slave or freeman.
  - People: Promote, Demote, Move.
  - Expand: Found a colony, Upgrade to a city.
  - Build: a class first (Slaves, Freemen, Citizens, Civic), then that class's buildings.
  - Civic: Calm with gold, Calm with influence, the Dole, Venture.
  - Exchange: a resource first (wood, stone, food), then buy or sell.
- Every fan lists all its options, opens after a 0.5 s hover, and backs out one level on
  Escape. Hotkeys 1–6. Grow as its own disc filled an unnamed sixth slot and can be swapped.
- Rivals are player icons; hovering one shows pops by class, cities and colonies.
- Verb names are written under every icon. Imperator raster icons are used throughout:
  `assets/icons/placeholder` plus the unrest set in `docs/reference/design/shell-v2/icons`.
- The brandbook's visual language stays. The bar is fidelity and execution.
- The two KYKLOS triage ledgers are archived; [ui-remaining](ui-remaining.md) is the one
  UI ledger.
- Checks carried from the judges: an open fan never covers a city name; far fan options
  stay open while the pointer travels to them; Build may skip the class step when a class
  has one building; consult icons get labels or tooltips.

**Salvage.** The branch `archive/asymmetric-shell-rebuild` holds the August rebuild. Take
only its engine pieces, by diff, when a step needs them: the advisory selectors, the victory
danger selector and the real-path previews, with their tests.

## Open owner questions

None. Step 11's thresholds are proposals the owner may change before it runs.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                             |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Every rule lands in `src/game` with tests, through one effective ruleset. The UI never computes costs or yields.              |
| Frontend         | Yes      | The new shell shows each rule in the step that lands it. Steps 1–2 replace the old shell outright on `feat/v2`.               |
| Simulation & AI  | Yes      | Bots play every step through legal moves; Step 10 adds personalities; Step 11 compares against the 2026-09-05 baseline seeds. |

Sibling consumers: the realm panel, fans, rival tooltip and sim telemetry all read the same
selectors, so a rule change updates one selector, not three views.

## Architecture impact

- Per-match definition: the v2 ruleset replaces v1 as the default on `feat/v2`, with a
  version bump. Saves from `main` are not migrated.
- Commands: the Dole, the paid pop move, piece-limited founding and upgrading, and the
  two-level Build and Exchange choices are canonical commands with derived legal options.
- Actors: the Assembly stays multi-seat and meets every other year.
- Projections: the rival tooltip reads only the public projection.
- Invariants: pieces are conserved (four colonies and three cities per player), the
  happiness bank stays within −10 to +10, and food never goes negative.
- The year deck replaces seasons and the omen as the clock.

## Steps

### Shell

- [ ] **Step 1 · Frame.** Replace the old in-match shell with the Hybrid arc frame, wired to
      today's engine: the top bar with rivals and their tooltip, the pannable map, the realm
      panel with its tabs and the settlement's three-column view, and end turn. Port the
      mock's tokens into `src/styles` and delete the old shell's components and CSS.
      Exit: bots play a full game in the new shell; browser smoke passes; `ui:audit` and
      `ui:conduct` pass or are updated to the new addresses.
- [ ] **Step 2 · Verb discs and fans.** The six discs as one data-driven component, since the
      disc count must not be hard-coded, with the fan behaviour above, wired to today's legal
      moves and a full keyboard path. Exit: every legal verb is reachable by mouse and by
      keyboard; no fan leaves the screen or covers a city name from 1280 to 1920.

### Systems

Each step also updates the shell panels it touches.

- [ ] **Step 3 · Pops and tiles.** Tiles print terrain and slots only. Slaves yield their
      terrain's resource, hills yield nothing, and slaves eat nothing. Freemen make 1 gold;
      citizens make 1 influence and hold a vote; both eat 1 food. Hunger removes one pop and
      food stays at zero. One settlement per tile. Citizens come only by promotion.
- [ ] **Step 4 · Buildings and prices.** Marketplace, Estate and Forum raise their class
      column; Temple, Granary and Port state one fact each; one of each per settlement.
      Workshop and Villa merge into the Estate; Odeon, Aqueduct and Gymnasion are cut. One
      price per verb, per the paper's section 5.6, including the Dole and the paid pop move.
      Piece supply: four colonies and three cities, and an upgrade returns the colony piece.
- [ ] **Step 5 · Happiness bank.** Integers clamped from −10 to +10, the food-stockpile bonus
      removed, calm as +2 for this year, luxuries +2 each with no cap, and riot and revolt
      per the paper's fallback.
- [ ] **Step 6 · Years and the year deck.** Seasons and the omen retire. A 14-card year deck
      is the clock and the next card stays hidden. Victory is checked at year end with the
      paper's minimums; Treasurer counts gold only; Voice is a level.
- [ ] **Step 7 · Cards.** A player deck of twelve kinds in the four verbs. Ventures take one
      stake of 2 gold. Coupons, choice cards and per-pop scaling go.
- [ ] **Step 8 · Assembly and Laws.** It meets every other year and votes on player proposals
      only. At most four Laws stand, the oldest is replaced, and a new Law has a minimum
      tenure. One vote per seat plus one per citizen, up to two bought votes, no veto. The
      paper's Appendix B Laws and Directives, under its three global limits.
- [ ] **Step 9 · National Ideas.** Per [their plan](national-ideas.md).
- [ ] **Step 10 · Bot personalities.** Slaver, civic and trader as weight vectors over the
      existing evaluator.
- [ ] **Step 11 · Sim gate.** Run batches on the baseline seeds, compare with the
      [2026-09-05 baseline](../reports/simulation/2026-09-05-shallow-economy-baseline.md),
      apply the decision rules below, and save a dated report.
- [ ] **Step 12 · Level model, only if Step 11 calls for it.** Unrest tokens and year cards
      that zero a term, per the paper's section 5.7.

### Finish

- [ ] **Step 13 · Ceremony surfaces.** The year-card reveal, the Assembly sitting, hunger and
      riot moments, victory, and the National Idea pick, designed in the app in the mock's
      language.
- [ ] **Step 14 · Icons.** Rasters for new concepts (year cards, unrest, pieces, the Estate,
      the Dole) through the icon pipeline, as placeholders until the owner approves them.
- [ ] **Step 15 · QA and docs.** Full games by bots and Playwright at 1280, 1440 and 1920;
      the gate script rerun on the real app; `rules.md` rewritten for v2; reference docs
      updated; an owner playtest; the owner's decision on merging `feat/v2` into `main`.

## Step 11 decision rules

Proposed thresholds; the owner may change them before Step 11 runs.

| Question                       | Rule                                                           | If it fails                                         |
| ------------------------------ | -------------------------------------------------------------- | --------------------------------------------------- |
| Does the bank still slide?     | The riot table is reached on at most 10% of turns after year 7 | Build Step 12                                       |
| Does influence plateau?        | Median influence stock at year 14 is at most 1.5 times year 10 | Raise the propose and repeal prices first           |
| Is every build viable?         | Each personality wins between 20% and 45% of games             | Rework the weakest build's column and Law downsides |
| Do player-deck draws matter?   | At least 10% of draws swing more than half a turn's income     | Report only; cutting the deck is the owner's call   |
| How long and how do games end? | Fourteen years; the share ending by the race is recorded       | Report only                                         |

## Acceptance and validation

- Every step: `check`, `lint`, `test:run` and `test:parity` pass, and a bot batch
  completes with no illegal-move errors.
- Step 11's report is saved under `docs/reports/simulation/`.
- Step 15: a full four-seat game plays to victory in the new shell at three widths, and the
  owner playtests it.

## Retirement

When the owner merges `feat/v2` into `main`, update the roadmap, the reference docs and
`rules.md`, then move this plan to `docs/archive/plans/` with the merge PR and the Step 11
report as evidence.
