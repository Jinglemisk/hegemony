# Hegemony engine census — the economy's depth map

Source of truth: the engine on branch `feat/luxury-topology` (HEAD d46ec5f), read 2026-09-05. Paths are relative to `src/game/`. Line numbers are from the files as read; `rules.md` was used only as a cross-check and agrees with the code everywhere it was compared (income coefficients, action prices, riot table, thresholds, Assembly prices, victory minimums).

Depth scale used throughout: **1** = flat add · **2** = depends on a count · **3** = a count capped/floored by another number, or a stockpile divided and capped · **4** = depends on the total of every other term.

---

## 1. Income formula depth map

`calculateIncomeBreakdown` (economy/income.ts:129-280) is the one income entry point. It loops the player's settlements (138-241), then applies four player-level passes in a fixed order: seasonal (243), omen (244), standing Laws (248), food shortage (250-259), food stockpile (261-277). Zero-amount lines are dropped (495-506). Collection then applies the total with `applyResourceDeltaWithFloors` (actions.ts:328) — floors default to `{}` (ruleset.ts:277), so nothing clamps.

Gates that sit *around* the formula: a pending riot defers collection (turn.ts:125-127, 189-191); General Strike zeroes the whole collection and burns a turn of the counter (actions.ts:317-324); the first gameplay income is forgiven food-shortage pressure and starvation (`firstIncomeFoodGrace`, income.ts:290-292, unrest.ts:75).

### 1a. Per-settlement terms, in code order

| # | Term | Formula | Where | Depth | Fraction / rounding |
|---|------|---------|-------|------:|---------------------|
| 1 | Tile yield | `floor(tile.amount × share)`; share = 0.5 only if `kind == colony && tile.settlements.length > 1`, else 1; 0 on hills/oracle (`resource: null`) | settlement.ts:76-87 `settlementTileYield`; income.ts:146-163 | 2 | **0.5 share, floored** — a wood-3 tile shared by two colonies pays 1 + 1 (one unit evaporates) |
| 2 | Citizen influence | `citizens × 1` | income.ts:165-171; coeff ruleset.ts:249 | 2 | — |
| 3 | Citizen gold | `citizens × 2` | income.ts:172-178 | 2 | — |
| 4 | Citizen food upkeep | `citizens × −2` | income.ts:179-185 | 2 | — |
| 5 | Freeman gold | `freemen × 2` | income.ts:186-192; ruleset.ts:250 | 2 | — |
| 6 | Freeman food upkeep | `freemen × −1` | income.ts:193-199 | 2 | — |
| 7 | Slave production | `slaves × 1` into the tile's own material; skipped entirely when the tile has no resource | income.ts:200-208; ruleset.ts:251 | 2 (+ tile gate) | — |
| 8 | Slave food upkeep | `slaves × −1` | income.ts:209-215 | 2 | — |
| 9 | Slave happiness pressure | `slaves × −0.5` | income.ts:216-222; ruleset.ts:251 | 2 | **−0.5 per slave, never rounded** — the stored happiness bank holds half-integers |
| 10 | Over-capacity pressure | `max(0, totalPops − (kind.popCapacity + Σ Aqueduct +4)) × −1` | settlement.ts:19-46 `settlementCapacity`/`settlementOverCapacity`; income.ts:223-231; rate ruleset.ts:255 | 3 | floored at 0 |
| 11a | Flat building income | Granary +2 food, Forum +2 influence, **per copy** | income.ts:419-426; data.ts:317, 328 | 2 (copies × amount) | — |
| 11b | Flat building happiness | Temple +1, Odeon +2, per copy | income.ts:427-434; data.ts:300, 342 | 2 | — |
| 11c | Villa tile bonus | `Σ copies × 2` into the tile's material; paid only when the tile yields | income.ts:444-458; data.ts:357 | 2 (+ tile gate) | not subject to the colony share (colonies cannot build anyway) |
| 11d | Marketplace | `min(freemen, Σ copies × 3) × 2` gold | income.ts:435-437, 460-467; data.ts:292 | **3** | the `amount` is **overwritten, not summed** across copies (income.ts:437): two Marketplaces = 6 supported at +2, never +4 |
| 11e | Temple support | `min(citizens, Σ copies × 2) × 1` influence | income.ts:438-440, 469-479; data.ts:301 | **3** | same overwrite rule (income.ts:440) |
| 11f | Workshop | `min(slaves, Σ copies × 3) × 1` into the tile's material; skipped on yield-less tiles | income.ts:441-443, 483-492; data.ts:309 | **3** (+ tile gate) | same overwrite rule (income.ts:443) |

`settlementNetYield` (income.ts:94-123) is the per-settlement mirror used by the settlement card. It reuses terms 1-11 but by construction cannot show any player-level term below.

### 1b. Per-player terms, in code order

| # | Term | Formula | Where | Depth | Fraction / rounding |
|---|------|---------|-------|------:|---------------------|
| 12 | Seasonal income modifier | flat ±2 of one resource while the season card stands (Drought −2 food, Bountiful +2 food, Open Markets +2 gold, Wildfire −2 wood); scope `allPlayers` on every authored card | income.ts:344-368; data.ts:459-495, 632-692 | 1 | applies at **each** of the four players' collections that season |
| 13 | Seasonal scaled happiness (Civic Anxiety only) | `floor(totalPops / 10) × −2`, magnitude floored at 2 with the sign kept | income.ts:369-386 → settlement.ts:193-205 `scaledByPops`; data.ts:557-575 | 3 | floor, then a signed minimum clamp |
| 14 | Yearly omen | flat ±1 of one resource for the whole year, all players | income.ts:327-342; tables.ts:208-217; data.ts:241-279 | 1 | — |
| 15a | Law `settlementIncome` | `floor(settlementsInScope / step) × amount`; scope `city` = every non-colony (capital included) | assembly/laws.ts:31-37, 82-100, 121-124, 156-164 | 2 (3 with `step`: Rural Bloc, per 2 colonies) | floor |
| 15b | Law `popIncome` | `floor(popsOfType / step) × amount` | laws.ts:103-117, 165-173 | 2 (3 with step: Sacred Fields per 3 citizens, Manumission per 2 slaves) | floor |
| 15c | Law `popPrimaryIncome` (Grain Dole) | per settlement: `slaves × −1` into the tile's material; skipped on yield-less tiles | laws.ts:174-194 | 2 (+ tile gate) | not clamped — it can cancel term 7 while term 11f still pays |
| 15d | Law `flatIncome` | flat (Agrarian Tariff −1 wood, Aqueduct Levy −1 wood) | laws.ts:195-201 | 1 | — |
| 15e | Law `thresholdHappiness` (Cult of Demeter) | `stored food ≥ 15 ? +2 : −2` — reads the **stockpile**, not income | laws.ts:202-210 | 2 | — |
| 15f | Law `surplusConversion` (Agrarian Tariff) | runs last over `baseIncome + every Law line above`: `floor((projected.food − 10) / 2) × 1 gold` if positive | laws.ts:216-238 | **4** | floor; **the deepest term in the economy** — it is a function of the sum of terms 1-15e |
| 16 | Food-shortage pressure | `projected = stored food + income.food`; if `< 0`, happiness += projected (the whole negative balance); suppressed by first-income grace | income.ts:250-259, 282-303 | 3 | **unbounded**; and because food has no floor, a negative balance is re-charged every turn (see §7) |
| 17 | Food-stockpile calm | `min(floor(stored food / 5), 2)` if > 0; reads the **pre-income** stockpile | income.ts:261-277; ruleset.ts:256-257 | 3 | floor + cap |

Not in the income formula but read against it:

| Term | Formula | Where | Depth |
|------|---------|-------|------:|
| Luxury standing offset | `effective = stored + min(owned unsuppressed, 3) × 2`; never banked; read by riot thresholds and Beloved only | luxury.ts:61-76; unrest.ts:65; victory.ts:72-77 | 3 |
| Timed happiness (Plague, Civil Discord) | `−2` per upkeep for 3 upkeeps, applied at start of turn **before** thresholds | unrest.ts:34-55; events.ts:244-259 | 1 (× duration) |
| Starvation | `calculateIncome().food ≤ −2` for 2 consecutive upkeeps → lose 1 random pop, counter resets | unrest.ts:75-99 | 3 (a threshold on the depth-4 total, counted over turns) |

---

## 2. Cost formula depth map

There are **three separate cost pipelines**:

- **A. `getAdjustedActionCost`** (economy/cost.ts:21-51) — foundColony, upgradeColonyToCity, buildBuilding. Order: seasonal multiplier with `ceil` (29-37, `getSeasonBuildingCostMultiplier` 113-135, honouring each card's `excludes`) → event coupons, `max(0, x − amount)`, buildBuilding/foundColony only (39-46) → `applyLawActionCost` (50).
- **B. `getDiscountedGrowPopCost`** (cost.ts:76-96) — growPop. Order: Granary food discount `max(0, food − Σ copies × 2)` (53-69, 98-111) → event coupons (86-88) → `applyLawActionCost` with `scope` city/colony and `pop` (92-95). **No seasonal multiplier by design** (71-75).
- **C. civic ladder** (civic.ts:112-141) — promotePop. Gymnasion `max(0, each resource − 2)` (82-110) → `applyLawActionCost` with `pop`. demotePop skips buildings (143-176) and is free during the player's own riot.

`applyLawActionCost` (assembly/laws.ts:262-330) is the shared tail: Law `actionCostMultiplier` first with `ceil` (277-285) → Law `actionCostDelta` with `max(0, …)`, skipping a negative delta on a resource the action does not cost (314-316) but allowing a positive one to add a new line (287-319) → `yearlyFreeAction` zeroes the named resources (323-327; consumed on commit, 365-373; reset each spring, season.ts:52-55).

| Verb | Base | Pipeline | Modifiers that can stack (source → effect, file) | Max simultaneous | Non-price gates |
|------|------|----------|--------------------------------------------------|-----------------:|-----------------|
| Found colony | wood 20, food 2 (data.ts:42-45) | A | Forest Crews coupon −6 wood (data.ts:1045-1052); Colonial Charter −10 wood (deck.ts:311); Master Builders +5 wood (deck.ts:284); Manifest Destiny −5 food (deck.ts:360); Land Rush: wood → 0 once per year (deck.ts:377). Seasonal multiplier is **excluded by both authored season cards** (data.ts:609, 627) though the pipeline supports it (cost.ts:125-127). Off-price rider: Frontier Spirit grants a freeman and −2 happiness on found (laws.ts:407-421; actions.ts:215-234) | **5** (all four Laws fit under `lawCap` 6) | must move 1 pop (arrives next turn); contiguity or coastal leapfrog; ≤ 2 colonies per tile; oracle unsettleable (settlement.ts:128-175) |
| Upgrade colony → city | wood 30, stone 10, food 5 (data.ts:46-50) | A | Enfranchise the Colonies ×0.5 with ceil → 15/5/3 (deck.ts:327; laws.ts:282); Colonial Charter +10 wood (deck.ts:312). Multiplier lands before the delta: both standing → wood 25. No coupon type targets it (types.ts:102); seasonal excluded by content | **2** | no city within radius 1 (settlement.ts:93-101); evicts a co-tenant colony (actions.ts:252-262) |
| Grow slave / freeman / citizen | food 5 / food 7 / food 9 + gold 2 (data.ts:53-64) | B | Granary −2 food per copy, max 3 copies (data.ts:318-320); one coupon per turn — Citizenship Rolls −5 food −1 gold (citizen), Willing Hands −4 food (freeman), Slave Auction −3 food (slave) (data.ts:738-805); Tenant Rights −3 food +2 gold (deck.ts:163-164); Guild Charter −3 food in cities / +2 food in colonies (deck.ts:203-204); Manifest Destiny +1 food in cities (deck.ts:361) | **5 sources** (Granary, coupon, 3 Laws) → up to 7 resource-line adjustments on one citizen grow in a city | once per settlement per turn (status.ts:245; query.ts:43-49); capacity incl. Aqueduct (status.ts:249-254) |
| Build (any) | per building, data.ts:287-378: Marketplace w12 · Temple s6 · Workshop w12 · Granary w12 s2 · Forum s4 w8 · Aqueduct s12 · Odeon s8 w4 · Villa w12 g4 · Gymnasion s12 w4 · Port w20 s5 g10 | A | Scarce Labor ×2 **or** Skilled Artisans ×0.5 ceil (one season card at a time; data.ts:596-630); one coupon per turn — Skilled Mason −5 stone any building, Temple Donation −5 stone Temple only (data.ts:987-1085); Public Works −3 wood −3 stone (deck.ts:190-191); Master Builders −4 stone on temple/forum/aqueduct/odeon/gymnasion (deck.ts:275-283); Land Rush +2 wood (deck.ts:378); Monumental Code: wood → 0 once per year (deck.ts:251) | **6** on a civic building; 5 on Marketplace/Workshop/Granary/Villa/Port | city/capital only; slots = `tile.buildingSlots + 2` (settlement.ts:66-74); `maxLevel` copies (status.ts:150-162) |
| Port (a build) | wood 20, stone 5, gold 10 (data.ts:374) | A | as Build minus Master Builders | **5** | coastal tile; an unclaimed good adjoining; under the active cap of 3 (status.ts:167-186; luxury.ts:79-86) |
| Promote slave → freeman | food 4 (ruleset.ts:288) | C | Gymnasion −2 (data.ts:364; civic.ts:100-110); Grain Dole −1 food (deck.ts:85); Manumission Law −2 food, slaves only (deck.ts:121-127) | **3** → 4−2−1−2 = **0, a free promotion** | one ladder move per turn (shared with demote) |
| Promote freeman → citizen | gold 4 (ruleset.ts:288) | C | Gymnasion −2 only; Grain Dole's food delta is a no-op on a gold price (laws.ts:314-316) | **1** | same throttle |
| Demote citizen → freeman / freeman → slave | influence 2 / influence 3 + 1 happiness (ruleset.ts:289-290) | C | none authored (`demotePop` is in `LawCostedAction`, assembly/types.ts:40-41, but no Law names it); free and throttle-exempt during own riot (civic.ts:149-160) | **0** | one ladder move per turn |
| Civic calm | influence 4 **or** gold 6 → +3 happiness (ruleset.ts:286) | none | not a Law-costed action; no coupon type | **0** | once per turn (civic.ts:42-43) |
| Venture stake | gold 5 **or** wood 8 (data.ts:232-235) | none | none; the three tables roll an unmodified d6 (ventures.ts:69; tables.ts:54-66) | **0** | once per turn |
| Bank sell / buy | sell 3 → 1 gold, buy 1 for 2 gold at baseline; abundant 4/2; scarce 2/3, classed once from tile counts at game creation (ruleset.ts:273-275; bank.ts:28-60) | bank | Aqueduct Levy: stone rate −1 step on both sides, floored at 1, and a 1/1 result is forced to 1/2 to keep a spread (deck.ts:239; laws.ts:378-404) | **2** (scarcity class + Law), stone only; 1 otherwise | unlimited trades per turn |
| Assembly draw / redraw | influence 3 / 3 (ruleset.ts:307-308; assembly.ts:255-264) | none | none | 0 | one held card at a time |
| Assembly repeal proposal | influence 6 (ruleset.ts:309; assembly.ts:443-449) | none | none | 0 | consumes the seat's one proposal |
| Assembly bribe | influence 10 per vote, ≤ 2 per assembly (ruleset.ts:310-311; assembly.ts:565-589) | none | none | 0 | only while it is your turn to cast |
| Assembly veto | influence 5, once per assembly (ruleset.ts:312-313; assembly.ts:631-652) | none | none | 0 | forfeits the seat's own vote on the item |
| Riot insurance | bread dole food 4 · concession = one demotion (free) · patronage influence 3, each +1 to the roll (data.ts:127-131; riot.ts:57-93, 110-118) | none | none | 0 | each once per riot |

Rounding points in the cost layer: `ceil` at cost.ts:35 (seasonal) and laws.ts:282 (Law multiplier); `max(0, …)` after every subtraction (cost.ts:41-44, 60-63, 87; laws.ts:318; civic.ts:107).

---

## 3. Happiness ledger

Stored happiness is a signed number that may hold halves (term 9). Effective happiness = stored + luxury offset (luxury.ts:74-76). Read against thresholds at the **start** of the owner's turn, after timed modifiers tick and before income (unrest.ts:24-70).

### 3a. Sources and sinks

| # | Source / sink | Sign | Amount | Cadence | Where |
|---|---------------|:----:|--------|---------|-------|
| 1 | Slave pressure | − | 0.5 × slaves | every income | income.ts:216-222 |
| 2 | Over-capacity | − | 1 × pops over capacity | every income | income.ts:223-231 |
| 3 | Temple | + | 1 per copy | every income | data.ts:300 |
| 4 | Odeon | + | 2 per copy | every income | data.ts:342 |
| 5 | Civic Anxiety (winter season card, 2 copies) | − | 2 per 10 pops, min 2 | each income that season | data.ts:557-575 |
| 6 | Festival Calendar (Law) | + | 1 per settlement | every income | deck.ts:139 |
| 7 | Civic Pride (Law) | ± | +1 per city, −1 per colony | every income | deck.ts:227-228 |
| 8 | Public Works (Law) | − | 1 per city | every income | deck.ts:192 |
| 9 | Census Rolls (Law) | − | 1 per city | every income | deck.ts:264 |
| 10 | Enfranchise the Colonies (Law) | − | 1 per city | every income | deck.ts:328 |
| 11 | Sacred Fields (Law) | − | 1 per 3 citizens | every income | deck.ts:110 |
| 12 | Manumission Law | − | 1 per 2 slaves | every income | deck.ts:128 |
| 13 | Cult of Demeter (Law) | ± | +2 if food ≥ 15, else −2 | every income | deck.ts:175 |
| 14 | Food shortage | − | the whole projected negative food balance | every income (grace on the first) | income.ts:250-259 |
| 15 | Food stockpile | + | floor(food / 5), cap 2 | every income | income.ts:261-277 |
| 16 | Plague (season card, all players) | − | 2 × 3 upkeeps | timed | data.ts:651-660 |
| 17 | Civil Discord (player card) | − | 2 × 3 upkeeps | timed | data.ts:867-875 |
| 18 | Civic calm | + | 3 | once per turn, paid | civic.ts:70 |
| 19 | Paid demotion freeman → slave | − | 1 | one-shot | civic.ts:227-228 |
| 20 | Local Unrest (×4) | − | 2 | one-shot | data.ts:847-855 |
| 21 | Public Calm (×4) | + | 2 | one-shot | data.ts:857-865 |
| 22 | Quarry Collapse (×2) | − | 1 | one-shot | data.ts:916 |
| 23 | Emergency Labor (×3, choice) | − | 1 | one-shot | data.ts:943 |
| 24 | Civic Petition (×3, choice) | + | 2 | one-shot | data.ts:981 |
| 25 | Temple Donation (×1, choice) | + | 3 | one-shot | data.ts:1070 |
| 26 | Festival Games (season, spring/summer ×2) | + | 2 per 10 pops, min 2 | one-shot at reveal | data.ts:577-594 |
| 27 | The Streets Burn (Directive, rival) | − | 3 | one-shot | deck.ts:416 |
| 28 | Bread and Circuses (Directive, rival) | + | 3 (and −5 gold) | one-shot | deck.ts:444-445 |
| 29 | Stratokles prize (author) | + | 2 | per authored pass | ruleset.ts:305 |
| 30 | Frontier Spirit rider (Law) | − | 2 per colony founded | one-shot | deck.ts:338; actions.ts:229-232 |
| 31 | Revolt rebound | set | happiness := −4 | after a severe riot roll | riot.ts:146-152 |
| 32 | Luxury standing offset | + | 2 × active goods, cap 3 | standing, never banked | luxury.ts:68-70 |

**32 distinct sources/sinks**: 15 recurring income-time flows, 2 timed, 14 one-shots, 1 standing offset. 14 can raise happiness, 20 can lower it (Civic Pride and Cult of Demeter count on both sides). Only five are under the player's direct control: civic calm, demotion, luxury claims, Temples/Odeons, and holding food (the stockpile bonus and Cult of Demeter both read the stock).

### 3b. Thresholds and rules

| Rule | Value | Where |
|------|-------|-------|
| Tiers | calm ≥ 0 · discontent < 0 · unrest ≤ −5 · revolt ≤ −10 (on **effective**) | unrest.ts:126-141 |
| Riot trigger | effective ≤ −5 at own upkeep → mild riot; ≤ −10 → severe (checked first, mutually exclusive) | unrest.ts:65-70; ruleset.ts:260-261 |
| Mild riot | no rebound — re-fires every upkeep while ≤ −5 | riot.ts:121-123 |
| Severe riot | roll −2; pop losses ×2; then stored happiness := −4 | ruleset.ts:262-264; riot.ts:134-152 |
| Roll clamp | natural d6 + modifiers clamped to 1..6 | tables.ts:60-65 |
| Insurance | +1 each, all three once per riot → +3; full insurance moves a mild riot's floor to row 4 ("catastrophe into taxation"); severe with full insurance nets +1 | data.ts:125-131; riot.ts:15-19 |
| Food-stockpile calm | +1 per 5 stored food, cap +2 | ruleset.ts:256-257 |
| Over-capacity | −1 per pop above capacity | ruleset.ts:255 |
| Starvation | net food income ≤ −2 on 2 consecutive upkeeps → lose 1 random pop, counter resets; skipped under first-income grace | ruleset.ts:265-267; unrest.ts:75-99 |
| Lingering unrest | timed modifiers apply and tick at upkeep before the threshold test, so a Plague tick can push a player onto the table that same turn | unrest.ts:32-55 |
| Luxury offset | +2 per active good, at most 3 active (owned goods beyond the cap are inactive); counts toward Beloved (`countsTowardBeloved: true`) | ruleset.ts:279-283; luxury.ts:61-76 |
| Beloved minimum | effective happiness ≥ 10 and sole leader | ruleset.ts:244; victory.ts:72-77 |
| Deck-exhaustion tiebreak | **stored** happiness (not effective) | victory.ts:186 |

### 3c. The riot table (data.ts:98-132)

| Roll | Outcome | Effects |
|-----:|---------|---------|
| 1 | The mob torches the works | lose 1 pop **and** destroy 1 random building (a copy = one level); no building → lose 1 more pop |
| 2 | Revolt spreads | lose 2 pops |
| 3 | Blood in the streets | lose 1 pop |
| 4 | Granary sacked | lose 6 food (honours stockpile floors, tables.ts:118-127) |
| 5 | Bribe demanded | lose 6 gold; if short, lose 1 pop |
| 6 | The mob disperses | nothing |

Pop losses are uniform-random across all the player's pops (tables.ts:228-271). Severe tier doubles every `losePops`, `popLossFallback` and `popLossIfShort` count.

---

## 4. Number classification

Convention: **kind** — amount (a resource quantity) · count (a number of things) · threshold (a line something is compared to) · rate (per-unit yield or price) · fraction (< 1 scalar) · multiplier (≥ 1 or ×0.5 scalar applied to a whole cost) · duration (turns/years). **side** — decision (a player compares against it when choosing a verb: prices, yields, capacities, caps, coupons, choice-card options) · state (the computer applies it; it lands on the player: starting stocks, event deltas, table outcomes, deck copy counts) · clock (bounds game length: victory gate, Assembly start, seasonal deck copies). `n` = how many numeric constants the row stands for. Stored zeros are listed because they are stored.

### 4a. DEFAULT_RULESET (ruleset.ts:226-317) and the data tables it references

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| startingResources wood / stone / gold / food | 20 / 10 / 10 / 12 | amount | state | data.ts:24-27 | 4 |
| startingResources influence / happiness | 0 / 0 | amount | state | data.ts:28-29 | 2 |
| placementPopCounts city / capital / colony | 3 / 4 / 2 | count | decision | core/pops.ts:11-15 | 3 |
| settlements.capital popCapacity / buildingSlotBonus | 10 / 2 | threshold / count | decision | data.ts:75-76 | 2 |
| settlements.city popCapacity / buildingSlotBonus | 10 / 2 | threshold / count | decision | data.ts:80-81 | 2 |
| settlements.colony popCapacity | 4 | threshold | decision | data.ts:85 | 1 |
| settlements.colony buildingSlotBonus | 0 | count | state | data.ts:86 | 1 |
| placement.maxColoniesPerTile | 2 | count | decision | ruleset.ts:233 | 1 |
| placement.cityExclusionRadius | 1 | threshold | decision | ruleset.ts:234 | 1 |
| victory.cardsToWin | 3 | threshold | clock | ruleset.ts:241 | 1 |
| victory.minimums cities / pops / citizens / stockpile / happiness / voice | 3 / 16 / 8 / 80 / 10 / 3 | threshold | clock | ruleset.ts:244 | 6 |
| actionCosts.foundColony wood / food | 20 / 2 | amount | decision | data.ts:43-44 | 2 |
| actionCosts.upgradeColonyToCity wood / stone / food | 30 / 10 / 5 | amount | decision | data.ts:47-49 | 3 |
| growPopCosts slaves food / freemen food / citizens food / citizens gold | 5 / 7 / 9 / 2 | amount | decision | data.ts:55-62 | 4 |
| popIncome.citizens influence / gold / food | 1 / 2 / −2 | rate | decision | ruleset.ts:249 | 3 |
| popIncome.citizens primaryResource | 0 | rate | state | ruleset.ts:249 | 1 |
| popIncome.freemen gold / food | 2 / −1 | rate | decision | ruleset.ts:250 | 2 |
| popIncome.freemen primaryResource | 0 | rate | state | ruleset.ts:250 | 1 |
| popIncome.slaves food / primaryResource | −1 / 1 | rate | decision | ruleset.ts:251 | 2 |
| popIncome.slaves happiness | −0.5 | fraction | decision | ruleset.ts:251 | 1 |
| economy.colonySharedTileYieldShare | 0.5 | fraction | decision | ruleset.ts:254 | 1 |
| economy.overCapacityHappinessPerPop | 1 | rate | decision | ruleset.ts:255 | 1 |
| economy.foodStockpileHappinessDivisor | 5 | rate | decision | ruleset.ts:256 | 1 |
| economy.foodStockpileHappinessCap | 2 | threshold | decision | ruleset.ts:257 | 1 |
| unrest.popLossThreshold / severeThreshold | −5 / −10 | threshold | decision | ruleset.ts:260-261 | 2 |
| unrest.severeRollModifier / severeRebound | −2 / −4 | amount | state | ruleset.ts:262, 264 | 2 |
| unrest.severePopLossMultiplier | 2 | multiplier | state | ruleset.ts:263 | 1 |
| unrest.foodDeficitThreshold | −2 | threshold | decision | ruleset.ts:265 | 1 |
| unrest.foodDeficitTurnsToStarve | 2 | duration | decision | ruleset.ts:266 | 1 |
| unrest.foodDeficitStarvePopLoss | 1 | count | state | ruleset.ts:267 | 1 |
| bank baseline / abundant / scarce (sell, buy) | 3,2 / 4,2 / 2,3 | rate | decision | ruleset.ts:273-275 | 6 |
| luxury.coastalGoods | 6 | count | state | ruleset.ts:279 | 1 |
| luxury.happinessPerGood | 2 | rate | decision | ruleset.ts:281 | 1 |
| luxury.activeCapPerPlayer | 3 | threshold | decision | ruleset.ts:282 | 1 |
| civicCalm happiness / influenceCost / goldCost | 3 / 4 / 6 | amount | decision | ruleset.ts:286 | 3 |
| ladder.promoteCosts slaves food / freemen gold | 4 / 4 | amount | decision | ruleset.ts:288 | 2 |
| ladder.demoteCosts citizens / freemen influence | 2 / 3 | amount | decision | ruleset.ts:289 | 2 |
| ladder.demoteHappinessPenalty citizens | 0 | amount | state | ruleset.ts:290 | 1 |
| ladder.demoteHappinessPenalty freemen | 1 | amount | decision | ruleset.ts:290 | 1 |
| ventureStakes gold / wood | 5 / 8 | amount | decision | data.ts:233-234 | 2 |
| assembly.firstYear | 2 | duration | clock | ruleset.ts:297 | 1 |
| assembly.lawCap | 6 | threshold | decision | ruleset.ts:298 | 1 |
| assembly.prizes food / stone / wood / happiness | 5 / 3 / 4 / 2 | amount | decision | ruleset.ts:302-305 | 4 |
| assembly drawCost / redrawCost / repealCost / briberyCost / vetoCost | 3 / 3 / 6 / 10 / 5 | amount | decision | ruleset.ts:307-312 | 5 |
| assembly.briberyCap / vetoesPerAssembly | 2 / 1 | count | decision | ruleset.ts:311, 313 | 2 |

### 4b. Riot table (data.ts:98-132)

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| row 1 losePops / destroyBuilding.popLossFallback | 1 / 1 | count | state | data.ts:107-108 | 2 |
| row 2 losePops / row 3 losePops | 2 / 1 | count | state | data.ts:111-112 | 2 |
| row 4 lose food / row 5 lose gold | 6 / 6 | amount | state | data.ts:116, 121 | 2 |
| row 5 popLossIfShort | 1 | count | state | data.ts:121 | 1 |
| insurance costs: bread dole food / patronage influence | 4 / 3 | amount | decision | data.ts:128, 130 | 2 |
| insurance modifiers (three options) | 1 / 1 / 1 | amount | decision | data.ts:128-130 | 3 |

### 4c. Expedition tables (data.ts:137-228)

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| Merchant Convoy gold on 3 / 4 / 5 / 6 | 5 / 5 / 9 / 9 | amount | decision | data.ts:148-163 | 4 |
| Grand Embassy influence on 3 / 4 / 5 / 6 | 3 / 3 / 6 / 6 | amount | decision | data.ts:177-192 | 4 |
| Colonists' Voyage food on 3 / 4 / 5 | 5 / 5 / 8 | amount | decision | data.ts:206-216 | 3 |
| Colonists' Voyage row 6: gainPop foodFallback / bonus food | 2 / 2 | amount | state | data.ts:222-223 | 2 |

### 4d. Omen table (data.ts:241-279)

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| die | 6 | count | state | data.ts:246 | 1 |
| rows 1-6: food −1, gold −1, wood −1, food +1, stone +1, gold +1 | ±1 | amount | state | data.ts:251-276 | 6 |

### 4e. Buildings (data.ts:287-378)

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| Marketplace cost wood | 12 | amount | decision | data.ts:291 | 1 |
| Marketplace freemanGoldBonus amount / supportedPops | 2 / 3 | rate / threshold | decision | data.ts:292 | 2 |
| Temple cost stone | 6 | amount | decision | data.ts:298 | 1 |
| Temple happiness / citizenInfluenceBonus amount / supportedPops | 1 / 1 / 2 | rate / rate / threshold | decision | data.ts:300-301 | 3 |
| Workshop cost wood | 12 | amount | decision | data.ts:308 | 1 |
| Workshop slavePrimaryResourceBonus amount / supportedPops | 1 / 3 | rate / threshold | decision | data.ts:309 | 2 |
| Granary cost wood / stone | 12 / 2 | amount | decision | data.ts:315 | 2 |
| Granary income food / growPopFoodDiscount | 2 / 2 | rate / amount | decision | data.ts:317-318 | 2 |
| Forum cost stone / wood | 4 / 8 | amount | decision | data.ts:327 | 2 |
| Forum income influence | 2 | rate | decision | data.ts:328 | 1 |
| Aqueduct cost stone | 12 | amount | decision | data.ts:334 | 1 |
| Aqueduct popCapacityBonus | 4 | count | decision | data.ts:335 | 1 |
| Odeon cost stone / wood | 8 / 4 | amount | decision | data.ts:341 | 2 |
| Odeon happiness | 2 | rate | decision | data.ts:342 | 1 |
| Villa cost wood / gold | 12 / 4 | amount | decision | data.ts:356 | 2 |
| Villa tilePrimaryResourceBonus | 2 | rate | decision | data.ts:357 | 1 |
| Gymnasion cost stone / wood | 12 / 4 | amount | decision | data.ts:363 | 2 |
| Gymnasion promoteCostReduction | 2 | amount | decision | data.ts:364 | 1 |
| Port cost wood / stone / gold | 20 / 5 / 10 | amount | decision | data.ts:374 | 3 |
| maxLevel × 10 buildings (2,2,2,3,2,2,2,2,1,1) | — | count | decision | data.ts:293-376 | 10 |

### 4f. Terrain deck (data.ts:418-455) — 37 tiles, 37 slot numbers + 31 yield numbers

| Tile class (terrain, slots, yield) | Tiles | Kind | Side | n |
|------------------------------------|------:|------|------|--:|
| forest 1 slot, wood 2 | 7 | count + rate | decision | 14 |
| forest 2 slots, wood 2 | 2 | count + rate | decision | 4 |
| forest 1 slot, wood 3 | 3 | count + rate | decision | 6 |
| forest 1 slot, wood 4 (old-growth) | 2 | count + rate | decision | 4 |
| forest 2 slots, wood 1 | 1 | count + rate | decision | 2 |
| mountain 2 slots, stone 2 | 3 | count + rate | decision | 6 |
| mountain 1 slot, stone 4 | 2 | count + rate | decision | 4 |
| mountain 1 slot, stone 3 | 2 | count + rate | decision | 4 |
| mountain 1 slot, stone 6 (quarry) | 1 | count + rate | decision | 2 |
| plains 3 slots, food 2 | 1 | count + rate | decision | 2 |
| plains 3 slots, food 4 | 3 | count + rate | decision | 6 |
| plains 2 slots, food 6 | 2 | count + rate | decision | 4 |
| plains 2 slots, food 8 | 1 | count + rate | decision | 2 |
| plains 2 slots, food 10 (breadbasket) | 1 | count + rate | decision | 2 |
| hill 3 slots, no yield | 4 | count | decision | 4 |
| hill 4 slots, no yield (centre) | 1 | count | decision | 1 |
| oracle 0 slots, unsettleable | 1 | count | state | 1 |

Aggregates (verified by script): forest 15 tiles / 18 slots / 36 wood · mountain 8 / 11 / 26 stone · plains 8 / 20 / 44 food · hill 5 / 16 / 0 · oracle 1 / 0. Total board yield 106 per turn if every tile were worked.

### 4g. Seasonal event deck (data.ts:457-693) — 13 card types, 33 cards

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| copies: Drought, Bountiful Harvest | 4, 4 | count | clock | data.ts:462, 481 | 2 |
| copies: Timber Levies, Quarry Contracts, Grain Tithe | 3, 3, 3 | count | clock | data.ts:500, 520, 540 | 3 |
| copies: Civic Anxiety, Festival Games, Scarce Labor, Skilled Artisans, Open Markets, Plague, Spring Floods, Wildfire | 2 each | count | clock | data.ts:560-677 | 8 |
| Drought / Bountiful / Open Markets / Wildfire income modifier | −2 / +2 / +2 / −2 | amount | state | data.ts:472, 491, 645, 688 | 4 |
| Timber / Quarry / Tithe: amountPerPops, popStep, minimum | 2, 6, 4 (×3 cards) | rate / count / amount | state | data.ts:510-552 | 9 |
| Civic Anxiety: amountPerPops, popStep, minimumMagnitude | −2, 10, 2 | rate / count / amount | state | data.ts:569-571 | 3 |
| Festival Games: amountPerPops, popStep, minimumMagnitude | 2, 10, 2 | rate / count / amount | state | data.ts:589-591 | 3 |
| Scarce Labor multiplier | 2 | multiplier | decision | data.ts:607 | 1 |
| Skilled Artisans multiplier | 0.5 | multiplier | decision | data.ts:625 | 1 |
| Plague amountPerTurn / turns | −2 / 3 | amount / duration | state | data.ts:659 | 2 |
| Spring Floods food | −3 | amount | state | data.ts:672 | 1 |

### 4h. Player event deck (data.ts:702-1113) — 26 card types, 83 cards

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| copies (26 cards: 4,4,3,4,4,3,4,4,4,4,4,4,3,5,3,4,2,3,3,3,3,2,2,2,1,1) | — | count | state | data.ts:707-1090 | 26 |
| New Citizen / Free Settlers / Captured Laborers addPops | 1 / 1 / 2 | count | state | data.ts:712, 724, 735 | 3 |
| Citizenship Rolls coupons food / gold | 5 / 1 | amount | decision | data.ts:751, 760 | 2 |
| Willing Hands / Slave Auction coupons food | 4 / 3 | amount | decision | data.ts:780, 800 | 2 |
| Good Stores / Timber Windfall / Merchant Profit / Stone Shipment | +3 each | amount | state | data.ts:814-844 | 4 |
| Local Unrest / Public Calm | −2 / +2 | amount | state | data.ts:854, 864 | 2 |
| Civil Discord amountPerTurn / turns | −2 / 3 | amount / duration | state | data.ts:874 | 2 |
| Granary Rats / Banditry / Warehouse Fire | −3 / −4 / −5 | amount | state | data.ts:884, 894, 904 | 3 |
| Quarry Collapse stone / happiness | −3 / −1 | amount | state | data.ts:915-916 | 2 |
| Patronage Network influence | 3 | amount | state | data.ts:927 | 1 |
| Emergency Labor options: wood 6 & happiness −1, or wood 2 | 6, −1, 2 | amount | decision | data.ts:942-945 | 3 |
| Granary Surplus options: food 4, or 1 freeman | 4, 1 | amount / count | decision | data.ts:962-963 | 2 |
| Civic Petition options: influence 2, or happiness 2 | 2, 2 | amount | decision | data.ts:980-981 | 2 |
| Skilled Mason options: stone 4, or −5 stone coupon | 4, 5 | amount | decision | data.ts:998, 1004 | 2 |
| Caravan Contacts options: gold 4, or exchange up to 4 wood at ratio 1.5 | 4, 4, 1.5 | amount / count / fraction | decision | data.ts:1025-1026 | 3 |
| Forest Crews options: wood 4, or −6 wood coupon | 4, 6 | amount | decision | data.ts:1043, 1049 | 2 |
| Temple Donation options: happiness 3, or −5 stone coupon | 3, 5 | amount | decision | data.ts:1070, 1077 | 2 |
| Market Day options: gold 3, or 1 per freeman min 2 | 3, 1, 2 | amount / rate / amount | decision | data.ts:1098-1106 | 3 |

### 4i. Assembly content (assembly/deck.ts) — outside data.ts, listed because these are the Law patch magnitudes

| Constant | Value | Kind | Side | Where | n |
|----------|-------|------|------|-------|--:|
| Grain Dole: promote food / slave primary | −1 / −1 | amount / rate | decision | deck.ts:85-86 | 2 |
| Land Reform: food all / gold city | +1 / −1 | rate | decision | deck.ts:97-98 | 2 |
| Sacred Fields: citizen food / happiness per step / step | +1 / −1 / 3 | rate / rate / count | decision | deck.ts:109-110 | 3 |
| Manumission: promote slave food / happiness per step / step | −2 / −1 / 2 | amount / rate / count | decision | deck.ts:121-128 | 3 |
| Festival Calendar: happiness / gold per settlement | +1 / −1 | rate | decision | deck.ts:139-140 | 2 |
| Agrarian Tariff: above / per / gold / wood | 10 / 2 / 1 / −1 | threshold / rate / amount / rate | decision | deck.ts:151-152 | 4 |
| Tenant Rights: grow food / gold | −3 / +2 | amount | decision | deck.ts:163-164 | 2 |
| Cult of Demeter: threshold / atOrAbove / below | 15 / +2 / −2 | threshold / amount / amount | decision | deck.ts:175 | 3 |
| Public Works: wood / stone / happiness per city | −3 / −3 / −1 | amount / amount / rate | decision | deck.ts:190-192 | 3 |
| Guild Charter: city / colony grow food | −3 / +2 | amount | decision | deck.ts:203-204 | 2 |
| Forum Rites: influence / food per city | +1 / −1 | rate | decision | deck.ts:215-216 | 2 |
| Civic Pride: city / colony happiness | +1 / −1 | rate | decision | deck.ts:227-228 | 2 |
| Aqueduct Levy: steps / wood | 1 / −1 | count / rate | decision | deck.ts:239-240 | 2 |
| Monumental Code: colony wood | −1 | rate | decision | deck.ts:252 | 1 |
| Census Rolls: gold / happiness per city | +1 / −1 | rate | decision | deck.ts:263-264 | 2 |
| Master Builders: civic stone / found wood | −4 / +5 | amount | decision | deck.ts:275-284 | 2 |
| Homestead Act: colony wood / city gold | +1 / −1 | rate | decision | deck.ts:299-300 | 2 |
| Colonial Charter: found wood / upgrade wood | −10 / +10 | amount | decision | deck.ts:311-312 | 2 |
| Enfranchise the Colonies: multiplier / happiness per city | 0.5 / −1 | multiplier / rate | decision | deck.ts:327-328 | 2 |
| Frontier Spirit: happiness on found | −2 | amount | decision | deck.ts:338 | 1 |
| Pioneer Levy: colony / city food | +1 / −1 | rate | decision | deck.ts:348-349 | 2 |
| Manifest Destiny: found food / city grow food | −5 / +1 | amount | decision | deck.ts:360-361 | 2 |
| Land Rush: build wood | +2 | amount | decision | deck.ts:378 | 1 |
| Rural Bloc: influence per step / step / city influence | +1 / 2 / −1 | rate / count / rate | decision | deck.ts:389-390 | 3 |
| Grain Riot fraction | 0.5 | fraction | state | deck.ts:407 | 1 |
| The Streets Burn happiness | −3 | amount | state | deck.ts:416 | 1 |
| General Strike turns | 1 | duration | state | deck.ts:425 | 1 |
| The Mob Rises count | 1 | count | state | deck.ts:434 | 1 |
| Bread and Circuses happiness / gold | +3 / −5 | amount | state | deck.ts:444-445 | 2 |

Not counted: the four politicians' `tendency` numbers (deck.ts:27-66, nine values) — display copy, "nothing in the rules reads tendency" (assembly/types.ts:169-170).

### 4j. Totals

Computed by script over the rows above (sum of `n`).

| Section | n | decision | state | clock |
|---------|--:|---------:|------:|------:|
| 4a Ruleset | 88 | 65 | 15 | 8 |
| 4b Riot table | 12 | 5 | 7 | 0 |
| 4c Expeditions | 13 | 11 | 2 | 0 |
| 4d Omen | 7 | 0 | 7 | 0 |
| 4e Buildings | 41 | 41 | 0 | 0 |
| 4f Terrain deck | 68 | 67 | 1 | 0 |
| 4g Seasonal deck | 37 | 2 | 22 | 13 |
| 4h Player deck | 66 | 23 | 43 | 0 |
| 4i Assembly content | 58 | 52 | 6 | 0 |
| **Total** | **390** | **266 (68%)** | **103 (26%)** | **21 (5%)** |

| Kind | n |
|------|--:|
| amount | 147 |
| count | 119 |
| rate | 89 |
| threshold | 22 |
| duration | 5 |
| fraction | 4 |
| multiplier | 4 |

Reading the totals: two thirds of the game's constants are decision numbers, and those are almost all prices (amount) and per-unit yields (rate). The whole game holds only 22 thresholds, 8 of which are the victory gates and 4 the unrest lines. Scalars that bend other numbers (fractions + multipliers) are 8 of 390. The terrain deck alone is 68 numbers, all decision — the board is the single largest thing a player reads.

---

## 5. Read-to-decide counts

Reference state (stated so the counts are checkable): capital on a plains food-4 tile (3 slots + 2), pops 2 citizens / 2 freemen / 1 slave, buildings Granary + Temple + Marketplace, capacity 10; colony on an unshared forest wood-2 tile, pops 0 / 2 / 1, capacity 4; 8 pops total; standing Law = Public Works; season card = Drought (−2 food); omen = Kind rains (+1 food); no luxuries, no coupon held. "Reads" = distinct numbers (ruleset constants, live counts, modifier lines, stocks) a player must know; the counts in parentheses show the swing under a different Law/season.

| Verb | (a) Can I afford it? | (b) What does it yield per turn? | Notes |
|------|---------------------:|---------------------------------:|-------|
| Build Odeon (stone 8, wood 4) | **11**: base 2 · Public Works 2 · stock 2 · slot arithmetic 3 (tile 3 + bonus 2 vs built 3) · maxLevel 2 vs copies 0 (2) | **1**: +2 happiness | Under Scarce Labor/Skilled Artisans: +2 (multiplier and the ceil rule). A coupon: +1 |
| Build 2nd Marketplace (wood 12) | **8**: base 1 · Public Works 1 · stock 1 · slots 3 · maxLevel vs copies 2 | **4**: freemen 2, supported 3 (+3), rate 2 → **yield 0** — the 2 freemen are already covered | The most common "why did this do nothing" read |
| Grow citizen in the capital (food 9, gold 2) | **8**: base 2 · Granary 2 × copies 1 (2) · stock 2 · capacity 10 vs pops 5 (2) | **7**: +2 gold +1 influence −2 food (3) · Temple supported 2 vs citizens 2 (the new one is unsupported) + rate (3) · +1 vote weight (1) | Tenant Rights standing: (a) +2, Sacred Fields: (b) +2 |
| Grow slave in the colony (food 5) | **4**: base 1 · stock 1 · capacity 4 vs pops 3 (2) | **3**: +1 wood, −1 food, −0.5 happiness | Guild Charter: (a) +1 (colony +2 food) |
| Found colony (wood 20, food 2) on a food-6 tile, sending a freeman | **7**: base 2 · stock 2 · source pop available 1 · maxColoniesPerTile 2 vs on-tile 0 (2) | **6**: tile 6 (1) · co-tenant? (1) · freeman +2 gold −1 food (2) · one-turn arrival delay (1) · capacity 4 (1) | Up to 12 for (a) with Colonial Charter, Master Builders, Manifest Destiny, Land Rush, Forest Crews all live; (b) +1-2 per colony-scoped Law; shared tile adds the 0.5-and-floor rule |
| Upgrade colony → city (30 / 10 / 5) | **6**: base 3 · stock 3 | **8**: capacity 4 → 10 (2) · slots tile + 2 (2) · Public Works −1 per city (1) · share 0.5 → 1 if co-tenanted (1) · cities toward Polis Builder 3 (2) | Colonial Charter: (a) +1; Enfranchise: (a) +2 (×0.5 and ceil) |
| Promote slave → freeman in the capital (food 4) | **2**: base 1 · stock 1 | **8**: slave line +1 food −1 food −0.5 happiness (3) · freeman line +2 gold −1 food (2) · Marketplace supported 3 vs freemen 2 + rate (3) | Gymnasion: (a) +1; Grain Dole + Manumission: (a) +2 |
| Civic calm | **4**: influence 4 / gold 6 · both stocks | **4**: +3 · stored happiness, luxury bonus, the −5 line | Deciding *whether it matters* costs more reads than deciding *whether it is affordable* |
| Venture | **3-4**: stake 5 / 8 · stock(s) | **6**: three payouts and their roll bands (Colonists: 7 with the pop jackpot and its food fallback) | Stake is spent win or lose |
| Bank sell wood | **2**: sell rate (board-classed 3 / 4 / 2) · stock | **2**: +1 gold, and the buy rate if judging the round-trip spread | Aqueduct Levy adds 1 read on stone |
| Assembly draw | **3**: drawCost 3 vs influence · redraw 3 | **4-6**: politician prize (1) · the drawn Law's 2-4 magnitudes · own vote weight = citizens (1) | The card is unknown until paid for |
| Assembly bribe | **4**: 10 · cap 2 · used · influence | **3**: yea / nay so far · own base weight | — |
| Build Port (20 / 5 / 10) | **16**: base 3 · Public Works 2 · stock 3 · slots 3 · maxLevel 1 vs 0 (2) · active cap 3 vs active 0 (2) · claimable goods here (1) | **3**: +2 effective per good · Beloved 10 · riot line −5 | Coast and adjacency are geometry, not numbers |
| **Full income statement** (what next turn pays) | — | **32**: capital 20 (tile 1 · citizen count + 3 coefficients 4 · freeman count + 2 coefficients 3 · slave count + 3 coefficients 4 · capacity + rate 2 · Granary 1 · Temple flat + support + rate 3 · Marketplace support + rate 2) · colony 5 (tile 1 · co-tenant 1 · two counts 2 · capacity 1) · player 7 (Drought 1 · omen 1 · Public Works rate + cities 2 · food stock 1 · stockpile divisor + cap 2) | 17 of the 32 are constants a player can memorise; 15 are live counts and standing lines. Add 2 per extra Law line, 2 with any luxury active, 2 under Agrarian Tariff (threshold 10, per 2) plus the total it reads |

Cheapest decisions to read: bank (2), promote (2), grow slave (4). Most expensive: Port (16), build (10-13), full income (32).

---

## 6. The clock

| Dial | Value | Where |
|------|-------|-------|
| Seasonal deck | **33 cards** (13 types; copy counts sum to 33), shuffled once, never reshuffled; exactly one card leaves per season (a suited card if any remains, else the top card) | data.ts:457-693; state.ts:43; events.ts:143-159 |
| Seasons per year | 4 (spring, summer, autumn, winter); `yearOf(s) = floor((s−1)/4)+1` | core/calendar.ts:21-33 |
| Exhaustion | checked at `startNewSeason` **before** advancing: an empty draw pile after season 33 ends the game with the most-cards tally (tiebreak stored happiness, pops, seat) | season.ts:33-36; victory.ts:177-197 |
| Maximum length | **33 seasons = 8 years + 1 spring** (season 33 is Year 9 spring) → **132 gameplay player-turns**; `G.turn` runs 1 → 9 through 8 setup placements, then to **140** on the final turn | turn.ts:78-97, 176-178; state.ts:74 |
| Sim turn cap | `--turns` default **40** for both `auto` and `batch`, counted on `G.turn` from the current save, so a fresh batch game = 40 − 8 setup = **32 gameplay turns = 8 seasons = 2 years**; no cap exists in `config.ts` | src/sim/cli.ts:634, 713; src/sim/runner.ts:169-188, 202-208 |
| Assembly cadence | every spring from Year 2 (`firstYear: 2`; 0 disables) → seasons 5, 9, 13, 17, 21, 25, 29, 33 → **at most 8 Assemblies**; each ballot ≤ 1 house card + 4 proposals; convenes at a constant `G.turn` before the opener plays | assembly/assembly.ts:39-49; turn.ts:157-163; ruleset.ts:297 |
| Player-event deck | 83 cards, reshuffles from discard (does not clock the game) | data.ts:702-1113; events.ts:128-141 |
| Omen | one d6 per year, all players, ±1 of one resource per income | tables.ts:208-217 |
| Opener rotation | one seat per year; everyone plays once per season | season.ts:41-46 |

### Victory minimums and whether they scale with game length

| Card | Metric | Minimum | Scales with turns? |
|------|--------|--------:|--------------------|
| Polis Builder | non-colony settlements | 3 | Needs 2 colony upgrades (40 wood + 20 stone + 10 food, two founding voyages first); comment: bots never take this path (deck.ts:320-323) |
| Demos | total pops | 16 | Yes — throttled at 1 grow per settlement per turn plus event faucets; from 6 setup pops, ≥ 5 turns of two-settlement growth, food-bound in practice |
| Civic Elite | citizens | 8 | Yes — grow (9 food + 2 gold) or promote (one ladder move per turn) |
| Treasurer | wood + stone + gold + food | 80 | Yes — pure accumulation; every bank trade shrinks it |
| Beloved of the People | **effective** happiness | 10 | **No** — a level, not an accumulation: three active luxuries (+6), one calm (+3) and a Temple's next tick (+1) reach it from 0 inside one round — though the three Ports cost 60 wood, 15 stone, 30 gold first |
| Voice of the Assembly | authored passes | 3 | Hard-clocked: one pass per Assembly at most → earliest **Year 4** (season 13) |
| Win | hold 3 at own turn start | — | victory.ts:160-171 |

---

## 7. Observations

1. **The deepest nesting lives in the Law layer, not the base economy.** Agrarian Tariff's surplus conversion (laws.ts:216-238) is depth 4: `floor((Σ every food line incl. the other Laws − 10) / 2)` gold. Nothing in the base ruleset exceeds depth 3, and the depth-3 terms are all of one shape — "a count, capped by a number that is itself a sum of copies": Marketplace/Temple/Workshop support (income.ts:460-492), over-capacity (settlement.ts:40-46), food-stockpile calm (income.ts:263-265), and the seasonal pop-scaled clamp (settlement.ts:193-205).

2. **Three cost pipelines for one concept.** Found/upgrade/build go seasonal → coupon → Law (cost.ts:21-51); grow goes Granary → coupon → Law with no multiplier stage (cost.ts:76-96); promotion goes Gymnasion → Law (civic.ts:112-141); demote, calm, ventures, bank and every Assembly verb take no modifiers at all. A player who has learned how one price bends cannot transfer that to the next.

3. **Zero prices are reachable with authored content alone**, because Laws are table-wide and six can stand at once: Temple stone 6 − Public Works 3 − Master Builders 4 = 0; Forum stone 4 → 0 the same way; slave promotion 4 − Gymnasion 2 − Grain Dole 1 − Manumission 2 = 0; slave grow 5 − three Granaries 6 = 0; found colony wood 20 − Colonial Charter 10 − Forest Crews 6 = 4, or 0 under Land Rush. Every subtraction clamps at 0 (cost.ts:41-44, laws.ts:318, civic.ts:107), so overshoot is silently discarded rather than refunded.

4. **Two fractions in the base ruleset, two different behaviours.** The colony share 0.5 is floored per settlement (settlement.ts:86): a wood-3 or stone-3 tile shared by two colonies pays 1 + 1 and a unit vanishes. The slave −0.5 happiness (ruleset.ts:251) is never rounded, so happiness is the only ledger holding half-integers and every threshold (≤ −5, ≤ −10, ≥ 10) is tested against a possibly-x.5 value. Rounding direction is domain-dependent: prices `ceil` (cost.ts:35, laws.ts:282), yields and losses `floor` (settlement.ts:86; laws.ts:123, 234; assembly.ts:883; events.ts:313).

5. **Food can go negative under income but not under events.** `stockpileFloors` ships as `{}` (ruleset.ts:277), so `collectIncome` (actions.ts:328) drives food below zero, while event and Directive harm clamp at the stock (events.ts:354-361; assembly.ts:872-875) and the riot's "lose 6 food" honours the (absent) floor (tables.ts:118-127). The food-shortage penalty then reads the *absolute* projected balance (income.ts:289), so a player at −6 food with −2 income loses 8 happiness this turn, 10 the next, 12 the one after, until the debt is repaid — a compounding spiral that rules.md:230-232 describes as "the shortfall".

6. **"Level 2" means three different things.** For Granary, Forum, Odeon, Temple's flat +1 and Villa, a second copy doubles the amount. For Marketplace, Temple support and Workshop, a second copy doubles the *cap* while the rate is overwritten (income.ts:436-443) — a second Marketplace on a 2-freeman city yields exactly 0. Aqueduct copies add capacity. Gymnasion and Port have no second copy (data.ts:281-286).

7. **Redundant sinks and overlapping levers.** Three Laws carry the identical "−1 happiness per city" rider (Public Works, Census Rolls, Enfranchise — deck.ts:192, 264, 328), so a city can be taxed −3/turn by three stelae; two carry "−1 wood flat" (Agrarian Tariff, Aqueduct Levy). Five modifiers reprice foundColony — three on its wood (Colonial Charter −10, Master Builders +5, the Forest Crews coupon −6), Land Rush zeroing that wood once a year, Manifest Destiny on its food. And `drawCost == redrawCost == 3` (ruleset.ts:307-308) though the type doc (ruleset.ts:177-179) and assembly.ts:253-254 describe an "escalating" fishing sink — with the defaults the escalation is zero.

8. **Dead or unreachable paths the code itself names.** Colony → city upgrade: "NEITHER bot ever upgrades a colony into a city at current pricing" (deck.ts:320-323) while Polis Builder needs two. `placeCity` and the `setupCity` phase (actions.ts:91-133; turn.ts:67-69) are reachable by no `GAME_MODES` entry. The luxury suppression lifecycle (luxury.ts:107-124): "Nothing suppresses yet (Q48 deferred)". Politician power and patronage: "descriptive only and never contributes an effect" (laws.ts:25-26; power.ts:8-18). `demotePop` is a Law-costed action no Law prices. Six stored zeros: starting influence and happiness, two `primaryResource: 0`, colony `buildingSlotBonus: 0`, `demoteHappinessPenalty.citizens: 0`.

9. **Two happiness numbers decide different things, and pop-scaling is written three ways.** Riot thresholds and Beloved read *effective* happiness (unrest.ts:65; victory.ts:72-77); the deck-exhaustion tiebreak reads *stored* (victory.ts:186). "Per N pops" exists as `scaledByPops` (floor + signed minimum magnitude; settlement.ts:193-205), Law `scaled` (floor, no minimum; laws.ts:121-124) and `resourceDeltaPerPop` (`max(minimum, n × rate)`; events.ts:331-342), with steps of 6, 10, 2, 3 and "per 2 colonies". The bank quotes its two directions in inverse units — sell is materials-per-gold, buy is gold-per-material — so Aqueduct Levy's "one step" is +50% on one side and +100% on the other (laws.ts:396-403).

10. **The sim's clock and the game's clock disagree.** The default `--turns 40` (cli.ts:634, 713) stops after 2 years — before Voice is reachable and one Assembly in; the political recommendation `--turns 280` (docs/reference/simulation.md:146) is double the deck's 140-turn ceiling, so those games always end by deck exhaustion and the cap never fires. Meanwhile the only victory minimum that is a *level* rather than an accumulation — Beloved at effective 10 — is the one a player can manufacture inside a single round (§6 table), which makes it the odd card out in a race otherwise paced by 1-grow-per-settlement-per-turn and 1-pass-per-Assembly throttles.
