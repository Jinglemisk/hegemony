# Low-number resource economy

Date: 2026-07-25
Status: evidence-backed prototype recommendation; not a change to the live rules

## Decision

Hegemony should test a low-number economy built from two linked conversions, not a
blanket division of every number:

1. Compress material and currency values by roughly 3:1.
2. Compress settlement population and capacity by roughly 2:1.

The concrete candidate in this report puts every printed land yield in the 1–3
range and every individual core action or building cost component in the 0–9
range. It preserves the current board topology, terrain rank, yield-versus-slot
trade-off, population classes, upkeep, building synergies, bank, events, riots,
ventures, Assembly, and victory race.

The candidate clears the arithmetic goal in simulation. In the matched 10-game
`smart` batch, the share of player-turn observations with any two-digit material
income fell from **71.7% to 9.9%**. The same batch produced four race wins and six
turn-cap games under both economies, while mean game length moved from 101.8 to
109.1 turns (+7.2%, with both samples censored by the 120-turn cap).

It is not ready to replace the default economy. Happiness remains an unbounded
track and becomes too positive under competent bots; stockpiles can still become
large even when transactions are small; the candidate event text has not been
rewritten; and no human playtest has validated feel or cognitive load. The right
next step is a selectable experimental mode and a controlled four-player playtest,
not a silent replacement of the standard rules.

## Authority and scope

The rules engine is the source of truth for this study:

- Tunable rules: `src/game/ruleset.ts`
- Terrain, buildings, actions, and event content: `src/game/data.ts`
- Income calculation: `src/game/economy/income.ts`
- Cost calculation: `src/game/economy/cost.ts`
- Assembly content: `src/game/assembly/`
- Headless simulation: `src/sim/`

`Hegemony.pdf` was explicitly identified as outdated and was treated only as a
historical artifact. It supplied no balance constants. Some prose documents also
lag the engine, especially opening-round assumptions, so all tables below were
generated or checked against TypeScript data.

The repository was synchronized before analysis. `git pull --ff-only origin main`
reported `Already up to date`; local `HEAD` and `origin/main` were both `beda1fe`.
Pre-existing edits to `package-lock.json` and `docs/roadmap.md` were preserved and
are outside this study.

## Work order and proof standard

The study used the following work order:

1. Establish the engine as authority and inventory every resource source, sink,
   multiplier, threshold, event, and victory dependency.
2. Measure the current terrain distribution, opening economy, population formula,
   building return, and second-order systems.
3. Run a seeded baseline with the named `smart` policy, then a deliberately poor
   `random` stress policy and a small `master` policy check.
4. Define low-number invariants before tuning values.
5. Implement the candidate in a simulator-only content overlay, leaving the live
   game unchanged.
6. Re-run matched seed families and board mode; reject iterations that broke pace,
   construction, legal progression, or arithmetic targets.
7. Keep raw JSON reports, add executable invariants, and state bot and sample-size
   limitations next to the verdict.

The evidence supports a prototype decision, not a claim that the game is globally
balanced. A seeded bot A/B can falsify obvious failures and compare arithmetic
scale. It cannot measure whether people find the turns clearer or the economy more
fun.

## Why the current economy reaches large values

The settlement income equation is additive:

```text
tile yield
+ pop base production
+ supported per-pop building bonuses
+ flat building bonuses
+ seasonal event and yearly omen
+ standing Laws and politician effects
- food upkeep and capacity/shortage pressure
```

The current system begins with six pops per player, permits ten pops in each city,
and places tile yields as high as ten under that additive formula. Buildings then
repeat production or add flat income. The issue is therefore structural rather than
a handful of overpriced actions.

Current land contains 37 tiles: 15 forests, 8 mountains, 8 plains, 5 yield-less
hills, and 1 unsettleable Oracle. Material land alone prints 106 yield points across
the board.

| Resource |      Current tile values | Tiles | Board total |
| -------- | -----------------------: | ----: | ----------: |
| Wood     |       1×1, 2×9, 3×3, 4×2 |    15 |          36 |
| Stone    |       2×3, 3×2, 4×2, 6×1 |     8 |          26 |
| Food     | 2×1, 4×3, 6×2, 8×1, 10×1 |     8 |          44 |

Population adds another uncapped-with-expansion layer:

| Pop     | Current recurring effect per pop          |
| ------- | ----------------------------------------- |
| Citizen | +2 gold, +1 influence, −2 food            |
| Freeman | +2 gold, −1 food                          |
| Slave   | +1 tile material, −1 food, −0.5 happiness |

The buildings then reward concentrating those pops. A Marketplace can add up to
six gold per turn; two Marketplaces can support six freemen. Two Workshops add six
primary material for six slaves. Two Villas add four more tile material. This is
good specialization grammar, but it is attached to a large base denomination.

The baseline confirms the result. Across 4,072 `smart` player-turn observations,
99.7% had at least one stock at 10 or more and 71.7% had at least one material or
currency income with magnitude 10 or more. Median gold income was 13 per turn and
its 90th percentile was 27.

Large stocks have a second cause: several bots generate more than their chosen
sinks consume. A small transaction scale does not by itself prevent hoarding.
That distinction matters: the design can make every decision use 1–9 without
pretending that a late-game treasury must also remain one digit.

## Design invariants

The candidate was tuned against these constraints:

- Every producing tile displays 1, 2, or 3.
- Every individual core action and building cost component is at most 9.
- Spendable resources remain whole numbers. The inherited half-step is confined to
  the happiness pressure from slaves.
- The same 37 tile identities, building slots, landmarks, hills, Oracle, adjacency,
  coast, and anti-proportional yield/slot ordering remain.
- Citizens, freemen, and slaves retain distinct outputs and food expenses.
- Pop-dependent buildings retain support limits; buildings do not scale forever.
- A player can afford one colony, not two, from opening wood in both economies.
- A player cannot immediately upgrade the opening colony in either economy.
- One opening citizen growth is affordable in both economies.
- Race cadence should remain within about 15% in matched, cap-censored bot batches.
- The standard game is not mutated by the study.

The important choice is the asymmetric conversion. Materials need roughly 3:1 to
reach Catan-like transaction sizes. Population cannot be divided by three without
erasing meaningful pieces, so capacity and setup use roughly 2:1 while most pop
output becomes one unit. Indivisible effects remain one rather than rounding to
zero.

## Proposed terrain yields

Each existing terrain tile keeps its identity and slots. Only its printed yield is
mapped:

| Resource | Current → candidate mapping | Candidate distribution | Board total |
| -------- | --------------------------- | ---------------------- | ----------: |
| Wood     | 1→1, 2→1, 3→2, 4→2          | 1×10, 2×5              |          20 |
| Stone    | 2→1, 3→1, 4→2, 6→3          | 1×5, 2×2, 3×1          |          12 |
| Food     | 2→1, 4→2, 6→2, 8→2, 10→3    | 1×1, 2×6, 3×1          |          16 |

The board total falls from 106 to 48. Rank is monotone, the quarry and breadbasket
remain best in class, and low-yield/high-slot land remains the development choice.
No gold is added to terrain.

## Proposed opening, settlement, and population system

| Lever                 | Current | Candidate |
| --------------------- | ------: | --------: |
| Starting wood         |      20 |         9 |
| Starting stone        |      10 |         5 |
| Starting gold         |      10 |         4 |
| Starting food         |      12 |         6 |
| Capital setup pops    |       4 |         2 |
| Colony setup pops     |       2 |         1 |
| Capital/city capacity |      10 |         5 |
| Colony capacity       |       4 |         2 |

| Pop     | Current growth cost | Candidate growth cost | Candidate recurring effect                |
| ------- | ------------------- | --------------------- | ----------------------------------------- |
| Slave   | 5 food              | 3 food                | +1 tile material, −1 food, −0.5 happiness |
| Freeman | 7 food              | 4 food                | +1 gold, −1 food                          |
| Citizen | 9 food + 2 gold     | 5 food + 1 gold       | +1 gold, +1 influence, −1 food            |

The slave does not need a production cut because +1 is already atomic. Its
effective scale is controlled by halving city capacity. Citizen influence also
stays +1 because influence has numerous one-unit thresholds and political uses;
gold and food upkeep are compressed.

## Proposed actions and buildings

| Action                 | Current                     | Candidate                 |
| ---------------------- | --------------------------- | ------------------------- |
| Found colony           | 20 wood + 2 food            | 9 wood + 1 food           |
| Upgrade colony to city | 30 wood + 10 stone + 5 food | 9 wood + 6 stone + 3 food |

| Building    | Candidate cost   | Candidate effect per copy                | Max copies per settlement |
| ----------- | ---------------- | ---------------------------------------- | ------------------------: |
| Marketplace | 6 wood           | +1 gold for 1 freeman                    |                         2 |
| Temple      | 5 stone          | +1 happiness; +1 influence for 1 citizen |                         2 |
| Workshop    | 6 wood           | +1 tile material for 1 slave             |                         2 |
| Granary     | 6 wood + 2 stone | +1 food; −1 food from growth cost        |                         2 |
| Forum       | 4 wood + 4 stone | +1 influence                             |                         2 |
| Aqueduct    | 7 stone          | +2 pop capacity                          |                         1 |
| Odeon       | 2 wood + 5 stone | +1 happiness                             |                         2 |
| Villa       | 6 wood + 2 gold  | +1 tile material                         |                         1 |
| Gymnasion   | 2 wood + 7 stone | −1 promotion cost                        |                         1 |

This is not simply current cost divided by three. A building with an indivisible
+1 effect needs a long enough payback to remain an investment. Copy limits also
move where halved capacity would otherwise make the old stack redundant. Aqueduct
and Villa fall to one; Granary falls from three to two; pop-support buildings keep
two copies but support one pop per copy.

The most extreme single-settlement synergy illustrates the compression. On the
current food-10 breadbasket, a full city with ten slaves, two Workshops, and two
Villas produces 30 food before upkeep and 20 after slave upkeep. The candidate
food-3 breadbasket has base capacity five. With five slaves and its best four-slot
production mix—two Workshops, one Villa, and one Granary—it produces 12 before
upkeep and 7 after upkeep. The specialization remains visible, but the normal net
result returns to one digit.

## Proposed bank, civic, event, and political values

| System                 | Current                                | Candidate                    |
| ---------------------- | -------------------------------------- | ---------------------------- |
| Bank baseline          | sell 3 material / buy for 2 gold       | sell 2 / buy for 2           |
| Abundant material      | sell 4 / buy for 2                     | sell 3 / buy for 2           |
| Scarce material        | sell 2 / buy for 3                     | sell 2 / buy for 3           |
| Civic calm             | +3 happiness for 4 influence or 6 gold | +2 for 2 influence or 3 gold |
| Promote slave          | 4 food                                 | 2 food                       |
| Promote freeman        | 4 gold                                 | 2 gold                       |
| Demote citizen         | 2 influence                            | 1 influence                  |
| Demote freeman         | 3 influence                            | 2 influence                  |
| Venture stake          | 5 gold or 8 wood                       | 2 gold or 3 wood             |
| Food-stock happiness   | +1 per 5 food, cap +2                  | +1 per 3 food, cap +1        |
| Food-deficit threshold | net food ≤ −2                          | net food ≤ −1                |

Assembly denomination changes:

| Assembly lever      |         Current | Candidate |
| ------------------- | --------------: | --------: |
| Standing Law cap    |               6 |         4 |
| First draw / redraw | 3 / 3 influence |     1 / 1 |
| Repeal              |     6 influence |         2 |
| Bribe               |    10 influence |         3 |
| Veto                |     5 influence |         2 |

First Assembly year, dominance, bribery/veto counts, and voting rules do not change.
Resolution and politician effects are transformed with the content, but Assembly
outcome readings are provisional: the roadmap already records a future redesign,
and bot parity around proposals and pivotal voting is incomplete.

One-shot resource transfers, action discounts, riot/expedition payouts, and
standing-Law thresholds use about 3:1 scaling with nearest rounding and a minimum
atomic magnitude of one. Happiness effects use about 2:1. Multi-pop steps and pop
awards use about 2:1. The symmetric yearly Omen remains ±1 because zero would remove
the system. Pop and building losses remain one because pieces are indivisible.

The 83-card player deck keeps its size and 21 harmful copies. Free-pop copies are
reduced to two New Citizens, two Free Settlers, and two Captured Laborers; removed
copies become the matching paid-growth coupons. Under the repository's own deck
valuation adapted to candidate growth costs, expected value is 57/83 = **0.687
candidate units per draw**, with **21/83 = 25.3%** harmful copies. That is close to
the current +2.2 value after the intended denomination change without making a free
pop disproportionately large.

The experimental transform changes effects, not card prose. A production mode must
rewrite the displayed amounts and Codex entries from the transformed content rather
than expose stale current-economy text.

## Proposed victory thresholds

| Victory metric     | Current | Candidate |
| ------------------ | ------: | --------: |
| Cities             |       3 |         3 |
| Pops               |      16 |         8 |
| Citizens           |       8 |         6 |
| Material stockpile |      80 |        40 |
| Happiness          |      10 |        10 |
| Political voice    |       2 |         2 |

Cities and Voice count game objects rather than currency and stay atomic. Population
halves. Citizens move less because six is the meaningful contest inside an eight-pop
minimum. Stockpile uses 40 rather than a mechanical 27: the stockpile card is a
pacing/hoarding objective, and 27 was too near the candidate opening stock of 24.
Happiness stays 10 pending a dedicated redesign of that track.

The candidate opening has three pops and 24 stockpiled materials/food/gold, so it
starts below every compressed minimum and cannot claim a card immediately.

## Matched `smart` evidence

Both batches used 10 games, 120 turns, shuffled boards, seeds 72600–72609, and the
same named `smart` policy.

| Measure                      | Current | Candidate | Reading                              |
| ---------------------------- | ------: | --------: | ------------------------------------ |
| Race wins / turn caps        |   4 / 6 |     4 / 6 | Same completion count                |
| Mean turns played            |   101.8 |     109.1 | +7.2%, cap-censored                  |
| Mean final victory cards     |    0.90 |      0.93 | Essentially flat at this sample size |
| Any holding ≥10              |   99.7% |     88.0% | Stocks still accumulate              |
| Any income magnitude ≥10     |   71.7% |      9.9% | Core arithmetic goal achieved        |
| Any negative spendable stock |    1.7% |      0.0% | Candidate floor invariant works      |
| Colony→city upgrades/game    |     0.7 |       2.3 | Upgrade path remains active          |
| Forced turn ends/game        |     0.6 |       1.0 | Watch the smart policy action loop   |
| Riots/game                   |    12.5 |       2.6 | Less bot self-destruction            |

The relative reduction in two-digit income observations is 86.1%. Exact income
distributions show where the cognitive gain comes from:

| Income    | Current median / p90 | Candidate median / p90 |
| --------- | -------------------: | ---------------------: |
| Wood      |               2 / 11 |                  2 / 7 |
| Stone     |               5 / 10 |                  2 / 5 |
| Gold      |              13 / 27 |                  3 / 6 |
| Food      |               −1 / 4 |                  0 / 2 |
| Influence |                3 / 8 |                  3 / 7 |

### Population result after the food-16 amendment

Across all 40 final player observations, rather than only games surviving to a late
season, candidate population increased substantially while resource p90s stayed
single digit:

| Population measure   | Current (setup 6) | Candidate (setup 3) |
| -------------------- | ----------------: | ------------------: |
| Final mean           |              8.55 |                6.40 |
| Final p10            |                 1 |                   1 |
| Final median         |                 8 |                   5 |
| Final p90            |                16 |                  13 |
| Net-growth mean      |             +2.55 |               +3.40 |
| Net-growth median    |                +2 |                  +2 |
| Net-growth p90       |               +10 |                 +10 |
| Finished above setup |             67.5% |               62.5% |
| Reached pop minimum  |             20.0% |               27.5% |

Net growth includes paid growth and event additions minus starvation and riot
losses. The existing telemetry does not yet separate those gross flows. Food 16
therefore achieves the requested higher-population shape, but it also shows why
uncapped per-pop +1 production will eventually recreate two-digit incomes in the
upper tail.

Candidate p90 holdings were 43 wood, 57 stone, 24 gold, 3 food, and 99 influence,
versus current values of 61, 126, 181, 4, and 128. Wood and influence demonstrate
why transaction scale and treasury scale must be judged separately. The `smart` bot
does not spend influence intelligently in the Assembly and can hoard it; the current
Treasurer objective also rewards stockpiling.

All major economic families remained reachable. Candidate construction per game
was Temple 8.4, Gymnasion 3.1, Granary 2.9, Marketplace 2.3, Odeon 1.4, Villa 1.0,
and Workshop 0.5. Forum and Aqueduct did not appear under this policy, but both did
appear in the 50-game random stress batch. Temple is clearly over-attractive and
should be the first building-specific A/B after a human session.

### High population without type or job slots

Owner decision, 2026-07-25: do not cap how many citizens, freemen, or slaves a
settlement may specialize in, and do not assign pops to productive job slots. A city
with five citizens or five slaves must remain a valid economic build when its tile and
buildings support that choice. The job-cap proposal is rejected.

Food 16 should be human-tested before adding another rule: it already raises final
population to mean 6.40, median 5, and p90 13 while every resource p90 income remains
2–7. If still more population is wanted, test these alternatives in order.

The leading arithmetic lever is **cohort yield**, a diminishing-return curve rather
than a type cap. For each pop class in a settlement, 1–2 matching pops produce one
base unit, 3–4 produce two, and 5 produce three. This is `ceil(count / 2)`, but the
city panel should print the 1/1/2/2/3 track so players never calculate division.
All five matching pops form the specialization, the fifth reaches its strongest base
tier, and matching buildings still add their bounded bonuses. With candidate values,
five freemen plus two Marketplaces produce five gold; five slaves on a yield-3 tile
with two Workshops and one Villa produce nine primary material.

The trade-off is that the second and fourth matching pop advance population, capacity,
and victory without immediately raising base income. If that cadence feels unsatisfying,
the more structural alternative is **settlement activation**: all pops retain full +1
production, but only one chosen settlement pays its complete net income on a turn. This
preserves spectacular five-pop specialist cities and limits the empire-wide sum, at
the cost of making additional settlements provide flexibility more than automatic
throughput.

A lighter third option is to keep +1 per pop but move more building synergies from
additive income into discounts, conversions, or action efficiency. That preserves
homogeneous cities, although aggregate income will still rise linearly with empire
population. Stronger sinks are not a solution to the arithmetic problem because they
reduce stockpiles only after the large income has been calculated.

None of these alternatives is part of Prototype B. The food-16 human playtest should
determine whether any further population/income decoupling is necessary.

## Sensitivity checks

The 50-game `random` runs are a structural stress test, not a model of rational play.
Both used 80 turns, shuffled boards, and seeds 72700–72749; all 50 games hit the cap
under both economies.

| Random-policy measure    | Current | Candidate |
| ------------------------ | ------: | --------: |
| Any holding ≥10          |   67.7% |     26.0% |
| Any income magnitude ≥10 |   16.1% |     0.01% |
| Absolute happiness ≥10   |   50.2% |     25.9% |
| Upgrades/game            |    0.02 |      0.24 |
| Riots/game               |   47.34 |     38.36 |

The candidate did not make nonsensical play economically healthy, but every building
family fired and the upgrade action became more accessible.

The stronger `master` check used three games, 80 turns, shuffled boards, and seeds
72500–72502. This sample is too small for a win-rate claim, but both economies
produced one race win and two caps. Mean turns were 65.3 current and 74.3 candidate;
two-digit income observations fell from 58.2% to 1.8%; upgrades remained 0.33 per
game; and Assembly influence spend fell from 104.7 to 37.7 per game, close
to the intended currency conversion.

## Unresolved findings

### Happiness is not solved

Happiness is a signed, cumulative track rather than a spendable resource, and the
candidate does not cap it. In the matched `smart` observations, the share with
absolute happiness at least 10 rose from 44.0% to 66.4%; candidate median was 13.5 and
p90 was 25. The three-game `master` check showed the same direction. Cheap civic
calm and the dual-purpose Temple are repeatedly selected.

A quick capped-track experiment was rejected as evidence because the bots evaluated
uncapped successor states and repeatedly paid for calm that the hook later discarded.
That tests an inconsistent engine, not a valid design. A proper follow-up must add a
bound or decay rule to engine state transitions, status previews, UI, and policy
evaluation together. A `−10…+10` bounded A/B is the leading hypothesis, but it is
not part of this recommendation until implemented coherently.

### Spendable resources need a floor

Standing Laws can create negative wood, gold, or influence in the current engine;
1.7% of matched current `smart` snapshots had a negative spendable stock. The
candidate study floors wood, stone, gold, and influence at zero after transitions,
while food remains allowed to go negative because shortage is an explicit mechanic.
Production implementation should make this an engine invariant and use the same
rule in previews and the ledger, not retain a simulator hook.

### Stocks will still show two digits

The candidate reduces the arithmetic performed each turn, not every number ever
shown. A player who saves for the stockpile card or fails to spend influence can
hold 20, 50, or more. An arbitrary storage cap would distort the victory race and
erase strategic saving. The UI should group or abbreviate large treasuries if they
remain hard to scan; it should not solve a display issue with an unexplained rule.

### Building mix still wants tuning

Temple dominates both `smart` and `master`, while Workshop and Odeon are rare under
`smart`. That may partly be policy valuation rather than content balance. The next
experiment should compare exact marginal payback and victory-card contribution for
Temple 5/7/9 stone and civic calm alternatives after human play exposes whether the
same preference exists at the table.

### Assembly results will become stale

The study compresses the Assembly that exists in the engine today. The roadmap
already records planned changes to political victory, rewards, Stratokles, and bot
behavior. Those changes require a new denomination pass and new simulation; the
Assembly numbers here are a coherent placeholder, not authority over that redesign.

## Implementation plan

If the prototype is approved, implement it as an explicit `low-number` game mode or
module. Do not copy the study's process-global mutation into the live server.

Engine work:

1. Register a serializable ruleset/content variant with copied terrain, buildings,
   events, tables, resolutions, and politicians.
2. Make non-food spendable stocks non-negative in the authoritative resource
   transition path.
3. Generate event and Codex text from active effect values or author variant text.
4. Add victory-minimum, deck-EV, terrain-distribution, building-cap, and extreme
   synergy tests for both modes.
5. Decide and implement happiness bounds/decay only as a separate coherent A/B.

Frontend work:

1. Surface the active economy mode in setup and the persistent game header.
2. Render active-mode costs and effects in action controls, tooltips, Codex, event
   cards, bank, Assembly, and victory cards.
3. Test ledgers and projections against engine breakdowns; no hardcoded default
   values may leak into candidate games.
4. Use one-unit tokens as the primary visual language and group large stockpiles
   without changing their value.

Simulation and AI work:

1. Add the mode to the normal CLI rather than relying on a one-process study entry.
2. Teach all policies the active happiness rule and non-negative stock invariant.
3. Re-run deck valuation against the active growth costs.
4. Record two-digit exposure, arithmetic operations, construction timing, first
   colony/city timing, and action affordability as first-class telemetry.
5. Re-run after the planned Assembly and bot-parity revisions.

## Human validation protocol

Run at least three four-player sessions: one current shuffled game, one candidate
shuffled game, and one candidate classic game. Rotate first player and avoid telling
players which economy is expected to be better.

Record:

- Turn time and number of arithmetic corrections during income and payment.
- First colony, first building, first grown pop, and first city-upgrade season.
- Turns where a player has legal choices but cannot identify an affordable plan.
- Building diversity per city and whether pop/building synergy is understood.
- Food shortage, riot, and civic-calm frequency.
- Victory cards held by season and final game length.
- Player ratings for legibility, satisfaction of rewards, scarcity, and planning.

Prototype acceptance requires a clear reduction in arithmetic mistakes and/or turn
time, no persistent action starvation, at least six of nine building families across
each table, and race pace broadly comparable to the current game. Happiness and
Temple behavior should be explicit interview questions.

## Reproduction

Current `smart` baseline:

```bash
npm run sim -- batch --games 10 --turns 120 --policy smart --seed 72600 --board shuffled --report output/hegemony-smart.json --csv output/hegemony-smart.csv
```

Candidate `smart` batch:

```bash
npx tsx src/sim/economyStudy.ts --games 10 --turns 120 --policy smart --seed 72600 --board shuffled --report output/hegemony-low-smart.json --csv output/hegemony-low-smart.csv
```

Replace the game counts, turns, policy, and base seed with `50 80 random 72700` for
the stress batch or `3 80 master 72500` for the stronger-policy check. The candidate
runner installs its isolated content once per process and floors non-food spendable
stocks before telemetry.

Evidence files:

- `2026-07-25-low-number-current-smart.json`
- `2026-07-25-low-number-candidate-smart.json`
- `2026-07-25-low-number-current-random.json`
- `2026-07-25-low-number-candidate-random.json`
- `2026-07-25-low-number-current-master.json`
- `2026-07-25-low-number-candidate-master.json`

The current JSON files add a `scale` block derived from their saved player-turn CSVs
using the same nearest-rank percentile definition as `src/sim/telemetry.ts`. Candidate
reports emit that block directly.

Executable study files:

- `src/sim/lowNumberEconomy.ts` — candidate rules and content transform
- `src/sim/economyStudy.ts` — seeded candidate runner and scale telemetry
- `src/sim/lowNumberEconomy.test.ts` — tile, cost, and opening invariants

## Limitations

- Ten `smart` games and three `master` games are too small for win-rate inference.
- Turn-cap observations censor mean duration.
- `smart` is a named limited policy, not a generic competent player. It over-promotes,
  does not plan Assembly spending, and can choose repeated low-value currency verbs.
- `master` is stronger but still lacks long-horizon saving, full rival modeling,
  chance expected value, and several expansion/Assembly capabilities documented in
  `docs/reports/audits/2026-07-23-ai-bot-parity.md`.
- `random` is only a failure/sensitivity probe.
- Shuffled setup is seeded, but the bots do not optimize opening placement like a
  human specialist.
- No simulation measures mental calculation time, table handling, or fun.

## Final recommendation

Adopt this exact package as **Low-number Prototype B** for an opt-in implementation
and human A/B. It is systemically coherent enough to test: land is 1–3, transactions
are mostly 1–9, population and capacity are compressed without removing their
roles, all major subsystems are denominated, construction and upgrading remain
active, and matched completion pace stays close.

Do not make it the default until the event/UI copy is mode-aware, spendable-resource
floors are authoritative, happiness is tested coherently, Temple dominance is
reviewed, and human sessions confirm that smaller arithmetic improves play rather
than merely changing the spreadsheet.
