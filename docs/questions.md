# Owner questions

Only unresolved owner decisions live here. Answer in chat or after `Answer:`; the
answer is then incorporated into the affected plan and this entry is removed.
Recommendations are defaults for discussion, not silent authorization.

Last updated: 2026-10-05.

## Q79 — Should settlements eat instead of pops, with food as a level?

**Context:** The owner's idea (2026-10-05). Today freemen and citizens each eat 1 food, slaves
eat nothing, food is a stock, and hunger takes one pop per unfed mouth. In the idea, pops eat
nothing; each settlement eats a fixed amount, for example 1 for a colony and 4 for a city. That
moves the food limit from growing pops to expanding: a new pop is free to feed, a new colony
or an upgrade is not. It also reopens the question Q77 settled for happiness: food can stay a
stock you bank, or become a level read off the board each turn, plains output plus food
buildings and Ideas minus what the settlements eat, never stored.

**Options:**

- **A. Keep today's rule.** Freemen and citizens eat, food is banked.
- **B. Settlements eat, food stays banked.** A colony eats 1 and a city 4 from the stock; the
  Granary, the Dole, the bank's food trades and food cards keep working as they do.
- **C. Settlements eat, food is a level.** Food = production − settlement upkeep, worked out
  each turn. A negative level is hunger: a fixed cost each turn until fixed, the way a riot
  follows a low happiness level. No stock means the Granary, the Dole, bank food trades,
  starting food and the ±2 food cards each need a new job, as the happiness cards did when
  the bank went.

**Recommendation:** C is the more interesting game and matches the happiness level, so the
board shows both numbers the same way. It is also the larger change: it touches hunger, the
Granary, the Dole, the bank, the player deck and every bot's food reserve. Write it up as a
short design note with numbers first, then test it as a sim condition beside today's rule
before adopting it. It does not block Steps 13 and 14, but hunger moments in Step 13 depend
on it.

**Research (2026-10-06):** [the Q79 note](reports/balance/2026-10-06-q79-food.md) recommends
neither switch: free pops keep eating and food stays a stock, but hunger is checked at the end
of the player's own turn, beside the riot check, instead of at income. In five 40-game
batches this cut pops lost to hunger from 2.7 to 0.6 a seat-game with expansion unchanged;
settlements eating cut colony founding by a third to a half and slaver wins to 8–10%.

**Answer:**
