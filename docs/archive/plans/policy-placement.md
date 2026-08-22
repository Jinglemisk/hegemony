---
status: shipped
phase: "tooling"
updated: 2026-08-22
---

# Policy-driven opening placement

## Outcome

Every automatically placed opening — the browser's dev auto-opening and the sim's
default opening — is chosen by the same policy brain that plays the game, not by a
uniform draw over legal commands. A playtester reloading the app lands in a game whose
four starts a competent player could have chosen: capitals on yielding tiles with room
to expand, founding colonies that open a second pole, pop splits that match the land.
Batch runs measure the economy from sane openings instead of from noise.

The result is deterministic per seed, replayable from recorded history, and the future
CPU opponent inherits it without a second code path.

## Non-goals

- **Board fairness.** No constrained shuffle, seat balancing, or re-rolling. The owner
  declined this on 2026-08-22: the goal is sane placements on whatever board is dealt,
  not equal boards. The `config.ts` note about the deferred constrained shuffle stays as
  is.
- **Browser CPU opponents.** Hot-seat stays hot-seat. This plan only changes who fills in
  the opening when a human has not asked to place by hand.
- **Search deeper than one ply for setup.** Rollouts, MCTS, and "react to rivals' likely
  next placement" belong to [Outcome-driven AI §7.5](../../plans/outcome-driven-ai.md) after the
  mechanics freeze. One-ply with a placement-aware score is the production floor, and it
  is also the seam that deeper search later plugs into.
- **Changing placement rules.** Snake order, the metropolis exclusion radius, and the
  founding-colony coast rule are untouched. Legality stays entirely in
  `enumerateLegalCommands`.

## Settled inputs

- Owner ruling (2026-08-22): "I don't want a fair board, I only want initial placements
  to not be random." Option A from the 2026-08-22 assessment is accepted; option B
  (fair-start constraint) is rejected, not deferred.
- [Outcome-driven AI §7.5](../../plans/outcome-driven-ai.md): "The selected policy must control
  setup in outcome-driven and CPU games. Random uniform setup remains a chaos/test option
  only." and §12.7: reject dominated placements, react to earlier seats, preserve opening
  diversity among equivalents. This plan delivers the first two at one-ply depth and the
  third by seeded tie-breaking.
- Architecture contract: the browser CPU and the headless policy are one implementation.
  `src/sim/policies.ts` already imports only `src/game` modules, so the browser can call
  it directly.
- Current behaviour being replaced:
  - `autoPlayOpening` in the lobby controller: a private mulberry32 stream picks
    uniformly from `enumerateLegalCommands` until `gameplay`.
  - `buildNewGame` with `opening: "random"`: `simRng.pick(commands)` until `gameplay`.
  - Policies never see the setup phase; `runGame` builds the game to `gameplay` before
    `runTurns` calls `Policy.choose`.
- Candidate space per decision: capital = settleable tiles × 15 pop compositions
  (4 pops over three kinds) ≈ 450 commands on a 37-tile board; founding colony =
  legal tiles × 6 compositions ≈ 60–120. One-ply over these is cheap enough for batches
  (eight decisions per game, each a clone→apply→score over the candidates).

## Open owner questions

None.

## Design

### One seam, one brain

`Policy.choose(view, commands, rng)` is unchanged. During `setupCapital` and
`setupColony` the commands are placements; the policy is simply called earlier. Nothing
in the engine, the save format, or the replay path distinguishes a policy-placed opening
from a hand-placed one — both are `placeCapital`/`placeColony` commands in history.

`random` keeps its uniform pick (it is the chaos option by design). Every search policy
(`greedy`, `smart`, `beam`, `political`, `settler`, `master`) branches to the same
placement routine when the phase is a setup phase:

```text
choosePlacement(G, commands, rng):
  score each command by evaluatePlacement(transition(G, command).state, player)
  keep the best; among exact ties, rng.pick
```

Every search policy shares the **same** placement routine and score on purpose. The
existing A/B method isolates one variable by running two policies over the same seeds;
if `smart` and `settler` placed differently, a gameplay A/B would also be an opening A/B.
Openings are held constant across policies so gameplay comparisons stay clean.

### The placement score

`evaluatePlacement` is `evaluateSmart` plus a _bounded_ frontier term, minus its
contested part:

- **`evaluateSmart`** already prices what the placement buys: own-tile yield through the
  six-turn `projectPolicyHorizon` (so pop composition is scored by the income it
  actually produces on that tile, including starvation and happiness exposure), weighted
  pops, and city building slots. This is why no bespoke "site score" is needed: once the
  pops sit on the tile, the income model is the site score.
- **Bounded frontier** prices expansion room: the top three yields among tiles the
  player could found a colony on _next_, evaluated with gameplay geometry, weighted by
  `FRONTIER_WEIGHT` (2, `settler`'s measured setting). Because gameplay colonies may
  leapfrog along the coast once the player holds any coastal settlement, a coastal seat
  sees the coast in its frontier — coast access needs no special case. The bound is
  what makes that honest: `settler`'s unbounded `frontierValue` sums the _whole_
  coastline for a coastal seat, which in an absolute comparison made a food-4 shore
  beat the food-10 breadbasket. Colonies are founded one at a time; the best few
  reachable sites are what a placement buys.
- **Contested frontier.** Of those top three, the yield a rival already on the board
  could also settle next is subtracted at `CONTEST_WEIGHT` (1 — half the frontier
  weight, so a contested tile still counts for something). Only rivals holding a
  settlement count: a seat that has not placed yet has no contiguity rule and would
  "reach" every tile. This is the only term that makes a seat react to earlier seats'
  placements beyond the exclusion radius legality already enforces; seat 0's term is
  zero because it has nothing to react to yet.

### Cost

One-ply over every placement is ~540 transitions for a capital (36 tiles × 15 pop
splits), about 1.3 s per opening — too slow for batches and test suites. The routine
runs in two passes: rank tiles by their most even pop split (36 transitions), then score
every split on the top three tiles (45). A capital costs ~80 transitions and a whole
opening ~0.4 s. The pruning assumes the tile dominates the split, which holds because the
split only redistributes the same tile's yield.

### Diversity

`onePlyLookahead` takes the first best by enumeration order. For placements, exact score
ties are broken with `rng.pick` so that equivalent sites and symmetric compositions do
not always resolve to the lowest tile id. The rng is the injected `SimRng` (the browser
seeds it from the game seed exactly as `runGame` does via `deriveBotSeed`), so the choice
is still a pure function of the seed. No epsilon band: near-ties are a tuning concern
for later search, and an epsilon would make the placement non-reproducible across
evaluator tweaks.

### Wiring

**Simulation.** `OpeningKind` gains `"policy"`. `buildNewGame` calls the shared
`choosePlacement` directly until `gameplay` — no named policy is needed, because every
search policy places identically — recording each move through the existing `onMove`
hook. The search policies also branch to `choosePlacement` inside `choose`, so `auto`
on a `--manual-setup` save places well too. `runGame` defaults `opening` to
`"policy"`. `new` accepts `--opening policy|random|fixed` and `batch`
`--opening policy|random`; the batch report's `meta.opening` names which. `random`
remains the chaos baseline. The save file records `opening: "policy"` as metadata;
`replayScript` rebuilds from recorded history and never consults it.

**Browser.** `autoPlayOpening` drops its private mulberry32 stream and calls the shared
placement routine with a `SimRng` derived from the game seed. `?setup=manual` still
hands placement to the human. A `?opening=random` dev parameter restores the old
uniform behaviour for anyone who wants a chaotic board on purpose; it is a dev-only
switch like `?dev=assembly`, not a player option. The dev rotation seeds keep rotating,
so reloads still vary the board; what changes is that each board is now played from a
sensible start.

**Default flip.** Shipping changes the default opening for both the sim and the browser.
Existing dated simulation reports were produced with `random` openings and stay valid as
historical evidence; new batches should name their opening in the report header.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                                                                        |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Engine / backend | N/A      | No rule, state, command, or query changes. Placement legality is still `enumerateLegalCommands`; the policy only chooses among what the engine already offers. Invariants are exercised by the sim tests.                                                                |
| Frontend         | Yes      | Lobby auto-opening routes through the shared placement routine; `?setup=manual` and `?dev=preload` unchanged; `?opening=random` documented in the controller header comment. Verified by loading a few rotation seeds and confirming the capitals sit on yielding tiles. |
| Simulation & AI  | Yes      | `"policy"` opening kind, placement branch in every search policy, `evaluatePlacement`, CLI flag, save/replay round-trip, behavioural tests, and the A/B report below.                                                                                                    |

Sibling consumers: within the simulation axis, `buildNewGame`, `runGame`, the CLI
`new`/`auto`/`batch` commands, `scriptFromSave`/`replayScript`, and the lobby
`autoPlayOpening` all consume `OpeningKind`; the new kind must be handled by each, and
the browser and the sim must call the same placement routine so they cannot drift.

## Architecture impact

- Per-match definition and hash: N/A — no ruleset or content change.
- Canonical command / legal option / atomic transition: applicable, unchanged —
  placements are the existing `placeCapital`/`placeColony` commands derived by the
  engine and applied through `transition`.
- Actor eligibility: N/A — the acting seat is whoever the setup machine names.
- Projections: applicable — the policy observes through `projectForPlayer`, the same
  redacted `PlayerView` used in play. A placing seat sees rival placements because they
  are public board state.
- Identities, conservation, save/replay, migrations: applicable — the save gains one
  enum value; history already carries the placements, so no migration. Legacy saves
  with `"random"` replay unchanged.
- Required-decision presentation: N/A — no new workflow.
- Invariants and deterministic scenarios: applicable — same seed and policy produce the
  same eight placements, asserted by test.

No module-global state: the browser seeds a fresh `SimRng` per game build, exactly as
`runGame` does. No second engine path: the browser imports `src/sim/policies.ts`, which
depends only on `src/game`.

## PR slices

1. **Placement branch and evaluator (sim).** `evaluatePlacement` with the contested
   frontier term, the shared `choosePlacement` routine, setup branching in every search
   policy, `"policy"` opening kind in `buildNewGame`/`runGame`/CLI/save, replay
   verification, tests below, and the `docs/reference/simulation.md` and
   `docs/reference/ai.md` updates. This slice is the whole capability headless; the
   A/B report ships with it.
2. **Browser auto-opening.** `autoPlayOpening` calls the shared routine;
   `?opening=random`; controller header comment; `config.ts` comment for
   `autoOpeningForDev` updated to say "policy-placed". Small PR, but kept separate so
   the headless evidence lands first and the browser change is a one-line review.

## Acceptance and validation

Behavioural tests (travel with slice 1, in `src/sim/policies.test.ts` and
`src/sim/setup.test.ts`):

- On the classic board, a search policy's seat-0 metropolis lands on a tile with a
  non-null resource, never on hills or the rim, and never on the oracle (legality) —
  and its pop split is not all-slaves on a tile whose yield slaves cannot work.
- The founding colony is legal under setup geometry and lands on a tile that increases
  `frontierValue` versus the best adjacent alternative when a coastal option exists.
- Contest term: on a fixture where seat 3's two best capital sites are equal by
  `evaluateSettler` but one borders seat 0's frontier, the policy takes the uncontested
  one; with `CONTEST_WEIGHT = 0` it is indifferent.
- Determinism: `runGame` twice with the same seed and `opening: "policy"` yields
  identical history; changing the bot seed may change tie-breaks but never legality.
- `random` policy with `"policy"` opening still places uniformly (it is the chaos
  baseline and must not inherit the evaluator).
- Save → script → replay round-trip with `opening: "policy"` reproduces the final state
  without invoking any policy.
- Every search policy places identically for the same seed (shared routine), so a
  `smart`-vs-`settler` batch differs only after setup.

Simulation evidence — shipped as
[2026-08-22 policy-placed openings](../../reports/simulation/2026-08-22-policy-placement-openings.md):
zero of eighty policy capitals on yield-less land against nine of eighty random ones,
mean capital yield 7 against 2.7, and pops lost to unrest down by a third to a half over
sixty turns of `smart` play. The classic board's seat spread widens under good play
(seat 0 holds the breadbasket), as the ruling accepts. Originally specified as:

- `batch` over a fixed seed range, `smart` play, classic and shuffled boards, openings
  `policy` vs `random`. Report turn-N standings, starvation events, colonies founded, and
  the spread between best and worst seat. Expected: higher and tighter economies under
  `policy`; if the seat spread widens (the best seat grabs the breadbasket every time),
  that is the board's unfairness showing through good play, which is acceptable per the
  owner ruling and should be noted, not fixed here.
- `CONTEST_WEIGHT` sweep at `0 / 1 / 2` on the shuffled board: confirm `1` does not
  reduce own-tile income versus `0` while lowering shared-frontier counts. Adopt the
  measured value.

Human evidence: load the app on three rotation seeds and confirm every start is one a
playtester would not call braindead.

## Shipped

PR #71 (merged 2026-08-22, `d2da011`): the headless slice, the browser slice, and the
[opening A/B report](../../reports/simulation/2026-08-22-policy-placement-openings.md).
Owner playtested the rotation seeds and accepted the starts on 2026-08-22. The living
description now sits in [`reference/ai.md`](../../reference/ai.md) ("Setup is more
policy calls") and [`reference/simulation.md`](../../reference/simulation.md) (opening
kinds).
