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
  | Civic Elite | most citizens | 6 |
  | Treasurer | largest banked material stockpile | 40 |
  | Beloved of the People | highest happiness | +5 |

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
- Open ripple (tracked, not blocking): the capital is now one of two starting cities —
  its identity question (balance ledger issue 13) gets sharper.

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

## Execution log

| Date | Branch / commit | What shipped | Phase |
| --- | --- | --- | --- |
| 2026-07-12 | `feat/phase0-victory-race` | **Phase 0 complete (engine + UI + tests).** Victory race (D1: 5 public cards, minimums as ruleset tunables, turn-start win check, finite seasonal deck + exhaustion tally); two-city snake setup, colony contiguity, no capital ring (D3); yearly opener rotation (D3d); Classic/Shuffled boards + ?board/?seed/?dev URL params (D3e/D5); stockpile happiness cap +2 (D4). UI: ledger Victory tab, roster card badges, seasons-left + opener in the top bar, board chip in the deck tray, game-over screen. 108 tests; sim verified: full greedy game ends at season 30 (deck ceiling); 6-game batch win rates 33/33/17/17. **Owed:** victory-minimum tuning sim campaign; playtest the exit gate. |
