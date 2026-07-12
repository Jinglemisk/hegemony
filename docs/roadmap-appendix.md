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

> **Phase 0 is DONE — merged to main via PR #20 (2026-07-12).** Its specs (D1–D5,
> Q12, Q13a) are pruned from this file; the decision log below keeps the trail, and
> the shipped rules live in `docs/v0.1-rules-spec.md` / `rules.md`. Standing design
> rules that survive Phase 0: **victory minimums must beat the opening** (no card
> holdable at game start — enforced by a regression test) and the **capital-privilege
> ban** (capital may only ever be additive/liability-shaped, never a tile-yield
> multiplier — detailed in `docs/balance.html`).

---

## Phase 1 — "Every currency gets a job" · `EXECUTING (feat/phase1-currencies)`

Build order (locked): **`docs/feat/event-tables.md` first** (the reusable dice-table
component is a hard engineering requirement), then **bank exchange (D6)** — priority
raised by the wood-bottleneck sim finding — then riot table (D9), civic calm (D7),
promote/demote ladder (D8), ventures (D10).

### D6 · Bank exchange — `DONE (feat/phase1-currencies; rates provisional)`

- **Model:** gold-mediated market (Age-of-Empires style) — sell materials for gold, buy
  materials with gold; never direct barter. Gold is the unit of account.
- **Philosophy:** the bank is **static** and *brackets* player pricing — its rates are
  the corridor walls; all player-negotiated trade (Phase 4) happens inside them, priced
  by in-the-moment scarcity. No dynamic price drift in v1; revisit drift in Phase 4 only
  if player trade fails to carry the scarcity feel (watch item).
- **Rates — provisional starting values, expected to move with playtest/sim** (build
  them as ruleset tunables, not constants): sell any material **3:1 → 1 gold** · buy any
  material for **2 gold** (effective material→material 6:1; ports later improve the
  sell side).
- Watch flags for the ledger at ship time: a freeman's +2 gold/turn = 1 flexible
  material/turn (vs slave); gold→food means the rich never starve.
- **Treasurer interaction (checked 2026-07-12):** the stockpile card counts
  wood+stone+gold+food, and both trade directions destroy net value (3→1, 2→1) — so
  every bank trade *shrinks* your Treasurer score. No exploit; a pleasant tension.
- **Q14 resolutions (user + Claude, 2026-07-12):** materials = wood/stone/**food**,
  both directions, influence/happiness never bankable. **No cap** on trades per turn
  (the round-trip spread is the tax). Rates are **per-material and board-derived**
  (user: supply comes from the tile layout): computed once at game creation from the
  board's tile counts — scarcest material sells better and costs more, most abundant
  the reverse, one step off baseline — then **static all game** (the corridor
  philosophy survives; Shuffled boards get their own price texture). Both `uniform`
  and `scarcity` derivations built as ruleset knobs; a sim A/B picks the default.
  UI home: a **Market tab in the right sidebar**, rates always visible.

### D7 · Civic calm actions — `DONE (feat/phase1-currencies)`

One civic-calm action per player per turn (shared limit — calm must not stack), payable
two ways: **Stabilize Province** 4 influence → +3 happiness, or **Bread & Circuses**
6 gold → +3 happiness. One `civicCalm` seam in code with two payment options.

### D8 · Promote / demote ladder — `DONE (feat/phase1-currencies)`

Promote: slave→freeman **4 food** · freeman→citizen **4 gold**. Demote: citizen→freeman
**2 influence** · freeman→slave **3 influence, −1 happiness**. One ladder move per
player per turn, separate from the grow-pop throttle. Demotion is **free during a riot**
(the mob forces it).

### D9 · Riot table & the event-table component — `DONE (feat/phase1-currencies)`

At happiness ≤ −5, start of turn (before income) — pre-roll insurance only, declared
before the die. **All three options may each be bought once per riot (user, 2026-07-12
— the old any-2/max-+2 cap is dropped; max modifier +3):** bread dole 4 food (+1) ·
concession = demote 1 pop free (+1) · patronage 3 influence (+1). Full insurance in a
mild riot makes pop loss impossible (worst case −6 food or −6 gold) — intended: it
converts catastrophe into taxation. The severe tier still reaches pop losses through it.

| Roll | Outcome |
| ---: | --- |
| 1 | Mob torches the works — lose 1 pop; one building destroyed (downgraded once tiers exist; no building → lose 2 pops instead) |
| 2 | Revolt spreads — lose 2 pops |
| 3 | Lose 1 pop |
| 4 | Granary sacked — lose 6 food |
| 5 | Bribe demanded — lose 6 gold (lose 1 pop if you can't pay) |
| 6 | The mob disperses — no loss |

(Rows 1–2 swapped from the draft, user's building-destruction change (2026-07-12):
destruction is worse than 2 pops, so it sits on the 1. Lost pops are chosen at random
— the mob decides, the player's levers are insurance and the free demote.)

Severe tier (≤ −10): roll at −2, pop losses doubled, rebound to −4 unchanged; mild
tier never rebounds (it can re-fire — that is what civic calm is for).

**Engineering requirement (user):** event tables are a reusable **data-driven
component** — `EventTable` definitions in content data, one generic `rollOnTable` engine
seam (seeded RNG), one shared UI modal rendering rows + roll + insurance slots. Riot,
ventures, and future omen/yearly tables are all instances. Gets `docs/feat/event-tables.md`
at Phase 1 start.

**Replaces** the current random pop removal in `src/game/unrest.ts` (thresholds −5/−10,
flat 2/4-pop losses, severe rebound −4) — the thresholds and rebound stay; the flat
losses become the table.

### D10 · Ventures — `DONE (feat/phase1-currencies; payouts widened per user)`

"Fund an Expedition": stake **5 gold** or **8 wood**, one venture per player per turn,
available from turn 1 (no building prerequisite — a catch-up casino must be reachable
by the player who's behind). The player **chooses the expedition**; each is its own
event table at ~−7% EV (the bank's rates give the common unit; civic calm implies
1 influence ≈ 1.5 gold):

- **Merchant Convoy** (the D10 original): 1–2 stake lost · 3–4 return 5 gold ·
  5–6 return 9 gold.
- **Grand Embassy**: 1–2 stake lost · 3–4 return 3 influence · 5–6 return 6 influence.
- **Colonists' Voyage**: 1–2 stake lost · 3–4 return 5 food · 5 return 8 food ·
  6 settlers arrive — +1 freeman in a settlement with room (+2 food alongside).
  Pop payout deliberately rare (a 6 only) — it is a second pop faucet running around
  the grow-pop throttle, so it stays a jackpot, never a strategy.

Phase 4 ports may later improve odds (tunable). Payout resources are thematic per
table; the stake is always gold-or-wood.

### D11 · Sim usage — `LOCKED (rec overruled)`

No per-PR sim gate. PR gate = `npm run check` + tests. Sims are an instrument: ad-hoc
spitball tests, planned campaigns (e.g. D1 minimum tuning), and phase-exit checks.

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
