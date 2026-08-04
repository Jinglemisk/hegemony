# Bot Players — How the AI Works

Status: **sim-grade bots**, built for balance batches and headless testing — not
yet game AI. This doc records how they work and the path to real CPU opponents
with difficulty settings, so that work starts from a map instead of an
excavation. (Deliberately parked for now; see todo.md → Tooling.)

## Architecture

Everything an AI needs is behind one seam, and any future CPU player should
drive the same one:

- **`src/game/legalMoves.ts`** — `enumerateLegalCommands(G, player)` returns
  intent-only commands validated by the engine's status predicates;
  `transition(definition, G, player, command)` applies one atomically. A bot never
  submits effective costs or re-derives rules.
- **`src/sim/policies.ts`** — the brain. `Policy = { name, choose(view, commands, rng) }`:
  given the acting seat's projection and legal commands, return one. That interface is the whole
  contract; new AIs are new entries in the `POLICIES` registry.
- **`src/sim/runner.ts`** — the body. `playTurn` loops choose→apply until the
  turn ends (action cap of 30 force-ends stuck turns); `runGame` wires setup +
  turns + hooks. The runner, CLI (`auto`/`batch`), and tests all share it.

The browser, simulation, and replay share the atomic `GameCommand` transition. Every policy
receives `PlayerView`, the same redacted observation used by the browser: draw identities,
deck order, seed/RNG, rival Assembly hands/proposals, and private pending events never reach
policy code. Political draw valuation uses a public uncertainty pool rather than the actual
deck. Existing policies remain deterministic baselines across that boundary.

### Determinism contract

Policies must be pure functions of `(view, commands, rng)`. No `Math.random`, no
`Date`, no hidden state. All randomness comes from the injected `SimRng` — a
mulberry32 stream separate from the game's deck RNG, so changing a policy never
changes which cards come up. Tie-breaks follow enumeration order. This is what
makes batches byte-reproducible and games replayable; keep it true for CPU
players too (seed their rng from the game seed).

## Current policies

**`random`** — two-stage uniform: pick among the distinct move _types_ present,
then uniformly within that type. Grouping keeps huge move families (movePops,
foundColony) from swamping the draw and gives endTurn ~1/k odds per action, so
turns always terminate. Use: chaos monkey, smoke tests, cheap batch noise.

**`greedy`** — one-ply lookahead: for each candidate move, `structuredClone`
the state, apply the move, score the result, keep the best; end the turn when
nothing scores above the status quo. Forced situations (pending event) pick the
best-scoring resolution.

**`smart`** — the same one-ply search, but a richer score (pops by tier, materials
by role, building room, Gymnasion synergy). See `evaluateSmart`.

**`beam`** — a within-turn **beam search** over the `smart` score. A "decision" in
Hegemony is not one move but a _sequence_ ending in endTurn (turns run up to 30
actions), and one-ply is greedy per step — it can't value a locally-worse first move
that unlocks a much better second (build-then-promote or
sell-then-buy-then-build). The beam expands each frontier node by every branchable
move, scores the resulting state, keeps the best `W` (=3) nodes per depth up to `D`
(=4), and commits the FIRST action of the best sequence found, re-planning each ply.
Same evaluation as smart, so a smart-vs-beam A/B isolates search depth from scoring.
Because `endTurn` is not a branch, the beam cannot project income into a later action
or deliberately save for a future city; `INCOME_HORIZON` only estimates passive
income, upkeep, and unrest inside the state score.

**`political`** — the `smart` economy plus dedicated Assembly heuristics: it values
political standing, compares a resolution's benefit to the strongest rival's, and makes
draw/propose/repeal/vote/bribe/veto decisions. Outside the Assembly it returns to one-ply
search, so it does not inherit `beam`'s depth.

**`master`** — the cumulative whole-game policy. It uses the political Assembly handler;
everywhere else it runs the `beam` over a combined score: `smart` economy + political
standing + PR #41's low-weight one-step expansion-frontier signal. In lineage terms,
`beam`, `political`, and the off-branch `settler` experiment are sibling specialists;
`master` is their first composition. It does not yet add cross-turn saving, general rival
replies, multi-hop route search, or chance expected value.

_Determinism / anti-peek (the crux):_ the game RNG lives inside state (`G.rng`), so
applying a stochastic move in a clone would reveal _this game's_ seeded roll. The beam
branches ONLY on the RNG-free move set — it excludes fundExpedition / riot / bank
(played by the shared `resolveStochasticByRule` rules) and endTurn — so no clone ever
advances `G.rng`. Non-peeking is therefore structural, not a patch: it's asserted per
branch (`draft.rng === rngBefore`) and proven end-to-end by record→replay being
byte-identical. `cloneForSearch` shares the immutable game definition, its ruleset
alias, and event decks by reference and
resets the log, so each clone is ~an order of magnitude lighter than a full
`structuredClone`.

### The evaluation function (the part worth tuning)

```
score = 10 · VP(resources projected INCOME_HORIZON turns ahead)
      +  2 · projectedHappiness
      +  1 · influence          (INCOME_HORIZON = 6)
      -  projectedUnrestRisk
```

The projection advances each future upkeep and income collection in order. It
uses the engine's own income and active-effect queries, including suppressed
collections, timed happiness, and expected starvation loss. At every projected
upkeep it records the minimum happiness and any mild-riot or severe-revolt
threshold crossing; a severe crossing applies the live ruleset's rebound before
income resumes. This prevents a later recovery from hiding an earlier riot.

`projectedUnrestRisk` is deliberately a named strategic heuristic, not an
expected riot-table payout. It uses the active ruleset thresholds, severe pop-loss
multiplier, severe roll modifier, and rebound. It does not guess whether a future
conditional resource/building loss or insurance purchase will apply, and it never
reads the seeded future die roll.

The rule-based stochastic chooser and the greedy/smart material evaluator also derive
their affordability bands from the active ruleset. Venture reserves scale from the
active stake, sell-surplus and material-starvation bands scale from the active colony
cost, and material-score normalization scales from the active victory stockpile. This
keeps the same policies useful under `low-number-core-v1` without baking the preset
into bot code; standard mode still resolves to its historical thresholds exactly.

**Why the horizon exists** (empirical, seeds 100–109, 10×24-turn batches):
the pre-horizon score (`10·VP + 0.5·materialIncome + 2·happiness`) priced
spending at ~10× and future income at 0.5×, so bots built 4 buildings in 10
games (zero granaries, zero temples) and rode a food/happiness death spiral:
mean happiness −5.4 by season 7, half the seats in unrest/revolt, 102 pops
dead. With the horizon: 123 buildings, happiness +19, 80% calm, half the
deaths, _higher_ final VP. Same seeds — only the scoring changed. Moral: the
spiral was bot myopia, and evaluation quality is the difference between a
batch that measures the game and one that measures the bot.

## Known limitations (read before trusting a batch)

- **No cross-turn plan search**: the beam can sequence up to four RNG-free actions in
  the current turn, but cannot choose `endTurn`, receive income, observe rival turns,
  and continue toward a later action. Anything requiring intentional saving is
  undervalued.
- **No spatial strategy**: colony/movePops targets are scored only by immediate
  economics, not position, denial, or future city sites.
- **No opponent model**: bots never consider the other three players.
- **Heuristic riot severity**: projected threshold crossings are priced, but the
  evaluator does not branch over future insurance decisions or conditional
  resource/building losses. Those require chance expectation and future policy
  modeling; the current score intentionally stops short of pretending otherwise.
- `choose()` costs ~candidates × `structuredClone(G)` per action. Fine headless;
  budget it before running inside the UI thread.

## Path to CPU opponents with difficulty settings

Difficulty = a `POLICIES` registry entry. The natural ladder, cheapest first:

1. **Easy** — `random`, or "noisy greedy": score as greedy, pick uniformly
   among the top-N moves (N is the difficulty dial).
2. **Medium** — `greedy` as-is.
3. **Hard** — `beam` (shipped): a within-turn beam search over the action
   _sequence_ (turns are multi-action, which one-ply ignores). Room to go further
   still: 2-ply opponent replies, or short rollouts reusing `runTurns` as the playout.
4. **Personalities** — same evaluate, different weight vectors (expander:
   pops/colonies up; builder: income up; zealot: happiness/influence up).
   Cheap asymmetry, pairs well with the national-ideas roadmap item.

In-game integration target: human and CPU clients consume the same player-safe legal
options and submit the selected `GameCommand` through the same engine transition. The
CPU receives a fair observation rather than full deck/RNG secrets, and its decision RNG
and policy version are recorded for replay. If evaluation cost grows, move `choose()` to
a worker without moving rules or authority out of the engine/server boundary.

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
and `finalVpDistribution`. See docs/reference/simulation.md for the full command surface.
