**Hegemony design study — 2026-10-30.** Read-only. All four researcher reports were read in full, followed by engine checks for the proposals below. No files, tests, simulations or installations were changed or run.

The following table merges the researchers’ four shock tables. Duplicate entries are combined; related cards share rows where their response options are the same. It describes the **current engine and the approved development proposal**, before my recommended changes. Sources: `r1-decks.md:354`, `r2-happiness.md:383`, `r3-levers.md:233`, `r4-builds.md:150`.

Counts mean copies in a deck, not independent probabilities each turn. Year cards apply to everyone. Player events affect their recipient. Laws apply table-wide after passage; Directives affect the chosen rival. Each resolution has one copy in its politician’s deck. (`src/game/data.ts:348`, `src/game/data.ts:415`, `src/game/assembly/laws.ts:90`, `src/game/assembly/assembly.ts:1031`)

Repeated lever prices in the table use these defaults:

- **Calm:** 2 gold or 2 influence for +2 temporary happiness, once per turn. **Temple:** 3 stone for +1 lasting happiness. **Granary:** 4 wood for +2 food at subsequent incomes. (`src/game/civic.ts:31`, `src/game/data.ts:249`)
- **Dole:** 3 influence buys 1 food; Public Dole reduces this to 2 influence. **Idea:** free setup selection or the one permitted purchase for 6 influence. (`src/game/ruleset.ts:274`, `src/game/nationalIdeas.ts:10`, `src/game/ruleset.ts:312`)
- **Promotion:** slave to freeman costs 2 food; freeman to citizen costs 2 gold. Promotion and demotion share one move per turn. **City upgrade:** 3 wood and 3 stone. (`src/game/ruleset.ts:308`, `src/game/civic.ts:102`, `src/game/data.ts:47`)
- **Political defence:** oppose with existing votes; an extra vote costs 2 gold or 2 influence, normally up to two per sitting. An eligible repeal costs 3 influence and still requires passage. A year-2 Law first becomes removable in year 6. (`src/game/ruleset.ts:314`, `src/game/assembly/assembly.ts:388`, `src/game/assembly/assembly.ts:306`)
- **Trade:** negotiated payment and a willing partner. It supplies no guaranteed exchange rate. (`src/game/trade.ts:30`, `src/game/trade.ts:67`)

| Event and source | Kind | Exposure and frequency | Size in game units | Available levers and their costs | Remaining gap |
|---|---|---|---|---|---|
| Terrain and island layout — `src/game/state.ts:52`, `src/game/archipelago.ts:615` | Both | Everyone, at setup | Access to food, wood, stone, slots and coast | Placement; founding for 4 wood, 1 food and a transferred pop; trade | Reachable land may be occupied or unsuitable for upgrading |
| Luxury placement — `src/game/data.ts:273`, `src/game/luxury.ts:64` | Both | Everyone, at setup | Seven goods; each active good gives +2 happiness | Port: 4 gold and 2 stone; trade for an owned good | Scarce access and competition for the first claim |
| Drought — `src/game/data.ts:350`, `src/game/economy/income.ts:148` | Shock | Plains producers and their dependants; 2/14 | Removes all plains-slave food, including Estate output | Reserves; existing Granary; Good Harvest Idea gives +2 food; Dole; trade | Suppliers can be hit together; a new building cannot recover the missed income |
| Wildfire — `src/game/data.ts:358` | Shock | Forest producers; 2/14 | Removes forest-slave wood, including Estate output | Wood reserves; trade; defer construction | No current building supplies independent wood income |
| Silent Mines — `src/game/data.ts:366` | Shock | Mountain producers; 1/14 | Removes mountain-slave stone, including Estate output | Stone reserves; trade; defer construction | Can prevent an urgent Temple or city upgrade |
| Piracy — `src/game/data.ts:374` | Shock | Freeman economies, especially trader; 2/14 | Removes freeman gold, including Marketplace output; upkeep remains | Gold reserves; trade; Treasury Grant Idea gives 4 gold | Marketplace increases the exposed income; no dependable recurring gold alternative |
| Ostracism — `src/game/data.ts:382` | Shock | Citizen economies, especially civic; 2/14 | Removes citizen influence, including Forum output | Influence reserves; Civic Tradition Idea gives +2 independent influence | Can interrupt the Dole and political spending together |
| Blockade — `src/game/data.ts:390`, `src/game/luxury.ts:64` | Shock | Luxury holders; 1/14 | Removes 2 happiness per active good for the year | Calm; Temples; promotion; negotiated slave transfers | More luxuries do not diversify the risk; one calm replaces only 2 levels |
| Plague — `src/game/data.ts:398` | Shock | Everyone; 2/14 | +1 Unrest token, hence −1 happiness | Calm; Temple; token-clearing cards when available | Current paid actions offset the token rather than remove it |
| Festival — `src/game/data.ts:406` | Windfall | Everyone; 2/14 | Clears all Unrest tokens | Automatic, free | No benefit without tokens; does not remove slave unhappiness |
| Good Stores, Timber, Shipment, Profit, Patronage — `src/game/data.ts:415` | Windfall | Recipient; 4/40 each | Respectively +2 food, wood, stone, gold or influence | Spend, save or trade the award; Granary/Estate cost 4 wood; Forum/Temple cost 3 stone | Recipient cannot choose the resource or timing |
| Free Settlers — `src/game/data.ts:458`, `src/game/events.ts:28` | Both | Recipient; 3/40 | +1 freeman; normally later +1 gold and −1 food per income | Choose a destination for free; prepare food; promote for 2 gold | Compulsory when room exists; no compensation when full |
| Captured Laborers — `src/game/data.ts:468`, `src/game/events.ts:37` | Both | Recipient; 3/40 | +1 slave; may immediately cost 1 ordinary happiness level | Choose productive room; calm; Temple; promotion | May be idle or trigger unrest before producing anything |
| Rats, Bandits, Fire — `src/game/data.ts:476`, `src/game/events.ts:127` | Shock | Recipient; 3/40 each | Lose up to 2 food, gold or wood respectively | Reserves; trade; Dole for replacement food | No interception. Rats removes positive stock but cannot create or deepen food debt |
| Local Unrest — `src/game/data.ts:500` | Shock | Recipient; 3/40 | +1 token, −1 happiness | Calm; Temple; promotion where it crosses a slave-pair boundary | One level can cross a riot threshold |
| Public Calm — `src/game/data.ts:508` | Windfall | Recipient; 2/40 | Clears up to 1 token | Automatic, free | Cannot be saved; wasted without a token |
| Land Reform — `src/game/assembly/deck.ts:5` | Both | Everyone if passed; 1/6 Demosthenes cards | Working slaves produce food on any terrain; new Estates forbidden | Political defence; existing Estates; trade for materials | Removes slave wood and stone production across the table |
| Sacred Fields — `src/game/assembly/deck.ts:16` | Both | Everyone if passed; 1/6 Demosthenes | Each Temple adds 2 food; new Temples cost 6 stone | Existing Temples; stone reserves; political defence | Makes entry into happiness protection more expensive |
| Manumission — `src/game/assembly/deck.ts:27`, `src/game/assembly/laws.ts:271` | Both | Slave holders if passed; 1/6 Demosthenes | Free slave promotion; slave penalty becomes −floor(3 × slaves ÷ 2) | One free promotion per turn; calm; Temples; slave trade; political defence | Immediate extra penalty equals the slave count; conversion is much slower |
| Tenant Rights — `src/game/assembly/deck.ts:38` | Both | Growing realms if passed; 1/6 Demosthenes | Slave growth costs 2 gold; freeman growth 3 gold, replacing food | Gold reserves; trade; political defence | Food-rich, gold-poor growth can stop |
| Grain Levy — `src/game/assembly/deck.ts:49` | Both | Freeman economies if passed; 1/6 Demosthenes | Freemen eat no food; Marketplaces are idle | Prepare independent food before removal; political defence | Repeal restores every freeman’s upkeep at once |
| Festival Calendar — `src/game/assembly/deck.ts:60` | Both | Everyone if passed; 1/6 Demosthenes | Calm costs 2 food or 2 influence | Influence reserves; political defence | Removes the gold payment during food scarcity |
| Public Works — `src/game/assembly/deck.ts:68` | Both | Everyone if passed; 1/5 Perdiccas cards | Estate/Granary: 3 wood; Marketplace: 2 wood +2 gold; colony capacity: 3 | Discounted buildings; city upgrade; political defence | Reduced capacity blocks new arrivals, although existing pops remain |
| Guild Charter — `src/game/assembly/deck.ts:90` | Both | Everyone if passed; 1/5 Perdiccas | Capital may grow twice; colonies cannot grow | City growth at normal prices; city upgrades; political defence | Colony recovery needs grants, transfers or upgrades |
| Forum Rites — `src/game/assembly/deck.ts:101`, `src/game/economy/income.ts:451` | Both | Everyone if passed; 1/5 Perdiccas | Citizens produce 2 influence; colony freemen produce no gold | Promote a freeman for 2 gold; move for 1 food per pop; political defence | Forum adds no further output; colony freemen normally still eat |
| Civic Pride — `src/game/assembly/deck.ts:112` | Both | Everyone if passed; 1/5 Perdiccas | +1 happiness per realm; −1 gold per city per income | Gold reserves; political defence | Broad city builds pay more; removal immediately removes the happiness |
| Master Builders — `src/game/assembly/deck.ts:123` | Both | Everyone if passed; 1/5 Perdiccas | +1 city work slot; −1 permitted colony piece | City upgrade frees a colony piece; Frontier Charter Idea adds one | More city room comes with less expansion capacity |
| Homestead Act — `src/game/assembly/deck.ts:134` | Both | Everyone if passed; 1/5 Kleistophenes cards | Colonies may hold one building; cities lose 1 slot | Colony Temple or Granary at normal cost; Urban Planning Idea | A Port uses the colony allowance; city slaves can become idle |
| Colonial Charter — `src/game/assembly/deck.ts:145` | Both | Everyone if passed; 1/5 Kleistophenes | Founding costs 1 food plus a transferred pop; upgrading costs 6 stone | Expand without wood; reserve or trade for stone | Cheap colonies may remain difficult to upgrade |
| Frontier Spirit — `src/game/assembly/deck.ts:156` | Both | Founding realms if passed; 1/5 Kleistophenes | +1 slave per founding; colony capacity becomes 3 | Choose whether to found; promotion; happiness protection | Adds slave pressure while reducing room |
| Harbour Dues — `src/game/assembly/deck.ts:167` | Both | Everyone if passed; 1/5 Kleistophenes | Port: 2 stone; Marketplace: 3 wood +4 gold | Claim an available good; political defence | No claim benefit once nearby goods are taken |
| Rural Bloc — `src/game/assembly/deck.ts:183`, `src/game/assembly/assembly.ts:560` | Both | Everyone if passed; 1/5 Kleistophenes | +1 base vote per colony, −1 per city; base floor 1 | Founding; citizen promotion; bought votes; political defence | Upgrading a colony changes its contribution from +1 to −1 |
| Grain Riot — `src/game/assembly/deck.ts:194`, `src/game/assembly/assembly.ts:908` | Shock | Chosen rival after passage; 1/6 Stratokles cards | Lose up to 3 stored food | Political defence; reserves; Dole; trade | Can remove the buffer before upkeep |
| The Streets Burn — `src/game/assembly/deck.ts:203` | Shock | Chosen rival after passage; 1/6 Stratokles | +1 Unrest token | Political defence; calm; Temple | Combines with other token sources |
| General Strike — `src/game/assembly/deck.ts:212`, `src/game/actions.ts:312` | Both | Chosen rival after passage; 1/6 Stratokles | Skips the next whole income, including upkeep; event still drawn | Political defence; stocks; trade | Bypasses buildings and recurring Ideas, but also skips food drain |
| The Mob Rises — `src/game/assembly/deck.ts:221`, `src/game/assembly/assembly.ts:971` | Both | Chosen rival after passage; 1/6 Stratokles | Lose 1 pop from largest settlement, lowest class first | Political defence; replace a slave for 2 food or freeman for 3 | Victim cannot choose the loss; losing a slave can improve happiness |
| The Stele Is Broken — `src/game/assembly/assembly.ts:938` | Both | Chosen rival after passage; 1/6 Stratokles | Removes its newest authored Law if eligible | Political defence; minimum tenure | No fallback to an older eligible Law; removal changes rules for everyone |
| Isonomia — `src/game/assembly/deck.ts:239`, `src/game/assembly/assembly.ts:560` | Shock | Chosen rival at next sitting; 1/6 Stratokles | Base voting strength becomes 1 | Political defence now; bought votes next sitting | Cannot replace a large citizen vote cheaply; no later effect after the final sitting |
| Merchant Convoy — `src/game/data.ts:129` | Both | Voluntary Venture | Pay 2 gold; gross return 0 on 1–2, 2 gold on 3–5, 4 gold on 6 | Decline for free; keep gold for a certain purchase | Can return nothing; calculated mean net return is −⅓ gold |
| Grand Embassy — `src/game/data.ts:159` | Both | Voluntary Venture | Pay 2 gold; receive 0, 1 or 2 influence | Decline; retain influence; prepare Forum/Civic Tradition | Cannot guarantee immediate political or Dole funding |
| Colonists’ Voyage — `src/game/data.ts:188`, `src/game/tables.ts:278` | Both | Voluntary Venture | Pay 2 gold; 0 food on 1–2, 2 on 3–4, 3 on 5; on 6, 2 food and a freeman, or 4 food if full | Dole; trade; prepare capacity | Random destination; current room check omits inbound reservations |
| Riot: the mob torches the works — `src/game/data.ts:97`, `src/game/tables.ts:142` | Shock | Riot roll 1 before insurance | Lose 1 pop and random building; another pop replaces an absent building | Any one insurance excludes this row | Building loss can remove production or happiness |
| Riot: revolt spreads — `src/game/data.ts:104` | Shock | Riot roll 2 before insurance | Lose up to 2 pops | Any two insurance options exclude this row | Requires two available payments |
| Riot: blood in the streets — `src/game/data.ts:105` | Shock | Riot roll 3 before insurance | Lose up to 1 pop | All three insurance options exclude this row | Expensive protection |
| Riot: granary sacked — `src/game/data.ts:106`, `src/game/tables.ts:117` | Shock | Riot roll 4 before insurance | Lose up to 3 stored food | Reserves; later food production | Owning a Granary does not prevent the loss |
| Riot: bribe demanded — `src/game/data.ts:112`, `src/game/tables.ts:129` | Shock | Riot roll 5 before insurance | Lose up to 3 gold; also 1 pop if payment is short | Hold 3 gold before ending the turn | Still possible with all three insurance options |
| Riot: the mob disperses — `src/game/data.ts:116`, `src/game/riot.ts:27` | Windfall | Riot roll 6; insurance increases its frequency | No row loss; riot has already cleared all tokens | Insurance | Insurance payments remain spent |
| Revolt — `src/game/unrest.ts:38`, `src/game/ruleset.ts:285` | Shock | Ending at −6 or lower; no die | Half the realm’s slaves leave, rounded down, capped by resident slaves; tokens clear | Earlier calm, Temples, promotion or slave trade | No riot insurance; a deep deficit exceeds one calm |
| Foraging, Woodcutters, Quarry gang — proposed; `docs/plans/development-deck.md:133` | Windfall | Drawer; 6/40, 5/40, 5/40 | Immediately +1 food, wood or stone respectively per owned settlement | Buy for 2 gold or qualify for free draw; expand to increase payout | Larger realms receive more for the same purchase |
| Bountiful harvest — proposed; `docs/plans/development-deck.md:136` | Windfall | Drawer; 1/40 | Immediately +1 food per owned pop, including slaves and travelling pops | Purchase/free draw; retain or trade food | Rare, uncapped and strongest for large populations |
| Tunny run, Timber raft, Marble block — proposed; `docs/plans/development-deck.md:137` | Windfall | Drawer; 1/40 each | Immediately +5 food, wood or stone respectively | Purchase/free draw; spend or retain | Equal absolute awards, not automatic catch-up |
| Caravan — proposed; `docs/plans/development-deck.md:140` | Windfall | Holder; 4/40 | Choose food, wood or stone; gain 1 per settlement | One eligible held-card play, no further payment | Reliable choice only once already held; still scales with size |
| Settlers — proposed; `docs/plans/development-deck.md:141` | Both | Holder; 3/40 | +1 freeman in a chosen settlement with room | Hold until capacity and food are ready | Future upkeep; consumes the turn’s held-card play |
| Captives — proposed; `docs/plans/development-deck.md:142` | Both | Holder; 2/40 | +1 slave in a chosen settlement with room | Hold until slots and happiness are ready | Slave unhappiness remains |
| Festival day — proposed; `docs/plans/development-deck.md:143` | Windfall | Holder; 3/40 | Clear 1 own Unrest token | One eligible held-card play | Competes with other plays; cannot use a newly drawn copy |
| Raiders — proposed; `docs/plans/development-deck.md:144` | Both | Chosen rival; 4/40 | Transfer up to 3 food, wood, stone or gold | Victim can retain margins, spend stocks or trade; Dole replaces food | Up to a 6-resource difference between attacker and victim; no reaction rule |
| Agitators — proposed; `docs/plans/development-deck.md:145` | Shock | Chosen rival; 2/40 | +1 Unrest token | Older Festival day; calm; Temple | Can deny the proposed happiness reward without causing a riot |
| Informer — proposed; `docs/plans/development-deck.md:146` | Shock | Chosen rival with cards; 2/40 | Discard 1 random held card | Play or trade cards beforehand | Can remove the card saved for a known shortage |

For the riot rows, the trigger is happiness −3 through −5. Each insurance adds +1 to the die, capped at 6: Bread dole costs 4 food, Patronage 3 influence, and Concession demotes one citizen. Each option is available once per riot. (`src/game/ruleset.ts:286`, `src/game/data.ts:121`, `src/game/riot.ts:65`, `src/game/tables.ts:54`)

For proposed development cards, the baseline is one 2-gold purchase per turn, a free draw at standing happiness +3, and one held-card play per own turn. A card cannot be played on the turn it is drawn or received. These are proposed rules, not engine behaviour. (`docs/plans/development-deck.md:84`, `docs/plans/development-deck.md:97`, `docs/plans/development-deck.md:101`)

**The evidence supports better preparation and recovery before more random content.** Buildings that amplify a class also amplify its matching year-card loss. Flat building income survives those class-column shutdowns. Income precedes ordinary actions, so building after a shock repairs future production rather than the current shortfall. (`src/game/economy/income.ts:148`, `src/game/economy/income.ts:438`, `src/game/actions.ts:323`)

Happiness needs a reason to maintain it and a deliberate way to repair token damage. Its present calculation gives Temples and luxuries positive terms, slaves and tokens negative terms, and calm a temporary term. Positive happiness already matters for Beloved and the final tiebreak; it has no recurring income reward. (`src/game/happiness.ts:74`, `src/game/victory.ts:75`, `src/game/victory.ts:169`, `src/game/economy/income.ts:227`)

The **2026-10-26** mixed Continental batch gives useful warnings, not a final ranking:

| Build | Dated result | Design implication |
|---|---|---|
| Slaver | 41/160 wins; riots on 20% of turns from year 8 | Recovery must not simply make persistent slave instability free |
| Civic | 30/160 wins; median influence growth of 6.3 per year between years 10 and 14 | More influence production is not the clearest missing lever |
| Trader | 55/160 wins; 5.36 hunger losses per seat-game; 25 wins on the happiness tiebreak | Cheap food and automatic happiness rewards can strengthen an already successful build |
| Master | 34/160 wins | Broad investment does not establish strong adaptation across turns |

All figures are from **2026-10-26**, `docs/reports/simulation/2026-10-26-balance-check.md:54`, `:79`, and `:92`. That batch predates the current bot’s Law-repeal forecast, and it does not test development cards. Bot search also cannot plan construction sequences across future turns. (`src/sim/policies.ts:1955`, `docs/reference/ai.md:362`)

The seven proposals below are design hypotheses. Their numerical starting points have not been validated by a new batch.

**P1 — Add a Workshop for predictable wood and stone. Tag: “new mechanic.”**

**Change.** A Workshop costs **4 wood and 2 stone**, occupies **1 work slot**, and produces **1 wood and 1 stone per income**. Allow one per settlement under ordinary building permissions: normally capital/city, with Homestead Act permitting the colony exception. It needs no particular terrain and no resident production class.

Its flat output survives Wildfire, Silent Mines and Land Reform. General Strike still skips it. These consequences follow from the existing separation between class output, flat building income and skipped collection. (`src/game/economy/income.ts:148`, `src/game/economy/income.ts:438`, `src/game/actions.ts:312`)

- **Finding answered:** R3, “Gaps in the existing answers” and “Revisions worth carrying forward”: food has independent production, but wood and stone do not. R4, “Build and system connections”: class upgrades concentrate exposure. (`r3-levers.md:192`, `r3-levers.md:220`, `r4-builds.md:115`)
- **Decision and luck:** Adds a known investment before a shortage. A player chooses slower, reliable material production instead of depending entirely on terrain, trade or draws.
- **Build effects:** Helps civic, trader and master obtain materials without adding slaves. Helps slaver withstand shutdowns, but competes with productive slaves for slots. It may weaken a material exporter’s bargaining position.
- **Cost:** Engine: one building definition and its integration; existing income effects suffice. UI: one construction option and income breakdown. Bots: value both outputs and displaced production. Player text: “Costs 4 wood and 2 stone; produces 1 wood and 1 stone.”

After four collections it has returned **4 wood and 4 stone**, before counting displaced slave output. On crowded Estate land, its slot can displace **2 of the tile’s resource per income**. That opportunity cost must remain visible. (`src/game/settlement.ts:68`, `src/game/economy/income.ts:451`)

The risk is a compulsory early Workshop followed by reduced trade. Its price and slot cost should be assessed against that outcome, rather than treating every extra material as an improvement.

**P2 — Give the Temple a choice between temporary calm and lasting token repair. Tag: “new mechanic.”**

**Change.** Retain the Temple’s **3-stone cost and +1 happiness**. If a realm owns at least one Temple, its existing civic-calm action may instead **clear 1 Unrest token**.

The payment remains **2 gold or 2 influence**. Festival Calendar changes the gold option to **2 food**, as it does for ordinary calm. Both outcomes consume the same once-per-turn action. Clearing a token gives no additional temporary +2. Multiple Temples grant no extra uses; clearing requires a token.

The current action already has the shared payment and use limit, and the engine already has a clear-one-token operation. The choice between them is new. (`src/game/civic.ts:31`, `src/game/civic.ts:73`, `src/game/happiness.ts:120`)

- **Finding answered:** R2, “Every direct token source and clearance” and “The player’s practical levers”: lasting token removal depends on draws or suffering unrest. R3 identifies the same gap. (`r2-happiness.md:43`, `r2-happiness.md:235`, `r3-levers.md:192`)
- **Decision and luck:** Adds a choice between **+2 now** and removing **−1 permanently**. It softens repeated token shocks without automatically cancelling them.
- **Build effects:** Helps Temple-owning civic and master realms maintain happiness. Gives slaver a deliberate answer to token damage, but leaves slave unhappiness intact. Trader can pay with gold but must invest in a Temple. Token attacks become less durable against prepared opponents.
- **Cost:** Engine: a Temple prerequisite and a second outcome on the calm action. UI: show both outcomes and resulting happiness. Bots: compare immediate safety with future token removal. Player text: one alternative attached to an existing action.

At **−4 happiness**, ordinary calm reaches **−2**; clearing one token reaches only **−3**. At **+2 standing happiness with a token**, clearing it reaches **+3**, while temporary calm still does not qualify for the proposed free card. Those are different choices, not a universal upgrade. (`src/game/ruleset.ts:286`, `src/game/happiness.ts:113`, `docs/plans/development-deck.md:101`)

**P3 — Forecast the next year card publicly. Tag: “new mechanic.”**

**Change.** Show **exactly one upcoming year card** to everyone.

Make year 1’s card visible before setup placement. When a year begins, activate its forecast card and expose the following year’s card. Forecasting applies no effect: Plague places its token and Festival clears tokens only when their year begins. Stop forecasting beyond the final year. Longer games prepare the next shuffled cycle when needed for the forecast and retain that order.

Keep all **14 cards, copy counts and effect sizes**. The current engine hides the next card and applies the revealed card before that year’s ordinary turns. (`src/game/projection.ts:85`, `src/game/year.ts:25`, `src/game/turn.ts:190`, `src/game/data.ts:348`)

- **Finding answered:** R1, “Year deck — Connections and judgment”; R2, “Drought: most structural answers arrive too late”; R3, “When a player can respond.” (`r1-decks.md:70`, `r2-happiness.md:293`, `r3-levers.md:17`)
- **Decision and luck:** Preserves random order while giving players one year to save, build, move or negotiate. Preparation becomes specific.
- **Build effects:** Helps every build protect its exposed income. Slaver can prepare materials and Blockade margins; trader can save food before Piracy; civic can reserve influence before Ostracism. It reduces the accidental advantage of already holding the right reserve.
- **Cost:** Engine: public forecast state, activation and shuffle handling. UI: clearly separate “this year” from “next year.” Bots: apply the known card to the next income and happiness check; current forecasts assume no future card changes. Player text: “Next year’s card is visible; it takes effect when that year begins.” (`docs/reference/ai.md:103`)

This is the year deck change I would make first. I would retain full Blockade suppression while assessing the forecast. Its concentration risk remains meaningful, but players can see when it will arrive.

**P4 — Make both player-event pop awards optional. Tag: “new mechanic.”**

**Change.** Free Settlers and Captured Laborers offer:

- Accept **1 pop of the printed class** in a legal settlement.
- Decline for **0 resources and 0 pops**.

Keep **3 copies of each**, the current capacity checks, and the no-compensation outcome when every settlement is full. Other player events retain their current counts and amounts. Today the resolver requires a legal destination whenever one exists. (`src/game/data.ts:458`, `src/game/data.ts:468`, `src/game/events.ts:28`, `src/game/events.ts:37`)

- **Finding answered:** R2, “Captured Laborers: a windfall can force a riot”; R1, “Player event deck — Connections and judgment.” (`r2-happiness.md:255`, `r1-decks.md:139`)
- **Decision and luck:** Removes an involuntary liability. The draw still determines the opportunity; the player decides whether their economy can use it.
- **Build effects:** Helps slaver avoid crossing an unrest threshold, trader avoid unwanted future upkeep, and civic/master reject an unproductive class. No build loses an accepted award. Relative gains favour realms near a threshold.
- **Cost:** Engine: explicit decline resolution and legal command. UI: one decline option beside destination selection. Bots: compare decline with the best destination, including current happiness and future upkeep. Player text: add “You may.”

I would keep the resource events at **±2**. The **2026-10-26** mixed batch measured a median resource-card swing of **18%** of that turn’s take and a 90th percentile of **50%**. That does not measure winner changes or the compounding value of pops, but it does not support making resource events larger. (`docs/reports/simulation/2026-10-26-balance-check.md:65`)

**P5 — Keep the approved development composition; cut card-for-pop riot substitution. Tag: “new mechanic.”**

**Change.** Introduce the approved **40-card list** as the replacement for Ventures, with **2 gold per purchase, one purchase per turn, and one eligible held-card play per turn**. Preserve settlement scaling, the single per-pop food card, the three rare **+5** yields, delayed play, private hands, public hand counts and card trading.

Remove the proposed permission to discard a random held card for each riot pop loss. A riot would remove **0 held cards as substitutes**; its existing losses and insurance would remain. This is a deliberate revision to the approved direction, not an implementation clarification. (`docs/plans/development-deck.md:84`, `:97`, `:107`, `:111`, `:131`)

- **Finding answered:** R1, “Proposed development deck — Connections and judgment”: timed holdings add decisions, but riot substitution preserves the slave count causing instability. R4 warns that gold conversion can strengthen trader and that the new deck has no measured results. (`r1-decks.md:314`, `r4-builds.md:138`)
- **Decision and luck:** Keeps purchased variance and later timing choices. Cutting substitution makes cards less useful as recurring protection for an unrest-producing economy.
- **Build effects:** Scaling helps wide slaver and master realms; gold access helps trader; timed stone and food help civic. The cut most directly hurts unstable slaver builds that would otherwise retain cheap cards as replacement lives. Stable builds gain relatively.
- **Cost:** Engine: the deck, hands, delayed play, targeting and card transfers remain substantial work; removing substitution avoids a further riot decision sequence. UI: private hands, card play and private transfer selection. Bots: purchase, hold, target and trade valuation. Player text: two card timings, one play limit and the waiting-turn rule. No additional riot-payment rule.

My card-level assessment is:

| Keep | Reason |
|---|---|
| Foraging, Woodcutters, Quarry gang | Preserve the owner’s approved reward for expansion |
| Bountiful harvest, one copy | Retains a deliberate rare windfall; do not present it as reliable feeding |
| Tunny run, Timber raft, Marble block, one copy each | Clear, memorable awards with equal absolute value across realm sizes |
| Caravan, Settlers, Captives, Festival day | Their chosen play time is the deck’s strongest distinction from player events |
| Raiders, Agitators, Informer | Add chosen targets and pressure on stocks, happiness and retained hands |

These counts and effects are the **2026-10-29 proposal**, `docs/plans/development-deck.md:131`. I would exclude the unapproved Civic feast and Master builder suggestions from this first list. (`docs/plans/development-deck.md:220`)

Three limits matter. Only **8/40 cards give immediate food** in the printed mix. A newly drawn Caravan must wait. Held cards leave circulation, so later shuffles need not retain the printed proportions. These are composition and timing calculations, not simulation findings. (`docs/plans/development-deck.md:97`, `:133`, `:290`)

At four settlements and twelve pops, the initial mix gives calculated immediate expectations of **1.025 food, 0.625 wood and 0.625 stone per draw**, plus separate held-card outcomes. Those quantities are not interchangeable, and they do not establish a dependable return on 2 gold. (`docs/plans/development-deck.md:131`)

**P6 — Let happiness earn a free card only when the turn ends without food debt. Tag: “new mechanic.”**

**Change.** Use this single eligibility rule:

> When committing your turn, if standing happiness is at least **+3** and food is **0 or higher**, draw **1 free development card**.

Check once, **before hunger resolution and before unrest**. Temporary calm does not count. Resolve a yield immediately; a held card waits until a later own turn. Do not reopen ordinary actions after the free draw.

This changes the proposed timing and adds a food condition. The plan currently places the draw at the riot check, while the engine resolves hunger first and resets food to zero. Checking food after that reset would incorrectly treat an unpaid deficit as satisfied. (`docs/plans/development-deck.md:101`, `src/game/turn.ts:157`, `src/game/turn.ts:176`, `src/game/hunger.ts:139`)

- **Finding answered:** R2, “What is flat, what is used, and what remains unmeasured”: happiness has no recurring economic return, and high happiness can coexist with hunger. R4, “Build and system connections”: trader, rather than civic, has captured much of the observed happiness success. (`r2-happiness.md:322`, `r4-builds.md:115`)
- **Decision and luck:** Gives lasting happiness an ongoing payoff while making feeding part of earning it. The reward deliberately adds variance through a draw; eligibility is determined by the player’s position.
- **Build effects:** Helps well-fed civic, master and trader realms. A slaver can qualify by funding enough lasting happiness. It denies the reward to a happy realm that accepts food debt. It does not guarantee civic benefits most.
- **Cost:** Engine: one end-turn eligibility check and draw step. UI: display standing happiness, food debt and qualification together. Bots: value the reward only when both conditions can be met. Player text: “Standing happiness +3 and no food debt earns one free card.”

P2 supplies the active happiness decision: pay for temporary safety or repair a token permanently. P6 supplies the positive reward. Together they give happiness more work without another happiness track or several reward bands.

The remaining risk is explicit: a large, happy, well-fed realm receives both more draws and larger scaling payouts. P6 does not remove that advantage. Free draws must therefore be assessed by build and year, alongside paid draws, realm size and actual food losses.

**P7 — Reduce Manumission’s slave weight from 3 to 2. Tag: “balance only.”**

**Change.** Keep free slave promotion. Change the slave unrest weight from **3 to 2**. Under the default divisor, each slave then costs **1 happiness level** while the Law stands.

Keep the ordinary **one ladder move per turn** and existing Law tenure. The engine already supports the weight as a number. (`src/game/assembly/deck.ts:27`, `src/game/assembly/laws.ts:271`, `src/game/civic.ts:102`)

- **Finding answered:** R2, “Manumission: political change can outrun the ladder” and “Test a smaller Manumission penalty”; R1, Assembly severity analysis. (`r2-happiness.md:307`, `r2-happiness.md:363`, `r1-decks.md:201`)
- **Decision and luck:** Softens a political shock sufficiently for existing responses to matter more. Drawing and passing the Law remains consequential.
- **Build effects:** Helps slaver most and mixed master economies second. Civic and trader lose some offensive force against slave-heavy rivals. Free promotion remains useful to anyone changing class composition.
- **Cost:** Engine: one existing effect value. UI: revised card text and calculated previews. Bots: assess the revised Law through the existing political evaluation. Player text: “Slaves count twice,” replacing “three times.”

For ten slaves supported by one Temple and two goods, ordinary happiness is **0**. Current Manumission makes it **−10**; one free promotion and calm still leave **−6**, a revolt. With weight 2, it becomes **−5**; the same promotion and calm reach **−2**. This is arithmetic from the current happiness formula and proposed weight, not a simulated result. (`src/game/happiness.ts:43`, `src/game/happiness.ts:74`, `src/game/assembly/laws.ts:281`, `src/game/ruleset.ts:307`)

The **2026-10-26** report recorded Manumission passing only **once in 160 mixed games**. That supports reviewing it, but does not prove its severity caused the low use. (`docs/reports/simulation/2026-10-26-balance-check.md:73`)

**I would do P1, P2 and P3 first, in that order, and assess them separately.** Workshop addresses the clearest missing production option. Temple repair makes happiness interactive without multiplying its passive bonus. Forecasting tests whether advance information makes the existing year deck sufficiently answerable. Those results provide a firmer base for judging development purchases and free draws.

I would deliberately leave these alone:

- **Base income, the removed bank and the Dole’s default price.** Keep base income at 0, the bank disabled and the Dole at 3 influence per food. The proposals add particular investments and choices without changing the whole economy. (`src/game/ruleset.ts:274`, `src/game/ruleset.ts:284`)
- **Estate, Marketplace and Forum output, and Granary food.** Retain class output of 2 and Granary’s +2 food. Their different roles and slot costs remain useful; Workshop supplies the missing material option. (`src/game/data.ts:229`, `src/game/settlement.ts:68`)
- **Year-card counts and full Blockade suppression.** First assess the forecast with the existing 14-card composition. Do not simultaneously reduce the shocks and conclude that warning solved them. (`src/game/data.ts:348`)
- **Luxury identity, ownership and the Idea pool.** Keep goods mechanically identical at +2 happiness and keep ownership separate from the claiming Port’s survival. Adding individual good powers or tying them to building survival would introduce more rules and damage cascades. Idea duplication is a smaller issue than the response gaps addressed here. (`src/game/luxury.ts:57`, `src/game/luxury.ts:64`, `src/game/tables.ts:254`, `src/game/nationalIdeas.ts:3`)
- **A fifth deck and automatic catch-up.** Public contracts would occupy a distinct role, but the reports do not establish a need for another objective system. Forecasting, building investment and held development cards already address the strongest identified gaps. The existing evidence does not measure last-place comeback rates or event-caused reversals. (`r1-decks.md:332`, `r4-builds.md:105`)