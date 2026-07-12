# Campaign — bank-rate derivation A/B (Phase 1 exit gate)

**Date:** 2026-07-12 · **Branch:** `feat/phase1-currencies` · **Question:** should the
bank's per-material rates be board-derived (`scarcity`) or flat (`uniform`)? (Q14 left
the default to data.)

## Setup

20 games × 200 turns per arm, greedy policy, standard mode, **same seeds (9000–9019)**.
Artifacts (byte-reproducible minus timestamps):

- `2026-07-12-bank-rates-scarcity.json` — derivation `scarcity` (classic board prices:
  wood 4→1g/2g · stone 2→1g/3g · food 3→1g/2g)
- `2026-07-12-bank-rates-uniform.json` — derivation `uniform` (all 3→1g/2g), via patch
  `{ "economy": { "bank": { "derivation": "uniform" } } }`

## Results

| Metric | scarcity | uniform |
| --- | ---: | ---: |
| Race closed before the deck | **11/20** | **10/20** |
| Closed-race final seasons | 13–29 (median ~20) | 13–25 (median ~19) |
| Seat win spread | 20–35% | 20–30% |
| bankSell / bankBuy per game | 2.6 / 486 | 3.0 / 489 |
| civicCalm / ventures per game | 36.6 / 85.7 | 37.1 / 85.4 |
| Riots rolled per game | 3.3 | 3.0 |
| Unrest shares (final season) | 81/6/11/3 | 80/8/10/3 |

## Verdict

**No measurable balance difference at bot level — keep `scarcity` as the default.**
The user's instinct (rates follow the board's supply) adds texture — every Shuffled
board gets its own price signature — at zero measured cost. `uniform` stays one knob
away for experiments.

## Exit-gate readings (both arms)

- **No dead currencies:** all 8 currency verbs fire (weakest: bankSell ~3/game,
  promotePop ~3/game — modest but alive; humans will use both harder than greedy does).
- **The riot table replaces random pop removal:** ~3 riots/game roll through the
  event-table seam, ~2.2 insurances declared.
- **The race survived the new economy:** 50–55% of bot games end by victory race
  (Phase 0 gate was 33–45%), landing seasons 13–29.
- Watch: bankBuy ~486/game is greedy's one-unit wood-buy rule churning — a bot
  artifact, not a rules problem. Venture wood-stake (8w ≈ 2–4g) is strictly better
  value than the 5g stake at bank prices — thematic (the rich pay more to gamble),
  but flag it in the ledger.

## Q13b note

The **scarcity arm is the saved post-bank baseline at current colony pricing
(20w+2f)** the Q13b protocol requires. The 14w+6g comparison re-runs these seeds
after the user's playtest read.
