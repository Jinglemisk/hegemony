# Hegemony simulation baseline — 2026-09-05

Branch `feat/luxury-topology` @ `4a9045a` (working tree; includes Phase 4 luxury Slice 1: Port building, luxury claims). No tracked file was modified. Everything below is in `scratchpad/sim/` (raw JSON reports, per-turn CSVs, hook JSON, per-condition analysis `.md`).

## Setup

| condition | policy | games | seeds | board | cap | content hash |
|---|---|---|---|---|---|---|
| standard / smart | `smart` | 10 | 91000–91009 | shuffled | 200 turns | `50a43928c630fedd` |
| standard / master | `master` | 3 | 91000–91002 | shuffled | 200 turns | `50a43928c630fedd` |
| low-number-core-v1 / smart | `smart` | 10 | 91000–91009 | shuffled | 200 turns | `9acb94fd76cba728` |
| low-number-core-v1 / master | `master` | 3 | 91000–91002 | shuffled | 200 turns | `9acb94fd76cba728` |

`master` is the strongest documented policy (smart economics + beam within-turn search + political Assembly play + settler frontier signal) but costs 160–300 s per game against 17 s for `smart`, so it got 3 games per ruleset rather than 10; treat its rows as a competence check, not a sample. `smart` is the 10-game workhorse, as in the July reports. The 200-turn cap was never hit: the seasonal deck runs out at season 33 (131 gameplay turns), so every game ends by the victory race or by deck exhaustion. Setup (8 placement turns) is excluded from all turn counts and from all per-turn shares. "Round" = season = one full cycle of four player-turns; 4 rounds = 1 year.

The CLI batch report does not carry per-player pop classes, per-player move counts, which victory cards were held, riot tiers, or per-draw event swings. A throwaway script (`scratchpad/sim/hook.mts`, imports `runGame` from `src/sim/runner` and hooks `onMove`/`onTurnEnd`) replays the identical games and records those; it was verified to reproduce every CLI game (same seed → same termination, turn, winner) in all four conditions, so the two sources describe the same games.

### Commands run

```bash
# timing probes (classic board, 1 game each): master 161 s, smart 17 s
npm run sim -- batch --games 1 --turns 200 --policy master --seed 91000 --report scratchpad/sim/timing-master.json
npm run sim -- batch --games 1 --turns 200 --policy smart  --seed 91000 --report scratchpad/sim/timing-smart.json

# the four batches (official report + per-turn CSV)
npm run sim -- batch --games 10 --turns 200 --policy smart  --seed 91000 --board shuffled --report scratchpad/sim/std-smart.json  --csv scratchpad/sim/std-smart.csv
npm run sim -- batch --games 10 --turns 200 --policy smart  --seed 91000 --board shuffled --tune-preset low-number-core-v1 --report scratchpad/sim/lnc-smart.json  --csv scratchpad/sim/lnc-smart.csv
npm run sim -- batch --games 3  --turns 200 --policy master --seed 91000 --board shuffled --report scratchpad/sim/std-master.json --csv scratchpad/sim/std-master.csv
npm run sim -- batch --games 3  --turns 200 --policy master --seed 91000 --board shuffled --tune-preset low-number-core-v1 --report scratchpad/sim/lnc-master.json --csv scratchpad/sim/lnc-master.csv

# per-player hook telemetry on the same games (scratchpad only, nothing in the repo)
node_modules/.bin/tsx scratchpad/sim/hook.mts --policy smart  --games 10 --turns 200 --seed 91000 --board shuffled --out scratchpad/sim/hook-std-smart.json
node_modules/.bin/tsx scratchpad/sim/hook.mts --policy smart  --games 10 --turns 200 --seed 91000 --board shuffled --tune-preset low-number-core-v1 --out scratchpad/sim/hook-lnc-smart.json
node_modules/.bin/tsx scratchpad/sim/hook.mts --policy master --games 3  --turns 200 --seed 91000 --board shuffled --out scratchpad/sim/hook-std-master.json
node_modules/.bin/tsx scratchpad/sim/hook.mts --policy master --games 3  --turns 200 --seed 91000 --board shuffled --tune-preset low-number-core-v1 --out scratchpad/sim/hook-lnc-master.json

# tables (one per condition): node scratchpad/sim/analyze.mjs <label> <report.json> <turns.csv> <hook.json>
```

Wall time: all eight runs in parallel on 8 cores, ~11 minutes.

---

## 1. Pace

| measure | standard / smart (10) | standard / master (3) | low-number / smart (10) | low-number / master (3) |
|---|---|---|---|---|
| gameplay player-turns, mean (min–max) | 103.7 (51–131) | 83 (55–128) | 90.7 (49–131) | 59.7 (33–94) |
| rounds, mean (min–max) | 26.4 (13–33) | 21.3 (14–33) | 23.3 (13–33) | 15.7 (9–24) |
| years, mean | 7.3 | 6.1 | 6.6 | 4.7 |
| ended by victory race / deck exhaustion / 200-turn cap | 8 / 2 / 0 | 3 / 0 / 0 | 9 / 1 / 0 | 3 / 0 / 0 |
| race-ended games: turns, mean | 96.9 | 83 | 86.2 | 59.7 |
| winner's cards at end, mean (3 needed) | 2.9 | 3 | 2.8 | 3.3 |
| seat win rate P0 / P1 / P2 / P3 | 40 / 30 / 30 / 0 % | 33 / 0 / 67 / 0 % | 10 / 20 / 20 / 50 % | 0 / 0 / 0 / 100 % |
| forced end-turns per game (bot hit the 30-action cap) | 2.7 | 2.0 | 0.4 | 0 |

Which cards the winner held at the end (games out of N; a race winner holds three):

| card | standard / smart | standard / master | low-number / smart | low-number / master |
|---|---|---|---|---|
| Demos (pops ≥ 16 std / 8 preset) | 9 | 2 | 7 | 3 |
| Civic Elite (citizens) | 8 | 2 | 6 | 3 |
| Treasurer (stockpile) | 6 | 2 | 6 | 2 |
| Beloved (happiness ≥ 10) | 4 | 1 | 6 | 1 |
| Polis Builder (cities ≥ 3) | 2 | 1 | 3 | 0 |
| Voice (authored passes) | 0 | 1 | 0 | 1 |

Reading. A standard game with `smart` bots lasts about 26 rounds (6–7 years, ~104 player-turns) and eight in ten end by the race; the other two run the seasonal deck out at season 33 and are decided by most-cards-plus-tiebreak. The preset shortens the race by 11–13% (smart) and the stronger bot shortens it further (master: 83 standard, 60 preset — it reaches three cards in 9–17 rounds under the preset). The winning hand is nearly always Demos + Civic Elite + one of Treasurer/Beloved: pops and citizens decide 8–9 of 10 smart games, Polis Builder decides 2–3 (colony→city is rarely taken, see §3), and Voice is never held by `smart` because it never proposes; only `master` claims it (1 of 3 games in each ruleset). Seat splits (P3 5/10 preset, P0 4/10 standard) are within noise at n=10 with no rotation.

## 2. Snowball

Leader-vs-laggard gap (median across games alive at that round; laggard floored at 1 for the ratio). Stockpile = wood+stone+gold+food; gross income = wood+stone+gold+max(food,0) per turn.

| round | pops ratio std/smart | pops ratio lnc/smart | stockpile ratio std/smart | stockpile ratio lnc/smart | income ratio std/smart | income ratio lnc/smart | games alive (std / lnc) |
|---|---|---|---|---|---|---|---|
| 5 | 1.43 (10 vs 7) | 1.50 (5 vs 3) | 2.57 (77 vs 28) | 2.13 (19 vs 7) | 1.48 (27 vs 18) | 2.00 (7 vs 4) | 10 / 10 |
| 10 | 1.56 (12 vs 7) | 1.67 (6 vs 4) | 2.73 (153 vs 60) | 3.38 (36 vs 9) | 1.56 (35 vs 22) | 2.25 (9 vs 3) | 10 / 10 |
| 15 | 1.88 (16 vs 8) | 2.00 (8 vs 4) | 2.20 (268 vs 111) | 4.14 (58 vs 12) | 1.80 (44 vs 28) | 2.25 (10 vs 4) | 9 / 9 |
| 20 | 1.70 (17 vs 10) | 2.00 (8 vs 3) | 2.39 (440 vs 172) | 5.83 (70 vs 12) | 1.64 (53 vs 33) | 2.24 (11 vs 5) | 9 / 6 |
| 25 | 2.17 (20 vs 7) | 2.67 (14 vs 5) | 2.34 (654 vs 232) | 6.31 (103 vs 13) | 2.13 (57 vs 29) | 2.67 (33 vs 9) | 7 / 5 |
| 30 | 3.00 (27 vs 9) | 2.00 (23 vs 11) | 2.32 (885 vs 382) | 3.69 (91 vs 16) | 2.47 (74 vs 35) | 3.33 (49 vs 18) | 3 / 3 |

Does the early leader win? (finished games; final rank = winner, then cards, happiness, pops)

| leader by … at round | std/smart leader wins | std/smart Spearman ρ | lnc/smart leader wins | lnc/smart ρ | std/master (3) | lnc/master (3) |
|---|---|---|---|---|---|---|
| pops @5 | 4/10 | 0.00 | 1/10 | −0.18 | 1/3 | 3/3 |
| pops @10 | 5/10 | 0.30 | 2/10 | −0.06 | 3/3 | 2/2 |
| stockpile @5 | 4/10 | 0.22 | 6/10 | 0.32 | 1/3 | 1/3 |
| stockpile @10 | 2/10 | −0.06 | 6/10 | 0.74 | 1/3 | 1/2 |
| income @5 | 3/10 | 0.06 | 4/10 | 0.44 | 1/3 | 1/3 |
| income @10 | 5/10 | 0.16 | 7/10 | 0.56 | 2/3 | 1/2 |

Eventual winner's pops vs the other three seats (mean, standard/smart): 8.5 vs 7.6 at round 5, 11.1 vs 9.5 at 10, 14.6 vs 11.0 at 15, 16.3 vs 13.1 at 25. Under the preset the eventual winner is *behind* the field on pops until round 15 (3.8 vs 4.2 at round 5, 5.0 vs 5.1 at 10).

Reading. Under standard rules the gap grows slowly and stays moderate: the pops leader has ~1.4× the laggard at round 5 and ~2.2× at round 25; income ~1.5× → ~2.1×; the stockpile gap is flat at ~2.3–2.7× all game (everyone hoards, the leader just hoards more). The round-5 leader wins 30–40% of finished games (chance 25%) and rank correlation is ≈0, so the early state does not lock the outcome — with these bots the standard game stays open into the 20s. The preset changes the shape: absolute numbers are small so the *relative* stockpile gap balloons (2.1× → 6.3× by round 25, laggard stuck at ~12 while the leader passes 100), and the income/stockpile leader at round 10 wins 60–70% with ρ 0.56–0.74. Under the preset the early pops leader is anti-predictive (1/10): bots that grow first lose pops to food deficit and unrest. Master (3 games) shows the pops leader at round 10 winning every game in both rulesets, which would be the "snowball" signature if it held at n=10.

## 3. Build diversity

Per player-game means (40 player-games for smart, 12 for master):

| measure | std/smart | std/master | lnc/smart | lnc/master |
|---|---|---|---|---|
| final citizens / freemen / slaves | 5.0 / 8.3 / 1.1 | 4.2 / 7.2 / 0.8 | 7.2 / 2.8 / 0.8 | 5.6 / 0.2 / 0.7 |
| class share of final pop (mean) | 35 / 57 / 8 % | 35 / 60 / 6 % | 75 / 15 / 10 % | 91 / 1 / 8 % |
| dominant class (player-games) | freemen 25, citizens 16, slaves 1 | freemen 9, citizens 4 | citizens 37, freemen 5, slaves 1 | citizens 12 |
| player-games ending with 0 slaves / 0 freemen | 60 % / 2.5 % | 67 % / 0 % | 60 % / 57.5 % | 50 % / 92 % |
| colonies founded | 7.13 | 4.00 | 3.85 | 1.42 |
| colonies standing at end | 7.7 | 4.6 | 4.3 | 2.4 |
| colony→city upgrades (player-games with ≥1) | 0.25 (7/40) · 1.0/game | 0.33 (3/12) · 1.3/game | 0.40 (12/40) · 1.6/game | 0 (0/12) |
| cities incl. capital at end | 1.3 | 1.3 | 1.4 | 1.0 |
| buildings built | 5.3 | 5.3 | 5.1 | 4.0 |
| growPop (citizens / freemen / slaves) | 1.4 / 4.3 / 2.8 | 1.2 / 2.8 / 2.3 | 2.4 / 3.2 / 1.8 | 0.9 / 1.4 / 1.4 |
| promote / demote | 8.8 / 5.5 | 5.8 / 6.0 | 5.0 / 0.7 | 5.0 / 0.25 |
| ventures (fundExpedition) | 24.4 | 19.3 | 13.0 | 6.9 |
| civic calm | 7.6 | 7.9 | 11.1 | 8.6 |
| bankBuy / bankSell | 97.6 / 0.15 | 77.3 / 0 | 22.3 / 0.65 | 10.1 / 0.17 |
| Assembly draws / proposals / bribes / vetoes | 0 / 0 / 0 / 0.3 | 4.5 / 4.3 / 0.7 / 0.75 | 0 / 0 / 0 / 0.3 | 3.3 / 3.3 / 0 / 0.3 |
| Assembly per game: proposals · laws enacted · authored passes · influence sunk | 0 · 4.4 · 0 · 6 | 17.3 · 9 · 9.3 · 106 | 0 · 4.1 · 0 · 2 | 13.3 · 7.3 · 9.3 · 16 |

Buildings built per player-game (share of player-games building at least one):

| building | std/smart | std/master | lnc/smart | lnc/master |
|---|---|---|---|---|
| temple | 1.20 (80 %) | 1.42 (75 %) | 2.15 (100 %) | 1.42 (100 %) |
| marketplace | 1.02 (75 %) | 1.17 (83 %) | 0.42 (25 %) | 0.08 (8 %) |
| granary | 0.95 (65 %) | 0.67 (42 %) | 0.70 (50 %) | 0.67 (58 %) |
| odeon | 0.90 (65 %) | 0.92 (58 %) | 0.30 (25 %) | 0.08 (8 %) |
| gymnasion | 0.82 (75 %) | 0.83 (67 %) | 0.63 (48 %) | 0.33 (33 %) |
| port (new, Phase 4) | 0.20 (20 %) | 0 | 0.45 (45 %) | 0.25 (25 %) |
| villa | 0.10 (10 %) | 0.25 (17 %) | 0.23 (23 %) | 0.50 (50 %) |
| workshop | 0.07 (8 %) | 0.08 (8 %) | 0.23 (20 %) | 0.67 (58 %) |
| forum | 0 | 0 | 0 | 0 |
| aqueduct | 0 | 0 | 0 | 0 |
| most-built building per player-game | temple 15, marketplace 9, granary 6, odeon 5, gymnasion 3, port 2 | temple 3, marketplace 3, granary 2, odeon 2 | temple 29, port 5, granary 3, marketplace 2 | temple 7, port 2 |

Reading. Forum and Aqueduct were never built in 26 games by any policy; Workshop and Villa are near-dead under standard rules (≤0.1 per player-game, 8–17% of player-games), which follows from slaves being 6–8% of the population — the slave/workshop/villa branch of the economy is not played. The bots converge: under standard, a freeman + marketplace + temple/odeon build (freemen 57–60% of pops, 25/40 player-games freeman-dominant, temple or marketplace the top building in 24/40); under the preset an all-citizen build (75–91% citizens, temple the top building in 29/40 smart player-games and every master game builds temples). The preset does revive Workshop/Villa a little (0.5–0.7 per player-game under master). Colony→city upgrade is not dead but thin: 1.0–1.6 per game with smart (17–30% of player-games ever upgrade), 1.3/game with standard master, and 0 in the three preset master games — the deeper-search bot still does not save for it, which is why Polis Builder decides so few games (§1). Expansion is wide rather than tall: 7 colonies founded per player-game under standard (7.7 standing at end, cities 1.3). Ventures are taken at nearly every opportunity (24/player-game ≈ one per 4 turns), bankBuy runs ~1 per turn under standard (97/player-game) with bankSell essentially unused, and the Assembly is only exercised by `master` (4.3 proposals per player-game, 9 laws enacted/game, 106 influence sunk/game standard) — `smart` only votes/passes.

## 4. Arithmetic load

Metric definitions follow the 2026-07-25/07-31 reports: share of gameplay player-turns where any of wood/stone/gold/food has |income| ≥ 10; stock ≥ 10 / ≥ 100 on any of those four.

| measure | std/smart (4,152 turns) | std/master (996) | lnc/smart (3,628) | lnc/master (716) | 07-31 report (smart, 120-cap) |
|---|---|---|---|---|---|
| any two-digit income term | **97.4 %** | 95.7 % | **13.6 %** | 1.7 % | 80.4 % → 11.6 % |
| any two-digit income term incl. influence | 97.4 % | 95.7 % | 14.6 % | 3.6 % | — |
| any stock ≥ 10 | 99.6 % | 99.8 % | 53.9 % | 33.4 % | 99.7 % (07-25) |
| any stock ≥ 100 | 42.9 % | 40.7 % | 2.5 % | 0 % | — |
| negative food stock | 30.0 % | 38.8 % | 20.4 % | 19.8 % | — |
| income median / p90: wood | 1 / 12 | 0 / 4 | 0 / 4 | −1 / 2 | 2 / 11 → 2 / 7 (07-25) |
| stone | 5 / 10 | 4 / 10 | 2 / 4 | 0 / 3 | 5 / 10 → 2 / 5 |
| gold | **23 / 38** | 23 / 32 | **4 / 11** | 4 / 7 | 13 / 27 → 3 / 6 |
| food | 0 / 5 | 0 / 4 | 0 / 4 | 0 / 2 | −1 / 4 → 0 / 2 |
| influence | 5 / 12 | 4 / 8 | 5 / 12 | 5 / 8 | 3 / 8 → 3 / 7 |

Stockpile per resource by round, median / p90 over player-turns in that round (`smart`, standard → preset):

| round | wood | stone | gold | food | influence |
|---|---|---|---|---|---|
| 5 | 10/20 → 1/8 | 6/26 → 3/8 | 19/40 → 5/8 | 0/4 → 1/3 | 23/40 → 17/26 |
| 10 | 20/26 → 2/14 | 23/57 → 6/24 | 38/103 → 7/12 | 0/2 → 1/2 | 51/84 → 42/57 |
| 15 | 20/45 → 3/14 | 47/116 → 11/48 | 72/185 → 7/15 | 0/3 → 0/2 | 77/128 → 72/90 |
| 20 | 30/76 → 4/27 | 82/150 → 11/59 | 155/305 → 8/29 | 0/5 → 0/11 | 107/193 → 96/152 |
| 25 | 32/147 → 7/44 | 112/186 → 11/69 | 231/454 → 8/79 | 0/7 → 1/19 | 127/263 → 131/227 |
| 30 | 71/161 → 3/32 | 147/208 → 18/74 | 373/654 → 9/179 | 0/6 → 1/13 | 147/303 → 192/338 |

Reading. Under standard rules essentially every turn carries a two-digit income term (97%; the July figure of 80% was censored at 120 turns and diluted by zero-income setup turns), driven by gold: median 23/turn, p90 38, max 74. Stocks compound without a sink — median gold 155 by round 20 and 373 by round 30 (p90 654), and 43% of all player-turns hold ≥100 of something; food is the only resource that stays small (and is negative on 30–39% of turns). The preset delivers what it promised on income (13.6% two-digit with smart, 1.7% with master; gold median 4, p90 11) and keeps median stocks ≤ 18 through round 30, but two tails remain: the p90 late-game stockpile still reaches 74 stone / 179 gold, and influence is untouched by the preset — the preset median influence at round 30 is *higher* than standard (192 vs 147) because the bots earn it and `smart` has nothing to spend it on. That matches the 07-25 warning that treasury scale and transaction scale need separate treatment.

## 5. Happiness

Happiness by round (raw `resources.happiness`, `smart`; Beloved minimum is 10, riot table at ≤ −5 unrest / ≤ −10 revolt):

| round | std: median (p10–p90) | std: share ≥ 10 | std: riot-at-risk | std: tier calm/disc/unrest/revolt | lnc: median (p10–p90) | lnc: share ≥ 10 | lnc: riot-at-risk | lnc: tier |
|---|---|---|---|---|---|---|---|---|
| 5 | 8 (2–13.5) | 37.5 % | 2.5 % | 93/5/2.5/0 | 10.5 (7–13) | 60.0 % | 0 % | 100/0/0/0 |
| 10 | 9.5 (3–19) | 48.8 % | 0 % | 97.5/2.5/0/0 | 16 (10–22.5) | 93.1 % | 0 % | 100/0/0/0 |
| 15 | 7 (−4.5–18) | 38.2 % | 8.3 % | 87/5/3/6 | 18 (9.5–29.5) | 88.9 % | 2.8 % | 97/0/0/3 |
| 20 | 2.5 (−9–14) | 24.3 % | 16.7 % | 73/10/8/9 | 16 (5.5–26) | 87.5 % | 4.2 % | 96/0/3/1 |
| 25 | 1 (−13–12) | 26.8 % | 23.2 % | 56/21/5/18 | 17.5 (1–25) | 75.0 % | 2.8 % | 93/4/3/0 |
| 30 | 0 (−16–14.5) | 22.7 % | 25.0 % | 57/18/5/21 | 12 (−10–24) | 77.1 % | 16.7 % | 83/0/10/6 |

`master`: standard median 5.5 → 4 → 4 → −7 (round 20, 50% riot-at-risk, 44% revolt tier) → −2.5 → −1.5; preset median 11 → 13.5 → 18 → 25 (round 20; p90 35.5, max 37.5), 100% calm at every checkpoint.

| per game | std/smart | std/master | lnc/smart | lnc/master |
|---|---|---|---|---|
| riots fired: unrest tier / revolt tier | 3.0 / 5.6 | 4.7 / 3.7 | 0.8 / 0.8 | 0 / 0 |
| riot insurance bought | 9.4 | 8.3 | 1.8 | 0 |
| civic calm bought (per player-game) | 30.3 (7.6) | 31.7 (7.9) | 44.3 (11.1) | 34.3 (8.6) |
| pops lost to unrest / starvation | 19.4 | 18.7 | 10.8 | 8.3 |
| player-games that never rioted | 21/40 | 8/12 | 36/40 | 12/12 |
| final happiness: median (p10 / p90 / max) | 1.5 (−7.5 / 17.5 / 34.5) | 6.5 (−2.5 / 26 / 26.5) | 16 (−8 / 24.5 / 41) | 16 (−3 / 32 / 41.5) |
| final share ≥ 10 / ≤ −5 | 25 % / 15 % | 50 % / 8 % | 85 % / 10 % | 75 % / 0 % |

Reading. Under standard rules happiness does not run away positive — it decays. The median falls from 8 at round 5 to 0 at round 30, the calm share drops from 93% to 57%, a quarter of late player-turns sit on the riot table, and 8.6 riots fire per game (5.6 of them revolt-tier) costing ~19 pops per game; only a quarter of player-turns after round 20 clear Beloved's minimum, yet someone still holds the card in 9/10 games because it needs only the sole leader ≥ 10. Under the preset the track does run away: median 16–18 from round 10 onward, 75–93% of turns ≥ 10, riots down to 1.6/game (0 under master, whose median reaches 25 with a max of 37.5 by round 20). So the low-number report's claim holds for the preset and not for the standard game; the preset's compressed costs make Civic Calm cheap relative to income and the bots buy it every third turn (11 per player-game vs 7.6 standard). Civic Calm is the bots' main happiness lever in every condition — more transactions than temples (30–44 per game vs 5–9 temples). Riot insurance is bought about as often as riots fire under standard (9.4 vs 8.6 per game).

## 6. Luck (player-event draws)

The engine records every draw (`events.player` counts by card, `choicePicks` per option). "Materially changes what the bot does" is not directly observable; the proxy is the resource/pop change the resolution causes versus that turn's income.

| per draw | std/smart (1,039 draws) | std/master (249) | lnc/smart (906) | lnc/master (178) |
|---|---|---|---|---|
| immediate wood/stone/gold/food/influence change | 53.1 % | 52.6 % | 54.4 % | 55.6 % |
| any immediate visible change (incl. happiness, pops, settlements) | 80.2 % | 80.3 % | 74.7 % | 75.3 % |
| deferred-only effect (timed happiness / discount coupon) | 17.2 % | 16.5 % | 22.5 % | 21.3 % |
| no measurable change on the player | 2.6 % | 3.2 % | 2.8 % | 3.4 % |
| material swing ≥ 50 % of that turn's |income| | **0.0 %** | 0.0 % | 1.9 % | 1.7 % |
| material swing ≥ 100 % of that turn's |income| | 0.0 % | 0.0 % | 0.7 % | 0.6 % |
| adds or removes pops | 15.2 % | 14.5 % | 8.9 % | 8.4 % |
| hurts (net material loss, pop loss, or happiness loss) | 20.6 % | 18.1 % | 19.9 % | 18.5 % |
| median non-zero material swing / median turn income magnitude | 3 / 33 | 3 / 31 | 1 / 8 | 1 / 7 |

Most frequent cards (standard/smart, draws; mean |material swing|; net pops): granary-rats 63 (1.4; 0), timber-windfall 55 (3; 0), stone-shipment 54 (3; 0), willing-hands 53 (0; 0, a discount coupon), free-settlers 52 (0; +1 pop), warehouse-fire 51 (−4.8; 0), local-unrest 48, good-stores 48 (3), citizenship-rolls 47, public-calm 47. Choice cards are picked lopsidedly and consistently: civic-petition 25/14 (std) and 25/9 (preset), caravan-contacts 6/20, emergency-labor 23/17 vs 12/26.

Reading. Roughly half of draws move a resource immediately, but the move is small: median 3 units against a 33-unit turn income under standard (no draw in 1,039 reached half a turn's income), and 1 against 8 under the preset (≤2% reach half). The draws that plausibly change a decision are the pop cards (15% standard, 9% preset — a free pop is worth 5–9 food of growth cost and moves the Demos/Civic Elite race) and the harmful fifth (warehouse-fire's −4.8 materials, granary-rats, local-unrest's happiness hit ahead of a riot roll). Under the preset the *relative* size of events roughly doubles (1/8 vs 3/33) because event amounts were compressed at ~3:1 but incomes fell further; a rewrite of event magnitudes was already flagged as outstanding in the 07-25 report. Event luck is therefore small in resource terms and mostly matters through pops and happiness timing.

---

## Limits of this evidence

Bot competence is the main limit. `smart` is a one-ply, board-static evaluator: it never draws or proposes in the Assembly (Voice is unreachable for it and influence piles up), takes a venture at nearly every legal opportunity, buys bank materials about once per turn under standard rules (97 bankBuy per player-game, bankSell ≈ 0), rarely upgrades a colony, and over-promotes into unrest late (the 07-18 finding); it hit the 30-action cap 2.7 times per game under standard. `master` is stronger (three-card wins in 55–66 turns, plays the agora, wins Voice) but at 160–300 s per game it got only 3 games per ruleset here — its rows show what a competent bot does, not a distribution. Neither bot plans across turns or models opponents, so the snowball and pace numbers describe bot-vs-bot play, not human play; in particular the "early leader does not win" result under standard could equally be read as "these bots cannot convert a lead". Sample size: 10 games per condition = 40 player-games; a win-share of 4/10 has a ±30-point confidence band, seat splits are not rotated, and every by-round table after round 20 is survivor-biased (6–9 games alive, then 3). Content: this branch carries Phase 4 luxury Slice 1 (Port, claims) and a different resolved content hash from the 07-31 campaign (`50a43928…`/`9acb94fd…` vs `06943b7d`), and the cap is 200 turns instead of 120, so absolute numbers are not directly comparable with the July reports even where the metric is the same (two-digit income 97% here vs 80% then). Not measured: per-turn income is the engine's projected next-turn income at each turn's end (`calculateIncome`), not the amount actually collected that turn; happiness is the raw resource, not the luxury-effective value Beloved uses; gross flows of pop growth vs loss are only partly separated (growPop counts vs `popsLostToUnrest`/`popsGainedFromEvents`); "an event changed the bot's decision" has no counterfactual in the telemetry and is approximated by swing-vs-income; and there is no human-feel measurement of any of this.
