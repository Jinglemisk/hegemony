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

### Q18 · Compendium v1 — contents & entry points — `OPEN`

**Context.** Refit scope 5. What ships in the first compendium, and how it opens.

**Rec:** five sections, all read-only, all data-driven from the ruleset/content
tables so they can never drift from the engine: (1) victory cards with LIVE
standings per player; (2) the four event tables (riot + three expeditions) rendered
by the shared component, no roll button; (3) this board's bank rates + the corridor
explainer; (4) deck composition — seasonal card list with season-weighting notes,
player-deck list (aggregate counts, never draw order); (5) a costs cheat-sheet
(actions, buildings, ladder, calm, stakes). Entry: the season icon, plus the `?`
key. Later phases append sections (politicians, resolutions) instead of new modals.

**Your answer:**

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
