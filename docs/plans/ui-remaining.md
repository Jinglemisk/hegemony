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

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                   |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Partly   | One row (`CER-1`) needs an authored field on `EventCard`, which is an `engine:` commit reviewed on its own terms. Everything else is presentation only, and the parity suites stay meaningful because nothing beneath the UI moves. |
| Frontend         | Yes      | Every row names the surface it lands on and closes the same way the ledger's rows do: driven in a real browser at 1920, 1440 and 1280, looked at, with both auditors re-run.                                                        |
| Simulation & AI  | N/A      | Nothing here is reachable from the headless sim.                                                                                                                                                                                    |

## The list

| ID           | needs         | what                                                                             |
| ------------ | ------------- | -------------------------------------------------------------------------------- |
| `BUILD-2`    | a decision    | An open socket should be pressable, and open the buildings you could raise there |
| `BOARD-BG-1` | a decision    | The sea plate becomes a texture: no iconography, no cartographic border          |
| `CER-1`      | **the owner** | Fate cards have no voice, because there is no field to hold one                  |
| `ICON-1`     | nobody        | `AtlasIcon` is a fourth icon system, and the line art already exists             |
| `ASM-11`     | nobody        | The repeal crack-and-fall ceremony                                               |
| `TYPE-1`     | a decision    | Two type sizes sit under spec, on purpose                                        |
| `DUP-1`      | nothing       | Five repeated glossary words, judged and left                                    |

---

## BUILD-2 — an open socket should be pressable

**What is missing.** The Cities page now draws a settlement's building slots as
sockets you can see: a filled tile per raised building, a dashed outline per open
slot, and a caption reading "1 of 3 built". That was the overhaul's central new
primitive and it answers _where is there room_.

It does not answer _what could go there_. The dashed sockets are decoration — you
can see the gap, and then you have to leave the page, open Build, and read a list
that does not know which settlement you were looking at.

**The old UI had this and it was better.** In the pre-overhaul Cities tab the
building chips carried a `+` badge when a building was buildable there, so the
affordance and the answer sat on the settlement you were already reading. The
overhaul deleted that layout wholesale — correctly, since the pop×building matrix
it lived in appears in neither prototype — but the _behaviour_ went with it and
was never rebuilt. Worth reading `src/components/board/ledger/CitiesTab.tsx` and
`src/components/board/map/BuildPopover.tsx` **as they stand on `main`** — the
primary checkout still has the pre-overhaul versions — before designing the
replacement.

**What it should do.** An open socket carries a `+` and is a real control. Press
it and you get the buildings you could raise **in that settlement** — each with
its cost, its effect, and an honest reason when it is refused. The Build page
already computes all of this: `getBuildBuildingOptions`, and the blocker phrasing
built for `PAR-BUILD-2` ("`SIKYON · NO SLOT`", "`short by 1 wood + 11 stone`").
This is a new entry point onto work that exists, not new logic.

**Why it matters more than it looks.** The showcase's rule, which the dock and
the ladder already follow, is that _the number you need in order to decide is
printed where you decide_. A socket that shows a gap and cannot tell you what
fills it is the one place left where the UI shows you a question and sends you
somewhere else for the answer.

**Watch out for:** the picker must be reachable by keyboard, and a socket is
currently a ~20px mark — it will need to reach 24×24 to satisfy the conduct
auditor. The map's `BuildPopover` grammar already exists; reusing it is probably
right, but it anchors to a tile rather than to a ledger row.

## BOARD-BG-1 — the sea becomes a texture

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

## CER-1 — fate cards have no voice · **needs the owner**

The showcase's fate card carries two registers: the mechanical blow, and the
card's own voice — _"The wells crack. The assembly mutters."_ The app has the
first and cannot have the second, because `EventCard` has no flavour field:
`card.text` **is** the rules sentence.

The ceremony work fixed the visible half honestly — a card no longer prints its
one fact twice — but the consequence is that a fate card is now silent, and a
handful of cards that carry a voice fragment welded onto the front of their rules
text lose that fragment too.

**The fix is an authored `flavor` field on `EventCard`, one line per card.** That
is an `engine:` commit and a content pass, and it is the owner's call — not
because it is risky, but because somebody has to write 30-odd lines of prose in
the game's voice, and that is authorship, not engineering.

Splitting the existing text on a colon would recover some of it, but it is a
heuristic over data that cannot be validated, and it would invent a content model
by accident. Explicitly rejected.

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

## ASM-11 — the repeal ceremony

A law that is repealed vanishes the instant it leaves `activeLaws`. The designed
moment is the stele cracking and falling.

Out of scope since the original overhaul run, for the same reason: an exit
animation needs the component to **retain the departing law** after the state has
dropped it, which is real state machinery rather than styling. The component that
would host it — one object for a law's three lives — does exist.

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
