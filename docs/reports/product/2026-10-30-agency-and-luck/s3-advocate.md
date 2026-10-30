# Hegemony design study: devil’s advocate

**2026-10-30.** All five study files were read in full. This review checks their claims against the engine and existing reports. No files were changed, and no tests, simulations or installations were run.

**Most of the strategist’s rule claims and arithmetic hold. The main weakness is treating missing protection as proof that protection should be added.** The proposals also overlap: forecasting, Workshops and development yields all answer material uncertainty; Temple repair and Festival day answer token persistence.

| Proposal | Lean |
|---|---|
| P1 — Workshop | **Drop as written** |
| P2 — Temple token repair | **Keep as written; sound** |
| P3 — Public year forecast | **Keep with a change: begin forecasting after setup** |
| P4 — Optional event pops | **Keep as written; sound** |
| P5 — Development deck, without riot substitution | **Keep with a change: retain approved riot substitution as the comparison baseline** |
| P6 — Free card requires happiness and no food debt | **Keep with a change: remove the food condition and use the existing post-hunger check** |
| P7 — Manumission weight 2 | **Keep as written; sound as a balance candidate** |

The **2026-10-26** evidence quoted by the strategist checks out: slaver 41/160 wins, civic 30/160, trader 55/160 and master 34/160; late slaver riots at 20%; trader hunger losses at 5.36 pops per seat-game; civic influence growth at 6.3 per year. These are historical bot results, not results for this package. The report’s mixed table was Continental with Ideas; its Archipelago table had four masters without Ideas. (`docs/reports/simulation/2026-10-26-balance-check.md:18`, `:54`, `:79`)

## P1 — Add a Workshop

**The strongest case against it**

This is a permanent change to the production economy presented as disaster protection. It lets a settlement produce both wood and stone without the slaves or terrain currently supplying those resources. That weakens the reason to obtain different land and the reason to buy materials from another player. The current system makes working slaves use open slots and the tile’s resource; flat building income bypasses that connection. (`src/game/settlement.ts:68`, `:79`, `:83`; `src/game/economy/income.ts:438`)

The absence of wood and stone insurance is real. Its importance is less established. Missing food can remove pops at turn end. A missed material collection usually delays a chosen purchase. Those deserve different thresholds for intervention. (`src/game/economy/income.ts:277`; `src/game/hunger.ts:139`; `src/game/status.ts:195`)

**What it strains**

The opening purchase is readily available. Starting stocks contain 8 wood and 4 stone, so the proposed 4-wood, 2-stone Workshop can be bought without first developing material production. A Granary can consume the remaining 4 wood. This makes an early infrastructure opening plausible across many boards. (`src/game/data.ts:26`, `:255`)

A year-1 Workshop surviving through year 14 would collect **13 wood and 13 stone**, assuming no skipped collections. That is calculated gross output, not a measured result. Its role extends far beyond replacing one Wildfire or Silent Mines collection. Buildings bought after income first contribute at a later collection; the default game lasts fourteen years. (`src/game/actions.ts:300`, `:339`; `src/game/ruleset.ts:268`)

The slot price also differs by build. A crowded slaver can lose an Estate worker producing 2 of its resource. Freemen and citizens produce without slave work slots, so a civic or trader realm may face much less displacement. (`src/game/settlement.ts:83`; `src/game/economy/income.ts:83`, `:451`)

The screen cost is modest: one construction option. The strategic cost is larger: another opening investment whose value depends on remaining years, displaced output and future purchases. Bots can read its income, but their forecasts do not plan later construction sequences. (`docs/reference/ai.md:362`)

**Interaction with the other proposals**

P3 supplies preparation time. P5 supplies new wood and stone windfalls. Either could reduce the need for the Workshop. Adding P1 first risks solving the same shortage through three systems.

It also changes Land Reform’s bargain. That Law currently converts slave production to food and forbids new Estates. Workshops would preserve material production while that conversion stands. This is a substantial weakening of the Law’s economic cost. (`src/game/assembly/deck.ts:5`)

**Rule and number check**

The strategist is correct that flat Workshop income would survive Wildfire, Silent Mines and Land Reform under the existing interpreters. General Strike would skip it. The four-collection return of 4 wood and 4 stone is also correct. (`src/game/economy/income.ts:148`, `:438`; `src/game/actions.ts:312`)

There is no arithmetic error. The weak inference is that a missing recurring source warrants adding one.

**Lean: drop as written.** Forecasting and the already approved material cards should be assessed before creating a terrain-independent source of both construction materials. The Workshop remains a defensible alternative if persistent material lockouts survive those changes.

## P2 — Let a Temple enable token repair through civic calm

**The strongest case against it**

It gives prepared, solvent realms a dependable answer to token damage while leaving the poorest realms dependent on draws. Temples normally require a city or capital, stone and a slot. Under Sacred Fields, a new Temple costs 6 stone. The players most in need of recovery may lack that entry price or a legal site. (`src/game/data.ts:249`; `src/game/status.ts:205`; `src/game/assembly/deck.ts:16`)

It also makes existing clearing cards less valuable. A player who can purchase repair has less reason to welcome Public Calm or retain Festival day. Public Calm currently clears one token; Festival clears all. (`src/game/data.ts:406`, `:508`; `docs/plans/development-deck.md:143`)

**What it strains**

The added choice requires the player to distinguish temporary happiness from removing a negative term. That distinction already exists, but the interface must show the resulting unrest outcome. At −4, choosing repair instead of ordinary calm can mean paying and still facing a riot. Riots themselves clear all tokens when they begin. (`src/game/happiness.ts:88`, `:94`; `src/game/unrest.ts:46`; `src/game/riot.ts:27`)

Bots must therefore value the actual outcome, not award a fixed bonus for removing a token. Their current forecasts assume no future random token changes, which can overvalue repair shortly before an unknown Festival. (`docs/reference/ai.md:103`)

**Interaction with the other proposals**

P3 improves this choice: a visible approaching Festival makes waiting intelligible. P6 increases repair’s value sharply at the proposed +3 threshold. Paying 2 gold to move standing happiness from +2 to +3 could earn a card that otherwise costs 2 gold, with later eligibility as an additional benefit. (`docs/plans/development-deck.md:84`, `:101`)

That is a reason to assess the combined reward, not a reason to reject repair.

**Rule and number check**

The existing action really does offer 2 gold or 2 influence, share one use limit, and grant temporary +2. Festival Calendar replaces the gold payment with 2 food. The clear-one operation already exists. The strategist’s −4 and +2 examples are correct. (`src/game/civic.ts:31`, `:73`; `src/game/happiness.ts:113`, `:120`)

“Permanent repair” should mean lasting removal of this token, not permanent immunity. Later cards can place new tokens. (`src/game/data.ts:398`, `:500`)

**Lean: keep as written.** This is sound. It creates a meaningful choice through an existing action, retains immediate danger, and leaves slave unhappiness untouched. The Temple prerequisite gives the building a distinct function without multiplying uses.

## P3 — Reveal one upcoming year card

**The strongest case against it**

Uncertainty currently rewards general reserves and mixed preparation. Exact warning rewards the particular answer needed next year. A player can spend closer to the limit whenever the forecast is harmless to their build.

Forecasting also announces relief. A known Festival discourages token repair. A known end to Blockade can justify temporary measures instead of a lasting happiness investment. The uncertainty being removed includes beneficial timing, not only disasters. Festival clears tokens on reveal; Blockade suppresses luxury happiness only while active. (`src/game/year.ts:25`; `src/game/luxury.ts:64`)

This can favour a leader who already has the resources and sites to respond. Information does not itself give a trailing realm the means to build, trade or change population.

**What it strains**

Showing year 1 before placement changes setup incentives. A forecast Drought changes the immediate attraction of food-producing slaves and Good Harvest; Ostracism changes the opening value of citizens’ influence. Good Harvest supplies independent food income, while the shocks remove particular class columns. (`src/game/nationalIdeas.ts:4`; `src/game/economy/income.ts:148`, `:264`)

The setup snake gives the first capital picker the first Idea pick under the default two-round setup. A known opening shock can make the most useful exclusive Idea more contested. The proposal does not establish that this improves setup fairness. (`src/game/turn.ts:96`; `src/game/ideas.ts:43`, `:47`; `src/game/ruleset.ts:333`)

The interface must distinguish an active effect from a forecast. The bots need more than a displayed card: their current forecast explicitly expires the active card and assumes later cards are unknown. (`src/sim/policies.ts:643`, `:700`)

One more public card is a small reading cost. Repeatedly planning purchases and negotiations around it may increase decision time; no reviewed report establishes the effect on a 45–90 minute human game.

**Interaction with the other proposals**

P3 is the cleanest competitor to P1. It tests whether reserves and existing investments become sufficient when players have warning.

It also changes P2’s repair decisions and P6’s expected free draws. Blockade would become a known interruption of both happiness and card income under the proposed reward. (`src/game/luxury.ts:64`; `docs/plans/development-deck.md:101`)

**Rule and number check**

The next card is currently hidden in player projections. Later year cards reveal before the Assembly and ordinary turns. Plague and Festival act on reveal. These claims hold. (`src/game/projection.ts:79`; `src/game/year.ts:25`, `:78`; `src/game/turn.ts:190`)

The qualification is year 1: pre-setup visibility offers a placement decision, not a preceding ordinary turn in which to build or stockpile. Current year-1 reveal occurs after setup. (`src/game/turn.ts:121`, `:138`)

**Lean: keep with a named change — begin forecasting after setup.** Reveal year 1 at the current point, then expose year 2. This preserves the existing opening setup and gives every later forecast a full year of ordinary preparation. Keeping the card counts and severities unchanged is sound for assessing the forecast.

## P4 — Make both player-event pop awards optional

**The strongest case against it**

It removes a cost of running an economy near its limits. A slaver can reject the slave that would trigger unrest; a freeman economy can reject another future mouth. Players retain useful awards and refuse harmful ones, so this raises the average value of both cards.

Spare capacity also becomes a less demanding commitment: the player can leave room without accepting every arrival. Current awards require placement whenever a legal destination exists. (`src/game/events.ts:28`, `:37`)

**What it strains**

There is little rules or screen strain. Both cards already require destination selection, so a decline option fits the same decision.

The bot decision matters more than the interface. It must compare decline with the best placement using immediate happiness, future upkeep and title value. Merely preferring more pops will preserve the current problem. Slaves affect happiness immediately; freemen normally consume food at later incomes. (`src/game/happiness.ts:63`; `src/game/ruleset.ts:279`)

**Interaction with the other proposals**

P2 and P7 also reduce the cost of slave instability. Together they help slaver more than this proposal’s small wording change suggests.

P4 also narrows the difference between event pops and development pops. The latter still retain an important advantage: the holder chooses a later play time. (`docs/plans/development-deck.md:97`, `:141`)

**Rule and number check**

The compulsory-placement claim is correct. No capacity means automatic discard; otherwise resolution requires a legal target. (`src/game/events.ts:28`, `:44`)

The **2026-10-26** median 18% resource-card swing and 50% 90th percentile are quoted correctly. They do not measure pop compounding or support the optional-pop decision either way. (`docs/reports/simulation/2026-10-26-balance-check.md:65`; `src/sim/telemetry.ts:195`)

**Lean: keep as written.** This is sound. A windfall can currently impose immediate danger before supplying any production. Declining without compensation fixes that problem with little added procedure. (`src/game/actions.ts:323`; `src/game/events.ts:111`)

## P5 — Keep the development list but remove riot substitution

**The strongest case against it**

The proposal keeps a large collection of new mechanics while cutting one of the clearest ways a saved card could answer a bad outcome.

Riot substitution has an opportunity cost. The discarded card is random and could be a useful Caravan, pop award or attack. Half the printed deck consists of immediate yields that cannot be retained for substitution. Calling the remaining cards “cheap replacement lives” does not establish their effective price or availability. (`docs/plans/development-deck.md:89`, `:97`, `:107`, `:131`)

Preserving slaves is also the declared purpose of this approved recovery rule. Showing that it does not remove slave unhappiness identifies its tradeoff; it does not prove a balance fault. Revolts remain outside its protection. (`docs/plans/development-deck.md:107`)

The broader list deserves more criticism than “keep all kinds.” Replacing Ventures changes the agency offered by a purchase. Today the player chooses the expedition and therefore the desired kind of gamble. Development purchases draw from one mixed deck. Held cards return control later, after the draw and delay. (`src/game/ventures.ts:14`, `:35`; `docs/plans/development-deck.md:84`, `:97`)

**What it strains**

The full package adds buying, immediate yields, delayed plays, private hands, resource selection, rival selection and private card transfers. Card trading permits the giver to choose the actual card at settlement. That is substantial interaction to learn and display. (`docs/plans/development-deck.md:84`, `:97`, `:111`, `:114`)

Calculated from the proposed limits, four seats completing fourteen years could make **112 development draws**: 56 purchased and 56 free. That is an upper bound, not an expected count. It comes on top of ordinary player events and year reveals. The one-play limit restrains held actions, but does not restrain immediate yields or the decisions around buying and trading. (`src/game/ruleset.ts:268`; `src/game/actions.ts:335`; `docs/plans/development-deck.md:84`, `:97`, `:101`)

Bots currently evaluate the shipped Venture outcomes exactly. Hidden hands, delayed value, targeted attacks and card trades require different valuation. Their general search does not model rival replies or prolonged bargaining. (`docs/reference/ai.md:88`, `:362`)

**Interaction with the other proposals**

P1 supplies the materials P5 makes purchasable. P2 supplies the token repair Festival day offers. P6 increases the number of draws and rewards the happiness that those repairs preserve.

Removing riot substitution also removes a reason for held cards to return to circulation through losses. Retained hands change subsequent deck composition. The strategist acknowledges this, but does not connect the cut to it. (`docs/plans/development-deck.md:107`, `:290`)

Rival cards offer chosen pressure, not automatic leader control. Raiders can target a vulnerable trailing realm as readily as the leader; nothing in the proposal restricts that choice. (`docs/plans/development-deck.md:114`, `:144`)

**Rule and number check**

The 40-card composition, immediate expectations and 8/40 immediate-food count are correct. At four settlements and twelve pops:

- Food: `(6×4 + 12 + 5)/40 = 1.025`.
- Wood: `(5×4 + 5)/40 = 0.625`.
- Stone: the same 0.625.

These are fresh-deck calculations, not dependable returns on a particular purchase. (`docs/plans/development-deck.md:131`)

One omitted comparison matters: choosing Colonists’ Voyage currently gives immediate food on **4/6 faces**. The proposed mixed draw gives immediate food on **8/40 cards**. This does not settle overall value, but it is a real loss of emergency-food targeting. (`src/game/data.ts:188`; `docs/plans/development-deck.md:133`)

**Lean: keep with a named change — separate deck approval from the riot cut.** Retain approved substitution as the comparison baseline. Its removal has a clear simplicity argument, but no demonstrated balance case. The approved implementation plan already separates the basic deck, happiness/riot connections and card trading into stages; that is a more useful structure than approving their balance together. (`docs/plans/development-deck.md:295`)

## P6 — Require happiness +3 and no food debt for a free card

**The strongest case against it**

The food condition withholds recovery from the realm already suffering a shortfall. A realm at standing +3 and −1 food loses a pop and receives no card. An otherwise identical realm at 0 food receives another asset. This creates a second sharp threshold on top of the happiness threshold. Existing hunger already removes eligible pops and resets food. (`src/game/hunger.ts:81`, `:139`)

The condition also measures one turn’s closing stock, not a sustainable food economy. A player can qualify through a one-off purchase or trade while remaining dependent next year. General Strike can even skip an otherwise negative food collection, making qualification easier despite stopping production. (`src/game/actions.ts:312`; `src/game/core/resources.ts:40`)

The trader’s historical hunger is a reason to investigate its decisions and victory incentives. It does not establish that hungry, happy realms should lose an additional reward.

**What it strains**

This adds another end-turn checkpoint and another eligibility explanation. The player must understand standing happiness, temporary calm, negative food, the commitment point, immediate yields and delayed held cards.

The timing is especially awkward for food rewards. Under P6, a free food yield arrives before hunger only after food debt has already disqualified the player. It therefore cannot perform emergency rescue. That is coherent, but much of the apparent benefit of moving the draw earlier disappears.

Bots need to price both thresholds together. A recurring free reward must also enter their economic forecasts; a fixed happiness bonus will not capture the value of qualifying for several future draws.

**Interaction with the other proposals**

P2 can restore the +3 threshold. P1 can help fund later Temples and Granaries. P5 then pays larger scaling yields to larger qualifying realms. The result rewards happiness, food coverage and size together.

That can be an intentional prosperity reward. It should not be described as a comeback system.

The food condition also leaves the existing victory issue unchanged. Standing happiness still breaks title ties whether or not a realm previously lost pops to hunger. (`src/game/victory.ts:169`)

**Rule and number check**

The strategist correctly identifies the food-reset problem. Hunger resolution resets food to zero, so a later check cannot infer whether the deficit was paid. There is also a reset in `commitTurn`, including cases with no eligible mouths. (`src/game/hunger.ts:139`; `src/game/turn.ts:176`)

If retained, P6’s eligibility must be checked before either reset and must not be awarded again when hunger resolution resumes commitment. The proposed wording recognises the first requirement; the engine sequence makes both necessary. (`src/game/turn.ts:157`; `src/game/hunger.ts:106`)

The **2026-10-26** trader’s 25 happiness-tiebreak wins are correctly quoted. That result does not establish how often each build would meet both proposed conditions. (`docs/reports/simulation/2026-10-26-balance-check.md:92`)

**Lean: keep with a named change — standing-only eligibility at the existing post-hunger unrest check.** Remove the food condition and extra checkpoint. This preserves the approved +3 direction with fewer rules. Free food then helps future turns; hunger remains resolved before the reward. That limitation should be explicit. (`docs/plans/development-deck.md:101`; `src/game/turn.ts:176`)

The recurring reward itself still needs scrutiny. Positive happiness already helps win; its lack of ordinary income is not, by itself, proof of a defect. (`src/game/victory.ts:75`, `:169`)

## P7 — Reduce Manumission’s slave weight to 2

**The strongest case against it**

This weakens a political threat to the build that several other proposals also protect. Optional Captured Laborers, token repair and advance Blockade warning all make slave management easier. Reducing Manumission at the same time could remove too much pressure.

Its rarity is weak causal evidence. Manumission is a price Law because it changes promotion cost. A protected standing price Law can prevent it from being proposed at all. Low enactment can therefore reflect availability and replacement restrictions as well as unattractive severity. (`src/game/assembly/deck.ts:27`; `src/game/assembly/laws.ts:131`; `src/game/assembly/assembly.ts:316`, `:331`)

**What it strains**

The proposed value is much clearer than weight 3: under the default divisor, each slave costs one happiness while the Law stands. The rule adds no new screen or decision. Existing political evaluation can assess the changed engine outcome. (`src/game/happiness.ts:43`; `src/game/assembly/laws.ts:271`; `src/game/assembly/assembly.ts:852`)

It remains dangerous. With **twelve slaves, two Temples and two goods**, ordinary happiness is 0. Weight 2 makes it −6. One free promotion reaches −5; calm reaches −3, still a riot. This is calculated from the default formula, not a simulation result. (`src/game/happiness.ts:43`, `:74`; `src/game/ruleset.ts:304`, `:307`; `src/game/assembly/laws.ts:281`)

Its economic transition also remains costly. Promoting a slave removes material production and creates a freeman who normally eats food. (`src/game/ruleset.ts:279`; `src/game/civic.ts:159`)

**Interaction with the other proposals**

P2 repairs tokens, so it cannot directly repair Manumission’s slave term. That preserves a useful distinction. P4 and P3 still reduce other sources of slave instability, which argues for assessing P7 separately.

Price-Law replacement deserves attention too. Replacing eligible Sacred Fields with Manumission can remove Temple food at the same sitting that slave unhappiness rises. A smaller slave weight does not remove that combined shock. (`src/game/assembly/deck.ts:16`, `:27`; `src/game/assembly/assembly.ts:316`)

**Rule and number check**

The strategist’s ten-slave example is correct: ordinary 0, current Manumission −10, promotion plus calm −6; proposed weight 2 gives −5, then −2 after the same responses. The shared ladder limit and year-6 first repeal opportunity for a year-2 Law are also correct. (`src/game/happiness.ts:43`; `src/game/assembly/laws.ts:281`; `src/game/civic.ts:102`; `src/game/assembly/assembly.ts:306`)

The **2026-10-26** report does record one Manumission passage in 160 mixed games. It does not identify the cause. (`docs/reports/simulation/2026-10-26-balance-check.md:73`)

**Lean: keep as written.** This is a sound balance candidate. It reduces an unusually large immediate shock through one existing number while retaining political pressure and gradual conversion. It should not be bundled with every other slaver protection.

## Luck worth keeping

### Shared shocks create valuable scarcity

The year deck tests concentrated economies. Estate, Marketplace and Forum investment increases normal production and the matching shutdown loss. That makes concentration a decision with an exposed cost. The fixed fourteen-card composition bounds the number of each test in a completed default game. (`src/game/data.ts:229`, `:348`; `src/game/economy/income.ts:148`)

Forecasting can improve preparation. Workshops go further by changing who needs the affected production at all. Removing both uncertainty and dependence risks making the year deck mostly a maintenance schedule.

Shared shortages can also change bargaining power. A seat with independent food or saved stock may become useful to rivals during Drought. This is a plausible interaction benefit, not a measured human-trade result. (`src/game/economy/income.ts:153`, `:438`; `src/game/trade.ts:38`)

### Surprise relief can reward endurance

Festival clears all tokens, so its benefit is larger for a realm carrying more token damage. It can interrupt a worsening position without adding a bespoke trailing-player rule. It is not guaranteed catch-up: it ignores titles, wealth and position. (`src/game/data.ts:406`; `src/game/happiness.ts:120`)

P2 makes paid recovery possible. P3 removes surprise from the next Festival. Both may be worthwhile, but they reduce the value of waiting through uncertainty.

### Local windfalls force useful reconsideration

Resource events can unexpectedly complete a building price or supply a reserve. Their identity and timing remain outside the player’s choice, while spending the result remains theirs. (`src/game/data.ts:415`; `src/game/actions.ts:339`)

P4 preserves that opportunity while removing compulsory pop liabilities. There is no need to defend an involuntary sixth slave to defend event randomness.

### Riot uncertainty makes insurance a real decision

Players choose insurance before rolling. Payments shift the reachable outcomes rather than specifying a loss. That creates a choice between certain expenditure and uncertain damage. (`src/game/riot.ts:65`, `:147`; `src/game/tables.ts:54`)

The strategist correctly retains this system. Any future effort to make every bad outcome preventable would weaken it.

### Random political agendas limit scripts

Assembly draws let players choose a politician, inspect the result and reject it. Passage remains a vote. Randomness supplies a proposal opportunity that players must evaluate. (`src/game/assembly/assembly.ts:229`, `:283`, `:792`)

This is valuable replay variety. Improving unusable draws would be different from allowing players to select their preferred Law.

## What the strategist missed

### 1. Existing buildings lose their purpose under Laws

The “leave output alone” position skips the clearest existing-building problem.

Forum Rites sets citizen influence to 2 everywhere. A Forum raises output only above the effective base, so it adds nothing while that Law stands. Grain Levy explicitly idles Marketplaces. Both buildings still occupy slots. (`src/game/assembly/deck.ts:49`, `:101`; `src/game/economy/income.ts:417`, `:451`; `src/game/ideaRules.ts:21`)

That can be deliberate political disruption. It still deserves an explicit design judgment before adding another building.

**A narrower candidate:** make Forum Rites’ citizen increase apply only in colonies, retaining its colony-freeman penalty. This is a **content revision using existing scope support**. City Forums would retain their purpose, while the Law would reward dispersed citizens. (`src/game/assembly/types.ts:68`; `src/game/assembly/laws.ts:124`)

R3’s alternative, +2 influence per realm, also preserves Forums and supplies independent influence. But it changes a citizen-scaling benefit into a flat benefit. It could hurt citizen-heavy civic realms while helping realms with few citizens. It should not be treated as an equivalent repair. (`r3-levers.md:227`; `src/game/assembly/deck.ts:108`)

### 2. Idea duplication deserves a decision, not dismissal

Capital Works gives a capital slot. Urban Planning gives that slot and a slot in every other city at the same acquisition price. The overlap is real. (`src/game/nationalIdeas.ts:17`, `:23`; `src/game/ideaRules.ts:6`; `src/game/ruleset.ts:312`)

It is not wholly redundant: Ideas are exclusive, and slot effects can stack. Capital Works offers additional supply after Urban Planning is taken. (`src/game/ideas.ts:47`; `src/game/ideaRules.ts:6`)

Even so, the **2026-10-26** batch never drafted or bought Capital Works. For an owner seeking fewer, sharper rules, removing it is a credible **content reduction**. The cost is losing that extra slot option. The strategist should make that tradeoff explicit. (`docs/reports/simulation/2026-10-26-balance-check.md:73`)

### 3. Luxury simplicity does not settle luxury strength

Keeping goods mechanically identical is sensible. Keeping ownership independent of Port survival also avoids turning building loss into another happiness cascade. Those decisions do not establish that +2 per good and the current Port price should remain fixed once happiness pays recurring cards. (`src/game/luxury.ts:57`, `:64`; `src/game/tables.ts:254`; `src/game/data.ts:261`)

The **2026-10-26** trader held Beloved on 335 of the 487 turns on which anyone held it. That is relevant evidence against assuming the new happiness economy primarily helps civic. It does not prove which luxury adjustment is needed. (`docs/reports/simulation/2026-10-26-balance-check.md:92`)

The useful distinction is:

- Preserve identical good powers and the current ownership model.
- Reopen the shared happiness value or acquisition price if recurring cards compound the existing advantage.

Both strength knobs already exist. Individual luxury powers are unnecessary for that review. (`src/game/ruleset.ts:301`; `src/game/data.ts:264`)

### 4. Full Blockade needs a separate judgment

Forecasting improves warning. It does not bound the response required. Multiple goods still fail together, while calm supplies only +2 and promotion is limited to one ladder move. (`src/game/luxury.ts:64`; `src/game/ruleset.ts:307`; `src/game/civic.ts:102`)

R2’s proposed maximum loss of one good’s happiness would put ordinary Blockade damage within one calm purchase. That is a **new partial-suppression mechanic**, not existing number tuning. It would also weaken the check on luxury concentration. (`r2-happiness.md:369`; `src/game/data.ts:390`)

The strategist is right to avoid changing severity and information together. The omission is a decision rule: if warned players still lack feasible responses, the next question is severity, not more warning.

### 5. Unusable Assembly draws are another agency gap

A player can pay 2 influence, draw a Law and discover that protected replacements prevent its proposal. Discarding does not refund the price or allow another draw. P7 changes one card’s severity but leaves this structural loss intact. (`src/game/assembly/assembly.ts:234`, `:283`, `:331`)

A narrow candidate would refund a draw that is legally unproposable, without granting another draw. This would be a **new mechanic**. Its purpose would be to remove payment for a barred action while preserving uncertainty about useful and passable proposals.

That deserves comparison with adding more production. It improves agency at an existing decision point.

### 6. Replacing Ventures also removes an influence outlet

Grand Embassy currently offers a chosen gold-for-influence gamble. The development list has no influence awards. Its removal therefore narrows a response during influence scarcity, even as the new deck expands gold’s material uses. (`src/game/data.ts:159`; `docs/plans/development-deck.md:21`, `:131`)

The owner explicitly excluded influence cards. This is not a reason to insert one quietly. It is a cost the assessment should record alongside the weaker immediate-food targeting.

### 7. Trade and recovery need clearer success measures

A Workshop can improve material access while reducing trade. Development cards can make gold useful while strengthening the trader. Temple repair can improve control while making clearing cards less useful. Each change has more than one plausible outcome.

The **2026-10-26** resource-swing statistic measures immediate resource movement against collected income. It excludes the lasting consequences of pop awards and token thresholds. The report also did not recount human reading burden. (`src/sim/telemetry.ts:195`; `docs/reports/simulation/2026-10-26-balance-check.md:65`, `:67`)

Future assessment should distinguish:

- A shortage being delayed, repaired or converted into permanent losses.
- Trade being unavailable, refused or displaced by self-supply.
- Free-card eligibility by build, year, realm size and luxury holdings.
- Cards retained, played too late, traded or lost.
- Human decision time, especially purchases, targeting and private transfers.

These are observations to collect, not additional game rules.

### 8. A fifth deck is unsupported, but its strongest alternative deserves stating

R1 identifies a public opportunity with a known requirement and reward as an uncovered role. That would address a different problem from another private windfall deck: players could choose whether to pursue a visible opportunity. (`r1-decks.md:343`)

The strongest case is as an **alternative to part of development’s random yield function**, if wrong-resource draws remain the main frustration. It would be a **new objective mechanic**, with new display and tracking costs. A simple resource exchange could also recreate the fixed conversion system the owner removed. (`docs/plans/development-deck.md:27`)

There is no reviewed evidence establishing a comeback problem that requires this deck. The **2026-10-26** stock ratios largely reflect nearly empty trailing stocks, and the research establishes no measured last-place recovery rate. (`docs/reports/simulation/2026-10-26-balance-check.md:102`; `r4-builds.md:105`)

The defensible position is to leave a fifth deck aside while preserving this alternative for a specific unresolved problem. Adding another random source would not, by itself, add agency.