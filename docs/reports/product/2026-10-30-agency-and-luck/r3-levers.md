# Player levers: agency, luck and the systems that connect them

Study date: 2026-10-30. Read-only inspection. No tests or simulations were run. No simulation figures are used below. Statements about build fit are deductions from the rules, not measured win rates.

The development deck is treated separately as the proposal updated on 2026-10-29. The engine still has Ventures. (`docs/plans/development-deck.md:2`, `docs/plans/development-deck.md:152`, `src/game/ventures.ts:35`)

## Main findings

**Food has durable insurance. Wood and stone do not.** Granaries, Good Harvest and Sacred Fields produce food outside the slave column that Drought removes. There is no corresponding building or Idea for wood or stone. Marketplace, Estate and Forum increase production, but the matching year card removes their increases too. (`src/game/data.ts:229`, `src/game/nationalIdeas.ts:3`, `src/game/economy/income.ts:148`, `src/game/economy/income.ts:420`)

**The strongest buildings serve different purposes.** Class buildings reward concentration. Granaries protect food supply. Temples provide happiness independent of the coast. Ports acquire scarce, transferable happiness assets. Building them all is constrained by their shared pool of work slots. (`src/game/data.ts:229`, `src/game/settlement.ts:68`, `src/game/luxury.ts:64`, `src/game/trade.ts:368`)

**Political control is substantial but conditional.** A player chooses a politician, may reject the draw, chooses their vote and may buy extra votes. They cannot select a particular Law or remove a newly enacted Law immediately. Repeal requires another majority after minimum tenure. (`src/game/assembly/assembly.ts:229`, `src/game/assembly/assembly.ts:283`, `src/game/assembly/assembly.ts:306`, `src/game/assembly/assembly.ts:383`, `src/game/assembly/assembly.ts:618`)

**Several levers overlap or switch each other off.** Urban Planning includes the capital, so Capital Works offers a subset of its benefit. Forum Rites removes the Forum’s production advantage. Grain Levy leaves Marketplaces idle. These are distinct issues: an Idea with no unique role, and Laws that deliberately invalidate investments. (`src/game/ideaRules.ts:6`, `src/game/nationalIdeas.ts:17`, `src/game/nationalIdeas.ts:23`, `src/game/assembly/deck.ts:106`, `src/game/assembly/deck.ts:54`, `src/game/economy/income.ts:451`)

## When a player can respond

A year card is revealed before that year’s play. In Assembly years, the Assembly follows the reveal and precedes the first normal turn. A player’s income is then collected automatically, followed by their player event. Ordinary actions wait until the event is resolved. Consequently, a building constructed after an income shock cannot recover that year’s missing production. Its income begins at a later collection. Happiness buildings can still change the approaching unrest check. (`src/game/year.ts:78`, `src/game/turn.ts:190`, `src/game/turn.ts:221`, `src/game/actions.ts:323`, `src/game/actions.ts:335`, `src/game/status.ts:469`)

Food debt can be covered during the turn. Ending short opens the hunger decision; ordinary actions and trade then stop. Hunger resolves before unrest. At happiness −3 or below, a riot occurs; at −6 or below, revolt replaces the riot and removes half the realm’s slaves, rounded down and limited to slaves standing in settlements. (`src/game/turn.ts:157`, `src/game/actors.ts:170`, `src/game/unrest.ts:38`, `src/game/ruleset.ts:285`)

The normal happiness calculation is:

> Temples + 2 per active luxury − floor(slaves ÷ 2) − Unrest tokens + temporary calm + Law contributions.

Blockade removes the luxury term. Civic calm adds 2 for the year; standing happiness excludes it. (`src/game/happiness.ts:43`, `src/game/happiness.ts:74`, `src/game/happiness.ts:113`, `src/game/luxury.ts:64`, `src/game/ruleset.ts:307`)

This timing separates three kinds of agency:

- **Preparation:** production mix, reserves, buildings, Ideas and population composition.
- **Response during the turn:** trade, Dole, calm, construction and a limited population adjustment.
- **Resolution after committing:** choose hunger losses, or buy riot insurance and roll. Trade cannot rescue either pending decision. (`src/game/status.ts:342`, `src/game/civic.ts:31`, `src/game/trade.ts:171`, `src/game/actors.ts:170`)

## Buildings and settlement upgrades

### Common restrictions

A capital or city holds 8 pops; a colony holds 4. Normally, only capitals and cities build the five non-Port buildings. A colony may build a Port. Each settlement holds one of each building. Each building takes one work slot unless Harbour Planning exempts its Port. There is no individual building upgrade command. (`src/game/data.ts:63`, `src/game/status.ts:205`, `src/game/ideaRules.ts:14`, `src/game/legalMoves.ts:146`)

Buildings and working slaves share slots. Buildings may displace working slaves into idleness; construction does not require a slot to be unworked. Freemen and citizens produce without work slots. Colonies sharing a tile split its slots, with the first colony receiving the odd slot. (`src/game/status.ts:218`, `src/game/settlement.ts:47`, `src/game/settlement.ts:68`, `src/game/economy/income.ts:83`)

All prices below are baseline prices. Laws can replace them. (`src/game/economy/cost.ts:14`)

| Building | Cost and site | Effect and unlock | Role against luck; build fit |
|---|---|---|---|
| **Marketplace** | 3 wood, 2 gold; capital/city, any settleable terrain; one slot. | Freemen here produce 2 gold instead of 1. (`src/game/data.ts:231`) | Rewards freeman concentration and Free Settlers. Supplies gold for Ports, promotion, votes, calm and Ventures; proposed development cards add another use. Piracy removes the entire gold column, including the Marketplace increase. Grain Levy makes it idle. (`src/game/economy/income.ts:156`, `src/game/assembly/deck.ts:54`, `docs/plans/development-deck.md:84`) |
| **Estate** | 4 wood; capital/city on a tile with a printed resource; one slot. Cannot stand on a hill, even under Land Reform. (`src/game/data.ts:237`, `src/game/status.ts:235`) | Working slaves produce 2 of their current resource instead of 1. Idle slaves gain nothing. (`src/game/economy/income.ts:451`) | Rewards Captured Laborers and slave concentration where slots remain. Amplifies the affected year-card loss. Existing Estates survive Land Reform and produce food under it; new Estates are forbidden. (`src/game/economy/income.ts:183`, `src/game/assembly/deck.ts:10`, `src/game/assembly/laws.ts:198`) |
| **Forum** | 3 stone; capital/city, any terrain; one slot. | Citizens here produce 2 influence instead of 1. (`src/game/data.ts:244`) | Funds Dole, Ideas, calm, proposals and bought votes. It does **not** give extra base votes: citizens themselves do. Ostracism removes its increase. Forum Rites raises citizens to 2 everywhere, leaving the Forum with no additional output. (`src/game/assembly/assembly.ts:545`, `src/game/economy/income.ts:157`, `src/game/assembly/deck.ts:106`, `src/game/economy/income.ts:463`) |
| **Temple** | 3 stone; capital/city, any terrain; one slot. | +1 realm happiness while standing. (`src/game/data.ts:250`, `src/game/happiness.ts:59`) | Durable answer to slave unhappiness, Plague, Local Unrest, The Streets Burn and Blockade. Sacred Fields also gives each Temple 2 food, but raises the price of new Temples to 6 stone. (`src/game/assembly/deck.ts:21`) Under the proposal, a Temple can help reach the +3 free-card threshold. (`docs/plans/development-deck.md:101`) |
| **Granary** | 4 wood; capital/city, any terrain; one slot. | +2 food at income, independent of pops. (`src/game/data.ts:256`, `src/game/economy/income.ts:438`) | Direct insurance against Drought and free-pop upkeep. Also replenishes Rats, Grain Riot and riot food losses at later income. It does not protect stored food from those losses. The riot result “Granary sacked” takes food whether a Granary exists or not. (`src/game/data.ts:106`, `src/game/tables.ts:117`) |
| **Port** | 4 gold, 2 stone; capital, city or colony on the coast, adjoining an unclaimed luxury; normally one slot. (`src/game/data.ts:262`, `src/game/status.ts:239`) | Claims one adjacent luxury. If two are reachable, the player chooses which. Each active good gives +2 happiness; goods can be traded. (`src/game/actions.ts:357`, `src/game/luxury.ts:64`, `src/game/trade.ts:368`) | Strong happiness support for slave production and the proposed free-card threshold. Blockade removes its good’s happiness for the year. A Port does not unlock player trade: trade has no Port requirement. (`src/game/trade.ts:171`) |

### Slot opportunity costs matter

An Estate’s gain is not simply “one more resource per slave.” It consumes a slot before determining working slaves.

Calculated examples from the slot and output rules:

| Before construction | After Estate | Net change |
|---|---|---|
| Two open slots, one slave | One working slave producing 2 | +1 resource per income |
| Two open slots, two slaves | One working slave producing 2; one idle | 0 |
| Three open slots, three slaves | Two working slaves producing 4; one idle | +1 resource per income |

These follow from `src/game/settlement.ts:68` and `src/game/economy/income.ts:451`. The guide’s statement that an Estate pays only when at least two slaves retain slots is too restrictive: the first example already gains output. (`rules.md:365`)

A Granary on fully worked plains displaces 1 food of slave output, or 2 with an Estate. Its normal net food increase can therefore be only 1 or 0. During Drought, its own 2 food still survives. The same slot cost makes Temples and Forums more expensive to a crowded slave economy than their printed resource price suggests. (`src/game/settlement.ts:68`, `src/game/data.ts:259`, `src/game/economy/income.ts:153`, `src/game/economy/income.ts:438`)

### Colony founding and city upgrade

| Lever | Cost, restrictions and result | Design role |
|---|---|---|
| **Found a colony** | 4 wood, 1 food and one existing pop sent from another settlement. The pop arrives next own turn. Normally four colony pieces are available. Placement requires adjacency to an owned settlement, or an eligible coastal route. (`src/game/data.ts:43`, `src/game/actions.ts:184`, `src/game/actions.ts:202`, `src/game/ruleset.ts:273`, `src/game/settlement.ts:221`, `src/game/turn.ts:225`) | Acquires another terrain, population capacity and a potential Port site. Under the proposed deck, it also increases every per-settlement yield. (`docs/plans/development-deck.md:128`) |
| **Upgrade colony to city** | 3 wood, 3 stone. Requires an owned colony and no city within the exclusion radius of 1. Three city pieces are available in addition to the capital. Capacity rises from 4 to 8; normal building permission opens; the colony piece becomes available again. (`src/game/data.ts:47`, `src/game/status.ts:127`, `src/game/ruleset.ts:256`, `src/game/ruleset.ts:273`, `src/game/settlement.ts:106`) | Creates room for pop windfalls and production buildings. It does not inherently add work slots. It removes a rival colony sharing the tile, including that colony’s standing pops and buildings. (`src/game/actions.ts:247`) |
| **Move pops** | 1 food per pop; one transfer per turn, between owned settlements with room. Arrivals occur next own turn. (`src/game/status.ts:399`, `src/game/actions.ts:447`) | Moves production toward a better tile or matching class building. Too slow to recover income already lost to this year’s card. |

The upgrade is also a denial lever. Sharing a resource tile can be temporary access that another seat later removes by upgrading. Cities cannot be adjacent, so a promising colony can also be permanently unsuitable for that upgrade. (`src/game/actions.ts:248`, `src/game/status.ts:142`)

### Port ownership is stronger than the building

Luxury activity depends on asset ownership and suppression, not on whether the claiming Port still stands. Riot destruction removes the building without changing the asset. The same separation applies when a shared colony is displaced. Thus the engine treats the Port mainly as an acquisition cost; its destruction does not withdraw the purchased happiness asset. (`src/game/luxury.ts:57`, `src/game/tables.ts:254`, `src/game/actions.ts:248`)

That is a material design choice. Connecting luxury activity to a surviving Port would be a **new mechanic**, not a clarification of the present rule.

## National Ideas

After settlement placement, the Idea draft continues the setup snake. With the default capital/colony setup, capitals go 0→3, colonies 3→0, and Ideas 0→3. Each seat takes one free Idea. During play it may buy one further Idea for 6 influence. Ideas are exclusive to one seat; the acquisition system has no replacement action. New Settlers requires a legal pop destination when selected. (`src/game/turn.ts:96`, `src/game/ideas.ts:43`, `src/game/ideas.ts:85`, `src/game/ideas.ts:127`, `src/game/ruleset.ts:312`)

These are choices from available Ideas, not random draws.

| Idea | Exact change | Build served and connection to luck |
|---|---|---|
| **Good Harvest** | +2 food per realm at income. (`src/game/nationalIdeas.ts:5`) | Food insurance for any build, especially freemen/citizens. Survives Drought because realm income is added outside the removed class column. (`src/game/economy/income.ts:264`) |
| **Public Dole** | Dole costs 2 influence per food instead of 3. (`src/game/nationalIdeas.ts:11`) | Citizen/Forum food conversion. Helps current shortages if influence is already held. Does not create influence during Ostracism. (`src/game/ideaRules.ts:30`, `src/game/bank.ts:163`) |
| **Urban Planning** | +1 work slot in every city, including the capital. (`src/game/nationalIdeas.ts:17`, `src/game/ideaRules.ts:6`) | Building-heavy or crowded city economies. Can preserve a worker while adding insurance. Does not increase pop capacity. (`src/game/settlement.ts:23`) |
| **Capital Works** | +1 work slot in the capital only. (`src/game/nationalIdeas.ts:23`) | Compact capital development. Its effect is a subset of Urban Planning’s; its distinct role is availability after Urban Planning has been taken. (`src/game/ideaRules.ts:6`, `src/game/ideas.ts:48`) |
| **Civic Tradition** | +2 influence per realm at income. (`src/game/nationalIdeas.ts:29`) | Reliable Dole, calm and Assembly funding. Survives Ostracism; unlike additional citizens, it adds no food upkeep. (`src/game/economy/income.ts:264`, `src/game/ruleset.ts:280`) |
| **Frontier Charter** | +1 colony piece. (`src/game/nationalIdeas.ts:35`) | Wide expansion when piece supply binds. It grants no founding discount or pop. The proposed per-settlement cards increase the value of its extra holding. (`src/game/settlement.ts:114`, `docs/plans/development-deck.md:133`) |
| **New Settlers** | Immediately add one chosen slave or freeman to an owned settlement with room. (`src/game/nationalIdeas.ts:41`, `src/game/ideas.ts:27`) | Immediate setup production or recovery of a specific class. Bypasses the paid-growth throttle. As a purchased Idea, 6 influence obtains a pop normally grown for 2 or 3 food; its case is timing and placement, not a large grant. (`src/game/ideas.ts:159`, `src/game/data.ts:54`) |
| **City Pioneers** | Each colony upgrade grants one freeman if the new city has room. (`src/game/nationalIdeas.ts:47`, `src/game/actions.ts:253`) | City expansion and Marketplace concentration. Repeated upgrade reward; also adds future food demand. (`src/game/ruleset.ts:281`) |
| **Slave Colonies** | Founding a colony grants one slave as room allows. (`src/game/nationalIdeas.ts:53`) | Wide slave production. Stacks with Frontier Spirit, with Law riders processed before Idea riders and room reserved for the arriving founding pop. (`src/game/assembly/laws.ts:78`, `src/game/assembly/laws.ts:287`, `src/game/actions.ts:213`) More slaves also lower happiness. (`src/game/happiness.ts:43`) |
| **Harbour Planning** | Ports occupy no work slot. (`src/game/nationalIdeas.ts:59`) | Coastal slave production and crowded Port sites. Saves the displaced worker’s output or preserves building room. Does not waive Port cost, coast, luxury availability or a Law’s building-count limit. (`src/game/ideaRules.ts:14`, `src/game/status.ts:224`) |
| **Treasury Grant** | Immediately gain 4 gold. (`src/game/nationalIdeas.ts:65`) | A timed Port, promotion, calm or vote purchase; an immediate reserve against Piracy. No recurring benefit. Proposed development cards give this gold another outlet. (`docs/plans/development-deck.md:84`) |
| **Assembly Brokers** | May buy a third vote per Assembly. (`src/game/nationalIdeas.ts:71`) | Political builds with spare gold or influence. The vote still costs 2 gold or influence; the Idea grants buying capacity, not a free vote. (`src/game/assembly/assembly.ts:618`, `src/game/ruleset.ts:328`) |

The Ideas provide food and influence insurance, space and expansion rewards. None directly grants happiness or recurring wood, stone or gold. That absence follows from the complete authored list. (`src/game/nationalIdeas.ts:3`)

## The Assembly and its Laws

### What one seat controls

The default Assembly meets in years 2, 4, 6, 8, 10, 12 and 14. Each seat can spend 2 influence for one random card from a chosen politician. It may propose it, discard it or pass; there is no second draw. Alternatively, it can propose an eligible repeal for 3 influence. Discarding a draw does not recover its cost. (`src/game/ruleset.ts:314`, `src/game/assembly/assembly.ts:234`, `src/game/assembly/assembly.ts:283`, `src/game/assembly/assembly.ts:388`)

Proposals are secret until the ballot. Ballot items and votes follow the year’s turn order. Base voting strength is at least 1, normally 1 plus citizens, adjusted by Rural Bloc. Citizens in transit count. Each bought vote costs 2 gold or 2 influence; the default cap is two per sitting, and purchases remain in the sitting’s voting weight. Ties fail. (`src/game/assembly/assembly.ts:195`, `src/game/assembly/assembly.ts:507`, `src/game/assembly/assembly.ts:545`, `src/game/assembly/assembly.ts:600`, `src/game/assembly/assembly.ts:637`)

Trade remains available during preparation. It closes when everyone is Ready, before the ballot is revealed. A player therefore cannot buy a citizen or trade for voting funds after seeing the revealed ballot. (`src/game/assembly/assembly.ts:460`, `src/game/actors.ts:176`)

Laws apply to everyone, including the author’s rivals. Capitals count as cities. Up to four Laws stand. A Law survives its own sitting and the next sitting: one enacted in year 2 is first removable in year 6. Replacement at the cap respects this protection. (`src/game/assembly/laws.ts:90`, `src/game/assembly/types.ts:32`, `src/game/ruleset.ts:318`, `src/game/assembly/assembly.ts:306`)

Only one price Law can stand. A new price Law replaces the old price Law, and may also replace the oldest Law at the cap. Protected replacements block the proposal. The seven price Laws are Sacred Fields, Manumission, Tenant Rights, Festival Calendar, Public Works, Colonial Charter and Harbour Dues. (`src/game/assembly/laws.ts:131`, `src/game/assembly/assembly.ts:316`, `src/game/assembly/deck.ts:4`)

A passed resolution pays its author 2 food for Demosthenes, 2 stone for Perdiccas, 2 wood for Kleistophenes or 2 gold for Stratokles. Repeals pay no author prize. Voice counts authored Laws still standing; Directives do not count. Politician patronage gives no buff. (`src/game/ruleset.ts:320`, `src/game/assembly/assembly.ts:792`, `src/game/assembly/assembly.ts:829`, `src/game/assembly/power.ts:37`)

### Every Law

Only Civic Pride and Manumission directly change the happiness calculation. Other Laws affect happiness indirectly through population choices, building access or the price of calm. (`src/game/assembly/laws.ts:137`, `src/game/assembly/laws.ts:271`)

| Politician / Law | Economy and happiness effect | Build served; exposure created |
|---|---|---|
| Demosthenes — **Land Reform** | Working slaves make food on every terrain; no new Estates. Existing Estates continue. (`src/game/assembly/deck.ts:8`, `src/game/assembly/laws.ts:198`, `src/game/status.ts:224`) | Feeds free-pop economies and activates hill slaves. Removes all slave wood/stone production across the table. Non-plains food survives Drought; plains food does not. (`src/game/economy/income.ts:177`) |
| Demosthenes — **Sacred Fields** | Temples also produce 2 food. New Temples cost 6 stone. (`src/game/assembly/deck.ts:19`) | Rewards Temples built beforehand; combines happiness and Drought insurance. Expensive for a seat trying to build its first Temple after a shock. |
| Demosthenes — **Manumission** | Slave promotion becomes free. Slaves count three times for unhappiness: total slave penalty becomes floor(3 × slaves ÷ 2). (`src/game/assembly/deck.ts:30`, `src/game/assembly/laws.ts:281`) | Helps leave slavery, but conversion remains limited to one ladder move per turn. A large slave realm cannot remove the penalty quickly. (`src/game/civic.ts:102`) |
| Demosthenes — **Tenant Rights** | Grow slaves for 2 gold, freemen for 3 gold, replacing food payments. (`src/game/assembly/deck.ts:41`) | Gold-rich, food-poor growth. Piracy makes this growth route harder; it does not remove later free-pop upkeep. (`src/game/ruleset.ts:280`) |
| Demosthenes — **Grain Levy** | Freemen eat no food; Marketplaces do nothing. (`src/game/assembly/deck.ts:52`) | Protects freemen during food shortages, especially those spread through colonies. Sacrifices concentrated Marketplace output. Freemen still produce their base gold except during Piracy or another applicable effect. (`src/game/assembly/laws.ts:126`, `src/game/economy/income.ts:417`) |
| Demosthenes — **Festival Calendar** | Calm costs 2 food or 2 influence; the gold payment is replaced. The bonus remains +2. (`src/game/assembly/deck.ts:63`, `src/game/civic.ts:36`, `src/game/ruleset.ts:307`) | Gives food-rich realms a calm payment. Removes the gold escape route during food scarcity. |
| Perdiccas — **Public Works** | Estates and Granaries cost 3 wood; Marketplaces cost 2 wood and 2 gold. Colony capacity becomes 3. (`src/game/assembly/deck.ts:71`) | Cheaper city investment; smaller colonies. Existing excess pops are not expelled, but new arrivals need room. (`src/game/settlement.ts:23`, `src/game/settlement.ts:137`) |
| Perdiccas — **Guild Charter** | Capital may grow twice per turn; colonies cannot grow. Other cities retain normal growth. (`src/game/assembly/deck.ts:93`, `src/game/assembly/laws.ts:247`) | Capital concentration and recovery there. Colony production must be supplied by grants, events, trade or movement rather than paid growth. |
| Perdiccas — **Forum Rites** | Citizens produce 2 influence everywhere. Colony freemen produce no gold but still eat. Forums add no further influence. (`src/game/assembly/deck.ts:104`, `src/game/ruleset.ts:281`, `src/game/economy/income.ts:463`) | Citizen dispersion. Removes Forum advantage and makes colony freemen a food burden without output. Ostracism still removes citizen influence. (`src/game/economy/income.ts:157`) |
| Perdiccas — **Civic Pride** | +1 happiness per realm; each city, capital included, pays 1 gold per income. (`src/game/assembly/deck.ts:115`, `src/game/assembly/laws.ts:108`) | Happiness support for few-city realms. Broad city builds pay more. The gold charge remains during Piracy because it sits outside the removed freeman column. (`src/game/economy/income.ts:259`) |
| Perdiccas — **Master Builders** | Cities gain one work slot; colony-piece limit falls by one. (`src/game/assembly/deck.ts:126`) | Dense cities and building insurance. Constrains further colony expansion; does not remove an existing fourth colony. (`src/game/settlement.ts:114`) |
| Kleistophenes — **Homestead Act** | Colonies may hold one building, including their Port; cities lose one slot. (`src/game/assembly/deck.ts:137`, `src/game/status.ts:224`) | Allows a colony Granary, Temple or class building without upgrading. A Port already occupies its one-building allowance. City workers can lose slots. Existing buildings remain. (`src/game/settlement.ts:51`) |
| Kleistophenes — **Colonial Charter** | Found for 1 food plus the sent pop; upgrade for 6 stone. (`src/game/assembly/deck.ts:148`, `src/game/actions.ts:184`) | Expansion without wood; costly city conversion. Particularly useful under Wildfire, but cannot evade placement or piece limits. (`src/game/status.ts:57`, `src/game/status.ts:67`) |
| Kleistophenes — **Frontier Spirit** | Founding grants a slave; colony capacity becomes 3. It adds no Unrest token. (`src/game/assembly/deck.ts:159`, `src/game/actions.ts:213`) | Repeated slave expansion. Combines with Slave Colonies, but increases the realm’s slave happiness penalty. (`src/game/happiness.ts:43`) |
| Kleistophenes — **Harbour Dues** | Ports cost 2 stone; Marketplaces cost 3 wood and 4 gold. (`src/game/assembly/deck.ts:170`) | Cheap luxury claims and happiness support. Penalizes new Marketplace concentration. Port placement restrictions remain. (`src/game/status.ts:239`) |
| Kleistophenes — **Rural Bloc** | +1 base vote per colony, −1 per city, with a minimum base vote of 1. (`src/game/assembly/deck.ts:185`, `src/game/assembly/assembly.ts:560`) | Wide political influence without citizen upkeep. Upgrading changes a holding from +1 to −1: a calculated loss of two base votes per upgrade while this Law stands. |

### Limits of the political answer

A Law can answer a scarcity while creating another one. Land Reform is the clearest case: it produces food everywhere but removes the table’s recurring slave production of wood and stone. Trade redistributes existing stocks; it cannot restore that lost aggregate production. (`src/game/assembly/deck.ts:10`, `src/game/trade.ts:363`)

Manumission changes happiness immediately but offers a slow adjustment. At six slaves, the slave penalty rises from −3 to −9. Free promotion removes only one slave per turn through the normal ladder limit. This is a calculated six-level shock before any promotion, Temple, luxury or calm response. (`src/game/happiness.ts:43`, `src/game/assembly/laws.ts:281`, `src/game/civic.ts:102`)

Price-Law exclusivity also prevents some apparent combinations. Sacred Fields cannot normally coexist with Harbour Dues or Public Works. A player cannot assume cheap Ports, cheap Granaries and food-producing Temples will form one stable package. (`src/game/assembly/laws.ts:131`, `src/game/assembly/assembly.ts:323`)

## Trade, the Dole and population adjustment

| Lever | What it fixes | Price and limits |
|---|---|---|
| **Player trade** | Any resource shortage; luxury access; acquiring or selling any pop class. | All five resources, goods and pops trade. Both sides must give something. Prices are negotiated; there is no compulsory buyer or seller. No Port, terrain or distance requirement appears in trade eligibility. (`src/game/trade.ts:38`, `src/game/trade.ts:67`, `src/game/trade.ts:171`) |
| **Resource/good delivery** | Current-turn hunger, building costs or happiness. | Resources and luxury ownership transfer immediately when a trade settles. (`src/game/trade.ts:363`) |
| **Pop delivery** | Future production or replacement of losses. | Pops travel and occupy destination capacity. They arrive at the receiver’s next own turn. Their ownership already counts for realm happiness and Assembly votes. (`src/game/trade.ts:371`, `src/game/settlement.ts:127`, `src/game/actions.ts:447`, `src/game/happiness.ts:63`, `src/game/assembly/assembly.ts:546`) |
| **Dole** | Food shortage without another player’s agreement. | 3 influence buys 1 food; Public Dole reduces this to 2. Repeatable while affordable during the normal turn. It cannot be used after a pending event, hunger or riot has taken control. (`src/game/ruleset.ts:274`, `src/game/ideaRules.ts:30`, `src/game/bank.ts:163`, `src/game/actors.ts:170`) |
| **Stabilize Province / Bread & Circuses** | A happiness shortage before committing the turn. | 2 influence or 2 gold buys +2 happiness for the year, once per turn, without stacking. Festival Calendar replaces the gold payment with 2 food. (`src/game/civic.ts:31`, `src/game/civic.ts:59`, `src/game/ruleset.ts:307`) |
| **Promote** | Reduce slave count, change production class or gain a citizen vote. | Slave→freeman costs 2 food; freeman→citizen costs 2 gold. One ladder move per turn. Slave promotion removes material output and adds food upkeep; citizen promotion exchanges gold production for influence. (`src/game/ruleset.ts:279`, `src/game/ruleset.ts:309`, `src/game/civic.ts:86`) |
| **Demote** | Change production toward gold or slave output. | Citizen→freeman or freeman→slave costs 1 influence, sharing the ladder limit. Demotion during a riot is free, but riot insurance specifically requires a citizen→freeman concession. (`src/game/ruleset.ts:310`, `src/game/civic.ts:110`, `src/game/riot.ts:24`) |
| **Riot insurance** | Reduce losses once a riot is pending. | Bread dole: 4 food; Patronage: 3 influence; Concession: demote a citizen. Each adds +1 to the die, once per riot. Results clamp at 6. Three purchases exclude rows 1–3, but row 5 still kills a pop if 3 gold cannot be paid. (`src/game/data.ts:118`, `src/game/riot.ts:60`, `src/game/tables.ts:60`, `src/game/tables.ts:129`) |

There is no bank in the default ruleset and no base income. A resource-poor seat cannot rely on automatic settlement income or fixed gold conversion. (`src/game/ruleset.ts:288`, `src/game/ruleset.ts:296`)

Trade is strongest against **uneven** shortages. The year cards act on everyone’s corresponding output. During Drought, another plains producer is also losing food; during Wildfire, another forest producer is also losing wood. Willing suppliers therefore depend on reserves, different production sources or earlier draws. (`src/game/data.ts:348`)

## The map as a lever

The map exposes production capacity rather than a fixed tile yield. Plains supply food, forests wood, mountains stone, hills no normal slave resource. Slaves require open work slots; free classes do not. The Oracle cannot be settled. (`src/game/data.ts:283`, `src/game/settlement.ts:78`, `src/game/settlement.ts:205`)

This creates several choices:

- **Terrain mix:** access to food, wood and stone reduces dependence on trade, but does not diversify a resource away from its matching year card. Two plains holdings both lose their slave food under Drought. (`src/game/economy/income.ts:153`)
- **Large tiles:** leave more room for class buildings, insurance buildings and working slaves together. A settlement’s pop capacity remains separate from its slot count. (`src/game/settlement.ts:23`, `src/game/settlement.ts:51`)
- **Coast:** enables Port claims and coastal expansion. A Port is not required for coastal founding; holding a coastal settlement is the normal gate. Archipelago sea reach is 3 hexes; Continental and Scenario have unrestricted coastal reach. (`src/game/settlement.ts:221`, `src/game/ruleset.ts:392`)
- **City spacing:** a site can offer good production or luxury access but lack a legal upgrade. Sharing also divides slots and exposes the colony to displacement. (`src/game/status.ts:127`, `src/game/settlement.ts:47`, `src/game/actions.ts:248`)

The browser default is Archipelago. Continental shuffles the terrain deck; Scenario uses authored placement. Archipelago spreads landmarks across islands and supplies each island group with each resource before dealing the remaining terrain. That is a group-level provision, not a guarantee that each seat controls all resources. (`src/game/config.ts:12`, `src/game/state.ts:52`, `src/game/archipelago.ts:615`)

Seven luxury goods are authored: Tyrian Dye, Pearls, Coral, Glassware, Incense, Fine Linen and Silphium. Their current mechanical value is identical: +2 happiness per active good. They occupy vertices shared by two coastal tiles. Default placement uses angular spacing with a seed-dependent starting phase; fully random placement is optional and off by default. (`src/game/data.ts:273`, `src/game/luxury.ts:64`, `src/game/mapTopology.ts:95`, `src/game/mapTopology.ts:199`, `src/game/ruleset.ts:301`)

The important luxury draw is therefore **access**, not which named good appears. The first Port claims the asset; another player can subsequently obtain it through trade without possessing the original site. (`src/game/actions.ts:378`, `src/game/luxury.ts:82`, `src/game/trade.ts:368`)

## Gaps and design material

### Gaps in the existing answers

| Gap | Why it matters |
|---|---|
| **No durable wood or stone insurance** | Estates amplify the terrain column instead of diversifying it. Neither the buildings nor Ideas offer flat wood/stone income. Trade and existing player-event windfalls are the remaining resource sources during the matching year shock. (`src/game/data.ts:229`, `src/game/nationalIdeas.ts:3`, `src/game/economy/income.ts:183`, `src/game/data.ts:426`) |
| **No durable gold source outside freemen** | Marketplace gold disappears with Piracy. Treasury Grant is one-time; Merchant Convoy is optional and random. (`src/game/data.ts:375`, `src/game/nationalIdeas.ts:65`, `src/game/data.ts:129`) |
| **No interception of ordinary stock losses** | Rats, Bandits and Fire resolve before ordinary actions. Their losses stop at available stock, but no building or Idea cancels the event. Granary is replenishment, not protection. (`src/game/events.ts:37`, `src/game/events.ts:127`, `src/game/actors.ts:172`, `src/game/data.ts:229`, `src/game/nationalIdeas.ts:3`) |
| **No recovery of a skipped collection** | General Strike bypasses the entire income calculation, including Granaries and realm-income Ideas. It also skips negative income, including upkeep; it is not always an equally severe food shock. (`src/game/actions.ts:312`) |
| **Forced pop windfalls can be awkward** | With room, Free Settlers and Captured Laborers must resolve. The freeman adds future upkeep; the slave may cross an unhappiness threshold or remain idle. With no room, the card is discarded before the player can upgrade or found. (`src/game/events.ts:28`, `src/game/events.ts:111`, `src/game/ruleset.ts:279`, `src/game/happiness.ts:43`) |
| **Luxury concentration has one large common failure** | Blockade removes all luxury happiness together. More Ports do not diversify this exposure. Calm replaces only 2 happiness, regardless of goods held. (`src/game/luxury.ts:64`, `src/game/ruleset.ts:307`) |
| **Some Investments lose their role under Laws** | Forum Rites removes Forum advantage; Grain Levy idles Marketplaces. The building still occupies its slot. No demolition or conversion command is available. (`src/game/economy/income.ts:417`, `src/game/economy/income.ts:463`, `src/game/ideaRules.ts:21`, `src/game/legalMoves.ts:146`) |

### What the proposed development deck changes

The proposal adds a purchase after the player event: 2 gold, once per turn. Yields resolve immediately. Held cards wait until a later own turn and share a one-card-per-turn play limit. Standing happiness +3 draws one free card at turn end; calm does not count. These are proposed mechanics, not current levers. (`docs/plans/development-deck.md:82`, `docs/plans/development-deck.md:97`, `docs/plans/development-deck.md:101`)

Its effects connect to existing levers in four ways:

1. **Gold gains a material outlet without a partner.** Marketplace, Treasury Grant and freemen become ways to buy attempts at food, wood or stone. Only Caravan lets the player choose the material; an immediate yield still depends on the draw. (`docs/plans/development-deck.md:133`)
2. **Expansion improves the same draw.** Foraging, Woodcutters, Quarry gang and Caravan count settlements. Bountiful harvest counts every pop, slaves included and including those in transit. An otherwise identical draw pays 2 at two settlements and 6 at six settlements. This rewards wide builds, including wide slave builds. (`docs/plans/development-deck.md:128`, `docs/plans/development-deck.md:133`)
3. **Happiness acquires a repeatable production reward.** Temples, Ports, Civic Pride, fewer slaves and clearing Unrest can contribute to the +3 threshold. Blockade can remove it. Buying temporary calm cannot establish eligibility. (`src/game/happiness.ts:74`, `docs/plans/development-deck.md:101`)
4. **Hands provide delayed control.** Caravan can wait for the needed material. Settlers and Captives can wait for capacity. Festival day can wait for an Unrest token. A random held card may substitute for a riot pop loss, but cannot stop a revolt. (`docs/plans/development-deck.md:97`, `docs/plans/development-deck.md:107`, `docs/plans/development-deck.md:140`)

Two timing questions should remain explicit for implementation:

- Buying a card can rescue current food debt only if its immediate result helps, or an older held card is available. A newly drawn Caravan cannot be played that turn. (`docs/plans/development-deck.md:91`, `docs/plans/development-deck.md:97`)
- Under the existing engine sequence, hunger is settled before the unrest check. The proposed free draw “at the riot check” therefore should not be assumed to rescue that turn’s hunger. This is an inference from the current order; the proposal needs to preserve or deliberately change it. (`src/game/turn.ts:157`, `src/game/turn.ts:176`, `docs/plans/development-deck.md:101`)

### Revisions worth carrying forward

These are design candidates, not implemented changes.

| Candidate | Classification | Reason and tradeoff |
|---|---|---|
| **Remove Capital Works from the pool** | Content reduction; no new mechanic. | Urban Planning already includes its full effect. Removal makes the Idea pool sharper, but removes an extra capital-slot option when Urban Planning belongs to another seat. (`src/game/ideaRules.ts:6`) |
| **Change Forum Rites’ benefit to +2 influence per realm at income**, keeping its colony-freeman penalty | Content revision using an existing effect. | Keeps Forums useful and supplies influence outside Ostracism’s citizen column. It also weakens the Law’s reward for citizen-heavy builds. Realm income already exists through Civic Tradition. (`src/game/nationalIdeas.ts:29`, `src/game/economy/income.ts:264`) |
| **Prototype a Workshop: 4 wood, 2 stone; one city/capital slot; +1 wood and +1 stone per income** | New building content using existing income effects; no new timing rule. | Tests whether durable material insurance improves agency. It survives terrain-column shocks, but could reduce terrain and trade dependence too much. The price is a starting hypothesis, not a balance finding. The existing building effect interpreter supports multiple flat income effects. (`src/game/economy/income.ts:433`) |
| **Keep Port survival separate from luxury ownership unless deliberately reopening it** | Preserve current mechanic; linking them would be new. | A surviving-Port requirement would turn building destruction and shared-colony displacement into happiness shocks too. That would materially increase cascade risk. (`src/game/luxury.ts:57`, `src/game/tables.ts:254`, `src/game/actions.ts:248`) |

The lever audit does not establish a need for another deck. Its clearest uncovered space is predictable material insurance. The proposed development deck supplies uncertain and often delayed substitutes; a small building experiment would test a different answer.

## Shocks, windfalls and levers

The table uses baseline lever prices established above. “Trade” always means an agreed exchange, with no fixed price.

Year-card counts are copies in the 14-card deck, not independent annual chances. Player events use one shared 40-card deck and reshuffle discards when exhausted. (`src/game/data.ts:348`, `src/game/data.ts:416`, `src/game/state.ts:44`, `src/game/events.ts:12`)

Resolution frequencies name each politician’s initial deck. A seat chooses the politician, draws once for 2 influence, and needs a passing vote. Discarded and rejected cards can return; Directives return after use; standing Laws remain out until removed. (`src/game/assembly/assembly.ts:174`, `src/game/assembly/assembly.ts:234`, `src/game/assembly/assembly.ts:798`, `src/game/assembly/assembly.ts:875`)

Every proposed development draw costs 2 gold once per turn, or is free at the qualifying end-turn happiness check. Held plays have the delay and one-play limit above. Riot frequencies below assume no insurance; each purchased insurance shifts the die +1, capped at 6. (`docs/plans/development-deck.md:84`, `docs/plans/development-deck.md:97`, `docs/plans/development-deck.md:101`, `src/game/tables.ts:60`)

| Event | Source | Kind (shock / windfall / both) | Who it hits, how often | Size in game units | Levers that answer it, and what each lever costs | Gap (no answer, or answer too costly or too slow) |
|---|---|---|---|---|---|---|
| **Terrain and island layout** | `src/game/state.ts:52`; `src/game/archipelago.ts:615` | Both | All seats; once at setup on generated boards | Changes access to food, wood, stone, slots and coast | Choose placements; found colonies for 4 wood, 1 food and a sent pop; trade at agreed prices | A reachable resource may already be occupied or lack a legal city upgrade |
| **Luxury placement** | `src/game/luxury.ts:24`; `src/game/mapTopology.ts:208` | Both | All seats; once at setup | Seven assets, each worth +2 happiness when active | Claim with Port: 4 gold, 2 stone and normally a slot; acquire through trade | Scarce access; another Port can claim first |
| **Drought** | `src/game/data.ts:350`; `src/game/economy/income.ts:153` | Shock | All plains producers; 2/14 years | Removes all plains slave food, Estate increase included | Before: Granary 4 wood; Good Harvest free/6 influence; Sacred Fields Temples. After: Dole 3 influence/food, or 2 with Public Dole; trade; Colonists’ Voyage 2 gold | New production buildings are too late for that collection; other plains suppliers are also hit |
| **Wildfire** | `src/game/data.ts:358`; `src/game/economy/income.ts:154` | Shock | All forest producers; 2/14 | Removes all forest slave wood, Estate increase included | Wood reserves; trade; Colonial Charter can remove founding’s wood cost if enacted | No durable wood building or Idea; current Ventures cannot produce wood |
| **Silent Mines** | `src/game/data.ts:366`; `src/game/economy/income.ts:155` | Shock | All mountain producers; 1/14 | Removes all mountain slave stone, Estate increase included | Stone reserves; trade; defer stone purchases | No durable stone building or Idea; current Ventures cannot produce stone |
| **Piracy** | `src/game/data.ts:374`; `src/game/economy/income.ts:156` | Shock | All freemen; 2/14 | Removes all freeman gold, Marketplace increase included | Gold reserves; Treasury Grant free/6 influence gives 4 gold; trade; Merchant Convoy costs 2 gold | No dependable recurring gold substitute; freemen still eat |
| **Ostracism** | `src/game/data.ts:382`; `src/game/economy/income.ts:157` | Shock | All citizens; 2/14 | Removes all citizen influence, Forum increase included | Civic Tradition free/6 influence gives 2 influence per income; reserves; trade; Grand Embassy 2 gold | Forum is amplification, not insurance |
| **Blockade** | `src/game/data.ts:390`; `src/game/luxury.ts:64` | Shock | Luxury holders; 1/14 | −2 happiness per active good for the year | Temple 3 stone per +1; calm 2 gold/influence for +2; promote slave for 2 food; Civic Pride if enacted | More goods do not diversify exposure; one calm may be insufficient |
| **Plague** | `src/game/data.ts:398` | Shock | Every realm; 2/14 | +1 Unrest token, normally −1 happiness | Temple 3 stone; calm 2 gold/influence; luxury claim/trade; population adjustment | No current voluntary clear-token action; buffers offset rather than remove the token |
| **Festival** | `src/game/data.ts:406` | Windfall | Every realm; 2/14 | Clears all Unrest tokens | Retain production while tokens disappear; no payment | No benefit to a token-free realm; timing cannot be chosen |
| **Good Stores** | `src/game/data.ts:418` | Windfall | Drawing seat; 4/40 | +2 food | Spend on hunger or growth: slave 2 food, freeman 3; retain as reserve | No choice of resource |
| **Timber** | `src/game/data.ts:426` | Windfall | Drawing seat; 4/40 | +2 wood | Toward Granary/Estate 4 wood, Marketplace 3 wood plus 2 gold, or colony 4 wood plus 1 food | Usually only part of the next purchase |
| **Shipment** | `src/game/data.ts:434` | Windfall | Drawing seat; 4/40 | +2 stone | Toward Forum/Temple 3 stone, Port 2 stone plus 4 gold, or upgrade 3 stone plus 3 wood | No building multiplies the stock grant itself |
| **Profit** | `src/game/data.ts:442` | Windfall | Drawing seat; 4/40 | +2 gold | Calm, citizen promotion or one bought vote: 2 gold; Venture: 2 gold | Cannot directly buy chosen materials without a partner |
| **Patronage** | `src/game/data.ts:450` | Windfall | Drawing seat; 4/40 | +2 influence | Calm, resolution draw or one bought vote: 2 influence; Public Dole buys 1 food for 2 | Baseline Dole needs 3 influence |
| **Free Settlers** | `src/game/data.ts:458`; `src/game/events.ts:28` | Both | Drawing seat; 3/40 | +1 freeman with room; later +1 gold and −1 food per income, or 2 gold with Marketplace | Before: leave capacity; city upgrade 3 wood, 3 stone. Choose destination; Marketplace costs 3 wood, 2 gold | Full realm discards it before actions; cannot decline a legal grant |
| **Captured Laborers** | `src/game/data.ts:468`; `src/game/events.ts:111` | Both | Drawing seat; 3/40 | +1 slave; output only with a resource and open slot; may add −1 happiness | Choose working land; Estate 4 wood; Temple 3 stone; promote for 2 food | Full realm loses grant; a new slave can be idle or cross the riot line |
| **Rats** | `src/game/data.ts:476`; `src/game/events.ts:127` | Shock | Drawing seat; 3/40 | Lose up to 2 held food | After resolution: Dole 3 influence/food, trade, Venture 2 gold; future Granary income | No cancellation; Granary does not protect stored food |
| **Bandits** | `src/game/data.ts:484`; `src/game/events.ts:127` | Shock | Drawing seat; 3/40 | Lose up to 2 gold | Reserves; Treasury Grant free/6 influence; trade; future Marketplace output | No direct protection or dependable immediate gold recovery |
| **Fire** | `src/game/data.ts:492`; `src/game/events.ts:127` | Shock | Drawing seat; 3/40 | Lose up to 2 wood | Reserves; trade; future forest/Estate output | No direct protection; cannot act between reveal and loss |
| **Local Unrest** | `src/game/data.ts:500` | Shock | Drawing seat; 3/40 | +1 Unrest token | Temple 3 stone; calm 2 gold/influence; luxury claim/trade; promote slave 2 food | No chosen token removal in current engine |
| **Public Calm** | `src/game/data.ts:508` | Windfall | Drawing seat; 2/40 | Clear one Unrest token | No payment; exploit restored happiness buffer | Wasted with zero tokens; cannot hold it |
| **Land Reform** | `src/game/assembly/deck.ts:8` | Both | All realms if passed; 1/6 Demosthenes cards | Slaves switch to food; no new Estates | Nay free; buy votes 2 gold/influence each; later repeal 3 influence; existing Estates and non-plains slaves provide food | Wood/stone production disappears table-wide; repeal delayed |
| **Sacred Fields** | `src/game/assembly/deck.ts:19` | Both | All realms if passed; 1/6 Demosthenes | +2 food per Temple; new Temple costs 6 stone | Build Temple beforehand for 3 stone; Nay/bought votes; later repeal 3 influence | A seat without Temples pays the higher entry price |
| **Manumission** | `src/game/assembly/deck.ts:30`; `src/game/assembly/laws.ts:281` | Both | All realms if passed; 1/6 Demosthenes | Slave promotion free; slave penalty becomes floor(3 × slaves/2) | Free promotion once per turn; Temple 3 stone; calm 2 gold/influence; Nay/bought votes; later repeal 3 influence | Large slave stacks cannot convert quickly; immediate happiness fall can exceed all cheap responses |
| **Tenant Rights** | `src/game/assembly/deck.ts:41` | Both | All realms if passed; 1/6 Demosthenes | Growth costs 2 gold/slave or 3 gold/freeman | Gold production/reserves; trade; Nay/bought votes; later repeal 3 influence | Food-rich, gold-poor growth is blocked; Piracy compounds it |
| **Grain Levy** | `src/game/assembly/deck.ts:52` | Both | All realms if passed; 1/6 Demosthenes | Saves 1 food per freeman; removes Marketplace output increase | Use dispersed/base freemen; Nay/bought votes; later repeal 3 influence | Marketplace investment remains idle and occupies a slot |
| **Festival Calendar** | `src/game/assembly/deck.ts:63` | Both | All realms if passed; 1/6 Demosthenes | Calm uses 2 food or 2 influence, replacing gold payment | Keep influence; pay 2 food when abundant; Nay/bought votes; later repeal 3 influence | Removes gold-funded calm during food scarcity |
| **Public Works** | `src/game/assembly/deck.ts:71` | Both | All realms if passed; 1/5 Perdiccas | Saves 1 wood on Estate, Granary or Marketplace; colony capacity 3 | Build discounted insurance; upgrade colony 3 wood, 3 stone; Nay/bought votes; later repeal 3 influence | Less room for pop draws; upgrade geometry may prevent recovery |
| **Guild Charter** | `src/game/assembly/deck.ts:93` | Both | All realms if passed; 1/5 Perdiccas | Capital grows twice; colonies zero times | Grow centrally at normal 2/3 food prices; move pops 1 food each; Nay/bought votes; later repeal 3 influence | Colony replacement requires grants, draws, trade or delayed movement |
| **Forum Rites** | `src/game/assembly/deck.ts:104` | Both | All realms if passed; 1/5 Perdiccas | Citizens produce 2 influence; colony freemen 0 gold | Promote colony freeman for 2 gold; move for 1 food; Nay/bought votes; later repeal 3 influence | Forums add nothing; colony freemen still eat |
| **Civic Pride** | `src/game/assembly/deck.ts:115` | Both | All realms if passed; 1/5 Perdiccas | +1 happiness; −1 gold per city per income | Hold gold reserves; Nay/bought votes; later repeal 3 influence | City-wide maintenance continues during Piracy |
| **Master Builders** | `src/game/assembly/deck.ts:126` | Both | All realms if passed; 1/5 Perdiccas | +1 city slot; −1 colony limit | Frontier Charter free/6 influence restores one piece; upgrade 3 wood, 3 stone frees a colony piece | Extra slot is useful only with workers/building funds; expansion can bind |
| **Homestead Act** | `src/game/assembly/deck.ts:137` | Both | All realms if passed; 1/5 Kleistophenes | One building per colony; −1 city slot | Colony Granary 4 wood or Temple 3 stone; Urban Planning free/6 influence offsets city slot loss | Existing Port uses the colony allowance; city slave output may fall |
| **Colonial Charter** | `src/game/assembly/deck.ts:148` | Both | All realms if passed; 1/5 Kleistophenes | Found for 1 food plus pop; upgrade 6 stone | Expand without wood; stone reserves/trade; Nay/bought votes; later repeal 3 influence | Silent Mines and stone scarcity obstruct upgrades |
| **Frontier Spirit** | `src/game/assembly/deck.ts:159` | Both | All realms if passed; 1/5 Kleistophenes | +1 slave per founding; colony capacity 3 | Found at current price; Slave Colonies free/6 influence adds another slave; happiness buildings | Slave penalty grows; smaller colonies fill sooner |
| **Harbour Dues** | `src/game/assembly/deck.ts:170` | Both | All realms if passed; 1/5 Kleistophenes | Port 2 stone; Marketplace 3 wood, 4 gold | Claim scarce goods cheaply; Nay/bought votes; later repeal 3 influence | No benefit after nearby goods are claimed; new Marketplaces cost more |
| **Rural Bloc** | `src/game/assembly/deck.ts:185` | Both | All realms if passed; 1/5 Kleistophenes | +1 vote/colony, −1/city; minimum base 1 | Found colonies at current cost; citizens via 2-gold promotion; bought votes 2 gold/influence | City upgrades reduce political strength while improving capacity |
| **Grain Riot** | `src/game/assembly/deck.ts:198`; `src/game/assembly/assembly.ts:908` | Shock | Chosen rival if passed; 1/6 Stratokles | Lose up to 3 food | Prevent with Nay/bought votes; later Dole 3 influence/food, trade, reserves | No stock protection; suppliers may demand a high price |
| **The Streets Burn** | `src/game/assembly/deck.ts:207` | Shock | Chosen rival if passed; 1/6 Stratokles | +1 Unrest token | Nay/bought votes; on own turn Temple 3 stone or calm 2 gold/influence | No immediate action during the ballot; no chosen token clearing |
| **General Strike** | `src/game/assembly/deck.ts:216`; `src/game/actions.ts:312` | Both | Chosen rival if passed; 1/6 Stratokles | Skip one entire income, including negative income; player event still drawn | Nay/bought votes; reserves and trade; Treasury Grant if still available, 6 influence | Every production building and recurring Idea is bypassed |
| **The Mob Rises** | `src/game/assembly/deck.ts:225`; `src/game/assembly/assembly.ts:972` | Shock | Chosen rival if passed; 1/6 Stratokles | Lose 1 pop from largest settlement, lowest class first | Nay/bought votes; replace slave for 2 food or freeman for 3 food; New Settlers if available | No insurance or victim choice after passage |
| **The Stele Is Broken** | `src/game/assembly/deck.ts:234`; `src/game/assembly/assembly.ts:938` | Shock | Chosen rival if passed; 1/6 Stratokles | Remove newest authored Law if tenure ended | Nay/bought votes; minimum tenure protects automatically | No older fallback; once removed, restoration needs another draw and majority |
| **Isonomia** | `src/game/assembly/deck.ts:243`; `src/game/assembly/assembly.ts:560` | Shock | Chosen rival at next Assembly; 1/6 Stratokles | Base vote becomes 1 for that sitting | Nay/bought votes now; next sitting buy up to 2 votes, or 3 with Assembly Brokers, at 2 gold/influence each | Citizen and Rural Bloc base strength cannot answer it |
| **Merchant Convoy** | `src/game/data.ts:129`; `src/game/ventures.ts:14` | Both | Voluntary buyer; one Venture per turn | Pay 2 gold; rolls 1–2: 0; 3–5: +2 gold; 6: +4 gold | Choose not to stake; retain gold for certain purchases | No building/Idea improves roll; not dependable gold recovery |
| **Grand Embassy** | `src/game/data.ts:160` | Both | Voluntary buyer; one Venture per turn | Pay 2 gold; rolls 1–2: 0; 3–4: +1 influence; 5–6: +2 influence | Civic Tradition free/6 influence or Forum 3 stone supplies future influence without this roll | Gold can be spent for no return |
| **Colonists’ Voyage** | `src/game/data.ts:189`; `src/game/tables.ts:172`; `src/game/tables.ts:278` | Both | Voluntary buyer; one Venture per turn | Pay 2 gold; rolls 1–2: 0; 3–4: +2 food; 5: +3 food; 6: freeman and 2 food, or 4 food with no room | Keep capacity; Marketplace 3 wood, 2 gold uses freeman; use Dole for certain food | Destination is random; room check ignores reserved inbound capacity |
| **The mob torches the works** | `src/game/data.ts:97`; `src/game/tables.ts:254` | Shock | Rioting seat; 1/6 uninsured riots | Lose 1 pop and random building; no building means another pop loss | Any one insurance excludes row 1: 4 food, 3 influence, or citizen demotion | Once rolled, no building selection or replacement insurance |
| **Revolt spreads** | `src/game/data.ts:104` | Shock | Rioting seat; 1/6 uninsured riots | Lose up to 2 pops, slaves first | Any two insurance options exclude row 2; costs as above | Requires two available payments; no post-roll save |
| **Blood in the streets** | `src/game/data.ts:105` | Shock | Rioting seat; 1/6 uninsured riots | Lose 1 pop, slaves first | All three insurance options exclude row 3: 4 food, 3 influence and citizen demotion | Full insurance is expensive and may lack a citizen |
| **Granary sacked** | `src/game/data.ts:106`; `src/game/tables.ts:117` | Shock | Rioting seat; 1/6 uninsured riots | Lose up to 3 food | Prior reserves; future Granary 4 wood or Good Harvest free/6 influence replenishes | Owning a Granary does not prevent it; no trade while riot pending |
| **Bribe demanded** | `src/game/data.ts:112`; `src/game/tables.ts:129` | Shock | Rioting seat; 1/6 uninsured riots | Lose 3 gold; if short, also lose 1 pop | Retain 3 gold before committing; avoid riot with calm 2 gold/influence when sufficient | Full insurance still permits this row and its short-payment pop loss |
| **The mob disperses** | `src/game/data.ts:116` | Windfall | Rioting seat; 1/6 uninsured riots, more with insurance | No row loss; riot has cleared Unrest tokens | Insurance purchases increase access to row 6 | Insurance payments remain spent |
| **Foraging — proposed** | `docs/plans/development-deck.md:133` | Windfall | Drawer; 6/40 | +1 food per settlement | Found for 4 wood, 1 food and sent pop; Frontier Charter free/6 influence extends piece supply | Small realms receive less; result cannot be chosen when buying |
| **Woodcutters — proposed** | `docs/plans/development-deck.md:134` | Windfall | Drawer; 5/40 | +1 wood per settlement | Expansion at current founding price; use for buildings or trade | Random wood access, not durable Wildfire insurance |
| **Quarry gang — proposed** | `docs/plans/development-deck.md:135` | Windfall | Drawer; 5/40 | +1 stone per settlement | Expansion; spend on Forum/Temple 3 stone or Port’s 2 stone | Random stone access; larger realms gain more |
| **Bountiful harvest — proposed** | `docs/plans/development-deck.md:136`; `docs/plans/development-deck.md:128` | Windfall | Drawer; 1/40 | +1 food per realm pop, including slaves and transit | Growth 2/3 food; grants and expansion increase payout; reserve surplus | Rewards already-large populations; cannot be relied on for feeding |
| **Tunny run — proposed** | `docs/plans/development-deck.md:137` | Windfall | Drawer; 1/40 | +5 food | Use immediately for debt, growth or reserve | Rare; no targeting |
| **Timber raft — proposed** | `docs/plans/development-deck.md:138` | Windfall | Drawer; 1/40 | +5 wood | Pays Estate/Granary’s 4 wood, or founding’s 4 wood plus separate food | Rare; does not solve recurring wood production |
| **Marble block — proposed** | `docs/plans/development-deck.md:139` | Windfall | Drawer; 1/40 | +5 stone | Pays Temple/Forum 3 stone, or part of upgrade/Port costs | Rare; no targeting |
| **Caravan — proposed** | `docs/plans/development-deck.md:140` | Windfall | Holder; 4/40 | One chosen material, +1 per settlement | Hold for a known shortage; play at no additional resource price | Cannot play when drawn/received; competes with every other held play |
| **Settlers — proposed** | `docs/plans/development-deck.md:141` | Windfall | Holder; 3/40 | +1 freeman in chosen settlement with room | Hold until capacity exists; Marketplace 3 wood, 2 gold increases output | Later upkeep; cannot rescue a same-turn capacity need when first drawn |
| **Captives — proposed** | `docs/plans/development-deck.md:142` | Windfall | Holder; 2/40 | +1 slave in chosen settlement with room | Hold until working slot and happiness buffer exist; Estate 4 wood | Slave may still worsen happiness; play limit delays deployment |
| **Festival day — proposed** | `docs/plans/development-deck.md:143` | Windfall | Holder; 3/40 | Clear one own Unrest token | Hold for Plague/Local Unrest/Agitators; may restore +3 eligibility | Removes only one; cannot be played when drawn |
| **Raiders — proposed** | `docs/plans/development-deck.md:144` | Both | Chosen rival and attacker; 4/40 | Transfer up to 3 wood, stone, food or gold | Victim: reserves, trade, Dole for food; attacker chooses held resource | No proposed direct interception; targets the victim’s actual stock |
| **Agitators — proposed** | `docs/plans/development-deck.md:145` | Shock | Chosen rival; 2/40 | +1 Unrest token | Temple 3 stone; calm 2 gold/influence; older Festival day clears one | Can remove free-card eligibility as well as worsen unrest |
| **Informer — proposed** | `docs/plans/development-deck.md:146`; `docs/plans/development-deck.md:114` | Shock | Chosen rival with a hand; 2/40 | Discard one random held card | Play a valuable eligible card before exposure; hold multiple options | No card protection; random loss can remove the only prepared answer |