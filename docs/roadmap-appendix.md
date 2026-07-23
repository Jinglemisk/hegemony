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

> **Pruned 2026-07-23.** Phases 0–3 are built; their answered specs (the Phase 1.5 block,
> Q13b, Q17–Q29, Q36) are removed from this file so the live questions sit at the top.
> Nothing is lost — they survive where they belong: shipped rules in
> `docs/v0.1-rules-spec.md` / `rules.md`; the Phase 2 terrain + buildings spec in
> `docs/feat/terrain-economy.md`; the Assembly design in
> `docs/feat/assembly-politicians.md` (**Q27–Q29 were resolved by the 2026-07-20 design
> session and the 3-B build**, despite still reading `OPEN` here); the run charter
> (Q20–Q23) in the execution log below; and the full back-and-forth in git history.

---

## Assembly revision — the net-loss fix · `FILED 2026-07-23 · Phase 3.5`

**Why.** The shipped Assembly (2026-07-20 — `docs/feat/assembly-politicians.md`,
`src/game/assembly/`) has a measured problem: **engaging the agora is a net loss** — a
political seat scores ~21% against a smart economic seat's ~26%, so there is no reason to
play the resolution game. A design review (2026-07-23) test-drove a radical rework
(players *become* the politicians, one mixed Catan-style deck, VP for any resolution
passed) and **rejected** most of it: it would gut the four ideology decks, the stele-stack
visualization and the Stratokles antagonist, and "VP = passed" invites logrolling.

**What ships instead — a targeted revision that preserves the shipped skeleton:** annual
spring cadence (`isNewYear`), the async proposal round + sequential ballot, the
draw-from-a-chosen-politician fishing sink and the influence verbs
(draw/redraw/repeal/bribe/veto), the standing-modifier engine layer (`laws.ts`) with its
~6 law cap + replace-at-cap, the panel/bema/colonnade surface, and the four ideology decks
with their standing trade-off Laws. **Four things change:**

1. **Political VP: board-derived flip → permanent global ratchet.** A persistent
   per-player counter of resolutions **authored and passed**, summed across all four
   politicians (2 Perdiccas + 1 Demosthenes = **3**, not two separate title races).
   Repeal or replace-at-cap does **not** decrement it. *Voice of the Assembly* is held by
   the single highest counter, and you take it only by **strictly exceeding** the holder —
   Catan Largest-Army semantics, so the bar ratchets.
   - ⚠ **Deliberate divergence:** this breaks §1.6's *"the board is the scoreboard, no
     hidden counters"* invariant. The stele stack still shows **standing effects**
     (capped); **VP now comes from the permanent counter.** `power.ts` moves from a pure
     board computation to maintaining/reading a tally on state; `victory.ts`
     `victoryStandings` + the Voice card change from "patron of most politicians" to
     "highest global counter."

2. **One-time author prize on enactment — this is the net-loss fix.** At enactment the
   author receives a one-time bonus keyed to the **politician** (not the specific card) —
   e.g. Demosthenes → **+5 food** — *on top of* the Law's standing effect. Laws still
   plant their standing effect and run until repealed (unchanged).
   - **Hard constraint: a prize must never be citizens.** A free citizen feeds a
     votes → more laws → more citizens snowball that compounds with the ratchet.
     Food / wood / stone / influence / happiness are safe. Every amount is a
     `Ruleset.assembly` dial.
   - Touch-points: a prize field on the politician definition (`deck.ts` / `types.ts`),
     the payout in `assembly.ts` enactment, the dials in `ruleset.ts`.

3. **Delete the Stratokles coup** (owner: "a buzzkill"). Remove the coup-win entirely,
   its Victory-ledger threat row, and the `coupThreshold` dial. Stratokles becomes an
   ordinary politician in the ratchet — his Directives count **+1 each** toward the global
   counter, consistent with how tally monuments already accrue. The comeback function the
   coup served is now carried by chaos hurting the leader most, plus Directives giving a
   trailing player a Voice path.
   - Touch-points: coup logic in `power.ts`; the threat row in the Victory ledger
     component; remove `coupThreshold`.

4. **Player-directed Stratokles targeting (the robber).** The acting/author player points
   a Stratokles effect at a **victim of their choice** ("steal a pop from Jim").
   - ⚠ **This reverses a standing owner ruling.** §1.8 (2026-07-20) reads *"he targets no
     one"* — all single-player targeting was removed and Directives made table-wide only.
     Confirm the reversal explicitly rather than letting it slide in. Formula-auto-targeting
     ("whoever has the most X") stays **rejected**. Hits stay painful but never crippling
     (lose a pop, never lose the game). Optional self-limiter: "steal from the target's
     largest settlement."
   - Touch-points: `DirectiveEffect` vocabulary (`types.ts`) gains target selection;
     `deck.ts` effect defs; a target-picker in the bema; resolution in `assembly.ts`.

**Knock-on — sequence this first.** The Phase 3-C `political` bot and every Assembly sim
reading on record were built against the *shipped* rules (board-derived power, the coup).
Both are invalidated by this revision, so the rework lands **before** the bot re-teach and
before any Assembly campaign is re-run.

### P3.5 · Q37 · Does the per-politician patron standing buff survive? — `OPEN`

With the one-time author prize as the personal reward and the four patron races collapsed
into one global counter, the shipped per-politician patron buff (Demosthenes' patron gets
+1 food income, etc.) may now be redundant.

**Rec (the review's lean):** replaced by the prize — but genuinely undecided. Keeping both
risks double-paying the same behaviour; keeping only the buff loses the one-time hit that
fixes the net loss.

**Your answer:** only keep one time gains from getting those resolutions passsed.

### P3.5 · Q38 · The prize table — `OPEN`

Only Demosthenes is set (**+5 food**). Perdiccas / Kleistophenes / Stratokles prizes are
owed.

**Rec:** keep every prize **off citizens** (the snowball constraint above); theme each to
its politician; all are `Ruleset.assembly` dials so the sim can tune them.

**Your answer:** Yes and your task is also to find buffs appropiate for them in line with the rest of the game balancing. 

### P3.5 · Q39 · Voice tie-break & minimum-to-hold under the ratchet — `OPEN`

Strict-exceed handles ties. Two things to confirm: the Catan rule — **first to reach holds
until strictly beaten** — and whether a **minimum threshold** applies before the card can
be held at all (every other victory card carries a minimum, and "victory minimums must beat
the opening" is a standing design rule).

**Your answer:** minimum + takeover after strictly beaten so both

### P3.5 · Q40 · Which Stratokles effects are table-wide vs player-directed? — `OPEN`

Decide per-Directive, plus the targeting UI in the bema.

**Rec:** keep the assembly-disrupting Directives table-wide (they are weather, not
attacks); make the *theft*-flavoured ones directed — the "steal a pop" effect is the
natural carrier for the robber.

**Your answer:** all stratokles cards are specific player affecting

### P3.5 · Q41 · Runaway check after deleting the coup — `OPEN`

Confirm that removing the coup leaves an adequate brake on a runaway leader. The review
argues chaos-hurts-the-leader-most plus a trailing player's Voice path suffices.

**Rec:** accept provisionally, then **validate in sim once the bot understands the revised
rules** — make this a Phase 3.5 exit check rather than a design assumption. The coup was
the explicit leader-check; deleting it without a measured replacement is the one place this
revision could quietly break the game.

**Your answer:** i dont wnat a buzzkill stratkooles coup schtick remove it. 

### P3.5 · Q42 · Do Directives register on the permanent counter? — `OPEN`

They plant no standing Law, so it is ambiguous.

**Rec: yes, +1 each** — consistent with how tally monuments already accrue, and it is what
gives a trailing player the Voice path that replaces the coup. Filed only to make it
explicit rather than implicit.

**Your answer:** yeah

---

## Open questions — awaiting your verdict

**Carry-over verdicts still owed** (not questions, but unresolved and easy to lose in the
prune): **cities 3→2** victory minimum — rec filed 2026-07-13
(`docs/sim/2026-07-13-victory-minimums.md`), but re-run it against the fixed bot before
ratifying · the **yearly omen numbers** — PROVISIONAL, awaiting your eyes, not the sim ·
**Q13b colony price** — held at 20w+2f, and you asked for it back on the table in a future
balance talk (see Standing watch items).
### P3 · Q30 · Yearly cards / d20 omen table — ride along with Phase 3? — `OPEN`

**Context.** Design-queue item, slot flexible (Phase 1 or 3); Phase 1 shipped
without it. The assembly and the yearly draw share the same new-year hook.

**Rec:** **ride along with Phase 3**: a d20 omen table as another
`EventTableDefinition` (the component's law), drawn each new year right before the
assembly — year-scale weather for the political season. Contents drafted from
seasons.md's yearly-card notes; all effects on existing levers.

**Your answer:**

**— Phase 4 · the wider world —**

### P4 · Q31 · Coastal geometry — feature ring or real tiles? — **MOVED**
### P4 · Q32 · Luxury roster, caps, and port pricing — **MOVED**

Both moved verbatim into **`docs/feat/luxury-goods.md` §7** (2026-07-23), which is now the
one-stop shop for luxury mechanics — the plan, the amendments folded in from
terrain-economy.md §6, and every open luxury decision in one place. Answer them there.
That reconciliation also raised **Q43–Q49** (the happiness model, the Beloved card,
duplicates/caps, Trader pricing, the Port's terrain gate, the denial seam, tradability),
all filed in the same section.

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
| 2026-07-15 | **PR #23 → main** | **Phase 1.5 + Phase 2 specs merged**, plus ladder rung **R1** (ModalShell — all 10 hand-rolled backdrops onto one shell, none of which handled Escape; `activeModal` union replacing 8 dialog booleans). | 1.5 |
| 2026-07-15 | `feat/ui-refit` | **Ladder R2–R7 built + pushed** (autopilot run; each rung its own commit, each driven in a browser). **R2** one `ResourceChips` replaces SIX chip copies (audit said 4 — two more were inline in the Calm/Venture verbs; they had drifted, one filtering `>0` and another `!==0`). **R3** verbs become data (`VERBS` + `CommandVerb`) — Q17's bottom-bar move is now a layout change, not a rewrite. **R4** `GameUiContext` — the 5 ledger tabs each re-declared `G/playerID/phase/isActive`; riot + pending-event now derive their own owner instead of the parent computing it. **R5** `PopulationModals.tsx` (699 lines) DELETED → 4 dialogs + promoted `PopulationStepper`/`PlacementModalShell`; found THREE `capitalize` shadows, not the one audited. **R6** HexMap 632→211 lines (`ui/hexGeometry.ts` + `useMapCamera` + `TileGroup`); geometry is now unit-tested. **R7** — see the bug below. **183 tests** (was 158). | 1.5 |
| 2026-07-15 | `feat/ui-refit` | **R7 found a REAL shipped bug.** `popIncome(..., ruleset = DEFAULT_RULESET)` had a default; the engine always passed `G.ruleset`, the UI never did — so under a patched ruleset (which `deriveRuleset`+`createInitialState` supports and every sim campaign uses) **the UI showed 2 gold per freeman while the engine paid 4**. Proved empirically before fixing. The UI's copies were also *incomplete*, not just drifting: they summed per-settlement pop maths only, so they never showed food-shortage happiness pressure — the Grow button was under-reporting the cost of growing into a famine. Fixed by `previewGrowPopIncomeDelta`/`previewBuildingIncomeDelta` in the engine (they answer even when unaffordable, which is why the UI copies existed); both `ruleset` defaults removed so omitting one is now a type error. `ACTION_COSTS` fallbacks also fixed — they ignored both ruleset patches AND the season/discount adjustments. | 1.5 |
| 2026-07-15 | `feat/ui-refit` | **REGRESSION I caused + fixed (ef4b66a):** R6 transposed the hex layout (pointy-top outline given flat-top spacing → every tile overlapped ~13%) and dropped the foam radius's `+3`. Owner caught it by LOOKING at the board; my DOM checks passed because 37 tiles and 42 edges did render — just in the wrong places. Note the obvious guard does not work: both layouts space centres √3·size apart (same tiling, rotated 90°), so a distance check goes green against the bug. `hexCenter`/`SHORELINE_RADIUS` moved into the tested module with tests measuring the layout against the OUTLINE'S OWN bbox. **Lesson: when a rung MOVES code, move it verbatim and diff — never retype; and screenshot anything visual.** | 1.5 |
| 2026-07-15 | main (docs) | **PHASE 2 SPEC LOCKED** (Q24/Q25/Q26 all answered). Terrain: hills 9→5 zero-yield slot-king (3.20/tile) + 1 unsettleable **Oracle** terrain; +2 mountain / +1 forest; tile gold → 0; 37 tiles / 65 slots; ordering forest 1.20 < mountain 1.38 < plains 2.50 < hill 3.20. Buildings: **Villa + Gymnasion**, no upkeep, **no player-facing "tier" concept** (roadmap label only), **`maxLevel` caps every stack** (owner: "they cant scale forever" — also fixes the live uncapped-flat-stacker vector in main). Engine deltas: `Terrain += "oracle"`, `HexTile.resource: Yield \| null` (load-bearing — slave income reads `resource.type` via a ruleset coeff, NOT the amount, so `{stone,0}` would leave slaves productive), settle-legality rejects oracle, `maxLevel` on BuildingDefinition, `"promote"` discount target, resourceVisuals re-theme. Free win: riot "downgrade once tiers exist" (tables.ts:260) is already satisfied by the level model — splicing one copy IS the downgrade; only the stale comment needs fixing. **Phase 1.5 + Phase 2 are now both fully specced; run is clear to start.** | 2 |
| 2026-07-15 | main (docs) | **Stop-line REVISED → Phase 2 only** (Q20): Phase 3 leaves the run; Q27–Q29 stayed blank and the rivalry layer is the owner's design, not a default. Owner answered Q13b/Q17/Q19 (all = rec), Q36 (keep ×5), Q24/Q25/Q26 with discussion asks. **Claude's input filed in Q24 + Q25**: gold-mine building ✅ / gold tiles ❌ (rejected variant), 2-slot footprint not exclusivity, zero-yield hills flagged (slaves go inert + stone collapses to 6 mountain tiles) → token-yield table proposed at 24 hill slots (2.67/tile) to actually make hills slot king (draft's 21 didn't); two buildings proposed — **Metallon** (hill-only slave→gold, first terrain-gated building = Phase 2's exit gate) + **Gymnasion** (ladder discount); tier-2 upkeep raised per the PDF's Library. **Awaiting owner verdict on these before the run starts.** | 2 |
| 2026-07-18 | `feat/phase2-terrain` | **PHASE 2 BUILT (autonomous run).** New TERRAIN_DECK verified against the locked aggregates (forest 15/18/36w · mountain 8/11/26s · plains 8/20/44f · hill 5/16/none · oracle 1/0); tile gold = 0; classic board authored fair by hand (two-stone / two-food capitals, landmarks pairwise non-adjacent). `HexTile.resource: Yield \| null` threaded through income/settlement/bank + every UI consumer; slaves inert on yield-less tiles (tested). **Oracle relocated (0,0)→(0,1)** — the exact centre is the generic settleable tile in 40+ existing tests, and the old centre was already a hill; the 4-slot hill takes the centre. Oracle rejected by all placement paths + enumeration. **Villa** (`tilePrimaryResourceBonus`, +2/level — sim-tuned up from spec sketch +1) + **Gymnasion** (`promoteCostReduction`, −2 in-settlement; implemented as a building effect, NOT the spec's `ActionCostDiscountTarget` route — promote costs don't flow through that path, and no event uses it). **`maxLevel` on every BuildingDefinition**, enforced in getBuildBuildingStatus. Riot downgrade comment corrected. UI: hills → bare ochre-clay, oracle → marble hole + omphalos. **199 tests (was 189), tsc + lint clean, browser-verified** (37 tiles right counts/fills, build menu shows both new buildings, 0 console errors). Sim (docs/sim/2026-07-18-phase2-terrain.json): no crashes, caps binding, unrest calm 92%; greedy under-builds Villa (values wood/stone at material/10) and never promotes → Gymnasion un-exercised — both need a human read. **Owner decisions taken in his absence flagged for sign-off; see summary.** | 2 |
| 2026-07-18 | **PR #25 → main** | **PHASE 2 MERGED.** Bundled the terrain rework + Villa/Gymnasion + `maxLevel` + **anti-proportional yield↔slots** (owner call — rich tiles cramped, poor tiles roomy: breadbasket food-10 → 2 slots, quarry stone-6 → 1; correlation negative per terrain; totals unchanged) + **board shuffles by default** + map recolor (forests timber-brown, plains field-green) + a **dev live balance-tuning panel** (`src/dev/`, dev-gated) with a `content.ts` override seam. Owner sign-offs on the in-absence calls happened at merge. | 2 |
| 2026-07-18 | **PR #26 → main-pending** | **`--policy smart` bot built** (feat/smart-bot): slot/promotion-aware, same one-ply search as greedy but tier-weighted pops + role-weighted materials + slot/Gymnasion pricing. **Deep greedy-vs-smart A/B (docs/sim/2026-07-18-greedy-vs-smart.md, 100 games each):** smart exercises Phase 2 (citizens 0.5%→42%, gymnasion 0→1.54/g, promotions 2.3→15.9, influence 10→52) but **LOSES the race** to colony sprawl (fewer/slower cards, ~2× unrest deaths — over-promotes past its food/happiness). Root cause: **influence has no sink until the Assembly exists.** Also surfaced: **neither bot upgrades colony→city** (dead path). | 2 |
| 2026-07-18 | `feat/two-panel` | **OWNER ORDERING for Phase 3 (decision):** (A) **two-panel UI FIRST** — building the pull-forward pieces now (rail split / route model / responsive uniform-scale; deep-links + dossier wait). (B) **Assembly / resolutions / Politicians NEXT**, but only after the owner's design session (Q27–Q29) + a hand-playtest — it's Influence's missing sink, which is *why* the smart bot's citizen line loses. (C) **influence-aware AI LAST**, deferred until (B) is built + playtested (tuning it now is premature — nothing to spend influence on). Balance watch logged: colony→city upgrade path is dead. | 3 |
| 2026-07-19 | **PRs #25/#26/#27 → main** | **ALL MERGED** by owner: Phase 2 (#25), smart bot (#26), two-panel UI pull-forward pieces (#27 — rail split + route model + uniform-scale). Main is the two-panel foundation. | 2–3 |
| 2026-07-19 | `feat/consult-polish` | **Consult-side polish batch (owner, pre-Assembly):** (1) **Chronicle filters** — filter the log by acting player (color chips + per-line colour accent; actor derived UI-side from the leading name, since LogEntry has no playerID). (2) **Codex drops the live Victory section** — Victory has its own consult tab; the codex is rules reference, so it no longer embeds VictoryTab (sections = Dice Tables/Bank/Decks/Costs). (3) **Panels extend downward** — reserve only the dock spine (not the centred verb discs) at the bottom, balancing top/bottom air. Browser-verified, 199 tests. **Also wrote `docs/feat/codex-rules.md`** — the plan to grow the Codex into the whole in-game rulebook (renders FROM the ruleset, folds the 4 current sections under a narrative head, victory-qua-rule returns, deep-link destinations for two-panel piece 4, eventual rules.md generator). | 3 |
| 2026-07-19 | `feat/consult-polish` | **Codex navigation + painted deck faces (owner follow-up, same branch):** the codex header now has TWO tiers — the section chips, then a **sticky sub-entry jump strip** for the active section, with a **scroll-spy** that lights the heading you're reading (pins the last entry at the bottom, where a short final section can't reach the top; a click holds its target lit through the smooth scroll). Chosen over codex-rules.md's originally-sketched *left-hand* index because the consult panel is only ~240–290px wide — a side index would starve the content. The **Decks section now renders the cards' painted faces** (`assets/event-cards/*.webp`) two-up — art + stack badge + name + season tags + effect — replacing the text-only rows; kept two-up even at the narrowest ui-scale. Nav entries + card data both derive from the same content arrays the body maps, so the outline can't list an entry the body doesn't show. Browser-verified across 1024–1440px, 199 tests, tsc + lint clean, 0 console errors. | 3 |
