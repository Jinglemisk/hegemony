# Archipelago, hop 4: a second block of seeds

Date: 2026-10-25. Code: `61fd729`, the head of #145 before it merged, with the bots of #144. One
batch on two workers at the lowest CPU priority, 10 minutes.

## Question

The [Archipelago batches](2026-10-25-archipelago-batches.md) found four masters on the islands
with island hopping at 4 winning 11 / 6 / 8 / 15 by seat, seeds 1000 to 1039, and left the seat
spread to a second block of seeds. Is seat 3's 15 and seat 1's 6 a pattern or noise?

## Data

Four masters, seeds 1040 to 1079, 56 turns, no National Ideas, the Archipelago board,
`{"placement":{"seaReach":4}}`. Files are in [the folder](2026-10-25-archipelago-seeds-1040/).

```bash
npm run sim -- batch --turns 56 --seed 1040 --jobs 2 --board archipelago --games 40 --policy master --without-ideas all --ruleset-patch hop4.ruleset.json --report archi-masters-hop4-seeds1040.json --csv archi-masters-hop4-seeds1040.csv
```

## Result

|                                         | Seeds 1000–1039 | Seeds 1040–1079 | Both, 80 games   |
| --------------------------------------- | --------------- | --------------- | ---------------- |
| Wins by seat                            | 11 / 6 / 8 / 15 | 13 / 9 / 11 / 7 | 24 / 15 / 19 / 22 |
| Ended by the race, by the clock         | 6, 34           | 7, 33           | 13, 67           |
| Won on a tiebreak                       | 9               | 14              | 23               |
| Pops lost to hunger a seat-game         | 0.71            | 0.57            | 0.64             |
| Influence a year, years 10 to 14        | 3.5             | 3.3             |                  |
| Year-5 income leader wins, rule ≤40%    | 14 of 31        | 7 of 29         | 21 of 60 (35%)   |
| Beloved held by the sole luxury leader  | 40% of 50 turns | 93% of 69 turns |                  |

- **The seat spread was noise.** Seat 3 falls from 15 to 7 and seat 1 rises from 6 to 9. Over 80
  games the seats win 24 / 15 / 19 / 22, where 20 each is even; seat 1's 15 is 1.3
  standard deviations low.
- **The runaway-leader rule passes over 80 games** (35% against a 40% limit), where it failed
  on Continental with the same bots (50%, from the last-colony-pick report).
- **Beloved swings** from 40% to 93% between the blocks. It is held on few turns, so neither
  block says much on its own.
