# Roadmap Appendix — Questions, Decisions, Execution

The working surface for `docs/roadmap.md`. Questions get filed here before a phase
starts; answers get folded into feat plans and code; the decision log keeps the trail.

## How this works (the loop)

1. **Claude files questions** before starting work on a phase — each with context, a
   recommendation, and a `Your answer:` slot. Status: `OPEN`.
2. **You answer** — inline (mark free-form additions with `***`) or in chat; Claude
   transcribes. Discussion continues in place while a question is open.
3. **Once a question locks**, its block is **pruned to the final spec only** — the
   back-and-forth is dropped, the decision log keeps the one-line history. Status:
   `LOCKED` → `EXECUTING (branch)` → `DONE (merged)`.
4. **New questions get filed** as the next phase approaches.
5. Skim the **Decision log** and **Execution log** to catch up after time away.

> **Phases 0 and 1 are DONE — merged via PR #20 and PR #21 (2026-07-13).** Their
> specs (D1–D11, Q12–Q16) are pruned from this file; the decision log keeps the
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

Gets `docs/feat/ui-refit.md` once Q17–Q19 are answered; build follows that plan.

---

## Open questions

### Q13b · Colony repricing (wood/gold mix) — `OPEN (protocol locked, change not approved)`

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

**Your answer (approve/reject the repricing after your playtest):**

### Q17 · Where does the verb bar live? — `OPEN`

**Context.** The verbs leave the side panel (refit scope 2). Two candidate homes.

**Rec:** a **bottom command bar fused with the resource band** — resources left,
verbs center, End Turn anchored right. Classic RTS grammar (eyes drop from board to
hands), it reclaims the full right column for nothing (the panel disappears
entirely), and the verbs sit next to the resources they spend. The alternative
(strip under the top bar) crowds the events/roster row and separates verbs from
costs. Mock both only if the bottom bar feels wrong in the first build.

**Your answer:**

### Q18 · Compendium v1 — contents & entry points — `ANSWERED BY DEFAULT` (built 2026-07-13)

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

### Q19 · Homes for the Chronicle and the deck tray — `OPEN`

**Context.** "One ledger only" evicts the right panel — the Chronicle (action log)
and DeckShelf (deck counts + board chip) need homes.

**Rec:** deck counts + board/seed chip move into the **top bar** beside the
season dial (the seasonal count already half-lives there as "28 left"). The
Chronicle becomes a **collapsible drawer on the right edge** — a slim tab that
slides over the map when opened, with the latest entry always visible as a
one-line ticker in the bottom command bar. A ledger tab would work too but hides
the live narration entirely, which the chronicle exists to provide.

**Your answer:**


---

## The wholesale-execution battery — Q20–Q35 · `OPEN`

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

### Q20 · Stop-line — how far does the run go? — `OPEN`

**Context.** Phases 4–5 stack undesigned surface (coasts, trade, ideas, multiplayer)
onto foundations no human has playtested. Every phase built past the last playtest
compounds the cost of a morning "this feels wrong."

**Rec:** **build through Phase 3, prep 4–5** — Phases 1.5 → 3 built end-to-end;
Phase 4's feat plans finalized + its sims run; Phase 5 reduced to a design brief.
The morning playtest then ratifies three phases, not five. "Build everything
answered below" is the aggressive alternative — the machinery handles it; the risk
is five phases of compounding on an unratified base.

**Your answer:**

### Q21 · Merge policy for unattended phases — `OPEN`

**Context.** Phases build on each other, so the run needs a rule for what "done"
means overnight. (a) **Stacked branches** — `feat/ui-refit` → `feat/phase2-terrain`
→ …, one PR per phase, all left open; you playtest the stack in the morning and
merge in order. (b) **Self-merge** — each phase merges to main once its Q23
automated gate passes; the morning playtest audits the merged whole, reverts are
the safety valve.

**Rec:** **(a) stacked PRs — nothing merges itself.** Cost: if the playtest changes
Phase 1.5, the stack above it rebases; acceptable. Unreviewed self-merges are how a
bad overnight assumption becomes load-bearing.

**Your answer:**

### Q22 · Decision authority mid-run (the blank-slot rule) — `OPEN`

**Context.** Unforeseen forks WILL surface mid-build — Q14/Q15/Q16 were all filed
mid-phase and answered same-day; overnight there is no same-day.

**Rec:** the **blank-slot rule**: any battery question left unanswered, and any fork
that surfaces mid-run, resolves to Claude's recommendation, executes, and is logged
in the decision log as `PROVISIONAL (overnight)` — plus a morning-report block
prepended to this file listing every provisional call for re-opening. Alternative:
an unanswered fork halts its phase and the run skips to independent work — safer,
but one early blocker can dead-end the whole night.

**Your answer:**

### Q23 · What substitutes for the playtest gates? — `OPEN`

**Context.** The exit gates for 1.5 ("a new player can find any rule reference…")
and 3 ("a runaway leader gets checked in playtest") are human playtests; no
overnight run can pass them.

**Rec:** each phase exits **provisionally** on: `npm run check` + full test suite
green · the phase-exit sim campaign from the roadmap table, saved to `docs/sim/` ·
for UI-heavy phases, a scripted Playwright walkthrough exercising every new surface,
screenshots saved for morning review. The roadmap-table gates remain the ratifying
gates — checked by you at the morning playtest; the execution log marks each phase
`pending ratification` until then.

**Your answer:**

**— Phase 1.5 · the interface refit —** already filed above: Q17 (verb-bar home),
Q18 (compendium contents), Q19 (Chronicle/deck-tray homes), plus Q13b (repricing
verdict). Answer them there, or leave them to the Q22 rule.

**— Phase 2 · the land repriced —**

### Q24 · Gold-tile removal — commit, conditional, or soften? — `OPEN`

**Context.** `docs/feat/terrain-economy.md` removes all tile gold (first-order/
second-order principle). The standing watch item requires re-running the expansion
campaign post-bank first: the D6 market partially rehabilitates gold hills (a 4-gold
hill ≈ 2 flexible materials/turn at the buy rate), and Q13b's counter-watch already
suspects post-bank expansion is too loose.

**Rec:** **conditional commit**: run the campaign first; if hill starts merely level
out, remove gold tiles per the plan; if the report shows the economy leaning hard on
tile gold, fall back to the plan's recorded rejected variant (1–2 "silver mine"
landmark hills at 3–4 gold, the rest converted) and log it provisional.

**Your answer:**

### Q25 · Tier-2 roster & the upgrade grammar — `OPEN`

**Context.** Four buildings exist (marketplace, temple, workshop, granary). todo.md
candidates: Aqueduct (+4 capacity), Forum (+2 influence), Warehouse (+1 tile
material income), Barracks (military placeholder). The pricing grammar is settled
(wood = economic, stone = civic, gold = commerce; food/influence never buy
buildings), and the riot table's roll-1 "building destroyed → downgraded once tiers
exist" needs tiers to mean something.

**Rec:** four **standalone** tier-2 buildings (each takes a slot; tier is a
property — no upgrade-in-place mechanic in v1): **Warehouse** (economic, wood) +1
material income on its tile · **Forum** (civic, stone) +2 influence/turn ·
**Aqueduct** (civic, stone) +4 pop capacity · **Emporion** (commerce, gold)
improves the bank sell rate one step for its owner. Barracks stays parked with
military. Exact costs priced by sim against Phase-1 income curves (grammar fixed,
numbers as ruleset tunables). Riot roll-1 destroys the highest-tier building
present (tier 2 before tier 1).

**Your answer:**

### Q26 · Hill redistribution — ship the draft numbers? — `OPEN`

**Context.** terrain-economy.md drafts the 9 hill rows: acropolis 4-slot landmark,
quarries, terraces — map totals go gold 14→0, stone 20→26, food 44→48, and hills
become the slot king (17→21).

**Rec:** ship the draft table as the starting values (they're ruleset data; sims
tune from there). Sub-forks, all per the plan's leanings: **no founding restriction
on the acropolis** (colony-squatting it is denial-play — interesting; watch it) ·
forest trim (14 → 12–13) deferred until map shuffling lands · the hill art/label
re-theme (`resourceVisuals.ts` still reads hills as gold) ships in the same PR.

**Your answer:**

**— Phase 3 · the rivalry layer —** *(this block IS the Politicians design session
the roadmap requires before Phase 3 can start)*

### Q27 · Assembly cadence, votes, and flow — `OPEN`

**Context.** Archive rules: convenes at fixed intervals, unskippable, 2 resolutions
drawn, yay/nay, simple majority, passed → active in the center. seasons.md leans
first assembly at year 2 (none on the opening spring). Archive votes: 1 base per
player; the PDF's +1 per 10 citizens never binds at prototype pop counts.

**Rec:** assembly every new-year Spring **from year 2** (the `isNewYear` hook in
`core/calendar.ts` is ready-made), resolved before the opener's turn. Votes:
**1 base + 1 per 4 citizens** (the PDF ratio rescaled so citizens are politically
valuable without being crowned), ties FAIL. Two drawn resolutions per assembly;
passed resolutions persist until repealed.

**Your answer:**

### Q28 · Resolution deck v1 — contents & influence verbs — `OPEN`

**Context.** This is influence's primary job (todo.md). Archive influence verbs:
draw / exchange / play-from-hand / propose-repeal / veto.

**Rec:** **12 resolutions as data** (the event-table law applies: content in
`data.ts`, one engine seam, one UI surface), 3 per politician, every effect built
from levers the engine already has (yields, ladder prices, bank rates, colony cost,
calm cost, happiness deltas) — no new mechanics smuggled in on cards. Influence
verbs v1: draw 2 · play-from-hand 3 · veto 5 (once per assembly) · propose-repeal 4;
exchange is cut from v1 (draw covers it).

**Your answer:**

### Q29 · Politicians v1 — how thin is the layer? — `OPEN`

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

### Q30 · Yearly cards / d20 omen table — ride along with Phase 3? — `OPEN`

**Context.** Design-queue item, slot flexible (Phase 1 or 3); Phase 1 shipped
without it. The assembly and the yearly draw share the same new-year hook.

**Rec:** **ride along with Phase 3**: a d20 omen table as another
`EventTableDefinition` (the component's law), drawn each new year right before the
assembly — year-scale weather for the political season. Contents drafted from
seasons.md's yearly-card notes; all effects on existing levers.

**Your answer:**

**— Phase 4 · the wider world —**

### Q31 · Coastal geometry — feature ring or real tiles? — `OPEN`

**Context.** luxury-goods.md proposes lightweight `CoastalTile` records attached to
edge hexes; terrain-economy.md leans "pure feature tiles" (not settleable, no
slots). The 18 rim tiles already serve as the coastline for leapfrog.

**Rec:** **pure feature ring**: 12 coastal features attached to rim edges, never
settleable, no slots — a port in a city adjacent to that edge claims the feature.
Cheapest to build, matches the PDF, keeps naval anything out of scope.

**Your answer:**

### Q32 · Luxury roster, caps, and port pricing — `OPEN`

**Context.** luxury-goods.md as amended by terrain-economy.md: 9 named goods
(6 coastal + 3 via the 100-gold Trader, global Trader cap 3), +2 standing happiness
each (effective-happiness accounting, never banked), diminishing duplicates (second
copy of the same good +1), ~3 active per player, denial left as a seam for
resolutions. Port cost provisional: 20 wood / 5 stone / 10 gold.

**Rec:** approve the amended plan as written, every number a ruleset tunable; port
cost per the provisional. (Luxury art via the banana pipeline — the plan's "ChatGPT
image generation" line is stale.)

**Your answer:**

### Q33 · Player trade v1 — what shape? — `OPEN`

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

### Q34 · National ideas v1 — draft shape & catalog — `OPEN`

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

### Q35 · Mode picker & the multiplayer track — in or out? — `OPEN`

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

## Decision log

| # | Question | Decision | Date | Folded into |
| --- | --- | --- | --- | --- |
| D1 | Victory model | Race: 5 public "Most X, min Y" cards, sole leader holds, 3 at own turn start → win; seasonal deck = failsafe ceiling (~7 yrs); interim tally skipped | 2026-07-11 | roadmap.md Phase 0; todo.md |
| D1b | Victory minimums | Must beat the opening (no card holdable at game start / turn 1): 3 cities / 16 pops / 8 citizens / 80 stockpile / +10 happiness; confirmed by tuning campaign (race wins ~year 4.8; higher minimums kill the race) | 2026-07-12 | ruleset.ts; victory.test.ts regression |
| D2 | Phase order | Economy before politics; Politicians design session during Phase 2 | 2026-07-11 | roadmap.md |
| D3 | Placement & setup | Two-city setup (snake, no setup colony); colony contiguity radius 1 (colonies chain); **no** capital ring; yearly first-player rotation; Classic/Shuffled board setting | 2026-07-11 | roadmap.md Phase 0; rules.md/spec |
| D3b | Capital privilege ban | Capitals flattened by design — if "capital" returns as a rules word it must be additive/liability-shaped (+1 slot, +1 vote, blockade target), **never** a tile-yield multiplier | 2026-07-12 | balance.html; design rule |
| D4 | Stockpile happiness | Stockpile-based, capped +2 | 2026-07-11 | Phase 0 scope; ledger issue 4 |
| D5 | Preload flag | Default off; dev = auto-played openings rotating 10 seeds/reload (`?setup=manual`, `?seed=N`, `?board=`, `?dev=preload`) | 2026-07-11 | Phase 0 scope |
| D6 | Bank exchange | Gold-mediated static market (corridor brackets player pricing); rates PROVISIONAL (3:1 sell / 2g buy) as ruleset tunables; drift deferred to Phase 4 review | 2026-07-11 | Phase 1 scope |
| D7 | Civic calm | 4 inf → +3 hap or 6 gold → +3 hap; shared once/turn limit | 2026-07-11 | Phase 1 scope |
| D8 | Promote/demote | s→f 4f · f→c 4g · c→f 2inf · f→s 3inf −1hap; one move/turn; free demote in riots | 2026-07-11 | Phase 1 scope |
| D9 | Riot table | As specced; event tables = reusable data-driven component | 2026-07-11 | Phase 1 scope; feat/event-tables.md |
| D10 | Ventures | As specced (~−7% EV catch-up casino) | 2026-07-11 | Phase 1 scope |
| D11 | Sim usage | No per-PR gate; ad-hoc + campaigns + phase exits | 2026-07-11 | roadmap.md principle 6 |
| D12 | Phase 1.5 slot | Interface refit lands NOW, before Phase 2 (terrain/tier-2/assembly all add UI surface — build once, not twice); scope: one ledger, verb bar, map-first selection, no native selects, compendium | 2026-07-13 | roadmap.md Phase 1.5; todo.md |
| Q12 | Metropolis fork | Metropolis (4 pops) + founding colony (2 pops, any coastal tile or adjacent); snake kept; capital-privilege ban intact; contiguity campaign: geometry never boxes anyone in (0% / 90 games) | 2026-07-12 | engine + rules.md; Q13a shipped alongside |
| Q13a | Coastal leapfrog | Hold any coastal settlement → found on any coastal tile; interior chains by contiguity | 2026-07-12 | engine + rules.md |
| Q13b | Colony repricing protocol | User: sim first (saved baseline), compare after D6 ships; repricing itself NOT approved | 2026-07-12 | watch items; docs/sim/ |
| Q14 | Bank scope | Materials = wood/stone/food both ways; no trade cap; per-material rates derived once from board tile counts (scarcity classes), static all game; uniform-vs-scarcity default picked by sim A/B; Market tab in right sidebar | 2026-07-12 | D6 spec; Phase 1 build |
| Q15 | Riot digital flow | All 3 insurances buyable (once each, max +3); random pop losses; rows 1–2 swapped — roll 1 = 1 pop + building destroyed (downgrade once tiers exist; no building → 2 pops); mild tier never rebounds | 2026-07-12 | D9 spec; Phase 1 build |
| Q16 | Venture payouts | Three expeditions, player's choice, each own table ~−7% EV: Merchant (gold), Embassy (influence), Colonists (food, +1 freeman on a 6 only); open from turn 1, no prereq | 2026-07-12 | D10 spec; Phase 1 build |

**Standing watch items:** seat-3 win lean (+2.8σ under greedy bots — possible snake
turnaround edge; recheck with stronger bots/humans) · re-run the expansion campaign
after D6 ships, before Phase 2's gold-tile removal · Phase 4 revisits bank-rate drift.

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
