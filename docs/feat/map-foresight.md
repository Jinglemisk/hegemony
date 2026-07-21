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

## Result — a negative finding worth having

Measured, and honest ([full write-up](../sim/2026-07-21-settler-vs-smart.md)): **map
foresight as a frontier term is win-neutral** (settler 25% vs smart 25% at weight 2), and
**harmful if emphasised** (8% vs 31% at weight 6 — the bot over-expands into colonies it
can't feed). The reason: the 6-turn income projection **already** values a colony's tile
yield, so the frontier term mostly restates what the bot knows, and at high weight it
*overrides* the economic evaluation that correctly declines unsustainable colonies.

So the feared "board-static" blind spot is smaller than it looked. The takeaway is a
**balance** signal, not a bot fix: a bot that expands more does not win more, so raw
expansion is not currently a differentiating lever — if it is meant to be "the heart of the
game," that is a *game*-tuning question for the owner (colony cost/reward, richer frontier
tiles), not a scorer change. The foresight that *would* pay — racing a rival to a scarce
tile, or founding-to-unlock a city upgrade two turns on — is competitive/cross-turn,
beyond a one-ply term. `settler` ships at `FRONTIER_WEIGHT = 2` (measured-neutral) as the
instrument to re-run this against any future expansion tuning.

## Where it lives

- `src/sim/policies.ts` — `frontierValue`, `FRONTIER_WEIGHT`, `evaluateSettler`,
  `settlerPolicy`, registered as `"settler"`.
- `src/sim/policies.test.ts` — determinism + deadlock-free completion.
- `docs/simulation.md` — the `settler` policy.
- `docs/sim/2026-07-21-settler-vs-smart.md` — the A/B write-up.
