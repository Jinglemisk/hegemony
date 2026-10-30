# Happiness and pops: agency, luck and recovery

Study date: **2026-10-30**. Checkout: **`11ffbe7`**. This report uses code reading and existing reports. No files were changed, and no simulations or tests were run.

**The main design issue is the size of a shock compared with the speed of recovery.** Players can usually answer a one-level happiness loss during their turn. Blockade and Manumission can remove several levels at once, while promotion remains limited to one pop per turn. Positive happiness currently gives protection, a title and a tiebreak advantage, but no recurring economic return. The proposed development deck would change that. (`src/game/civic.ts:86`; `src/game/data.ts:389`; `src/game/assembly/laws.ts:271`; `src/game/victory.ts:75`; `docs/plans/development-deck.md:101`)

## 1. Happiness is a board calculation

Happiness is one **realm-wide integer level**. It is recalculated from current holdings, not accumulated each year. There is no explicit minimum or maximum clamp in the calculation. (`src/game/happiness.ts:51`; `src/game/happiness.ts:107`)

Under the default rules:

> **Happiness = Temples + 2 × active luxury goods − floor(slaves ÷ 2) − Unrest tokens + temporary calm + Law contributions**

Every slave counts, including idle slaves and slaves travelling between settlements. (`src/game/happiness.ts:59`; `src/game/happiness.ts:83`; `src/game/ruleset.ts:285`; `src/game/core/query.ts:54`)

| Term | Effect | Persistence and limits |
|---|---|---|
| Temple | +1 happiness each | While the building stands. Realm-wide, regardless of where slaves live. (`src/game/data.ts:249`; `src/game/happiness.ts:59`) |
| Active luxury good | +2 happiness each | While owned and unsuppressed. No holding cap. Blockade removes the entire luxury term for its year. (`src/game/luxury.ts:57`; `src/game/luxury.ts:64`; `src/game/ruleset.ts:301`) |
| Slaves | −1 per complete pair | Working, idle and travelling slaves all count. An unmatched slave adds no further penalty. (`src/game/happiness.ts:41`; `src/game/happiness.ts:63`) |
| Unrest tokens | −1 each | Persist until explicitly cleared. There is no automatic annual decay. (`src/game/happiness.ts:88`; `src/game/happiness.ts:120`; `src/game/year.ts:8`) |
| Stabilize Province / Bread & Circuses | +2 happiness | Lasts until the year changes. One shared use per turn; cannot stack. (`src/game/ruleset.ts:307`; `src/game/civic.ts:31`; `src/game/year.ts:16`) |
| Civic Pride | +1 happiness per realm | While the Law stands. Each city also pays 1 gold at income. (`src/game/assembly/deck.ts:113`) |
| Manumission | Replaces the slave penalty with −floor(3 × slaves ÷ 2) | Its additional penalty is exactly **−1 happiness per slave**, compared with the ordinary calculation. (`src/game/assembly/deck.ts:28`; `src/game/assembly/laws.ts:271`) |

Freemen, citizens, food stocks and hunger contribute **no direct happiness term**. None of the current National Ideas directly adds happiness. Their connections are through food, pops, work slots and the resources used to buy calm. (`src/game/happiness.ts:74`; `src/game/nationalIdeas.ts:3`)

### What each level does

| Happiness | Current consequence |
|---|---|
| 0 or higher | The unrest status is “calm.” No unrest loss. (`src/game/unrest.ts:110`) |
| −1 or −2 | “Discontent.” No automatic economic or population penalty. (`src/game/unrest.ts:116`; `src/game/unrest.ts:46`) |
| −3, −4 or −5 | A riot at the end of the owner’s turn. All three levels use the same riot table. (`src/game/ruleset.ts:286`; `src/game/unrest.ts:46`) |
| −6 or lower | A revolt instead of a riot. Half the realm’s slaves leave, rounded down and limited to slaves standing in settlements. (`src/game/unrest.ts:38`; `src/game/unrest.ts:76`) |
| Standing happiness 4 or higher | Can hold **Beloved of the People**, if the sole happiness leader. Temporary calm does not count. (`src/game/ruleset.ts:267`; `src/game/victory.ts:75`; `src/game/victory.ts:103`) |
| Any standing level at game end | Breaks a tie on titles, before total pops. Temporary calm does not count. (`src/game/victory.ts:169`) |
| Standing happiness 3 or higher | **Proposed:** one free development card at the owner’s turn end. This is not implemented. (`docs/plans/development-deck.md:101`; `src/game/content.ts:26`) |

There is consequently a broad **economic plateau** today: happiness above the danger lines does not increase production or growth. It still protects against shocks and matters for victory. The income calculation has no happiness multiplier. (`src/game/economy/income.ts:227`; `src/game/victory.ts:169`)

### Every direct token source and clearance

Current cards place one Unrest token through **Plague**, **Local Unrest** and **The Streets Burn**. **Public Calm** clears one; **Festival** clears all. A riot or revolt also clears all tokens. Paid civic calm adds a temporary bonus; it does not remove tokens. (`src/game/data.ts:398`; `src/game/data.ts:500`; `src/game/assembly/deck.ts:203`; `src/game/data.ts:508`; `src/game/data.ts:406`; `src/game/riot.ts:27`; `src/game/unrest.ts:76`; `src/game/civic.ts:73`)

The development proposal adds **Agitators**, which places a token on a chosen rival, and **Festival day**, which clears one of the owner’s tokens. Both are held cards. (`docs/plans/development-deck.md:141`)

Happiness can also fall without gaining tokens: losing a Temple, giving away a luxury, entering Blockade, losing Civic Pride, acquiring more slaves, or reaching the year boundary after buying calm. These change the terms of the calculation directly. (`src/game/happiness.ts:74`; `src/game/trade.ts:368`; `src/game/year.ts:16`; `src/game/assembly/assembly.ts:884`)

## 2. Timing determines which answers work

A player normally gets a full turn to answer the visible problem:

1. The new year resets calm and action limits, then reveals its year card. In sitting years, the Assembly happens before ordinary player turns. (`src/game/year.ts:69`; `src/game/turn.ts:190`)
2. Travelling pops arrive before the owner’s next income. Victory is checked before that income. (`src/game/turn.ts:221`)
3. Income and upkeep apply, then the player draws a Player Event. (`src/game/actions.ts:323`)
4. The player resolves that event before taking ordinary actions. They may then trade, buy food through the Dole, build, grow, promote or buy calm where legal. (`src/game/actors.ts:170`; `src/game/actors.ts:189`)
5. Ending short of food first opens the hunger choice. Hunger resolves before the happiness check. (`src/game/turn.ts:157`; `src/game/hunger.ts:105`)
6. The happiness check causes no unrest, a riot, or a revolt. A pending riot allows only insurance and the roll; ordinary repair actions are over. (`src/game/turn.ts:176`; `src/game/actors.ts:174`)

This creates an important distinction:

- **A new Temple or a promotion changes this turn’s happiness immediately.**
- **A new Granary or a newly acquired food-producing slave does not pay another income this turn.**

Income is collected once, while buildings and pop changes mutate the board immediately. (`src/game/actions.ts:307`; `src/game/actions.ts:375`; `src/game/actions.ts:413`; `src/game/civic.ts:159`)

The next year card and undrawn Player Events are hidden. Discards are public, so remaining counts can narrow the possibilities, but a normal player cannot inspect the next card. (`src/game/projection.ts:79`)

## 3. Population: production, acquisition and loss

### The three classes

These are default values before Laws and buildings.

| Pop | Makes at each income | Eats | Direct happiness cost | Acquisition |
|---|---|---|---|---|
| Slave | 1 food, wood or stone from its tile, if it has an open work slot; nothing on an ordinary hill | Nothing | −1 per complete pair across the realm | Grow for 2 food; receive through events, trade, grants or demotion. (`src/game/ruleset.ts:279`; `src/game/data.ts:54`; `src/game/settlement.ts:73`) |
| Freeman | 1 gold, wherever it lives | 1 food | None | Grow for 3 food; promote a slave for 2 food; receive through events, trade, grants or citizen demotion. (`src/game/ruleset.ts:279`; `src/game/data.ts:54`; `src/game/ruleset.ts:309`) |
| Citizen | 1 influence, wherever it lives | 1 food | None | Setup, promotion of a freeman for 2 gold, or trade of an existing citizen. Citizens cannot be grown. (`src/game/ruleset.ts:250`; `src/game/ruleset.ts:279`; `src/game/ruleset.ts:309`; `src/game/status.ts:355`; `src/game/trade.ts:353`) |

**Estate**, **Marketplace** and **Forum** raise their settlement’s relevant class output to 2. They do not double upkeep. An Estate helps only slaves that still have work slots. (`src/game/data.ts:229`; `src/game/economy/income.ts:451`)

Citizens also add to Assembly voting strength: the ordinary base is one vote plus citizens, modified by standing rules. Travelling citizens still count. Total pops and citizens also support **Demos** and **Civic Elite**, with default minimums of 14 pops and 5 citizens. (`src/game/assembly/assembly.ts:542`; `src/game/victory.ts:37`; `src/game/ruleset.ts:267`)

### Setup, growth and the ladder

Standard setup gives each seat a capital with four pops, exactly one a citizen, and a colony with two non-citizen pops. The remaining classes are chosen by the player. (`src/game/ruleset.ts:249`; `src/game/ruleset.ts:333`; `src/game/core/pops.ts:18`; `src/game/core/pops.ts:36`)

Cities and capitals have capacity 8; colonies have capacity 4. Normal growth is once per settlement per turn. Incoming transfers reserve room, including when an event or growth action checks capacity. (`src/game/data.ts:63`; `src/game/assembly/laws.ts:185`; `src/game/status.ts:376`; `src/game/settlement.ts:136`; `src/game/events.ts:62`)

Promotion and demotion share **one ladder move per player turn**, rather than one per settlement:

- Slave → freeman: 2 food.
- Freeman → citizen: 2 gold.
- Citizen → freeman: 1 influence.
- Freeman → slave: 1 influence.

A riot’s Concession is the exception: its citizen demotion is free and ignores the normal ladder throttle. (`src/game/ruleset.ts:308`; `src/game/civic.ts:86`; `src/game/civic.ts:110`)

Promotion does not require spare population capacity because it replaces one class with another. It can therefore repair happiness in a full settlement. It also changes future production and upkeep: promoting a slave removes its material output and adds a freeman’s food consumption and gold production. (`src/game/civic.ts:86`; `src/game/civic.ts:159`; `src/game/ruleset.ts:279`)

### Movement and trade

A paid move costs **1 food per pop**, moves any selected group between two owned settlements, and is limited to one move per turn. Arrival is at the start of the owner’s next turn. There is no distance check in the move validator. (`src/game/status.ts:399`; `src/game/actions.ts:424`; `src/game/turn.ts:225`)

Moving slaves does **not** reduce their happiness cost. Travelling pops still count for titles and votes, but hunger, riots and revolts cannot take them while travelling. (`src/game/core/query.ts:45`)

Founding a colony costs **4 wood and 1 food** and sends one existing pop of any class. It does not create that founding pop. The colony begins empty until its founder arrives; separate Law or Idea grants may add pops immediately. (`src/game/data.ts:42`; `src/game/actions.ts:169`; `src/game/actions.ts:213`)

All three pop classes can trade. Ownership changes when the deal settles, and the received pops travel to the receiver’s settlement. Slaves therefore affect their new owner’s happiness immediately, before arrival. Resources and luxury ownership also transfer immediately. Prices depend on agreement between players. (`src/game/trade.ts:353`; `src/game/core/query.ts:54`)

### Other ways to gain pops

| Source | Gain |
|---|---|
| Free Settlers | One freeman; player chooses a settlement with room. (`src/game/data.ts:458`; `src/game/events.ts:37`) |
| Captured Laborers | One slave; player chooses a settlement with room. (`src/game/data.ts:468`; `src/game/events.ts:37`) |
| Colonists’ Voyage | On a 6, one freeman in a randomly selected settlement with room, plus 2 food. If none has room, the freeman becomes another 2 food. (`src/game/data.ts:188`; `src/game/tables.ts:172`; `src/game/tables.ts:278`) |
| New Settlers | Choose one slave or freeman when taking the Idea. (`src/game/nationalIdeas.ts:40`; `src/game/ideas.ts:159`) |
| City Pioneers | One freeman when upgrading a colony, if there is room. (`src/game/nationalIdeas.ts:47`; `src/game/actions.ts:253`) |
| Slave Colonies | One slave per new colony, as room allows. (`src/game/nationalIdeas.ts:53`; `src/game/actions.ts:213`) |
| Frontier Spirit | One slave per new colony; also sets colony capacity to 3. (`src/game/assembly/deck.ts:156`) |

National Ideas are chosen, not randomly drawn: one exclusive setup pick, then at most one purchase for 6 influence. Their availability can be denied by another player taking them first. (`src/game/ideas.ts:47`; `src/game/ideas.ts:85`; `src/game/ruleset.ts:312`)

### Every population-loss route

- **Hunger:** chosen eating freemen or citizens leave. (`src/game/hunger.ts:81`)
- **Riot:** slaves first, then freemen, then citizens. Each loss comes from the settlement holding the most of that class, with founding order breaking ties. (`src/game/tables.ts:201`)
- **Revolt:** only slaves leave, using the same settlement selection rule. (`src/game/unrest.ts:76`; `src/game/tables.ts:211`)
- **The Mob Rises:** one pop leaves the largest settlement; within that settlement, slaves go before freemen, then citizens. (`src/game/assembly/assembly.ts:971`)
- **Rival city upgrade:** upgrading a shared tile removes the other player’s colony, including its resident pops. This is an additional loss route outside hunger and unrest. (`src/game/actions.ts:247`)
- **Failed arrival:** travelling pops return to an owned source if their destination has disappeared. If neither endpoint is still owned by the travelling pops’ owner, the arrival routine removes the transfer without restoring those pops. This is an implementation edge worth retaining in the next agent’s review. (`src/game/actions.ts:447`)

Ordinary hunger and riot losses do not remove the settlement when its population reaches zero. (`src/game/hunger.ts:139`; `src/game/tables.ts:204`)

There is also a capacity inconsistency: Player Events reserve room for incoming transfers, but Colonists’ Voyage checks only resident pops. The development plan already identifies this as the Voyage’s “room bug.” (`src/game/events.ts:62`; `src/game/tables.ts:290`; `docs/plans/development-deck.md:312`)

## 4. Unrest: prevention, insurance and recovery

### Riots

At −3 through −5, the owner clears all Unrest tokens and rolls a d6 at turn end. The roll plus insurance is capped at 6. (`src/game/unrest.ts:46`; `src/game/riot.ts:27`; `src/game/tables.ts:54`)

| Modified roll | Result |
|---|---|
| 1 | Lose one pop and one random owned building. If there is no building, lose another pop instead. |
| 2 | Lose two pops. |
| 3 | Lose one pop. |
| 4 | Lose up to 3 food. |
| 5 | Lose up to 3 gold; if unable to pay all 3, also lose one pop. |
| 6 | No loss. |

Sources: `src/game/data.ts:95`; `src/game/tables.ts:117`; `src/game/tables.ts:142`; `src/game/tables.ts:252`.

Before rolling, the player can buy each of these once:

| Insurance | Cost | Effect |
|---|---|---|
| Bread dole | 4 food | +1 to the roll |
| Patronage | 3 influence | +1 to the roll |
| Concession | Demote one citizen to freeman, free | +1 to the roll |

Sources: `src/game/data.ts:121`; `src/game/riot.ts:65`.

One insurance eliminates building destruction. Two eliminate the two-pop row. Three eliminate all direct pop-loss rows, **but do not eliminate the bribe’s pop loss when the player holds less than 3 gold**. (`src/game/tables.ts:62`; `src/game/data.ts:95`; `src/game/tables.ts:129`)

Calculated from the six table faces, without insurance:

- With a building and at least 3 gold, expected loss is **⅔ pop**, plus a **⅙ chance of losing a building**.
- With no building and less than 3 gold, expected loss is **1 pop**.
- These are table expectations, not simulation figures. (`src/game/data.ts:95`; `src/game/tables.ts:129`; `src/game/tables.ts:150`)

Concession preserves the pop but changes its class. Under ordinary rules, citizen and freeman upkeep are both 1 food, so it does not solve feeding. It trades future influence and a citizen vote for future gold. (`src/game/ruleset.ts:279`; `src/game/assembly/assembly.ts:559`)

### Revolts

At −6 or lower, there is no insurance window or die roll. Half the realm’s slaves leave, rounded down, capped by how many slaves are standing in settlements. All tokens clear. (`src/game/unrest.ts:38`; `src/game/unrest.ts:76`)

This can be sharply self-correcting: removing slaves raises happiness. It can also repeat if the remaining slave count still crosses a threshold. A revolt caused entirely by tokens can clear those tokens without losing any pop when the realm has no slaves. (`src/game/unrest.ts:51`; `src/game/unrest.ts:76`; `src/game/happiness.ts:83`)

### What calm can answer by itself

**Stabilize Province** costs 2 influence. **Bread & Circuses** costs 2 gold. Both give the same +2 until the year changes. Festival Calendar replaces the gold payment with 2 food; the influence payment remains available. (`src/game/ruleset.ts:307`; `src/game/civic.ts:31`)

Calculated from the thresholds:

| Starting level | After calm | Result |
|---|---:|---|
| −3 or −4 | −1 or −2 | Avoids unrest |
| −5 | −3 | Still a riot |
| −6 or −7 | −4 or −5 | Replaces revolt with riot |
| −8 or lower | −6 or lower | Still a revolt |

Sources: `src/game/ruleset.ts:286`; `src/game/ruleset.ts:307`.

Paid calm cannot be stacked to escape a deeper problem. It also cannot buy Beloved or the proposed free development card. (`src/game/civic.ts:50`; `src/game/happiness.ts:113`; `docs/plans/development-deck.md:101`)

## 5. Hunger, food and the Dole

Food is separate from happiness. Income can take food below zero. The player then has the rest of the turn to cover the deficit. Ending short loses one eating pop per missing food, capped by eligible resident pops, and returns food to zero. (`src/game/core/resources.ts:40`; `src/game/economy/income.ts:277`; `src/game/hunger.ts:139`)

The owner chooses which eligible freemen or citizens leave and from which settlements. The default is freemen first. Slaves never leave for hunger. Under **Grain Levy**, freemen neither eat nor qualify for hunger loss. (`src/game/hunger.ts:11`; `src/game/hunger.ts:47`; `src/game/hunger.ts:81`; `src/game/assembly/deck.ts:50`)

**The Dole** converts **3 influence into 1 food**, repeatedly while affordable. **Public Dole** changes that to **2 influence for 1 food**. There is no bank under the default rules. (`src/game/ruleset.ts:274`; `src/game/ruleset.ts:287`; `src/game/bank.ts:162`; `src/game/nationalIdeas.ts:10`)

The principal food connections are:

- Working food-producing slaves; Estates can raise their output to 2. (`src/game/ruleset.ts:279`; `src/game/data.ts:236`)
- Granaries: +2 food per income, independent of resident class counts. (`src/game/data.ts:255`; `src/game/economy/income.ts:438`)
- Good Harvest: +2 food per realm income. (`src/game/nationalIdeas.ts:4`)
- Sacred Fields: each Temple also gives 2 food. (`src/game/assembly/deck.ts:16`)
- Land Reform: working slaves make food on any terrain. Drought still targets the plains slave column, so food from non-plains slaves survives it. (`src/game/assembly/deck.ts:5`; `src/game/economy/income.ts:153`; `src/game/economy/income.ts:179`)
- Player trade, Good Stores and Colonists’ Voyage. (`src/game/trade.ts:363`; `src/game/data.ts:417`; `src/game/data.ts:188`)
- Passing a Demosthenes Law gives its author 2 food immediately. The draw costs 2 influence and still needs a passing vote. (`src/game/ruleset.ts:320`; `src/game/assembly/assembly.ts:234`; `src/game/assembly/assembly.ts:829`)

Food losses other than income stop at the available stock. **Rats cannot turn zero food into −2, or deepen an existing deficit.** A riot’s sacked granary likewise takes stored food without opening a second hunger check that turn. (`src/game/events.ts:133`; `src/game/tables.ts:117`; `src/game/riot.ts:178`)

Demoting or moving an eater after income does not refund the food already deducted. Its future upkeep changes, but the present deficit remains unless food is added or the number of eligible hunger victims limits the loss. (`src/game/civic.ts:188`; `src/game/actions.ts:502`; `src/game/economy/income.ts:277`)

A citizen cannot normally feed itself through the Dole: it makes 1 influence but needs 3 to replace its food. A Forum citizen makes 2 influence, still short of 3. **Forum + Public Dole** reaches feeding parity at 2 influence for 1 food, leaving none of that citizen’s income for other uses. These are arithmetic consequences of the default outputs and Dole prices. (`src/game/ruleset.ts:279`; `src/game/data.ts:244`; `src/game/ideaRules.ts:30`)

**General Strike has a special consequence:** it skips the entire income application, including upkeep, while still drawing a Player Event. A food-deficit realm therefore also skips its normal food drain that turn. It is not simply “lose production but still feed everyone.” (`src/game/actions.ts:312`)

## 6. Luxury goods and the cost of steering happiness

The seven goods have different names and flavour, but the same happiness function. Each active owned good gives +2. A Port costs **4 gold and 2 stone**, takes a work slot unless Harbour Planning exempts it, and claims one adjacent unclaimed good. Ports can be built in colonies. (`src/game/data.ts:261`; `src/game/data.ts:273`; `src/game/status.ts:205`; `src/game/status.ts:239`; `src/game/nationalIdeas.ts:59`)

Ownership belongs to the luxury asset. Trading it moves its happiness immediately. Burning the original Port does not revoke the asset: the destruction routine removes a building, while active luxury status reads ownership and suppression. (`src/game/trade.ts:368`; `src/game/tables.ts:269`; `src/game/luxury.ts:57`)

There is currently no active targeted luxury-suppression effect. Blockade is the implemented random interruption. (`src/game/luxury.ts:96`; `src/game/data.ts:389`)

### The player’s practical levers

| Lever | Price and speed | Limit or opportunity cost |
|---|---|---|
| Stabilize Province / Bread & Circuses | 2 influence / 2 gold; immediate +2 | Temporary, once per turn; no token removal. (`src/game/civic.ts:31`; `src/game/civic.ts:73`) |
| Temple | 3 stone; immediate +1 | One per eligible settlement; normally unavailable in colonies; uses a slot. (`src/game/data.ts:249`; `src/game/status.ts:205`) |
| Port | 4 gold + 2 stone; normally immediate +2 through its claim | Requires an available adjacent good. Gives no happiness during Blockade. (`src/game/data.ts:261`; `src/game/status.ts:239`; `src/game/luxury.ts:64`) |
| Promote a slave | 2 food; immediate removal from slave count | One ladder move per turn. Improves ordinary happiness by 1 only when crossing a pair boundary; creates future food upkeep. (`src/game/civic.ts:86`; `src/game/civic.ts:159`; `src/game/happiness.ts:43`) |
| Trade away slaves | Negotiated terms; ownership changes immediately | Requires another player’s consent and receiving capacity. (`src/game/trade.ts:84`; `src/game/trade.ts:353`) |
| Buy a luxury through trade | Negotiated terms; immediate ownership | No guaranteed seller or price. Blockade still applies. (`src/game/trade.ts:368`; `src/game/luxury.ts:64`) |
| Public Calm | Free on its random draw; clears one token | Cannot be stored for later. (`src/game/data.ts:508`; `src/game/events.ts:50`) |
| Festival day | Proposed held card; clears one token when played | Must already be held from an earlier turn; uses the turn’s one held-card play. (`docs/plans/development-deck.md:97`; `docs/plans/development-deck.md:143`) |
| Civic Pride | +1 while standing | Random Assembly draw, vote and continuing city gold charge. (`src/game/assembly/deck.ts:113`; `src/game/assembly/assembly.ts:234`) |

Without modifiers, five slaves are safe at happiness −2; six cause a riot. Each Temple supports two additional slaves at the same level, and each luxury supports four. Calm temporarily supports four more. These are threshold calculations, not separate population allowances. (`src/game/happiness.ts:74`; `src/game/ruleset.ts:285`; `src/game/ruleset.ts:307`)

Happiness buildings also compete with production. On a fully worked food tile, a new Temple can displace one working slave and remove 1 food per income, or 2 with an Estate. That can solve unrest while making feeding harder. (`src/game/settlement.ts:68`; `src/game/settlement.ts:83`; `src/game/data.ts:236`)

## 7. Concrete shocks and response windows

### Captured Laborers: a windfall can force a riot

Assume five slaves, no Temple, luxury, token or Law contribution.

- Before the draw: happiness **−2**.
- Captured Laborers adds the sixth slave: happiness becomes **−3**.
- Income has already happened, so the new slave supplies no food or other material before this turn’s check.

This follows directly from the slave formula and income-before-event order. (`src/game/happiness.ts:43`; `src/game/actions.ts:323`; `src/game/data.ts:468`)

The player can buy calm for 2 influence or 2 gold, build a Temple for 3 stone, promote a slave for 2 food, or negotiate a slave trade. Moving the slave between owned settlements does not help. (`src/game/civic.ts:31`; `src/game/data.ts:249`; `src/game/ruleset.ts:309`; `src/game/trade.ts:353`; `src/game/core/query.ts:54`)

If there is room somewhere, the current event resolver requires placement; it has no decline branch. With no room, the card is discarded without a substitute benefit. (`src/game/events.ts:28`; `src/game/events.ts:37`)

**Agency gap:** the draw can impose an immediate liability, while its productive benefit starts next year. Lack of food, stone, gold, influence or a willing trader can leave no preventive answer.

The proposed **Captives** improves this because it is held until a chosen later turn. It does not change Captured Laborers in the Player Event deck. (`docs/plans/development-deck.md:97`; `docs/plans/development-deck.md:142`)

### Blockade: the shock scales with successful luxury investment

Assume one Temple, two luxuries and ten slaves, with no tokens:

- Ordinary happiness: **1 + 4 − 5 = 0**.
- Blockade: **1 − 5 = −4**.
- Calm raises that to **−2**, avoiding the riot.

Now assume one Temple, three luxuries and fourteen slaves:

- Ordinary happiness: **1 + 6 − 7 = 0**.
- Blockade: **1 − 7 = −6**, a revolt.
- Calm reaches **−4**, still a riot.
- One ordinary slave promotion improves that only to **−3**.
- Calm plus a promotion plus another Temple reaches **−2**, costing **2 influence or 2 gold, 2 food and 3 stone**, with a legal Temple site also required.

These are worked calculations from the same formula. (`src/game/happiness.ts:74`; `src/game/data.ts:389`; `src/game/ruleset.ts:307`; `src/game/ruleset.ts:309`; `src/game/data.ts:249`)

**Agency gap:** buying another Port or luxury cannot repair the lost source during Blockade. The player has a turn to respond, but their usual happiness investment is temporarily unusable.

### Drought: most structural answers arrive too late for current hunger

Assume 2 food in storage, four ordinary plains slaves and five eating freemen/citizens:

- Ordinary income is **4 − 5 = −1 food**; storage would finish at 1.
- Drought removes the four food produced by those slaves.
- Income instead leaves **−3 food**.

The player needs **3 food** during the turn: **9 influence through the Dole**, **6 with Public Dole**, a trade, or a sufficient food windfall. Good Stores supplies 2 and would leave a deficit of 1. (`src/game/data.ts:348`; `src/game/economy/income.ts:153`; `src/game/ruleset.ts:274`; `src/game/nationalIdeas.ts:10`; `src/game/data.ts:417`)

Building a Granary now helps next income, not this deficit. Calm never pays a food deficit. Existing Granaries, Good Harvest and Sacred Fields food survive Drought because the card removes the plains slave column, not every food source. (`src/game/actions.ts:307`; `src/game/data.ts:255`; `src/game/economy/income.ts:148`; `src/game/nationalIdeas.ts:4`; `src/game/assembly/deck.ts:16`)

**Agency gap:** the danger is visible before the turn’s actions, but its income loss has already landed. Prevention needs reserves or existing independent food sources.

### Manumission: political change can outrun the ladder

Assume one Temple, two luxuries and ten slaves:

- Ordinary happiness is **0**.
- Manumission makes the slave term **−15**, producing happiness **−10**.
- One free promotion reduces ten slaves to nine: happiness becomes **−8**.
- Calm reaches **−6**, still a revolt.

The player needs further buildings or negotiated ownership changes to avoid the revolt. (`src/game/assembly/deck.ts:28`; `src/game/assembly/laws.ts:271`; `src/game/civic.ts:102`; `src/game/ruleset.ts:307`)

A Law enacted in year 2 normally cannot be repealed in year 4; year 6 is the first eligible sitting. Repeal also costs 3 influence and requires a passing vote. (`src/game/assembly/assembly.ts:306`; `src/game/assembly/assembly.ts:383`; `src/game/ruleset.ts:315`)

**Agency gap:** free promotion is a slow benefit against an immediate realm-wide penalty. Voting is the preventive lever, but a losing seat cannot undo the Law during its ordinary turn.

## 8. What is flat, what is used, and what remains unmeasured

The best recent evidence is the **2026-10-26 balance check**, using no base income, no bank and seven goods. It predates development cards. Its two masters tables had no National Ideas; its mixed table used all Ideas and rotated personalities. (`docs/reports/simulation/2026-10-26-balance-check.md:3`; `docs/reports/simulation/2026-10-26-balance-check.md:18`)

| Finding | Evidence and interpretation |
|---|---|
| Calm is used | **2026-10-26:** mixed tables bought it **8.96 times per game**. It is not a dormant lever. (`docs/reports/simulation/2026-10-26-balance-check/continental-mixed-160.json:371586`) |
| Temples are used | **2026-10-26:** **7.07 built per mixed-table game**, more than any other building. The concern is the shape of their reward, not non-use. (`docs/reports/simulation/2026-10-26-balance-check/continental-mixed-160.json:371699`) |
| Riot insurance is relatively uncommon | **2026-10-26:** **1.74 insurance purchases against 5.39 riots per mixed-table game**. This establishes low use, but not whether price, affordability or sensible risk-taking explains it. (`docs/reports/simulation/2026-10-26-balance-check/continental-mixed-160.json:371602`) |
| Manumission is nearly absent | **2026-10-26:** passed **once in 160 mixed games**. The immediate slave penalty is a plausible explanation, not a measured causal result. (`docs/reports/simulation/2026-10-26-balance-check.md:73`) |
| Beloved is uncommon | **2026-10-26:** held at all in **10/60 Continental masters games, 13/60 Archipelago masters games and 43/160 mixed games**. (`docs/reports/simulation/2026-10-26-balance-check.md:123`) |
| Luxuries strongly accompany Beloved | **2026-10-26:** its holder was the sole luxury leader on **62%, 63% and 68%** of held turns. Intervals were wide; the report calls this failure within noise. (`docs/reports/simulation/2026-10-26-balance-check.md:60`) |
| Hunger remains build-dependent | **2026-10-26:** losses averaged **0.48 and 0.55 pops per seat-game** on masters tables, **1.79** on the mixed table, and **5.36 for the trader**. (`docs/reports/simulation/2026-10-26-balance-check.md:58`) |
| Acceptable average riot rates hide a slaver burden | **2026-10-26:** year-8-onward riot rates were **4%, 5% and 9%** across the three tables; the mixed slaver was at **20%**. (`docs/reports/simulation/2026-10-26-balance-check.md:56`) |

Three structural flat spots follow from the rules:

1. **−3 through −5 have the same consequence.** A one-level improvement inside that band changes nothing unless paired with another lever. (`src/game/unrest.ts:46`)
2. **Positive happiness has no recurring economic reward today.** Its payoff is protection, Beloved and the end-game tiebreak. This makes “enough to stay safe” a rational economic target, though not always the winning target. (`src/game/economy/income.ts:227`; `src/game/victory.ts:75`; `src/game/victory.ts:169`)
3. **Food security and happiness are separate.** A realm can lose freemen to hunger while keeping high happiness. In the 2026-10-26 mixed batch, the trader still won 25 games on the happiness tiebreak despite its high hunger losses. (`src/game/happiness.ts:74`; `docs/reports/simulation/2026-10-26-balance-check.md:92`)

The current bots also influence these findings. They refuse voluntary loss of their last citizen where another option remains, including through Concession and hunger selection. Their forecast assumes no future random card or token changes. These are bot choices, not player rules. (`src/sim/policies.ts:205`; `src/sim/policies.ts:218`; `docs/reference/ai.md:103`)

The recent report gives year-14 mean happiness near zero, but that **does not establish how often individual turns reach +3**. The proposed free-card reward needs actual threshold occupancy, by build and year. (`docs/reports/simulation/2026-10-26-balance-check.md:117`)

## 9. Design material for consolidation

### Prioritize the approved happiness reward

The proposed free card at standing +3 gives a reason to maintain positive happiness without relying on winning Beloved. Excluding calm preserves the distinction between a lasting build and a temporary rescue. **This is a new mechanic, already proposed and approved in direction, but not implemented.** (`docs/plans/development-deck.md:31`; `docs/plans/development-deck.md:101`)

It also creates a new threshold: +3 pays, +2 does not. Plague, Local Unrest and Agitators can therefore deny a card even when they cause no riot. That consequence should be included when judging token cards. (`src/game/data.ts:398`; `src/game/data.ts:500`; `docs/plans/development-deck.md:143`)

The other proposed new mechanic—discarding a random held card instead of each riot pop loss—buys time but preserves the slave count that caused the problem. It protects population rather than repairing happiness. (`docs/plans/development-deck.md:107`)

### Make population windfalls optional

**Candidate new rule:** Captured Laborers may be declined.

This is the smallest repair to the forced sixth-slave case. The card already asks for a destination; declining would add a choice without adding another currency, track or happiness effect. Free Settlers could use the same convention, although its feeding cost normally begins at the next income. (`src/game/events.ts:37`; `src/game/actions.ts:323`)

### Test a smaller Manumission penalty

**Candidate content revision, using an existing effect:** change its slave weight from 3 to 2.

This retains free promotion and a reason to reduce slavery, while lowering the immediate shock. It requires number tuning rather than a new subsystem. The once-per-turn ladder would still make recovery gradual. The evidence supports trying a revision; it does not prove that weight 2 is balanced. (`src/game/assembly/deck.ts:28`; `src/game/assembly/laws.ts:281`; `src/game/civic.ts:102`)

### Bound Blockade’s interruption

**Candidate new mechanic:** Blockade removes the happiness of one active luxury per realm, for a maximum loss of 2, instead of removing the entire luxury term.

That keeps a distinct luxury shock while putting its ordinary size within one calm purchase. It would require a new partial-loss effect; the current `zeroTerm` removes everything. This is a design option, not a finding that Blockade must change. (`src/game/data.ts:389`; `src/game/luxury.ts:64`)

### Do not add a separate happiness deck yet

The development proposal already connects happiness, food, population and riot protection. Another deck would add draw dependence before those connections have been measured.

One warning matters for the deck researcher: **greater average card value does not mean reliable emergency food**. In a fresh proposed deck, only **8/40 cards** give food immediately: six Foraging, one Bountiful harvest and one Tunny run. Newly drawn Caravan cannot be played that turn. The current chosen Colonists’ Voyage gives food on **4/6 faces**, although it can also fail. These are calculated content probabilities, not sim results. (`docs/plans/development-deck.md:97`; `docs/plans/development-deck.md:133`; `src/game/data.ts:188`)

The free-card timing also needs an explicit decision. The proposal puts it at the riot check; the engine currently resolves hunger before that check. If that order is retained, a free food yield cannot rescue pops already lost to hunger. (`docs/plans/development-deck.md:101`; `src/game/turn.ts:173`)

## Shocks, windfalls and levers

Counts below describe the authored decks, not independent probabilities on every turn. The default year deck has 14 cards; the shared Player Event deck has 40 and reshuffles when empty. Each normal income draws one Player Event. Assembly cards require choosing that politician’s deck, paying 2 influence, and obtaining a passing vote; each named card has one copy in its politician’s initial six-card deck. (`src/game/data.ts:348`; `src/game/data.ts:415`; `src/game/events.ts:12`; `src/game/actions.ts:335`; `src/game/assembly/assembly.ts:234`; `src/game/assembly/assembly.ts:1031`)

Default lever prices apply unless a Law changes them. “Trade” always means negotiated terms and a willing counterparty. Proposed development cards are marked **proposed**.

| Event | Source | Kind (shock / windfall / both) | Who it hits, how often | Size in game units | Levers that answer it, and what each lever costs | Gap (no answer, or answer too costly or too slow) |
|---|---|---|---|---|---|---|
| Drought | Year deck; `src/game/data.ts:348` | shock | All realms; 2/14 years | Removes the plains slave food column, including Estate output | Stored food; Dole, 3 influence per food; Public Dole, 2; food trade; existing Granary, 4 wood for +2 food per income | New food production pays next income. Consecutive Droughts can exhaust reserves |
| Wildfire | Year deck; `src/game/data.ts:357` | shock | All forest producers; 2/14 | Removes forest slave wood output | Stored wood; wood trade; Shipment cannot help wood, but Timber gives 2 on its draw | Can delay Granaries and Estates; there is no guaranteed resource conversion |
| Silent Mines | Year deck; `src/game/data.ts:366` | shock | All mountain producers; 1/14 | Removes mountain slave stone output | Stored stone; stone trade; Shipment gives 2 on its draw | Can block an otherwise immediate Temple repair |
| Piracy | Year deck; `src/game/data.ts:374` | shock | All freeman producers; 2/14 | Removes freeman gold output, including Marketplace raise; upkeep remains | Stabilize Province, 2 influence; stored gold; gold trade | Freemen still eat while their normal means of paying for trade and Bread & Circuses disappears |
| Ostracism | Year deck; `src/game/data.ts:382` | shock | All citizen producers; 2/14 | Removes citizen influence output, including Forum raise; upkeep remains | Stored influence; Bread & Circuses, 2 gold; influence or food trade; existing Civic Tradition gives 2 influence | Can remove the same income needed for the Dole and Stabilize Province |
| Blockade | Year deck; `src/game/data.ts:389` | shock | All luxury owners; 1/14 | −2 happiness per active owned good for the year | Stabilize Province / Bread & Circuses, 2 influence / 2 gold for +2; Temple, 3 stone for +1; promotion, 2 food for at most +1 ordinarily; slave trade | Shock scales with goods held. More luxury ownership cannot repair it that year |
| Plague | Year deck; `src/game/data.ts:398` | shock | Every realm; 2/14 | +1 Unrest token; −1 happiness until cleared | Stabilize Province / Bread & Circuses, 2 influence / 2 gold; Temple, 3 stone; Public Calm if drawn; Festival day if already held, proposed | No paid token removal; buffers must absorb it |
| Festival | Year deck; `src/game/data.ts:406` | windfall | Every realm; 2/14 | Clears all Unrest tokens; happiness rises by tokens cleared | No payment | Does nothing to slave-driven unhappiness; timing is random |
| Good Stores | Player Event; `src/game/data.ts:417` | windfall | Drawing seat; 4/40 | +2 food, including against a current deficit | Direct hunger relief | Fixed amount may not cover a large Drought deficit |
| Timber | Player Event; `src/game/data.ts:425` | windfall | Drawing seat; 4/40 | +2 wood | Combines with stored wood toward Granary or Estate, each normally 4 wood | A building bought after income does not feed the present deficit |
| Shipment | Player Event; `src/game/data.ts:434` | windfall | Drawing seat; 4/40 | +2 stone | Temple needs 3 stone; Port needs 2 stone plus 4 gold | Alone, normally one stone short of a Temple |
| Profit | Player Event; `src/game/data.ts:442` | windfall | Drawing seat; 4/40 | +2 gold | Bread & Circuses, 2 gold; food or luxury trade | Gold alone cannot guarantee food |
| Patronage | Player Event; `src/game/data.ts:450` | windfall | Drawing seat; 4/40 | +2 influence | Stabilize Province, 2 influence; combine with 1 stored influence for one ordinary Dole | Two influence alone does not buy ordinary Dole food |
| Free Settlers | Player Event; `src/game/data.ts:458` | both | Drawing seat with room; 3/40 | +1 freeman; future +1 gold and −1 food per income ordinarily | Choose destination; future food production, Dole or trade; Grain Levy removes upkeep | Mandatory if room exists; upkeep starts before next turn’s actions |
| Captured Laborers | Player Event; `src/game/data.ts:468` | both | Drawing seat with room; 3/40 | +1 slave; ordinary happiness change 0 or −1; under Manumission −1 or −2 | Stabilize Province / Bread & Circuses, 2 influence / 2 gold; Temple, 3 stone; promote for 2 food; slave trade | Cannot decline. Happiness cost arrives before productive income |
| Rats | Player Event; `src/game/data.ts:476` | shock | Drawing seat; 3/40 | Takes up to 2 stored food | Dole, 3 influence per replacement food; food trade | Cannot create or deepen negative food, but removes reserves and food needed for other actions |
| Bandits | Player Event; `src/game/data.ts:484` | shock | Drawing seat; 3/40 | Takes up to 2 gold | Stabilize Province, 2 influence; gold trade | Can remove the exact Bread & Circuses price or weaken the riot bribe reserve |
| Fire | Player Event; `src/game/data.ts:492` | shock | Drawing seat; 3/40 | Takes up to 2 wood | Wood trade; stored surplus | Can delay independent food production |
| Local Unrest | Player Event; `src/game/data.ts:500` | shock | Drawing seat; 3/40 | +1 token; −1 happiness | Stabilize Province / Bread & Circuses, 2 influence / 2 gold; Temple, 3 stone; promotion where parity helps | No paid token clearance; mandatory resolution |
| Public Calm | Player Event; `src/game/data.ts:508` | windfall | Drawing seat; 2/40 | Clears one token; +1 happiness if a token exists | No payment | Cannot be saved; no benefit with zero tokens |
| Riot roll | Riot table; `src/game/data.ts:91`; `src/game/tables.ts:117` | both | Owner ending at −3 through −5; one roll per triggered turn | Clears all tokens; then 0–2 pops lost, possible random building loss, or up to 3 food/gold lost | Prevent beforehand with calm, 2 influence/2 gold, or permanent repairs. Once pending: Bread dole 4 food, Patronage 3 influence, Concession one citizen demotion; each +1 | Full insurance still risks one pop if the bribe cannot be paid. Temple destruction can worsen standing happiness |
| Merchant Convoy | Venture table; `src/game/data.ts:129` | both | Choosing seat; shares one Venture per turn | Stake 2 gold; returns 0 gold on 1–2, 2 on 3–5, 4 on 6 | Keep the 2 gold for Bread & Circuses instead; trade at agreed terms | Can consume a rescue payment and return nothing |
| Grand Embassy | Venture table; `src/game/data.ts:159` | both | Choosing seat; shares one Venture per turn | Stake 2 gold; returns 0, 1 or 2 influence | Save gold for Bread & Circuses; use stored influence for Stabilize Province or Dole | At most 2 influence: enough for Stabilize Province, short of an ordinary Dole without reserves |
| Colonists’ Voyage | Venture table; `src/game/data.ts:188`; `src/game/tables.ts:172` | both | Choosing seat; shares one Venture per turn | Stake 2 gold; food on 4/6 faces; on 6, one freeman plus 2 food, or 4 food if no room | Dole, 3 influence per guaranteed food; negotiated food trade | Fails on 1–2. Destination is random; room check omits incoming transfers |
| Land Reform | Demosthenes deck; `src/game/assembly/deck.ts:5` | both | All realms if passed; one copy | Working slaves make food on any terrain; new Estates forbidden | Existing Estates remain productive; trade for other materials; repeal costs 3 influence plus vote when eligible | Fixes food by removing the slaves’ former wood/stone production; political removal is slow |
| Sacred Fields | Demosthenes deck; `src/game/assembly/deck.ts:16` | both | All Temple owners if passed; one copy | Temples add 2 food each; new Temples cost 6 stone | Existing Temples benefit immediately at subsequent incomes; stone trade for new ones | Food resilience makes the direct happiness building more expensive |
| Manumission | Demosthenes deck; `src/game/assembly/deck.ts:28` | both | All slave owners if passed; one copy | Free slave promotion; extra happiness penalty equals slaves held | One free promotion per turn; Stabilize Province / Bread & Circuses, 2 influence / 2 gold; Temples, 3 stone; slave trade; later repeal, 3 influence plus vote | Immediate penalty can exceed one promotion and calm combined; minimum tenure prevents quick repeal |
| Tenant Rights | Demosthenes deck; `src/game/assembly/deck.ts:38` | both | All growing realms if passed; one copy | Slave growth costs 2 gold; freeman growth 3 gold, replacing food prices | Use gold to preserve food reserves; stop growth; later repeal, 3 influence plus vote | Competes with Bread & Circuses and gold-funded trade |
| Grain Levy | Demosthenes deck; `src/game/assembly/deck.ts:50` | both | All freeman realms if passed; one copy | Freemen eat 0 food; Marketplaces do nothing | Retain ordinary freeman output; plan food reserves before repeal; oppose removal with votes | Its removal can restore upkeep for many freemen at once |
| Festival Calendar | Demosthenes deck; `src/game/assembly/deck.ts:60` | both | All realms if passed; one copy | Bread & Circuses payment becomes 2 food; Stabilize Province remains 2 influence | Stabilize Province, 2 influence; reserve 2 food | Removes gold as the direct calm payment; food-deficit realms cannot use its food payment |
| Public Works | Perdiccas deck; `src/game/assembly/deck.ts:69` | both | All realms if passed; one copy | Granary/Estate cost 3 wood; Marketplace 2 wood + 2 gold; colony capacity 3 | Upgrade colony for 3 wood + 3 stone; place future growth elsewhere | Existing excess pops remain, but new growth and receipts can be blocked |
| Guild Charter | Perdiccas deck; `src/game/assembly/deck.ts:90` | both | All realms if passed; one copy | Capital grows twice per turn; colonies cannot grow | Grow in cities at normal class prices; upgrade colonies for 3 wood + 3 stone | Concentrates growth; does not increase the one-per-turn promotion limit |
| Forum Rites | Perdiccas deck; `src/game/assembly/deck.ts:101` | both | All realms if passed; one copy | Citizens make 2 influence; colony freemen make 0 gold and still eat ordinarily | Dole at 3 influence per food; Public Dole at 2; move freemen for 1 food each | Colony freemen can retain upkeep while losing their income |
| Civic Pride | Perdiccas deck; `src/game/assembly/deck.ts:113` | both | Every realm if passed; one copy | +1 happiness; −1 gold per city per income | Keep reserves for city charges; replace lost happiness with Temple, 3 stone, or calm, 2 influence/2 gold | Can reduce gold available for Bread & Circuses; repeal removes its happiness immediately |
| Master Builders | Perdiccas deck; `src/game/assembly/deck.ts:124` | both | All realms if passed; one copy | Cities gain one slot; colony piece allowance falls by one | Use the extra slot for production or a Temple costing 3 stone | Repeal can remove productive slot capacity |
| Homestead Act | Kleistophenes deck; `src/game/assembly/deck.ts:135` | both | All realms if passed; one copy | Colonies may hold one building; cities lose one slot | Colony Temple, 3 stone; colony Granary, 4 wood; relocate workers for 1 food per pop | City slot loss can idle a slave and reduce food immediately at next income |
| Colonial Charter | Kleistophenes deck; `src/game/assembly/deck.ts:146` | both | All expanding realms if passed; one copy | Founding costs 1 food and an existing pop; upgrades cost 6 stone | Reserve stone or trade for it; defer upgrades | Cheaper expansion can create colonies that are slower to turn into Temple sites |
| Frontier Spirit | Kleistophenes deck; `src/game/assembly/deck.ts:156` | both | Each founding realm while standing; one copy | +1 slave per founding; colony capacity 3 | Choose whether to found; promote for 2 food; Temple 3 stone; calm 2 influence/2 gold | Free slave can cross a happiness boundary; capacity limits relocation |
| Harbour Dues | Kleistophenes deck; `src/game/assembly/deck.ts:168` | both | All realms if passed; one copy | Port costs 2 stone; Marketplace costs 3 wood + 4 gold | Claim an available luxury through Port, 2 stone | Happiness access still depends on geography and unclaimed goods |
| Grain Riot | Stratokles deck; `src/game/assembly/deck.ts:194` | shock | Chosen rival if passed; one copy | Takes up to 3 stored food before ordinary turns | Stored surplus; Dole at 3 influence per food; food trade | Can remove the buffer before upkeep; target has no direct prevention after passage |
| The Streets Burn | Stratokles deck; `src/game/assembly/deck.ts:203` | shock | Chosen rival if passed; one copy | +1 token; −1 happiness | Stabilize Province / Bread & Circuses, 2 influence / 2 gold; Temple 3 stone; token-clearing card | Requires preventive votes or a later ordinary-turn repair |
| General Strike | Stratokles deck; `src/game/assembly/deck.ts:212`; `src/game/actions.ts:312` | both | Chosen rival if passed; one copy | Skips next entire income and upkeep; Player Event still drawn | Stored resources; trade; skip spending until production returns | Removes rescue income, but also skips a food-deficit realm’s normal drain |
| The Mob Rises | Stratokles deck; `src/game/assembly/deck.ts:221`; `src/game/assembly/assembly.ts:971` | both | Chosen rival if passed; one copy | Lose one pop from largest settlement; slaves first within it | Prevent with votes; regrow slave for 2 food or freeman for 3; citizen needs promotion | Loss is immediate. Removing a slave can improve happiness; the victim cannot choose which class leaves |
| The Stele Is Broken | Stratokles deck; `src/game/assembly/deck.ts:230` | both | Rival’s newest authored eligible Law; one copy | Removes that Law; may remove +1 happiness, food production or free freeman upkeep | Votes before passage; reserves; Temple 3 stone or calm 2 influence/2 gold for lost happiness | Actual shock depends on the Law removed; effects change for the whole table |
| Foraging — proposed | Development plan; `docs/plans/development-deck.md:133` | windfall | Drawing seat; 6/40 | +1 food per settlement immediately | Buy draw for 2 gold, once per turn; or earn free draw at standing +3 | Food type is random; free turn-end draw may occur after hunger |
| Woodcutters — proposed | Development plan; `docs/plans/development-deck.md:134` | windfall | Drawing seat; 5/40 | +1 wood per settlement immediately | Build Granary for 4 wood or Estate for 4 wood; wood trade | Food production bought after income does not settle current hunger |
| Quarry gang — proposed | Development plan; `docs/plans/development-deck.md:135` | windfall | Drawing seat; 5/40 | +1 stone per settlement immediately | Temple, 3 stone; Port, 4 gold + 2 stone | Needs a legal building or claim site |
| Bountiful harvest — proposed | Development plan; `docs/plans/development-deck.md:136` | windfall | Drawing seat; 1/40 | +1 food per realm pop, including slaves and travelling pops | Immediate deficit coverage or reserve | Rare; larger populations receive larger windfalls |
| Tunny run — proposed | Development plan; `docs/plans/development-deck.md:137` | windfall | Drawing seat; 1/40 | +5 food immediately | Immediate deficit coverage or reserve | Rare; cannot be chosen as a guaranteed food purchase |
| Timber raft — proposed | Development plan; `docs/plans/development-deck.md:138` | windfall | Drawing seat; 1/40 | +5 wood immediately | Granary or Estate, normally 4 wood | No direct food or happiness repair until construction and, for food, next income |
| Marble block — proposed | Development plan; `docs/plans/development-deck.md:139` | windfall | Drawing seat; 1/40 | +5 stone immediately | Temple, 3 stone; Port, 4 gold + 2 stone | Spare building sites and luxury access still matter |
| Caravan — proposed | Development plan; `docs/plans/development-deck.md:140` | windfall | Drawing seat; 4/40 | Held; choose food, wood or stone, +1 per settlement | Play an already-held Caravan; uses one held-card play | Cannot answer the turn on which it is drawn or received |
| Settlers — proposed | Development plan; `docs/plans/development-deck.md:141` | both | Drawing seat; 3/40 | Held; +1 freeman in a settlement with room | Choose a later play when future feeding is covered | Future upkeep remains; blocks another held-card play that turn |
| Captives — proposed | Development plan; `docs/plans/development-deck.md:142` | both | Drawing seat; 2/40 | Held; +1 slave in a settlement with room | Delay until happiness room exists; promote for 2 food; calm 2 influence/2 gold | Preserves the slave/happiness tradeoff but makes its timing voluntary |
| Festival day — proposed | Development plan; `docs/plans/development-deck.md:143` | windfall | Drawing seat; 3/40 | Held; clear one own token | Play a previously held copy; uses one held-card play | Cannot clear a new problem with a copy drawn that same turn |
| Raiders — proposed | Development plan; `docs/plans/development-deck.md:144` | both | Chosen rival when played; 4/40 | Transfers up to 3 food, wood, stone or gold | Keep reserves; obtain replacement food through Dole, 3 influence each, or trade | Can strip food buffers or rescue-payment resources; no proposed reaction play |
| Agitators — proposed | Development plan; `docs/plans/development-deck.md:145` | shock | Chosen rival when played; 2/40 | +1 token; −1 happiness | Previously held Festival day; Temple 3 stone; Stabilize Province / Bread & Circuses, 2 influence / 2 gold | Multiple rivals can add tokens before the victim’s turn; calm cannot remove them |
| Informer — proposed | Development plan; `docs/plans/development-deck.md:146` | shock | Chosen rival with a hand; 2/40 | Randomly discards one held card | Hold another usable answer or obtain another card through trade | Can remove Caravan, Festival day or a card reserved to absorb riot pop loss; replacement draws may be unusable until next turn |