# Hegemony luck-and-draw content audit

Date: 2026-09-05. Branch `feat/luxury-topology` at d46ec5f. Read-only audit of every card face and table row a player can be dealt. Numbers below were recomputed from the live data with a throwaway script (scratchpad `ev.ts`) and cross-checked against `src/game/deck.test.ts` (8/8 passing).

## 0. Conventions

**Sources.** Seasonal and player decks, tables, omen, stakes: `src/game/data.ts`. Politicians, Laws, Directives: `src/game/assembly/deck.ts`. Effect unions: `src/game/types.ts:104-192` (events), `:263-271` (tables), `src/game/assembly/types.ts:54-106` (Laws), `:110-122` (Directives). Resolution: `src/game/events.ts:187-344`, `src/game/tables.ts:54-201`, `src/game/assembly/laws.ts`, `src/game/assembly/assembly.ts:870-975`, `src/game/economy/cost.ts:21-96`, `src/game/economy/income.ts:129-280`.

**Valuation basis** (the deck test's own, `deck.test.ts:9-24`): every resource unit counts 1 (wood, stone, gold, food, influence, happiness alike); a free pop counts its grow cost (slave 5, freeman 7, citizen 11 — `data.ts:53-64`); a coupon counts face × 0.5; an exchange counts its net; per-pop payouts count their floor; a choice counts its best option. Where I say "in gold terms" I use the classic bank (`rules.md:145-151`, `ruleset.ts:269-276`): wood sells 4:1, stone and food 3:1, everything buys for 2 gold; and civic calm prices happiness at 2 gold each (6 gold → +3, `ruleset.ts:286`).

**Legibility scale.** 5 = one flat number, resolves now, nothing else to know ("Gain 3 Food"). 4 = flat numbers plus one timing/placement wrinkle the card itself states ("this season", "each of your next 3 turns", "a settlement with room", "choose a rival"). 3 = needs one external count or one external price (per N pops; per city; a coupon whose worth depends on the action's price; "half, rounded up"). 2 = two interacting terms, or a delta the player must project across turns and across all four players. 1 = needs a formula, a rate, or a class list that is not on the card ("bank rate improves one step", "every 2 food above 10", "civic buildings", "slaves produce 1 less").

**Column definitions.** *Numerals* = numeric tokens printed in the card text (each must be read; "half"/"doubled" count 0). *Conditionals* = if / or / per / minimum / but / above / below / first-each-year / next-X-this-turn / excluding / rounded / with-capacity / largest / newest clauses. *Derivative* = adjusts a term of the income sum or of an action's price by a small standing or season-long delta. *Coupon* = a one-shot discount that must be spent on a specific future action. *Timed* = anything that lingers past resolution (season, turn, year, N turns, standing).

---

## 1. Grammar inventory

36 effect type names across four unions (`resourceDelta` is spelled in two unions, so 35 unique strings). Counts are card kinds (copies in parentheses where copies exist).

### 1a. Event effects (`types.ts:104-192`, resolved `events.ts:187-344`)

| Type | Plain meaning | Used by | Legibility |
| --- | --- | --- | --- |
| `resourceDelta` | Gain/lose N of a material now (losses clamp at 0, `events.ts:354-361`) | 1 seasonal (Spring Floods ×2); 9 player direct (Good Stores, Timber Windfall, Merchant Profit, Stone Shipment, Granary Rats, Banditry, Warehouse Fire, Quarry Collapse, Patronage Network — 35 copies) + 6 as choice options (Emergency Labor, Granary Surplus, Skilled Mason, Caravan Contacts, Forest Crews, Market Day) | 5 |
| `happinessDelta` | Gain/lose N happiness now (no clamp) | 3 player direct (Local Unrest, Public Calm, Quarry Collapse — 10 copies) + 3 as options (Emergency Labor, Civic Petition, Temple Donation) | 5 |
| `scaledResourceDelta` | Gain N per K total pops, floored, with a minimum (`settlement.ts:193-205`) | 3 seasonal (Timber Levies, Quarry Contracts, Grain Tithe — 9 copies) | 3 |
| `scaledHappinessDelta` | Same scaling into happiness; `duration: season` variant lands at each player's income instead of now | 2 seasonal (Civic Anxiety season ×2, Festival Games immediate ×2) | 2–3 |
| `timedHappinessDelta` | ±N happiness at the start of each of the player's next T turns (`unrest.ts:34-55`) | 2 (Plague ×2 seasonal, Civil Discord ×3 player) | 4 |
| `incomeModifier` | ±N of one resource added to each player's income for the season (`income.ts:344-368`) | 4 seasonal (Drought ×4, Bountiful Harvest ×4, Open Markets ×2, Wildfire ×2) | 4 |
| `buildingCostMultiplier` | Building prices ×M for the season, rounded up, colony/upgrade excluded (`cost.ts:29-37,113-135`) | 2 seasonal (Scarce Labor ×2, Skilled Artisans ×2) | 3 |
| `addPops` | Place N pops of a type in an owned settlement with room (player picks the tile) | 3 player (New Citizen ×4, Free Settlers ×4, Captured Laborers ×3) + 1 option (Granary Surplus) | 4 |
| `actionCostDiscount` | Coupon: next matching action this turn costs N less of one resource; consumed on use, gone at turn end (`cost.ts:137-176`) | 3 player pure (Citizenship Rolls ×4 [two coupons], Willing Hands ×4, Slave Auction ×3) + 3 options (Skilled Mason, Forest Crews, Temple Donation) | 3 |
| `resourceExchange` | Trade up to N of X for N×ratio of Y, floored (`events.ts:301-330`) | 1 option (Caravan Contacts ×2) | 3 |
| `resourceDeltaPerPop` | Gain N per pop of one type, with a minimum (`events.ts:331-341`) | 1 option (Market Day ×1) | 3 |
| `choice` | Pick one of two option bundles | 8 player (17 copies) | container |

### 1b. Law effects (`assembly/types.ts:54-106`, resolved `assembly/laws.ts`)

All standing until repealed, table-wide (`laws.ts:24-26`), consulted every income and every cost preview.

| Type | Plain meaning | Used by | Legibility |
| --- | --- | --- | --- |
| `settlementIncome` | ±N of a resource per settlement in a scope (all / city incl. capital / colony), optional "per K" step (`laws.ts:156-164`) | 11 Laws, 19 instances (Land Reform, Festival Calendar, Public Works, Forum Rites, Civic Pride, Monumental Code, Census Rolls, Homestead Act, Enfranchise, Pioneer Levy, Rural Bloc) + 3 politician tendencies | 3 |
| `popIncome` | ±N of a resource per pop of a type, optional step (`laws.ts:165-173`) | 2 Laws, 3 instances (Sacred Fields, Manumission Law) + 1 tendency | 2 |
| `popPrimaryIncome` | ±N of the tile's own material per pop of a type; dead on hills (`laws.ts:174-194`) | 1 (Grain Dole) | 1 |
| `flatIncome` | ±N of a resource per turn, player-wide | 2 (Agrarian Tariff, Aqueduct Levy) | 4 |
| `thresholdHappiness` | +A happiness per turn while holding ≥T of a resource, else +B | 1 (Cult of Demeter) | 3 |
| `surplusConversion` | Every P units of X income above floor F pays N of Y, assessed after all other lines (`laws.ts:216-238`) | 1 (Agrarian Tariff) | 1 |
| `actionCostDelta` | ±N of one resource on an action's price; may be narrowed by settlement kind, source pop, or a building list; negative deltas on resources the action doesn't cost are no-ops; clamps at 0 (`laws.ts:287-319`) | 9 Laws, 15 instances (Grain Dole, Manumission, Tenant Rights, Public Works, Guild Charter, Master Builders, Colonial Charter, Manifest Destiny, Land Rush) + 2 tendencies | 3 (1 when narrowed) |
| `actionCostMultiplier` | Whole price ×M, ceil, before deltas (`laws.ts:277-285`) | 1 (Enfranchise the Colonies) | 3 |
| `bankRateStep` | Sell rate needs 1 fewer material AND buy rate costs 1 fewer gold, floor 1, spread preserved (`laws.ts:378-404`) | 1 (Aqueduct Levy) | 1 |
| `yearlyFreeAction` | Once per year the first matching action costs 0 of the named resources (`laws.ts:321-373`) | 2 (Monumental Code, Land Rush) | 2 |
| `onFoundColony` | Rider on founding: grant a pop and/or ±happiness (`laws.ts:407-421`) | 1 (Frontier Spirit) | 4 |

### 1c. Directive effects (`assembly/types.ts:110-122`, resolved `assembly/assembly.ts:870-975`)

One-shot, aimed at one rival chosen by the author.

| Type | Plain meaning | Used by | Legibility |
| --- | --- | --- | --- |
| `resourceDelta` | Rival gains/loses N (materials clamp at 0) | 2 (The Streets Burn, Bread and Circuses) | 5 |
| `resourceFraction` | Rival loses floor(fraction × stock) | 1 (Grain Riot) + tendency | 4 |
| `losePopFromLargest` | Rival's largest settlement loses N pops, slaves first, then freemen, then citizens (`assembly.ts:964-967`) | 1 (The Mob Rises) + tendency | 4 |
| `suppressIncome` | Rival's next income collection is skipped entirely — including food upkeep and slave unhappiness (`actions.ts:314-324`) | 1 (General Strike) | 3 |
| `repealNewestTargetLaw` | The newest standing Law the rival authored is removed (it was table-wide, so it leaves everyone) | 1 (The Stele Is Broken) | 3 |
| `equalVotesNextAssembly` | Rival has 1 base vote at the next Assembly (bribes still allowed) | 1 (Isonomia) | 3 |

### 1d. Table effects (`types.ts:263-271`, resolved `tables.ts:97-201`)

| Type | Plain meaning | Used by | Legibility |
| --- | --- | --- | --- |
| `losePops` | Lose N random pops across all settlements (×2 in a revolt) | Riot rows 1, 2, 3 | 5 |
| `destroyBuilding` | A random building loses one level; no building → lose N pops instead | Riot row 1 | 4 |
| `loseResource` | Lose N of X (clamped); optional "if short, lose a pop" | Riot rows 4, 5 | 5 / 4 |
| `gainResource` | Gain N of X | 12 expedition rows | 5 |
| `gainPop` | +1 pop in a random settlement with room; no room → +N food | Colonists' Voyage row 6 | 4 |
| `yearIncomeModifier` | ±1 of X on every player's income until next spring (`income.ts:327-342`) | 6 omen rows | 4 |
| `none` | Nothing | Riot 6; expedition rows 1–2 ×3 | 5 |

### 1e. The same idea, spelled several ways

| Idea | Spellings |
| --- | --- |
| "gain/lose N of X now" | `resourceDelta` (event), `happinessDelta`, `resourceDelta` (directive), `gainResource`, `loseResource` — 5 names |
| "±N X income for a while" | `incomeModifier` (season), `yearIncomeModifier` (year), `flatIncome` (standing), `timedHappinessDelta` (N turns) — 4 names |
| "N per K of something, min M" | `scaledResourceDelta`, `scaledHappinessDelta`, `resourceDeltaPerPop`, `settlementIncome`+step, `popIncome`+step, `surplusConversion` — 6 names |
| "action costs ±N" | `actionCostDiscount` (turn coupon), `actionCostDelta` (standing), `actionCostMultiplier`, `buildingCostMultiplier` (season), `yearlyFreeAction` (year coupon) — 5 names |
| "add/remove pops" | `addPops`, `gainPop`, `losePops`, `losePopFromLargest` — 4 names |

---

## 2. Per-card table

### 2a. Seasonal deck — 13 kinds, 33 copies (`data.ts:457-693`)

Draw: one card per season, uniform among cards tagged for that season, never reshuffled (`events.ts:143-163`). All effects hit all four players.

| # | id · name · copies | Text | Grammar | Num | Cond | x-or-y | Deriv | Per-pop | Coupon | Timed | Leg | Verdict | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | `season-drought` Drought ×4 (aut/win) | All players get -2 Food income this season. | incomeModifier | 1 | 0 | N | Y | N | N | season | 4 | merge → one "weather" template with Bountiful/Open Markets/Wildfire; or make it a flat "All lose 2 Food" (functionally identical: one income per player per season) | `data.ts:458-476` |
| S2 | `season-bountiful-harvest` Bountiful Harvest ×4 (sum/aut) | All players get +2 Food income this season. | incomeModifier | 1 | 0 | N | Y | N | N | season | 4 | merge with S1 template | `data.ts:477-495` |
| S3 | `season-timber-levies` Timber Levies ×3 (spr/sum/win) | Each player gains 2 Wood per 6 pops, minimum 4 Wood. | scaledResourceDelta | 3 | 2 | N | N | Y | N | N | 3 | simplify → "Each player gains 4 Wood" (scaling is dead below 18 pops, see §7) | `data.ts:496-515` |
| S4 | `season-quarry-contracts` Quarry Contracts ×3 (sum/aut) | Each player gains 2 Stone per 6 pops, minimum 4 Stone. | scaledResourceDelta | 3 | 2 | N | N | Y | N | N | 3 | simplify → "gains 4 Stone"; same template as S3 | `data.ts:516-535` |
| S5 | `season-grain-tithe` Grain Tithe ×3 (spr/aut/win) | Each player gains 2 Food per 6 pops, minimum 4 Food. | scaledResourceDelta | 3 | 2 | N | N | Y | N | N | 3 | simplify → "gains 4 Food"; same template | `data.ts:536-555` |
| S6 | `season-civic-anxiety` Civic Anxiety ×2 (win) | Each player suffers -2 Happiness per 10 pops, minimum -2, during income collection this season. | scaledHappinessDelta (season) | 3 | 3 | N | N | Y | N | season | 2 | simplify → "All players lose 2 Happiness" (scaling dead below 20 pops; the "during income" clause is invisible to the player) | `data.ts:556-575` |
| S7 | `season-festival-games` Festival Games ×2 (spr/sum) | Each player gains 2 Happiness per 10 pops, minimum 2 Happiness. | scaledHappinessDelta (immediate) | 3 | 2 | N | N | Y | N | N | 3 | simplify → "All players gain 2 Happiness"; mirror of S6 | `data.ts:576-594` |
| S8 | `season-scarce-labor` Scarce Labor ×2 (aut/win) | Building costs, excluding colony founding and city upgrades, are doubled this season. | buildingCostMultiplier ×2 | 0 | 1 | N | Y | N | N | season | 3 | keep; reword "Buildings cost double this season" (the exclusion is already implied by "buildings" in rules.md:175-176) | `data.ts:595-612` |
| S9 | `season-skilled-artisans` Skilled Artisans ×2 (spr/sum) | Building costs, excluding colony founding and city upgrades, are halved this season, rounded up. | buildingCostMultiplier ×0.5 | 0 | 2 | N | Y | N | N | season | 3 | keep as S8's mirror; same rewording | `data.ts:613-630` |
| S10 | `season-open-markets` Open Markets ×2 (sum/aut) | All players get +2 Gold income this season. | incomeModifier | 1 | 0 | N | Y | N | N | season | 4 | merge with S1 template | `data.ts:631-649` |
| S11 | `season-plague` Plague ×2 (aut/win) | Every player loses 2 Happiness at the start of each of their next 3 turns. | timedHappinessDelta | 2 | 1 | N | N | N | N | 3 turns | 4 | simplify → one-shot "All players lose 4 Happiness"; total (−6, the deck's harshest card = two civic calms = 12 gold each) is not printed | `data.ts:650-660` |
| S12 | `season-spring-floods` Spring Floods ×2 (spr) | All players lose 3 Food. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | keep — this is the model face for the whole deck | `data.ts:661-673` |
| S13 | `season-wildfire` Wildfire ×2 (sum) | All players get -2 Wood income this season. | incomeModifier | 1 | 0 | N | Y | N | N | season | 4 | merge with S1 template | `data.ts:674-692` |

### 2b. Player deck — 26 kinds, 83 copies (`data.ts:702-1113`)

Draw: one per player per turn, right after income (`actions.ts:322`), reshuffles from discard (`events.ts:128-141`). Cards with no legal resolution are discarded (`events.ts:59-63`); a choice card whose pop option has no room still resolves via the other option (`events.ts:165-171`).

| # | id · name · copies | Text | Grammar | Num | Cond | x-or-y | Deriv | Per-pop | Coupon | Timed | Leg | Value | Verdict | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | `player-new-citizen` New Citizen ×4 | Add 1 citizen to one owned settlement with available capacity. | addPops | 1 | 1 | N | N | N | N | N | 4 | +11 | keep | `data.ts:703-714` |
| P2 | `player-free-settlers` Free Settlers ×4 | Add 1 freeman to one owned settlement with available capacity. | addPops | 1 | 1 | N | N | N | N | N | 4 | +7 | keep | `data.ts:715-726` |
| P3 | `player-captured-laborers` Captured Laborers ×3 | Add 2 slaves to one owned settlement with available capacity. | addPops | 1 | 1 | N | N | N | N | N | 4 | +10 | keep (hidden cost: −0.5 happiness per slave per turn, `ruleset.ts:251`) | `data.ts:727-736` |
| P4 | `player-citizenship-rolls` Citizenship Rolls ×4 | The next citizen grown this turn costs -5 Food and -1 Gold. | actionCostDiscount ×2 | 2 | 1 | N | N | N | Y | turn | 3 | +3 | cut, or convert to flat "Gain 5 Food" (see §7 on the coupon rationale) | `data.ts:737-765` |
| P5 | `player-willing-hands` Willing Hands ×4 | The next freeman grown this turn costs -4 Food. | actionCostDiscount | 1 | 1 | N | N | N | Y | turn | 3 | +2 | cut / convert to flat | `data.ts:766-785` |
| P6 | `player-slave-auction` Slave Auction ×3 | The next slave grown this turn costs -3 Food. | actionCostDiscount | 1 | 1 | N | N | N | Y | turn | 3 | +1.5 | cut — the weakest card in the deck | `data.ts:786-805` |
| P7 | `player-good-stores` Good Stores ×4 | Gain 3 Food. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | +3 | keep | `data.ts:806-815` |
| P8 | `player-timber-windfall` Timber Windfall ×4 | Gain 3 Wood. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | +3 | keep | `data.ts:816-825` |
| P9 | `player-merchant-profit` Merchant Profit ×4 | Gain 3 Gold. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | +3 | keep | `data.ts:826-835` |
| P10 | `player-stone-shipment` Stone Shipment ×4 | Gain 3 Stone. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | +3 | keep | `data.ts:836-845` |
| P11 | `player-local-unrest` Local Unrest ×4 | Lose 2 Happiness. | happinessDelta | 1 | 0 | N | N | N | N | N | 5 | −2 | keep | `data.ts:846-855` |
| P12 | `player-public-calm` Public Calm ×4 | Gain 2 Happiness. | happinessDelta | 1 | 0 | N | N | N | N | N | 5 | +2 | keep | `data.ts:856-865` |
| P13 | `player-civil-discord` Civil Discord ×3 | Lose 2 Happiness at the start of each of your next 3 turns. | timedHappinessDelta | 2 | 1 | N | N | N | N | 3 turns | 4 | −6 | simplify → "Lose 4 Happiness" (merge with P11 at a bigger number) | `data.ts:866-875` |
| P14 | `player-granary-rats` Granary Rats ×5 | Lose 3 Food. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | −3 | keep | `data.ts:876-885` |
| P15 | `player-banditry` Banditry ×3 | Lose 4 Gold. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | −4 | keep | `data.ts:886-895` |
| P16 | `player-warehouse-fire` Warehouse Fire ×4 | Lose 5 Wood. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | −5 | keep | `data.ts:896-905` |
| P17 | `player-quarry-collapse` Quarry Collapse ×2 | Lose 3 Stone and 1 Happiness. | resourceDelta + happinessDelta | 2 | 0 | N | N | N | N | N | 5 | −4 | simplify → "Lose 3 Stone" (one number, same template as P14–P16) | `data.ts:906-918` |
| P18 | `player-patronage-network` Patronage Network ×3 | Gain 3 Influence. | resourceDelta | 1 | 0 | N | N | N | N | N | 5 | +3 | keep | `data.ts:919-928` |
| P19 | `player-emergency-labor` Emergency Labor ×3 | Gain 6 Wood and lose 1 Happiness, or gain 2 Wood with no penalty. | choice[resourceDelta+happinessDelta \| resourceDelta] | 3 | 1 | Y | N | N | N | N | 4 | +5 | simplify → "Gain 6 Wood, lose 1 Happiness" (safe option is a 2-point consolation, §3) | `data.ts:929-949` |
| P20 | `player-granary-surplus` Granary Surplus ×3 | Gain 4 Food, or add 1 freeman to a settlement with available capacity. | choice[resourceDelta \| addPops] | 2 | 2 | Y | N | N | N | N | 4 | +7 | fake choice → merge into Free Settlers (P2) | `data.ts:950-967` |
| P21 | `player-civic-petition` Civic Petition ×3 | Gain 2 Influence, or gain 2 Happiness. | choice[resourceDelta \| happinessDelta] | 2 | 1 | Y | N | N | N | N | 5 | +2 | real but trivial (par) → split copies into P12 / P18 | `data.ts:968-985` |
| P22 | `player-skilled-mason` Skilled Mason ×2 | Gain 4 Stone, or the next building built this turn costs -5 Stone. | choice[resourceDelta \| actionCostDiscount] | 2 | 2 | Y | N | N | Y | turn | 3 | +4 | disguised conditional → "Gain 4 Stone" (merge into P10) | `data.ts:986-1012` |
| P23 | `player-caravan-contacts` Caravan Contacts ×2 | Gain 4 Gold, or exchange up to 4 Wood for 6 Gold. | choice[resourceDelta \| resourceExchange] | 3 | 2 | Y | N | N | N | N | 3 | +4 | near-fake (B dominates with ≥4 spare wood) → pick one face | `data.ts:1013-1030` |
| P24 | `player-forest-crews` Forest Crews ×2 | Gain 4 Wood, or the next colony founded this turn costs -6 Wood. | choice[resourceDelta \| actionCostDiscount] | 2 | 2 | Y | N | N | Y | turn | 3 | +4 | disguised conditional → "Gain 4 Wood" (merge into P8) | `data.ts:1031-1057` |
| P25 | `player-temple-donation` Temple Donation ×1 | Gain 3 Happiness, or the next Temple built this turn costs -5 Stone. | choice[happinessDelta \| actionCostDiscount(buildingId)] | 2 | 2 | Y | N | N | Y | turn | 3 | +3 | cut (1 copy; happiness dominates) or "Gain 3 Happiness" | `data.ts:1058-1085` |
| P26 | `player-market-day` Market Day ×1 | Gain 3 Gold, or gain 1 Gold per freeman, minimum 2 Gold. | choice[resourceDelta \| resourceDeltaPerPop] | 3 | 3 | Y | N | Y | N | N | 3 | +3 | cut (1 copy; it is max(3, freemen) wearing a choice) | `data.ts:1086-1112` |

### 2c. Assembly — Laws, 24 kinds, 1 copy each (`assembly/deck.ts:76-393`)

Every Law is standing until repealed, unique on the board, and binds all four players (`laws.ts:24-26`). Passing one also pays the author the politician's prize (Demosthenes 5 food, Perdiccas 3 stone, Kleistophenes 4 wood, `ruleset.ts:301-306`). "Timed" is therefore "standing" for all 24; the column is omitted. Design intent: every Law is "−x, but +y" (`assembly-politicians.md:126`, `deck.ts:9-12`).

| # | id · name | Text | Grammar | Num | Cond | x-or-y | Deriv | Per-count | Coupon | Leg | Verdict | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | `grain-dole` Grain Dole | Promotions cost 1 less food, but slaves produce 1 less. | actionCostDelta(promotePop, food −1) + popPrimaryIncome(slaves −1) | 2 | 1 | N | Y | per slave | N | 1 | cut or rewrite. "Promotions cost food" is only true of slave→freeman (4 food); freeman→citizen costs gold, so the discount silently skips it (`laws.ts:309-316`). "Slaves produce 1 less" zeroes slave output (base is +1, `ruleset.ts:251`) and only on yielding tiles — say "slaves produce nothing". | `deck.ts:77-88` |
| L2 | `land-reform` Land Reform | Every settlement yields 1 more food, but cities yield 1 less gold. | settlementIncome(all food +1) + settlementIncome(city gold −1) | 2 | 1 | N | Y | per settlement / per city | N | 2 | template — same shape as L5, L11, L12, L15, L17, L21 (`+1 X per scope, −1 Y per scope`) | `deck.ts:89-100` |
| L3 | `sacred-fields` Sacred Fields | Each citizen yields 1 more food, but every 3 citizens cost 1 happiness. | popIncome(citizens food +1) + popIncome(citizens happiness −1, step 3) | 3 | 2 | N | Y | per citizen, per 3 citizens | N | 2 | simplify — drop the /3 step (floor makes 1–2 citizens free, 3–5 cost 1) | `deck.ts:101-112` |
| L4 | `manumission-law` Manumission Law | Freeing a slave costs 2 less food, but every 2 slaves cost 1 happiness. | actionCostDelta(promotePop, pop slaves, food −2) + popIncome(slaves happiness −1, step 2) | 3 | 2 | N | Y | per 2 slaves | N | 2 | simplify — "freeing" = promote slave→freeman (4 food → 2); the downside doubles the existing −0.5/slave, which is invisible on the card | `deck.ts:113-130` |
| L5 | `festival-calendar` Festival Calendar | Every settlement gains 1 happiness, but loses 1 gold income. | settlementIncome(all happiness +1) + settlementIncome(all gold −1) | 2 | 1 | N | Y | per settlement | N | 3 | template (L2 family) | `deck.ts:131-142` |
| L6 | `agrarian-tariff` Agrarian Tariff | Every 2 food gathered above 10 a turn pays 1 gold, but wood income drops 1. | surplusConversion(food >10, per 2 → gold 1) + flatIncome(wood −1) | 4 | 3 | N | Y | per 2 surplus food | N | 1 | cut or rewrite. The "food gathered" figure is the full income sum after every other Law (`laws.ts:216-238`) — a player cannot read it off the card or the board. | `deck.ts:143-154` |
| L7 | `tenant-rights` Tenant Rights | Growing a pop costs 3 less food, but 2 more gold. | actionCostDelta(growPop food −3) + actionCostDelta(growPop gold +2) | 2 | 1 | N | Y | N | N | 3 | keep as the model cost-Law; note +2 gold lands on slaves and freemen which cost no gold today (`laws.ts:312-318`) | `deck.ts:155-166` |
| L8 | `cult-of-demeter` Cult of Demeter | Hold 15 or more food for 2 happiness; fall below it and lose 2. | thresholdHappiness(food ≥15: +2 / −2) | 3 | 2 | N | N | N | N | 3 | keep as the one threshold card; add "each turn" (it is an income line, `laws.ts:202-210`); swing is 4/turn | `deck.ts:167-177` |
| L9 | `public-works` Public Works | Buildings cost 3 less wood and stone, but every city costs 1 happiness. | actionCostDelta(build wood −3) + actionCostDelta(build stone −3) + settlementIncome(city happiness −1) | 2 | 1 | N | Y | per city | N | 3 | keep; downside stem shared with L15, L19 | `deck.ts:182-194` |
| L10 | `guild-charter` Guild Charter | Growing a pop costs 3 less food in cities, but 2 more in colonies. | actionCostDelta(growPop city food −3) + actionCostDelta(growPop colony food +2) | 2 | 2 | N | Y | N | N | 3 | keep or merge with L22 (same tall-vs-wide axis) | `deck.ts:195-206` |
| L11 | `forum-rites` Forum Rites | Every city yields 1 more influence, but 1 less food. | settlementIncome(city influence +1) + settlementIncome(city food −1) | 2 | 1 | N | Y | per city | N | 3 | template (L2 family) | `deck.ts:207-218` |
| L12 | `civic-pride` Civic Pride | Every city gains 1 happiness, but every colony loses 1. | settlementIncome(city happiness +1) + settlementIncome(colony happiness −1) | 2 | 1 | N | Y | per city / colony | N | 3 | template (L2 family) | `deck.ts:219-230` |
| L13 | `aqueduct-levy` Aqueduct Levy | The stone bank rate improves one step, but wood income drops 1. | bankRateStep(stone +1) + flatIncome(wood −1) | 2 | 1 | N | Y | N | N | 1 | rewrite with explicit rates or cut. "One step" = stone sells 3→2 for a gold AND buys 2→1 gold each (`laws.ts:396-403`) — stone becomes half price, which the card does not say. | `deck.ts:231-242` |
| L14 | `monumental-code` Monumental Code | Your first building each year costs no wood, but every colony loses 1 wood income. | yearlyFreeAction(build, wood) + settlementIncome(colony wood −1) | 1 | 2 | N | Y | per colony | Y (yearly) | 2 | simplify (coupon → flat "buildings cost N less wood") or cut | `deck.ts:243-254` |
| L15 | `census-rolls` Census Rolls | Every city yields 1 more gold, but costs 1 happiness. | settlementIncome(city gold +1) + settlementIncome(city happiness −1) | 2 | 1 | N | Y | per city | N | 3 | template (L2 family); downside identical to L9/L19, upside is L2's downside inverted | `deck.ts:255-266` |
| L16 | `master-builders` Master Builders | Civic buildings cost 4 less stone, but founding a colony costs 5 more wood. | actionCostDelta(build, buildingIds [temple, forum, aqueduct, odeon, gymnasion], stone −4) + actionCostDelta(foundColony wood +5) | 2 | 2 | N | Y | N | N | 1 | simplify → "Buildings cost 4 less stone" (the class list lives only in `deck.ts:280`; Granary and Port cost stone but are excluded) | `deck.ts:267-286` |
| L17 | `homestead-act` Homestead Act | Every colony yields 1 more wood, but cities yield 1 less gold. | settlementIncome(colony wood +1) + settlementIncome(city gold −1) | 2 | 1 | N | Y | per colony / city | N | 3 | template (L2 family); downside = L2's | `deck.ts:291-302` |
| L18 | `colonial-charter` Colonial Charter | Founding a colony costs 10 less wood, but upgrading one costs 10 more. | actionCostDelta(foundColony wood −10) + actionCostDelta(upgrade wood +10) | 2 | 1 | N | Y | N | N | 4 | keep — the clearest Law: two known prices, big numbers | `deck.ts:303-314` |
| L19 | `enfranchise-the-colonies` Enfranchise the Colonies | Upgrading a colony to a city costs half, but every city costs 1 happiness. | actionCostMultiplier(upgrade ×0.5) + settlementIncome(city happiness −1) | 1 | 2 | N | Y | per city | N | 3 | simplify → state the halved price (30w/10s/5f → 15/5/3 by ceil, `laws.ts:282`); downside stem = L9/L15 | `deck.ts:315-330` |
| L20 | `frontier-spirit` Frontier Spirit | Founding a colony grants a freeman, but costs 2 happiness. | onFoundColony(freemen, happiness −2) | 1 | 1 | N | N | N | N | 4 | keep — an event rider, self-contained | `deck.ts:331-339` |
| L21 | `pioneer-levy` Pioneer Levy | Every colony yields 1 more food, but every city 1 less. | settlementIncome(colony food +1) + settlementIncome(city food −1) | 2 | 1 | N | Y | per colony / city | N | 3 | template (L2 family) | `deck.ts:340-351` |
| L22 | `manifest-destiny` Manifest Destiny | Founding a colony costs 5 less food, but growing a pop in a city costs 1 more. | actionCostDelta(foundColony food −5) + actionCostDelta(growPop city food +1) | 2 | 2 | N | Y | N | N | 2 | cut or reprice. Founding costs 2 food (`data.ts:42-45`), so "−5" clamps to 0 (`laws.ts:318`): the upside is worth 2, the same no-op trap the file already documents for Land Rush (`deck.ts:368-372`). | `deck.ts:352-363` |
| L23 | `land-rush` Land Rush | Your first colony each year is founded free of wood, but buildings cost 2 more. | yearlyFreeAction(foundColony, wood) + actionCostDelta(build wood +2) | 1 | 2 | N | Y | N | Y (yearly) | 2 | simplify → a flat found-colony discount, which then overlaps L18 → merge or cut | `deck.ts:364-380` |
| L24 | `rural-bloc` Rural Bloc | Every 2 colonies yield 1 influence, but every city loses 1. | settlementIncome(colony influence +1, step 2) + settlementIncome(city influence −1) | 3 | 2 | N | Y | per 2 colonies / per city | N | 2 | simplify — drop the step; the capital counts as a city, so every player starts at −1 and needs 2 colonies to reach 0 | `deck.ts:381-392` |

Also shown to players before any card is drawn: each politician's **tendency** line (`deck.ts:19-68`), two typed effects apiece rendered through the same presenters — Demosthenes (+1 food/settlement, −1 happiness per 3 citizens), Perdiccas (buildings −3 stone, −1 happiness/colony), Kleistophenes (found −10 wood, −1 gold/city), Stratokles (lose half food, lose a pop from largest). Four more faces in the same grammars.

### 2d. Assembly — Directives, 7 kinds, 1 copy each (`assembly/deck.ts:399-466`)

All "Choose a rival": the author names one rival before sealing (`assembly/types.ts:108-109`). Not an x-or-y choice; a targeting choice. Passing one pays the author +2 happiness (`ruleset.ts:305`). Note the design document specified table-wide, untargeted Directives (`assembly-politicians.md:155-158, 399-411`); the shipped deck is rival-targeted (`docs/roadmap.md:118`).

| # | id · name | Text | Grammar | Num | Cond | x-or-y | Deriv | Per-count | Coupon | Timed | Leg | Verdict | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | `grain-riot` Grain Riot | Choose a rival. They lose half their stored food, rounded down. | resourceFraction(food 0.5) | 0 | 1 | target | N | proportional to stock | N | N | 4 | keep, or flatten to "lose 6 food" (= riot row 4) | `deck.ts:400-408` |
| D2 | `the-streets-burn` The Streets Burn | Choose a rival. They lose 3 happiness. | resourceDelta(happiness −3) | 1 | 0 | target | N | N | N | N | 5 | keep | `deck.ts:409-417` |
| D3 | `general-strike` General Strike | Choose a rival. They collect no income on their next turn. | suppressIncome(1) | 0 | 1 | target | N | N | N | next turn | 3 | keep; note it also skips food upkeep and slave unhappiness (`actions.ts:317-324`), so it helps a rival in food deficit | `deck.ts:418-426` |
| D4 | `the-mob-rises` The Mob Rises | Choose a rival. They lose a pop from their largest settlement. | losePopFromLargest(1) | 0 | 1 | target | N | N | N | N | 4 | keep; say "a slave first" (`assembly.ts:964-967`) | `deck.ts:427-435` |
| D5 | `bread-and-circuses` Bread and Circuses | Choose a rival. They gain 3 happiness and lose 5 gold. | resourceDelta(happiness +3) + resourceDelta(gold −5) | 2 | 0 | target | N | N | N | N | 4 | cut or invert. As a "punishment" it sells the rival a civic calm for 5 gold when the action costs 6 (`ruleset.ts:286`): net-positive for the target. Name collides with the civic-calm action (`civic.ts:55-56`, `rules.md:125-127`). | `deck.ts:436-447` |
| D6 | `the-stele-is-broken` The Stele Is Broken | Choose a rival. Their newest standing Law is torn down; if none stands, nothing happens. | repealNewestTargetLaw | 0 | 2 | target | N | N | N | N | 3 | keep; reword — the Law was table-wide, so "their" Law also bound you (`assembly.ts:902-922`) | `deck.ts:448-456` |
| D7 | `isonomia` Isonomia | Choose a rival. At the next Assembly they have exactly 1 base vote. | equalVotesNextAssembly | 1 | 1 | target | N | N | N | next Assembly | 3 | keep; "base" vs bought votes needs the bribe rule (`rules.md:309-311`) | `deck.ts:457-465` |

### 2e. Tables

**Riot** (`data.ts:98-132`, rolled `riot.ts:126-158`). Triggered at effective happiness ≤ −5 (unrest) or ≤ −10 (revolt: −2 to the roll, pop losses ×2, happiness reset to −4; `ruleset.ts:259-268`, `unrest.ts:65-70`). Pops lost are random across all settlements (`tables.ts:228-271`).

| Roll | Label | Text (rules.md:242-250) | Grammar | Num | Cond | Leg | Verdict | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | The mob torches the works | lose 1 pop and a building (no building? lose 2 pops) | losePops(1) + destroyBuilding(fallback 1) | 2 | 1 | 4 | keep | `data.ts:103-110` |
| 2 | Revolt spreads | lose 2 pops | losePops(2) | 1 | 0 | 5 | keep | `data.ts:111` |
| 3 | Blood in the streets | lose 1 pop | losePops(1) | 1 | 0 | 5 | keep | `data.ts:112` |
| 4 | Granary sacked | lose 6 food | loseResource(food 6) | 1 | 0 | 5 | keep | `data.ts:113-117` |
| 5 | Bribe demanded | lose 6 gold (lose 1 pop if you can't pay in full) | loseResource(gold 6, popLossIfShort 1) | 2 | 1 | 4 | keep | `data.ts:118-122` |
| 6 | The mob disperses | no loss | none | 0 | 0 | 5 | keep | `data.ts:123` |
| ins. | Bread dole | 4 food → +1 to the roll | insurance | 2 | 0 | 5 | keep | `data.ts:128` |
| ins. | Concession | demote one pop (free) → +1 | insurance (demotesPop) | 1 | 1 | 4 | keep | `data.ts:129` |
| ins. | Patronage | 3 influence → +1 | insurance | 2 | 0 | 5 | keep | `data.ts:130` |

**Expeditions** (`data.ts:137-228`; stake 5 gold or 8 wood, `data.ts:232-235`; once per turn). All three share one shape: 1–2 nothing, 3–4 small, 5–6 big.

| Table · roll | Label | Effect | Grammar | Num | Leg | Verdict | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Merchant Convoy 1 | Lost at sea | nothing | none | 0 | 5 | keep | `data.ts:143` |
| Merchant Convoy 2 | Pirates take the cargo | nothing | none | 0 | 5 | keep | `data.ts:144` |
| Merchant Convoy 3–4 | Modest profits | +5 gold | gainResource | 1 | 5 | keep | `data.ts:145-154` |
| Merchant Convoy 5–6 | Rich cargo returns | +9 gold | gainResource | 1 | 5 | keep | `data.ts:155-164` |
| Grand Embassy 1–2 | Rebuffed at court | nothing | none | 0 | 5 | keep | `data.ts:172-173` |
| Grand Embassy 3–4 | A polite hearing | +3 influence | gainResource | 1 | 5 | keep | `data.ts:174-183` |
| Grand Embassy 5–6 | An alliance of guest-friendship | +6 influence | gainResource | 1 | 5 | keep | `data.ts:184-193` |
| Colonists' Voyage 1–2 | Storms scatter the ships | nothing | none | 0 | 5 | keep | `data.ts:201-202` |
| Colonists' Voyage 3–4 | Provisions salvaged | +5 food | gainResource | 1 | 5 | keep | `data.ts:203-212` |
| Colonists' Voyage 5 | A bountiful landfall | +8 food | gainResource | 1 | 5 | keep | `data.ts:213-217` |
| Colonists' Voyage 6 | Settlers arrive | +1 freeman in a settlement with room (else +2 food), +2 food | gainPop(fallback 2) + gainResource | 2 | 4 | keep — the deliberate jackpot (`data.ts:135-136`) | `data.ts:218-225` |

**Yearly omen** (`data.ts:241-279`; rolled each spring by the opener, `tables.ts:208-217`; ±1 on every player's income for four seasons). All six rows are one template: ±1 of one resource per income, all year.

| Roll | Label | Effect | Grammar | Num | Timed | Deriv | Leg | Verdict | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Lean kine | −1 food income all year | yearIncomeModifier | 1 | year | Y | 4 | template — same idea as Drought at ¼ the rate for 4× the duration | `data.ts:248-252` |
| 2 | Silent mines | −1 gold income | yearIncomeModifier | 1 | year | Y | 4 | template | `data.ts:253-257` |
| 3 | Blighted groves | −1 wood income | yearIncomeModifier | 1 | year | Y | 4 | template | `data.ts:258-262` |
| 4 | Kind rains | +1 food income | yearIncomeModifier | 1 | year | Y | 4 | template | `data.ts:263-267` |
| 5 | Rich seams | +1 stone income | yearIncomeModifier | 1 | year | Y | 4 | template | `data.ts:268-272` |
| 6 | A golden age | +1 gold income | yearIncomeModifier | 1 | year | Y | 4 | template | `data.ts:273-277` |

---

## 3. Fake and near-fake choices

Eight player cards carry an "x or y" (17 of 83 copies, 20.5% of draws). The deck test's dominance guard (`deck.test.ts:87-107`) only rejects an option worth less than one third of the best, so a 2-vs-5 pair passes. Evaluated at the moment of drawing, with the classic bank and civic-calm prices from §0:

| Card | Option A | Option B | Which dominates, when | Real decision? |
| --- | --- | --- | --- | --- |
| P19 Emergency Labor ×3 | 6 wood, −1 happiness | 2 wood | A unless happiness is within 1 of a threshold (−5 riot line, +10 Beloved) — 1 happiness ≈ 2 gold, 4 extra wood ≈ 1 gold at the bank, but wood's use value (20 per colony) makes A the pick in practice. B is chosen only under threshold pressure. | Narrow. A disguised conditional: "if you are at the riot line, take 2 wood". |
| P20 Granary Surplus ×3 | 4 food | 1 freeman (needs room) | B always when any settlement has room: a freeman is worth 7 food at grow price, dodges the once-per-settlement grow throttle, and pays +2 gold −1 food every turn after. A is chosen only when every settlement is full — and in that case the engine already removes B (`events.ts:165-171`), so the player never chooses A voluntarily. | No. Disguised conditional: "Free Settlers, or 4 food if you are full". |
| P21 Civic Petition ×3 | 2 influence | 2 happiness | Par in the valuation; real need decides (influence for Assembly draws at 3 each, happiness for the riot line). Neither dominates. | Yes, but the thinnest possible one — two currencies at 1:1. A flat card in either currency loses nothing a player would notice. |
| P22 Skilled Mason ×2 | 4 stone | next building this turn −5 stone | B beats A by exactly 1 stone, and only if this turn's build costs ≥5 stone (Temple 6, Odeon 8, Aqueduct 12, Gymnasion 12, Port 5; Forum saves only 4, Granary 2 — `data.ts:287-378`) and is affordable and legal now. Otherwise A. | No. A +1 upside behind a hard constraint: "gain 4 stone (5 if building a stone building right now)". |
| P23 Caravan Contacts ×2 | 4 gold | up to 4 wood → 6 gold | B whenever ≥4 wood is spare: it nets +6 gold −4 wood, and 4 wood sells for 1 gold, so B ≈ +5 gold vs A = +4. Players start with 20 wood. A only when wood is earmarked to the unit (a colony this turn). Short-stocked B floors the payout (`events.ts:312-313`, tested `deck.test.ts:202-220`). | Near-fake. B is the default; A is the fallback when wood-tight. |
| P24 Forest Crews ×2 | 4 wood | next colony this turn −6 wood | B beats A by 2 wood, only if founding this turn (20 wood + 2 food + a legal tile in hand). Otherwise A. | No. Disguised conditional: "gain 4 wood (6 if founding right now)". |
| P25 Temple Donation ×1 | 3 happiness | next Temple this turn −5 stone | A: 3 happiness ≈ 6 gold of civic calm; 5 stone ≈ 1.7 gold at the bank and only if a Temple is built now. B only if the player was about to build a Temple and is short exactly 5 stone. | No. Happiness dominates. |
| P26 Market Day ×1 | 3 gold | 1 gold per freeman, min 2 | B iff freemen ≥ 3; the count is on the board. There is nothing to weigh. | No. It is `max(3, freemen)` printed as a choice. |

Summary: 1 real-but-trivial decision (P21), 2 narrow decisions where one option is the default and the other a fallback (P19, P23), 5 disguised conditionals whose "choice" is fixed by a board count or by whether a specific action is happening this turn (P20, P22, P24, P25, P26).

Laws are not x-or-y, but every one is a bundled "+x, but −y" (§2c). Directives are all "choose a rival" — a targeting choice with no effect variation.

---

## 4. Derivative effects

Cards whose effect is a ±1..±3 delta on a term of the income sum or of an action price, standing or season-long:

**Seasonal (6 kinds, 16 copies):** Drought −2 food income, Bountiful Harvest +2 food, Open Markets +2 gold, Wildfire −2 wood (`incomeModifier`); Scarce Labor ×2 and Skilled Artisans ×0.5 on building prices.

**Omen (6 rows):** ±1 of one resource on every income for four seasons — ±4 per player per year.

**Laws (22 of 24):** L1 Grain Dole (promotion −1 food; slaves −1 primary), L2 Land Reform (+1 food/settlement, −1 gold/city), L3 Sacred Fields (+1 food/citizen, −1 happiness per 3 citizens), L4 Manumission (−2 food on slave promotion, −1 happiness per 2 slaves), L5 Festival Calendar (+1 happiness/settlement, −1 gold/settlement), L6 Agrarian Tariff (+1 gold per 2 food above 10, −1 wood), L7 Tenant Rights (grow −3 food +2 gold), L9 Public Works (build −3 wood −3 stone, −1 happiness/city), L10 Guild Charter (grow −3 food in cities, +2 in colonies), L11 Forum Rites (+1 influence/city, −1 food/city), L12 Civic Pride (+1 happiness/city, −1/colony), L13 Aqueduct Levy (stone bank one step, −1 wood), L14 Monumental Code (yearly free build wood, −1 wood/colony), L15 Census Rolls (+1 gold/city, −1 happiness/city), L16 Master Builders (civic −4 stone, found +5 wood), L17 Homestead Act (+1 wood/colony, −1 gold/city), L18 Colonial Charter (found −10 wood, upgrade +10), L19 Enfranchise (upgrade ×0.5, −1 happiness/city), L21 Pioneer Levy (+1 food/colony, −1 food/city), L22 Manifest Destiny (found −5 food [worth 2], grow +1 food in cities), L23 Land Rush (yearly free colony wood, build +2 wood), L24 Rural Bloc (+1 influence per 2 colonies, −1 influence/city). Only L8 Cult of Demeter (a threshold) and L20 Frontier Spirit (a rider) are not derivative.

**One-shot cost deltas (coupons, listed separately in §5):** P4, P5, P6, and the B options of P22, P24, P25.

**Why they are hard for a player to evaluate.** A player's food income is already a sum of: tile yield (halved on a shared colony tile) + citizens × −2 + freemen × −1 + slaves × −1 + Granary lines + the seasonal modifier + the omen + every standing Law line + the food-shortage happiness pressure, and the happiness income adds slave pressure, over-capacity pressure, Temple/Odeon lines and the food-stockpile bonus (`income.ts:129-280`). A Law line like "+1 food per settlement, −1 gold per city" asks the player to (a) count settlements and cities for themselves, knowing the capital counts as a city (`laws.ts:29-37`); (b) do the same for three rivals, because the Law binds the whole table and its value is relative — Land Reform is a gift to whoever has the most settlements; (c) project both counts over an unbounded life (until repealed, up to 6 Laws standing, `ruleset.ts:298`); (d) net two currencies against each other. Several also carry clamps that change the printed number: Manifest Destiny's −5 on a 2-food cost is worth 2; Grain Dole's promotion discount touches only the slave→freeman rung; Grain Dole's "1 less" zeroes slave output; Aqueduct Levy's "one step" halves stone's buy price; Tenant Rights' +2 gold creates a gold cost on pops that had none. The Assembly gives the player one card, drawn for 3 influence, evaluated once, with no income preview of the proposed Law — so every vote is a projection of a 7-term sum across four players over an unknown horizon. That is what "hard to evaluate" means here: not that the numbers are large, but that the card gives the player none of the inputs.

---

## 5. Luck profile

### 5a. Player deck (83 copies, one draw per player per turn)

Valuation per §0, recomputed from `data.ts` and matching the report (`2026-07-13-deck-overhaul-ab.md:24-25`) and the test bands (`deck.test.ts:65-85`):

| Statistic | Value |
| --- | --- |
| EV per draw | **+2.20** resource-equivalents (test band 1.7–2.5) |
| Variance / SD per draw | 18.3 / **4.28** |
| Range | −6 (Civil Discord) to +11 (New Citizen) |
| Harmful copies | 21/83 = **25.3%** (test band 22–28%): Local Unrest 4, Civil Discord 3, Granary Rats 5, Banditry 3, Warehouse Fire 4, Quarry Collapse 2 |
| Choice copies | 17/83 = **20.5%** (8 kinds) |
| Pure coupon copies | 11/83 = **13.3%** (3 kinds); any coupon on the face: 16/83 = 19.3% |
| Free-pop copies | 11/83 = 13.3% (+3 Granary Surplus with a pop option = 16.9%) |
| Timed copies | 3/83 = 3.6% |
| Flat ±N copies | 41/83 = 49.4% |

Over a four-season year each player draws ~4: expected +8.8, SD 8.6; the gap between two players' yearly draw luck has SD ≈ 12 resource-equivalents — half a colony (22 wood+food) of pure variance per year. The two free-pop windfalls (New Citizen +11, Captured Laborers +10) are the deck's whole upper tail; without them the EV drops to ~+1.1.

Per-kind values (count × value): New Citizen 4×11, Free Settlers 4×7, Captured Laborers 3×10, Citizenship Rolls 4×3, Willing Hands 4×2, Slave Auction 3×1.5, Good Stores/Timber/Merchant/Stone 4×3 each, Local Unrest 4×−2, Public Calm 4×2, Civil Discord 3×−6, Granary Rats 5×−3, Banditry 3×−4, Warehouse Fire 4×−5, Quarry Collapse 2×−4, Patronage 3×3, Emergency Labor 3×5, Granary Surplus 3×7, Civic Petition 3×2, Skilled Mason 2×4, Caravan 2×4, Forest Crews 2×4, Temple Donation 1×3, Market Day 1×3.

### 5b. Seasonal deck (33 copies, one per season, never reshuffled = 8.25-year clock)

Pools are the copies tagged for each season (`data.ts` `seasons` fields; draw rule `events.ts:150-163`); a card in two pools is drawn from whichever season comes first. Harm per `deck.test.ts:113-123`.

| Season | Pool | Harm | Cards |
| --- | --- | --- | --- |
| Spring | 12 | 2 (17%) | Timber Levies 3, Grain Tithe 3, Festival Games 2, Skilled Artisans 2, **Spring Floods 2** |
| Summer | 18 | 2 (11%) | Bountiful Harvest 4, Timber Levies 3, Quarry Contracts 3, Festival Games 2, Skilled Artisans 2, Open Markets 2, **Wildfire 2** |
| Autumn | 20 | 8 (40%) | **Drought 4**, Bountiful Harvest 4, Quarry Contracts 3, Grain Tithe 3, **Scarce Labor 2**, Open Markets 2, **Plague 2** |
| Winter | 16 | 10 (63%) | **Drought 4**, Timber Levies 3, Grain Tithe 3, **Civic Anxiety 2**, **Scarce Labor 2**, **Plague 2** |

Tendency matches `rules.md:139-143`: spring/summer kind, autumn mixed, winter harsh. Magnitudes per player: the three "per 6 pops" cards pay a flat 4 for any pop count under 18; the two "per 10 pops" cards pay a flat 2 under 20; so in practice every seasonal card is a flat ±2..±4 of one resource, except Plague (−6 happiness over three turns, the harshest card in the game for everyone at once) and the two ×2 / ×0.5 building-price cards. Guard: `deck.test.ts:125-134` ("no season is auto-safe").

### 5c. Tables

**Expeditions** (stake 5 gold or 8 wood; EV in units, pop valued at grow cost):

| Table | EV | vs 5 gold | vs 8 wood (units) | vs 8 wood (≈2 gold at 4:1) |
| --- | --- | --- | --- | --- |
| Merchant Convoy | 4.67 gold | −7% | −42% | +133% |
| Grand Embassy | 3.00 influence | −40% | −63% | +50% (no bank price for influence) |
| Colonists' Voyage | 4.50 (with room) / 3.67 (no room) | −10% / −27% | −44% / −54% | +125% / +83% |

The comment "each ~−7% EV in gold-equivalents" (`data.ts:134-136`) holds only for Merchant Convoy against the gold stake. The wood stake is the asymmetry the code names (`data.ts:230-231`): at the classic bank it turns every expedition strongly positive in gold terms.

**Riot table** — expected pops lost per roll, by insurance bought (+1 each, max +3; `riot.ts:110-118`):

| Insurance | Mild, has building & 6 gold | Mild, no building & can't pay | Revolt (−2, ×2), building & gold | Revolt, no building & can't pay |
| --- | --- | --- | --- | --- |
| +0 | 0.67 | 1.00 | 2.00 | 3.00 |
| +1 | 0.50 | 0.67 | 1.67 | 2.67 |
| +2 | 0.17 | 0.33 | 1.33 | 2.00 |
| +3 | 0.00 | 0.17 | 1.00 | 1.33 |

Full mild insurance converts a riot into taxation (4 food + 3 influence + one demotion; then a 1/3 chance of −6 food or −6 gold). A revolt cannot be insured below one expected pop. No test pins the riot or expedition EVs; `deck.test.ts` covers only the two decks.

---

## 6. Redundancy map

Same idea in different units, durations, or decks:

1. **Two things named Bread & Circuses.** The civic-calm action (self: 6 gold → +3 happiness, `civic.ts:55-78`, `rules.md:125-127`) and the Stratokles Directive (rival: +3 happiness, −5 gold, `deck.ts:436-447`). Same name, one is a purchase and the other a "punishment" that is cheaper than the purchase.
2. **Happiness gain faces:** Public Calm +2, Civic Petition option +2, Temple Donation option +3, Festival Games +2 (scaled), Stratokles prize +2, civic calm +3, Bread and Circuses Directive +3 (to a rival), Cult of Demeter +2/turn, Festival Calendar +1/settlement, Civic Pride +1/city — ten spellings of "+happiness".
3. **Happiness loss faces:** Local Unrest −2, Quarry Collapse −1, Emergency Labor −1, Civil Discord −2×3, Plague −2×3 (all), Civic Anxiety −2 (scaled), The Streets Burn −3, Frontier Spirit −2 on found, and the "every city costs 1 happiness" stem in Public Works, Census Rolls, Enfranchise, plus per-pop stems in Sacred Fields and Manumission.
4. **One template, three resources:** Timber Levies / Quarry Contracts / Grain Tithe (2 per 6 pops, min 4).
5. **One template, four resources:** Drought / Bountiful Harvest / Open Markets / Wildfire (±2 X income this season) — and the omen's six rows are the same template at ±1 for a year, and Laws' `flatIncome` (Agrarian Tariff, Aqueduct Levy) at −1 standing. Three type names, three durations, one sentence.
6. **One template, five resources:** Good Stores / Timber Windfall / Merchant Profit / Stone Shipment / Patronage Network (+3 X).
7. **One template, four resources:** Granary Rats −3 / Banditry −4 / Warehouse Fire −5 / Quarry Collapse −3 (+−1 happiness).
8. **Free pops:** New Citizen / Free Settlers / Captured Laborers / Granary Surplus option / Colonists' Voyage 6 / Frontier Spirit rider.
9. **Grow coupons:** Citizenship Rolls / Willing Hands / Slave Auction; and the Law-side coupons Monumental Code / Land Rush (`yearlyFreeAction`) are the same "next matching action is cheaper" device with a year instead of a turn.
10. **"+N, or coupon" pairs:** Skilled Mason / Forest Crews / Temple Donation.
11. **Law income pairs** — one template `+1 X per {all|city|colony}, −1 Y per {all|city|colony}`: Land Reform, Festival Calendar, Forum Rites, Civic Pride, Census Rolls, Homestead Act, Pioneer Levy, Rural Bloc (8 of 24 Laws). Shared stems: "cities yield 1 less gold" (Land Reform, Homestead Act, Kleistophenes tendency), "every city costs 1 happiness" (Public Works, Census Rolls, Enfranchise), "wood income drops 1" (Agrarian Tariff, Aqueduct Levy), "−1 happiness/colony" (Civic Pride, Perdiccas tendency).
12. **Law cost pairs** on the same action: grow-pop (Tenant Rights, Guild Charter, Manifest Destiny), found-colony (Colonial Charter −10, Land Rush free, Manifest Destiny −5→2, Master Builders +5, Kleistophenes tendency −10), build (Public Works −3/−3, Master Builders −4, Land Rush +2, Monumental Code free, Perdiccas tendency −3), promote (Grain Dole −1, Manumission −2, Gymnasion building −2).
13. **Food loss:** Spring Floods −3 (all), Granary Rats −3, riot Granary sacked −6, Grain Riot −half, Drought −2 income.
14. **Gold loss:** Banditry −4, riot Bribe demanded −6, Bread and Circuses −5.
15. **Pop loss:** riot rows 1–3 (random), The Mob Rises (largest settlement, slaves first), starvation (`unrest.ts:80-95`), Bribe-demanded-short.
16. **Three expedition tables** with one shape (0/0/a/a/b/b) differing only in the payout resource.
17. **Scaling spellings:** `scaledResourceDelta`, `scaledHappinessDelta`, `resourceDeltaPerPop` (events) and `settlementIncome`/`popIncome` with `step` (Laws) and `surplusConversion` — six ways to write "per K of something".

---

## 7. Observations

1. **Card faces to learn: 70 cards (13 seasonal + 26 player + 24 Laws + 7 Directives) plus 30 table rows (riot 6, expeditions 18, omen 6), 3 insurance options and 4 politician tendency lines = 107 faces**, across 147 physical copies (33 + 83 + 31). The three expedition tables collapse to 10 distinct outcomes.

2. **36 effect type names (35 unique) for roughly five ideas.** Gain/lose-now has 5 spellings, income-for-a-while 4, per-K scaling 6, action-cost 5, pops 4 (§1e). The remaining 9 are true singletons (exchange, half-stockpile, threshold, bank step, on-found rider, destroy building, strike, repeal, one vote), and 8 of those 9 sit on one card each.

3. **40 of 70 cards score legibility ≤3.** Seasonal 7/13 fail (52% of seasonal copies), player 8/26 fail (19/83 = 23% of draws), Laws 22/24 fail, Directives 3/7 fail. Every table row scores 4+. The two Laws that pass are Colonial Charter (two known prices, ±10) and Frontier Spirit (a rider). The tables are the most legible content in the game and use the fewest grammars.

4. **The per-pop scaling on five seasonal cards is dead for the practical game.** "2 per 6 pops, min 4" first exceeds the minimum at 18 pops; "2 per 10 pops, min 2" at 20. A player starts with 6 pops, the Demos victory minimum is 16 (`ruleset.ts:244`), and the balanced-deck sim's pop mean at season 11 was 9.8 (`2026-07-13-deck-overhaul-ab.md:31`). These five cards (13 copies, 39% of the seasonal deck) print three numbers to deliver one.

5. **Of eight choice cards, one is a real decision and it is at par.** Five are disguised conditionals fixed by a count or by "are you doing X this turn" (Granary Surplus, Skilled Mason, Forest Crews, Temple Donation, Market Day); two are default-plus-fallback (Emergency Labor, Caravan Contacts); Civic Petition is 2-for-2 across currencies. The dominance test (`deck.test.ts:87-107`) is calibrated so that its own model card (2 vs 5) passes.

6. **Coupons are 19% of player draws and 2 of 24 Laws, and the stated reason for them is served by a flat card.** The overhaul report's rationale was to re-couple windfall population to food and capacity (`2026-07-13-deck-overhaul-ab.md:10-14`, `data.ts:695-700`). A flat "+5 food" also couples growth to food and capacity — the coupon adds only an expiry, a pop-type lock, and a 0.5 utilization guess (`deck.test.ts:24`). Slave Auction (+1.5) is the lowest-value card in the deck as a result.

7. **The 24 Laws are built from about six stems.** Eight are the `settlementIncome` pair template; nine are `actionCostDelta` pairs on five actions; three share the exact downside "every city costs 1 happiness"; two share "wood income drops 1"; two share "cities yield 1 less gold". A player who has read Land Reform has read Homestead Act, Pioneer Levy, Forum Rites, Civic Pride and Census Rolls — the same sentence with the nouns swapped.

8. **Three Laws have a half that does not do what it says.** Manifest Destiny's "−5 food" acts on a 2-food price (worth 2) — the identical no-op trap the file already documents and fixed for Land Rush (`deck.ts:368-372`). Grain Dole's "promotions cost 1 less food" only reaches the slave rung (`laws.ts:309-316`) and "slaves produce 1 less" means "slaves produce nothing". Master Builders' "civic buildings" is a five-item list that exists only in code (`deck.ts:280`). Aqueduct Levy's "one step" halves stone's buy price (2→1 gold), a bigger effect than the wording suggests.

9. **Three durations, three type names, one sentence.** "±N X income" exists as a season (`incomeModifier`, 4 cards), a year (`yearIncomeModifier`, 6 omen rows) and standing (`flatIncome`, 2 Laws); plus `timedHappinessDelta` for N turns. A season-long "−2 food income" is exactly one income per player, i.e. a delayed "lose 2 food" — the "income" wording adds a concept without adding an effect.

10. **Directives deviate from their design and one of them is a gift.** The design fixed Directives as table-wide and untargeted (`assembly-politicians.md:155-158, 399-411`); the shipped deck is rival-targeted (`deck.ts:396-398`, `rules.md:315-317`). Bread and Circuses hands the target +3 happiness for 5 gold when the civic-calm action charges 6 for the same +3 — net-positive for the "victim", and it shares its name with that action. The Stele Is Broken targets an author but removes a Law that bound everyone, including the proposer.

11. **Luck is bounded and pinned, but the pop windfalls carry the tail.** Player deck EV +2.20, SD 4.28, 25.3% harm, all guarded by tests; per-year luck gap between two players ≈ SD 12 units. New Citizen and Captured Laborers (7 copies, 8% of draws) are the entire upper tail; the rest of the deck sits in [−6, +7]. Plague is the harshest card in the game (−6 happiness to all) and prints only "−2" and "3".

12. **Smallest grammar set that expresses the current decks.** Four verbs — (a) *gain/lose N X now*; (b) *±N X income for {this season | this year | until repealed}*; (c) *add/remove N pops*; (d) *action A costs ±N* — plus one scaler, *…per {settlement | city | colony | pop of type}*, cover 93 of the 107 faces as they stand (every seasonal card, every flat and pop player card, every Law income pair and cost pair, every table row but three, every omen). The 14 faces outside it are the singletons: Caravan's exchange, Cult of Demeter's threshold, Aqueduct Levy's bank step, Frontier Spirit's rider, Agrarian Tariff's surplus, the two yearly free actions, riot row 1's building, Colonists' 6's pop-with-fallback, Grain Riot's half, General Strike, The Stele Is Broken, Isonomia, and Market Day's per-freeman. Dropping the scaler too (which the dead per-pop thresholds argue for on the seasonal side) leaves four verbs and forces the Laws to be rewritten as flat or as counts the card states outright.
