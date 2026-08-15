---
title: UI triage — showcase parity gaps
status: active
phase: "—"
updated: 2026-08-15
---

# UI triage — showcase parity gaps

The companion feed to [the defect ledger](./ui-triage.md). The auditor finds
things that _escape their box_; this finds things that **were never built**. It
is the answer to the owner's report: _"I don't see the building slots and such
provided in the showcase at all. I see the old 'cities' layout in the ledger."_

Each prototype in `docs/plans/ui-overhaul-prototypes/` was read against the
component that was supposed to implement it. Severity is the ledger's:
**blocker** = a designed feature is absent · **major** = present but structurally
wrong · **minor** = cosmetic drift.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                                                  |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Engine / backend | N/A      | This file only records what the showcase drew and the app did not build. Two rows (`PAR-CER-1`, `PAR-ASM-9`) note that a designed field has no home in the data model; adding one would be an `engine:` commit reviewed on its own terms, and is not assumed here. |
| Frontend         | Yes      | The whole document. Each row names the prototype element and the component or rule that stands in its place; a row closes when the surface is driven in a browser and matches.                                                                                     |
| Simulation & AI  | N/A      | Nothing here is reachable from the headless sim.                                                                                                                                                                                                                   |

## What the whole audit says, before the tables

Five themes account for most of the 80-odd rows. They are worth more than the
rows are.

**1. The building slot was never built.** The showcase treats a settlement's
slots as _physical sockets you can see filled or empty_ — and that one primitive
drives three surfaces: the Cities card's socket row, the Build page's heading
("ARGOS HAS 2"), and its ghost target buttons ("THERMON · NO SLOT"). In the app a
slot exists only as a denominator in a two-number meter. **Nothing on any panel
shows you where an open slot is.** Fixing `PAR-CITIES-1`, `PAR-BUILD-1` and
`PAR-BUILD-2` separately would be three patches; building the socket once is the
actual fix.

**2. The Cities page is a different design, not a drifted one.** `CitiesTab.tsx`
was never rewritten against the showcase. It still carries the pre-overhaul
pop×building affinity matrix — a structure that appears in neither prototype —
behind a disclosure that boots closed. `panels.css`, the sheet that _was_ written
to the prototype, contains no per-settlement socket or bead rules at all.

**3. The ceremony register stops at the frame.** `ceremony.css` restyles the
container — scrim, mood ring, glow, crest, blow band — and then hands off to
`modals.css`, which is still wearing pre-overhaul clothes. Because those
selectors outrank the type roles, every title, flavour line, choice button and
odds row inside a ceremony loses. One seam, six majors.

**4. Numbers stopped being carved.** Both ceremony prototypes stake their whole
composition on one enormous figure — `−2` at 34px, `+9` at 38px — with words
demoted around it. Neither exists in the app; both render as body-size sentences.
This is a **data-shape** problem, not a stylesheet one: the presenters in
`src/ui/effects.ts` flatten number + subject + condition into a single string, so
there is no seam for the UI to size the parts differently even if the CSS wanted
to.

**5. Prices vanish at the point of decision.** Three surfaces replace a concrete
cost with a word or a hover: the ladder rungs ("Raise to citizen", no price),
four of seven dock verbs ("varies", "options", "stakes"), and the victory cards
(minimums moved into a tooltip). The showcase's rule is consistent — the number
you need in order to decide is printed; only the _arithmetic behind it_ is
hover-only. **The dock is done** (`PAR-COMMAND-1`), and it settles the pattern
for the other two: where a price has no single value, print the range or the
floor and read both ends off the engine query that charges it, so the surface
cannot drift from what the press takes. The ladder and the laurels still owe it.

## The ruling that was blocking the Assembly — now settled

`b-assembly.html` and `e-assembly-vote.html` are drawn as **full-bleed 1440×900
night scenes**. The shipped Assembly was a `min(900px, 100%)` card floating
inside the live chrome — an owner ruling, documented in `AssemblyPanel.tsx`, that
**predated these prototypes**. The two had never been reconciled, and every
Assembly width and type-size deviation is downstream of that one decision. It was
escalated rather than guessed.

**The owner has ruled for the showcase: the Assembly is a full-bleed takeover.**
The scene covers the viewport, the night vignette darkens the whole app — top bar,
rails and command dock included — and the colonnade gets its designed width. The
rationale in `AssemblyPanel.tsx` is superseded and is being rewritten to say so.

Rows `PAR-ASM-12`, `-13`, `-17`, `-20`, `-23`, `-24` and much of `-14` dissolve
with the re-scoping rather than needing a fix apiece.

**A second ruling, on the ceremonies:** `src/ui/effects.ts` gets split, so a
presented effect returns its parts — magnitude, subject, condition, turns —
alongside the flat `text` it returns today. That is the seam theme 4 says is
missing. UI layer only; `.text` stays, so every existing caller keeps working.
`PAR-CER-2`, `-3` and `-5` become reachable.

## Table — the table and the panels (`a-table.html`, `f-panels.html`)

| ID               | sev     | surface    | gap                                                                                                                     |
| ---------------- | ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| PAR-CITIES-1     | blocker | cities     | Per-settlement building **sockets** (filled tile / dashed open slot + "1 of 3 built"). No socket concept exists.        |
| PAR-CITIES-2     | blocker | cities     | Per-settlement **pop beads** with capacity ghosts and a state caption. Cities shows a numeric meter only.               |
| PAR-CITIES-3     | blocker | cities     | Settlement identified by its **glazed seal disc**. App renders a bare monochrome icon — breaks the board↔ledger link.   |
| PAR-CITIES-4     | blocker | cities     | The card body is always visible. App hides it behind a disclosure that boots closed.                                    |
| PAR-CITIES-5     | blocker | cities     | The pop×building affinity matrix appears in **neither** prototype. This is the "old cities layout".                     |
| PAR-POPS-1       | blocker | pops       | Each ladder rung is one button **carrying its price**. App shows costless labels; price is tooltip-only.                |
| PAR-VICTORY-1    | blocker | victory    | Every laurel card prints its requirement line. App moved it into a tooltip.                                             |
| PAR-BUILD-1      | blocker | build      | Page headed by the open-slot count ("ARGOS HAS 2"). App opens straight into the card list.                              |
| PAR-CITIES-6     | major   | cities     | Active effects are a **slip** with a tone-coloured left rule and a trailing "until" clause, not a bordered box.         |
| PAR-CITIES-7     | major   | cities     | Income is a short row of **only what moved**. App prints a fixed 6-column grid, dimming zeros to dashes.                |
| PAR-LEFT-RAIL-1  | major   | left rail  | Empire strip + alarm + effects belong to **Cities only**. App renders them above all four left tabs (~120px each).      |
| PAR-POPS-2       | major   | pops       | Panel is titled "The Ladder" with a `SOCIAL ORDER · TOP TO BOTTOM` sub-head. App titles it "Pops", no sub-head.         |
| PAR-BUILD-2      | major   | build      | A target button **names its own blocker** ("THERMON · NO SLOT"). App always reads "Raise in {name}".                    |
| PAR-TOPBAR-1     | major   | top bar    | Event **slips**: square art tile, 3px radius, kicker naming source _and player_, empty slots simply not drawn.          |
| PAR-TOPBAR-2     | major   | top bar    | A resource in deficit turns its numeral oxblood. `shell.css` pins the colour, so the branch is dead.                    |
| PAR-BOARD-1      | major   | board      | Map chrome sits inboard of the left tablet as round lacquer discs. App pins rounded squares bottom-right.               |
| PAR-PANEL-1      | minor   | rails      | Tablets are asymmetric — left 306px, right 286px, rail included. App has both at 360px with the rail outside.           |
| PAR-POPS-3       | minor   | pops       | "Where they live" rows lead with the seal disc and no capacity ghosts.                                                  |
| PAR-MARKET-1     | minor   | market     | `THE BANK'S STANDING RATES` heading; a deficit row relabels HELD → DEFICIT and outlines BUY in clay.                    |
| PAR-VICTORY-2    | minor   | victory    | Held-count label is two lines and states the win condition. App drops it.                                               |
| PAR-AGORA-1      | minor   | agora      | Remaining empty stelae get their own dashed slab even when laws stand. App shows it only at zero laws.                  |
| PAR-CHRONICLE-1  | minor   | chronicle  | Panel header carries an entry count; the all-filter is a lacquer disc with the Π blazon, not a text pill.               |
| PAR-COMMAND-1    | minor   | dock       | **fixed** — Grow prints its food range, Build its floor, Calm both payments, Venture the stake. All off engine queries. |
| PAR-TOPBAR-3     | minor   | top bar    | A zero delta is a faint middot, not the numeral `0` six times over.                                                     |
| PAR-TOPBAR-4     | minor   | top bar    | The bar's right end is the roster and nothing else; the app inserts an Effects counter chip.                            |
| PAR-RIGHT-RAIL-1 | minor   | right rail | Only Pops carries a badge. App badges victory, chronicle and agora — chronicle puts 3 digits in a 15px box.             |
| PAR-BOARD-2      | minor   | board      | No transient `used/total` slot pip on a selected tile.                                                                  |
| PAR-PANEL-2      | minor   | rails      | Tablets have no close `×`; the tab spine is the only control.                                                           |

## Table — the ceremonies (`c-event.html`, `d-venture.html`)

| ID         | sev     | surface | gap                                                                                                                                                                                            |
| ---------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PAR-CER-1  | blocker | event   | The card has a **voice** (flavour) distinct from its mechanics. No flavour field exists; the rules sentence is printed twice.                                                                  |
| PAR-CER-2  | blocker | event   | A **duration strip** — clay bars at descending opacity, one per turn. Data exists (`timedHappinessDelta.turns`), unused.                                                                       |
| PAR-CER-3  | blocker | event   | The blow is three ranks: glyph, a 34px carved numeral, and a subject/condition stack. App renders one flat sentence.                                                                           |
| PAR-CER-4  | blocker | event   | `THE DECK OF FATES · 67 REMAIN` beneath the card. Absent; `G.playerDrawPile` already holds the count.                                                                                          |
| PAR-CER-5  | blocker | venture | The payoff `+9` at 38px is the largest thing in the dialog. App renders it as 12.5px body text.                                                                                                |
| PAR-CER-6  | blocker | venture | A kicker — `VENTURE · DAMON STAKES 5 GOLD` — persists through the roll. App unmounts the stake the moment the die flips.                                                                       |
| PAR-CER-7  | major   | venture | A venture is a **different material**: 560px chamfered bone tablet, no mood ring. App reuses the fate card at 430px.                                                                           |
| PAR-CER-8  | major   | venture | Every row the die did not find dims to 0.42. App dims nothing and bars every row identically — no focal point.                                                                                 |
| PAR-CER-9  | major   | event   | Fate title at 34px. `modals.css` clamps it to ~22.7px, beating the type role on specificity.                                                                                                   |
| PAR-CER-10 | major   | venture | Venture title at 27px. App renders ~18.4px, same cause.                                                                                                                                        |
| PAR-CER-11 | major   | shared  | No bordered boxes inside a ceremony — hairlines and tinted bands only. Choice buttons are bordered boxes and unstyled by `ceremony.css`. A card with two options loses the blow band entirely. |
| PAR-CER-12 | major   | event   | The commit button is a lit→shaded 3-stop gradient. App emits two identical stops — a flat fill.                                                                                                |
| PAR-CER-13 | major   | venture | The commit verb is the outcome ("TAKE THE GOLD"). App hardcodes "Continue"; the mood verbs never reach it.                                                                                     |
| PAR-CER-14 | major   | event   | The body is pulled up into the art's dissolve so type and painting interlock. App leaves an empty ivory gap.                                                                                   |
| PAR-CER-15 | minor   | event   | Art band 300px, not 280px.                                                                                                                                                                     |
| PAR-CER-16 | minor   | event   | The fade's terminal stop is translucent so art ghosts through. App cuts to opaque — and to a different ivory.                                                                                  |
| PAR-CER-17 | minor   | event   | Blow band fill/rules ~3×/2× too saturated, and inset from the body edge instead of bleeding.                                                                                                   |
| PAR-CER-18 | minor   | event   | Blow glyph 30px, not 24px.                                                                                                                                                                     |
| PAR-CER-19 | minor   | both    | Flavour type undersized in both ceremonies — and the two disagree with each other.                                                                                                             |
| PAR-CER-20 | minor   | venture | The landed row is clay with an inset bar on the first cell. App uses oxblood and a whole-row left border.                                                                                      |
| PAR-CER-21 | minor   | venture | The blank-outcome dash is 30% ink. App renders it at 66%.                                                                                                                                      |
| PAR-CER-22 | minor   | venture | Deliberate 16/18/20px rhythm. App applies one uniform 12px grid gap.                                                                                                                           |
| PAR-CER-23 | minor   | venture | The venture's scrim is lighter and higher than the fate's. App hardcodes the fate's value for both.                                                                                            |

**Not a parity gap, found in passing:** `ModalShell.tsx` creates a `surfaceRef`,
binds it, and never uses it — there is no focus move into the dialog and no focus
trap, on blocking ceremonies that cannot be escaped.

## Table — the Assembly (`b-assembly.html`, `e-assembly-vote.html`)

Read alongside **the unreconciled ruling** above; `PAR-ASM-12` is its proxy and
several rows below it are downstream.

| ID         | sev     | phase    | gap                                                                                                                                                                                                       |
| ---------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PAR-ASM-1  | blocker | vote     | The **next ballot card** peeks from under the current one. The rest of the ballot is never drawn.                                                                                                         |
| PAR-ASM-2  | blocker | vote     | **Shard piles** — one potsherd per voter, ghost outline for votes still to come. The tally is countable, not just a bar.                                                                                  |
| PAR-ASM-3  | blocker | vote     | The **speaking order** strip with the current speaker bolded. App names only the next speaker, in prose.                                                                                                  |
| PAR-ASM-4  | blocker | proposal | A **standing-laws column** on the floor with a dashed "five stelae stand empty" slab. Absent from the scene.                                                                                              |
| PAR-ASM-5  | blocker | both     | A completed station turns olive and its numeral becomes ✓. No `done` state exists — finished reads as not-yet-reached.                                                                                    |
| PAR-ASM-6  | blocker | proposal | Every seat carries an ostrakon during proposal (Δ = has spoken, blank = deliberating). App hard-sets it to null.                                                                                          |
| PAR-ASM-7  | blocker | both     | A centred three-part scene head with the Greek kicker `ΕΚΚΛΗΣΙΑ` and a 34px title. App has a 12.5px left-aligned label.                                                                                   |
| PAR-ASM-8  | blocker | both     | Seat identity is a 32px glaze disc bearing the seat's Greek blazon. App renders an 8px bare colour dot — the one place the project's own "a glaze never travels alone" rule is broken.                    |
| PAR-ASM-9  | blocker | both     | The card face carries a flavour quote and a rule-line. No flavour field exists on the resolution card.                                                                                                    |
| PAR-ASM-10 | blocker | vote     | The **verdict headline** ("ON THE KNIFE'S EDGE") is the dramatic read. App puts a card counter in that slot.                                                                                              |
| PAR-ASM-11 | —       | —        | The repeal crack-and-fall ceremony. **KNOWN-OMISSION**, reasoned in `RUN-LOG.md`.                                                                                                                         |
| PAR-ASM-12 | major   | both     | Scene width: ~1074px of colonnade designed vs `min(900px, 100%)` inside both rails. Root of the shrunken type below.                                                                                      |
| PAR-ASM-13 | major   | both     | The hero card is 360px with a 25px title. App renders ~150px at 12px — **inside a bordered box**, which the design never does.                                                                            |
| PAR-ASM-14 | major   | both     | Seats are compact 200px plaques in their own row. App makes them five tall 165×255 columns; three render as empty voids. Largest single contributor to "looks buggy".                                     |
| PAR-ASM-15 | major   | vote     | The active voter's seat becomes one wide lit plaque holding all four choices. App stacks three in a 155px column and **exiles Bribe to the foot dock**.                                                   |
| PAR-ASM-16 | major   | proposal | Four separate stelae with a 22px gap. **No gap is declared**, so they abut into one slab with dark V-notches.                                                                                             |
| PAR-ASM-17 | major   | vote     | Tally numerals at 56px. App renders 32px — the number the scene is about, 43% under spec.                                                                                                                 |
| PAR-ASM-18 | major   | proposal | Tendency rows ink the numbers olive/clay and tint the icon. App renders them monochrome.                                                                                                                  |
| PAR-ASM-19 | major   | proposal | Each stele carries a row of pips, one per law landed — a glanceable power count. App stacks named rows instead.                                                                                           |
| PAR-ASM-20 | major   | both     | The head is three stacked rows. App collapses it into one bar; station numerals shrink to 8px and are illegible.                                                                                          |
| PAR-ASM-21 | major   | both     | `.asm-body` inherits an 84px dial-clearance meant for the rails' scrolling bodies — 84px of dead space inside the scene.                                                                                  |
| PAR-ASM-22 | major   | proposal | `.steleMonument` / `.lawslabMonument` are emitted but **have no CSS rule anywhere**. Stratokles's permanent monuments render identically to ordinary laws. The intended treatment sits on dead selectors. |
| PAR-ASM-23 | major   | proposal | Stele header is centred title + epithet. App is a left-aligned row with an extra power disc and a force-wrapped 7.5px epithet.                                                                            |
| PAR-ASM-24 | major   | both     | The night vignette covers the whole viewport. App paints it inside the panel only, so the chrome stays at full daylight — "the game stops being a map" becomes a dark rectangle in a lit app.             |
| PAR-ASM-25 | minor   | proposal | Four different bust glazes. App uses two; three orators get identical clay medallions.                                                                                                                    |
| PAR-ASM-26 | minor   | proposal | The author prize is a centred row with a masked resource icon. App is a left-aligned 7px caps line, no icon.                                                                                              |
| PAR-ASM-27 | minor   | proposal | `DRAW 3 ⟨influence⟩` centred with its glyph. App left-aligns the label and drops the glyph.                                                                                                               |
| PAR-ASM-28 | minor   | vote     | Sherds bear Greek — `ΝΑΙ` / `ΟΥ` / `·`. App uses a check, a cross and a dashed ring.                                                                                                                      |
| PAR-ASM-29 | minor   | vote     | `THE BALLOT / CARD I OF II` sits top-left. App buries the counter under the tug bar; the corner is empty.                                                                                                 |
| PAR-ASM-30 | minor   | vote     | The head retitles for the phase ("THE VOTE"). App's title is phase-invariant.                                                                                                                             |
| PAR-ASM-31 | minor   | both     | Roman year numerals and a `STANDING LAW` station label. App uses Arabic and "Standing". `toRoman` is already imported.                                                                                    |
| PAR-ASM-32 | minor   | proposal | Stelae have vertical padding. App declares none, so outer stelae run into the clip-path cut corner. Padding appears only on _short_ viewports.                                                            |
