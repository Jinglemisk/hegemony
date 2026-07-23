# Unrest consequences — working doc (`feat/unrest-consequences`)

Gives the `happiness` meter teeth. Keeps happiness as-is (higher = good) and maps the
rulebook's positive "Unrest N" (pp. 7–8) onto **negative happiness −N** — no meter
rename. Before this branch, happiness only dented provisional VP and colored the UI; it
had no gameplay effect.

## What it does

A new start-of-turn **upkeep**, `applyUnrestUpkeep(G, playerId)` (`src/game/unrest.ts`),
runs once per player **before** their income is collected (rulebook: pops are removed
"before any resources are collected"). It is wired into both start-of-turn seams in
`src/game/turn.ts` — `beginGameplayTurn` (opening) and `endTurn` (every later turn) —
right before each `collectIncome`.

Order inside the upkeep:

1. **Timed happiness modifiers** — apply each active modifier's `amountPerTurn` to
   happiness, tick `turnsRemaining` down, drop the expired. First, so an event-driven
   penalty can push a player into a threshold the same turn.
2. **Deadly thresholds** (severe first, mutually exclusive):
   - happiness ≤ **−10** → remove **4** random pops, then set happiness to **−4** (rebound).
   - else happiness ≤ **−5** → remove **2** random pops (no rebound → re-fires each turn
     until happiness climbs back above −5).
3. **Starvation counter** — if net food income ≤ **−2**, increment
   `consecutiveFoodDeficitTurns`; at **2** it removes **1** random pop and resets. A
   non-deficit turn resets it to 0. Skipped while the first-income food grace is active.

**Random** pop removal (`removeRandomPops`) uses the game's **seeded** RNG
(`shuffleWithSeed(G.rng)`), never `Math.random`, so the game stays deterministic and
replayable. It builds one token per existing pop, shuffles, and removes the first N;
removals can leave a settlement at 0 pops — the settlement stays standing.

No **passive drift**: happiness never self-heals toward 0. Recovery comes only from the
−10 rebound and from fixing the underlying causes (fewer slaves / less overcrowding /
more food) — and losing pops shrinks those causes, so collapses bottom out rather than
spiral.

## Timed unrest events

New `EventEffect` variant `timedHappinessDelta { scope, amountPerTurn, turns }`
(`types.ts`). `applyEventEffects` (`events.ts`) pushes a `TimedHappinessModifier` onto
each scoped player; the countdown lives entirely in the upkeep. Two cards use it:
`player-civil-discord` (activePlayer, −2/turn ×3) and `season-plague` (allPlayers,
−2/turn ×3, immediate). The UI formatter (`components/board/events.ts`) renders
"−2 Happiness per turn for 3 turns". **These two cards reuse the fallback card art** —
no bespoke art generated yet.

## UI feedback

Unrest is surfaced in the viewer's **Ledger** (`EmpireIntelPanel`):

- A slim **warning banner** above the ledger tabs whenever the viewer's happiness is
  negative, driven by a shared engine helper `unrestStatus(G, playerId)` (`unrest.ts`)
  so the UI never re-derives thresholds. It escalates: *Discontent* (ochre, happiness
  < 0) → *Unrest* (clay, ≤ −5, "losing 2 pops every turn") → *Revolt* (deeper clay,
  ≤ −10, "losing 4 pops every turn"). A hover tooltip adds food-deficit turns, lingering
  effects, and total deaths. Text runs through `AnnotatedText` for the inline happiness icon.
- The **Pops tab "Deaths" stat** is now wired to a real per-player counter
  (`PlayerState.popsLostToUnrest`, incremented in the upkeep) and turns clay once it
  climbs above 0 (previously a hardcoded `0`). It is paired with a **"Gained"** stat
  (`popsGainedFromEvents`, incremented on the `addPops` event effect) that turns olive
  — this replaced a dead "Event Cards" field (already shown in the deck tray).
- The **Chronicle** already logs each removal / rebound / lingering-unrest tick.

## Tunables

All in `ruleset.economy.unrest` (`ruleset.ts` `UnrestRules`, defaults in
`DEFAULT_RULESET`), so modes can retune: `popLossThreshold −5 / popLossCount 2`,
`severeThreshold −10 / severePopLossCount 4 / severeRebound −4`,
`foodDeficitThreshold −2 / foodDeficitTurnsToStarve 2 / foodDeficitStarvePopLoss 1`.

New per-player state (`PlayerState`, initialized in `state.ts`, deliberately **not**
reset by `resetTurnFlags` so the counter survives the per-round wipe):
`consecutiveFoodDeficitTurns: number`, `timedHappinessModifiers: TimedHappinessModifier[]`.

## Deliberate simplifications (deviations from the rulebook)

- **Food→unrest magnitude.** The existing stockpile-based food-shortage happiness
  pressure is kept as the per-turn "hunger hurts" signal; the new starvation *counter*
  is layered on top for the pop-loss teeth. This avoids double-penalizing and keeps the
  existing income tests green. The rulebook's exact −2/−4/−6 → 1/2/3 per-turn unrest
  numbers are **not** reproduced (future tuning).
- **Random** removal, not the rulebook's player choice of 1 Citizen / 2 Freemen / 4 Slaves.

## Out of scope

Luxury Goods relief (−2 unrest each — needs coastal tiles + a Trader building, a separate
backlog item). Player-choice pop removal. Real end-condition scoring (`score.ts` is
untouched; provisional VP still just subtracts negative happiness).

## Verification

`npm run check` / `lint` (0 errors) / `test:run` (53 pass, incl. 7 new in
`src/game/unrest.test.ts`) / `build` all green. Drove the real engine turn loop
(`endTurn → applyUnrestUpkeep → collectIncome`) with forced negative happiness: severe
tier removed 4 random pops (mixed types) with the Chronicle line
"unrest erupts, costing 1 citizen, 1 freeman, 2 slaves. Happiness settles at −4", then
income adjusted it afterward. Drove Civil Discord through draw → resolve → modifier push,
and confirmed the formatter string. Browser boots on this branch with no console errors.
