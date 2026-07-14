# Roadmap Appendix — Questions, Decisions, Execution

The working surface for `docs/roadmap.md`. Questions get filed here before a phase
starts; answers get folded into feat plans and code; the execution log keeps the trail.

## How this works (the loop)

1. **Claude files questions** before starting work on a phase — each with context, a
   recommendation, and a `Your answer:` slot. Status: `OPEN`.
2. **You answer** — inline (mark free-form additions with `***`) or in chat; Claude
   transcribes. Discussion continues in place while a question is open.
3. **Once a question locks**, its block is **pruned to the final spec only** — the
   back-and-forth is dropped; git history keeps the discussion. Status:
   `LOCKED` → `EXECUTING (branch)` → `DONE (merged)`.
4. **New questions get filed** as the next phase approaches.
5. Skim the **Execution log** to catch up after time away.

> **Phases 0 and 1 are DONE — merged via PR #20 and PR #21 (2026-07-13).** Their
> specs (D1–D11, Q12–Q16) are pruned from this file; git history keeps the
> trail, and the shipped rules live in `docs/v0.1-rules-spec.md` / `rules.md`.
> Standing design rules: **victory minimums must beat the opening** (regression-
> tested), the **capital-privilege ban** (additive/liability identity only, never a
> yield multiplier — balance.html), and the **event-table law** (every dice table is
> data + the one `rollOnTable` seam + the one shared modal — docs/feat/event-tables.md).

---

## Phase 1.5 — "The interface refit" · `EXECUTING (feat/ui-refit)`

Slotted **before Phase 2** on purpose: terrain rework, tier-2 buildings, and the
assembly all *add* UI surface — building them into the old layout means converting
them twice, and the Phase 1 playtest kept tripping over the same interaction debt.
(Principle 2 is intact: features still ship their own UI; the refit fixes how the
existing ones are reached.)

**Locked scope (user, 2026-07-12/13 — full text in todo.md):**

1. **One ledger.** The Actions side panel folds into the Ledger; tabs become
   vertical buttons (the 5-up horizontal row is at capacity).
2. **A dedicated verb bar** for Grow / Move / Found / Upgrade / Calm / Venture /
   End Turn (placement = Q17).
3. **The map is the picker** (selection rule 1): the Found Colony pattern — eligible
   tiles glow, the clicked tile gets the active ring, an anchored popover carries
   yield/pops/shared-status + confirm — rolled out to the ladder, Grow Pop, Move Pops
   (source then target), event pop-placement, and the riot concession. No backdrop
   modal may cover the board during a selection.
4. **No native `<select>` anywhere** (selection rule 2): one custom listbox whose row
   template is the tile-art picker card, used only where a list genuinely beats the
   map (e.g. inside the deliberately-blocking riot modal).
5. **The game-reference compendium** behind the season icon (contents = Q18):
   everything rollable or drawable is viewable — players plan around public tables.

**Added 2026-07-13 — the design-scope ruling (D13):**

6. **The refactor ladder rides along** (`docs/design/architecture-report.html` R1–R8,
   in its stated order — it front-loads what the reskin needs: one modal shell, one
   `ResourceChips`, data-driven verbs, the HexMap split). The report's monorepo /
   multiplayer-readiness staging (Stage 0–3, playerView redaction, move auth) is
   explicitly **out** of 1.5 scope — it waits for Phase 5's multiplayer track.
7. **The reskin is per-element opt-in (Q36).** The grammar above ships regardless;
   each brandbook *visual* element ships only on an explicit owner "keep" — anything
   short of that (a "park", a hesitation, a blank) stays at the current look,
   undiscussed, until the post-Phase-5 design session. Once 1.5 lands the brandbook
   freezes; the unverified-legibility playtest checks (arm's-length read, Sim
   Daltonism wheat-vs-sienna, chit toggle) and their fixes are part of 1.5's exit
   gate, not new design work.

Gets `docs/feat/ui-refit.md` once Q17–Q19 are answered; build follows that plan.

---

## Open questions

### P2 · Q13b · Colony repricing (wood/gold mix) — `ANSWERED (2026-07-13 — HOLD 20w+2f)`

**Context.** The contiguity campaign showed wood, not geometry, is the expansion
bottleneck. Simmed (2026-07-12, pre-bank): foundColony at **14 wood + 6 gold + 2 food**
vs baseline 20w+2f — mid-game expansion **+32%**, revolt share tripled (5%→18%).
Caution: wood-as-bottleneck is also the designed tempo brake.

**Protocol (user, 2026-07-12): sim first, save it, then compare — RUN (post-bank,
docs/sim/2026-07-12-colony-repricing-q13b.md).** Same seeds (9000–9019), 20 games/arm:
repricing now buys only **+10% mid-game expansion** (was +32% pre-bank — the D6 bank
absorbed the wood bottleneck; baseline expansion roughly doubled vs the pre-bank era)
while riots rise **3.2 → 5.7/game** and the seat spread worsens. **Claude's rec: HOLD
20w+2f** — the gold-sink + wood-relief goal is delivered by the bank alone. New
counter-watch: post-bank expansion may now be too *loose* (the tempo brake softened);
fold into the Phase 2 gold-tile-removal re-check.

**Your answer (approve/reject the repricing after your playtest):** Keep for the time being. Make note of it in game balancing talks later down the line. 

### P1.5 · Q17 · Where does the verb bar live? — `ANSWERED (2026-07-13 — bottom bar)`

**Context.** The verbs leave the side panel (refit scope 2). Two candidate homes.

**Rec:** a **bottom command bar fused with the resource band** — resources left,
verbs center, End Turn anchored right. Classic RTS grammar (eyes drop from board to
hands), it reclaims the full right column for nothing (the panel disappears
entirely), and the verbs sit next to the resources they spend. The alternative
(strip under the top bar) crowds the events/roster row and separates verbs from
costs. Mock both only if the bottom bar feels wrong in the first build.

**Your answer:** Bottom bar for sure. 

### P1.5 · Q18 · Compendium v1 — contents & entry points — `ANSWERED BY DEFAULT` (built 2026-07-13)

**Context.** Refit scope 5. What ships in the first compendium, and how it opens.

**Rec (BUILT as recommended — the overnight-menu approval covered this):** five
sections, all read-only, all data-driven from the ruleset/content tables so they
can never drift from the engine: (1) victory cards with LIVE standings per player
(mounts the ledger's VictoryTab); (2) the four event tables (riot + three
expeditions) rendered by the shared `EventTableRows` path, no roll button; (3) this
board's bank rates + the corridor explainer; (4) deck composition — seasonal card
list with season-weighting notes, player-deck list (aggregate counts, never draw
order); (5) a costs cheat-sheet (expansion, grow, buildings, ladder, calm, stakes,
riot insurance). Entry: the season dial button, plus the `?` key (Escape closes).
Later phases append sections (politicians, resolutions) instead of new modals.

**Your answer:** answered-by-default per the 2026-07-13 overnight approval; refit
restyles freely — the content and data-driven rule survive.

### P1.5 · Q19 · Homes for the Chronicle and the deck tray — `ANSWERED (2026-07-13 — as recommended)`

**Context.** "One ledger only" evicts the right panel — the Chronicle (action log)
and DeckShelf (deck counts + board chip) need homes.

**Rec:** deck counts + board/seed chip move into the **top bar** beside the
season dial (the seasonal count already half-lives there as "28 left"). The
Chronicle becomes a **collapsible drawer on the right edge** — a slim tab that
slides over the map when opened, with the latest entry always visible as a
one-line ticker in the bottom command bar. A ledger tab would work too but hides
the live narration entirely, which the chronicle exists to provide.

**Your answer:** This works great. 

### P1.5 · Q36 · Reskin ratification — keep/park, one word per element — `ANSWERED (2026-07-13 — KEEP ×5)`

**Context.** The brandbook's owner rulings (docs/design/README.md) were ratified
in the 2026-07-13 working session, but the owner has since flagged that parts of
the overhaul aren't to his taste — and explicitly does not want to spend feature
time re-deliberating them. D13 therefore inverts the Q22 blank-slot rule for
visuals: **recommendations can be delegated; taste can't.** Each element below
ships in the 1.5 reskin only on an explicit **keep**. A blank or a "park" means
the current look stays, nothing is discussed, and the element lands on the
post-Phase-5 design-session agenda. Parking any (or all) of them shrinks the
reskin, never the refit — the grammar and ladder ship regardless.

**The elements (answer inline, one word each):**

1. **Polychrome board** — terrain fill hue = tile kind (wheat/olive/sienna/grey
   glazes): keep / park KEEP
2. **Stylized iconography** — hand-authored Greek pictograms (the A/B winner)
   replacing the current glyphs: keep / park KEEP
3. **Katalogos chrome** — paper-catalog panel/typography treatment for the ledger,
   bars, and modals: keep / park KEEP 
4. **Vase-black ceremony register** — black glaze reserved for the verb rail,
   tooltips, and game-over: keep / park KEEP
5. **Board tokens** — bone yield chits, always-visible slot sockets, pops as
   class-glyph + numeral. (The slot/yield tile glyphs already shipped in PR #22
   under an approved gate — a "park" here stops *further* token restyling, it
   does not roll that back.): keep / park KEEP

**Your answer (2026-07-13):** keep — all five ("satisfied with the fundamentals").
The reskin proceeds whole. Standing safety: the Katalogos chrome (element 3) gets a
two-minute owner glance when the first reskinned build lands — under D13 a late park
is a cheap register-revert, not a renegotiation. The post-1.5 legibility playtest
(arm's-length, Sim Daltonism, chit toggle) remains part of the exit gate. NOTE: The map tile desgin that I ultimately like the most design-wise is my current one: color signifies resource, numbers top at bottom showing building slots and numbers, respectively. 2 colony vs 1 city icon comes in the middle row. in the future, not now, i would want to add different map modes (which we have atm but placeholder) so players can see e.g. which player has which building, how many levels etc. directly on the map. but not now. 


---

## The wholesale-execution battery — Q20–Q35 · `CHARTER LOCKED (Q20–Q23) · design forks open`

Filed 2026-07-13 at the user's request: every decision needed to run the roadmap
end-to-end (Phase 1.5 → 5) as one unattended, subagent-driven build run. Answer the
**run charter first** (Q20–Q23 — it defines how the run behaves); the phase blocks
after it are the design forks each phase needs locked before it can build. Q13b and
Q17–Q19 above are part of the battery — answer them too, or leave them to the Q22
blank-slot rule (Q13b blank = HOLD 20w+2f per its rec).

**Preconditions (mechanics, not questions):** the machine must stay awake all night
(`caffeinate -dims` or equivalent — sleep kills the run); the session needs a
permission mode that won't stall on edits/tests/commits; plan/usage limits are the
hard budget ceiling. Phase 3's block below doubles as the Politicians design session
the roadmap requires — answering it satisfies principle 5.

**— The run charter —**

### RUN · Q20 · Stop-line — how far does the run go? — `ANSWERED (2026-07-13)`

**Context.** Phases 4–5 stack undesigned surface (coasts, trade, ideas, multiplayer)
onto foundations no human has playtested. Every phase built past the last playtest
compounds the cost of a morning "this feels wrong."

**Rec:** **build through Phase 3, prep 4–5** — Phases 1.5 → 3 built end-to-end;
Phase 4's feat plans finalized + its sims run; Phase 5 reduced to a design brief.
The morning playtest then ratifies three phases, not five. "Build everything
answered below" is the aggressive alternative — the machinery handles it; the risk
is five phases of compounding on an unratified base.

**Your answer:** ~~through Phase 3, prep 4–5~~ → **REVISED 2026-07-15: Phase 2 only.**
The run goes 1.5 → 2 and stops; Phase 3 is not built. Reason: Q27–Q29 (assembly,
resolutions, Politicians) are the owner's own design and stayed blank — under the Q22
rule they would have defaulted to Claude's recs, i.e. Claude inventing the rivalry
layer. Phase 3 waits for the owner's design session. Phases 4–5 prep is dropped from
the run too (it was predicated on 3 being built).

### RUN · Q21 · Merge policy for unattended phases — `ANSWERED (2026-07-13)`

**Context.** Phases build on each other, so the run needs a rule for what "done"
means overnight. (a) **Stacked branches** — `feat/ui-refit` → `feat/phase2-terrain`
→ …, one PR per phase, all left open; you playtest the stack in the morning and
merge in order. (b) **Self-merge** — each phase merges to main once its Q23
automated gate passes; the morning playtest audits the merged whole, reverts are
the safety valve.

**Rec:** **(a) stacked PRs — nothing merges itself.** Cost: if the playtest changes
Phase 1.5, the stack above it rebases; acceptable. Unreviewed self-merges are how a
bad overnight assumption becomes load-bearing.

**Your answer:** (a) stacked PRs — as recommended.

### RUN · Q22 · Decision authority mid-run (the blank-slot rule) — `ANSWERED (2026-07-13)`

**Context.** Unforeseen forks WILL surface mid-build — Q14/Q15/Q16 were all filed
mid-phase and answered same-day; overnight there is no same-day.

**Rec:** the **blank-slot rule**: any battery question left unanswered, and any fork
that surfaces mid-run, resolves to Claude's recommendation, executes, and is logged
in the decision log as `PROVISIONAL (overnight)` — plus a morning-report block
prepended to this file listing every provisional call for re-opening. Alternative:
an unanswered fork halts its phase and the run skips to independent work — safer,
but one early blocker can dead-end the whole night.

**Your answer:** confirmed — blanks resolve to the recs (PROVISIONAL, logged in the
morning-report block + execution log — the decision log was removed 2026-07-13).
Where I *have* written an answer, my words override; partial answers like "…agree
with the rest of the recs" mean exactly that — my stated points rule, the rest
defaults.

### RUN · Q23 · What substitutes for the playtest gates? — `ANSWERED BY DEFAULT (Q22 rule, 2026-07-13)`

**Context.** The exit gates for 1.5 ("a new player can find any rule reference…")
and 3 ("a runaway leader gets checked in playtest") are human playtests; no
overnight run can pass them.

**Rec:** each phase exits **provisionally** on: `npm run check` + full test suite
green · the phase-exit sim campaign from the roadmap table, saved to `docs/sim/` ·
for UI-heavy phases, a scripted Playwright walkthrough exercising every new surface,
screenshots saved for morning review. The roadmap-table gates remain the ratifying
gates — checked by you at the morning playtest; the execution log marks each phase
`pending ratification` until then.

**Your answer:** left blank → rec applies per the Q22 rule (PROVISIONAL).

**— Phase 1.5 · the interface refit —** already filed above: Q17 (verb-bar home),
Q18 (compendium contents), Q19 (Chronicle/deck-tray homes), plus Q13b (repricing
verdict). Answer them there, or leave them to the Q22 rule.

**— Phase 2 · the land repriced —**

### P2 · Q24 · Gold-tile removal — commit, conditional, or soften? — `ANSWERED (2026-07-15 — COMMIT; full terrain spec below)`

**Context.** `docs/feat/terrain-economy.md` removes all tile gold (first-order/
second-order principle). The standing watch item requires re-running the expansion
campaign post-bank first: the D6 market partially rehabilitates gold hills (a 4-gold
hill ≈ 2 flexible materials/turn at the buy rate), and Q13b's counter-watch already
suspects post-bank expansion is too loose.

**Rec:** **conditional commit**: run the campaign first; if hill starts merely level
out, remove gold tiles per the plan; if the report shows the economy leaning hard on
tile gold, fall back to the plan's recorded rejected variant (1–2 "silver mine"
landmark hills at 3–4 gold, the rest converted) and log it provisional.

**Your answer:** [DISCUSS WITH USER BEFORE COMMITTAL] I'm leaning towards this: Hills yield no resources, but have a more building slots. Wood has lowest building slot, then Mountains, then Plains, Then Hills. This is banked in. I also have this musing: You can build Gold mines on Hills; when you do, you can't build anything else (?); or we replace some hill tiles with like 2-3 "Gold" tiles to simulate ancient mint(?) [DISCUSS]

**Claude's response (2026-07-15) — three parts:**

**(1) Gold mine building ✅, gold tiles ❌.** Your musing (b) is the better half, and
it isn't a compromise — it's *more* principled than it looks. The first-order/
second-order rule reads "gold and influence are generated by civilization — pops,
**buildings**, trade — never by tiles." A mine is a building. So the Metallon gives
you the whole Laurion fantasy while keeping the principle exactly intact. Musing (c)
(2–3 "gold"/mint tiles) is literally the variant terrain-economy.md already recorded
as rejected — it puts gold back in the land and re-opens the trap-tile problem the
whole rework exists to close. **Rec: (b), drop (c).**

**(2) But not full exclusivity — make it a 2-slot footprint.** "Build a mine and you
can't build anything else" fights your own ruling: you're promoting hills to *slot
king*, then a mine would turn the best-slot terrain on the map into a one-building
tile. The choice collapses ("mine OR town" is the same binary a yieldless hill
already forces). A **2-slot Metallon** on a 3–4-slot hill keeps the tension real —
half your big hill is a mine, the rest is still yours — and it costs nothing in
theme. **Rec: 2 slots, not exclusive.**

**(3) Two problems with hills at literally-zero yield — recommend token yields.**
Flagging these because they're engine-level, not taste:
- **Slaves go dead.** Slave income follows `tile.resource.type` — on a no-yield hill
  a slave produces *nothing*. So the slot king becomes the one terrain where a third
  of your pop ladder is inert. (The Metallon fixes this for gold — see Q25 — but only
  after you can afford it; the early hill is still a dead tile.)
- **Stone supply collapses.** Zero-yield hills mean stone comes *only* from 6 mountain
  tiles (20 total, map-wide, for 4 players) — while every civic building you own
  (Temple, Forum, Aqueduct, Odeon) is stone-priced. The draft plan deliberately moved
  hills to +26 stone to cover this; zeroing them removes the compensation and makes
  the bank mandatory for civic play, which sequencing rule 5 warns against.

**Rec:** keep the *spirit* (hills are for building, not harvesting) via the **slot
counts**, not by zeroing yields — token +1/+2 stone or food on most hills, with the
**4-slot landmark hill** as the one true zero-yield tile, plus 2 bare hills as natural
Metallon sites. Your call; if you want literal zero anyway, say so and it ships with
the sim watching slave-idle rate and stone starvation.

**(4) The slot numbers your ordering actually needs.** Measured from `TERRAIN_DECK`
today: plains 8 tiles/20 slots (**2.50**/tile) · hill 9/17 (1.89) · mountain 6/8
(1.33) · forest 14/17 (1.21). So today it reads forest < mountain < **hill < plains**
— and the draft table in terrain-economy.md only lifts hills to 21 (2.33), which
**still leaves plains the slot king**. Your ordering needs hills above 2.50/tile.
Proposed 9-hill table (≈24 slots, 2.67/tile):

| Count | Slots | Yield | Role |
| ---: | ---: | --- | --- |
| 1 | 4 | none | the big hill — pure building landmark |
| 2 | 3 | +1 stone | civic sites |
| 2 | 3 | +1 food | terraced hillsides |
| 2 | 2 | none | bare hills — natural Metallon sites |
| 2 | 2 | +2 stone | lesser quarries |

Map totals: gold 14 → **0** · stone 20 → **26** · food 44 → **46** · hills **17 → 24
slots (2.67, slot king)** vs plains 20 (2.50). Final ordering: forest 1.21 < mountain
1.33 < plains 2.50 < **hill 2.67** ✅. Numbers are ruleset data — sims tune from here.

---

**Owner reply (2026-07-15):** cut hills 9 → **6**, the 3 freed tiles become wood/stone;
remaining 6 hills are **zero-yield, pure building slots**; wants an **"Oracle"** tile
(Delphi), purpose TBD. Rejects Metallon and terrain-gated buildings generally: *"if so,
then we need to have one for each terrain as well, and they will be positive loops of
each other."* Frames the fork as **"4 hills, all gold, no building slots" vs "zero-yield,
many building slots"** — don't hybrid.

**Claude's response (2026-07-15) — conceded, and the 6-hill cut resolves my objection:**

**(1) The hill cut fixes the stone collapse — my (3) objection is withdrawn.** Moving 3
hills into wood/stone is exactly the compensation the zeroing removed. Recommended split
**+2 mountain, +1 forest** (stone was the scarce one):

| | tiles | slots | avg | yield |
| --- | ---: | ---: | ---: | --- |
| forest | 14 → **15** | 17 → **18** | 1.20 | wood 33 → **36** |
| mountain | 6 → **8** | 8 → **11** | 1.38 | stone 20 → **26** |
| plains | 8 | 20 | 2.50 | food 44 |
| **hill** | 9 → **6** | 17 → **19** | **3.17** | gold 14 → **none** |

37 tiles, 68 slots. Ordering: forest 1.20 < mountain 1.38 < plains 2.50 < **hill 3.17**
✅ — and stone lands at 26, the same figure the original draft protected. The 6 hills:
**1 landmark hill (4 slots) · 1 Oracle (3 slots) · 4 plain hills (3 slots each)**.

**(2) Zero-yield hills are now *right*, and my slave objection dies with the Metallon.**
Verified in `economy/income.ts`: **citizens** → influence + gold, **freemen** → gold —
neither reads the tile. Only **slaves** multiply `tile.resource.type`. And

> **⚠ Implementation precondition (found 2026-07-15).** Slave income is
> `settlement.pops.slaves * ruleset.popIncome.slaves.primaryResource` of
> `tile.resource.type` — scaled by a **ruleset coefficient, not by the tile's amount**.
> So a hill authored as `{ type: "stone", amount: 0 }` would still have its slaves
> producing **stone at full rate**, and the whole hill-city / worked-country identity below
> silently breaks. "Zero-yield" must therefore mean **no resource type at all** —
> `resource: Yield | null` on `HexTile` (+ null-handling in `income.ts` and
> `ui/resourceVisuals.ts`). Small, but load-bearing: it is what makes slaves inert on
> hills. Ships with the terrain PR.
`PlayerState.resources` is a **single player-wide pool**, not per-settlement. So a
zero-yield hill already has a complete identity with **zero new mechanics**: it is where
**citizens and freemen** live — the pops that produce without land — fed from the pool
your plains fill. Slaves work the yielding country. That is the hill city and the worked country,
and it falls out of rules that already shipped. Gold *does* come from the hills — via
freemen, not tiles. The first/second-order principle writing itself.

**(3) Metallon: withdrawn.** The owner's positive-loop argument holds for the *family*
(Sawmill/Farm/Quarry each amplify what their tile already does — rich-get-richer, and
terrain would dictate the build instead of posing a question). Metallon itself was
negative-space rather than amplification, but that defence is moot: **the thing it
existed to fix isn't broken.** Inert slaves on hills is a *feature* — it prices the
the big hills as elite terrain (no cheap 4:1 pops). Nothing else needed it.
**Phase 2's exit gate still passes without terrain gating:** build orders diverge
because Villa/Workshop are worthless on a zero-yield hill while stone civics are
indifferent to it — divergence from tile yield, not from a hard rule.
**The owner's "4 hills all gold, no slots" arm is correctly rejected** — it is tile gold
under a new name, i.e. terrain-economy.md's recorded rejected variant.

**(4) The Oracle — hook it to the omen table.** It already exists (PR #22: each spring
the year's opener rolls d6, ±1 income of one resource, table-wide, EV 0 on the face).
Delphi *prophesied*; the game already has the prophecy. Recommended v1: **the Oracle's
holder rolls the omen twice each spring and chooses which one applies.** It is the
game's first **rivalry object** (roadmap principle 4: rivalry outranks solitaire) — a
landmark worth fighting for that yields nothing, biases the whole table's year toward
its holder, and paints a target on them. Historically exact: the Pythia was bribed
(Cleisthenes did it). Implementation is small — the omen roll is already the one
`rollOnTable` seam; this reads "roll twice, holder picks."
- *Alternative considered — yearly influence auction* (highest bidder picks the omen):
  more thematic still, and it would give **influence** the sink it lacks now that
  Phase 3 is cut. Held back as the **Phase 3 upgrade path**: it wants bidding machinery
  + bot bidding logic, which is assembly-shaped work. v1 settles it, Phase 3 politicises
  it.
- *Weaker variants for the record:* holder merely **sees** next year's omen early (pure
  information, safe but thin) · holder **rerolls** once (same as choose, more steps).

**Owner ruling (2026-07-15) — Oracle is COSMETIC.** *"Retain the Oracle, purely
cosmetic, works like Catan's desert, disrupts the map and layout."* → **0 yield, 0
slots, no mechanic.** Its job is to be a hole: a tile nobody wants, breaking up the map
and forcing colony-contiguity chains to route around it. The omen hook above is
**benched, not dead** — recorded as the natural Phase 3 pickup (with the influence
auction) if the Oracle ever wants a job.

**Two knock-ons the cosmetic ruling creates — need owner input (see Claude's
2026-07-15 message):**
1. **Tile arithmetic.** Is the Oracle *one of* the 6 hills, or its own terrain (Catan's
   desert is a distinct terrain)? The map must stay at 37. Options: **(a)** own terrain
   → plains 8 · forest 15 · mountain 8 · **hill 5** · **oracle 1** = 37 · **(b)** a 0/0
   hill → plains 8 · forest 15 · mountain 8 · **hill 6 (one of them the Oracle)** = 37.
   **Rec: (a)** — a distinct terrain is what makes it read as a hole rather than a bad
   hill, and it keeps every *actual* hill a real building site.
2. **Slot-king math moves.** A 0-slot Oracle inside the hill count drags the hill
   average from **3.17 → 2.67**/tile, barely over plains' 2.50. Under **(a)** the 5 real
   hills carry 16 slots = **3.20**/tile and the ordering stays clean. Another reason
   for (a).

**OWNER RULING (2026-07-15) — option (a), and it is unsettleable.** *"its own terrain:
you cant build anything on it, so like desert terrain its oracle terrain."*

### Phase 2 — FINAL TERRAIN SPEC

**Oracle terrain** — a new `Terrain` member, **one tile**, **no resource**, **0 slots**,
**cannot be settled at all** (no colony, no city — the hole is the point). Because it can
never host a settlement it can never be a link in a contiguity chain, so it permanently
splits the map and forces colony chains to route around it — the Catan-desert disruption
the owner asked for, achieved with no new mechanic.

| terrain | tiles | slots | avg | yield |
| --- | ---: | ---: | ---: | --- |
| forest | **15** | **18** | 1.20 | wood **36** |
| mountain | **8** | **11** | 1.38 | stone **26** |
| plains | 8 | 20 | 2.50 | food 44 |
| **hill** | **5** | **16** | **3.20** | **none** |
| **oracle** | **1** | **0** | — | **none**, unsettleable |

**37 tiles · 65 slots.** Ordering: forest 1.20 < mountain 1.38 < plains 2.50 <
**hill 3.20** ✅. Hills break down as **1 landmark hill (4 slots) + 4 hills (3 each)**.
Gold on the map: **0**.

**Engine deltas this implies** (all additive, all data-driven):
- `Terrain` union += `"oracle"`; one row in `TERRAIN_DECK`.
- `HexTile.resource: Yield | null` — the precondition from Q24 §2, needed by both the
  hills and the Oracle; null-handling in `economy/income.ts` + `ui/resourceVisuals.ts`.
- Settlement legality (`foundColony`, upgrade paths, setup placement) rejects `oracle`.
- Setup guard: the snake draft must never offer an Oracle tile as a capital/colony site.
- `ui/resourceVisuals.ts` re-theme: hills currently paint **gold**; hills become
  yield-less slot-forward, and the Oracle needs its own treatment.

### P2 · Q25 · Tier-2 roster & the upgrade grammar — `ANSWERED (2026-07-15 — Villa + Gymnasion; no tiers, no upkeep, maxLevel caps)`

**Context.** Four buildings exist (marketplace, temple, workshop, granary). todo.md
candidates: Aqueduct (+4 capacity), Forum (+2 influence), Warehouse (+1 tile
material income), Barracks (military placeholder). The pricing grammar is settled
(wood = economic, stone = civic, gold = commerce; food/influence never buy
buildings), and the riot table's roll-1 "building destroyed → downgraded once tiers
exist" needs tiers to mean something.

**Rec:** four **standalone** tier-2 buildings (each takes a slot; tier is a
property — no upgrade-in-place mechanic in v1): **Villa** (economic, wood, gold) +1
material income on its tile · **Forum** (civic, stone) +2 influence/turn ·
**Aqueduct** (civic, stone) +4 pop capacity · **Emporion** (commerce, gold)
improves the bank sell rate one step for its owner. Barracks stays parked with
military. Exact costs priced by sim against Phase-1 income curves (grammar fixed,
numbers as ruleset tunables). Riot roll-1 destroys the highest-tier building
present (tier 2 before tier 1).

**Your answer:** All good except Emporion, park that. PROACTIVELY RESPOND HERE TO THE USER IN YOUR NEXT MESSAGE] 
Suggest 2 more buildings. Check Hegemony.pdf for inspiration too.

**Claude's response (2026-07-15):**

**First, a correction to my own rec above:** it listed Forum and Aqueduct as tier-2
proposals, but both **already shipped** in PR #22's civic-buildings commit (along with
the Odeon). So with Emporion parked, the standing roster is **Villa alone** — you're
right to want more. Live roster: Marketplace, Temple, Workshop, Granary (tier 1) +
Forum, Aqueduct, Odeon (civic, PR #22).

**The PDF check came back mostly empty, and that's informative.** Its full building
list is Marketplace · Temple · Workshop · Forum · Granary · **Library** · **Embassy** ·
**Luxury Goods' Trader**. The first five are built. The last three are each blocked on
a system we aren't building: Library pays out in **National Ideas** (Phase 5), Embassy
in **Assembly votes** (Phase 3 — now cut), the Trader in **Luxury Goods** (Phase 4).
So there is nothing left to port; the two below are new, but built from the PDF's
grammar and its own vocabulary.

**Suggestion 1 — Metallon (τὸ μέταλλον), "the mine."** *Economic · hill-only · 2 slots.*
- **Effect:** `slaveGoldBonus` — +1 gold per 2 slaves in this settlement (the exact
  shape of Workshop's `slavePrimaryResourceBonus`, paying gold instead of materials).
- **Cost:** ~12 wood + 6 stone (tier-2, sim-priced; shafts and props, not commerce —
  so it is *not* gold-priced despite producing gold).
- **Why this one:** it is the answer to Q24 wearing a building's clothes. Laurion, the
  slave-worked silver that actually paid for the Athenian fleet. It keeps gold
  second-order (§1 names buildings as a legitimate source), it is the **first
  terrain-gated building in the game** — which is precisely Phase 2's exit gate ("bot
  build orders diverge by terrain") — and it repairs the dead-slave hole a yieldless
  hill opens: on a bare hill, slaves stop being inert and become the mine crew.
- **Engine:** needs a `requiresTerrain?: Terrain` field on `BuildingDefinition` (none
  exists yet) + one new effect type. Both additive and data-driven.

**Suggestion 2 — Gymnasion.** *Civic · stone · any terrain.*
- **Effect:** promotions on the Phase-1 ladder cost 2 less in this settlement
  (s→f 4f→2f, f→c 4g→2g).
- **Cost:** ~12 stone + 4 wood (civic → stone-led, per the grammar).
- **Why this one:** the ladder is Phase 1's newest system and has **zero** building
  support — nothing in the roster touches it. The gymnasion is where Greeks literally
  manufactured citizens, so the theme is exact rather than decorative. It also gives
  the stone-hungry hill city a fourth civic worth its slots, and it leans on machinery
  that already exists (`actionCostDiscount`, added for the deck overhaul's grow
  coupons).
- **Engine:** add `"promote"` to `ActionCostDiscountTarget` (currently
  `buildBuilding | foundColony | growPop`). One-line union widen.

**Structural note — should tier 2 carry upkeep?** The PDF's Library is the only
building it ever gave a running cost (`Upkeep: -2 Food every turn`), and that instinct
is worth keeping: it makes tier 2 a **decision** rather than a strict upgrade, and it
gives the riot table's "destroys the highest-tier building" a silver lining instead of
pure feels-bad. Mechanically it is free — `{ type: "income", resource: "food", amount:
-1 }` already expresses it. **Rec: yes, a small food upkeep on tier-2 buildings.**
Flagging rather than assuming — say the word and it rides along.

**Bench (not proposed, recorded so they aren't re-invented):** *Stoa* (rewards
building density — +1 influence per other building here; swingy, wants sims first) ·
*Latomeia* (mountain-only stone boost — overlaps Villa) · *Emporion* (parked by you) ·
*Barracks* (parked with military).

---

**Owner reply (2026-07-15):** *"Gymnasion is a great idea. Metallon isn't."* — no
terrain-gated buildings (see Q24 for the full exchange; Metallon withdrawn).

**Claude's response — the replacement pick, `Prytaneion`:**

**Standing tier-2 roster: Villa · Gymnasion · Prytaneion.** (Emporion parked, Metallon
withdrawn, Barracks parked with military.)

**Prytaneion** — *civic · stone · any terrain.*
- **Effect:** citizens in this settlement eat **1 food instead of 2**.
- **Cost:** ~10 stone + 4 wood (civic → stone-led).
- **Why it earns the slot:** the zero-yield hill pushes you toward **citizens and
  freemen** (the only pops that produce without a tile — Q24 §2), and citizens are the
  hungriest pop in the game at −2 food each with no tile food under them. That strain is
  good design and should mostly *stay*; the Prytaneion is the one lever that makes a
  citizen-heavy hill city viable rather than merely expensive. Historically exact:
  *sitesis*, the public meals the prytaneion served its honoured citizens at civic
  expense. Universal, not gated — but it *wants* to be built on hills, which is the soft,
  emergent divergence the owner asked for instead of hard rules.
- **Engine:** one new effect type (`popUpkeepReduction`: pop type + amount). Additive.

**Owner ruling (2026-07-15):** *"forget prytaneion"* → **dropped.** *"if the question is
whether tier-2 buildings like upgrading a granary with an additional level costs an
upkeep the answer is no i believe"* → **upkeep: NO.** Tier-2 buildings carry no running
cost. (The PDF's Library precedent is noted and declined; recorded here so it isn't
re-proposed.)

**Standing tier-2 roster: Villa · Gymnasion.** Two, not the three requested — Metallon
withdrawn, Prytaneion dropped, Emporion parked. *Owner: ship at two, or name a third?*

---

### The tier-2 model is undefined — and the engine has already picked a side

**Flagged 2026-07-15.** The owner's phrasing above (*"upgrading a granary with an
additional level"*) reads tier 2 as **levels**. This block's rec reads it as **new
standalone buildings** ("tier is a property — no upgrade-in-place mechanic in v1"). The
roadmap's Phase 2 row just says "building tier 2" and never disambiguates. These are
different games, and Phase 2 is exactly when it must be settled.

**What the code actually does today** (`actions.ts:240`, `status.ts:111`):
`Settlement.buildings` is a plain `BuildingId[]`; `buildBuilding` **pushes with no
duplicate check**. The *only* gate is `buildings.length >= slots`. So **levels already
ship**: three Granaries in one city is legal right now and pays **+6 food** — which is
precisely the PDF's own model (*"Three blocks next to the Forum image means a Level 3
Forum"*, *"Every level gives +1 Assembly Vote"*, *"Every 2 Libraries grant one National
Idea"*). Level = copies, each copy eats a slot.

**And half the roster already anticipates it:** Marketplace / Workshop (`supportedPops:
3`) and Temple (`2`) carry caps, so a second copy *extends* the cap — stacking is
clearly intended there. But **Granary (+2 food), Forum (+2 influence), Aqueduct (+4
capacity) and Odeon (+2 happiness) are flat and uncapped** — they stack **linearly and
without bound**. On a 4-slot hill "build 4 Odeons for +8 happiness" is legal and
possibly optimal. That is a live spam vector in `main` today, not a Phase 2 invention.

**Claude's rec — they're orthogonal, keep both, and cap the flats:**
- **"Tier 2" = a new generation of buildings** (Villa, Gymnasion): new options, priced
  above tier 1. This is what the roadmap's Phase 2 row means.
- **"Levels" = stacking copies**, which already works and should stay — it is the PDF's
  model and it gives the slot-king hill its whole point (deep cities, not just
  wide ones).
- **Fix the spam vector while we're in here:** give the flat-effect buildings a
  `supportedPops`-style cap or a diminishing curve, so a stack is a *decision* and not
  a multiplier. Sim it with the terrain batch.

**OWNER RULING (2026-07-15) — RESOLVED:**

1. **There is no "tier 2" on the player end.** *"that was just like a dev roadmap spec,
   they are just tier 2 insofar as they enter in midgame-ish but nothing saying tier 2
   on the player end."* → **"Tier 2" is roadmap shorthand only.** No tier property, no
   tier UI, no tier vocabulary in rules.md. Villa and Gymnasion are simply **buildings**
   that happen to be priced for the mid-game. Delete the concept from the spec; the
   roadmap row keeps the phrase purely as a phase label.
2. **Every building's benefits/levels are capped.** *"they cant scale forever."*
   **Rec: a `maxLevel` field on `BuildingDefinition`** (level = copies in one
   settlement), default ~2–3, sim-tuned per building. Chosen over diminishing-returns
   curves because it is one data field, it is legible to the player ("Granary 2/3"), and
   it matches the PDF's own bounded track (*"Three blocks … means a Level 3 Forum"*).
   **Design payoff:** slots alone were the only cap, so a 4-slot hill could hold 4
   Odeons; with `maxLevel` a big hill must **diversify** — which is exactly what makes
   slot-rich hills interesting rather than a spam platform.
3. **Roster ships at two: Villa · Gymnasion.** *"two buildings is good."*
4. **No upkeep** (ruled above).

5. **"Acropolis" is retired as a concept** (2026-07-15): *"i dont want that as a concept
   in the game."* No landmark name, no game vocabulary — the 4-slot hill is just **a
   hill with 4 slots**. Scrubbed from roadmap.md, this file, terrain-economy.md and
   todo.md; it survives only inside `docs/design/`, which is a dated snapshot and not
   live spec. **Do not reintroduce it** — including as flavour, art label, or tile name.
6. **Riot "tier-2 reduction" = level reduction, confirmed** (2026-07-15). See below.

**Free consequence — the riot "downgrade" note is already satisfied.**
`tables.ts:260` carries a promise: *"Once building tiers exist (Phase 2) this becomes a
downgrade for tier-2+ buildings — today everything is tier 1, so destruction is the
rule."* With tiers deleted and levels real, `destroyRandomBuilding` already splices **one
entry** out of the flat `buildings[]` array — so a Level 3 Granary losing a copy **is**
the downgrade. No riot-table work needed; just correct that stale comment. Q15's
"downgrade once tiers exist" is closed by the level model, not by tiers.

**Owner confirmation (2026-07-15):** *"tier 2 reduction just means level reductions,
yes."* → **Locked.** The riot's roll-1 removes **one copy** of a building: a Granary at
level 3 drops to level 2; a building at level 1 is destroyed outright. The word "tier"
leaves the codebase with the comment.

### P2 · Q26 · Hill redistribution — ship the draft numbers? — `ANSWERED (2026-07-15 — folded into Q24; draft numbers superseded)`

**Context.** terrain-economy.md drafts the 9 hill rows: 4-slot landmark hill,
quarries, terraces — map totals go gold 14→0, stone 20→26, food 44→48, and hills
become the slot king (17→21).

**Rec:** ship the draft table as the starting values (they're ruleset data; sims
tune from there). Sub-forks, all per the plan's leanings: **no founding restriction
on the landmark hill** (colony-squatting it is denial-play — interesting; watch it) ·
forest trim (14 → 12–13) deferred until map shuffling lands · the hill art/label
re-theme (`resourceVisuals.ts` still reads hills as gold) ships in the same PR.

**Your answer:** Decision about hills have been explained above. Refer there and whoosh this. 

**Folded into Q24 (2026-07-15).** The hill table, slot ordering, and gold verdict all
live in Q24's response now — this block is closed, no separate answer needed. The two
sub-forks it carried, unchanged and unanswered → they take the rec per Q22: **no
founding restriction on the landmark hill** (colony-squatting it is denial-play — watch
it) · **forest trim (14 → 12–13) deferred** until map shuffling lands · the hill
art/label re-theme (`resourceVisuals.ts` still paints hills gold) ships in the same PR.

**— Phase 3 · the rivalry layer —** *(this block IS the Politicians design session
the roadmap requires before Phase 3 can start)*

### P3 · Q27 · Assembly cadence, votes, and flow — `OPEN`

**Context.** Archive rules: convenes at fixed intervals, unskippable, 2 resolutions
drawn, yay/nay, simple majority, passed → active in the center. seasons.md leans
first assembly at year 2 (none on the opening spring). Archive votes: 1 base per
player; the PDF's +1 per 10 citizens never binds at prototype pop counts.

**Rec:** assembly every new-year Spring **from year 2** (the `isNewYear` hook in
`core/calendar.ts` is ready-made), resolved before the opener's turn. Votes:
**1 base + 1 per 4 citizens** (the PDF ratio rescaled so citizens are politically
valuable without being crowned), ties FAIL. Two drawn resolutions per assembly;
passed resolutions persist until repealed.

**Your answer:** Spring of YEAR 3 it should be. Players shouldn't draw cards. Instead players choose themselves, Hegemony Assembly is something that pops over the map (you can toggle between modes), and they are shown the cards belonging to 4 politicans; 

### P3 · Q28 · Resolution deck v1 — contents & influence verbs — `OPEN`

**Context.** This is influence's primary job (todo.md). Archive influence verbs:
draw / exchange / play-from-hand / propose-repeal / veto.

**Rec:** **12 resolutions as data** (the event-table law applies: content in
`data.ts`, one engine seam, one UI surface), 3 per politician, every effect built
from levers the engine already has (yields, ladder prices, bank rates, colony cost,
calm cost, happiness deltas) — no new mechanics smuggled in on cards. Influence
verbs v1: draw 2 · play-from-hand 3 · veto 5 (once per assembly) · propose-repeal 4;
exchange is cut from v1 (draw covers it).

**Your answer:**

### P3 · Q29 · Politicians v1 — how thin is the layer? — `OPEN`

**Context.** The four archive politicians (Stratokles Stratoklid the Cunning
Populist = the leader-check, Catan-robber pattern; Demosthenes agriculture;
Perdiccas urban; Kleistophenes expansion). Design intent: passed resolutions empower
their politician; control grants buffs; influence-heavy builds are politically
strong, economically fragile.

**Rec:** v1 = **power track + patron buff + the leader-check, nothing else**. Each
passed resolution gives +1 power to its politician; the top contributor is its
patron and holds a small standing buff themed per politician (e.g. Demosthenes:
ladder food costs −1). Stratokles differs: his resolutions **target the current
victory-card leader** (pooled-resource neutralization — every player pays into a pot
that hits the leader), so the leader-check emerges from votes, not automation. No
politician victory conditions, no danger track in v1.

**Your answer:**

### P3 · Q30 · Yearly cards / d20 omen table — ride along with Phase 3? — `OPEN`

**Context.** Design-queue item, slot flexible (Phase 1 or 3); Phase 1 shipped
without it. The assembly and the yearly draw share the same new-year hook.

**Rec:** **ride along with Phase 3**: a d20 omen table as another
`EventTableDefinition` (the component's law), drawn each new year right before the
assembly — year-scale weather for the political season. Contents drafted from
seasons.md's yearly-card notes; all effects on existing levers.

**Your answer:**

**— Phase 4 · the wider world —**

### P4 · Q31 · Coastal geometry — feature ring or real tiles? — `OPEN`

**Context.** luxury-goods.md proposes lightweight `CoastalTile` records attached to
edge hexes; terrain-economy.md leans "pure feature tiles" (not settleable, no
slots). The 18 rim tiles already serve as the coastline for leapfrog.

**Rec:** **pure feature ring**: 12 coastal features attached to rim edges, never
settleable, no slots — a port in a city adjacent to that edge claims the feature.
Cheapest to build, matches the PDF, keeps naval anything out of scope.

**Your answer:**

### P4 · Q32 · Luxury roster, caps, and port pricing — `OPEN`

**Context.** luxury-goods.md as amended by terrain-economy.md: 9 named goods
(6 coastal + 3 via the 100-gold Trader, global Trader cap 3), +2 standing happiness
each (effective-happiness accounting, never banked), diminishing duplicates (second
copy of the same good +1), ~3 active per player, denial left as a seam for
resolutions. Port cost provisional: 20 wood / 5 stone / 10 gold.

**Rec:** approve the amended plan as written, every number a ruleset tunable; port
cost per the provisional. (Luxury art via the banana pipeline — the plan's "ChatGPT
image generation" line is stale.)

**Your answer:**

### P4 · Q33 · Player trade v1 — what shape? — `OPEN`

**Context.** D6's corridor philosophy: bank rates bracket player pricing; player
trade is the scarcity market inside the corridor. Q14 precedent: influence and
happiness are never tradable.

**Rec:** **structured offers, no negotiation UI**: on your turn, offer a bundle
(wood/stone/food/gold, plus claimed luxuries — they're the monopoly currency) to a
named player; they accept/decline; no counter-offers in v1 (a counter is just a new
offer back). Bank-rate drift stays dead unless the phase-exit sims show player trade
failing to carry the scarcity feel (the D6 watch item).

**Your answer:**

**— Phase 5 · asymmetry & frame —**

### P5 · Q34 · National ideas v1 — draft shape & catalog — `OPEN`

**Context.** todo.md: per-seat modifiers picked after initial placement, so seats
play asymmetrically. Archive examples: a free discard-after-use veto,
start-with-Trader.

**Rec:** **8 ideas as ruleset patches** (pure data), snake-drafted immediately after
setup placement in reverse placement order (last placer picks first), one per
player, public. Catalog drafted from existing levers: colony discount · ladder
discount · +1 assembly vote · one bank-rate step · venture odds · calm discount ·
+1 metropolis slot · extra starting resources; start-with-Trader only if Phase 4
shipped. Draft-evenness checked by the Phase 5 gate sim (no auto-picks).

**Your answer:**

### P5 · Q35 · Mode picker & the multiplayer track — in or out? — `OPEN`

**Context.** Modes are already ruleset patches behind `GAME_CONFIG.mode` + URL
params; an in-game picker is lobby scope. Networked multiplayer is an architecture
project (sessions, sync, lobby), and 2–3 player support needs a map/deck-scaling
design pass (parked until Phase 5 by the roadmap).

**Rec:** **in**: a pre-game setup screen (mode, board classic/shuffled, seed, player
count/names) replacing the URL-param-only flow. **Out of the wholesale run,
explicitly**: networked multiplayer and 2–3 player scaling — both deserve their own
design pass with you awake, whatever Q20 says about the rest.

**Your answer:**


---

## Standing watch items

Seat-3 win lean (+2.8σ under greedy bots — possible snake turnaround edge; recheck
with stronger bots/humans) · re-run the expansion campaign after D6 ships, before
Phase 2's gold-tile removal · Phase 4 revisits bank-rate drift · **colony price
(Q13b)**: held at 20w+2f, but the owner wants it back on the table in a future
balance talk — the post-bank tempo brake may now be too loose; pair the re-look with
Phase 2's gold-tile-removal check.

*(The decision log that lived here was removed 2026-07-13 at the owner's request —
every decision is folded into roadmap.md, the specs, or the code it shipped in; the
table survives in git history. Overnight provisional calls now log to the
morning-report block + the execution log below.)*

## Execution log

| Date | Branch / commit | What shipped | Phase |
| --- | --- | --- | --- |
| 2026-07-12 | **PR #20 → main** | **Phase 0 merged.** Victory race (5 public cards, tunable minimums, turn-start win check, finite seasonal deck + exhaustion tally); metropolis (4 pops) + coastal founding colony (2 pops) snake setup; colony contiguity + coastal leapfrog; yearly opener rotation; Classic/Shuffled boards + URL params; stockpile-happiness cap +2; full UI (Victory tab, roster badges, seasons-left, board chip, game-over screen); dev auto-openings rotating 10 seeds; sim-CLI telemetry (victoryCards, frontierTiles). 109 tests. Campaigns: contiguity A/B (geometry never binds), minimum tuning (race wins land ~year 4.8), mixed colony pricing (Q13b data). | 0 |
| 2026-07-12 | `feat/phase1-currencies` | Branch opened; appendix pruned to Phase 1; Q14–Q16 filed. | 1 |
| 2026-07-12 | `feat/phase1-currencies` | **Phase 1 built end-to-end (engine + UI + sims + tests).** Event-table component (docs/feat/event-tables.md) with riot + 3 expeditions as data; bank exchange with board-derived per-material rates (scarcity default confirmed by 20+20-game A/B, docs/sim/2026-07-12-bank-rates-ab.md — also the saved Q13b baseline); civic calm; ladder; blocking riot flow with deferred income; ventures. UI: Market tab (5-up ledger), Calm/Venture verbs, shared EventTableModal (riot insurance incl. concession target picker), ladder ↑/↓ on Pops tab. Sims: all 8 currency verbs alive, riots ~3/game, race close-rate 50–55% (up from Phase 0's 33–45%). 143 tests. Exit gate met pending user playtest. | 1 |
| 2026-07-13 | **PR #21 → main** | **Phase 1 merged.** Post-review additions rode along: ladder targeting modal with tile-art picker cards, settlement pickers name their tile + shared-colony status, Q13b post-bank comparison (rec: hold 20w+2f), the two selection rules pinned. | 1 |
| 2026-07-13 | `feat/ui-refit` | Branch opened; Phase 1.5 slotted before Phase 2 (D12); Q17–Q19 filed. | 1.5 |
| 2026-07-13 | `feat/ui-refit` | **Wholesale-execution battery filed (Q20–Q35)** at the user's request: run charter (stop-line, merge policy, blank-slot rule, gate substitution) + every design fork Phases 2–5 need locked, incl. the Phase 3 Politicians design session as questions. Answered battery = the roadmap runs end-to-end unattended. | all |
| 2026-07-13 | **PR #22 → main** | **Overnight run merged** (+ morning fixes: omen as a top-bar event card, omen → season → player order, grow-coupon summaries name the pop, kin-art fallbacks). Victory-minimums campaign saved (docs/sim/2026-07-13-victory-minimums.md): cities is the binding dial, rec 3→2 — **awaiting user verdict**, as are the omen numbers, Q13b, Q17, Q19, Q20–Q35. `feat/ui-refit` stays the Phase 1.5 branch. | 1.5 |
| 2026-07-13 | `feat/ui-refit` | **Overnight run (OVERNIGHT.md):** tile glyphs (slots `n/y` + value-scaled yield numbers replace pips — approved gate); **deck overhaul** (EV +4.9→+2.2, harm 8%→25%, grow coupons on the new `growPop` discount target, dominated choices repriced, Spring Floods + Wildfire close the auto-safe seasons — ledger issues 5/10/12 resolved, guarded by deck.test.ts, A/B docs/sim/2026-07-13-deck-overhaul-ab.md); **compendium v1** (Q18 answered-by-default — five data-driven sections behind the season dial / `?`); **yearly omen table — PROVISIONAL**: d6 by the year's opener each spring, ±1 income of one resource table-wide for the year (EV 0 on the table's face, guarded); die size became table data (`die: 6`). Omen numbers await the user's eyes. | 1.5 |
| 2026-07-13 | main (docs) | **D13 recorded + Q36 filed.** Owner flagged distaste for parts of the visual overhaul and wants zero deliberation time during feature work, so the refit splits: interaction grammar + R1–R8 ladder ship unconditionally; each brandbook visual element ships only on an explicit "keep" (Q36 — blanks park at the current look, agenda'd for post-Phase-5); monorepo/multiplayer staging deferred to Phase 5; brandbook freezes once 1.5 lands (roadmap principle 7). design/README.md rulings annotated. | 1.5 |
| 2026-07-13 | main (docs) | **Q36 ANSWERED: KEEP ×5** — the full reskin ships with 1.5 (owner: "satisfied with the fundamentals"); chrome wince-check on the first reskinned build stands. Next: owner picks the autopilot stop-line (Q20), decision authority (Q22), and merge policy (Q21) for the wholesale run. | 1.5 |
| 2026-07-13 | main (docs) | **Run charter LOCKED:** Q20 = through Phase 3, prep 4–5 · Q21 = stacked PRs · Q22 = blank-slot rule confirmed (explicit owner words always override) · Q23 = rec by default. **Sprint NOT launched** — owner is filling the design forks he keeps for himself first (Q25, Q27–Q29 flagged as owner-taste; see 2026-07-13 discussion). | all |
| 2026-07-15 | main (docs) | **PHASE 2 SPEC LOCKED** (Q24/Q25/Q26 all answered). Terrain: hills 9→5 zero-yield slot-king (3.20/tile) + 1 unsettleable **Oracle** terrain; +2 mountain / +1 forest; tile gold → 0; 37 tiles / 65 slots; ordering forest 1.20 < mountain 1.38 < plains 2.50 < hill 3.20. Buildings: **Villa + Gymnasion**, no upkeep, **no player-facing "tier" concept** (roadmap label only), **`maxLevel` caps every stack** (owner: "they cant scale forever" — also fixes the live uncapped-flat-stacker vector in main). Engine deltas: `Terrain += "oracle"`, `HexTile.resource: Yield \| null` (load-bearing — slave income reads `resource.type` via a ruleset coeff, NOT the amount, so `{stone,0}` would leave slaves productive), settle-legality rejects oracle, `maxLevel` on BuildingDefinition, `"promote"` discount target, resourceVisuals re-theme. Free win: riot "downgrade once tiers exist" (tables.ts:260) is already satisfied by the level model — splicing one copy IS the downgrade; only the stale comment needs fixing. **Phase 1.5 + Phase 2 are now both fully specced; run is clear to start.** | 2 |
| 2026-07-15 | main (docs) | **Stop-line REVISED → Phase 2 only** (Q20): Phase 3 leaves the run; Q27–Q29 stayed blank and the rivalry layer is the owner's design, not a default. Owner answered Q13b/Q17/Q19 (all = rec), Q36 (keep ×5), Q24/Q25/Q26 with discussion asks. **Claude's input filed in Q24 + Q25**: gold-mine building ✅ / gold tiles ❌ (rejected variant), 2-slot footprint not exclusivity, zero-yield hills flagged (slaves go inert + stone collapses to 6 mountain tiles) → token-yield table proposed at 24 hill slots (2.67/tile) to actually make hills slot king (draft's 21 didn't); two buildings proposed — **Metallon** (hill-only slave→gold, first terrain-gated building = Phase 2's exit gate) + **Gymnasion** (ladder discount); tier-2 upkeep raised per the PDF's Library. **Awaiting owner verdict on these before the run starts.** | 2 |
