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

### D6 · Bank exchange — `LOCKED (rates provisional)`

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

### D7 · Civic calm actions — `LOCKED`

One civic-calm action per player per turn (shared limit — calm must not stack), payable
two ways: **Stabilize Province** 4 influence → +3 happiness, or **Bread & Circuses**
6 gold → +3 happiness. One `civicCalm` seam in code with two payment options.

### D8 · Promote / demote ladder — `LOCKED`

Promote: slave→freeman **4 food** · freeman→citizen **4 gold**. Demote: citizen→freeman
**2 influence** · freeman→slave **3 influence, −1 happiness**. One ladder move per
player per turn, separate from the grow-pop throttle. Demotion is **free during a riot**
(the mob forces it).

### D9 · Riot table & the event-table component — `LOCKED`

At happiness ≤ −5, start of turn — pre-roll insurance only (declared before the die,
max +2 total): bread dole 4 food (+1) · concession = demote 1 pop free (+1) · patronage
3 influence (+1).

| Roll | Outcome |
| ---: | --- |
| 1 | Revolt spreads — lose 2 pops |
| 2 | Lose 1 pop; one building shuttered next turn |
| 3 | Lose 1 pop |
| 4 | Granary sacked — lose 6 food |
| 5 | Bribe demanded — lose 6 gold (lose 1 pop if you can't pay) |
| 6 | The mob disperses — no loss |

Severe tier (≤ −10): roll at −2, pop losses doubled, rebound to −4 unchanged.

**Engineering requirement (user):** event tables are a reusable **data-driven
component** — `EventTable` definitions in content data, one generic `rollOnTable` engine
seam (seeded RNG), one shared UI modal rendering rows + roll + insurance slots. Riot,
ventures, and future omen/yearly tables are all instances. Gets `docs/feat/event-tables.md`
at Phase 1 start.

**Replaces** the current random pop removal in `src/game/unrest.ts` (thresholds −5/−10,
flat 2/4-pop losses, severe rebound −4) — the thresholds and rebound stay; the flat
losses become the table.

### D10 · Ventures — `LOCKED`

"Fund an Expedition": stake **5 gold** or **8 wood**, once per turn. d6: 1–2 stake lost ·
3–4 return 5 gold · 5–6 return 9 gold. ~−7% EV — the self-selecting catch-up casino.
Another event table + an Actions-tab entry.

### D11 · Sim usage — `LOCKED (rec overruled)`

No per-PR sim gate. PR gate = `npm run check` + tests. Sims are an instrument: ad-hoc
spitball tests, planned campaigns (e.g. D1 minimum tuning), and phase-exit checks.

---

## Open questions

### Q13b · Colony repricing (wood/gold mix) — `OPEN (awaiting your playtest read)`

**Context.** The contiguity campaign showed wood, not geometry, is the expansion
bottleneck. Simmed (2026-07-12): foundColony at **14 wood + 6 gold + 2 food** vs
baseline 20w+2f, 30 games, same seeds — mid-game expansion **+32%** (s17: 6.37 vs 4.81
tiles/player), final +0.85 paired. Gold's dead pile becomes expansion fuel — a real
gold sink AND wood relief. Knock-on: **revolt share tripled** (5%→18%) — faster
expansion outruns the food base; wants Phase 1's civic-calm/riot tools alongside it.
Caution: wood-as-bottleneck is also the designed tempo brake — 70% map utilization by
game end is healthy. Fix the *feel* in playtest, not every number.

**Recommendation:** hold at 20w+2f until you've playtested merged Phase 0 AND the D6
bank has shipped (the bank alone already converts dead gold into wood at 2g/wood —
that may be all the relief expansion needs). Re-run the expansion campaign after D6;
reprice only if the sim still shows the wood wall *and* your playtest feels cramped.
Same trigger re-opens the Phase 2 gold-tile-removal check (noted in
`feat/terrain-economy.md`).

**Your answer:**

### Q14 · Bank exchange — scope details — `OPEN`

**Context.** D6 locks the model and rates; three small holes to close before building.

1. **What counts as a "material"?** Wood, stone, and **food**, both directions?
   Gold→food is the "rich never starve" flag — already accepted as intended (it's a
   gold sink and a starvation escape hatch priced at 2g/food). Influence and happiness
   stay off the bank entirely (they're civic, not commodities — D7 is where influence
   buys calm).
   **Rec:** yes — wood/stone/food, both directions, one uniform rate. Uniform keeps
   the corridor readable; ports and the Phase 2 terrain rework can differentiate later.
2. **Throughput** — unlimited exchanges per turn, or a cap?
   **Rec:** unlimited. The 6:1 round-trip spread is already the tax, and every trade
   shrinks your Treasurer stockpile — friction is built in. A cap is bookkeeping
   without a proven problem; watch sims for degenerate turns instead.
3. **UI home?**
   **Rec:** a "Market" verb in the Actions tab opening a compact exchange row (pick
   material, sell 3→1g / buy 2g→1, repeatable) — flat, no modal ceremony, rates always
   visible so the corridor teaches itself.

**Your answer:**

### Q15 · Riot flow — digital-table details — `OPEN`

**Context.** D9 locks the table, insurance menu, and tiers. The engine currently fires
unrest at start of turn *before* income (`applyUnrestUpkeep`); the riot roll replaces
the flat pop loss in that same slot. Remaining calls:

1. **Insurance stacking** — spec says "max +2 total", each option gives +1.
   **Rec:** each option purchasable once per riot, any two of the three (dole +
   concession + patronage capped at +2). The concession's free demote uses the D8
   riot-demote rule.
2. **Who picks the lost pops?** Roll outcomes say "lose N pops".
   **Rec:** random via the existing seeded `removeRandomPops` — the mob chooses, not
   the player; the player's lever is insurance and the free demote. Keeps riots scary.
3. **Roll 2's "building shuttered next turn"** — which building?
   **Rec:** random owned building (seeded); shuttered = yields nothing on your next
   turn. If the player owns no buildings, the roll downgrades to roll 3 (lose 1 pop
   only).
4. **Mild-tier rebound** — currently only severe unrest rebounds happiness (to −4);
   the mild tier leaves happiness where it sits.
   **Rec:** keep exactly that. A mild riot that doesn't move happiness means it can
   re-fire next turn — that's the pressure that makes D7's civic calm worth paying for.

**Your answer:**

### Q16 · Ventures — availability — `OPEN`

**Context.** D10 locks stake/payout. One call: gated or open?

**Rec:** available to everyone from turn 1, no building prerequisite — the catch-up
casino only works if the player who's behind can always reach it. A Phase 4 port can
later improve the odds (tunable), which also gives the coast one more identity hook.
Payout is always gold regardless of which stake (5g or 8w) was posted.

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
| Q12 | Metropolis fork | Metropolis (4 pops) + founding colony (2 pops, any coastal tile or adjacent); snake kept; capital-privilege ban intact; contiguity campaign: geometry never boxes anyone in (0% / 90 games) | 2026-07-12 | engine + rules.md; Q13a shipped alongside |
| Q13a | Coastal leapfrog | Hold any coastal settlement → found on any coastal tile; interior chains by contiguity | 2026-07-12 | engine + rules.md |

**Standing watch items:** seat-3 win lean (+2.8σ under greedy bots — possible snake
turnaround edge; recheck with stronger bots/humans) · re-run the expansion campaign
after D6 ships, before Phase 2's gold-tile removal · Phase 4 revisits bank-rate drift.

## Execution log

| Date | Branch / commit | What shipped | Phase |
| --- | --- | --- | --- |
| 2026-07-12 | **PR #20 → main** | **Phase 0 merged.** Victory race (5 public cards, tunable minimums, turn-start win check, finite seasonal deck + exhaustion tally); metropolis (4 pops) + coastal founding colony (2 pops) snake setup; colony contiguity + coastal leapfrog; yearly opener rotation; Classic/Shuffled boards + URL params; stockpile-happiness cap +2; full UI (Victory tab, roster badges, seasons-left, board chip, game-over screen); dev auto-openings rotating 10 seeds; sim-CLI telemetry (victoryCards, frontierTiles). 109 tests. Campaigns: contiguity A/B (geometry never binds), minimum tuning (race wins land ~year 4.8), mixed colony pricing (Q13b data). | 0 |
| 2026-07-12 | `feat/phase1-currencies` | Branch opened; appendix pruned to Phase 1; Q14–Q16 filed. | 1 |
