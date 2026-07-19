# Greedy vs. Smart — deep A/B (Phase 2 strategic layer)

100 games each · 60 player-turns · seed 9000 · **classic board** (identical boards/decks/openings
for both bots — the only variable is the policy). Reports: `2026-07-18-greedy-vs-smart-greedy.json`,
`2026-07-18-greedy-vs-smart-smart.json`. The `smart` policy (src/sim/policies.ts) weights pops by
tier, materials by role, and prices building slots + Gymnasion synergy.

## Headline
Phase 2's strategic layer is **reachable and economically real — but it is not yet the winning
line.** The smart bot genuinely plays the new game (climbs the ladder, builds the Phase-2 buildings,
pivots to an influence economy), yet that citizen path currently **loses the race** to naive colony
sprawl: slower to 3 cards, fewer cards, ~2× the unrest deaths. The mechanics work and matter; they
just don't out-compete going wide under today's numbers. A balance signal to chase, not a validation
that the ladder pays.

## The numbers (greedy → smart)

| dimension | greedy (old) | smart (new) |
| --- | --- | --- |
| Race-wins (held 3 cards) | 15% | 11% |
| Median turns to a race-win | 48 (season 13) | 56 (season 15) |
| Final victory cards (mean) | 0.72 | 0.63 |
| Settlements/player (cities+colonies) | 1.0 + 6.55 = **7.56** | 1.0 + 3.27 = **4.28** |
| Pop tier mix (cit / free / slave) | **0.5% / 83% / 16%** | **42% / 50% / 8%** |
| Banked influence (final) | 10 | **52** |
| Influence income/turn | 0.1 | **4.1** (food income runs −1.1) |
| promotePop / demotePop per game | 2.3 / 8.96 | **15.94 / 2.80** |
| gymnasion / villa per game | 0.00 / 0.02 | **1.54 / 0.23** |
| popsLostToUnrest per game | 8.03 | **17.18** |
| Steady-state calm / revolt share | 86% / 3% | 68% / 4% |
| Seat win-rate spread | 21 pts | 13 pts |

- **Composition, not hoard.** Banked material is similar (154 vs 142); smart trades gold-sprawl for
  influence and *rank* — 42% citizens vs greedy's ~0. It ends with fewer pops (38/game vs 51) but a
  far higher tier.
- **Over-promotion is destabilizing.** Smart promotes faster than its food/happiness can support:
  food at the starvation edge (~0 to −0.4/turn), happiness ~10 vs 17, unrest deaths doubled, riot
  hits up (resolveRiot 6.6 vs 2.2). Hard to separate "bot over-promotes" from "ruleset under-rewards
  citizens" from bot data alone.
- **Neither bot upgrades colony→city** (max 2 cities; only 1/400 player-rows > 1 city). The whole
  colony→city path is untouched — worth a look.
- No crashes (100/100 clean). One artifact: greedy's by-rule bankBuy re-fires ~320×/game (telemetry
  noise, not a loop).

## What this feeds
- **The smart bot is now the instrument** that makes the ladder/buildings visible in sim — use it for
  the end-of-run **buildings** and **market** balance passes (todo.md).
- **Open balance question it surfaced:** is the citizen/ladder line *meant* to trail colony sprawl, or
  are citizens under-rewarded (and/or is colony founding too cheap)? And why does nobody build a 2nd
  city? Candidates for the tuning panel: citizen income, promote costs, Gymnasion strength, colony
  price, upgrade price.

## Caveats
One-ply heuristic bots, not skilled play; classic board only; single seed family (9000); pop-composition
from 4 fixed-opening games/policy vs the 100-game random-opening batches. Read as directional.

The pop-tier mix and banked-influence/material figures above come from the separate 4-fixed-opening
run, NOT the two stored 100-game `.json` batches — those reports don't carry per-tier composition or
influence fields, so those specific numbers can't be regenerated from them alone.
