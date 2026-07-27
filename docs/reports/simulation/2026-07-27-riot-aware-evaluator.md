# Riot-aware evaluator before/after (2026-07-27)

This campaign checks the narrow AI Track A repair: replace the duplicated
terminal linear-happiness penalty with one shared, ruleset-aware risk model that
records every projected upkeep crossing. It compares current `origin/main`
(`ce180bed2c3d`) with the evaluator candidate in this change.

## Commands

All four arms used Standard mode, the Classic board, base seed 9000, six
consecutive seeds, four seat rotations per seed, and a 280-turn cap.

```bash
# Before: origin/main evaluator
npm run sim -- batch --seats beam,greedy,greedy,greedy --rotate --games 6 --turns 280 --seed 9000 --report docs/reports/simulation/2026-07-27-riot-aware-evaluator-before-beam-greedy.json
npm run sim -- batch --seats beam,smart,smart,smart --rotate --games 6 --turns 280 --seed 9000 --report docs/reports/simulation/2026-07-27-riot-aware-evaluator-before-beam-smart.json

# After: riot-aware candidate
npm run sim -- batch --seats beam,greedy,greedy,greedy --rotate --games 6 --turns 280 --seed 9000 --report docs/reports/simulation/2026-07-27-riot-aware-evaluator-after-beam-greedy.json
npm run sim -- batch --seats beam,smart,smart,smart --rotate --games 6 --turns 280 --seed 9000 --report docs/reports/simulation/2026-07-27-riot-aware-evaluator-after-beam-smart.json
```

Every arm completed all 24 games: zero turn caps, crashes, or unfinished games.

## Results

| Matchup | Metric | Before | After |
| --- | --- | ---: | ---: |
| beam vs greedy | beam win rate | 8.3% (2/24) | 16.7% (4/24) |
| beam vs greedy | greedy win rate | 30.6% (22/72) | 27.8% (20/72) |
| beam vs greedy | beam pops lost to unrest / participation | 8.92 | 8.42 |
| beam vs greedy | greedy pops lost to unrest / participation | 5.44 | 5.60 |
| beam vs greedy | riot resolutions / game | 14.04 | 9.33 |
| beam vs greedy | season-33 survivor calm / discontent / unrest / revolt (cohort) | 71.9% / 9.4% / 6.3% / 12.5% (8 games) | 84.1% / 6.8% / 4.5% / 4.5% (11 games) |
| beam vs smart | beam win rate | 25.0% (6/24) | 41.7% (10/24) |
| beam vs smart | smart win rate | 25.0% (18/72) | 19.4% (14/72) |
| beam vs smart | beam pops lost to unrest / participation | 6.58 | 6.08 |
| beam vs smart | smart pops lost to unrest / participation | 7.36 | 7.35 |
| beam vs smart | riot resolutions / game | 13.92 | 11.08 |
| beam vs smart | season-33 survivor calm / discontent / unrest / revolt (cohort) | 54.5% / 13.6% / 20.5% / 11.4% (11 games) | 84.4% / 9.4% / 0.0% / 6.3% (8 games) |

The season-33 rows are survivor-cohort snapshots, not final-state aggregations.
The parenthesized cohort is the number of games that reached that season.

Promotion volume did not collapse: beam-versus-greedy tables moved from 12.0 to
12.2 promotions/game and beam-versus-smart tables from 33.8 to 31.7. The change
therefore acts primarily as risk discrimination rather than suppressing the
social ladder wholesale.

## Interpretation

The shared per-upkeep risk model is a material improvement over terminal linear
happiness. Beam doubled its wins against greedy in this sample, decisively beat
one-ply smart, and resolved fewer riots in both matchups. The season-33 survivor
snapshots are directionally calmer, but their differing cohort sizes make them
supporting context rather than terminal-state evidence. Focused fixtures
separately prove that smart and beam reject an unsafe promotion while retaining
the supported equivalent.

This does **not** complete the stronger historical success criterion. Beam still
trails greedy 16.7% to 27.8%, and its mean unrest deaths remain worse than
greedy's. No population weights were retuned to force that result. The remaining
gap may reflect other known evaluator/search limits, game balance, or sampling
noise and should travel as explicit Track A uncertainty.

These are four-player Classic-board results from one consecutive six-seed family
under named limited policies. They validate evaluator behavior, not whole-game
balance, Shuffled-board play, human strategy, or statistical superiority across
the full seed space.
