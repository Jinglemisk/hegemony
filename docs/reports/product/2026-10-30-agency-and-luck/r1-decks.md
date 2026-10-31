**Hegemony deck study — 2026-10-30**

The four decks have distinct jobs, but the proposed development deck overlaps heavily with player events. The strongest parts of the design are the year deck’s clear exposure to different builds and the Assembly’s separation between drawing an opportunity and passing it. The largest risks are forced pop windfalls, severe Laws with slow answers, and development cards that reward a realm twice for being large and happy.

My recommendation is to keep these four roles, resolve the development plan’s timing gaps, and assess its effects before adding another deck.

This report is read-only. No files were changed, and no tests, simulations or installations were run. Calculations below use the authored cards and default rules. “Per game” means a game completing all fourteen years; victory checks can end exposure earlier. The default length is fourteen years, and victory is checked before income at turn start. (`src/game/ruleset.ts:259`, `src/game/turn.ts:131`)

All calculated expectations assume a fair shuffle. They are arithmetic from the card lists, not simulation findings. Food, wood, stone, gold, influence, pops and happiness remain separate units.

**The shared economic setting**

Base income is zero. Slaves normally make 1 of their tile’s resource when working; freemen make 1 gold and eat 1 food; citizens make 1 influence and eat 1 food. The bank is disabled. The Dole buys 1 food for 3 influence. These rules make the timing and kind of a windfall matter as much as its printed amount. (`src/game/ruleset.ts:274`, `src/game/ruleset.ts:279`, `src/game/ruleset.ts:284`, `src/game/ruleset.ts:296`)

The current decks are shuffled from a seeded sequence. Players receive neither the seed nor the RNG state in their projections. Draw-pile counts are public, but identities and order are hidden. Revealed year cards and resolved player-event discards are public. Assembly draws and proposals stay private during preparation. (`src/game/state.ts:43`, `src/game/state.ts:67`, `src/game/projection.ts:79`)

---

**Year deck**

The deck has eight card kinds and fourteen cards.

| Card | Copies | Initial chance | Effect |
| --- | ---: | ---: | --- |
| Drought | 2 | 2/14 | Plains slaves produce no food, including the Estate’s increase. |
| Wildfire | 2 | 2/14 | Forest slaves produce no wood, including the Estate’s increase. |
| Silent Mines | 1 | 1/14 | Mountain slaves produce no stone, including the Estate’s increase. |
| Piracy | 2 | 2/14 | Freemen produce no gold, including the Marketplace’s increase. |
| Ostracism | 2 | 2/14 | Citizens produce no influence, including the Forum’s increase. |
| Blockade | 1 | 1/14 | Luxuries provide no happiness for the year. |
| Plague | 2 | 2/14 | Every seat places 1 Unrest token. |
| Festival | 2 | 2/14 | Every seat clears all its Unrest tokens. |

Card definitions: `src/game/data.ts:348`. The income implementation removes the affected class’s entire resource column, including its building increase: `src/game/economy/income.ts:148`, `src/game/economy/income.ts:166`.

**Draw, information and targeting.** One card is revealed as each year begins. Year 1 is revealed after setup, before the first income. Later cards are revealed before that year’s Assembly and before any seat takes its turn. Income suppression lasts that year; Plague and Festival act immediately on reveal. Longer games reshuffle the spent year deck. (`src/game/turn.ts:138`, `src/game/year.ts:20`, `src/game/year.ts:55`, `src/game/turn.ts:190`)

The next card is hidden. The make-up and public discards allow players to count what remains. No seat can choose a card, redraw it or change its probability through a build. Choices change exposure: working slaves, class buildings, luxury holdings and alternative income sources determine the size of the hit. (`src/game/projection.ts:85`, `src/game/economy/income.ts:177`, `src/game/happiness.ts:71`)

These are table-wide events, not leader attacks or catch-up events. Equal application does not mean equal damage.

**Expected loss and spread.** Let a fixed realm normally produce:

- **F** food from plains slaves;
- **W** wood from forest slaves;
- **M** stone from mountain slaves;
- **G** gold from freemen;
- **I** influence from citizens;
- and hold **L** active luxuries.

Include class-building increases in those figures. The following expectations follow from the counts and affected columns. (`src/game/data.ts:348`, `src/game/economy/income.ts:148`)

| Exposure | Expected loss per year-card draw | Loss across all fourteen years, with the realm held fixed |
| --- | ---: | ---: |
| Plains food | F/7 food | 2F food |
| Forest wood | W/7 wood | 2W wood |
| Mountain stone | M/14 stone | M stone |
| Freemen’s gold | G/7 gold | 2G gold |
| Citizens’ influence | I/7 influence | 2I influence |
| Luxury happiness | L/7 happiness levels | 2L happiness levels for one year |

A realm making 8 plains food loses 8 food in each Drought, or 16 food over the full deck if its production stays unchanged. This is a calculation, not a typical observed realm.

The full game has **no variation in the number of each year card**. Variation lies in order, the economy present when it arrives, and the consequences of missed production. The two Droughts are adjacent with probability 1/7. The same holds separately for Wildfire, Piracy, Ostracism, Plague and Festival.

Plague places exactly 2 tokens per seat across the full deck. Festival’s benefit has no fixed total: each copy removes whatever tokens remain then. With **T** existing tokens, an initial-mix draw changes the token count by an expected `(2 − 2T)/14`, before other events or unrest resolution. Clear operations stop at zero. (`src/game/data.ts:397`, `src/game/happiness.ts:120`)

The worst direct income hit is **100% of the affected column for one year**, or two consecutive years for the four duplicated production shocks. Hunger and unrest can turn that temporary loss into permanent pop or building losses. Food income may go negative; hunger is settled at turn end, before the unrest check. (`src/game/core/resources.ts:40`, `src/game/turn.ts:153`, `src/game/turn.ts:172`)

**Connections and judgment.**

- **Alternative food is a real answer to Drought.** Granary food, Sacred Fields food and Good Harvest are separate from the plains slave column. Land Reform also makes slaves produce food on forests and mountains, where Drought does not remove it. Wildfire and Silent Mines do not remove that substituted food. (`src/game/economy/income.ts:179`, `src/game/economy/income.ts:183`, `src/game/economy/income.ts:420`, `src/game/nationalIdeas.ts:4`, `src/game/assembly/deck.ts:5`)
- **Class buildings increase both normal output and exposure.** Marketplace and Forum do not insure their class against Piracy or Ostracism. They increase what disappears. (`src/game/economy/income.ts:160`)
- **The Assembly can react to the revealed year.** It sits after reveal and before income. However, drawing the needed Law still costs influence and is random, and passing it needs votes. (`src/game/turn.ts:190`, `src/game/assembly/assembly.ts:229`)
- **Blockade connects directly to the proposed free-card threshold.** It removes 2 happiness per active luxury and could therefore stop development draws as well as trigger unrest. The development reward would make one existing year card more consequential. (`src/game/ruleset.ts:301`, `src/game/happiness.ts:71`, `docs/plans/development-deck.md:101`)

The deck is clear and compact. Its fixed counts put a limit on how often a build is tested. Its weakness is the lack of preparation time: the shock arrives immediately before income, after that year’s economic commitments have largely been made. Drought is especially sharp because it removes production while free pops still eat. (`src/game/ruleset.ts:279`, `src/game/turn.ts:190`)

A **one-year forecast would be a new mechanic** worth testing if the owner wants more agency here. It would let players stockpile, negotiate and adjust before the shutdown. It would preserve the cards and their counts. I would test that before adding individual protection rules for each disaster.

---

**Player event deck**

The shared deck has twelve card kinds and forty cards.

| Card | Copies | Effect | Expected appearances for one seat in fourteen years |
| --- | ---: | --- | ---: |
| Good Stores | 4 | +2 food | 1.40 |
| Timber | 4 | +2 wood | 1.40 |
| Shipment | 4 | +2 stone | 1.40 |
| Profit | 4 | +2 gold | 1.40 |
| Patronage | 4 | +2 influence | 1.40 |
| Free Settlers | 3 | +1 freeman in a settlement with room | 1.05 |
| Captured Laborers | 3 | +1 slave in a settlement with room | 1.05 |
| Rats | 3 | Lose up to 2 food | 1.05 |
| Bandits | 3 | Lose up to 2 gold | 1.05 |
| Fire | 3 | Lose up to 2 wood | 1.05 |
| Local Unrest | 3 | Place 1 Unrest token | 1.05 |
| Public Calm | 2 | Clear up to 1 Unrest token | 0.70 |

Definitions: `src/game/data.ts:415`. Loss clipping: `src/game/events.ts:127`. Pop placement and capacity: `src/game/events.ts:28`, `src/game/events.ts:63`.

**Draw, information and targeting.** Every income collection draws one event, including a collection suppressed by General Strike. The event resolves before normal actions. A pop card asks its recipient to choose the settlement; if none has room, it is discarded without compensation. Discards reshuffle when the pile empties. (`src/game/actions.ts:300`, `src/game/events.ts:12`, `src/game/events.ts:37`, `rules.md:486`)

The pending card is private to its recipient until resolution. Resolved discards are public. No build changes the chance of receiving a card. Capacity changes whether pop cards pay, and stockpiles change actual resource losses. (`src/game/projection.ts:91`, `src/game/projection.ts:103`, `src/game/events.ts:28`, `src/game/events.ts:133`)

The recipient cannot choose a rival, decline a valid pop award, or exchange an unwanted card for another effect. The implemented resolution choices concern pop placement. (`src/game/events.ts:37`, `src/game/events.ts:86`)

**Expected effect and spread.** Half the cards give resources. Another 15% give pops. Twelve copies, or 30%, are potentially harmful: nine resource losses and three Local Unrest. Public Calm is the remaining 5%. These percentages are calculated from `src/game/data.ts:415`.

For a seat with enough stock to take every printed loss:

| Resource | Mean per draw | Mean over fourteen draws | Standard deviation over fourteen draws |
| --- | ---: | ---: | ---: |
| Food | +0.05 food | +0.70 food | 2.82 food |
| Wood | +0.05 wood | +0.70 wood | 2.82 wood |
| Gold | +0.05 gold | +0.70 gold | 2.82 gold |
| Stone | +0.20 stone | +2.80 stone | 2.02 stone |
| Influence | +0.20 influence | +2.80 influence | 2.02 influence |

These are nominal resource deltas, excluding pop output and unrest consequences. Actual food, wood and gold means are higher when losses are clipped by empty stocks. (`src/game/events.ts:133`)

In a complete game, the table draws forty cards in the first ten years and sixteen after reshuffling. Each seat receives ten cards from the first pass and four from the second. The standard deviations above account for sampling without replacement within each pass.

Each draw also offers an expected 0.075 freemen and 0.075 slaves, subject to capacity. Across fourteen draws that is **1.05 freemen and 1.05 slaves**. Before capacity failures, the chance of receiving neither pop-card kind is about **7.85%**. The chance of never receiving either particular three-copy card kind is about **29.70%**.

Local Unrest places an expected 1.05 tokens per seat-game. Public Calm attempts to clear 0.70. Their nominal difference is +0.35 tokens, but this is not expected end-game unrest: Festival, riots, revolts and zero-token Public Calm draws change it. Riots and revolts clear tokens. (`src/game/happiness.ts:120`, `src/game/riot.ts:27`, `src/game/unrest.ts:74`)

**Worst case for one seat.**

- All fourteen events can be harmful. The expected number is 4.2, but there is no guaranteed helpful allocation.
- One seat can receive six copies of Rats across the two passes, losing up to 12 food. The same separate bound applies to Bandits and Fire.
- One seat can receive six copies of one pop-card kind, or ten pop cards across both kinds. These are possible allocations, not expected outcomes.
- Early pops compound. A year-1 Free Settlers freeman can contribute thirteen later incomes: 13 gold and 13 food upkeep under unchanged base rules. A working slave can contribute thirteen later tile outputs before building increases. (`src/game/actions.ts:323`, `src/game/events.ts:111`, `src/game/ruleset.ts:279`)

There is an important limit on Rats: it **cannot create or deepen a food deficit**. It takes only food held above zero. Drought can create a deficit by removing production before upkeep is paid. Grain Riot has the same stock-limited character as Rats. (`src/game/events.ts:133`, `src/game/core/resources.ts:40`, `src/game/assembly/assembly.ts:908`)

**Connections and judgment.** Resource losses are small and bounded. Their value still depends on a threshold: 2 stone can complete a Temple; 2 influence can fund an Assembly draw; 2 gold can fund a proposed development purchase. (`src/game/data.ts:249`, `src/game/ruleset.ts:326`, `docs/plans/development-deck.md:84`)

Pop events have more lasting variation than the resource cards. They reward spare capacity, but Captured Laborers can also lower happiness immediately. Free Settlers adds future food demand. A full realm loses the whole award, whereas an empty treasury avoids a resource penalty. Those are strong state-dependent differences for a deck with almost no response choices. (`src/game/events.ts:28`, `src/game/events.ts:111`, `src/game/happiness.ts:41`, `src/game/ruleset.ts:279`)

The **2026-10-26** balance check reported resource-card sizes at a median 22% of the turn’s take on both master tables and 18% on the mixed table; the 90th percentile was 50% on all three. That measures immediate resource scale, not the effect of cards on winning or the later output of free pops. (`docs/reports/simulation/2026-10-26-balance-check.md:3`, `docs/reports/simulation/2026-10-26-balance-check.md:65`)

The deck does its job as mandatory local fortune and misfortune. I would preserve that role. If forced pop awards become a problem, allowing a player to decline them would be a **new mechanic**, though a small one. A resource fallback would be another new rule and would need a price; it should not be added automatically.

---

**Assembly resolution decks**

The resolution supply is four separate politician decks, with **one copy of each card**. There are sixteen Laws and six Directives.

| Politician | Cards | Initial chance of each card when drawing here | Prize when the proposal passes |
| --- | ---: | ---: | --- |
| Demosthenes | 6 Laws | 1/6 | Author gains 2 food |
| Perdiccas | 5 Laws | 1/5 | Author gains 2 stone |
| Kleistophenes | 5 Laws | 1/5 | Author gains 2 wood |
| Stratokles | 6 Directives | 1/6 | Author gains 2 gold |

Deck construction uses each definition once. Prizes are paid on enactment. (`src/game/assembly/assembly.ts:1018`, `src/game/ruleset.ts:314`, `src/game/assembly/assembly.ts:829`)

**Complete card inventory.** Every Law applies table-wide, including cards whose wording says “your.” “City” includes the capital for Law scope. Costs below are resulting prices, not additions to the base price. (`src/game/assembly/laws.ts:43`, `src/game/assembly/laws.ts:90`, `src/game/assembly/types.ts:31`, `src/game/assembly/types.ts:44`)

| Politician | Card — one copy each | Effect |
| --- | --- | --- |
| Demosthenes | Land Reform | Working slaves produce food on any terrain. New Estates are forbidden; existing ones remain. (`src/game/assembly/deck.ts:5`, `src/game/assembly/types.ts:80`) |
| Demosthenes | Sacred Fields | Each Temple also produces 2 food. New Temples cost 6 stone. (`src/game/assembly/deck.ts:16`) |
| Demosthenes | Manumission | Slave promotion costs nothing. Slaves count three times for unhappiness. (`src/game/assembly/deck.ts:27`, `src/game/assembly/laws.ts:269`) |
| Demosthenes | Tenant Rights | Growing a slave costs 2 gold; growing a freeman costs 3 gold. These replace their food prices. (`src/game/assembly/deck.ts:38`, `src/game/assembly/laws.ts:144`) |
| Demosthenes | Grain Levy | Freemen eat no food. Marketplaces are idle. (`src/game/assembly/deck.ts:49`) |
| Demosthenes | Festival Calendar | Civic calm costs 2 food or 2 influence. Food replaces the usual gold payment. (`src/game/assembly/deck.ts:60`, `src/game/civic.ts:31`) |
| Perdiccas | Public Works | Estates and Granaries cost 3 wood; Marketplaces cost 2 wood and 2 gold. Colony capacity becomes 3 pops. (`src/game/assembly/deck.ts:68`) |
| Perdiccas | Guild Charter | The capital may grow twice per turn; colonies may not grow. Other cities retain normal growth. (`src/game/assembly/deck.ts:90`, `src/game/assembly/laws.ts:245`) |
| Perdiccas | Forum Rites | Citizens produce 2 influence each. Colony freemen produce no gold. (`src/game/assembly/deck.ts:101`) |
| Perdiccas | Civic Pride | Each realm gains 1 happiness level. Each city, including the capital, pays 1 gold per income. (`src/game/assembly/deck.ts:112`) |
| Perdiccas | Master Builders | Each city gains 1 work slot. Each seat may have one fewer colony standing. (`src/game/assembly/deck.ts:123`, `src/game/settlement.ts:51`) |
| Kleistophenes | Homestead Act | Colonies may hold one building. Cities lose 1 work slot. (`src/game/assembly/deck.ts:134`, `src/game/settlement.ts:51`) |
| Kleistophenes | Colonial Charter | Founding costs 1 food and the founding pop transfer; upgrading costs 6 stone. (`src/game/assembly/deck.ts:145`) |
| Kleistophenes | Frontier Spirit | Founding grants 1 slave, subject to room. Colony capacity becomes 3 pops. (`src/game/assembly/deck.ts:156`, `src/game/assembly/laws.ts:287`) |
| Kleistophenes | Harbour Dues | Ports cost 2 stone. Marketplaces cost 3 wood and 4 gold. (`src/game/assembly/deck.ts:167`) |
| Kleistophenes | Rural Bloc | Each colony adds 1 base vote; each city removes 1. Total base voting strength cannot fall below 1. (`src/game/assembly/deck.ts:183`, `src/game/assembly/assembly.ts:559`) |
| Stratokles | Grain Riot | Chosen rival loses up to 3 food. (`src/game/assembly/deck.ts:194`, `src/game/assembly/assembly.ts:908`) |
| Stratokles | The Streets Burn | Chosen rival places 1 Unrest token. (`src/game/assembly/deck.ts:203`) |
| Stratokles | General Strike | Chosen rival skips its next income collection. This also skips food upkeep and other negative income. The player event still occurs. (`src/game/assembly/deck.ts:212`, `src/game/actions.ts:312`) |
| Stratokles | The Mob Rises | Chosen rival loses 1 pop from its largest settlement: slave first, then freeman, then citizen. (`src/game/assembly/deck.ts:221`, `src/game/assembly/assembly.ts:971`) |
| Stratokles | The Stele Is Broken | Removes the chosen rival’s newest authored Law, if that particular Law’s minimum tenure has ended. It does not fall back to an older eligible Law. (`src/game/assembly/deck.ts:230`, `src/game/assembly/assembly.ts:938`) |
| Stratokles | Isonomia | Chosen rival has exactly 1 base vote at the next Assembly. Bought votes remain possible. (`src/game/assembly/deck.ts:239`, `src/game/assembly/assembly.ts:559`) |

A capacity reduction blocks new arrivals; it does not remove existing pops. Slot calculations also preserve space occupied by existing buildings. Thus Public Works and Frontier Spirit do not kill a fourth colony pop, and Homestead Act does not directly destroy buildings. (`src/game/settlement.ts:23`, `src/game/settlement.ts:51`)

**Draw, information and control.** The default Assembly sits in years 2, 4, 6, 8, 10, 12 and 14. Each seat may pay 2 influence for one secret draw from a politician it chooses. There is no second draw after discarding. A seat can instead pass or propose an eligible repeal for 3 influence. (`src/game/ruleset.ts:314`, `src/game/assembly/assembly.ts:234`, `src/game/assembly/assembly.ts:283`, `src/game/assembly/assembly.ts:388`)

Proposals remain secret until preparation ends. They are then revealed and voted in the year’s turn order. The author chooses a Directive’s rival before sealing the proposal. (`src/game/assembly/assembly.ts:338`, `src/game/assembly/assembly.ts:351`, `src/game/assembly/assembly.ts:501`)

Base votes are 1 plus citizens, modified by Rural Bloc or Isonomia. A bought vote costs 2 gold or 2 influence, normally up to two per sitting. Bought votes remain in the seat’s weight for subsequent ballot items that sitting. Ties fail. (`src/game/assembly/assembly.ts:542`, `src/game/assembly/assembly.ts:565`, `src/game/assembly/assembly.ts:637`, `src/game/ruleset.ts:328`)

Unused draws and defeated proposals return to discards. Active Laws leave circulation until removed. **Passed Directives also return to discards**, so they can recur; their monuments remain. The comment saying enacted cards leave permanently does not describe the Directive implementation. (`src/game/assembly/assembly.ts:507`, `src/game/assembly/assembly.ts:785`, `src/game/assembly/assembly.ts:798`, `src/game/assembly/assembly.ts:875`)

Four Laws may stand. A new Law at the cap replaces the oldest, and a new price Law replaces the standing price Law. Replacement and repeal must respect minimum tenure: a Law survives its enactment sitting and the next sitting. A year-2 Law first becomes removable at year 6. (`src/game/ruleset.ts:318`, `src/game/assembly/assembly.ts:306`, `src/game/assembly/assembly.ts:314`, `src/game/assembly/laws.ts:131`)

**Expected effect and spread.** There is no honest single resource expectation for “an Assembly draw.” The player chooses the distribution, the vote determines whether the card happens, and Laws depend on the whole board and their duration.

The useful accounting is:

- Every paid draw costs exactly **2 influence**.
- A discarded, defeated or blocked draw pays no prize and applies no card effect.
- A passed proposal pays exactly **2 of its politician’s prize resource**, plus the card’s effect.
- Across seven sittings, one seat can make at most seven draws, spend 14 influence on them, and author at most seven successful proposals. Seven successes from one politician pay 14 of that politician’s resource. (`src/game/assembly/assembly.ts:234`, `src/game/assembly/assembly.ts:694`, `src/game/assembly/assembly.ts:829`, `src/game/ruleset.ts:314`)

For a fresh politician deck with **n** cards, the expected effect is the average of its **n** card outcomes, each weighted by its chance of passing. Those chances are decisions and negotiations, not properties of the shuffle. Later probabilities also change when Laws leave circulation.

For scale, a Law passed in year 2 can affect thirteen income collections if it remains through year 14. Sacred Fields can therefore add 26 food per continuously held Temple. Civic Pride can charge 13 gold per continuously held city. These are fixed-board bounds, not forecasts. (`src/game/turn.ts:190`, `src/game/assembly/deck.ts:16`, `src/game/assembly/deck.ts:112`)

Manumission is the sharpest happiness shock in the card list. With **S** slaves, its extra penalty is exactly **S happiness levels**:

`floor(3S/2) − floor(S/2) = S`.

Eight slaves therefore move from −4 to −12 happiness before other terms. Free promotion helps, but the normal ladder permits only one move per turn. (`src/game/assembly/laws.ts:269`, `src/game/happiness.ts:41`, `src/game/civic.ts:98`)

**Worst case for one seat.** Three rivals can each propose a Directive against the same seat in one sitting. Across seven sittings, 21 hostile proposals is a structural upper bound, not an expected frequency. A particular Directive cannot appear twice in the same sitting because its single copy stays held, proposed or set aside until preparation ends. (`src/game/assembly/assembly.ts:234`, `src/game/assembly/assembly.ts:195`, `src/game/assembly/assembly.ts:507`)

General Strike can remove the entire next positive income vector, though skipping upkeep may partly or wholly help the target. The Mob Rises removes one pop with no target-side choice. A hostile Law can remain for the rest of the game; even the first ordinary repeal opportunity comes two sittings after enactment. (`src/game/actions.ts:312`, `src/game/assembly/assembly.ts:971`, `src/game/assembly/assembly.ts:306`)

**Judgment.** This is the strongest deck system for agency. Players choose the family of effect, can reject their draw, choose Directive targets, vote, buy votes and seek repeal. Luck supplies an agenda rather than directly applying the whole result.

Its weaknesses are sunk draws and slow correction. A drawn Law can be illegal because of protected replacements. A legal Law can reshape a build for four years before ordinary removal becomes possible. “Choose the politician” narrows luck, but it does not ensure a usable proposal. (`src/game/assembly/assembly.ts:283`, `src/game/assembly/assembly.ts:331`)

I would review Manumission’s scale before enlarging this deck. I would also make General Strike’s skipped upkeep and Isonomia’s lack of effect after the last Assembly clear to players. Isonomia passed in year 14 still pays its author’s prize, but has no later sitting to affect. (`src/game/assembly/assembly.ts:960`, `src/game/assembly/assembly.ts:829`, `src/game/ruleset.ts:314`)

---

**Proposed development deck**

This is a proposal, not an implemented deck. The current content package still contains expedition tables; it has no development-card collection. (`src/game/content.ts:26`, `src/game/content.ts:38`)

The 2026-10-29 list has forty cards: twenty immediate yields, twelve own held cards and eight rival held cards.

| Card | Copies | Kind | Proposed effect |
| --- | ---: | --- | --- |
| Foraging | 6 | Yield | +1 food per owned settlement |
| Woodcutters | 5 | Yield | +1 wood per owned settlement |
| Quarry gang | 5 | Yield | +1 stone per owned settlement |
| Bountiful harvest | 1 | Yield | +1 food per owned pop |
| Tunny run | 1 | Yield | +5 food |
| Timber raft | 1 | Yield | +5 wood |
| Marble block | 1 | Yield | +5 stone |
| Caravan | 4 | Held | Choose wood, stone or food; gain 1 per settlement when played |
| Settlers | 3 | Held | +1 freeman in a settlement with room |
| Captives | 2 | Held | +1 slave in a settlement with room |
| Festival day | 3 | Held | Clear 1 own Unrest token |
| Raiders | 4 | Rival held | Take up to 3 wood, stone, food or gold from one chosen rival |
| Agitators | 2 | Rival held | Chosen rival places 1 Unrest token |
| Informer | 2 | Rival held | Chosen rival discards 1 random held card |

Source: `docs/plans/development-deck.md:131`. Settlements include capital, cities and colonies. Pops include all classes and pops moving between settlements. (`docs/plans/development-deck.md:128`)

Civic feast and Master builder are suggestions outside this list. They should not be counted as approved cards. (`docs/plans/development-deck.md:220`)

**Proposed draw and information rules.**

- Once per turn, after the player event, pay 2 gold to draw. The table shares one deck; discards reshuffle when exhausted. (`docs/plans/development-deck.md:84`)
- Yields reveal, pay and discard immediately. They do not consume the held-card play. (`docs/plans/development-deck.md:89`)
- Other cards enter a private, unlimited hand. Hand counts are public. One held card may be played per own turn, never on the turn it was drawn or received. (`docs/plans/development-deck.md:97`)
- Standing happiness of at least +3, excluding civic calm, gives one free draw at the end of the own turn. (`docs/plans/development-deck.md:101`)
- Held cards can trade without their identity being specified in the offer. The giver chooses the cards transferred. (`docs/plans/development-deck.md:111`)
- For each pop a riot would remove, the player may instead discard one random held card. Revolts remain unchanged. (`docs/plans/development-deck.md:107`)
- Raiders cannot take stock the target lacks. Informer cannot legally target an empty hand. (`docs/plans/development-deck.md:114`)

These are **new mechanics**, including the purchase, scaling yields, hand, delayed play, card trading, rival transfers, free happiness draw and riot substitution.

**Expected effect per draw.** Let **S** be settlements and **P** be pops. For a draw from the full printed mix:

| Outcome | Expected amount per draw |
| --- | ---: |
| Immediate food | `(6S + P + 5) / 40` food |
| Immediate wood | `(5S + 5) / 40` wood |
| Immediate stone | `(5S + 5) / 40` stone |
| Caravan | 10% chance of a held choice worth S food, wood or stone when played |
| Settlers | 0.075 freemen, if eventually placed |
| Captives | 0.05 slaves, if eventually placed |
| Festival day | 0.075 attempted token clears |
| Raiders | 10% chance of taking up to 3 of one permitted resource |
| Agitators | 0.05 rival tokens placed |
| Informer | 0.05 rival held cards discarded |

Calculated from `docs/plans/development-deck.md:131`. These are separate outcomes, not a common currency valuation.

For an illustrative realm with **4 settlements and 12 pops**, immediate yields average:

- **1.025 food** per draw;
- **0.625 wood** per draw;
- **0.625 stone** per draw.

The immediate-food standard deviation is 2.36 food; the wood and stone standard deviations are 1.49 each. Half the draws give no immediate yield because they enter the hand. Bountiful harvest gives 12 food in this example; a flat yield gives 5 of its resource.

A desired immediate wood payout appears on 6/40 cards, or **15%** of the deck. Caravan adds another 10% chance of a later wood choice. Raiders can also supply wood if a rival has it. Buying a card is therefore an uncertain answer to a wood shortage, even when its average return looks attractive.

**Per-game exposure.** The proposal permits up to fourteen purchases for **28 gold**, plus up to fourteen free draws. That is at most 28 own draws in a complete game, before card trades. With an empty starting hand and delayed play, at most thirteen held cards can be played during those fourteen turns. (`docs/plans/development-deck.md:84`, `docs/plans/development-deck.md:97`, `docs/plans/development-deck.md:101`)

As a benchmark only, fourteen draws at the full printed mix, with the illustrative realm held at four settlements and twelve pops, produce expected immediate totals of **14.35 food, 8.75 wood and 8.75 stone**. They also produce seven held cards on average. This is **not an actual game forecast**.

Unlike player events, held development cards leave circulation. The next shuffle contains discards, not every card. Retaining held cards can make later draws richer in immediate yields; playing cards returns them to circulation. The printed average therefore cannot simply be multiplied by purchases across a game. (`docs/plans/development-deck.md:84`, `docs/plans/development-deck.md:89`, `docs/plans/development-deck.md:97`, `docs/plans/development-deck.md:290`)

**Worst cases and unequal returns.**

- A buyer can spend 2 gold on a held card that provides no useful immediate answer. Repeated purchases can leave 28 gold spent and much of the benefit unrealized by game end.
- Bountiful harvest pays **P food** at once. It has no stated cap. Its spread rises with population.
- Raiders moves up to 3 resources from victim to attacker: a difference of up to **6 of that resource** between those two seats.
- Informer can remove the target’s most valuable held card, or its least useful one. Its loss is determined by the hand, not a fixed resource amount.
- Rival targeting is chosen. The proposal contains no rule requiring the leader to be targeted. (`docs/plans/development-deck.md:114`, `docs/plans/development-deck.md:131`)

Each extra settlement increases an initial-mix draw’s immediate expectation by **0.15 food, 0.125 wood and 0.125 stone**, and increases every Caravan payout by 1 chosen material. Each extra pop adds **0.025 expected immediate food** per draw through Bountiful harvest. These are direct rewards for expansion and population.

**Connections and judgment.**

The deck gives gold a use when nobody will trade. It also gives positive happiness an ongoing reward. Held cards introduce timing and target choices that the player-event deck largely lacks. Those are useful distinctions. (`docs/plans/development-deck.md:11`, `docs/plans/development-deck.md:97`)

The principal risk is that size and happiness multiply each other. Large realms get larger scaling payouts. Happy realms get more draws. A large, happy realm gets both benefits. Flat +5 cards have the same absolute payout for a smaller realm; they do not transfer help toward it. Rival cards might restrain a leader, but only if opponents choose to use them that way.

The plan’s **2026-10-29** estimate of 3.2–3.9 per whole-deck draw uses grow prices for pops, assigns Festival day a value of 1, assumes Raiders takes 3, and assigns Agitators and Informer no own gain. It is a design valuation informed by the **2026-10-26** balance batches, not an observed development-deck result or a fixed exchange rate against gold. It does not establish that each purchase pays its buyer. (`docs/plans/development-deck.md:155`, `docs/plans/development-deck.md:163`)

Three points need explicit treatment before implementation:

1. **Free food and hunger timing.** The plan places the free draw at the riot check. The current engine settles hunger before that check. Read literally, free food arrives after hungry pops have left. Moving the free draw before hunger would be a **new timing rule**, not an implementation detail. (`docs/plans/development-deck.md:101`, `src/game/turn.ts:153`, `src/game/turn.ts:172`)
2. **Hand retention changes the economy.** Measure yields and held cards separately after each reshuffle. The forty-card average is insufficient once hands retain cards. (`docs/plans/development-deck.md:84`, `docs/plans/development-deck.md:97`)
3. **Riot substitution does not cure the build.** Spending a card preserves the slave count and its unhappiness. It can turn the hand into recurring insurance for an otherwise unstable realm. (`docs/plans/development-deck.md:107`, `src/game/happiness.ts:41`)

I would keep the approved card kinds and 2-gold starting price for the first assessment. The evidence does not yet justify replacing that direction. The useful questions are realized resources by resource, unused hands, free-draw frequency, targets of rival cards, and whether purchases displace player trade.

---

**Overlap, missing events and design choices**

| Deck | Distinct role | Main overlap |
| --- | --- | --- |
| Year | Shared pressure on economic specialization | Unrest placement and removal also occur elsewhere |
| Player event | Mandatory local fortune and misfortune | Resource and pop windfalls overlap with development |
| Assembly | Player-selected political agenda, subject to a vote | Targeted unrest overlaps with development attacks |
| Development, proposed | Purchased uncertainty, timed actions and private tradeable holdings | Repeats resource awards, settlers, captives and token clearing |

This comparison follows the four inventories above: `src/game/data.ts:348`, `src/game/data.ts:415`, `src/game/assembly/deck.ts:4`, `docs/plans/development-deck.md:131`.

The main uncovered roles are:

- **Advance warning and conditional protection.** No listed deck gives a forecast or a held response that cancels a named year shock.
- **Automatic catch-up.** No listed card explicitly rewards the weakest seat or automatically targets the leader. Stock-limited losses offer some incidental protection to empty treasuries.
- **A public opportunity players compete to fulfil.** There are no listed public contracts with a known requirement and reward.
- **Specific hand defence.** Informer has no listed counter-card. Playing or trading cards reduces exposure, but does not protect a retained card.

These are inventory findings, not reasons to add four systems. A fifth deck is not supported yet. Forecasting can be tested through the year deck; protection can use a small number of development cards if later evidence warrants it. A public-contract deck would have a different role, but would introduce a new objective system and more decisions.

The most useful next design work is narrower: assess Manumission’s severity, specify free-draw timing, and compare development’s realized gains between large and small realms and between happiness builds. The **2026-10-26** balance check found year-14 mean happiness near zero, but that does not predict behavior after +3 begins paying cards. Its reported means were −0.2 and −0.1 on the master tables and −0.6 on the mixed table. (`docs/reports/simulation/2026-10-26-balance-check.md:117`)

## Shocks, windfalls and levers

The following costs are current defaults unless marked **proposed**:

- **Trade:** negotiated payment; every resource can trade. There is no fixed price or guaranteed partner. (`src/game/trade.ts:30`, `src/game/trade.ts:38`)
- **Civic calm:** once per turn, 2 gold or 2 influence for +2 happiness until the year turns. Festival Calendar replaces the gold option with 2 food. (`src/game/civic.ts:31`, `src/game/ruleset.ts:307`)
- **Temple:** 3 stone for +1 happiness. **Port:** 4 gold and 2 stone; an active claimed luxury contributes +2 happiness. (`src/game/data.ts:249`, `src/game/data.ts:261`, `src/game/ruleset.ts:301`)
- **Assembly vote:** base votes have no resource charge; each bought vote costs 2 gold or 2 influence, normally at most two per sitting. **Repeal:** 3 influence, an eligible Law and a successful vote. (`src/game/ruleset.ts:327`, `src/game/assembly/assembly.ts:388`, `src/game/assembly/assembly.ts:542`)
- **Proposed held-card play:** no additional resource payment; costs the turn’s one held-card play and requires a card acquired before that turn. Acquisition costs 2 gold, a qualifying free draw or negotiated trade. (`docs/plans/development-deck.md:84`, `docs/plans/development-deck.md:97`)

| Event | Source | Kind (shock / windfall / both) | Who it hits, how often | Size in game units | Levers that answer it, and what each lever costs | Gap (no answer, or answer too costly or too slow) |
| --- | --- | --- | --- | --- | --- | --- |
| Drought | Year; `src/game/data.ts:350` | Shock | All seats; 2/14 years | All plains-slave food for one income | Granary: 4 wood, +2 food; Good Harvest: setup pick or 6 influence, +2 food; Dole: 3 influence/food; Trade: negotiated | Global food production falls together; no guaranteed supplier or advance warning |
| Wildfire | Year; `src/game/data.ts:358` | Shock | All seats; 2/14 years | All forest-slave wood for one income | Stockpile wood; Trade: negotiated; proposed Caravan: held play | No current fixed conversion into wood; Estate does not protect output |
| Silent Mines | Year; `src/game/data.ts:366` | Shock | All seats; 1/14 years | All mountain-slave stone for one income | Stockpile stone; Trade: negotiated; proposed Caravan: held play | No current fixed conversion into stone |
| Piracy | Year; `src/game/data.ts:374` | Shock | All seats; 2/14 years | All freemen’s gold for one income | Stockpile gold; Trade: negotiated | Marketplace output also disappears; freemen normally still eat |
| Ostracism | Year; `src/game/data.ts:382` | Shock | All seats; 2/14 years | All citizens’ influence for one income | Civic Tradition: setup pick or 6 influence, +2 influence; stockpile; Trade: negotiated | Forum output also disappears; affects later spending capacity |
| Blockade | Year; `src/game/data.ts:390` | Shock | All seats; 1/14 years | −2 happiness per active luxury for the year | Civic calm: 2 gold/influence, +2; Temple: 3 stone, +1 | Multiple goods can lose more happiness than one calm can cover; proposed free draws also stop |
| Plague | Year; `src/game/data.ts:398` | Shock | All seats; 2/14 years | +1 Unrest token each | Civic calm: 2 gold/influence; Temple: 3 stone; proposed Festival day: held play | No chosen current action directly clears one token |
| Festival | Year; `src/game/data.ts:406` | Windfall | All seats; 2/14 years | Clears every existing Unrest token | Automatic; no payment | Pays nothing at zero tokens; cannot be scheduled |
| Good Stores | Player event; `src/game/data.ts:418` | Windfall | Recipient; 4/40 draws | +2 food | Use for upkeep or growth; slave growth costs 2 food, freeman growth 3 | Arrives after income; amount may not cover a deficit |
| Timber | Player event; `src/game/data.ts:426` | Windfall | Recipient; 4/40 | +2 wood | Granary/Estate: 4 wood; Trade: negotiated | Usually part of a purchase, not a complete building |
| Shipment | Player event; `src/game/data.ts:434` | Windfall | Recipient; 4/40 | +2 stone | Temple/Forum: 3 stone; Trade: negotiated | Cannot choose this payout when stone is needed |
| Profit | Player event; `src/game/data.ts:442` | Windfall | Recipient; 4/40 | +2 gold | Civic calm: 2 gold; proposed development purchase: 2 gold; Trade: negotiated | Competing uses; no material purchase at a bank |
| Patronage | Player event; `src/game/data.ts:450` | Windfall | Recipient; 4/40 | +2 influence | Assembly draw: 2 influence; civic calm: 2 influence; Dole: 3 influence/food | Mandatory event does not guarantee the needed timing |
| Free Settlers | Player event; `src/game/data.ts:458` | Both | Recipient; 3/40 | +1 freeman; normally +1 gold and −1 food at later incomes | Choose a settlement with room: no payment; Granary: 4 wood for future food | No compensation if full; placement is chosen but award is compulsory when valid |
| Captured Laborers | Player event; `src/game/data.ts:468` | Both | Recipient; 3/40 | +1 slave; may lower happiness by 1 | Choose productive room: no payment; slave promotion: 2 food and ladder use; Temple: 3 stone | Can create an idle slave or cross an unrest threshold |
| Rats | Player event; `src/game/data.ts:476` | Shock | Recipient; 3/40 | Lose up to 2 food above zero | Food reserve; Dole: 3 influence/food; Trade: negotiated | Cannot prevent the loss, though it cannot create a deficit |
| Bandits | Player event; `src/game/data.ts:484` | Shock | Recipient; 3/40 | Lose up to 2 gold | Gold reserve; Trade: negotiated | Can break an exact purchase threshold |
| Fire | Player event; `src/game/data.ts:492` | Shock | Recipient; 3/40 | Lose up to 2 wood | Wood reserve; Trade: negotiated | No chosen current conversion into replacement wood |
| Local Unrest | Player event; `src/game/data.ts:500` | Shock | Recipient; 3/40 | +1 Unrest token | Civic calm: 2 gold/influence; Temple: 3 stone; proposed Festival day: held play | Direct clearing depends on another draw or suffering unrest |
| Public Calm | Player event; `src/game/data.ts:508` | Windfall | Recipient; 2/40 | Clears up to 1 Unrest token | Automatic; no payment | Wasted at zero tokens |
| Land Reform | Demosthenes; `src/game/assembly/deck.ts:5` | Both | All seats if passed; 1/6 fresh Demosthenes draws | Working slaves switch to food; new Estates forbidden | Oppose: free base votes, 2 gold/influence per extra; repeal: 3 influence plus vote | Can remove wood/stone production for several years |
| Sacred Fields | Demosthenes; `src/game/assembly/deck.ts:16` | Both | All seats if passed; 1/6 | +2 food/Temple; Temple price 6 stone | Existing Temples benefit; oppose with votes; repeal: 3 influence plus vote | New happiness becomes more expensive in stone |
| Manumission | Demosthenes; `src/game/assembly/deck.ts:27` | Both | All seats if passed; 1/6 | Free slave promotion; extra unhappiness equals slave count | Promote: no resources under Law, one ladder use/turn; oppose; repeal: 3 influence plus vote | Promotion can be much slower than the happiness shock |
| Tenant Rights | Demosthenes; `src/game/assembly/deck.ts:38` | Both | All seats if passed; 1/6 | Slave growth 2 gold; freeman growth 3 gold | Trade for gold: negotiated; oppose; repeal: 3 influence plus vote | Food-rich, gold-poor realms can lose growth access |
| Grain Levy | Demosthenes; `src/game/assembly/deck.ts:49` | Both | All seats if passed; 1/6 | Saves 1 food/freeman/income; removes Marketplace benefit | Oppose; repeal: 3 influence plus vote | Existing Marketplace investment becomes idle |
| Festival Calendar | Demosthenes; `src/game/assembly/deck.ts:60` | Both | All seats if passed; 1/6 | Calm payment becomes 2 food or 2 influence | Use influence option: 2 influence; oppose; repeal: 3 influence plus vote | Gold no longer answers an urgent happiness shortage |
| Public Works | Perdiccas; `src/game/assembly/deck.ts:68` | Both | All seats if passed; 1/5 | Estate/Granary 3 wood; Marketplace 2 wood +2 gold; colony capacity 3 | Upgrade colony: normally 3 wood +3 stone; oppose; repeal: 3 influence plus vote | Capacity limits new arrivals and pop-card rewards |
| Guild Charter | Perdiccas; `src/game/assembly/deck.ts:90` | Both | All seats if passed; 1/5 | Capital growth limit 2; colony growth limit 0 | Grow in capital at normal pop prices; upgrade colony: normally 3 wood +3 stone; oppose/repeal | Colony growth builds need costly upgrades |
| Forum Rites | Perdiccas; `src/game/assembly/deck.ts:101` | Both | All seats if passed; 1/5 | Citizens make 2 influence; colony freemen make 0 gold | Upgrade colony: normally 3 wood +3 stone; oppose; repeal: 3 influence plus vote | Colony freemen retain food demand unless another Law changes it |
| Civic Pride | Perdiccas; `src/game/assembly/deck.ts:112` | Both | All seats if passed; 1/5 | +1 happiness; −1 gold/city/income | Trade for gold: negotiated; oppose; repeal: 3 influence plus vote | Broad city holdings face recurring gold costs |
| Master Builders | Perdiccas; `src/game/assembly/deck.ts:123` | Both | All seats if passed; 1/5 | +1 city work slot; −1 allowed colony | Upgrade colony: normally 3 wood +3 stone; oppose; repeal: 3 influence plus vote | Slot benefit and expansion restriction favour different builds |
| Homestead Act | Kleistophenes; `src/game/assembly/deck.ts:134` | Both | All seats if passed; 1/5 | One colony building allowed; −1 city work slot | Colony building: its printed cost; oppose; repeal: 3 influence plus vote | City slave output can fall as open slots shrink |
| Colonial Charter | Kleistophenes; `src/game/assembly/deck.ts:145` | Both | All seats if passed; 1/5 | Founding costs 1 food plus transferred pop; upgrade costs 6 stone | Exploit cheaper founding; Trade for stone: negotiated; oppose/repeal | Upgrading becomes harder for wood-rich, stone-poor realms |
| Frontier Spirit | Kleistophenes; `src/game/assembly/deck.ts:156` | Both | All seats if passed; 1/5 | +1 slave/founding; colony capacity 3 | Founding: normally 4 wood +1 food plus transferred pop; promotion: 2 food; oppose/repeal | More slaves and less colony room can raise happiness and capacity pressure |
| Harbour Dues | Kleistophenes; `src/game/assembly/deck.ts:167` | Both | All seats if passed; 1/5 | Port costs 2 stone; Marketplace 3 wood +4 gold | Build Port: 2 stone; oppose; repeal: 3 influence plus vote | Luxury access becomes cheaper while freeman investment becomes dearer |
| Rural Bloc | Kleistophenes; `src/game/assembly/deck.ts:183` | Both | All seats if passed; 1/5 | +1 vote/colony, −1/city; base floor 1 | Buy votes: 2 gold/influence each; oppose; repeal: 3 influence plus vote | Urban seats may lose the votes needed to remove it |
| Grain Riot | Stratokles; `src/game/assembly/deck.ts:194` | Shock | Chosen rival if passed; 1/6 fresh Stratokles draws; recurs | Lose up to 3 food | Oppose with base/bought votes; Dole: 3 influence/food; Trade: negotiated | Target has no veto or compensation |
| The Streets Burn | Stratokles; `src/game/assembly/deck.ts:203` | Shock | Chosen rival if passed; 1/6; recurs | +1 Unrest token | Oppose; civic calm: 2 gold/influence; proposed Festival day: held play | Can combine with Plague or Local Unrest |
| General Strike | Stratokles; `src/game/assembly/deck.ts:212` | Both | Chosen rival if passed; 1/6; recurs | Skips next income vector, including upkeep | Oppose with votes; stockpile; Trade: negotiated | No income protection; full production loss scales with realm |
| The Mob Rises | Stratokles; `src/game/assembly/deck.ts:221` | Shock | Chosen rival if passed; 1/6; recurs | −1 pop from largest settlement, lowest class first | Oppose; regrow slave for 2 food or freeman for 3 food where legal | No target-side loss choice; citizen replacement needs promotion |
| The Stele Is Broken | Stratokles; `src/game/assembly/deck.ts:230` | Both | Chosen rival’s newest authored Law; 1/6; recurs | Removes 1 eligible Law table-wide | Oppose with votes; minimum tenure protects recent Law at no payment | Cannot choose a different Law; can do nothing |
| Isonomia | Stratokles; `src/game/assembly/deck.ts:239` | Shock | Chosen rival at next sitting; 1/6; recurs | Base votes become 1 | Buy votes: 2 gold/influence each, usual cap 2 | Wealth only partly replaces a large citizen vote; no effect after final sitting |
| Foraging | Proposed development; `docs/plans/development-deck.md:133` | Windfall | Drawer; 6/40 initial mix | +S food immediately | Purchase: 2 gold or qualifying free draw; spend on food needs | Payout rewards settlement count; food cannot be selected on purchase |
| Woodcutters | Proposed development; `docs/plans/development-deck.md:134` | Windfall | Drawer; 5/40 | +S wood immediately | Purchase: 2 gold or free draw; build or Trade at negotiated price | Same purchase gives a smaller realm less wood |
| Quarry gang | Proposed development; `docs/plans/development-deck.md:135` | Windfall | Drawer; 5/40 | +S stone immediately | Purchase: 2 gold or free draw; Temple/Forum normally 3 stone | Same purchase gives a smaller realm less stone |
| Bountiful harvest | Proposed development; `docs/plans/development-deck.md:136` | Windfall | Drawer; 1/40 | +P food immediately | Purchase: 2 gold or free draw; retain food or Trade at negotiated price | Large, uncapped payout; not a dependable hunger answer |
| Tunny run | Proposed development; `docs/plans/development-deck.md:137` | Windfall | Drawer; 1/40 | +5 food immediately | Purchase: 2 gold or free draw | Rare; free-draw timing may be after hunger |
| Timber raft | Proposed development; `docs/plans/development-deck.md:138` | Windfall | Drawer; 1/40 | +5 wood immediately | Purchase: 2 gold or free draw; Granary/Estate normally 4 wood | Rare; cannot choose it |
| Marble block | Proposed development; `docs/plans/development-deck.md:139` | Windfall | Drawer; 1/40 | +5 stone immediately | Purchase: 2 gold or free draw; Temple/Forum normally 3 stone | Rare; cannot choose it |
| Caravan | Proposed development; `docs/plans/development-deck.md:140` | Windfall | Holder; 4/40 | +S chosen food, wood or stone | One held-card play; prior acquisition | Good shortage answer only if already held; scales with expansion |
| Settlers | Proposed development; `docs/plans/development-deck.md:141` | Windfall | Holder; 3/40 | +1 freeman with room | One held-card play; reserve capacity | Needs food at later incomes; no stated full-capacity fallback |
| Captives | Proposed development; `docs/plans/development-deck.md:142` | Windfall | Holder; 2/40 | +1 slave with room | One held-card play; choose useful capacity; promotion normally 2 food | Extra slave may be idle or lower happiness; player can delay play |
| Festival day | Proposed development; `docs/plans/development-deck.md:143` | Windfall | Holder; 3/40 | Clear up to 1 own Unrest token | One held-card play | Competes with all other held plays; does not change slave unhappiness |
| Raiders | Proposed development; `docs/plans/development-deck.md:144` | Both | Chosen rival and attacker; 4/40 | Transfer up to 3 of one resource; up to 6-resource difference between them | Victim can spend or Trade stocks at ordinary costs | No listed counter; attacker selects target and resource |
| Agitators | Proposed development; `docs/plans/development-deck.md:145` | Shock | Chosen rival; 2/40 | +1 Unrest token | Civic calm: 2 gold/influence; Temple: 3 stone; Festival day: held play | Repeats existing unrest pressure; clearing requires an available answer |
| Informer | Proposed development; `docs/plans/development-deck.md:146` | Shock | Chosen rival with a nonempty hand; 2/40 | Discard 1 random held card | Play a card: one play/turn; Trade cards: negotiated | No specific defence; random loss can take the best retained card |