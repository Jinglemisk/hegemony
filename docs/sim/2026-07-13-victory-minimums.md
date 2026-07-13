# Victory minimums vs the thinner deck — candidate campaign

**Date:** 2026-07-13 (morning after the deck overhaul) · **Setup:** 20 games × 60
turns × greedy per arm, seeds 9000–9019, all arms on identical seeds and current
HEAD (post-omen — not seed-comparable with pre-omen reports). Reports:
`2026-07-13-victory-minimums-{a,b,c,d}.json`.

**Question:** the race minimums (cities 3 · pops 16 · citizens 8 · stockpile 80 ·
happiness +10) were tuned against the old +4.9-EV deck. The overhauled +2.2 deck
feeds the finish lines less — do the minimums need to come down, and which ones?

| Arm | Minimums (cities/pops/citizens/stockpile/happiness) | Closed | Leader cards mean | Close seasons |
| --- | --- | --- | --- | --- |
| A (current) | 3 / 16 / 8 / 80 / +10 | 3/20 | 1.90 | 13, 15, 15 |
| B (mild all-down) | 3 / 14 / 7 / 70 / +10 | 1/20 | 1.70 | 13 |
| C (aggressive all-down) | 2 / 12 / 7 / 65 / +8 | 7/20 | 2.25 | 11–15 |
| D (cities 2 only) | **2** / 16 / 8 / 80 / +10 | 6/20 | 2.00 | 13–15 |

## Reading

- **Cities is the binding minimum.** Dropping it alone (arm D) doubles the close
  rate; loosening everything else on top (arm C) adds barely one more close while
  moving wins into year 3 (faster than the ~year-4.8 Phase 0 target) and loosening
  four more dials for no gain. Arm B (mild, cities untouched) is noise vs A.
- **Why cities binds:** Polis Builder at 3 demands two colony upgrades — 60w + 20s +
  10f of investment the thinner deck no longer subsidizes. At 2 it's one upgrade,
  and the sole-leader rule keeps it honest: the moment a second player upgrades,
  2–2 ties and the card goes unheld — a real race to the *third* city.
- **Design floor check:** cities 2 is not holdable at game start (1 city) nor on a
  maximum-luck first turn (upgrade needs 30 wood; 20 start + first income + a +3
  windfall tops out ~28). The D1 rule survives.

## Recommendation

**Cities 3 → 2; leave pops 16 / citizens 8 / stockpile 80 / happiness +10 as
tuned.** One dial, surgical, restores (doubles) the close rate the deck overhaul
cost, keeps wins landing in year 4, and preserves the Phase 0 tuning of every
other card. NOT applied — awaiting the user's verdict.
