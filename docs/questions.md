# Owner questions

Only unresolved owner decisions live here. Answer in chat or after `Answer:`; the
answer is then incorporated into the affected plan and this entry is removed.
Recommendations are defaults for discussion, not silent authorization.

Last updated: 2026-10-26.

## Q84 — Two balance-check rules: a hunger limit, and the stock ratio

**Context:** The balance check's [first report](reports/simulation/2026-10-26-balance-check.md)
ran its rules from the [player trade plan](plans/player-trade.md#the-balance-check) on three
batches: four masters on Continental and on Archipelago, 60 games each, and the mixed table, 160
games. Two rules need an owner decision before the next run. Hunger is recorded with no limit,
and the stock ratio fails on every table.

**Options:**

- **(a) Hunger.** Pops lost to hunger a seat-game: the trader 5.36 on the mixed table, the other
  personalities 0.10 to 1.11; four masters 0.48 on Continental and 0.55 on Archipelago.
  - A: set a limit, such as a number of pops lost a seat-game.
  - B: call hunger a bot matter and keep recording it with no limit.
- **(b) The stock ratio.** The rule asks that the year-10 leader hold at most 2.5 times the
  laggard's stock of wood, stone, gold and food. It reads 5.0× and 7.0× on the masters tables
  and 17.1× on the mixed table. The laggard holds a median 1 to 3 units, since v2 realms spend
  what they earn, so the ratio reads an empty store.
  - A: keep it as written.
  - B: measure pops instead. The leader holds 1.6× the laggard's pops on both masters tables
    and 2.2× on the mixed table; the v1 baseline read 1.56× at round 10.
  - C: drop it and keep the year-5 income leader rule alone.

**Recommendation:**

- **(a) B.** The trader holds gold (Treasurer at the end of 113 of 160 games) and still starves.
  That is the bot not buying food with gold it has, a gap the
  [trade report](reports/simulation/2026-10-22-trade-paired.md) already found. The other builds
  lose under 1.2 pops a seat-game.
- **(b) B, with the same 2.5× limit.** Pops do not run down to zero the way stocks do, and the
  baseline recorded them too, so v1 and v2 compare. All three tables would pass today.

**Answer:**
