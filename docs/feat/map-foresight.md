# Map / expansion foresight — the `settler` bot

*Built on top of Phase 3-C ([influence-aware-ai.md](influence-aware-ai.md)). A sim-bot
scoring change, no engine rules touched.*

## The gap

The bots have **income foresight** (the scorer projects `calculateIncome` six turns ahead,
so "grow a pop → it pays back in a couple turns" is visible) but they are **board-static**:
a colony is valued for its own count + its tile's yield, and *nothing* values the
**expansion it unlocks**. "Found a colony *here* so I can chain to that rich cluster two
turns down the line" — the second-order move that is the *heart of the game* — is invisible.
`docs/sim/2026-07-21-influence-aware-ai.md` names this exact blind spot.

## The idea

Add a **frontier term** to the evaluation, so the one-ply search prefers placements that
*open* expansion rather than just the fattest single tile:

```
frontierValue(G, me) = Σ over tiles I could legally found a colony on NEXT of tile.yield
```

- Reachability only — `canPlaceColonyOnTile` (contiguity or coastal leapfrog, unclaimed,
  not the oracle). **Cost and a spare pop are deliberately ignored**: this prices the
  *potential* a position holds, not whether this exact turn can afford it.
- Founding a colony spends one frontier tile but opens its neighbours, so a placement
  *toward* a cluster nets more frontier than a dead-end one — and the one-ply search, which
  already tries founding each colony on a clone, can finally *see* that in the score.

`settler` = the `smart` economy + `FRONTIER_WEIGHT × frontierValue`. Nothing else changes,
so a **`settler`-vs-`smart` A/B isolates map foresight** exactly as greedy-vs-smart isolates
the evaluation. It is deliberately kept off the assembly (it passes there like `smart`) so
the two foresight layers — the agora (`political`) and the map (`settler`) — stay
independently measurable; a future bot can carry both.

## Result — a rigorous negative finding

Measured across a full weight sweep ([write-up](../sim/2026-07-21-settler-vs-smart.md)).
First, the context that matters: **winning requires expanding** — 14 of 24 games are won by
actively reaching 3 victory cards (`cities ≥ 3`, `pops ≥ 16`, …), and both bots expand to
get there (settler 40 settlements, smart 38). This is *not* expand-vs-turtle.

Given that, **no weight of the frontier term beats `smart`:**

| `FRONTIER_WEIGHT` | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| settler win % | 19 | 25 | 19 | 13 | 13 | 8 |

Neutral at low weight, monotonically worse as it is pushed. The reason: the 6-turn income
projection **already** values a colony's tile yield *and its upkeep*, so `smart` already
expands to about the right amount; the additive frontier term can only push it to found
*more*, which at high weight overrides the projection's upkeep caution and the bot
over-expands into colonies it can't feed.

So the honest finding — I first over-framed it — is **"you cannot out-expand a
well-balanced economy for an edge,"** not "expansion doesn't matter." The map foresight that
*would* pay is what a one-ply term can't reach: colony→**city** upgrades (the `cities` card
needs cities, and `beam`'s multi-step planning does upgrades and beats `smart`) and
**competition** for scarce tiles. And whether expansion *should* pay more is a game-balance
question for the owner. `settler` ships at `FRONTIER_WEIGHT = 2` as the instrument to re-run
this against any future expansion tuning — not as a stronger bot.

## Where it lives

- `src/sim/policies.ts` — `frontierValue`, `FRONTIER_WEIGHT`, `evaluateSettler`,
  `settlerPolicy`, registered as `"settler"`.
- `src/sim/policies.test.ts` — determinism + deadlock-free completion.
- `docs/simulation.md` — the `settler` policy.
- `docs/sim/2026-07-21-settler-vs-smart.md` — the A/B write-up.
