# Policy-placed openings vs the uniform draw

Date: 2026-08-22

## Question

Does placing capitals and founding colonies with the shared placement evaluator
(`--opening policy`, now the default) give playtests and batches a sane start, compared
with the uniform draw over legal placements (`--opening random`) that both the sim and
the browser's dev auto-opening used before? Plan: `docs/archive/plans/policy-placement.md`.

Board fairness is out of scope by owner ruling (2026-08-22): the question is whether
each seat's start is one a competent player would choose on the board as dealt.

## Method

- Seeds 73000–73009, `smart` play, 60-turn cap, classic and shuffled boards: four
  batches of ten games, `policy` vs `random` openings, otherwise identical. Content hash
  `00a5902980d7c4d5`, no ruleset patch. The JSON reports sit beside this file and
  record `meta.opening`.
- Opening quality measured directly on the same 80 seat-openings per board with
  `buildNewGame`, before any play.

## Results

### The openings themselves

| Board    | Opening  | Capitals on yield-less tiles | Mean capital yield | Mean capital slots | Capitals with any slaves | Coastal founding colonies |
| -------- | -------- | ---------------------------: | -----------------: | -----------------: | -----------------------: | ------------------------: |
| classic  | `policy` |                         0/40 |                7.0 |                2.3 |                     0/40 |                     30/40 |
| classic  | `random` |                         2/40 |                3.0 |                1.8 |                    28/40 |                     33/40 |
| shuffled | `policy` |                         0/40 |                7.2 |                2.1 |                     0/40 |                     34/40 |
| shuffled | `random` |                         7/40 |                2.4 |                1.9 |                    26/40 |                     33/40 |

The uniform draw seats one capital in nine on a hill or the oracle's rim with no yield
at all, and averages a yield of 2.7; the evaluator seats every capital on yielding land
at 7. On the classic board seat 0 takes the food-10 breadbasket, seat 1 the food-8
plain, and the rest the food-6 and food-4 plains — the order a human would pick.

The evaluator never splits slaves into a capital. That is `evaluateSmart`'s verdict
(citizens weigh 3, slaves 1.2, and slave income scales the tile's resource type, not its
amount), not a placement rule; it is the same valuation the bots play by.

### Sixty turns of `smart` play from each opening

| Board    | Opening  | Finished | Mean turns | Cards/game | Seat spread (mean cards) | Per-seat mean cards   | Pops lost to unrest/game | Colonies/game | Builds/game |
| -------- | -------- | -------: | ---------: | ---------: | -----------------------: | --------------------- | -----------------------: | ------------: | ----------: |
| classic  | `policy` |     2/10 |       54.5 |       2.90 |                     0.60 | 1.1 / 0.6 / 0.7 / 0.5 |                      5.9 |           9.7 |        17.1 |
| classic  | `random` |     0/10 |       60.0 |       2.30 |                     0.40 | 0.6 / 0.4 / 0.5 / 0.8 |                     13.1 |          10.0 |        16.4 |
| shuffled | `policy` |     0/10 |       60.0 |       2.30 |                     0.30 | 0.7 / 0.4 / 0.5 / 0.7 |                      8.9 |          14.7 |        17.5 |
| shuffled | `random` |     2/10 |       59.5 |       2.20 |                     0.60 | 0.5 / 0.5 / 0.2 / 0.8 |                     13.2 |          10.7 |        16.4 |

Pops lost to unrest fall by a third to a half under policy openings on both boards —
the clearest sign that random starts were starving seats on barren capitals. Colonies
founded rise on the shuffled board (14.7 vs 10.7 per game); cards and builds move
slightly up. Ten games per cell is too few to read the finish counts or the seat
spread as more than direction.

On the classic board the seat spread widens under `policy` (0.60 vs 0.40) and both
finished games went to seat 0, which always holds the breadbasket. That is the
authored board's unevenness showing through competent play, and it is expected:
fairness was declined, not deferred. On the shuffled board the spread narrows.

## Conclusion

`policy` openings are sane where `random` ones were not, at ~0.4 s of placement
search per game. The default flips to `policy` for the sim (`new`, `auto`, `batch`)
and the browser dev auto-opening; `random` stays as the chaos baseline. Earlier dated
reports were produced with `random` openings and stay valid as historical evidence;
batches from here on name their opening in `meta.opening`.

`CONTEST_WEIGHT` stays at 1. On these seeds the rival-contested term rarely changed a
pick (the exclusion radius and yield ordering decide most placements), so a weight
sweep would have measured noise; revisit if later seats visibly crowd earlier ones.
