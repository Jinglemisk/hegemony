# Owner questions

Only unresolved owner decisions live here. Answer in chat or after `Answer:`; the
answer is then incorporated into the affected plan and this entry is removed.
Recommendations are defaults for discussion, not silent authorization.

Last updated: 2026-10-11.

## Q80 — What shape should Step 11 take?

**Context:** The [sim parity audit](reports/simulation/2026-10-10-v2-sim-parity-audit.md)
found that three parts of Step 11 cannot run as written. The runaway-leader rule speaks of
"round 5" and "stock": a round is a v1 unit, and v2 never defined stock. Under rotated
personalities the income leader is a build, not a snowball. The plan asks for at least 60
games a condition, where a measured 20% could be anything from 12% to 32%; separating a 15%
win rate from the 20% floor needs about 470 games. The v1 baseline's tables cannot be
regenerated: the scripts that made them are gone, and v1 has no personalities and no class,
draw or riot-by-year telemetry. Steps 18 and 19 are merged, so this is the last input Step
11 waits for.

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
- **Win rates.** A: keep "each personality wins 20% to 45%" as a rule. B: report it as a
  bot matter, and judge the other rules on tables where all four seats play one policy.
  Step 19's five batches moved the trader's rate 30 points and the civic's 23 on the same
  rules.

**Recommendation:** Runaway leader B, games C, v1 comparison C, win rates B. Runaway leader
B answers the question the rule was written for. The win-rate rule is the only one a small sample cannot decide. The v1
backport is the largest item in the audit and v1 is not coming back, so its numbers would
change no decision.

**First same-policy batch (2026-10-11):** 40 games with the master bot in all four seats,
seeds 1000 to 1039, on Step 19's build.

- Seat 0 wins 55% (22 of 40); the others win 13%, 15% and 18%. Seat 0 drafts Slave Colonies
  in every game and has the highest income at year 5 in 23 games. On Step 18's build the
  mixed table's seats won 25%, 25%, 30% and 20%, and Slave Colonies was a late pick. The
  batch cannot tell the Idea from the seat, which also picks land first and moves first.
- The seat with the most pops at year 5 wins 24 of 39 games. Year 5's income leader wins
  16 of the 33 games that have one.
- 35 games end by the deck and 5 by the race. The winner holds one title in 15 games, two
  in 19 and three in 6. About 2.5 of the six titles are held when a game ends; Treasurer
  is never held and Beloved in 3 games.
- Riots fall on 7.6% of turns from year 8, 4.8 a game. Median influence grows from 23 to
  43 between years 10 and 14, 5 a year. Beloved's holder is the sole luxury leader on 42%
  of the turns it is held.

**Answer:**
