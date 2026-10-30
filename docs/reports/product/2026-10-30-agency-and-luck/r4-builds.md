# Builds, agency and luck: the simulation evidence

Evidence reviewed through 2026-10-30. The latest full balance batches are dated 2026-10-26. No files were changed and no simulations or tests were run.

The strongest current finding is that the builds face different risks. The slaver pays in riots. The trader pays in hunger despite winning most often. The civic depends on influence and standing Laws. Master spreads its investments but still has limited planning.

The evidence does **not** establish which random event most often changes the winner. It measures immediate draw swings, build outcomes and some leader persistence. Those are different questions.

**What the builds actually represent**

Slaver, civic and trader use master’s search with different preferences. They share the same trade routine and Assembly handler. Buildings have no separate personality bonus: their output, happiness and use of slots determine their value. Sources: [src/sim/policies.ts:125](../../../../src/sim/policies.ts#L125), [src/sim/policies.ts:2718](../../../../src/sim/policies.ts#L2718), [docs/reference/ai.md:71](../../../../docs/reference/ai.md#L71).

| Build | Priorities | Systems it leans on | Systems it gives less weight |
|---|---|---|---|
| **Slaver** | Working slaves, wood, stone, cities and colonies | Estates, productive slots, expansion, cheap population growth; happiness spending that permits more slaves | Citizens, freemen, standing Laws and high happiness |
| **Civic** | Citizens, influence, stone, standing happiness and authored Laws | Forums, Temples, the Dole, Ideas and Voice | Gold production and slave growth beyond what its happiness supports |
| **Trader** | Freemen, gold and luxury claims | Marketplaces, Ports, Treasurer, Beloved and happiness at the final tally | Citizens beyond its protected last citizen, influence production and authored Laws |
| **Master** | A broader mix, with citizens preferred over freemen and slaves | Economic buildings, political standing, expansion and saving toward purchases | No special commitment to one production class |

These are preferences, not restrictions. The current trader preserves its last citizen; an older version routinely demoted it and then lacked influence, another Idea and a second vote. That old failure is no longer a description of the current bot. Sources: [src/sim/policies.ts:113](../../../../src/sim/policies.ts#L113), [docs/reference/ai.md:260](../../../../docs/reference/ai.md#L260).

The other policies are instruments for narrower comparisons:

| Policy | Main distinction |
|---|---|
| `random` | Chooses an action type, then a command within that type |
| `greedy` | One action ahead, using a simpler population and material score |
| `smart` | One action ahead, with class, material, slot and luxury values |
| `beam` | Smart’s score with search up to four actions deep |
| `political` | Adds the value of standing authored Laws |
| `settler` | Adds the next expansion frontier |
| `master` | Combines political standing, frontier value, beam search and saving toward purchases |

Current non-random policies share an Assembly handler. Older reports in which smart never proposed Laws describe historical bot behavior. Sources: [docs/reference/ai.md:21](../../../../docs/reference/ai.md#L21), [docs/reference/ai.md:304](../../../../docs/reference/ai.md#L304).

**The latest build results**

The **2026-10-26** mixed batch is the best available comparison: Continental, no bank, no base income, seven luxury goods, all Ideas, 160 games covering 40 seeds and four seat rotations. Its current economy matches the engine’s defaults. Sources: [docs/reports/simulation/2026-10-26-balance-check.md:3](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L3), [src/game/ruleset.ts:284](../../../../src/game/ruleset.ts#L284).

All figures below are from that **2026-10-26** report. Sources: [docs/reports/simulation/2026-10-26-balance-check.md:79](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L79), [docs/reports/simulation/2026-10-26-balance-check.md:92](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L92).

| Build | Wins | 95% interval | Wins on a tiebreak | Distinguishing result |
|---|---:|---:|---:|---|
| Slaver | 41/160, **26%** | 18–34% | 2 | Holds the largest year-10 stock in 124 of the 152 games measured |
| Civic | 30/160, **19%** | 12–26% | 15 | Holds Voice at the end of 53 games and Civic Elite in 50 |
| Trader | 55/160, **34%** | 26–43% | 29 | Holds Treasurer at the end of 113 games; 25 wins use the happiness tiebreak |
| Master | 34/160, **21%** | 15–28% | 13 | No clear failure or advantage at this sample size |

No personality crosses the owner’s 45% flag. Civic’s result is below the 20% benchmark, but its interval includes it. This supports continued investigation, not a finding that the builds are equally strong.

The costs behind those wins matter:

- **Slaver:** riots on **20% of its turns from year 8**, although the mixed table passes the pooled riot benchmark at 9%.
- **Trader:** loses **5.36 pops to hunger per seat-game**, against 0.10–1.11 for the other builds. The report records 846 freemen lost.
- **Civic:** influence grows **6.3 a year** between years 10 and 14; master grows 5.5, against the mixed table’s pooled 2.5.

These are **2026-10-26** figures. A pooled pass conceals the build-specific problems. Source: [docs/reports/simulation/2026-10-26-balance-check.md:54](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L54).

One further qualification: the current bot now forecasts likely Law repeals. The checked batch predates that behavior. The code identifies growth under Grain Levy followed by its repeal as a cause of trader hunger. There is no later full-batch report establishing the resulting win rates or hunger losses. Sources: [src/sim/policies.ts:1955](../../../../src/sim/policies.ts#L1955), [docs/reference/ai.md:166](../../../../docs/reference/ai.md#L166).

**Which older findings still travel**

| Report date and conditions | Finding | How to use it |
|---|---|---|
| **2026-10-25**, Continental, no bank/base income, mixed table, 40 games | Wins: slaver 13, civic 10, trader 10, master 7 | Relevant economy, smaller sample and earlier goods configuration. The 2026-10-26 batch supersedes its build ranking |
| **2026-10-25**, Archipelago **hop 4**, mixed table, 40 games | Wins: slaver 15, civic 10, trader 9, master 6 | Historical island result. It does not establish the ranking under current hop 3 and seven goods |
| **2026-10-24**, shuffled board, **1 base food per settlement** | Wins: 7 / 6 / 16 / 11. At **2 base food**, trader wins 28/40 | Evidence that feeding freemen cheaply can strengthen the trader sharply; these are removed rules |
| **2026-10-22**, classic board, bank → trade → trade plus base food | Wins move 9/10/9/12 → 8/10/13/9 → 3/4/23/10 | Useful separation of trade and food supply. The last arm’s trader dominance is not a current-rule win rate |

Sources: [2026-10-25 no-base-income report:64](../../../../docs/reports/simulation/2026-10-25-no-base-income.md#L64), [2026-10-25 Archipelago batches:127](../../../../docs/reports/simulation/2026-10-25-archipelago-batches.md#L127), [2026-10-24 balance lines:142](../../../../docs/reports/simulation/2026-10-24-balance-lines.md#L142), [2026-10-22 trade batches:89](../../../../docs/reports/simulation/2026-10-22-trade-paired.md#L89).

Board choice changes the diagnosis. Under the **2026-10-24 base-food rules**, moving from classic to shuffled reduced trader hunger from 3.28 to 1.13 pops per seat-game. Beloved’s association with the sole luxury leader fell from 88% to 52%. These figures should not be carried into today’s economy, but they show why a board effect must be separated from a rule effect. Source: [docs/reports/simulation/2026-10-24-balance-lines.md:96](../../../../docs/reports/simulation/2026-10-24-balance-lines.md#L96).

The apparent last-seat advantage without Ideas was also partly a bot mistake. The **2026-10-25** placement fix changed equal-master seat wins from **4/8/9/19 to 7/10/11/12**. It corrected only the bot’s evaluation of the last setup colony. Source: [docs/reports/simulation/2026-10-25-last-colony-pick.md:34](../../../../docs/reports/simulation/2026-10-25-last-colony-pick.md#L34).

July–September conclusions about unused Forums, freeman-heavy economies, happiness accumulation and colony sprawl belong to v1 or its Lower Numbers preset. They are historical design evidence. They are not current building balance findings. The **2026-10-19** comparison attributes the later slave share chiefly to the rules: slaves became the tile’s production and stopped eating. Sources: [2026-09-05 baseline:137](../../../../docs/reports/simulation/2026-09-05-shallow-economy-baseline.md#L137), [2026-10-19 comparison:33](../../../../docs/reports/simulation/2026-10-19-v1-vs-v2.md#L33).

**Where luck enters the result**

The current year deck contains a fixed set of fourteen cards in hidden order. In a full default game, the uncertainty is their timing, rather than whether Drought or Piracy exists in the game. Player events reshuffle after their pile is spent. Sources: [src/game/data.ts:343](../../../../src/game/data.ts#L343), [src/game/events.ts:12](../../../../src/game/events.ts#L12).

The **2026-10-26** resource-card swing is substantial relative to the smaller economy:

| Table | Median resource-card swing against income collected that turn | 90th percentile |
|---|---:|---:|
| Continental, four masters | 22% | 50% |
| Archipelago, four masters | 22% | 50% |
| Continental, mixed builds | 18% | 50% |

Source: [docs/reports/simulation/2026-10-26-balance-check.md:65](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L65).

This statistic covers cards that actually moved a resource. Pop and Unrest-token cards have separate counters. It does not measure changes in winning chances, the next decision, or the lasting value of a free pop. Source: [src/sim/telemetry.ts:195](../../../../src/sim/telemetry.ts#L195).

The strongest build-exposure inference is that **threshold crossings matter more than a card’s printed amount**:

- Losing food production can remove freemen or citizens when the turn ends.
- Losing influence can remove access to the Dole as well as political spending.
- Losing luxury happiness can cause a riot or revolt.
- A happiness change can decide the final tally even without taking Beloved.

Those connections follow from the engine’s hunger, unrest and tally rules. Sources: [src/game/economy/income.ts:277](../../../../src/game/economy/income.ts#L277), [src/game/ruleset.ts:274](../../../../src/game/ruleset.ts#L274), [src/game/unrest.ts:38](../../../../src/game/unrest.ts#L38), [src/game/victory.ts:175](../../../../src/game/victory.ts#L175).

Timing also changes the available answer. A Granary built after income protects later collections; it does not replace food already missing this turn. Building mutates the settlement, while collection happens at turn start. Sources: [src/game/actions.ts:301](../../../../src/game/actions.ts#L301), [src/game/actions.ts:339](../../../../src/game/actions.ts#L339).

**Runaways and comebacks**

On **2026-10-26**, the year-5 income leader won **37%** of eligible Continental master games, with a 24–50% interval, and **42%** on Archipelago, with a 28–57% interval. Neither settles a sharp 40% threshold. Both tables exclude National Ideas. Source: [docs/reports/simulation/2026-10-26-balance-check.md:54](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L54).

The same report’s year-10 stock ratios—**5.0×, 7.0× and 17.1×**—mostly reflect the poorest realm holding very little. Population ratios are **1.6×** on each master table and **2.2×** on the mixed table. The stock ratio is therefore poor evidence for a catch-up mechanic by itself. Source: [docs/reports/simulation/2026-10-26-balance-check.md:102](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L102).

There is no current measured comeback rate from last place, and no event-by-event count of reversals. A year-5 non-leader winning does not establish a comeback: it may have led on citizens, happiness or Laws throughout.

Small samples have already produced misleading patterns. In the two **2026-10-25 hop-4 Archipelago** blocks, seat 3 won **15/40**, then **7/40**. Beloved’s association with the sole luxury leader moved from **40% to 93%**, on few held turns. Source: [docs/reports/simulation/2026-10-25-archipelago-seeds-1040.md:23](../../../../docs/reports/simulation/2026-10-25-archipelago-seeds-1040.md#L23).

**Build and system connections**

The connections below are current-rule inferences unless a dated measurement is stated.

| Build | Strong connections | Conflicts and exposure |
|---|---|---|
| **Slaver** | Estate raises working-slave output to 2. Slave Colonies supplies a slave on founding. Frontier Spirit supplies another founding grant | Manumission triples slaves’ unrest count. Guild Charter stops colony growth. Land Reform supplies food on any terrain but forbids new Estates and replaces the normal terrain resource |
| **Civic** | Forum raises citizen influence to 2. Civic Tradition supplies 2 separate influence each income. Public Dole reduces food’s price to 2 influence. Sacred Fields makes Temples supply 2 food | Ostracism wipes the citizen influence column, including the Forum’s raise. Forum Rites already sets citizen output to 2, so a Forum adds nothing to that output while it stands. Repeals can remove both food support and Voice progress |
| **Trader** | Marketplace raises freeman gold to 2. City Pioneers supplies a freeman on upgrading. Grain Levy removes freeman food upkeep. Tenant Rights lets gold pay growth costs | Grain Levy also idles Marketplaces. Its repeal restores upkeep to every freeman. Piracy wipes the freeman gold column. Gold cannot buy food automatically under the current economy |
| **Master** | Can combine slave production, citizen-funded food and expansion | Shares each source’s exposure. Its broader preferences do not provide a plan to change builds across several turns |

Sources: [src/game/data.ts:225](../../../../src/game/data.ts#L225), [src/game/nationalIdeas.ts:3](../../../../src/game/nationalIdeas.ts#L3), [src/game/assembly/deck.ts:5](../../../../src/game/assembly/deck.ts#L5), [src/game/assembly/deck.ts:90](../../../../src/game/assembly/deck.ts#L90), [src/game/assembly/deck.ts:156](../../../../src/game/assembly/deck.ts#L156), [src/game/economy/income.ts:451](../../../../src/game/economy/income.ts#L451).

A production building increases concentration in the same vulnerable source. For example, four **working** plains slaves with an Estate supply 8 food that Drought removes. Five freemen with a Marketplace supply 10 gold that Piracy removes. Three citizens with a Forum supply 6 influence that Ostracism removes. These are arithmetic examples, not simulated averages. Year cards remove the building’s raise with the class column. Source: [src/game/economy/income.ts:148](../../../../src/game/economy/income.ts#L148).

Granaries and Good Harvest provide separate food income. Civic Tradition provides separate influence income. Those are useful existing hedges against the relevant class-column shocks. Sources: [src/game/data.ts:255](../../../../src/game/data.ts#L255), [src/game/nationalIdeas.ts:3](../../../../src/game/nationalIdeas.ts#L3), [src/game/economy/income.ts:264](../../../../src/game/economy/income.ts#L264).

Luxury happiness benefits two different plans: it permits more slaves before unrest, and it improves standing happiness for Beloved and the final tally. Each good supplies 2 happiness; every two slaves remove 1. Civic calm supplies 2 temporary levels but is excluded from Beloved and the final happiness tally. Sources: [src/game/ruleset.ts:301](../../../../src/game/ruleset.ts#L301), [src/game/happiness.ts:41](../../../../src/game/happiness.ts#L41), [src/game/happiness.ts:111](../../../../src/game/happiness.ts#L111), [src/game/victory.ts:178](../../../../src/game/victory.ts#L178).

The **2026-10-26** trader held Beloved on **335 of its 487 held turns** across the mixed table. A new reward for positive happiness could therefore reward the trader heavily; the civic’s stronger preference for happiness does not establish that it would benefit most. Source: [docs/reports/simulation/2026-10-26-balance-check.md:92](../../../../docs/reports/simulation/2026-10-26-balance-check.md#L92).

Trade creates a partial connection between the builds. In the **2026-10-22 no-base-food trade arm**, the slaver exported **6.5 food per seat-game**. Equal masters exchanged little food because they shared the shortage. This supports a complementary role for the slaver, but the current summaries do not establish that producing food for sale is a winning human strategy. Source: [docs/reports/simulation/2026-10-22-trade-paired.md:134](../../../../docs/reports/simulation/2026-10-22-trade-paired.md#L134).

**What the evidence cannot settle**

- **Human trading.** Bots consume food for growth, make narrowly specified offers and bargain through one counter. The **2026-10-24** higher-food-price experiment bought less food, not more. A human could preserve saleable food, request a smaller quantity or price a rival’s survival differently. Sources: [docs/reference/ai.md:329](../../../../docs/reference/ai.md#L329), [2026-10-24 balance lines:165](../../../../docs/reports/simulation/2026-10-24-balance-lines.md#L165).
- **Adaptation across turns.** Master values saving, but does not plan a forest colony followed by wood production and a later Granary. Its forecast does not build or grow future pieces. Humans could prepare those sequences. Source: [docs/reference/ai.md:362](../../../../docs/reference/ai.md#L362).
- **Converting a lead or defending against one.** Each held title has the same score value. There is no separate multi-turn plan for the third title. Economic search also lacks general rival replies. That limits conclusions about human race finishes and comebacks. Sources: [src/sim/policies.ts:975](../../../../src/sim/policies.ts#L975), [src/sim/policies.ts:1108](../../../../src/sim/policies.ts#L1108), [src/sim/policies.ts:2701](../../../../src/sim/policies.ts#L2701).
- **Current Archipelago build balance.** The latest current-rule island batch contains four masters without Ideas. Mixed-build island evidence uses hop 4 and the earlier setup.
- **The approved development deck.** No reviewed batch tests the 2026-10-29 direction. Existing simulations still use Ventures. The **2026-10-24** gold-to-material experiment strengthened the trader, so “gold sink” is insufficient justification for expecting a development deck to restrain it. Source: [2026-10-24 balance lines:180](../../../../docs/reports/simulation/2026-10-24-balance-lines.md#L180).

The design questions supported by this evidence are therefore specific: whether production upgrades should also provide resilience; whether high happiness rewards should reach builds beyond the luxury leader; and whether the development deck rewards existing population, settlement and gold advantages more than it provides recovery. The reports do not yet answer those questions.

## Shocks, windfalls and levers

Exposure assessments below are **inferences from current rules**, unless dated as a simulation finding. Counts describe deck composition, not independent probabilities for every draw.

Costs are the default costs; Laws can change them. Buildings normally consume a work slot. An Idea purchase costs 6 influence, with one purchase allowed; drafting it avoids that payment. Sources: [src/game/data.ts:229](../../../../src/game/data.ts#L229), [src/game/settlement.ts:68](../../../../src/game/settlement.ts#L68), [src/game/ruleset.ts:307](../../../../src/game/ruleset.ts#L307).

| Event | Source | Kind (shock / windfall / both) | Who it hits, how often | Size in game units | Levers that answer it, and what each lever costs | Gap (no answer, or answer too costly or too slow) |
|---|---|---|---|---|---|---|
| Board deal and luxury access | **2026-10-25** [Archipelago defaults:55](../../../../docs/reports/simulation/2026-10-25-archipelago-defaults.md#L55) | Both | Every seat at setup; exposure depends on accessible terrain, slots and goods | No fixed payout; changes production and claim opportunities | Setup placement; later colony: 4 wood, 1 food and a founding pop. Port: 4 gold, 2 stone | Placement scores are not win probabilities. Current summaries do not measure hunger by island |
| **Drought** | Year deck, [data.ts:350](../../../../src/game/data.ts#L350) | Shock | Plains food producers and their dependants; 2/14 cards | Removes the plains slave-food column, including Estate output | Food stock; Dole: 3 influence per food. Prepare Granary: 4 wood, +2 food; Good Harvest: Idea cost, +2 food | Shared food shortage can empty the market. New production cannot replace a missed collection |
| **Wildfire** | Year deck, [data.ts:358](../../../../src/game/data.ts#L358) | Shock | Forest producers; slaver and expansion plans; 2/14 | Removes forest slave wood, including Estate output | Keep wood; trade at an agreed price; retain another production source | Slows purchases rather than directly removing pops. No bank replacement |
| **Silent Mines** | Year deck, [data.ts:366](../../../../src/game/data.ts#L366) | Shock | Mountain producers and stone-dependent civic construction; 1/14 | Removes mountain slave stone, including Estate output | Keep stone; trade; postpone the building or upgrade | A saved building price can be delayed a year; no measured build-specific recovery time |
| **Piracy** | Year deck, [data.ts:374](../../../../src/game/data.ts#L374) | Shock | Trader most directly; 2/14 | Removes freeman gold, including Marketplace output; food upkeep remains | Gold stock; food production; Dole at 3 influence per food; trade | Marketplaces increase the exposed column. Gold lost this year may also prevent later promotions or purchases |
| **Ostracism** | Year deck, [data.ts:382](../../../../src/game/data.ts#L382) | Shock | Civic, master and citizen-funded food plans; 2/14 | Removes citizen influence, including Forum output | Influence stock; Civic Tradition: Idea cost, +2 separate influence; Granary: 4 wood | Can disable both food rescue and political spending in the same year |
| **Blockade** | Year deck, [data.ts:390](../../../../src/game/data.ts#L390) | Shock | Luxury holders, especially slave realms using goods as unrest cover; 1/14 | Removes 2 happiness per good for the year | Civic calm: 2 gold or 2 influence, +2 temporary levels. Temple: 3 stone, +1 standing level | Calm is capped at one action and cannot replace several goods. It does not restore Beloved or final-tally happiness |
| **Plague** | Year deck, [data.ts:398](../../../../src/game/data.ts#L398) | Shock | Everyone; most dangerous near an unrest threshold; 2/14 | +1 Unrest token, −1 happiness level | Civic calm: 2 gold or 2 influence. Temple: 3 stone. Public Calm/Festival clear tokens without payment if drawn | No general paid token-removal action. Permanent protection consumes stone and a slot |
| **Festival** | Year deck, [data.ts:406](../../../../src/game/data.ts#L406) | Windfall | Token holders; 2/14 | Clears all Unrest tokens | No payment; reduced need for calm or other protection | Worth nothing to a realm with no tokens; does not remove slave unhappiness |
| **Good Stores** | Player deck, [data.ts:418](../../../../src/game/data.ts#L418) | Windfall | Any recipient; especially a food-short realm; 4/40 | +2 food | Spend on the shortfall, retain it, or use it for growth | Immediate rescue depends on receiving the card; no control over its timing |
| **Timber** | Player deck, [data.ts:426](../../../../src/game/data.ts#L426) | Windfall | Construction and expansion plans; 4/40 | +2 wood | Retain toward Estate/Granary, each 4 wood, or founding | Bots cannot plan all the cross-turn sequences the windfall may unlock |
| **Shipment** | Player deck, [data.ts:434](../../../../src/game/data.ts#L434) | Windfall | Civic construction and city upgrades; 4/40 | +2 stone | Forum/Temple: 3 stone; city upgrade: 3 wood and 3 stone | Value depends on having the rest of the price and a legal site |
| **Profit** | Player deck, [data.ts:442](../../../../src/game/data.ts#L442) | Windfall | Gold-short civic/master plans; trader’s gold stock; 4/40 | +2 gold | Citizen promotion or Civic calm: 2 gold; Venture: 2 gold; retain toward Treasurer | Gold provides no guaranteed food conversion |
| **Patronage** | Player deck, [data.ts:450](../../../../src/game/data.ts#L450) | Windfall | Influence-short seats; 4/40 | +2 influence | Civic calm or Assembly draw: 2 influence; Public Dole buys 1 food for 2 influence | Below the default Dole’s 3-influence price if the seat starts at zero |
| **Free Settlers** | Player deck, [data.ts:458](../../../../src/game/data.ts#L458) | Both | Trader gains its preferred class; other builds gain a mouth or promotion candidate; 3/40 | +1 freeman; later normally +1 gold and −1 food per income | Choose a settlement with room, free. Promote to citizen: 2 gold. Demote to slave: 1 influence | A free pop can create a recurring food deficit. No room means discard, with no substitute |
| **Captured Laborers** | Player deck, [data.ts:468](../../../../src/game/data.ts#L468) | Both | Slaver and open working slots benefit; unrest-exposed realms may suffer; 3/40 | +1 slave; production depends on an open slot; may add 1 slave-unhappiness step | Choose the receiving settlement, free. Promote: 2 food. Civic calm: 2 gold or 2 influence | An idle slave still contributes to unhappiness. No room means discard |
| **Rats** | Player deck, [data.ts:476](../../../../src/game/data.ts#L476) | Shock | Food holders; 3/40 | Loses up to 2 food | Retain more food; Dole: 3 influence per food if food is needed; trade | Removes a future buffer. The loss itself cannot deepen an existing food deficit |
| **Bandits** | Player deck, [data.ts:484](../../../../src/game/data.ts#L484) | Shock | Seats saving for promotions, Ports, calm or Treasurer; 3/40 | Loses up to 2 gold | Keep a margin; trade; pay Civic calm with 2 influence instead | A small loss can cross a purchase or title threshold |
| **Fire** | Player deck, [data.ts:492](../../../../src/game/data.ts#L492) | Shock | Wood holders and imminent building/founding plans; 3/40 | Loses up to 2 wood | Keep wood; trade; delay the purchase | No immediate guaranteed replacement |
| **Local Unrest** | Player deck, [data.ts:500](../../../../src/game/data.ts#L500) | Shock | Recipient near the riot/revolt line; slaver structurally exposed; 3/40 | +1 token, −1 happiness level | Civic calm: 2 gold or 2 influence. Temple: 3 stone | Threshold damage can exceed the printed one-level loss |
| **Public Calm** | Player deck, [data.ts:508](../../../../src/game/data.ts#L508) | Windfall | Recipient with tokens; 2/40 | Clears one token, restoring 1 level when present | No payment | Does nothing without a token; cannot remove the slave term |
| **Riot** | Riot table, [data.ts:91](../../../../src/game/data.ts#L91) | Shock | Turn-end riot exposure; **2026-10-26:** slaver riots on 20% of late turns | Depending on face: pops; a pop plus a random building; 3 food; 3 gold; or nothing | Prevent with Civic calm: 2 gold or 2 influence. Insurance: Bread dole 4 food; Patronage 3 influence; Concession demotes one citizen; each adds +1 to roll | Full insurance is costly and still risks a pop on Bribe demanded without 3 gold. Building loss can remove production or happiness |
| **Revolt**, triggered consequence | [unrest.ts:38](../../../../src/game/unrest.ts#L38), [ruleset.ts:285](../../../../src/game/ruleset.ts#L285) | Shock | Slave realms ending at −6 or below; **no die** | Half the realm’s slaves, rounded down, subject to those available in settlements; tokens clear | Civic calm: 2 gold or 2 influence; Temples: 3 stone each; earlier slave promotion: 2 food | Riot insurance does not apply. One calm action may only reduce a revolt to a riot |
| **Merchant Convoy** | Venture, [data.ts:130](../../../../src/game/data.ts#L130) | Both | Voluntary; 2/6 faces return nothing | Stake 2 gold; gross return 0, 2 or 4 gold. Mean net **−⅓ gold** | Decline, free; retain the 2 gold for another use | Can cross a gold/title threshold, but is not a productive gold sink on average |
| **Grand Embassy** | Venture, [data.ts:159](../../../../src/game/data.ts#L159) | Both | Voluntary influence conversion; 2/6 faces return nothing | Stake 2 gold; gain 0, 1 or 2 influence | Decline, free; keep influence beforehand; use citizen income or Civic Tradition for later supply | Cannot guarantee the influence needed for immediate food or political action |
| **Colonists’ Voyage** | Venture, [data.ts:188](../../../../src/game/data.ts#L188) | Both | Voluntary food rescue or growth; 2/6 faces return nothing | Stake 2 gold; food payouts; on 6, 2 food plus a freeman in a random settlement with room, or another 2 food if full | Prefer a guaranteed Dole when affordable: 3 influence per food; trade at agreed terms | Food rescue can fail. The freeman’s destination is random and adds a future mouth |
| **Law draw**, including Grain Levy and Manumission | Assembly, [deck.ts:5](../../../../src/game/assembly/deck.ts#L5) | Both | Chosen politician, uncertain card; effects require passage | Grain Levy removes 1 food upkeep per freeman but idles Marketplaces. Manumission makes slave promotion free but triples slave unrest count | Draw: 2 influence. Repeal proposal: 3 influence. Extra vote: 2 gold or influence. Prepare independent food before a supporting Law falls | Availability is random; passage and repeal are player decisions. A dependent economy may take several turns to repair |
| **Stratokles draw** | Assembly, [deck.ts:194](../../../../src/game/assembly/deck.ts#L194) | Both | Drawn by choice; rival targeted after the draw; no current effect-to-win ranking | Possible hits include 3 food, one token, one pop, a skipped collection, removal of an eligible authored Law, or reduced base votes | Draw: 2 influence. Oppose through votes; extra vote: 2 gold or influence. Keep food, influence or happiness margins | Targeting is agency, not random victim selection. The Stele Is Broken threatens civic’s standing Laws; General Strike skips collection rather than charging an extra food shortfall |

The pop-target and loss-floor qualifications above come from [src/game/events.ts:28](../../../../src/game/events.ts#L28) and [src/game/events.ts:127](../../../../src/game/events.ts#L127). General Strike’s collection behavior is in [src/game/actions.ts:312](../../../../src/game/actions.ts#L312).