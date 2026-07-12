# Bot Players — How the AI Works

Status: **sim-grade bots**, built for balance batches and headless testing — not
yet game AI. This doc records how they work and the path to real CPU opponents
with difficulty settings, so that work starts from a map instead of an
excavation. (Deliberately parked for now; see todo.md → Tooling.)

## Architecture

Everything an AI needs is behind one seam, and any future CPU player should
drive the same one:

- **`src/game/legalMoves.ts`** — `enumerateLegalMoves(G, player)` returns typed
  move descriptors (validated by the engine's own `status.ts` predicates);
  `applyMove(G, player, move)` dispatches to the real mutators. A bot never
  constructs moves by hand and never re-derives rules.
- **`src/sim/policies.ts`** — the brain. `Policy = { name, choose(G, moves, rng) }`:
  given the state and the legal moves, return one. That interface is the whole
  contract; new AIs are new entries in the `POLICIES` registry.
- **`src/sim/runner.ts`** — the body. `playTurn` loops choose→apply until the
  turn ends (action cap of 30 force-ends stuck turns); `runGame` wires setup +
  turns + hooks. The runner, CLI (`auto`/`batch`), and tests all share it.

### Determinism contract

Policies must be pure functions of `(G, moves, rng)`. No `Math.random`, no
`Date`, no hidden state. All randomness comes from the injected `SimRng` — a
mulberry32 stream separate from the game's deck RNG, so changing a policy never
changes which cards come up. Tie-breaks follow enumeration order. This is what
makes batches byte-reproducible and games replayable; keep it true for CPU
players too (seed their rng from the game seed).

## Current policies

**`random`** — two-stage uniform: pick among the distinct move *types* present,
then uniformly within that type. Grouping keeps huge move families (movePops,
foundColony) from swamping the draw and gives endTurn ~1/k odds per action, so
turns always terminate. Use: chaos monkey, smoke tests, cheap batch noise.

**`greedy`** — one-ply lookahead: for each candidate move, `structuredClone`
the state, apply the move, score the result, keep the best; end the turn when
nothing scores above the status quo. Forced situations (pending event) pick the
best-scoring resolution.

### The evaluation function (the part worth tuning)

```
score = 10 · VP(resources projected INCOME_HORIZON turns ahead)
      +  2 · projectedHappiness
      +  1 · influence          (INCOME_HORIZON = 6)
```

The projection adds `calculateIncome(G, player) × horizon` onto the player's
resources and re-reads `playerStandings` — the engine's own formulas — so the
score automatically sees food-shortage pressure, the stockpile happiness bonus,
building income, and seasonal modifiers without duplicating any of them.
Happiness is weighted beyond VP's own penalty because the unrest thresholds
(−5/−10) delete pops nonlinearly, which a VP-linear score can't see.

**Why the horizon exists** (empirical, seeds 100–109, 10×24-turn batches):
the pre-horizon score (`10·VP + 0.5·materialIncome + 2·happiness`) priced
spending at ~10× and future income at 0.5×, so bots built 4 buildings in 10
games (zero granaries, zero temples) and rode a food/happiness death spiral:
mean happiness −5.4 by season 7, half the seats in unrest/revolt, 102 pops
dead. With the horizon: 123 buildings, happiness +19, 80% calm, half the
deaths, *higher* final VP. Same seeds — only the scoring changed. Moral: the
spiral was bot myopia, and evaluation quality is the difference between a
batch that measures the game and one that measures the bot.

## Known limitations (read before trusting a batch)

- **One-ply**: cannot sequence plans ("save two turns of stone, then upgrade").
  Anything needing a multi-move setup is undervalued.
- **No spatial strategy**: colony/movePops targets are scored only by immediate
  economics, not position, denial, or future city sites.
- **No opponent model**: bots never consider the other three players.
- **Overshoot risk**: the happiness × horizon weight makes temples very
  attractive (11/game in the post-fix batch). That surfaced a *real* balance
  question (temples stack linearly at 6 stone — flagged in todo.md), but
  remember the bot exaggerates whatever the score loves.
- `choose()` costs ~candidates × `structuredClone(G)` per action. Fine headless;
  budget it before running inside the UI thread.

## Path to CPU opponents with difficulty settings

Difficulty = a `POLICIES` registry entry. The natural ladder, cheapest first:

1. **Easy** — `random`, or "noisy greedy": score as greedy, pick uniformly
   among the top-N moves (N is the difficulty dial).
2. **Medium** — `greedy` as-is.
3. **Hard** — deeper search: 2-ply (candidate move + best reply to own next
   move), beam search over the action *sequence within a turn* (turns are
   multi-action, which one-ply ignores), or short rollouts reusing `runTurns`
   with a cheap policy as the playout.
4. **Personalities** — same evaluate, different weight vectors (expander:
   pops/colonies up; builder: income up; zealot: happiness/influence up).
   Cheap asymmetry, pairs well with the national-ideas roadmap item.

In-game integration sketch: the UI's `controller.ts` keeps working as-is; a CPU
turn is `enumerateLegalMoves → policy.choose → applyMove` inside the same Immer
commit pattern the human moves use, seeded from the game seed so matches stay
replayable. If evaluation cost grows, move choose() to a worker.

## The tuning loop

Evaluation changes are tested like rules changes: run the same seeded batch
before and after and diff the reports —

```bash
npm run sim -- batch --games 10 --turns 24 --policy greedy --seed 100 --report .sim/before.json
# ...edit evaluate() in src/sim/policies.ts...
npm run sim -- batch --games 10 --turns 24 --policy greedy --seed 100 --report .sim/after.json
diff <(jq 'del(.meta.generatedAt)' .sim/before.json) <(jq 'del(.meta.generatedAt)' .sim/after.json)
```

Watch `buildings`, `perSeason` happiness/food/unrest shares, `popsLostToUnrest`,
and `finalVpDistribution`. See docs/simulation.md for the full command surface.
