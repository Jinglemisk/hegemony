---
title: UI — what is genuinely left
status: active
phase: "—"
updated: 2026-08-16
---

# UI — what is genuinely left

The triage run closed everything the two checkers can see: `ui:audit` reports **0**
geometric defects across 19 surfaces at three widths, `ui:conduct` reports **5**,
and every suite is green. [The defect ledger](./ui-triage.md) records how that was
reached and what was found along the way.

This file is the other half — the work that is **not** a defect. Some of it needs
an owner decision, some of it is a feature the overhaul never built, and some of
it is a judged trade-off that should stay judged rather than quietly drift.

Nothing here is a surprise, and nothing here is blocking. A row leaves this file
when it ships or when the owner rules it closed.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                              |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | N/A      | The one row that reached the engine (`CER-1`) has shipped: an optional authored `flavor` on `EventCard`, presentation only, nothing beneath the UI moved. Everything still on this list is presentation, so the parity suites stay meaningful. |
| Frontend         | Yes      | Every row names the surface it lands on and closes the same way the ledger's rows do: driven in a real browser at 1920, 1440 and 1280, looked at, with both auditors re-run.                                                                   |
| Simulation & AI  | N/A      | Nothing here is reachable from the headless sim.                                                                                                                                                                                               |

## The list

| ID       | needs      | what                                                                 |
| -------- | ---------- | -------------------------------------------------------------------- |
| `ICON-1` | nobody     | `AtlasIcon` is a fourth icon system, and the line art already exists |
| `TYPE-1` | a decision | Two type sizes sit under spec, on purpose                            |
| `DUP-1`  | nothing    | Five repeated glossary words, judged and left                        |

### Shipped

`BOARD-BG-1`, `FRAME-1` and `DOCK-1` landed together, in that order, because
each changed what the next one looked like. The sea is a CSS texture and three
palette tokens (`--sea`, `--sea-lit`, `--sea-deep`); the 3.8 MB plate left the
bundle and took `SHELL-3`'s compass-rose collision with it. The bottom bar now
steps up to a **course** at each corner that a dial seats into and a tablet
stands on — the junction decided once, of the three options, as _the bar carries
a socket_. The seven verbs are discs again, standing proud of the flat run
between those two courses, keeping every price, oxblood mark and armed state the
run had built. The reasoning for each is in its commit; what follows is the
brief they were written against, kept because the rule at the end of `FRAME-1`
is a standing one.

**The rule that now holds, and must keep holding:** no edge of the frame may
terminate against empty board. Either it meets another edge, or it is
deliberately cut by something drawn on top of it.

---

## FRAME-1 — the corners are gore, and it is one problem, not four · **shipped**

**What it looks like.** At both bottom corners the chrome simply stops. On the
right, the parchment rail runs down the screen, ends in mid-air over the sea, and
the END TURN seal sits across the ragged edge it left. On the left, the tab rail's
strip does the same and the panel's bottom edge floats above nothing while the
season dial overlaps the join. The meander border runs into the cut and terminates
without meeting anything.

**Why it happens.** The frame is four rectangles — top bar, left rail with its
panel, right rail, bottom bar — and two **circles** sit exactly where the
rectangles are supposed to meet: the season dial at the bottom-left corner, the
END TURN seal at the bottom-right. The rectangles were shortened to make room for
the circles, so their edges now end wherever the clearance calculation put them,
which is a place with nothing on the other side of it.

The circles are not the problem and neither are the rectangles. **The problem is
that nobody designed the junction.** Every fix so far has moved one of the two
apart from the other, which is why it keeps reappearing somewhere else — the
tablets were ended above the dials, the seal was cleared, the panel frame was
given its own floor, and the corner still reads as damage.

**What a fix has to decide.** How a round thing and a straight thing meet, once,
and then apply it at both corners. The options are the usual ones and they are
genuinely different in feel:

- the bar **carries a socket** — a cut-out the disc seats into, so the frame is
  continuous and the circle is set into it like a boss into a plate;
- the disc **sits proud on an unbroken bar**, overlapping it with its own shadow,
  and the rails run to the bar's edge and stop against it;
- the corner is **mitred** — the vertical strip turns and becomes the bottom bar,
  and the disc floats clear of the join entirely.

Whichever it is, the rule that has to hold afterwards: **no edge of the frame may
terminate against empty board.** Either it meets another edge or it is deliberately
cut by something drawn on top of it.

**Note this interacts with `BOARD-BG-1`.** Half of what reads as damage is the
meander border and the cartographic edge baked into the sea plate, which cannot
line up with anything because it scales with the viewport. Doing the background
first will change what this problem even looks like, and may shrink it. Worth
sequencing that way.

## DOCK-1 — the verbs protrude from the bar again · **shipped**

**Wanted.** The verb bar returns to the structure it had before the overhaul:
each verb a **circular disc that protrudes upward from the bottom bar**, half
proud of the edge, with its name and its cost set beneath it on the bar itself.

**It still exists to copy.** `main` has `.verbDisc` — a 50%-radius disc with a
`.verbKnob` that lifts a few pixels on hover, an armed state, and a dimmed state
for a verb you cannot afford. The overhaul replaced the whole thing with
`.railVerb`, a flat text label sitting inside the bar, and the protrusion went
with it. Read the old rules before rewriting them; the states are already
worked out.

**What must survive the change.** The dock has had a lot of work done to it this
run and none of it should be lost in the restyle:

- every verb prints a **real cost** now — `GROW 5–9`, `BUILD from 6`,
  `CALM 4 or 6`, `VENTURE stake 5` — read from the engine query that charges it;
- a price you cannot pay is **oxblood**, judged per alternative and per range end;
- an armed verb carries `railVerbArmed` and `aria-pressed`, and **stands its
  tooltip down** so it stops explaining itself over the map's own caption;
- the discs are the dock's only tab stops, seven of them plus the seal.

**Watch out for:** a protruding disc overlaps the board, so it needs to clear the
sea and cast against it; and the discs are the elements nearest the two corner
circles, so this and `FRAME-1` should be designed together rather than in
sequence — they are the same edge.

## BUILD-2 — the socket opens what could stand in it · **shipped** (`74cf6c1`…`e9f02b1`)

An open socket carries a `+` and opens the buildings raisable in that settlement,
each with its cost, its effect, and an honest reason when refused. Every number
comes from the engine query that charges it — `getBuildBuildingStatus` per
building, `settlementBuildingSlots` for the count, and the Build page's own
`buildRefusal` wording — so the two pages cannot disagree.

Kept for the next person, because all four were invisible until someone drove it:

- **A flat height cap cannot keep a popover out of the chrome.**
  `positionAnchoredOverlay` clamps to the _window_, and the window has room above
  the top bar where the game does not — so at 1366 and 1280 the picker flipped up
  and laid its head across the omen, season and fate slips. The height now comes
  from the **ledger tablet's own box**: the page the socket belongs to already
  sits inside the chrome, so its bounds are the honest ones.
- **A scroll region can be silent.** Four buildings sat below the fold with
  nothing on screen saying so, because the old ceiling happened to land flush on a
  row boundary. A forced scrollbar does not claim layout on this platform
  (`offsetWidth - clientWidth === 0`, and setting `scrollbar-color` makes Chromium
  ignore `::-webkit-scrollbar` outright). The app already had the answer —
  `intel.css`'s scroll-driven edge fade, written for this same finding on the
  Build, Chronicle and Codex lists.
- **A focus trap that only checks first and last has a hole.** The surface itself
  is neither, and it is the options' _parent_, so a plain Tab from it fell onto
  the first option by document order and looked like the trap working — while
  Shift+Tab walked out onto the dev fab with no way back.
- **A gate printed once is information; printed ten times it is noise.** The
  not-your-turn reason appeared in the head and again on all nine rows. It is said
  once now, and kept in each control's accessible name, because a screen reader
  lands on a button and never hears the head.

The parity test reads refusals off the **rendered DOM of both pages** rather than
off the helper they share — a unit test of the wording passes straight through the
class of defect it exists to catch.

## BOARD-BG-1 — the sea becomes a texture · **shipped**

**Today.** `assets/map/aegean-sea-board.png` is a single **3.8 MB** painting
applied at `shell.css:627` as `background: var(--sea-chart) center / cover
no-repeat`. Baked into that one file are: the sea colour, the wave texture, a
trireme, a second ship, a sea monster, a dolphin, two wind-head medallions, a
compass rose, and a cartographic border.

**Wanted.** A plain background **texture** — the paper/plaster ground, tiling or
scaling cleanly — with **no sea iconography for now** and **no cartographic
border**. The ornament is not being rejected as an idea; it is being taken off
the plate so the board can be composed without it, and so it can come back later
as separate, placeable elements rather than pixels welded to the ground.

**This closes an open defect rather than adding one.** `SHELL-3` in the ledger is
the compass rose being bisected by the dock's meander and half-covered by the
season dial at every width. It is unfixable in CSS _because_ the rose is painted
into a `center / cover` plate: its position moves with the viewport while the
dial's is fixed in viewport coordinates. Remove the ornament from the plate and
the collision cannot happen. **`SHELL-3` should be struck from the ledger when
this lands.**

**Three things it also buys.** A 3.8 MB image leaves the bundle. A tiling texture
stops rescaling on every resize, so the sea no longer shifts under a fixed board.
And the sea's colour becomes a **token**, so it can answer to the palette the way
every other surface does — today it is unreachable, locked inside a JPEG-ish PNG.

**Watch out for:** `chromeMetrics.ts` measures chrome to place the camera and has
tests pinning exact CSS expression strings — a token _value_ change is free, a
token _rename_ is not. And the plate currently supplies the map's contrast against
the bone tablets; a flat texture may need the tablets' shadow doing more work.
Check the Assembly too, whose full-bleed floor sits over this ground.

## ICON-1 — the fourth icon system

The overhaul's standing rule is **SVG line icons only**. The happiness raster and
its five mood variants are gone, and `ResourceIcon` now draws the same `<Icon>`
glyph as everything else.

`AtlasIcon` did not get the same treatment. It still draws tinted PNG masks off
`--icon-atlas` for pops, buildings, settlement kinds and terrain, across ~11
files — and five of its call sites alias onto four painted cells, so two
different things already share a picture.

`POP_GLYPHS`, `BUILDING_GLYPHS`, `SETTLEMENT_GLYPHS` and `TERRAIN_GLYPHS` already
exist as line art for **every one** of them. This is the same defect as the
happiness raster, one register over, and it is mostly a mechanical swap plus a
careful look at the five aliased cells.

## ASM-11 — the repeal ceremony · **shipped** (`9f8432f`)

A struck law now cracks and falls. Kept here only for the finding that shaped it,
because it is the kind of thing that gets re-broken by someone who does not know:

**A repeal is enacted during the ballot, and the standing column is not drawn
during the ballot.** It stands beside the card through proposal, disappears for
the vote, and returns on the closing floor. So the departure happens while
nothing is rendering it — a time-boxed "falling" flag started at detection would
have expired, unwatched, in a phase with no column in it, and the stone would
still have blinked out when the record came back.

The retention is therefore a **queue, held indefinitely**, that records the
departure, with the ceremony's clock starting only when the slab mounts. It lives
on `AssemblyFloor`, which spans all three phases, rather than on the column, which
does not. The engine stays the authority throughout: the hook diffs `activeLaws`
and holds a copy, the falling stone is `aria-hidden` and counted by nothing, and
the heading reads `0 of 1` while the stone is still visibly coming down.

**A monument cannot be repealed** — `G.tallyMonuments` is append-only, so a
resolved Directive is permanent. That case does not exist rather than being
unhandled.

## TYPE-1 — two sizes under spec, on purpose

The venture's title renders 24px against a 27px spec; the Assembly's tally reads
52–54px below 1440 against a 56px spec.

Both are `--ui-scale` behaving exactly as documented: _1280 gets the same scene
smaller, not a different one._ Pinning an absolute size would break the uniform
scale for one element. The hierarchy the prototypes depend on holds at every
width — the payoff is still the largest thing in the venture, the tally still
dominates the ballot.

Recorded so it stays a decision rather than becoming a mystery. Reopen it only by
changing the scale rule, not by exempting one element.

## DUP-1 — five repeated glossary words

`ui:conduct`'s five remaining rows: `Gold` five times in a venture's odds table,
`Food` four times on the Assembly floor, and so on. Each links to the same
rulebook chapter, and each is read **in its sentence**, which is what actually
disambiguates it.

Numbering them ("Gold, second mention") would make the prose unreadable when read
linearly, to fix an ambiguity that only exists if you tab the page as a list of
controls. Judged and left.
