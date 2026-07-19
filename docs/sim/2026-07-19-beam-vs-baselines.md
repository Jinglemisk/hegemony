# Beam bot vs one-ply baselines (2026-07-19)

The new `beam` policy is a **within-turn beam search** over the same `smart` evaluation
(W=3, D=4), so a `beam`-vs-`smart` comparison isolates *search depth* from the scoring
function. Two mixed-policy batches, each with the beam in one seat rotated through all four
positions (same seed family, so seat bias cancels):

```
batch --seats beam,smart,smart,smart   --rotate --games 6 --turns 280 --seed 9000
batch --seats beam,greedy,greedy,greedy --rotate --games 6 --turns 280 --seed 9000
```

24 games each (6 seeds × 4 rotations). All games **finished** (0 turn-capped), so win rate
is real. Reports: `2026-07-19-beam-vs-smart.json`, `2026-07-19-beam-vs-greedy.json`.

## Headline

| Table | beam win rate | opponent win rate | fair share |
|---|---|---|---|
| beam vs **smart** | **29.2%** (7/24) | smart 23.6% (17/72) | 25% |
| beam vs **greedy** | **8.3%** (2/24) | greedy 30.6% (22/72) | 25% |

Two findings, one good and one more important:

1. **Search helps — on a fixed evaluation.** Over the *same* `smart` score, the beam beats
   one-ply `smart` (29% vs 24%, i.e. above the 4-player fair line while smart is below it).
   And it finally does the thing one-ply never could: **colony→city upgrades ~0.7/game**
   (18 and 17 total across the two batches) where greedy/smart do ≈0 (the audit measured
   ~1 upgrade per *400* rows). Depth unlocks the save-then-upgrade and build-then-promote
   sequences the greedy-per-step search walks past.

2. **But the `smart` *evaluation* is the bottleneck, not the search.** Beam-over-smart
   **loses badly to plain `greedy`** (8% vs 31%). The reason is visible in the verbs: the
   smart table runs **24 promotePop/game** and `mean popsLostToUnrest ≈ 10.6/seat`, vs
   **7 promotePop/game** and `≈7.1/seat` in the greedy table. `evaluateSmart` over-values
   promotion (citizen weight 3× slave), so it climbs the ladder into the unrest thresholds
   that delete pops — and the beam *amplifies* that flaw by optimising it harder. This is
   the classic "a stronger optimiser of a flawed objective is not a stronger player."

## What this means

- Ship `beam` as the deep-search policy (it's correct, deterministic, and the strongest
  searcher of the `smart` objective — the objective that exercises Phase-2 content: it
  builds Gymnasion 1.9/game and Villa 1.0/game, vs greedy's 0.5 / 0.08).
- The next lever is **co-tuning `evaluateSmart`**, not more search: the promotion/citizen
  weights and the unrest penalty. That campaign is now runnable end-to-end with
  `--tune-patch` (A/B the weights) + `--seats`/`--rotate` (measure real win rate). A good
  target: get beam-over-smart to beat greedy without the promote-into-revolt spiral.

## Determinism

Both batches are byte-reproducible (same seed → identical report minus `generatedAt`), and
`auto --record` → `replay` is byte-identical under `--policy beam`, which proves the search
consumed **zero game RNG** (any peek at the seeded die/deck would desync the deck on replay).

## Caveats

One evaluation (`evaluateSmart`), one seed family (9000), classic board, W=3/D=4. Read as
directional. The win-rate gaps are consistent with the seat-rotation controlling for
first-player advantage, but 24 games is a small sample — the tuning campaign should widen it.
