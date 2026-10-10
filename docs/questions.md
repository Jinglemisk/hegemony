# Owner questions

Only unresolved owner decisions live here. Answer in chat or after `Answer:`; the
answer is then incorporated into the affected plan and this entry is removed.
Recommendations are defaults for discussion, not silent authorization.

Last updated: 2026-10-10.

## Q80 — What shape should Step 11 take?

**Context:** The [sim parity audit](reports/simulation/2026-10-10-v2-sim-parity-audit.md)
found that three parts of Step 11 cannot run as written. The runaway-leader rule speaks of
"round 5" and "stock": a round is a v1 unit, and v2 never defined stock. Under rotated
personalities the income leader is a build, not a snowball. The plan asks for at least 60
games a condition, where a measured 20% could be anything from 12% to 32%; separating a 15%
win rate from the 20% floor needs about 470 games. The v1 baseline's tables cannot be
regenerated: the scripts that made them are gone, and v1 has no personalities and no class,
draw or riot-by-year telemetry. This does not block Steps 18 and 19.

**Options:**

- **Runaway leader.** A: year 5's income leader, and stock as wood, stone, gold and food
  with the laggard counted as at least 1, as the baseline did. B: the same, measured in a
  batch where all four seats play the same personality, so the leader is a lead and not a
  build. C: drop the rule and report the figures only.
- **Games.** A: 60, as planned, with the uncertainty printed beside each rate. B: about 480
  (120 seeds × 4 rotations), once Step 19 lets batches run across cores. C: 60 for the rules
  that measure a level, 480 for the win-rate rule only.
- **v1 comparison.** A: drop it; judge v2 against the rules' thresholds alone. B: backport
  the telemetry to a v1 branch and rerun it with food floored at zero. C: compare only the
  fields both sides already have (win spread, game length, riots a game).

**Recommendation:** Runaway leader B, games C, v1 comparison C. B answers the question the
rule was written for. The win-rate rule is the only one a small sample cannot decide. The v1
backport is the largest item in the audit and v1 is not coming back, so its numbers would
change no decision.

**Answer:**
