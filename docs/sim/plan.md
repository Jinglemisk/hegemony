# Simulation / balance plan

Living plan for what to run next. Updated as campaigns close. For *how* to run things see
[../simulation.md](../simulation.md); for *how the bots work* see [../ai.md](../ai.md).

## Where we are (2026-07-19)

The sim-audit is closed (PRs #29/#30): the simulator is trustworthy and can now A/B every
lever (`--board`, `--tune-patch`, `--seats`/`--rotate`, real finished-game win rates). The
new `beam` bot searches within-turn action sequences and beats one-ply `smart` — **and in
doing so proved the current ceiling is the evaluation, not the search.** In the A/B
([2026-07-19-beam-vs-baselines.md](2026-07-19-beam-vs-baselines.md)):

- beam **beats** one-ply `smart` (29% vs 24%) and finally does colony→city upgrades (~0.7/game vs ≈0);
- beam **loses** to plain `greedy` (8% vs 31%), because `evaluateSmart` over-values promotion
  (24 promotePop/game, ~10.6 pops lost to unrest/seat) — climbing into the −5/−10 riot
  thresholds — and the beam optimizes that flaw *harder*.

So the next work is **tuning the evaluation**, on two connected tracks.

---

## Track A — tune the `smart` evaluation (primary)

Make the bot stop over-promoting, so `beam` (and `smart`) become credible skilled-play
proxies. This is a **code edit** in the bot's brain, tested with the ai.md before/after loop.

**Where the levers are — `src/sim/policies.ts`:**

- `SMART_POP_WEIGHT = { citizens: 3, freemen: 2, slaves: 1.2 }` — promoting slave→freeman
  (+0.8) or freeman→citizen (+1) is *always* score-positive; nothing here prices the unrest a
  promotion sets up.
- `SMART_MATERIAL_WEIGHT`, and the heuristic coefficients (`6·cities + 3·colonies +
  weightedPops + material/8 + 0.4·citySlots + 3·gymSynergy − max(0,−happiness)`).
- The unrest term is `− max(0, −projected.happiness)` — **linear, and only bites once
  happiness is already negative.** It cannot see the *nonlinear* cliff at −5/−10 (a riot that
  deletes pops), and `projectedHappiness` is capped at `min(happiness, 15)`.

**Hypotheses to A/B (one variable at a time):**

1. **Over-promotion.** Lower the citizen/freemen weights (e.g. `citizens 3→2.4`, `freemen
   2→1.8`) so promotion competes with, not dominates, other gains. *Expected:* fewer
   promotes, less unrest, higher win rate vs greedy.
2. **Threshold-blind unrest penalty.** Replace the linear `−max(0,−happiness)` with a
   penalty that ramps up as happiness *approaches* the riot floor (e.g. steepen below +2, or
   price `riotAtRisk`). *Expected:* the bot stops promoting itself into revolt.
3. **Horizon coverage.** Confirm the `INCOME_HORIZON = 6` projection already charges the food
   cost of new citizens (they eat 2 food) and over-capacity happiness; if not, that's why the
   bot doesn't foresee the spiral.

**Method (the metric that matters):** don't just diff a uniform batch — use the mixed-policy
harness so the metric is *does the tuned bot actually win?*

```bash
# baseline: tuned smart in one seat vs greedy, rotated to cancel seat bias
npm run sim -- batch --seats beam,greedy,greedy,greedy --rotate --games 12 --turns 300 \
  --seed 9000 --report docs/sim/2026-mm-dd-eval-<hypothesis>.json
# ...edit evaluateSmart in src/sim/policies.ts, re-run, compare winsByPolicy...
```

**Success:** `beam`-over-tuned-`smart` reaches or beats `greedy`'s finished-game win rate,
**without** a worse `popsLostToUnrest` / revolt-share profile. Guardrails to watch every run:
`winsByPolicy`, `popsLostToUnrest` (perGame), and the final-season `unrestTierShares.revolt`.

---

## Track B — the game-balance question underneath (connected)

The bot's over-promotion may also be telling us something about the **game**: is promotion
over-rewarded, or is unrest under-priced? The greedy-vs-smart writeup already flagged this —
"hard to separate 'bot over-promotes' from 'ruleset under-rewards'." This is the audit's real
target: use the bot as a *probe* for balance.

Do Track A **first** (so the bot is a clean probe), then A/B the ruleset itself with
`--tune-patch` (no code edit — it patches the game, not the bot):

- `ruleset.ladder.promoteCosts` — is slave→freeman (4 food) / freeman→citizen (4 gold) too cheap?
- `ruleset.economy.unrest` thresholds/penalties — are −5/−10 and the riot magnitudes right?
- Villa / Gymnasion strength (`--tune-patch` on `buildings.*`) — the deferred buildings pass.

```bash
npm run sim -- batch --seats beam,greedy,greedy,greedy --rotate --games 12 --turns 300 \
  --tune-patch promote-costs.json --seed 9000 --report docs/sim/2026-mm-dd-promote-costs.json
```

---

## Then: the campaigns this unblocks

- **Victory-threshold tuning** (owed since the victory race shipped): re-run the minimums
  (`ruleset.victory.minimums`, incl. the pending cities 3→2 verdict) against a *credible*
  bot, on `--board shuffled`, so the game-length dial is set against skilled play, not myopia.
- **Buildings / bank passes** (todo.md "Final quality passes") — Villa/Gymnasion strength and
  the bank spreads, now that a bot exercises them.

## Secondary / tooling

- **Beam performance:** it re-plans every ply (compute-heavy). If a campaign feels slow, add
  commit-sequence memoization (provably identical output) or trim `BEAM_WIDTH`/`BEAM_DEPTH`.
- **Per-policy behavioral metrics:** the report tracks colony→city `upgrades` and building
  counts; add pop-tier composition and Gymnasion build→promote sequences if a campaign needs
  them (they aren't in the batch report yet — see the greedy-vs-smart caveat).

## Done when

The `smart`/`beam` bots win against `greedy` without an unrest spiral (Track A), the ruleset
levers they probe are settled (Track B), and the victory minimums are set against that bot on
shuffled boards. At that point the sim is measuring *the game*, not *the bot*.
