# UI impact matrix — shallow economy v0.2 (2026-09-06)

Every player-facing surface against the v0.2 rulings of [the direction paper](../balance/2026-09-05-shallow-economy.md). Companion to [The Asymmetric Table](2026-09-06-asymmetric-table.md). Line numbers cite `main` at 757384a.

Scope: every player-facing surface under `src/components` (paths drop that prefix; `ui/` = `src/ui`, `dev/` = `src/dev`). Rulings cite `docs/reports/balance/2026-09-05-shallow-economy.md` by section. Change: DELETE / REPLACE / RESHAPE / NEW / UNCHANGED. Kind: **C** = content only (copy, numbers, roster from content, deleting a branch); **S** = structural (new state, selector, or interaction).

Paper note: §5.5 prose and §8 say one building of each per settlement; the §5.5 table still lists Temple and Granary max 2. Rows assume one.

## 1. Matrix

| Surface | Today | Rulings | Change | v0.2 | Kind |
|---|---|---|---|---|---|
| **Map** | | | | | |
| `HexMap.tsx`, `board/map/TileGroup.tsx`, `ui/boardEmblems.ts` | yield numeral on unsettled tiles (TileGroup:225-234, HexMap:194-205, boardEmblems:63); seals, pop beads (TileGroup:34-103), owner rim | §5.2 terrain + slots only | RESHAPE | numeral → slot pips; rest as today | C |
| `board/TileSubject.tsx`, `board/helpers.ts` | `+{amount}` stamp (:53-56); picker label "+N type / no yield", "shared yields halved" (:136-150) | §5.2; one settlement per tile | RESHAPE | terrain + slots line | C |
| `board/map/LuxuryVertexMarker.tsx` | buoy unclaimed / owner-sealed (:43-53) | §5.5 Port claims; Q53 | UNCHANGED | Blockade reuses the suppressed state | – |
| `board/map/BuildPopover.tsx` | roster with adjusted cost (:71), Port claim picker (:107), benefit prose (:131-136) | §5.5 roster (Estate, Forum in; Workshop/Villa/Odeon/Aqueduct/Gymnasion out); §5.6 | RESHAPE | flat price; "freemen here make 2 gold"; Estate refused on hills; claim picker stays | C |
| `board/map/GrowPopPopover.tsx` | slave/freeman/citizen, price + income delta (:67-110) | §5.1 citizens by promotion; §5.6 2/3 food | RESHAPE | two choices; delta = +1 typed by terrain / +1 gold | C |
| `board/map/LadderPopover.tsx` | promote/demote one step, engine cost (:62-73) | §5.1, §5.6 | RESHAPE | same popover; now the only route to citizens | C |
| `board/map/MovePopsPopover.tsx` | traveller stepper, "arrive next turn", no cost (:103-116) | Q63 one paid move per turn, 1 food per pop | RESHAPE | cost row + once-per-turn refusal | S |
| `board/map/useMapSelection.ts`, `TilePopover.tsx`, `board/TileListbox.tsx`, `board/PopoverActions.tsx` | glow from engine statuses; chrome | – | UNCHANGED | | – |
| **Top bar** | | | | | |
| `board/topbar/TurnDial.tsx` | season ring under a needle (:218-242); arc = season ÷ (season + seasonalDrawPile) (:189-191) | §5.8 years; 14-card year deck; next card hidden (Q65) | REPLACE | year dial: 14 notches, this year's card face, next card face-down; year end = victory check | S |
| `board/topbar/TopbarEvents.tsx` | omen slip (:46-63), seasonal slip (:44, :70), last fate slip (:79); choices joined "·" (:22-25) | §6.2 year deck replaces seasonal deck and omen; §6.1 | REPLACE | one year-card slip + last draw; no omen | S |
| `ResourceGrid.tsx` | six pills; happiness = stored ± luxury = effective (:35, :96-107); income tooltip prints `IncomeContribution` rows verbatim (:167-178) | §5.7 level ledger; §5.2/§5.5 counts × printed value | RESHAPE | happiness pill → level with a 5-line ledger and −3/−6 marks (fallback: clamped bank); rows read "3 slaves × 2 wood" | S |
| `board/topbar/PlayerScoreboard.tsx` | four seat discs | – | UNCHANGED | tooltip may carry pieces + Ideas | – |
| `ActiveEffectsList.tsx` | ≤4 slips from `presentActiveEffects` (:28, :66-84) | §6.1 nothing lingers but tokens | RESHAPE | slips = year card, Laws, Ideas, Unrest tokens | C |
| **Act rail** | | | | | |
| `ledger/LedgerRail`, `TabRail`, `ConsultRail`, `ConsultPanel`, `LedgerPanelHeader`, `tabs`, `route` | spines | – | UNCHANGED | | – |
| `ledger/EmpireIntelPanel.tsx` | pops/capacity (:96-100), laurels (:102-107), luxuries "+N effective" (:50-61, :109-118), riot threshold (:123) | §5.4 pieces; §5.7 | RESHAPE | piece strip (colony n/4, city n/3), Ideas chip; luxury "×2 in your level" | S |
| `ledger/UnrestAlarm.tsx` | tier, effective number, stored ± bonus (:57-61), deficit turns (:62), timed modifiers (:63), deaths (:64), "die at −5" (:36) | §5.7 level + tokens; §5.3 | REPLACE | level gauge, token count, "riot ≤ −3 / revolt ≤ −6" | S |
| `ledger/CitiesTab.tsx` (+ `SettlementCard.tsx`) | beads vs capacity, sockets, net income, "over its walls · −N happiness" (:120); SettlementCard slots/capacity/yield title (:66-100) | §5.1/§5.5 three columns, printed 1→2; no over-capacity | REPLACE | three-column card: slaves ×1\|2 → terrain good, freemen ×1\|2 → gold, citizens ×1\|2 → influence + vote; building name under a doubled header; flat lines (Temple, Granary, Port); mouths = free pops | S |
| `ledger/PopsTab.tsx`, `PopBeads.tsx` | rungs priced from `ruleset.ladder`/status (:73-82); "lost to unrest and starvation" (:218) | §5.6, §5.3, §5.1 | RESHAPE | same ladder, flat prices, copy | C |
| `ledger/BuildingsTab.tsx`, `SocketPicker.tsx`, `BuildingSockets.tsx`, `BuildingChip.tsx`, `slots.ts`, `buildRefusal.ts` | effective vs base cost (:99, :164, :174; SocketPicker:199); "at max level" (buildRefusal:71-75); colony "no ground to build on" (BuildingSockets:66-68) | §5.5 six buildings, one each; Port in a coastal colony | RESHAPE | one price; "already built here"; colony gets a Port-only socket | C |
| `ledger/MarketTab.tsx` | sell N→1 / buy 1 for N, Law-adjusted (:75-80) | §5.6 bank as shipped; Dole 3 influence → 1 food | RESHAPE | fixed rates + a Dole row | S |
| **Consult rail** | | | | | |
| `ledger/VictoryTab.tsx` | six laurels, minimums, meter clamped for negative happiness (:70), Voice held-not-led (:65, :149-166), "3 at dawn wins" (:48-57) | §5.10 Treasurer gold ≥30, Demos 14, Elite 5, Beloved level ≥4, Voice ≥2 standing authored; checked at year end | RESHAPE | metrics from engine; Voice led like the rest; "checked at year end" | C |
| `ledger/AgoraTab.tsx` | Voice first-to-minimum (:56-58), laws N of cap (:88), notches (:164), monuments (:118), "spring, Year N" (:180-185) | §5.9 cap 4 oldest out, every other year, Voice a level | RESHAPE | cap 4 in age order; "next sitting Year N"; monuments lose their Voice role | C |
| `ledger/CodexTab.tsx` | search + chapters, delegates to `rulebook.tsx` | – | UNCHANGED | shell only | – |
| `ledger/rulebook.tsx` | 14 chapters, numbers live from ruleset/content | all | REPLACE | rewrite: victory :183-212; terrain yield table :249-268; classes/over-capacity :366-383; settlement costs :437-443; grow/ladder :533-567; buildings maxLevel :603-614; luxury cap :666-674; unrest stockpile/starvation/−5/−10 :717-748; seasons + omen :754-819 → years and the year deck; bank :829-847 (+ Dole); ventures :870-884; assembly :936-1053. New: National Ideas, pieces | C |
| `AnnotatedText.tsx`, `codexLink.tsx` | tokens for cut buildings (:61-68), season/omen (:80-87), veto (:115) | roster, §5.8, §5.9 | RESHAPE | tokens: estate, year card, unrest token, idea, dole, piece | C |
| `board/command/ActionLogPanel.tsx` | chronicle grouped by season (:65-75, :118) | §5.8 | RESHAPE | group by year | C |
| `ui/effects.ts`, `ui/iconRegistry.ts`, `ui/formatters.ts` | presenters for 36 effect types: coupons (:227-245), multipliers (:209-216), scaled/timed (:190-203), derivative Laws (:376-440), support caps "up to N" (:482-496); season labels (formatters:16-31); season/omen glyphs (iconRegistry:71-76, :112-118) | §6.1 four verbs; App. B; §5.5 | REPLACE | four-verb presenter, rule-Law text, column buildings; new glyphs | C (tracks engine unions) |
| **Command dock** | | | | | |
| `board/command/CommandDock.tsx`, `CommandVerb.tsx`, `verbs.tsx` | 7 verbs: grow (discounted span :113-126), move "free" (:182), found, upgrade, build "from" cheapest (:130-141), calm two clauses (:227-228), venture stake (:240) | §5.6 one price; Q63; Dole; Ideas; promotion | RESHAPE | prices from ruleset; move 1 food; add Promote, Dole, Buy Idea | S |
| **Modals** | | | | | |
| `modals/CalmModal.tsx` | +3 to the bank for 4 influence or 6 gold (:27-63) | §5.6 2 gold or 2 influence, +2 to level this year | RESHAPE | copy | C |
| `modals/VentureModal.tsx` | three tables, stakes gold 5 / wood 8 (:127-144) | §6.4 one stake, 2 gold | RESHAPE | stake picker collapses | C |
| `modals/EventTableModal.tsx`, `LacquerDie.tsx` | dice table + die; omen mount (HegemonyBoard:711-731) | §6.4; omen gone | RESHAPE | drop the omen mount | C |
| `modals/RiotModal.tsx` | table, insurance ×3, revolt = −2 roll, doubled losses (:44-47, :90-159) | §5.7 riot clears tokens then rolls; revolt determinate; concession only demotes a citizen | RESHAPE | revolt = no-die notice "half your slaves leave"; concession list = citizens | S |
| `modals/FoundColonyPopover.tsx` | source list, pop choice, 20 wood + 2 food (:77-78), net-yield preview (:68-73) | §5.4 4 wood + 1 food + pop, 4 pieces; free move | RESHAPE | "pieces left n/4" + refusal; preview = slots | S |
| `modals/UpgradeCityModal.tsx` | chips with yield, "evicts rivals" (:98-111), 30w/10s/5f | §5.4 3 wood 3 stone, 3 city pieces; one per tile | RESHAPE | piece line; no yield or eviction copy | S |
| `modals/PendingPlayerEventModal.tsx` | choose-one (:184-230), per-pop totals (:49-62), add-pops picker (:72-92, :248-274), duration strip (:246) | §6.1/§6.3 one verb per card | RESHAPE | single-verb card; keep the pop picker; add token place/clear | C |
| `modals/GameOverModal.tsx` | race vs deck exhaustion (:60-70) | §5.8 year-end check | RESHAPE | copy | C |
| `modals/PopulationPickerModal.tsx`, `PopulationStepper.tsx` | setup split 1 citizen + freemen (:11-17) | §5.1 (setup citizens unruled) | UNCHANGED | default split to confirm | – |
| `modals/CeremonyBlow.tsx`, `ceremonyMood.ts`, `ModalShell.tsx`, `PlacementModalShell.tsx` | chrome; DurationStrip (CeremonyBlow:58-72) | §6.1 | UNCHANGED | DurationStrip dead | – |
| **Assembly** | | | | | |
| `assembly/AssemblyPanel.tsx`, `AssemblyHead.tsx` | verdict "vetoed" (:119-129); "spring of Year N" (Head:103); Voice first-to-N (Head:118-125) | §5.9 | RESHAPE | copy | C |
| `assembly/AssemblySeats.tsx` | weight = citizens + bribes (:222-282), Veto 5 (:284-340), Bribe 10 influence cap 2 (:286-358) | §5.9 1 per seat + citizens; votes 2 gold or 2 influence, max 2; no veto | RESHAPE | base 1 + citizens; Veto gone; vote purchase with a payment choice | S |
| `assembly/AssemblyFloor.tsx` | replacement picker at cap (:679-726); house item (:82); monuments (:173-180); Directive summaries (:754-766); recap Enacted/Vetoed/Falls (:863-871); Voice ledger (:842-846) | §5.9 cap 4 oldest replaced, no veto, no house items, tenure; App. B | RESHAPE | "passing retires: <oldest>"; no house item, no Vetoed; App. B summaries; Voice = standing authored | S |
| `assembly/AssemblyFoot.tsx`, `AssemblyColonnade.tsx` | Repeal 6 (Foot:76-87); escalating draw (Colonnade:41) | §5.9 draw + propose 2, repeal 3; tenure | RESHAPE | flat prices; repeal list marks "passed last sitting" | C |
| `assembly/StandingLaw.tsx`, `voteVerdict.ts`, `useDepartedLaws.ts`, `AssemblyPresentation.tsx`, `AssemblyIcons.tsx` | "Year yearOf(enactedSeason)" (:83); tie fails (:19) | §5.8 | RESHAPE / UNCHANGED | year read directly | C |
| **Dev** | | | | | |
| `dev/TunePanel.tsx` (+ `tuning.ts`, `tuningPresets.ts`, `aggregates.ts`) | Terrain Σ yield (:214-243), effect amounts + maxLevel (:264-282), ruleset tree, Low Numbers preset, Start-at-Assembly (16 seasons) | all; §9 Tier 0 | RESHAPE | Terrain → slots; buildings → cost + column; preset = Tier-0 v0.2 | C |
| **Setup** | | | | | |
| `HegemonyBoard.tsx` :186-246, `App.tsx` | no setup screen: placement captions + pop picker in-board; mode is build-time (`src/client/controller.ts:44`) | Q66 | NEW | secret simultaneous Idea pick modal | S |

## 2. Dead under v0.2

Line refs are in the matrix unless new here.

- Season ring and deck-length arc; `SEASON_LABELS`/`seasonLabel` (formatters:16-26); season glyphs; season grouping in the chronicle; every `yearOf(G.season)` reader (AgoraTab:47, :184; StandingLaw:83; AssemblyFloor:191).
- Omen slip, omen modal mount, omen art (board/events.ts:134-140), Codex section (rulebook:785-796), omen glyph. Seasonal slip and seasonal card art (events.ts:6-117).
- Tile yield everywhere: map numeral, `+amount` stamp, picker label, SettlementCard title, UpgradeCity chips, Codex table, TunePanel Terrain, `aggregates.ts` totals. `tileCssVars` colours by `tile.resource.type` (resourceVisuals:117-124) and must key on terrain.
- Happiness triple stored ± bonus = effective and `happinessBreakdown`.
- Food-deficit counter, starvation, food-stockpile bonus (rulebook:719-723); timed modifiers and DurationStrip.
- Over-capacity penalty (CitiesTab:120; SettlementCard:79; rulebook:381-383).
- Effective-vs-base cost pairs, coupons, discounts, multipliers (also FoundColonyPopover:75 note).
- `maxLevel` / "at max level"; support caps "up to N"; Workshop/Villa/Odeon/Aqueduct/Gymnasion glyphs, tokens, presenters (effects.ts:505-518).
- Citizen grow option; demote happiness penalty (rulebook:557-564).
- Veto everywhere (also glyphs.ts:262; placeholders.ts:86).
- Escalating draw; Law replacement picker; house ballot item; Voice first-to-minimum; monuments as a Voice feed (StandingLaw:50).
- Two-stake venture; choice cards; per-pop scaling; "·"-joined choices.
- Derivative Law presenters: thresholdHappiness, surplusConversion, bankRateStep, yearlyFreeAction, popPrimaryIncome (effects.ts:341-452; iconRegistry:156-170).
- Treasurer "banked material stockpile" (victory.ts:38-42); Bread & Circuses and Cult of Demeter Directive summaries.

## 3. New surfaces

1. **Year deck clock**: 14 notches, this year's card face with its one-sentence rule, next card face-down, year-end victory marker. State: `yearDeck`, `activeYearCard`.
2. **Piece supply**: colony n/4, city n/3 per player, "upgrade returns a colony piece"; EmpireIntelPanel strip, found/upgrade lines, rivals in the scoreboard tooltip.
3. **Happiness level gauge + ledger** (temples, 2 × luxuries, −slaves ÷ 2, −tokens, +2 calm) with −3/−6 marks; fallback: clamped −10..+10 bank meter. Selector `happinessLevel(G, p) → {level, lines}`.
4. **Unrest token pile** on the player, placed by cards/Directives, cleared by riot or Festival.
5. **Hunger choice**: blocking modal at income, "N food short — choose the pop that leaves" (reuse PopulationStepper/TileListbox). State: `pendingHunger`.
6. **Revolt notice**: determinate, no die.
7. **Dole**: 3 influence → 1 food.
8. **Vote purchase** in gold or influence (2 each, max 2).
9. **Law cap 4**: "passing retires: <oldest>" on the proposal; tenure lock on the repeal list.
10. **Promote** as a dock verb — today only a map popover and a PopsTab rung.
11. **National Ideas**: (a) simultaneous secret setup pick, one Idea, immediate effect (Idea 7 reuses the add-pops picker); (b) "Buy an Idea" verb, flat ~6 influence; (c) "your Ideas" strip + rivals' in the scoreboard tooltip; (d) Codex chapter from data.
12. **Coastal-colony Port socket**; **Estate hill refusal**; **Blockade** buoy state.
13. **Move cost row** + once-per-turn gate.
14. **Three-column settlement card** — the paper's named new surface (§10).

## 4. Engine selectors the UI consumes

- `calculateEconomyProjection` → `EconomyProjection` (preview.ts:55-68): `food: FoodShortageStatus` → hunger `{short, popsToLose}`; `overCapacity` fields dead; `breakdown` lines become "n × printed value". RESHAPE.
- `happinessBreakdown` (luxury.ts:128-138) INVALID → level ledger.
- `unrestStatus` (unrest.ts:106-124): `storedHappiness`, `luxuryBonus`, `timedModifiers`, `deficitTurns` INVALID; thresholds −3/−6; add `tokens`.
- `luxuryHappinessBonus`, `activeClaims`, `ownedClaims`, `claimableLuxuriesAt`, `getLuxuryGood` survive; `activeCapPerPlayer` (3) is unruled — flag.
- `getAdjustedActionCost`, `getDiscountedGrowPopCost`, `getGrowPopCost` INVALID; `ActionStatus.cost` is the one price.
- `get*Status` family (found, upgrade, build/options, grow, move, promote, demote, calm, expedition, bank, riot insurance): `{can, reasons, cost}` UNCHANGED shape, new reasons. NEW: `getDoleStatus`, `getBuyIdeaStatus`, `getBuyVoteStatus(payment)`.
- `settlementTileYield` INVALID; `popIncome` → class column `{base 1, doubled by building}`; `settlementNetYield` RESHAPE; `settlementOverCapacity` INVALID; capacity/slots survive (colony Port socket, capital 4 flat).
- `preview*` shapes survive.
- `getActiveEffects` descriptor kinds seasonalEvent/omen/playerEvent/foodDeficit → yearCard, unrestToken, nationalIdea (law, suppressIncome, isonomia survive).
- `SEASONS`, `seasonName`, `yearOf`, `isNewYear` INVALID; `G.season` → `G.year`.
- `getOmenTable`, `getSeasonalEventCards`, `G.yearOmen`, `G.activeSeasonEvent`, `G.seasonalDrawPile` INVALID → `getYearDeck`, `G.yearDeck`, `G.activeYearCard`.
- `getEventEffectChoices` INVALID; `getAddPopsEffect`, `getEventPopTargetTileIds` survive.
- `victoryStandings`, `victoryCardsHeld`, `VICTORY_CARDS`: shape survives; `stockpile` → gold; `voiceHolder`/`assemblyPassedByPlayer` → led-by-count; minimums 3/14/5/4/2/30; `checkVictoryAtTurnStart` → year end.
- Assembly: `baseVoteWeight` → 1 + citizens; `nextDrawCost` → flat; `assemblyVeto`, `lawNeedsReplacement`, `availableLawReplacementIds` INVALID; `politicianStandings`, `activeLawIds`, `getResolutionCard`, `POLITICIANS` survive.
- Ruleset fields the UI reads directly and loses: `ladder.demoteHappinessPenalty`, `economy.foodStockpile*`, `economy.overCapacityHappinessPerPop`, `economy.unrest.severe*/foodDeficit*`, `ventureStakes.wood`, `assembly.redrawCost/vetoCost/vetoesPerAssembly`, `growPopCosts.citizens`.
- `BuildingDefinition {cost, effects[], maxLevel}` with the nine-kind effect union → `{column: PopType} | {flat}`. `ui/effects.ts` and `iconRegistry.ts` use `satisfies Record<Union>`, so they stop compiling the moment a union moves and must ship with each engine slice.

## 5. Sequencing

**Before the engine (C, ~25 rows):** delete the yield numeral and stamps, the omen mount, choice/scaling/duration branches, the Veto chip, the two-stake picker; retire cut-building tokens and glyphs; Codex rewrite by chapter; calm/venture/game-over/agora copy; chronicle by year. These read fields the engine will simply stop populating.

**After an engine slice (S, ~14 rows):** year deck, happiness level, three-column card, piece supply, hunger modal, revolt branch, Dole, vote purchase and Law-cap flow, move cost, dock verbs, National Ideas. Each maps to a §9 Tier 1 or Tier 2 item; the clamped-bank fallback lets the happiness pill ship as a plain integer meter in Tier 1 and grow the ledger in Tier 2.

**In between:** `ui/effects.ts` and `iconRegistry.ts` are content in nature but compile against the engine unions, so they move in the same PR as each union change.
