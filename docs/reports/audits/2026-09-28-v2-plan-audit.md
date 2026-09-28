# Independent audit of the v2 migration plan

Date: 2026-09-28. One independent agent, read-only on a clean checkout of `main` at 08ea043. Its recommendations and the owner's calls on them are folded into [the plan](../../plans/v2-migration.md).

**1. Verdict**

Proceed, with specific changes. The direction is right and the engine's architecture can carry it, but the plan builds the expensive shell before the cheap proof, the Step 11 gate cannot measure what it asks, and several v2 rules have holes to close before Step 3.

**2. The current engine in brief**

- **Architecture is the strong part.** One command function for every action, a pinned ruleset per match, engine-derived legal moves, byte-identical replay. That makes a ruleset swap feasible, and v2 keeps it.
- **Depth** comes from the six-card victory race (checked at your own turn start, so the table gets a round to respond, victory.ts:160), the class ladder, and the map (terrain, printed yield, slots, coast).
- **Needless complexity:** three cost pipelines, Laws that adjust income terms, coupons, per-pop scaling, capped building support where a second Marketplace often adds 0 (economy/income.ts:436-446), half-point happiness (ruleset.ts:251).
- **Broken: the food debt.** Food has no floor (ruleset.ts:277, actions.ts:328), and the shortage penalty reads the whole projected negative stock every turn (income.ts:250-259, 289), so one deficit is charged again each turn. I reran the baseline (smart, 10 games, seeds 91000+, shuffled; it reproduced the report exactly), then changed one value, `stockpileFloors.food = 0`:

| Measure | Baseline | Food floored |
| --- | --- | --- |
| Riots per game | 8.6 | 4.1 |
| Riot-tier share of turns, v1 year 5 on | 16.9% | 9.2% |
| Pops lost per game | 19.4 | 15.1 |

  In the unmodified run, 66% of riot-tier turns had negative food, against 24% of calm turns. About half of "the bank slides" is this bug.
- **Dead:** luxury suppression (luxury.ts:109), politician power, Forum and Aqueduct in practice (never built), and Voice for the default smart bot.
- **Bot artifacts, not game facts.** Bank and venture moves are hard-coded rules outside the search (sim/policies.ts:69-145), so "never sells" and "a venture every turn" are policy. Smart scores influence by stock, not income (policies.ts:620), so it cannot see what a Forum is worth. Pop weights are constants (policies.ts:538).

**3. Gains**

- **Legibility, convincingly.** One price per verb, income read as counts on printed values, about 40 card faces in four verbs, Laws that change a rule. The paper's §5.11 read counts follow from structure, not tuning.
- **The food spiral and half-point happiness go:** hunger as a count, food never negative, a whole-number bank. Real, though a one-line fix gets half the riot benefit today.
- **Clock:** about 26 rounds become 14, which fits 45–90 minutes.
- **Colony→city becomes structural** through the piece supply (today about one upgrade per game).
- **Prices stop stacking:** flat prices and at most one price Law end zero-price stacks and the three pipelines.
- **Assembly:** Voice as a level and a sitting every other year remove the ratchet and cut sitting time.

**4. Losses**

- **Map texture.** Printed yields go, including the breadbasket (10 food) and the quarry (6 stone). Colonies have no slots, so colony sites differ only by terrain and coast. Placement flattens a lot; §4's "a plains city feeds five" describes the withdrawn fields model. Worth partly recovering.
- **Interaction.** Shared colony tiles and eviction go, and trade is a non-goal. Contact shrinks to the land grab, the Port race, the Assembly and the card race.
- **Sunk work.** Step 1 deletes about 30k lines of UI. From scope, I estimate half the engine's rule modules get rewritten (seasons, omen, events, coupons, cost pipelines, Law interpreter, house Laws, veto, five buildings, shared tiles). The architecture survives, so this is acceptable.
- **Cards:** little lost. Per the deck audit, one of eight choice cards was a real choice.

**5. Wrong or unaddressed**

- **Deliberate starvation pays.** Hunger costs one pop of your choice whatever the deficit. F Marketplace freemen fed from the bank cost 2F gold a turn; starving costs one slave (about 4 gold to regrow), which also eases unrest. From about three freemen up, starving is cheaper. Arithmetic, not simulated.
- **Last-seat snipe.** With victory checked at year end, the last player in a year can take a third card and win with no reply. The paper's "the table always gets the year" is false for that seat; today's turn-start check has no such hole.
- **The paper's evidence overreaches.**
  - The Lower Numbers preset gives a citizen everything a freeman yields plus 1 influence, at the same food (dev/tuningPresets.ts:43-44). The 75–91% citizen convergence is a preset error, not proof that scaling fails.
  - "Pop thresholds at 18 and 20 the game never reaches": 9% and 6% of player-turns reach them in my rerun.
  - §5.2 feeds a citizen city from a plains colony with an Estate, but §5.4 gives colonies no slots.
- **Trade.** The paper calls it load-bearing (Principle 4, §10); the plan makes it a non-goal. A bank round trip loses 5 of 6 units. If a specialized build fails Step 11, "rework the column" may treat a trade problem as a column problem.
- **Luxuries.** Uncapped, they turn Beloved into mostly a luxury count, the unbreakable card §5.10 rejected. Only tokens and Blockade break it.
- **Cards depend on tokens that may never exist.** Plague, Festival, Local Unrest, Public Calm and The Streets Burn place or clear tokens, which exist only in the level model deferred to Step 12. The shell mock already shows the level (riot −3, revolt −6).
- **Unstated:** how slaves ÷ 2 rounds, riot thresholds under the clamped bank, whether the capital is a city piece, starting stock and pops, first-seat rotation.
- **Inferred:** cities top out at 3–4 and standing Laws at 4, so sole-leader cards will often tie and go unheld. With votes at one per seat plus citizens, 6 citizens (7 votes) outvote three rivals with setup citizens (6), so Civic Elite and Voice arrive together.
- **National Ideas are still v1-shaped:** "every Season" (5), a veto v2 removes (12), per-pop scaling (1), gold upkeep (2).

**6. The delivery plan**

- **Shell first reverses the paper's own §9.** Tier 0 (a preset on the same seeds) is skipped. Steps 1–2 are likely the costliest (layout round 1 alone cost about 6M tokens) and wire a v2-shaped UI to v1 verbs, then rework it at every later step. The real bet is tested at Step 11 of 15.
- **Interim batches only prove legality:** Steps 3–9 run bots with v1-tuned constants and no personalities.
- **Gate thresholds.**
  - Influence at 1.5× from year 10 to 14 passes a pile that never stops growing: constant income from zero gives 1.4×. Today's influence grows about 20 a year (31, 73, 112, 147 at years 2, 4, 6, 8) and would pass.
  - The draw rule cannot pass with the paper's own cards: ±2 is under half of a 6–10 income.
  - Personalities: three in four seats need `--rotate`, and telling 20% from 45% takes about 60 games per condition (the baseline admits ±30 points at 10). Smart never proposes, so civic cannot reach Voice without the political scorer; bank moves sit outside the evaluator, so trader cannot trade. The rule measures weight fit, not build viability.
  - Missing: snowball and legibility rows (both in paper §9) and scenario tests for degenerate lines.
- **The baseline comparison can't be reproduced.** Its class and draw metrics came from a scratchpad hook not in the repo, and new boards and decks mean the same seeds won't give comparable games.
- **Long-lived branch.** The old shell goes at Step 1, so there is no in-app A/B, the merge is all at once, and there is no rule for stopping if several gate rows fail.

**7. Recommended changes, ranked**

1. **Prove the systems before the shell.** Build Steps 3–6 engine-first with bots and minimal UI, run an interim gate on 60+ rotated games, then do Steps 1–2.
2. **Rebuild the gate.** Measure influence as absolute net growth from year 10 to 14. Size the draw rule to the cards or drop it. Add snowball rows (round-5 leader win rate, leader-to-laggard ratio) and reads per decision. Build personalities on the political scorer with bank moves in the search. Commit the telemetry hook.
3. **Close the rule holes before Step 3.** Scale hunger with the deficit (one pop per unfed mouth, or unfed pops produce nothing). Keep the turn-start victory check. State the rounding, the bank thresholds and the capital-piece rule.
4. **Pick the happiness model now:** build the level at Step 5, as the mock assumes, or write every card without tokens.
5. **Re-run the baseline with the food floor**, so v2 isn't credited with fixing a one-line bug.
6. **Rewrite the National Ideas in v2 terms** before Step 9.
7. **Recover some map texture** (for example, landmark tiles with extra capacity), and re-cap luxuries or cap their share of Beloved.

Scratch evidence: the audit scratch folder (not kept) (baseline and food-floor reports and CSVs).
