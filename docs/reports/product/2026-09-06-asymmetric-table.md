# The Asymmetric Table

UI overhaul strategy for the in-match shell, sequenced against the shallow economy.

Report date: 2026-09-06. Companion to
[the shallow-economy direction paper](../balance/2026-09-05-shallow-economy.md). Evidence
files beside it: [the shell audit](../audits/2026-09-06-asymmetric-shell-audit.md),
[the UI impact matrix](2026-09-06-ui-impact-matrix.md) and
[the HUD comparables](2026-09-06-hud-comparables.md).

## 1. The decision in one paragraph

Land the asymmetric shell that already exists as the **frame** first, then change the
**contents** of that frame slice by slice as the shallow economy lands, and only then spend on
ceremony and polish. The frame is the 26 August rebuild recovered today: a stable Realm block
bottom-left, a fixed full-island board, a rulers roster bottom-right, a labelled consult drawer,
a free verb spine, an END TURN docket, a hot-seat handoff and a readability control. It passes
every repository gate and the owner has judged its direction right. Before it ships it needs a
rebase over two weeks of main, three real bugs fixed (an invisible handoff button, a handoff
that shows the next player's private card, a Cities page that cannot be reached inside its own
block), a short list of geometry defects closed, and the auditors re-pointed at its surfaces.
What it must not get is polish on any surface the v0.2 ruleset retires: tile yield numerals, the
season ring, the nine-building matrix, the three-number happiness pill. Those are re-cut inside
the economy slices that replace them, under the three-axis parity rule, so engine, frontend and
simulation change together. Whether the frame is the repaired rebuild or a fresh build from
this paper is the owner's Q67; the sequence holds under either answer.

## 2. Where the shell stands

Three artifacts exist, and the owner has seen all three.

| Artifact | Date | What it is | State |
| --- | --- | --- | --- |
| KYKLOS shell (main) | shipped 2026-08-19, PR #70 | symmetric: left ledger rail and tablet, right consult rail and tablet, resource spine and turn dial dead-centre, seven verb discs bottom-centre, four player seals top-right | live on `main`; its ledgers `ui-triage.md`, `ui-triage-parity.md` and `ui-remaining.md` are active plans |
| Asymmetric prototype | 2026-08-22 to 24 | a hand-built HTML shell at design pixels: a block whose body follows the selection, a draggable 91-tile camera board, a 520×400 block, a four-column roster, an icon-only consult rail | uncommitted HTML in the `ui-asymmetric-layout` worktree; superseded |
| Asymmetric rebuild | 2026-08-26 | the prototype's placement rebuilt **in the real app** after an adversarial review, on branch `feat/asymmetric-shell-rebuild` | recovered today into the `hegemony-asymmetric-shell` worktree beside the repository; **uncommitted**; all gates green |

### 2.1 What the review decided and the rebuild kept

The 26 August review compared the shipped shell with the prototype and rejected the
prototype's two structural bets: a bottom-left block whose body is replaced by whatever is
selected, and a camera board that exists to solve the occlusion that block creates. It kept
the asymmetric placement, the persistent roster, the consult drawer and a visibly labelled End
Turn. Its six rulings: no camera; verbs stay a free spine; 480×360 rather than 520×400; the
Build matrix stays as a Realm tab; verb names stay unchanged with a target subtitle; the drawer
may cover the roster.

The rebuild implemented that verdict plus the six gaps the review found in both shells: an
end-turn ledger, pinned cross-settlement comparison, before-and-after previews for grow,
build, found, move and upgrade, victory threat in the roster, a since-your-last-turn digest on
handoff, and a text-size control independent of chrome scale. Engine-side it added
`src/game/advisory.ts` (pure selectors for blockers, warnings and opportunities), a victory
danger selector and a real-path grow preview. It deleted the symmetric rails and the old
scoreboard. Twenty-one files changed and four paths were added: 467 insertions, 411 deletions.

### 2.2 How it was lost and recovered

Codex placed the worktree in `/private/tmp`, which macOS clears, and nothing was committed.
The session transcript still held all forty `apply_patch` calls and the seven
`prettier --write` runs between them, so the tree was rebuilt by replaying those in order with
an atomic applier. The replayed diff stat matches the transcript's own `git diff --stat` line
for line, and the tree passes format, type, lint, docs, dead-code and the 555-test suite.

### 2.3 What the owner said

"It went in the right direction: a bottom-left larger UI part, smaller elements spread out, like
Age of Empires or any other RTS, or even an RTwP game." Not final.

## 3. What the rebuild is today

The audit drove the recovered tree headless at 1920×1080, 1440×900 and 1280×720 through
every state: rest, a selected settlement, the five Realm pages, the four drawer pages, the
docket, the preview, the handoff, the Assembly and the readability settings. Sixty-two
screenshots, no console errors, every state reachable.

### 3.1 Geometry

| Viewport | Realm block | Roster | Verb spine | Consult rail | Drawer open | Island | Tile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1920×1080 | 480×360 | 280×280 | 556×76 | 92×180 | 400×940 | 803×728 | 112×130 |
| 1440×900 | 480×360 | 280×280 | 556×76 | 92×180 | 400×760 | 637×577 | 89×103 |
| 1280×720 | 428×307 | 231×231 | 554×71 | 80×180 | 354×590 | 482×437 | 68×78 |

Tile hit-targets under chrome at rest: none at 1920 and 1280, one at 1440 (the block's
deliberate 48px reserve cuts the OLYNTHOS plate). The open drawer covers six tiles at 1440 and
three at 1280; the open docket covers 13, 18 and 25. The island uses 54% of the height at
1920 and the top-left quadrant is empty at every width.

### 3.2 The defect ledger

Eighteen defects, three of which break a flow. The full ledger with DOM evidence is in the
audit.

| ID | Severity | Defect | Lands in |
| --- | --- | --- | --- |
| D1 | P1 | Handoff buttons are ivory on ivory: "I am Nikos" and "Begin turn" render as empty boxes | U0 |
| D2 | P1 | The handoff does not cover the next seat: the controller switches the viewer in the same commit, so the next ruler's resources, alarms and pending fate card are legible through the scrim | U0 |
| D3 | P1 | The Cities page cannot be reached: its furniture eats the block, leaving a 58px scroll strip at 1920 and 5px at 1280 for the settlement cards; Pops, Build and Market get 169 to 222px for 360 to 1109px of content | U0 |
| D4 | P2 | Consult rail labels overflow the 48px label column and are clipped by the viewport edge at every width ("CHRONIC", "VICTOR"); with the drawer open they spill onto it | U0 |
| D5 | P2 | Verb target subtitles truncate to "A…" at every width; Upgrade's target is hidden entirely | U0 |
| D6 | P2 | The block's 48px reserve lies over the island at 1440 | U0 |
| D7 | P2 | The open drawer and rail cover the east coast at 1440 and below | U1 |
| D8 | P2 | Focus falls to `body` after the preview modal and the docket close, because the opener unmounts in the same commit | U0 |
| D9 | P2 | Top-strip type below the declared 11px floor at every width: event labels at 7.2 to 8.4px, names at 9.4 to 9.8px, "Effects" at 8px; the compact setting pushes 16 more selectors to 10.1px | U0 |
| D10 | P2 | Truncated stamps ("Spring Fl…", "Warehouse Fi…"), a hard-clipped effect line at 1920, the ticker at 1280 after handoff | U0 |
| D11 | P3 | The docket ends a turn with two plain clicks beside a dial that demands a hold; warnings never gate | U1, with Q69 |
| D12 to D16 | P3 | Docket without dialog semantics or outside-click dismissal; tablists without the pattern; contradictory `aria-pressed` and `aria-expanded`; two controls named "End turn"; stacked Escape handlers | U1 |
| D17 | P3 | Realm page state (Compare pins) resets whenever a tile is selected | U1 |
| D18 | P3 | The dev TUNE button sits over the sea and the Assembly title | U1 |

### 3.3 The code

The engine boundary holds. Shell components read selectors and projections; the advisory and
the victory leader rule live in the engine. Four residues: a move-legality rule written in the
board component, a double gate on end-turn that duplicates the advisory, the handoff's
since-last-turn bookkeeping kept in refs, and a `tileConfirmation` state that is never set to
anything but null yet still feeds props into the map.

The stylesheet is the larger debt. `asymmetric-shell.css` carries 641 declarations, 53 of which
in 25 rules override a property the old sheets already set on the same element rather than
replacing the rule; the old shell's `.tabRail`, `.dockPlinth`, `.roster`, `.seat` and
`.consultPanel` rules survive with no DOM user, along with the `--plinth-*` tokens and a
`uiOverhaulShell` class nothing selects. The sheet is also imported after the one that says it
must load last.

The three tests cover the happy paths and none of the three P1s: the handoff is tested with a
stubbed seat switch, never against the controller that overrides it.

### 3.4 What this changes in the strategy

- **The block's height must follow its content.** A fixed 360px cannot hold a Cities page
  whose masthead repeats the tab name, then an empire strip, an alarm, the active effects and a
  bead legend before the first settlement. The Realm pages become **lists** (one row per
  settlement, building, rung, rate) and the subject tab becomes the **detail** (the full
  settlement card). The block grows upward with its list to a ceiling near 55% of the viewport,
  which also fills the empty top-left quadrant.
- **The handoff is a controller change, not a component fix.** The seat switch must wait for
  "I am Nikos"; until then the shell renders the departing seat's projection and the pending
  event stays unmounted.
- **The sheet must replace, not override.** U0 deletes the orphaned rules and tokens and folds
  the 25 overriding rules into their originals, or the next shell change pays twice.
- **The auditors need new drivers.** `scripts/audit-ui-surfaces.mjs` reaches every tab through
  `.tabRail`, which the rebuild deleted, so `ui:audit` and `ui:conduct` now report clean on
  surfaces they never visit. Its own header warns that this is worse than no checker.

## 4. What the shallow economy asks of the UI

The impact matrix maps all 46 player-facing components against the v0.2 rulings.

| Change | Surfaces | Examples |
| --- | --- | --- |
| Replace | 6 | the turn dial, the top-bar event slips, the unrest alarm, the Cities tab, the rulebook, the effect presenters |
| Reshape | about 28 | every popover that quotes a price, the resource pills, the Build and Market tabs, the Assembly seats and floor, the riot, found and upgrade dialogs |
| New | 14 | year deck clock, piece supply, level gauge and ledger, Unrest tokens, hunger choice, Dole, vote purchase, Law cap preview, Promote as a verb, National Idea pick and purchase, the three-column settlement |
| Unchanged | 9 | the map selection machinery, the luxury marker, the modal chrome, the Codex shell, the setup pop picker |

### 4.1 What dies

The season ring and every reader of the season; the omen slip, modal, art and Codex chapter;
the tile yield in eight places, from the map numeral to the tune panel's terrain totals; the
stored-plus-luxury-equals-effective happiness triple; food-deficit counters, timed modifiers
and the duration strip; the over-capacity penalty; effective-versus-base cost pairs, coupons
and multipliers; building levels and support caps; five of nine buildings with their glyphs and
presenters; growing citizens; the veto; the escalating draw; the Law replacement picker; the
house ballot item; two-stake ventures; choice cards; five derivative Law presenters.

### 4.2 What is born

The year deck as the clock: this year's card face-up with its one-sentence rule, the next
face-down, a year-end victory mark. The piece supply: colony n of 4 and city n of 3 on the Realm
header and the Found and Upgrade lines. The level gauge with its five-line ledger and the riot
and revolt marks, with a plain integer meter as the Tier 1 fallback. The Unrest token pile. The
hunger choice modal. A determinate revolt notice. The Dole in the Market. Vote purchase in gold
or influence. "Passing retires: <oldest Law>" on a proposal. Promote as a verb. The National
Idea pick at setup and the purchase in play. The coastal colony's Port socket. The move cost
row. And the three-column settlement card the paper names as its new surface.

### 4.3 Two kinds of change, and the rule that sequences them

About 25 rows are **content**: copy, numbers, a deleted branch, a roster read from data. About
14 are **structural**: new state, a new selector, a new interaction. Two presenter files
(`src/ui/effects.ts`, `src/ui/iconRegistry.ts`) are content in nature but compile against
engine unions, so they move in the same PR as each union change.

The transition runs two rulesets side by side behind the economy's switch, so the UI must not
grow a switch of its own. The rule is **presence follows the projection**: a surface draws a
value when the projection carries one and draws nothing when it is absent or zero. A tile with
a zero yield prints no numeral; a year with no omen shows no omen slip; a building with no
level shows no level. Content rows can therefore land early and stay correct under both
rulesets, and structural rows land with the engine slice that creates their state.

### 4.4 Three things the paper leaves unruled

The matrix found them; they are filed as Q73 to Q75.

- The §5.5 table still lists Temple and Granary at a maximum of two, against the one-of-each
  ruling in §5.5's prose and §8.
- The per-player cap on active luxuries (three today) has no v0.2 ruling.
- The setup split (one citizen plus freemen) has no v0.2 ruling, though citizens are otherwise
  reachable only by promotion.

## 5. Principles

1. **Frame before contents.** Geometry, navigation and legibility are rule-independent. Prove
   the frame on today's rules, then change what it holds.
2. **Do not polish what v0.2 retires.** No work on tile yield numerals, the season ring, the
   nine-building matrix, the happiness pill, cost modifiers or coupons.
3. **Contents ride the economy slices.** A surface changes in the PR that changes its rule,
   with engine, frontend and simulation evidence together.
4. **Lists in the Realm, detail in the subject.** Realm pages are overviews with one row per
   thing; selecting a thing opens its card in the subject tab. Selection adds a tab and never
   replaces the workspace.
5. **The island stays whole and fixed.** No pan, zoom or minimap. The chrome are exclusion
   zones the board fits around.
6. **Acting in one place, consulting in one place, glancing at the edges.** The block and the
   spine act; the drawer consults; the strip, the roster and the ticker are read without
   fixation, so they carry glyphs and counts before words.
7. **Engine authority.** Every number a panel prints comes from a selector or projection. The
   advisory, previews and threats already follow this; new surfaces follow it too.
8. **Presence follows the projection.** No UI-side ruleset switch, ever.
9. **Twelve pixels is the floor, not the target.** Panel body type sits at 14px or above at
   standard and reaches 18px at large; spacing and decoration scale, type does not shrink below
   the floor.
10. **Evidence, not vibes.** Every UI PR carries three-width screenshots, the re-pointed
    auditors and the shell tests. Milestones carry an owner hot-seat.

## 6. The target shell, address by address

Addresses follow the prototype's registry: A strip · B block · C roster · D drawer · E map ·
F ticker · G takeovers · H dialogs · V verbs.

### A · Top strip (64px)

Rebuild: three stamps left (omen · season · fate), the resource spine centred (wood stone food
· dial · END TURN with calendar · gold influence happiness), the effects chip, the readability
control right.

Frame: stamps truncate at 1440 and 1280 and their labels sit at 7 to 9px; the effects chip
collapses to a bare count at 1280. The strip gets a compact regime that drops the stamp art
before it drops a letter, and its labels rise to the floor.

v0.2: the omen and season stamps become the year deck, this year's card face-up with the term
it zeroes, the next card face-down, "Year V of XIV". The happiness pill becomes the level gauge
with riot (−3) and revolt (−6) marks. The dial's ring counted seasons; the deck is the clock, so
the dial retires when years land and the labelled END TURN with its docket is the one commit
control (Q69, ruled yes on 2026-09-06). Influence loses its cap mark.

### B · Realm block (bottom-left)

Rebuild: 480×360 at every width, tabs Cities · Pops · Build · Market · Compare, plus a subject
tab when a hex is selected. The Cities page tries to be both overview and detail and reaches
neither.

Frame: the block is 480 wide at minimum and as tall as its list, up to about 55% of the
viewport (Q68, ruled yes on 2026-09-06). Each Realm page becomes a list: Cities one row per settlement (name, rank,
pops, alerts); Pops the ladder's rungs; Build one row per building with a settlement column;
Market the rates. The masthead that repeats the tab name goes. The subject tab holds the
detail: the full settlement card, or an empty hex (terrain, slots, coast, the Found price and
pieces left), or a rival (cards, authored Laws, pieces used). Compare pins two subjects.
Realm page state survives a selection.

v0.2: the settlement card is the three-column card (slave · freeman · citizen, each column's
printed value 1 or 2, the building lines, the slots) and carries the six-line happiness ledger.
Pops becomes the Ladder: promote for 2 gold, demote for 1 influence, move for 1 food, one each
per turn. Build lists six buildings, one of each per settlement, one price, Port only on the
coast. Market keeps the bank (sell 3 for 1, buy 1 for 2), adds the Dole (3 influence for 1
food) and later hosts player trade.

### C · Roster (bottom-right, 280²)

Rebuild: four rulers with acting and viewing state, three numeric columns (cities, pops,
laurels), a victory-danger mark, "3 laurels at dawn wins".

Frame: the columns become cards held · authored Laws · a threat mark (Q70). Pops and cities
move to the rival subject tab. Names stay, counts lead.

v0.2: a votes column (seats plus citizens) joins with the Assembly change; "at dawn" becomes
"at year end".

### D · Consult drawer (400px over the roster)

Rebuild: a labelled rail top-right (Chronicle · Codex · Victory · Agora) opens a drawer that
covers the roster, takes focus, and restores it on close.

Frame: the rail's label column is 48px and "Chronicle" needs 67; the rail widens or its labels
shorten, and it stops at the viewport edge. At 1440 and below the open drawer covers the east
coast; acceptable while consulting, but the rail itself must not.

v0.2: Agora shows the Law board (four slots, the oldest marked to fall), the next Assembly year
and the proposal queue. Victory shows the six cards with holders and who is one condition away.
The Codex regenerates from the typed rules. The Chronicle gains a since-your-last-turn filter,
the digest's source.

### E · Map

Rebuild: the island fits the live area inside the chrome band; all 37 tiles visible at 1280×720
with no chrome intersection, one intersection at 1440.

Frame: fit the island against the two corner exclusion rectangles rather than the whole bottom
band. A hexagonal island's lower corners are empty where the block and roster sit, so the
island grows at 1440 and above without touching either, and the 48px reserve that cuts
OLYNTHOS goes.

v0.2: tiles print terrain and slots only; the yield chit retires; pops on tiles are a class
glyph and a count; moorings and Port claims from Phase 4 stay.

### F · Ticker

Keep. Hover or focus expands to the last three lines.

### G · Takeovers

The Assembly scene, the seat handoff and game over. The handoff defers the seat switch until
the incoming ruler confirms, hides the departing seat's private cards, and never mounts the
next seat's pending event beneath itself. v0.2 re-cuts the Assembly for every other year,
purchasable votes, the Law cap and Voice; game over moves to year end.

### H · Dialogs

Event card, venture, riot, calm and the economy preview stay; the preview extends to promotion
and returns focus to the verb that opened it. New under v0.2: the hunger choice (which pop
leaves), the Idea purchase, the Idea pick at setup, and the Dole confirmation.

### V · Verbs

Eight on the spine once promotion is a verb: Grow · Promote · Move · Found · Upgrade · Build ·
Calm · Venture (Q72). Subtitles print the one price and, for Found and Upgrade, the pieces left;
the target subtitle gets the width it needs instead of an ellipsis. The Dole lives in the
Market and the Idea purchase in the Realm header, because neither arms the board. Hotkeys 1 to
8, Tab cycles the acting player's settlements, Escape clears the subject.

### Attention

The END TURN control carries a count of blockers and warnings from the advisory; the docket
lists them; each item routes to the tab or subject that resolves it; the commit control cycles
to the first blocker before it ends the turn, and never hard-gates an optional advisory.

## 7. Sequencing against the economy operation

### U0 · Land the frame — one PR, "(Feature) The asymmetric table"

The list below is written for repairing the rebuild. If Q67 chooses the fresh build, step 1
commits the rebuild as an archive branch that never merges, the engine pieces it carries
(advisory selectors, victory danger, real-path previews) land first as their own engine-only
PR, and steps 3 to 6 become the build itself, written from §6 and the audit rather than from
the old components.

1. Commit the recovered tree as it stands on `feat/asymmetric-shell-rebuild`. Nothing else
   happens before that commit exists (Q67).
2. Rebase over main. Seven files overlap: `TabRail.tsx` (deleted here, edited there),
   `HegemonyBoard.tsx`, `VictoryTab.tsx`, `rules.ts`, `victory.ts`, `base.css`,
   `docs/README.md`. Main also brought the moorings, Port claims and placeholder rasters,
   which the rebuild never saw.
3. Fix D1 to D6 and D8 to D10: the handoff (controller-side seat deferral, visible buttons),
   the Realm block's list-and-detail split with a content-driven height, the rail, the verb
   subtitles, the island reserve, focus restoration, the strip's type and stamps.
4. Replace, do not override: delete the orphaned rules and tokens, fold the 25 overriding rules
   into their originals, restore the sheet order.
5. Re-point the auditors: drivers for the Realm tabs, the subject tab, the drawer pages, the
   docket, the preview and the handoff.
6. Tests for the three P1s, against the real controller.
7. Evidence: 1920 · 1440 · 1280 screenshots of every surface, auditor output, shell tests, the
   e2e smoke, and the owner's hot-seat on the four ASYM-PT tasks already written in
   `ui-remaining.md`.
8. Archive `ui-triage.md` and `ui-triage-parity.md`; their surfaces no longer exist.
   `ui-remaining.md` stays as the one UI ledger (Q71).

### U1 · Frame fixes — small PRs, rule-independent, any time after U0

Board fit against corner exclusion zones; the compact regime at 1280; the docket's commit
semantics and dialog role (D11, D12); the tablist and naming fixes (D13 to D16); Realm state
surviving selection (D17); hotkeys and Tab cycling; roster columns; the ticker expansion; the
dev button off the sea (D18).

### U2 · Contents ride the economy slices

Each row lands in the PR that lands its rule, with engine and simulation evidence in the same
PR.

| Economy slice (paper §9) | UI surfaces that change with it |
| --- | --- |
| Tier 0 and 1 · tile prints nothing, slaves are the yield, hunger costs a pop | E tiles (terrain and slots, pops as glyph and count) · B settlement card three columns · H hunger choice · A income deltas |
| Tier 1 · column-raising buildings, one per settlement | B Build list · B settlement card building lines · H preview rows |
| Tier 1 · single prices, piece supply | V subtitles (price, pieces left) · B subject hex (Found price, pieces) · C pieces used |
| Tier 1 · one season per year, calm as this-year bonus | A calendar and dial retirement · H calm dialog |
| Tier 1 · clamped happiness bank | A gauge (bank) · B settlement ledger lines |
| Tier 1 · Treasurer gold-only, promotion for gold | D Victory card text · B Ladder · V Promote |
| Tier 2 · level model with Unrest tokens | A gauge (level, marks) · E tokens on settlements · H riot dialog |
| Tier 2 · year cards, victory at year end | A year deck (face-up, face-down) · C "at year end" · G game over timing |
| Tier 2 · Assembly every other year, votes, Law cap, Voice | G Assembly scene · D Agora Law board · C votes column · H vote purchase |
| Phase 4 · luxuries by Port | already on main: moorings, claims; B subject mooring line |
| Phase 5 · National Ideas | H pick at setup · H purchase · B Realm header (the two Ideas) · D Codex |

Content rows from the matrix that need no engine state (copy, deleted branches, the Codex
rewrite by chapter, the chronicle grouped by year) land as soon as the projection stops
carrying the old value, under the presence rule.

### U3 · Ceremony and polish — after the economy default flips

The Assembly scene re-cut; year card faces; the Idea pick screen; the stylized pictograms in
place of the placeholder rasters; the Phase 7 accessibility and browser coverage.

### Gates for every UI PR

`ui:audit` with zero geometric defects across the re-pointed surfaces at three widths;
`ui:conduct`; the shell tests; the e2e smoke; a dated evidence page under
`docs/reports/audits/`. Owner hot-seats at U0, after the Tier 1 contents, and after U3.

## 8. What the comparables say

Forty-four sources were read for this section. What transfers:

- **Every comparable keeps empire totals on a top strip and the turn control at an edge; only
  the middle band varies.** The rebuild's strip and END TURN follow the norm.
- **RTS command cards are selection-driven and vanish when idle.** World's Edge describes the
  Age of Empires HUD as "appearing and disappearing as you select different units and
  buildings". Turn-based games do the opposite: Old World keeps a stable selection panel and
  separate empire screens; Total War keeps province detail on the left and persistent lists on
  the right. The rebuild's stable Realm with a subject tab is the turn-based reading of the
  owner's brief, and the right one.
- **The published rule is consolidation, not symmetry.** Bycer's advice is commands in "one or
  at most two areas". Amplitude's retrospective on Endless Legend 2 says splitting related
  information across the screen's sides "ended up being frustrating for players" and calls the
  result a "Divided UI". For the asymmetric table: acting lives in one place, consulting in
  one place, and everything else at the edges is read without fixation.
- **Edge elements are glyphs and numbers, not sentences.** Peripheral-vision guidance puts
  acuity two degrees from fixation, so edge chrome should be big, stark and free of text
  strings. The roster's columns carry counts and marks first and names second.
- **The end-turn button is a to-do cursor.** Civilization VI's button changes icon per pending
  decision and clicking it "takes you where you need to go"; Old World's End Turn is always
  active and cycles through the decisions blocking it; Humankind's hard gate drew requests for
  a force-end override. The docket lists blockers; its commit control should cycle to the
  first and never hard-gate optional advisories.
- **A start-of-turn ledger and a pinned situation list coexist** (Old World's turn summary
  with an OK button; Victoria 3's auto-pinned situations). The handoff digest is the ledger;
  the docket badge is the situation count. The island is small enough that an outliner adds
  nothing.
- **Hot-seat privacy is a full-screen blocking card with the next player's name and a
  confirm** (Civilization VI, Through the Ages). Hand-hiding is where digital board games leak
  (Tabletop Simulator, Scythe, Root). The rebuild's handoff matches the pattern and leaks in
  exactly that way today (D2).
- **Type floors are higher than the brandbook's.** The Xbox Accessibility Guidelines ask 18px
  body at 1080p on PC and scaling to 200%; the Game Accessibility Guidelines call 28px a
  minimum; Steam Deck's floor is 9px absolute and 12px recommended at 1280×800. The
  brandbook's 12px is the absolute floor. The readability control is load-bearing.
- **Digital board games keep a compact opponent roster and put detail behind a tap;**
  reviewers notice when a glance no longer suffices (Root). The roster's job is the glance; the
  rival subject tab is the tap.

## 9. Housekeeping

- The recovered tree is uncommitted. Committing it is the first act (Q67).
- Worktrees: the `hegemony-asymmetric-shell` worktree beside the repository carries U0. `.claude/worktrees/ui-asymmetric-layout`
  holds only the two superseded prototype HTML files; add them beside the six older prototypes
  and move the folder to `docs/archive/` when U0 lands, then drop that worktree.
  the `hegemony-shallow-economy` worktree is merged and can go, with the three merged remote
  branches. The primary checkout returns to `main`.
- Docs: the README's plan table loses the two triage rows and gains the asymmetric-table plan
  once the decisions below are taken; the roadmap's current initiative names the frame beside
  Phase 4; the frontend presentation contract gains the advisory, preview and handoff
  surfaces.
- Never again a worktree under `/private/tmp`.

## 10. Owner decisions

Filed in [`docs/questions.md`](../../questions.md) as Q67 and Q70 to Q76; Q68 and Q69 are ruled.

| ID | Question | Recommendation |
| --- | --- | --- |
| Q67 | Reframed after the owner's first answer (philosophy right, UI bad overall, massive rework either way): repair the rebuild in place, or build the frame fresh from this paper with only its engine pieces salvaged? | Fresh build, engine pieces salvaged first. Same cost, cleaner result, and the builder reads the spec and the audit instead of the code. |
| Q68 | Block sizing: fixed 480×360, or 480 wide at minimum with height following its list up to about 55% of the viewport, with Realm pages as lists and the subject tab as detail? | **Ruled 2026-09-06: grow with content.** |
| Q69 | Retire the hold-to-end dial when years land, keeping the labelled END TURN with its docket as the one commit path? | **Ruled 2026-09-06: retire it.** |
| Q70 | Roster columns: cards held · authored Laws · threat mark now, votes added with the Assembly change? | Yes. Pops and cities move to the rival subject tab. |
| Q71 | Archive the two triage ledgers with the frame swap and keep `ui-remaining.md` as the single UI ledger? | Yes. |
| Q72 | Verbs: Promote joins the spine (eight verbs), the Dole lives in the Market, the Idea purchase in the Realm header? | Yes. Only verbs that arm the board or open a dialog belong on the spine. |
| Q73 | Fix the §5.5 table to one Temple and one Granary per settlement, matching the ruling? | Yes; a paper correction. |
| Q74 | Does the per-player cap on active luxuries (three today) survive v0.2? | Drop it; the level formula (2 × luxuries) already prices them and the Port supply limits them. |
| Q75 | Does the setup split keep one citizen when citizens are otherwise reachable only by promotion? | Keep one; it seeds the first vote and the promotion ladder still owns every later citizen. |
| Q76 | Is "bad overall" about structure and legibility, which this paper addresses, or about the look as well? | Keep the ratified visual language and fix structure first; a look pass rides U3. If the look is what reads as bad, name the element. |
