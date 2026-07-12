# Campaign — Q13b colony repricing, post-bank comparison

**Date:** 2026-07-12 · **Branch:** `feat/phase1-currencies` · **Protocol:** user's
(sim first, save, compare) — this is the comparison against the saved baseline.

## Setup

20 games × 200 turns per arm, greedy, standard mode, **same seeds (9000–9019)**:

- **Baseline** = `2026-07-12-bank-rates-scarcity.json` (foundColony 20 wood + 2 food)
- **Repriced** = `2026-07-12-colony-repricing-14w6g.json` (14 wood + 6 gold + 2 food,
  patch `{ "actionCosts": { "foundColony": { "wood": 14, "gold": 6, "food": 2 } } }`)

## Results

| Metric | baseline 20w+2f | repriced 14w+6g |
| --- | ---: | ---: |
| Settlements/player, season 17 | 10.24 | 11.25 (**+10%**) |
| Settlements/player, final | 12.07 | 12.93 (+7%) |
| Race closed before the deck | 11/20 | 9/20 |
| Riots rolled per game | 3.2 | **5.7 (+78%)** |
| Riot-tier share (mean across seasons) | 4.9% | 6.5% |
| bankBuy per game | 486 | 313 (gold pays colonies directly) |
| Seat-win spread | 20–35% | 10–**50%** (seat 0 spike, n=20) |

## Reading

1. **The bank already did the job.** Pre-bank, this same repricing bought +32%
   mid-game expansion; post-bank it buys +10%. Gold→wood conversion at the bank
   absorbed most of the wood bottleneck on its own — baseline expansion has roughly
   **doubled** vs the pre-bank era (6.35 → ~12 settlements/player; the map now
   effectively fills, heavy colony-sharing included).
2. **The old warning still holds, amplified:** repricing on top of the bank mostly
   buys extra riots (+78%) and a worse seat spread, not meaningfully more map.
3. **Recommendation: HOLD foundColony at 20w+2f.** The two-birds goal (gold sink +
   wood relief) is delivered by D6 alone. Revisit only if the human playtest feels
   cramped — and note the *opposite* watch item now exists: post-bank expansion may
   be too loose (the designed tempo brake got a lot softer). Both belong in the
   Phase 2 terrain-rework conversation (gold-tile removal re-check).

**Decision stays with the user (Q13b remains OPEN).**
