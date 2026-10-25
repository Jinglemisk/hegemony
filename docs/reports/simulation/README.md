# Simulations

The headless simulator (`npm run sim`) drives the pure rules engine so we can play,
auto-play with bots, and run seeded batches that produce balance reports — no UI, fully
reproducible. This folder is the **experiment log**: each campaign's writeup plus the raw
JSON reports it produced.

## Where the sim docs live

| Doc                                                                 | What it is                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **[Simulation reference](../../reference/simulation.md)**           | The command reference — every `sim` subcommand, flag, and report field. Read this to _run_ a sim.                   |
| **[AI reference](../../reference/ai.md)**                           | How the bots work: the policy seam, determinism contract, evaluators, and tuning loop. Read this to _change_ a bot. |
| **[Archived forward plan](../../archive/notes/simulation-plan.md)** | The historical balance/tuning tracks that produced these reports.                                                   |
| `YYYY-MM-DD-*.md` + `.json`                                         | The experiment log below — a dated writeup and the batch report(s) it drew from.                                    |

## How an experiment is recorded

A campaign is: a **question**, a **seeded batch** (or before/after pair), and a **writeup**
that states the verdict and links its `.json` report(s). Reports are byte-reproducible from
their seed, so anyone can regenerate or extend one. New experiments go here as
`YYYY-MM-DD-<topic>.md` next to their reports.

```bash
# the general shape (see ../../reference/simulation.md for the full surface)
npm run sim -- batch --games 50 --turns 300 --policy smart --seed 9000 --report docs/reports/simulation/2026-mm-dd-topic.json
```

## Experiment log

| Date       | Campaign                                                        | Verdict / finding                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-25 | [Archipelago, hop 4: a second block of seeds](2026-10-25-archipelago-seeds-1040.md) | Seeds 1040 to 1079 give 13 / 9 / 11 / 7 by seat, so the first block's seat 3 at 15 was noise: over 80 games the seats win 24 / 15 / 19 / 22. The year-5 income leader wins 21 of 60, under the 40% limit that Continental fails with the same bots. |
| 2026-10-25 | [Archipelago batches: hop 4 against any shore and Continental](2026-10-25-archipelago-batches.md) | Archipelago with island hopping at 4 works: 80 games finished without a forced turn, and no seat or build stands out beyond the noise of 40 games (masters by seat 11 / 6 / 8 / 15, mixed 12 / 10 / 10 / 8). The islands build more cities than Continental (2.36 against 1.99 a seat). On the same islands hop 4 gives fewer cities and temples than any shore; more gold, trade and Ports lean its way but do not clear the noise. Nothing argues against Q81's hop 4. |
| 2026-10-25 | [The last colony pick](2026-10-25-last-colony-pick.md) | Seat 0's second plains (37 of 40) was a bot bug: without an Idea draft its colony was scored after year 1 opened, with the gameplay forecast. Fixed in #144. Four masters without base income then win 7 / 10 / 11 / 12 by seat, where they won 4 / 8 / 9 / 19. With 1 base food seat 0 keeps its lead: 16 / 4 / 11 / 9. |
| 2026-10-25 | [Archipelago generator: 1,000 boards and the sea-rule test](2026-10-25-archipelago-generator.md) | The seeded generator lays the 37-tile deck as 6 to 9 islands in 3 or 4 groups; over 1,000 seeds no board broke a limit, none needed the fallback, and every seat got a legal start. By the bots' placement score, every limit on founding across water makes the first capital pick worth more. Island hopping at 4 hexes keeps it nearest Continental's worth while cutting each seat's reach from the whole coast to about 11 sites. |
| 2026-10-24 | [Balance lines: fifteen batches on the shuffled board](2026-10-24-balance-lines.md) | On the live game's shuffled board the trader's hunger, Beloved's link to luxuries and seat 1's slump mostly go: they came from the classic board's fixed starts. Base food is the setting behind most recurring problems. At 0, 1 and 2 a settlement the trader wins 10, 16 and 28 of 40, and influence grows 2.5, 5.3 and 11.5 a year. Bots never stock food to sell, whatever the price. Raising Treasurer's minimum to 60 or 100 costs the trader two wins of 40: it wins the same games on the happiness tiebreak instead. A gold sink makes it stronger. Seat 0's first capital pick is worth 17 of 40 wins among four masters. |
| 2026-10-22 | [Player trade: the paired batches](2026-10-22-trade-paired.md) | Four masters and the rotated table, each with the bank, with trade, and with trade and base food. Every material goes from the seat that makes most of it to the one that makes least. Base food, not trade, ends the food shortage: turns begun short fall by three quarters. It leaves influence growing about 10 a year, and on the rotated table the trader's gold piles up with nothing to spend it on: it wins 23 of 40 while still starving. |
| 2026-10-19 | [v1 against v2](2026-10-19-v1-vs-v2.md) | Slaves went from 6–8% of pops to 50% because of the rules: a v2 slave is the yield and eats nothing. Gold income fell from a median 23 a turn to 1–2 because v2 cut gold sources. 29.5% of turns start below zero food (median 2). Race wins became deck endings because of the 56-turn clock. The level sits at −2 because nothing pays above zero. Led to base food, no bank, and the development deck. |
| 2026-10-10 | [v2 sim parity audit](2026-10-10-v2-sim-parity-audit.md) | Four read-only auditors matched the bots and the batch report against every v2 PR: 13 bugs and 88 gaps. The trader's 15% and the games ending by the deck are largely the bots' doing, and several of Step 11's rules cannot be computed from the report. Steps 18 and 19 fix it before Step 11 runs. |
| 2026-10-04 | [v2 AI reach audit](2026-10-04-v2-ai-reach-audit.md) | Every action and content item counted per personality; one bot bug fixed (Directives scored only their prize). |
| 2026-10-02 | [v2 Step 4: the bank and food](2026-10-02-v2-step4-bank-and-food.md) | With calm as a one-turn bonus the bank slides: the riot table opens on 15% of player-turns (19% without the food-stockpile bonus), against 5% in Step 3. Banking calm brings it back to 5%. Hunger is the bots: in 97% of hunger events the seat held gold, influence or an idle plains slot that would have covered it. |
| 2026-09-05 | [shallow-economy baseline](2026-09-05-shallow-economy-baseline.md) | Standard vs Lower Numbers, 200-turn cap: two-digit income 97%→14%, but happiness runs away under the preset, the relative leader gap balloons 2.3x→6.3x, builds converge to citizens; Forum/Aqueduct never built in 26 games. |
| 2026-07-31 | [low-number core v1](2026-07-31-low-number-core-v1.md)          | Shared 84% preset passes: matched `smart` two-digit income falls 80.4%→11.6%, race duration moves −2.5%, and all configured floors hold.                                          |
| 2026-07-27 | [riot-aware evaluator](2026-07-27-riot-aware-evaluator.md)      | Per-upkeep nonlinear risk doubles beam's greedy-match wins (8%→17%) and cuts riots, while beam still trails greedy; against smart it rises 25%→42%.                               |
| 2026-07-25 | [low-number resource economy](2026-07-25-low-number-economy.md) | Prototype B compresses land to 1–3 and core costs to one-digit components; matched `smart` income exposure ≥10 falls 71.7%→9.9%, with happiness and human validation still gated. |
| 2026-07-12 | [bank-rate derivation A/B](2026-07-12-bank-rates-ab.md)         | `uniform` vs `scarcity` bank rates — no measurable difference; scarcity kept for board texture.                                                                                   |
| 2026-07-12 | [Q13b colony repricing](2026-07-12-colony-repricing-q13b.md)    | Colony cost comparison after the bank changes.                                                                                                                                    |
| 2026-07-13 | [deck overhaul A/B](2026-07-13-deck-overhaul-ab.md)             | Before/after the event-deck rework (ledger issues 5/10/12).                                                                                                                       |
| 2026-07-13 | [victory minimums](2026-07-13-victory-minimums.md)              | Victory-card minimums vs the thinner deck — candidate thresholds.                                                                                                                 |
| 2026-07-18 | [greedy vs smart](2026-07-18-greedy-vs-smart.md)                | The Phase-2-aware `smart` bot vs `greedy`; surfaced that smart over-promotes into unrest.                                                                                         |
| 2026-07-18 | phase2 terrain (`.json`)                                        | Raw reports from the Phase-2 terrain-economy tuning.                                                                                                                              |
| 2026-07-19 | [beam vs baselines](2026-07-19-beam-vs-baselines.md)            | Beam search beats one-ply `smart` and upgrades colonies, but loses to `greedy` — **the evaluation, not the search, is the ceiling.**                                              |

## Trust notes (post-audit, 2026-07-19)

Since the sim-audit fixes (PRs #29/#30), reports are trustworthy: `winRate` counts **finished
games only** (`terminations` gives the denominator), turn counts have no deck-exhaustion
off-by-one, force-ended turns are surfaced (`forced`), and `--board`/`--tune-patch`/`--seats`/
`--rotate` let a batch represent real games and A/B any lever. Reports from **before** July 19
predate those fixes — read their win-rate/turn figures with that caveat.
