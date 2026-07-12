# Feature plan — Event tables (the dice-table component)

Status: **EXECUTING** (`feat/phase1-currencies`, Phase 1). Specs: roadmap-appendix
D9/D10 + Q15/Q16 resolutions (2026-07-12).

## Why a component

The user's hard requirement (D9): dice-and-table is a **reusable, data-driven
component**, not a riot feature. Riot, the three expeditions, and future omen/yearly
tables are all *instances* — adding one is a new data entry, never new engine code or
a new modal. "Decks for economy, dice for drama": the table is where the game rolls
dice, so it must be one well-made thing.

## The three pieces

### 1. Content data — `EventTableDefinition`

Lives with the other content in `src/game/data.ts`. A table is:

```
{
  id, name, flavor,
  rows: [{ roll: 1..6, label, effects: TableEffect[] }],   // exactly 6, one per face
  insurance?: [{ id, label, cost, modifier: +1 }]           // riot only, so far
}
```

`TableEffect` is a small closed vocabulary, each with an explicit fallback where the
happy path can be impossible:

- `losePops { count }` — random via the seeded `removeRandomPops` (the mob chooses)
- `loseResource { resource, amount, popLossIfShort? }` — the bribe pattern
- `destroyBuilding { popLossFallback }` — random owned building, seeded; downgrade
  once building tiers exist (Phase 2); no building → the fallback pops are lost
- `gainResource { resource, amount }`
- `gainPop { pop, foodFallback }` — into a random owned settlement with capacity
  (seeded); no capacity anywhere → the food fallback
- `none`

### 2. Engine seam — `rollOnTable` (src/game/tables.ts)

One function rolls every table in the game:

```
rollOnTable(G, playerID, table, { modifier = 0, popLossMultiplier = 1 })
  → { roll, modified, row }        // also stored on G.lastTableRoll for the UI
```

- d6 via the game's own mulberry32 state (`G.rng`) — deterministic, replayable, sim-safe.
- `modified = clamp(roll + modifier, 1, 6)`; modifier = insurance (+1 each) + tier (−2
  severe). Applies the row's effects in order with the multiplier on `losePops`.
- Logs the roll and every effect through `addLog` — the chronicle narrates the drama.

### 3. Shared UI — `EventTableModal`

One modal renders any definition: the six rows, the pending modifier, insurance
buttons (bought state + costs), a ROLL button, then the landed row highlighted with
the outcome text. Riot mounts it in blocking mode (turn cannot proceed —
`G.pendingRiot`, same pattern as `pendingPlayerEvent`); ventures mount it as a
choose → stake → roll flow from the Actions panel. No table ever gets a bespoke modal.

## Instances shipping in Phase 1

| Table | Trigger | Notes |
| --- | --- | --- |
| Riot (mild ≤ −5 / severe ≤ −10) | start of turn, before income | insurance ×3 (once each, max +3); severe: −2, pops ×2, rebound −4; mild never rebounds |
| Merchant Convoy | venture action | stake 5g/8w · 3–4 → 5g · 5–6 → 9g |
| Grand Embassy | venture action | stake 5g/8w · 3–4 → 3 inf · 5–6 → 6 inf |
| Colonists' Voyage | venture action | stake 5g/8w · 3–4 → 5 food · 5 → 8 food · 6 → +1 freeman +2 food |

All venture EVs sit ≈ −7% in gold-equivalents (bank rates as the unit of account;
civic calm implies 1 influence ≈ 1.5g). One venture per player per turn, any table,
open from turn 1.

## Turn-flow integration (riot only)

`applyUnrestUpkeep` no longer removes pops directly. At a riot threshold it sets
`G.pendingRiot { playerID, tier, boughtInsurance }` and **income is deferred** — the
rulebook removes pops before collection. While pending: only riot moves are legal
(buy insurance / roll), `endTurn` is blocked. `resolveRiot` rolls, applies, rebounds
(severe), clears the pending state, then runs the deferred income + player-event draw.
Demotion is free while your riot is pending (D8 — the mob forces it); the concession
insurance is that free demote plus the +1.

## Later instances (designed elsewhere, land free)

Omen/yearly d20 table (design queue), harvest gambles (opt-in gambles, todo.md ***),
Phase 3 politics tables. The d20 needs only `rows.length` freedom — the component
treats "exactly 6" as data validation, not an engine constant.

## Tests

Determinism (same seed → same roll), clamp bounds, insurance/tier modifiers, pop-loss
doubling, every fallback path (no building, can't pay bribe, no pop capacity),
riot blocking (endTurn illegal while pending), deferred income ordering, venture
once-per-turn throttle, EV spot-check of table data (guards content edits).
