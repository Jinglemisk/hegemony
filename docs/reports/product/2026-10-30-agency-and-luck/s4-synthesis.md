**Hegemony design study: synthesis — 2026-10-30**

**Recommendation:** add preparation and recovery through existing decision points. Adopt Temple token repair, optional event pops and a smaller Manumission penalty. Forecast the next year after setup. Keep the approved development composition, including riot substitution, for controlled assessment. Leave the Workshop and a fifth deck out of this package.

All six study documents were read in full. Disputed rules were checked against checkout `11ffbe7`. No files were changed, and no tests, simulations or installations were run. Proposed rules below are recommendations, not current engine behaviour.

---

**1. How the systems fit today**

**Production creates both strength and exposure.** Base income is **0**. A working slave normally produces **1 food, wood or stone**, according to terrain, and eats nothing. A freeman produces **1 gold** and eats **1 food**. A citizen produces **1 influence** and eats **1 food**. Buildings and working slaves compete for work slots; freemen and citizens produce without those slots. These differences connect population choices to terrain, construction, feeding and happiness. (`src/game/ruleset.ts:279`, `src/game/ruleset.ts:296`, `src/game/settlement.ts:68`, `src/game/economy/income.ts:83`)

Estate, Marketplace and Forum raise their class’s output to **2**. The matching year card removes the entire affected output, including that increase. Concentration therefore raises both ordinary income and the loss during a shutdown. Granary’s **+2 food**, Good Harvest’s **+2 food** and Civic Tradition’s **+2 influence** are separate sources that survive the relevant class shutdown. There is no corresponding recurring wood or stone building or Idea. (`src/game/data.ts:229`, `src/game/economy/income.ts:148`, `src/game/economy/income.ts:264`, `src/game/economy/income.ts:438`, `src/game/nationalIdeas.ts:3`)

**The decks place luck at different points.**

| System | What the draw decides | What the player decides |
|---|---|---|
| **Year deck** | The order of fourteen shared cards. A completed default game encounters the full composition. | Production mix, reserves and exposure. The next card is currently hidden. (`src/game/data.ts:348`, `src/game/projection.ts:85`) |
| **Player event deck** | One local event after income: resources, a pop or an Unrest-token change. | Pop destination and subsequent spending. A legal pop award currently cannot be declined. (`src/game/actions.ts:323`, `src/game/events.ts:28`, `src/game/events.ts:37`) |
| **Assembly decks** | A card within the chosen politician’s deck. | Whether to pay for a draw, propose it, choose a Directive target, vote or seek repeal. (`src/game/assembly/assembly.ts:229`, `src/game/assembly/assembly.ts:338`, `src/game/assembly/assembly.ts:388`) |
| **Ventures, currently implemented** | A die result within the chosen expedition. | Which expedition to fund for **2 gold**, once per turn. (`src/game/data.ts:223`, `src/game/ventures.ts:14`) |
| **Development, proposed** | An immediate yield or a private held card from one mixed deck. | Buying, retaining, playing, targeting and trading cards. The proposed price is **2 gold**. (`docs/plans/development-deck.md:84`, `docs/plans/development-deck.md:97`, `docs/plans/development-deck.md:111`) |

The Assembly offers the most control between drawing and applying an effect. Its limits matter: a draw costs **2 influence** without guaranteeing a legally usable proposal. Laws survive their enactment sitting and the following sitting. A Law passed in year 2 first becomes removable in year 6; repeal costs **3 influence** and still needs passage. (`src/game/ruleset.ts:314`, `src/game/assembly/assembly.ts:283`, `src/game/assembly/assembly.ts:306`, `src/game/assembly/assembly.ts:331`, `src/game/assembly/assembly.ts:388`)

**Happiness connects these economies.** Under ordinary defaults:

> **Happiness = Temples + 2 × active goods − floor(slaves ÷ 2) − Unrest tokens + temporary calm + Law contributions.**

Idle and travelling slaves count. Food stocks, hunger, freemen and citizens have no direct happiness term. Standing happiness excludes temporary calm. (`src/game/happiness.ts:43`, `src/game/happiness.ts:74`, `src/game/happiness.ts:113`, `src/game/core/query.ts:54`)

At **−3 through −5**, turn end causes a riot. At **−6 or below**, a revolt removes half the realm’s slaves, rounded down and capped by resident slaves. Both clear Unrest tokens. Positive standing happiness already supports **Beloved of the People**, requiring a sole leader at **4 or higher**, and breaks final title ties. It currently gives no recurring income. (`src/game/ruleset.ts:267`, `src/game/ruleset.ts:286`, `src/game/unrest.ts:38`, `src/game/riot.ts:27`, `src/game/victory.ts:75`, `src/game/victory.ts:103`, `src/game/victory.ts:169`, `src/game/economy/income.ts:227`)

Players can buy **+2 temporary happiness** for **2 influence or 2 gold**, once per turn. A Temple costs **3 stone** for **+1 lasting happiness**. Promoting a slave costs **2 food**, but promotion and demotion share one ladder move per turn. These are useful responses to small shocks. They can be too slow for a large Blockade or Manumission shock. (`src/game/civic.ts:31`, `src/game/civic.ts:102`, `src/game/data.ts:249`, `src/game/ruleset.ts:307`, `src/game/luxury.ts:64`, `src/game/assembly/laws.ts:271`)

**Timing separates prevention from recovery.** The year card arrives before ordinary turns and, in sitting years, before the Assembly. Income and upkeep precede the player event and ordinary actions. Hunger resolves before unrest. A new Temple can change this turn’s happiness; a new Granary cannot replace food already missing from this turn’s collection. General Strike skips the whole collection, including upkeep, while still drawing a player event. (`src/game/year.ts:78`, `src/game/turn.ts:190`, `src/game/actions.ts:300`, `src/game/turn.ts:157`, `src/game/turn.ts:176`)

**Laws change the value of earlier investments.** Land Reform supplies food on every terrain but removes slaves’ former wood and stone output. Sacred Fields gives Temples **2 food** while raising new Temples to **6 stone**. Grain Levy removes freeman upkeep but idles Marketplaces. Forum Rites sets citizens to **2 influence everywhere**, leaving Forums with no additional output. These are political changes to the economy, not merely bonuses. (`src/game/assembly/deck.ts:5`, `src/game/assembly/deck.ts:16`, `src/game/assembly/deck.ts:49`, `src/game/assembly/deck.ts:101`, `src/game/economy/income.ts:451`)

**National Ideas supply chosen, exclusive advantages.** Each seat takes one free setup Idea and may buy one more for **6 influence**. Food and influence Ideas provide independent income or cheaper Dole access. Other Ideas change slots, expansion, pop acquisition or vote purchases. None directly grants happiness. Urban Planning includes Capital Works’ capital-slot benefit, though exclusivity and stacking mean Capital Works still supplies an additional slot option. (`src/game/ideas.ts:43`, `src/game/ideas.ts:85`, `src/game/ruleset.ts:312`, `src/game/nationalIdeas.ts:3`, `src/game/ideaRules.ts:6`)

**Luxuries and trade connect the builds.** Each of seven mechanically identical goods provides **+2 happiness**. A Port costs **4 gold and 2 stone** and claims an adjacent unclaimed good. Ownership survives destruction of the claiming Port. Blockade suppresses every good together, so accumulating goods increases happiness without diversifying its risk. (`src/game/data.ts:261`, `src/game/data.ts:273`, `src/game/status.ts:239`, `src/game/luxury.ts:57`, `src/game/luxury.ts:64`, `src/game/tables.ts:254`)

All resources, goods and pop classes can trade. Resources and goods transfer immediately; pops travel to their new owner. Trade needs agreement and requires no Port. With the bank disabled, the Dole is the remaining fixed conversion: **3 influence buys 1 food**, or **2 influence** with Public Dole. Trade can answer uneven shortages; a shared production shutdown can also remove the willing suppliers. (`src/game/trade.ts:38`, `src/game/trade.ts:67`, `src/game/trade.ts:171`, `src/game/trade.ts:353`, `src/game/ruleset.ts:274`, `src/game/ruleset.ts:288`, `src/game/ideaRules.ts:30`)

**The builds face different costs.** The latest comparison was **2026-10-26**, Continental, with Ideas and 160 rotated mixed-build games:

| Build | Result and warning |
|---|---|
| Slaver | **41/160 wins**; riots on **20% of turns from year 8**. |
| Civic | **30/160 wins**; median influence growth of **6.3 per year** between years 10 and 14. |
| Trader | **55/160 wins**; **5.36 pops lost to hunger per seat-game**; **25 wins decided by happiness**. |
| Master | **34/160 wins**; broad preferences did not establish a clear advantage. |

All figures: **2026-10-26**, `docs/reports/simulation/2026-10-26-balance-check.md:18`, `:54`, `:79`, `:92`.

These results do not test development cards. The current bot also forecasts Law repeals, behaviour added after that batch. Its search still cannot plan construction sequences across future turns or general rival replies. Treat the results as exposure warnings, not a final ranking of human strategies. (`src/sim/policies.ts:1955`, `docs/reference/ai.md:362`)

The central design risk is therefore **compounding advantage**: development rewards settlement size; the happiness reward adds draws; gold buys further draws. A large, happy, gold-producing realm can receive all three benefits. Rival cards offer chosen pressure, but do not require attacks on the leader. (`docs/plans/development-deck.md:84`, `:101`, `:114`, `:128`)

---

**2. Verdicts**

“Adopt” means include in the design package, subject to validation. “Balance only” includes changes to existing content, scope and numbers without adding a mechanic. Repeated proposals are consolidated.

| Proposal | Verdict | Reason | Tag |
|---|---|---|---|
| **P1: Workshop**, 4 wood + 2 stone; +1 wood and +1 stone per income | **Drop from this package.** | Permanent independent material production overlaps with forecasting and development yields, and weakens terrain and trade dependence. (`s2-strategist.md:97`, `s3-advocate.md:19`) | New mechanic |
| **P2: Temple enables token repair through calm** | **Adopt.** | Creates a clear choice between immediate safety and lasting removal of one token. (`s2-strategist.md:112`) | New mechanic |
| **P3: Forecast one year, including year 1 before setup** | **Adapt: begin after setup.** | Gives preparation time without changing placement and exclusive Idea selection around a known opening card. (`s2-strategist.md:127`, `s3-advocate.md:91`) | New mechanic |
| **P4: Optional Free Settlers and Captured Laborers** | **Adopt, with no compensation for declining.** | A pop opportunity should not force an immediate liability. (`s2-strategist.md:142`) | New mechanic |
| **P5: Approved development composition and operating rules** | **Adopt as the assessment baseline.** | Held timing supplies its strongest distinct role; preserve the approved kinds before tuning them. (`s2-strategist.md:158`, `docs/plans/development-deck.md:131`) | New mechanic |
| **P5: Remove card-for-pop riot substitution** | **Drop the cut. Retain substitution and compare it separately.** | Its balance harm is unproved; a random held-card loss has a real opportunity cost. (`s3-advocate.md:141`, `docs/plans/development-deck.md:107`) | New mechanic |
| **P6: Require +3 happiness and no food debt before hunger** | **Adapt: standing +3 only, after hunger.** | Preserves the approved reward without adding a second eligibility threshold and checkpoint. (`s2-strategist.md:185`, `s3-advocate.md:217`) | New mechanic |
| **P7: Manumission slave weight 3 → 2** | **Adopt.** | Reduces the immediate shock while retaining free promotion and strong pressure to reduce slavery. (`s2-strategist.md:204`) | Balance only |
| **Forum Rites: replace citizen scaling with +2 influence per realm** | **Adapt to the advocate’s colony-only citizen bonus.** | Preserves city Forums and citizen scaling without adding another independent influence source. (`r3-levers.md:227`, `s3-advocate.md:295`) | Balance only |
| **Remove Capital Works** | **Adopt.** | Removes a weaker duplicate; accept losing the extra capital-slot option after Urban Planning is taken. (`r3-levers.md:226`) | Balance only |
| **Refund legally unusable Assembly draws** | **Adapt: refund only Laws already unproposable when drawn; no replacement draw.** | Removes payment for a barred proposal while preserving political and draw uncertainty. (`s3-advocate.md:328`) | New mechanic |
| **Blockade suppresses only one good, maximum −2 happiness** | **Drop from the first package.** | First establish whether warning makes full suppression manageable; retain this as the severity alternative. (`r2-happiness.md:369`) | New mechanic |
| **Keep class-building output and Granary food unchanged** | **Adopt; address Forum overlap through its Law.** | Their production roles remain distinct. (`s2-strategist.md:224`) | Balance only |
| **Revisit common luxury strength or Port price** | **Adapt: retain current values for the baseline; reopen only on measured reward concentration.** | Identical powers are simple, but that does not prove their strength remains right once happiness pays cards. (`s3-advocate.md:307`) | Balance only |
| **Require the claiming Port to survive** | **Drop.** | Adds another route from building destruction to a happiness collapse. (`r3-levers.md:229`) | New mechanic |
| **Give individual luxury goods different powers** | **Drop.** | Adds rules without addressing the shared concentration problem. (`s2-strategist.md:226`) | New mechanic |
| **Civic feast and Master builder cards** | **Drop from the first list.** | They reopen excluded influence awards or add a discount effect before the approved deck is measured. (`docs/plans/development-deck.md:220`, `:239`) | New mechanic |
| **Resource compensation for refused or unplaceable event pops** | **Drop.** | Declining already solves the forced liability; compensation needs another price and rule. (`r1-decks.md:145`) | New mechanic |
| **Disaster-specific protection or hand-defence cards** | **Drop for now.** | Forecasting and retained cards should establish the remaining need first. (`r1-decks.md:339`) | New mechanic |
| **Separate happiness or additional private random deck** | **Drop.** | Development already occupies that space. (`r2-happiness.md:375`) | New mechanic |
| **Public opportunity/contract deck** | **Drop from this package.** | Distinct potential role, but no demonstrated problem yet warrants another objective system. (`s3-advocate.md:358`) | New mechanic |
| **Keep zero base income, no bank and the current Dole price** | **Adopt as fixed boundaries.** | The study does not justify reopening the whole conversion economy. (`s2-strategist.md:223`) | Balance only |

---

**3. The recommended package**

**Buildings**

Keep these baseline prices and outputs:

| Building | Cost | Effect |
|---|---|---|
| Estate | **4 wood** | Working slaves here produce **2** of their resource. (`src/game/data.ts:237`) |
| Marketplace | **3 wood + 2 gold** | Freemen here produce **2 gold**. (`src/game/data.ts:231`) |
| Forum | **3 stone** | Citizens here produce **2 influence**. (`src/game/data.ts:244`) |
| Temple | **3 stone** | **+1 happiness**, plus the new token-repair permission below. (`src/game/data.ts:249`; proposal: `s2-strategist.md:114`) |
| Granary | **4 wood** | **+2 food per income**. (`src/game/data.ts:255`) |
| Port | **4 gold + 2 stone** | Claims one eligible adjacent good. (`src/game/data.ts:261`, `src/game/status.ts:239`) |

Retain one of each building per settlement and current site permissions. Buildings normally occupy **1 work slot**; Harbour Planning exempts Ports. Homestead Act permits one colony building, including an existing Port. (`src/game/status.ts:205`, `src/game/status.ts:224`, `src/game/ideaRules.ts:14`, `src/game/assembly/deck.ts:134`)

Do not add the Workshop now. A year-1 Workshop would produce **13 wood and 13 stone** over the remaining default game if it survived and no collections were skipped. That calculated output makes it a major production investment. Establish the remaining material-access problem after forecasting and development before introducing it. (`s2-strategist.md:99`, `src/game/actions.ts:300`, `src/game/ruleset.ts:268`)

Two supporting content changes:

- **Forum Rites:** “Citizens in colonies produce **2 influence**. Freemen in colonies produce **0 gold**.” Leave city and capital citizens at their normal output, with Forums still raising them to **2 influence**. Existing scope support handles this. A colony Forum permitted by Homestead Act would still add nothing while this Law stands. **Balance only.** (`src/game/assembly/deck.ts:101`, `src/game/assembly/laws.ts:124`, `src/game/economy/income.ts:451`)
- **Capital Works:** remove it from the Idea pool; retain Urban Planning unchanged. This deliberately removes the additional capital-slot option and its stacking potential. **Balance only.** (`src/game/nationalIdeas.ts:17`, `src/game/ideaRules.ts:6`)

Keep Grain Levy’s Marketplace shutdown. Its food relief has an explicit production cost; removing that cost would strengthen the same freeman economy it feeds. (`src/game/assembly/deck.ts:49`)

**The year deck**

Add **one public upcoming year card**, beginning after setup:

1. Complete placement and the Idea draft.
2. Reveal and apply year 1 at its current point, then expose year 2.
3. At each later year boundary, activate the forecast and expose the following card.
4. Apply Plague and Festival only on activation.
5. Show no forecast beyond the final year. Longer games forecast from the next complete shuffled cycle and retain that forecast.

This is a **new mechanic**. It adopts P3 with the advocate’s setup restriction. (`s2-strategist.md:127`, `s3-advocate.md:111`; current timing: `src/game/turn.ts:138`, `src/game/year.ts:25`, `src/game/year.ts:60`)

Keep all counts and effects:

| Card | Copies | Effect |
|---|---:|---|
| Drought | 2 | Remove plains-slave food output. |
| Wildfire | 2 | Remove forest-slave wood output. |
| Silent Mines | 1 | Remove mountain-slave stone output. |
| Piracy | 2 | Remove freeman gold output. |
| Ostracism | 2 | Remove citizen influence output. |
| Blockade | 1 | Goods provide **0 happiness** for the year. |
| Plague | 2 | Each realm places **1 Unrest token**. |
| Festival | 2 | Each realm clears **all Unrest tokens**. |

Counts and effects: `src/game/data.ts:348`. Production shutdowns include class-building increases: `src/game/economy/income.ts:148`.

Full Blockade remains the concentration test. If warned players repeatedly suffer unavoidable losses despite reasonable preparation, compare it against the proposed **maximum 2-happiness loss**. Do not introduce both warning and reduced severity in the same first comparison.

**The player event deck**

Make **Free Settlers** and **Captured Laborers** optional:

> Accept **1 freeman/slave** in a legal settlement, or decline for **0 resources and 0 pops**.

Keep **3 copies each**. Keep inbound capacity reservations and automatic discard without compensation when nowhere has room. This is a **new mechanic**. (`s2-strategist.md:142`; current rules: `src/game/data.ts:458`, `src/game/data.ts:468`, `src/game/events.ts:28`, `src/game/events.ts:62`)

Keep the other cards unchanged:

| Cards | Copies each | Effect |
|---|---:|---|
| Good Stores, Timber, Shipment, Profit, Patronage | 4 | **+2** food, wood, stone, gold or influence respectively. |
| Rats, Bandits, Fire | 3 | Lose up to **2** stored food, gold or wood respectively. |
| Local Unrest | 3 | Place **1 Unrest token**. |
| Public Calm | 2 | Clear **1 Unrest token**, if present. |

Sources: `src/game/data.ts:415`, `src/game/events.ts:127`.

There is no case here for larger resource events. The **2026-10-26** mixed batch measured a median immediate resource swing of **18%** of collected income and a **50%** 90th percentile. That statistic excludes the lasting effects of pop awards and happiness thresholds; it cannot settle their balance. (`docs/reports/simulation/2026-10-26-balance-check.md:65`, `src/sim/telemetry.ts:195`)

**The development deck**

Use the approved **40-card** list:

| Card | Copies | Effect |
|---|---:|---|
| Foraging | 6 | Immediately gain **1 food per settlement**. (`docs/plans/development-deck.md:133`) |
| Woodcutters | 5 | Immediately gain **1 wood per settlement**. (`:134`) |
| Quarry gang | 5 | Immediately gain **1 stone per settlement**. (`:135`) |
| Bountiful harvest | 1 | Immediately gain **1 food per pop**. (`:136`) |
| Tunny run | 1 | Immediately gain **5 food**. (`:137`) |
| Timber raft | 1 | Immediately gain **5 wood**. (`:138`) |
| Marble block | 1 | Immediately gain **5 stone**. (`:139`) |
| Caravan | 4 | Held: gain **1 food, wood or stone per settlement**, choosing one resource when played. (`:140`) |
| Settlers | 3 | Held: add **1 freeman** to a legal settlement. (`:141`) |
| Captives | 2 | Held: add **1 slave** to a legal settlement. (`:142`) |
| Festival day | 3 | Held: clear **1 own Unrest token**. (`:143`) |
| Raiders | 4 | Held: take up to **3** of one rival’s food, wood, stone or gold. (`:144`) |
| Agitators | 2 | Held: a chosen rival places **1 Unrest token**. (`:145`) |
| Informer | 2 | Held: a chosen rival discards **1 random held card**. (`:146`) |

All abbreviated line references in this table refer to `docs/plans/development-deck.md`.

Retain the proposed operating rules:

- **2 gold per purchase; one purchase per own turn**, after resolving the player event.
- Immediate yields reveal, resolve and discard without consuming a held-card play.
- Private, unlimited hands; public hand counts.
- **One held-card play per own turn**. Never play a card on the turn it was drawn or received.
- One shared deck; reshuffle discards when exhausted.
- Card trades name a quantity. The giver chooses the actual cards at settlement; identities remain private to the two parties.
- Raiders requires a resource the rival holds. Informer requires a nonempty rival hand.

These are **new mechanics**, already proposed in `docs/plans/development-deck.md:84`, `:89`, `:97`, `:111`, `:114`.

Count capitals, cities and colonies as settlements. Count all owned pop classes, including travelling pops, at resolution. Keep Bountiful harvest uncapped in the first assessment. (`docs/plans/development-deck.md:128`, `:136`)

Replacing Ventures has two costs worth accepting explicitly:

- A chosen Colonists’ Voyage provides immediate food on **4/6 die faces**. Only **8/40 cards** in the fresh development mix provide immediate food; a newly drawn Caravan must wait. These are composition calculations, not simulation results. (`src/game/data.ts:188`, `docs/plans/development-deck.md:97`, `:133`)
- Removing Grand Embassy removes a chosen gold-for-influence gamble. Keep influence awards outside this deck as approved. (`src/game/data.ts:159`, `docs/plans/development-deck.md:21`)

Do not describe development as reliable emergency feeding or automatic catch-up. Larger realms receive larger scaling yields. Retained hands also change later shuffle composition, so the printed forty-card average is not a fixed return on every purchase. (`docs/plans/development-deck.md:128`, `:131`, `:290`)

**Happiness**

**Temple token repair — new mechanic.** Owning at least one Temple lets the existing civic-calm action choose between:

| Choice | Payment | Result |
|---|---|---|
| Ordinary calm | **2 influence or 2 gold** | **+2 temporary happiness** |
| Temple repair | Same payment | Clear **1 Unrest token**, with **no temporary bonus** |

Both consume the same once-per-turn use. Multiple Temples grant no extra uses. Repair requires an existing token. Festival Calendar replaces the gold payment with **2 food** for either choice. (`s2-strategist.md:114`; existing payment and limit: `src/game/civic.ts:31`; token operation: `src/game/happiness.ts:120`)

The choice remains meaningful. At **−4**, ordinary calm reaches **−2** and avoids unrest; repairing one token reaches **−3** and still causes a riot. At standing **+2** with a token, repair reaches **+3** and can earn the proposed card. Temporary calm cannot. These are calculations from the current thresholds and proposed reward. (`src/game/ruleset.ts:286`, `src/game/ruleset.ts:307`, `src/game/happiness.ts:113`, `docs/plans/development-deck.md:101`)

**Free development draw — new mechanic.** Use this exact sequence:

> Resolve hunger. Then, once at the unrest checkpoint, standing happiness of **+3 or higher** draws **1 free development card**.

Exclude temporary calm. Add **no food-stock condition**. Resolve a yield immediately; hold other cards for later play. Do not reopen ordinary actions or check eligibility again after riot/revolt recovery. Free food therefore cannot save pops already lost to hunger. This preserves the proposed checkpoint and current hunger order. (`docs/plans/development-deck.md:101`, `src/game/turn.ts:157`, `src/game/turn.ts:176`, `src/game/hunger.ts:106`)

A happy realm that suffered hunger can still qualify. That is an explicit property of the recommendation. The proposed reward gives happiness another use; it does not redefine happiness as food security.

**Riot substitution — retain the approved new mechanic.** For each pop a riot would remove, allow the player to choose a random held-card discard instead. Choose whether to substitute before selecting that random card. Apply it to riot pop losses, including fallback losses and an unpaid bribe’s pop loss. Building and resource losses remain. Revolts remain outside the rule. (`docs/plans/development-deck.md:107`, `src/game/data.ts:95`, `src/game/tables.ts:129`, `src/game/tables.ts:142`)

For implementation, treat substitution as a discard rather than a held-card play: any held card is eligible, including one acquired that turn. It consumes neither the ordinary play nor another insurance purchase. This makes the proposed “held card” wording explicit.

Keep existing riot insurance: **4 food**, **3 influence**, or demoting **one citizen**, each adding **+1** to the roll. (`src/game/data.ts:121`, `src/game/riot.ts:24`)

**Manumission — balance only.** Change slave weight from **3 to 2**. Keep free slave promotion, one ladder move per turn and existing tenure. Under default rules, every slave then costs **1 happiness** while the Law stands. (`src/game/assembly/deck.ts:27`, `src/game/assembly/laws.ts:281`, `src/game/civic.ts:102`)

For ten slaves, one Temple and two goods, current Manumission changes happiness from **0 to −10**; promotion plus calm leaves **−6**. Weight 2 instead gives **−5**, then **−2** after those responses. It remains severe: twelve slaves, two Temples and two goods reach **−6**, then **−3** after promotion and calm. These are calculations, not batch results. (`src/game/happiness.ts:43`, `src/game/happiness.ts:74`, `src/game/assembly/laws.ts:281`, `src/game/ruleset.ts:307`)

**Assembly draw refund — new mechanic.** If a drawn Law is already legally unproposable because it would replace a protected Law, set it aside and refund the **2 influence** draw payment. The sitting’s draw remains spent. An otherwise eligible repeal remains available at **3 influence**. Give no refund for an unwanted legal card, a defeated proposal or a proposal blocked later by an earlier ballot item. This narrows the advocate’s proposal to the draw-time failure. (`s3-advocate.md:328`; current legality and costs: `src/game/assembly/assembly.ts:234`, `:331`, `:388`, `:694`)

**A new deck type**

None survives into this package.

A public opportunity deck remains a possible **alternative to part of development’s random-yield role** if wrong-resource draws remain the main frustration. It would need visible requirements and rewards. It should not be added alongside the full package without that evidence. (`r1-decks.md:343`, `s3-advocate.md:358`)

---

**4. Decisions for the owner**

The development kinds, scaling direction and riot substitution already have direction approval. Retaining them requires no new ruling. The material calls are:

| Call | Options | Recommendation and consequence |
|---|---|---|
| **Should the next year be known?** | Keep it hidden; forecast after setup; expose year 1 before placement too. | **Forecast after setup.** Later shocks become preparation problems. Hidden cards retain broader reserve uncertainty. Pre-setup visibility also changes placement and Idea competition. |
| **Should hunger disqualify a happy realm from its free card?** | Standing **+3** alone; add a no-food-debt condition. | **Standing +3 alone, after hunger.** It is simpler and preserves the approved rule. A food condition must inspect debt before either reset and deliberately withholds the reward after a shortfall. (`src/game/turn.ts:176`, `src/game/hunger.ts:139`) |
| **Should Forum Rites preserve city Forums’ value?** | Keep its current universal citizen bonus; restrict that bonus to colonies. | **Restrict it to colonies.** This preserves city investment and shifts the Law toward dispersed citizens. Keeping the current rule accepts temporary Forum redundancy as political disruption. (`src/game/assembly/deck.ts:101`, `src/game/economy/income.ts:451`) |

---

**5. Order of work and evidence required before shipping**

1. **Refresh the baseline and measurement first.** Use the current bots and rules. Record food, wood, stone, gold and influence separately. Separate shortages that delay construction from shortages that remove pops. Record legal Assembly draw failures, event-pop placement, happiness thresholds and recovery after named shocks.

2. **Make the narrow changes separately.** Optional event pops, Temple repair, Manumission, Forum Rites, Capital Works removal and the Assembly refund should remain individually comparable. In particular, do not judge Manumission only after combining every improvement to slave survival.

3. **Add forecasting and update bot forecasts before judging it.** Current forecasts expire the active year card and treat later cards as unknown. A displayed forecast that bots do not use would not test the proposed agency benefit. (`src/sim/policies.ts:643`, `src/sim/policies.ts:700`)

4. **Implement development in the existing staged order.** First purchases, yields, hands and rival plays; then the happiness reward and riot substitution; then card trading. Assess the free reward and substitution independently as well as together. (`docs/plans/development-deck.md:295`)

5. **Validate the combined package.** Confirm that individually useful changes do not jointly erase scarcity, favour one build too strongly or add too much decision time.

For each material comparison, start with **40 seeds × four seat rotations = 160 mixed-build games per board**, on both Continental and Archipelago, with Ideas enabled. Add equal-master comparisons for leader persistence. These are recommended batch sizes, not results. Pair seeds and seating, but record actual card sequences: new random draws can change later RNG consumption. (`src/game/events.ts:13`, `src/game/year.ts:61`)

| Change | What the batch must establish |
|---|---|
| **Optional pops** | Which builds decline, whether declined slaves would have crossed unrest thresholds, and whether accepted freemen can be fed. |
| **Temple repair** | Whether players choose both outcomes; cost and accessibility of repair; effect on repeated riots and token-clearing card use. |
| **Manumission** | Draw legality, proposal and passage rates, immediate losses and recovery time. Low historical passage alone does not identify the problem. |
| **Forum Rites / Capital Works / refund** | Effects on building value, citizen placement, Idea availability and influence spending. |
| **Year forecast** | Whether warning changes reserves, construction or trade and reduces permanent losses. Inspect Blockade separately by goods and slave count. |
| **Development purchases** | Realized gains by resource; paid draws by build and realm size; unused hands; changed reshuffle composition; trade displaced or enabled. |
| **Free happiness card** | Eligibility by build, year, settlement count and luxury holdings; repeat qualification; whether larger rewards reinforce an existing lead. |
| **Riot substitution** | Pops preserved, useful cards sacrificed, repeated riots, and whether preserving slaves postpones a larger revolt. |
| **Rival cards** | Actual targets and losses. Establish whether attacks restrain leaders or concentrate on vulnerable trailing realms. |

Keep the existing **45% personality win flag** and **40% equal-master year-5 leader benchmark**, with uncertainty intervals. Do not treat an interval crossing a boundary as a settled pass or failure. These benchmarks are recorded in the **2026-10-26** report. (`docs/reports/simulation/2026-10-26-balance-check.md:12`, `:37`, `:54`)

Do not approve a catch-up mechanic from stock ratios alone. The **2026-10-26** report attributes much of that ratio to nearly empty trailing stocks; it does not establish a last-place recovery rate. (`docs/reports/simulation/2026-10-26-balance-check.md:102`)

Finally, use human hotseat sessions to assess forecasting, private card transfers and riot substitutions. Simulations cannot establish whether those decisions fit the intended play time or whether human trading supplies answers the bots miss. The current bots bargain through one counter and do not plan general rival responses. (`docs/reference/ai.md:329`, `docs/reference/ai.md:362`)