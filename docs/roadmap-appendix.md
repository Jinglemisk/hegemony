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

---

## Phase 0 — "Make it a game" · final specs

### D1 · Victory race — `DONE (feat/phase0-victory-race)`

- **5 public victory cards**, visible from game start. Each reads **"Most X, minimum Y"**
  — held only by the *sole* leader in X who also meets the minimum. Ties, or leading
  below the minimum, leave the card unheld (so a turn-one pop lead holds nothing).
- **Win:** hold any 3 cards **at the start of your own turn** (not mid-turn — the table
  sees you at 3 and gets one round to break a card off you).
- **Draft cards** (minimums are tuning targets for a planned sim campaign):

  | Card | Condition | Minimum |
  | --- | --- | ---: |
  | Polis Builder | most cities | 3 |
  | Demos | most total pops | 16 |
  | Civic Elite | most citizens | 8 |
  | Treasurer | largest banked material stockpile | 80 |
  | Beloved of the People | highest happiness | +10 |

- **Minimums rule (2026-07-12, user):** no card may be holdable at game start or on
  the first turn — every minimum must exceed anything a legal setup plus one lucky
  opening turn can produce (start: 2 cities, 6 pops, ≤6 citizens, 52 banked, 0
  happiness). Raised citizens 6→8, stockpile 40→80, happiness +5→+10 accordingly;
  the tuning campaign refines from here.

- **Failsafe ceiling:** the seasonal deck stops reshuffling (29 cards ≈ 7 years). If it
  empties before anyone wins, most cards held wins; tiebreak highest happiness, then
  most pops. Expected real length ~year 4–5, set by the minimums, not the deck.
- Later spice (not v1): a hidden "omen" condition revealed via the event-table system.
- Replaces the provisional VP tally everywhere (roster, ledger, score.ts).

### D2 · Phase order — `LOCKED`

Economy (Phase 2) before politics (Phase 3). The Resolutions/Politicians design session
happens during Phase 2 so Phase 3 starts specced.

### D3 · Placement & setup pack — `DONE (feat/phase0-victory-race)`

- **Two-city setup** (user call, and it pairs naturally with contiguity): each player
  places their **capital**, then a **second city** — snake order (capitals 0→3, second
  cities 3→0). Both on empty tiles, non-adjacent to any city. **No setup colony** — every
  colony in play was founded by choice. Starting pops: 3 per city (6 total; tune later).
- **Colony contiguity:** gameplay colonies must be within radius 1 of *any* owned
  settlement — colonies chain, so expansion snakes from either city.
- **No capital protection ring** (PDF overruled): contiguity kills the doorstep rush on
  its own. Delete the unenforced ring claim from `rules.md` and the spec. Soft
  border-tension levers can come later via politics if needed.
- **First-player rotation:** the season's opening player advances each new year.
- **Board setting:** "Classic" (current fixed layout) vs "Shuffled" (seeded); landmark
  constraints join the Shuffled option with the Phase 2 terrain rework.
- **Capital privilege ban (2026-07-12, user):** capitals are flattened *by design* —
  a mechanically privileged capital multiplies the value of its tile (the PDF's
  double-yield capital on a food-8 plains = 16 food/turn = the placement lottery
  decides the game). If "capital" ever returns as a rules word (politics targets,
  national ideas), it must be **additive or liability-shaped** — +1 slot, +1 vote,
  blockade/quarantine target — **never a tile-yield multiplier**. The word survives
  only as flavor for the first city.

### D4 · Food-stockpile happiness — `DONE (feat/phase0-victory-race)`

Stockpile-based, capped at +2: `min(floor(food/5), 2)`.

### D5 · Dev preload flag — `DONE (feat/phase0-victory-race)`

Default off; kept as a dev convenience (env flag or `dev` mode entry).
**Extended 2026-07-12 (user request):** the dev default is now an **auto-played opening**
that rotates through 10 premade seeds, one per reload (localStorage cursor) — testing
never starts at "place your capital". `?setup=manual` restores hand placement,
`?seed=N` pins a seed, `?dev=preload` replays the fixed scripted opening. The active
seed shows in the deck tray ("Classic board · #77").

---

## Phase 1 — "Every currency gets a job"

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

### D10 · Ventures — `LOCKED`

"Fund an Expedition": stake **5 gold** or **8 wood**, once per turn. d6: 1–2 stake lost ·
3–4 return 5 gold · 5–6 return 9 gold. ~−7% EV — the self-selecting catch-up casino.
Another event table + an Actions-tab entry.

### D11 · Sim usage — `LOCKED (rec overruled)`

No per-PR sim gate. PR gate = `npm run check` + tests. Sims are an instrument: ad-hoc
spitball tests, planned campaigns (e.g. D1 minimum tuning), and phase-exit checks.

---

## Open questions

### Q12 · The metropolis fork — `DONE (feat/phase0-victory-race, 2026-07-12)`

**Context.** "Metropolis" as flavor on one of two identical cities feels hollow; a real
metropolis+colony setup felt like it conflicted with colony contiguity (clump fear).

**RESOLVED — user picked option 1 (Claude's rec), built same day:** metropolis
(4 pops, first placement, special by structure — no bonus rules, capital-privilege ban
intact) + founding colony (2 pops) on **any coastal tile** or beside the metropolis;
snake order kept. The coastal-leapfrog rule (Q13a) shipped with it: holding any coastal
settlement lets you found colonies on any coastal tile in gameplay. UI: "metropolis" /
"founding colony" copy, legal-tile glow during the colony round. First greedy sim on
the new setup ended at season 20 by an actual race win — the leaner start races harder.

**Options that were on the table:**
1. **Metropolis + founding colony (Claude's rec):** one city + one colony placed
   *anywhere* (setup exception, historically the apoikia pattern — Corinth→Syracuse);
   contiguity applies from turn 1 on. Metropolis is special by *structure* (only city
   at start), no bonus rules — the capital-privilege ban is untouched. Rebalance
   starting pops (e.g. metropolis 4 + colony 2). Restores the first colony→city
   upgrade as an early milestone.
2. **Two cities, designate one** as metropolis (flavor now, politics address later).
3. **Two cities, drop the word** entirely.

**Sim campaign (2026-07-12, 30 games × ~30 seasons per variant, greedy, seeds 9000+):**

| Variant | Boxed-in rate | Avg open frontier | Final tiles/player |
| --- | ---: | ---: | ---: |
| Two-city + contiguity (current) | **0.0%** | ~9 all game | 6.35 |
| Two-city, contiguity OFF | 0.0% | 28→19 | 6.50 (+0.15 paired) |
| Metropolis + *contiguous* colony (clump worst case) | **0.0%** | 6.4–7.8 | 7.12 |

**Findings:** contiguity never boxes anyone in — not one player-turn in 90 games, even
in the clump-start worst case. Expansion is wood-limited, not geometry-limited; deleting
the rule changes final territory by +0.15 tiles. The fork can be decided purely on
identity/economy/feel. Caveats: greedy bots don't play deliberate denial (humans might
wall a rival, though 6–9-wide frontiers make that expensive), and the clump variant
showed a wider seat-win spread (10–37%, n=30 — retest whichever variant wins).

**Your answer:**

### Q13 · Coastal leapfrog + the wood/gold two-birds — `13a LOCKED (build later) · 13b OPEN`

**Context (user, 2026-07-12).** (a) Allow founding colonies on unconnected coastline
tiles once you hold at least one coastal settlement; (b) the contiguity campaign showed
wood is the real expansion bottleneck — can fixing it also fix the useless gold hills?

**Coastal leapfrog — LOCKED 2026-07-12 (user): adopted in principle, implement with
the Q12 setup resolution or at latest with Phase 4 ports.** Implementable now: the island's 18 rim tiles ARE the coastline.
Rule sketch: *own any settlement on a coastal tile → you may found colonies on any
coastal tile; interior colonies still chain.* Preserves contiguity's purpose (the sea is
"connected" — sailing, not teleporting), creates a mid-game "reach the sea" unlock arc,
gives the rim strategic identity before Phase 4 ports (which later upgrade it), and
dovetails with Q12: the metropolis's founding colony could be "any coastal tile" —
historically exact (apoikiai were coastal foundations). Tuning knob: sea-founded
colonies +2 food (voyage provisions).

**Two birds (wood bottleneck × dead gold).** Three layers, compatible:
1. **Already locked:** the D6 gold-mediated market makes gold hills wood-convertible
   (a 4-gold hill ≈ 2 wood/turn at the 2g buy rate). This finding raises D6's priority —
   ship the market early in Phase 1.
2. **Mixed colony pricing (simmed 2026-07-12):** foundColony at **14 wood + 6 gold +
   2 food** vs baseline 20w+2f, 30 games, same seeds: mid-game expansion +32%
   (s17: 6.37 vs 4.81 tiles/player), final +0.85 paired. Gold's dead pile becomes
   expansion fuel — a real gold sink AND wood relief. Knock-on: revolt share tripled
   (5%→18%) — faster expansion outruns the food base; wants Phase 1's civic-calm/riot
   tools alongside it.
3. **Caution:** wood-as-bottleneck is also the designed tempo brake — 70% map
   utilization by game end is healthy. Fix the *feel* in playtest, not every number.

**Terrain-rework interaction:** once the market exists, tile gold = flexible material
income (an AoE gold mine) — re-run this campaign after D6 ships before executing the
Phase 2 gold-tile removal (note added to feat/terrain-economy.md).

**Your answer:**

---

## Decision log

| # | Question | Decision | Date | Folded into |
| --- | --- | --- | --- | --- |
| D1 | Victory model | Race: 5 public "Most X, min Y" cards, sole leader holds, 3 at own turn start → win; seasonal deck = failsafe ceiling (~7 yrs); interim tally skipped | 2026-07-11 | roadmap.md Phase 0; todo.md |
| D2 | Phase order | Economy before politics; Politicians design session during Phase 2 | 2026-07-11 | roadmap.md |
| D3 | Placement & setup | Two-city setup (snake, no setup colony, 3+3 pops); colony contiguity radius 1 (colonies chain); **no** capital ring — delete doc claim; yearly first-player rotation; Classic/Shuffled board setting | 2026-07-11 | roadmap.md Phase 0; rules.md/spec cleanup |
| D4 | Stockpile happiness | Stockpile-based, capped +2 | 2026-07-11 | Phase 0 scope; ledger issue 4 |
| D5 | Preload flag | Default off; dev convenience | 2026-07-11 | Phase 0 scope |
| D6 | Bank exchange | Gold-mediated static market (corridor brackets player pricing); rates PROVISIONAL (3:1 sell / 2g buy) as ruleset tunables; drift deferred to Phase 4 review | 2026-07-11 | Phase 1 scope |
| D7 | Civic calm | 4 inf → +3 hap or 6 gold → +3 hap; shared once/turn limit | 2026-07-11 | Phase 1 scope |
| D8 | Promote/demote | s→f 4f · f→c 4g · c→f 2inf · f→s 3inf −1hap; one move/turn; free demote in riots | 2026-07-11 | Phase 1 scope |
| D9 | Riot table | As specced; event tables = reusable data-driven component | 2026-07-11 | Phase 1 scope; feat/event-tables.md |
| D10 | Ventures | As specced (~−7% EV catch-up casino) | 2026-07-11 | Phase 1 scope |
| D11 | Sim usage | No per-PR gate; ad-hoc + campaigns + phase exits | 2026-07-11 | roadmap.md principle 6 |
| Q12 | Metropolis fork | Metropolis (4 pops) + founding colony (2 pops, any coastal tile or adjacent); snake kept; capital-privilege ban intact | 2026-07-12 | engine + rules.md; Q13a shipped alongside |
| Q13a | Coastal leapfrog | Hold any coastal settlement → found on any coastal tile; interior chains by contiguity | 2026-07-12 | engine + rules.md |

## Execution log

| Date | Branch / commit | What shipped | Phase |
| --- | --- | --- | --- |
| 2026-07-12 | `feat/phase0-victory-race` | **Phase 0 complete (engine + UI + tests).** Victory race (D1: 5 public cards, minimums as ruleset tunables, turn-start win check, finite seasonal deck + exhaustion tally); two-city snake setup, colony contiguity, no capital ring (D3); yearly opener rotation (D3d); Classic/Shuffled boards + ?board/?seed/?dev URL params (D3e/D5); stockpile happiness cap +2 (D4). UI: ledger Victory tab, roster card badges, seasons-left + opener in the top bar, board chip in the deck tray, game-over screen. 108 tests; sim verified: full greedy game ends at season 30 (deck ceiling); 6-game batch win rates 33/33/17/17. **Owed:** victory-minimum tuning sim campaign; playtest the exit gate. |
