# Deck overhaul A/B — before vs after (ledger issues 5/10/12)

**Date:** 2026-07-13 (overnight run, item 1) · **Setup:** 20 games × greedy, seeds
9000–9019, standard mode, both arms on identical seeds. Reports:
`2026-07-13-deck-overhaul-{before,after}.json` (40 turns). A 60-turn spot-check ran
on the same seeds for the close-rate verdict (not saved — numbers below).

## The change

- Free-pop copies halved: New Citizen 8→4, Free Settlers 8→4, Captured Laborers 6→3.
  Removed copies became **grow coupons** (`actionCostDiscount` on the new `growPop`
  target): Citizenship Rolls ×4 (−5f −1g on next citizen), Willing Hands ×4 (−4f
  freeman), Slave Auction ×3 (−3f slave). Coupons expire end of turn and re-couple
  windfall population to food + capacity + the growth throttle.
- Windfalls shrunk to +3 (Timber/Merchant/Stone were +5, Good Stores stays 3f).
- New harm cards: Granary Rats ×5 (−3f), Banditry ×3 (−4g), Warehouse Fire ×4 (−5w),
  Quarry Collapse ×2 (−3s −1h); Civil Discord 2→3. Losses clamp at zero.
- Dominated choices repriced: Caravan Contacts B → 4 wood→6 gold (ratio 1.5, floored);
  Skilled Mason discount −3→−5 stone; Temple Donation discount −3→−5 stone;
  Forest Crews colony discount −4→−6 wood.
- Seasonal deck: Spring Floods ×2 (spring, all lose 3 food) and Wildfire ×2 (summer,
  −2 wood income) — no season is auto-safe anymore (guarded by test).

**Tuning contract** (guarded by `src/game/deck.test.ts`): EV per draw **+2.20**
(was ≈ +4.9 on the same valuation), harm share **25.3%** (21/83 copies, was 8%).

## Results (same seeds, 40 turns)

| Metric (season 11) | Before | After | Read |
| --- | --- | --- | --- |
| Pops mean | 11.0 | 9.8 | free-pop faucet halved — intended |
| Food mean | 2.8 | 3.6 | coupons couple growth to food, hoards breathe |
| Happiness mean | 11.5 | 12.7 | fewer slaves from windfalls |
| Revolt share | 3% | 0% | riot pressure eased |
| resolveRiot /game | 1.4 | 0.8 | same |
| Victory cards mean | 0.6 | 0.5 | race a touch slower |

**Close-rate (60-turn spot-check, same seeds):** games closed 3/20 → 1/20; leader
victory-cards mean 1.85 → 1.75. Leader progress is within noise — **no collapse**.
Close events are rare at greedy-bot skill in both arms; the race pace question is a
victory-minimums question, not a deck question.

## Verdict

Shipped. The deck stops being a second income stream (+4.9 → +2.2 EV) and a draw is
now a real moment (1-in-4 harm). Race pace dipped slightly with the thinner economy.

**Watch (filed in OVERNIGHT.md morning questions):** victory-card minimums (citizens
8, stockpile 80, happiness +10) were tuned against the richer deck — if playtests
feel grindy, retune minimums rather than re-fattening the deck.
