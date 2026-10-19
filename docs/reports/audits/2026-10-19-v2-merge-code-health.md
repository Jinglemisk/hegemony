# v2 merge code-health audit

Date: 2026-10-19. Scope: the v2 merge into `main` (#121, merge commit `fbc3dc2`), against the
pre-merge `main` (`fbc3dc2^1`). Line numbers are as of `42d46e2`; `src/` has not changed since
the merge.

Method: five read-only reviewers, one per area (engine, sim and AI, the new shell, board and
modals, stylesheets), each comparing v2 with v1. Findings marked ✓ were re-checked against the
code by the audit session or by the session that oversaw v2. Nothing was run.

The work is scheduled in the [code-health plan](../../plans/code-health.md), which cites the IDs
below (E engine, S sim and AI, F shell, B board and modals, C styles).

## Size

|                                              | v1                      | v2                      |
| -------------------------------------------- | ----------------------- | ----------------------- |
| Production TS/TSX                            | 177 files, 36,102 lines | 177 files, 38,002 lines |
| Tests                                        | 57 files, 11,065 lines  | 66 files, 12,292 lines  |
| CSS                                          | 11,176 lines            | 8,660 lines             |
| `as any` / `as unknown as` / `eslint-disable` | 1 / 2 / 4               | 0 / 2 / 4               |
| Production files over 600 lines              | 10                      | 12                      |

The largest growth is the bot policies (1,424 → 2,168 lines) and sim telemetry (917 → 1,922).
Most of the merge's 41k added and 27k removed lines are assets, docs and sim reports.

## Verdict

Surface hygiene improved: fewer raw literals, no `as any`, and the new stylesheets are nearly
free of raw values. Structure regressed in two ways:

- v2 built new systems beside v1's and did not retire the old ones: two verb tables, two icon
  registries, two resource chips, two token tables.
- Each new ruling (pops on the move, hunger, the capital, the Idea price, the revolt) was added
  by copying a predicate or a literal where it was needed, instead of extending a shared helper
  or the ruleset. v2 was built a step at a time, with a fresh agent per step, which explains the
  pattern.

What held: content is still typed data pinned by the match definition. The cut in `data.ts` is
removed content (the seasonal deck, the omen table, the levelled roster), not content moved into
code. Assembly vote math moved from the UI into the engine (`voteOutlook`, `restCanTurn`,
`previewDirective`). Bot personalities are a weights table, v1's hard-coded bot thresholds are
gone, and bots read only their projection. The rulebook's numbers still come from the ruleset.

## Bugs

- **Bug 1 ✓ (E2). Event pops ignore room reserved by pops on the move.** `rules.md` says pop
  grants reserve room for pops already travelling. Growth (`status.ts:447`) and Ideas
  (`ideas.ts:155`) do; the Free Settlers and Captured Laborers targets (`events.ts:63-76`) and
  the Colonists' Voyage settler roll (`tables.ts:288-310`) do not. Arrivals add pops with no
  check (`actions.ts:456-460`), and no invariant covers capacity, so a settlement whose last
  room is held by a pop on the move can end over its cap.
- **Bug 2 ✓ (E6). Action statuses miss a pending riot.** `addPendingEventReason`
  (`status.ts:460`) checks a pending event and a pending hunger pick, not `pendingRiot`; grow,
  build, found, upgrade and move report `can: true` while the transition refuses.
  `currentWorkflow` (`actors.ts:35`) already knows the riot.
- **Bug 3, unverified (C6). The setup population picker may draw under the top bar.** The base
  `.modalBackdrop` sits at z 20 (`ledger.css:12`), below `.hud` at `--z-bar` (40); the picker
  opens during setup placement (`HegemonyBoard.tsx:397`, `602`) with no scrim class.

## Engine (`src/game`)

- **E1 ✓ High. Half the Laws are flags whose mechanic lives in code.** 8 of 16 Laws are
  `{ type: "rule", rule: … }` (`assembly/types.ts:43-55`, `deck.ts`). Their numbers sit in
  `hasLawRule` checks: Manumission ×3 (`laws.ts:169`, `188-191`), Forum Rites influence 2
  (`laws.ts:109-112`), Grain Levy (`laws.ts:108`, `income.ts:421`, `511`), Guild Charter limits
  2/1/0 (`status.ts:359-372`), Master Builders (`settlement.ts:60`, `133`, `136`), Homestead Act
  (`status.ts:199`, `216-219`, `288-292`, `settlement.ts:60`), Land Reform (`settlement.ts:95`,
  `status.ts:212`), Rural Bloc (`assembly.ts:491-500`). Card text and code can drift, the tune
  panel cannot reach them, and the UI shows them as card prose in a neutral tone
  (`ui/effects.ts:234`). On all 16 Laws `text` and `tradeOff` are identical. v1 typed every Law
  effect and read them in one applier (v1 `assembly/laws.ts:140-241`, `262-330`). Fix: typed
  effects (popIncome with scope, slotDelta, colonyPieceDelta, growLimit, slaveResource,
  buildingForbidden, slaveUnrestWeight, voteWeight by kind) read by one applier; drop `tradeOff`.
- **E2 ✓ High. The room check drifted** (bug 1). Fix: one `settlementRoom(G, settlement)` used
  by growth, Ideas, event targets and trade.
- **E3 Med. Pop income is still written twice, and v2 added a third copy.** `popIncome`
  (`income.ts:80`) calls itself the one definition; `calculateIncomeBreakdown` hand-codes seven
  lines (`income.ts:256-309`), so a tuned flat yield pays in `settlementNetYield` but not in
  income. The building class raise is computed in `applyIncomeBuildingEffects`
  (`income.ts:453-466`) and again in `settlementClassColumn` (`income.ts:510-528`); the Grain
  Levy skip is in both (`421`, `511`); `519` re-checks `515`. Fix: derive the breakdown and the
  class columns from the one definition.
- **E4 ✓ Med. New v2 numbers live outside the ruleset.** `IDEA_PURCHASE_COST` is a module
  constant (`ideas.ts:13`), retyped as "6" in the refusal (`ideas.ts:93`) and the Ideas screen
  (`IdeasModal.tsx:233`); the one-purchase limit is hard-coded (`ideas.ts:89`,
  `invariants.ts:100`); v1's `assembly.tiesPass` was deleted and "ties fail" is hard-coded
  (`assembly.ts:547-549`, `647`). Fix: ruleset fields, and messages built from them.
- **E5 Med. Table-wide Law queries read seat "0"'s Ideas.** Ideas reuse `LawEffect`
  (`ideaTypes.ts:22`); the standing-effects query merges a seat's Ideas into its Laws
  (`laws.ts:43-54`); `hasLawRule` (`laws.ts:86`) and the colony-capacity loop (`laws.ts:105`)
  ask about seat "0". Latent: no Idea carries such an effect today. Fix: table effects are Laws
  only; seat effects are Laws plus the seat's own Ideas.
- **E6 ✓ Med. "A pending decision blocks you" is copied 11 times in 4 variants**:
  `status.ts:460`, `civic.ts:47`, `98`, `132`, `bank.ts:86`, `104`, `167`, `ventures.ts:23`,
  `ideas.ts:91`, `actions.ts:308`, `turn.ts:156-161` (bug 2). Fix: one reason derived from
  `currentWorkflow(G) !== "turn"`.
- **E7 Med. Shared helpers re-implemented.** `realmPops` (`core/query.ts:54`) is re-summed in
  `happiness.ts:62-64`, `victory.ts:76-96` and `assembly.ts:489-501`; slave unhappiness in
  `happiness.ts:42-46` and `laws.ts:189-190`; the classes that eat in `hunger.ts:13`, `147` and
  `income.ts:360`; "take from the fullest settlement" in `hunger.ts:29-41` and
  `tables.ts:243-248`.
- **E8 Med. Unrest thresholds are checked three times and the revolt share is a literal.**
  `applyUnrestAtTurnEnd` (`unrest.ts:33-37`), `unrestStatus` (`88-94`) and `outcomeAt`
  (`125-128`); "half the slaves" is `/2` at `unrest.ts:46` and `159`. v1's `UnrestRules`
  carried every consequence size. Fix: one exported outcome function; `unrest.revoltSlaveShare`
  in the ruleset.
- **E9 ✓ Med-low. The capital is found by position.** `setup[0] !== "colony" && settlements[0]
  === tileId` in `status.ts:357-358` and `ideaRules.ts:6-8`, plus copies in the realm pages and
  the controller (about six places). `SettlementKind` has "capital" and `data.ts:70` a capital
  row, but `placeCapital` creates "city" (`actions.ts:75`): dead data. Fix: one `isCapital`
  query; delete the unused kind and row.
- **E10 Med-low. Year cards name a code enum.** A card is `{ zeroTerm, term }`; what a term
  zeroes lives in `YEAR_TERM_COLUMNS` (`income.ts:155-164`), and `luxuryHappiness` is a special
  case (`happiness.ts:66`, `luxury.ts:65`). A new card means three edits. v1 omens carried
  resource and amount as data.
- **E11 Low-med. Content special-cased by ID or name.** "port" in five places
  (`status.ts:228`, `251`, `296`, `legalMoves.ts:717`, `actions.ts:361`); `status.ts:296`
  assumes the only colony building is the Port though buildings carry `colony: true`. Generic
  lines carry content labels: any `buildingFood` is "Sacred Fields: Temple food"
  (`income.ts:432`), any `realmIncome` is "National Idea" (`income.ts:348`), any happiness
  building is "Temples" (`happiness.ts:69`). Fix: a `claimsLuxury` flag; labels from the source.
- **E12 Low-med. Tests.** Most of the shrinkage in `assembly.test.ts` and
  `activeEffectParity.test.ts` follows removed features (veto, redraw, house items, seasons,
  omens, coupons); `laws.test.ts` covers all 16 Laws. The real loss is v1's grammar test that
  every Law has an upside and a downside from typed effects (v1 `assembly/deck.test.ts:144-170`),
  replaced by a count snapshot (`deck.test.ts:3-15`). New tests restate constants
  (`year.test.ts:201-206`, `215`, `222-231`; `deck.test.ts:30-63`). Lost direct tests: the
  empty-ballot close (`assembly.ts:466-472`) and `closeAssembly` returning the turn with income
  (`turn.ts:243-255`).
- **E13 Low. `RulesSource = Ruleset | HegemonyState` is resolved by runtime property checks**
  (`laws.ts:85`, `93-94`, `ideaRules.ts:5`, `20`, `settlement.ts:29`, `income.ts:145`, `424`).
  Slot helpers take an optional source; passing `G.ruleset` silently drops Laws and Ideas
  (`buildings.test.ts:48`). `settlementOverCapacity` (`settlement.ts:27-32`) returns 0 for any
  real state yet is shown by `preview.ts:282`, `CitiesPage.tsx:84`, `SettlementCard.tsx:38`.
- **E14 Low. The food floor in data contradicts the code.** The ruleset floors food at 0
  (`ruleset.ts:260`); `applyIncome` lets it go negative (`core/resources.ts:42-50`);
  `applyEventResourceDelta` clamps twice (`events.ts:127-140`).
- **E15 Low. v1 leftovers.** `migrateLegacyState` stamps the current schema on unversioned
  saves (`migration.ts:29-46`), against version.ts's "older saves are rejected"; the luxury
  suppression lifecycle suppresses nothing (`luxury.ts:96-113`) and its header describes a
  removed cap; `nextDrawCost` keeps an unused `_playerID` (`assembly.ts:207`); an import sits at
  the bottom of `legalMoves.ts:901`.

## Sim and AI (`src/sim`, `src/parity`)

No fairness leak: bots read `view.state`, and the projection hides the seed, RNG, deck order and
rivals' held cards.

- **S1 ✓ High. The forecast re-implements turn-end rules.** `policies.ts:477-491` (revolt,
  `floor(slaves / 2)`), `766-776` (riot and revolt tiers), `509-530` (buying calm with `payCost`
  and `calmActive = true`), `422-442` and `891-913` (food from the bank and the Dole; the cover
  formula twice). Engine equivalents: `revolt()`, `outcomeAt()`, the calm search in
  `turnEndUnrest` (`unrest.ts:41-56`, `117-159`), `dole`/`bankBuy` (`bank.ts`). v1 copied two
  rules; v2 added four.
- **S2 High. `expectedRiot` interprets the riot table by hand** (`policies.ts:674-717`): roll
  clamp, last-row fallback, stockpile floor, `destroyBuilding` fallback and `popLossIfShort`,
  copied from `tables.ts:54-120`; any other effect type is worth 0. `chance.ts` shows the right
  pattern (real transitions over every die face).
- **S3 ✓ High. The 14-year game is hard-coded.** `policies.ts:2077` (`14 - G.year`, while
  `incomesLeftInGame` at `380` uses `yearDeckSize`), `cli.ts:761` (batch turn cap 56),
  `format.ts:223-224` (years 8 and 10), tests set `G.year = 14`
  (`activeEffectParity.test.ts:253`, `policies.test.ts:801`).
- **S4 Med-high. Assembly voting copies engine selectors.** Bribe affordability
  (`policies.ts:1681-1687`) is `votesLeftToBuy` (`assembly.ts:519-526`); `projectedPlainVote`
  (`1737-1754`) re-tallies `voteOutlook` (`assembly.ts:533-545`); the `votePurchaseLimit` Idea is
  valued with a literal `>= 6` (`2163`) that mirrors bribe cost × 3.
- **S5 Med. Content special-cased by ID.** `leanYearChance` hard-codes `plainsFood |
  freemenGold` (`policies.ts:866-877`); the `slotExempt` Idea is valued only for `"port"`
  (`2117-2148`); telemetry's `influenceSink` checks `"concession"` (`telemetry.ts:235`); reach
  filters `"riot"` and hard-codes material, payment and class lists (`reach.ts:22`, `26-41`).
- **S6 Med. `ideaOpportunityValue` is an if-chain of unnamed numbers** (`policies.ts:2076-2168`):
  10, 12, 6, 3, −1, /2; the ×10 and 10/8 scales re-spelled (`2091`, `2100`, `2137`, `912`,
  `981-991`) instead of `stockValue`/`popValue`; `minimums.happiness + 2` twice (`803`, `2112`).
  Fix: an exhaustive switch over named values.
- **S7 Med. The parity manifest points at the wrong functions.** Table effects name
  `onePlyLookahead` (`featureParity.ts:178`); riots go through `resolveRiotByRule`/`expectedRiot`
  and ventures through `ventureOutcomes`. Five Idea effects share the evidence string
  `"ideaOpportunityValue"` (`206-216`), and the test only checks the substring exists
  (`featureParity.test.ts:106-110`).
- **S8 Med. `buildReport` is a ~615-line function with pasted cuts** (`telemetry.ts:1171-1786`):
  idle-slave math twice (`1285-1306`, `1478-1494`), Assembly sums twice (`1501-1509`,
  `1716-1730`), `classes` ignores `policyOf` (`1615-1621`), per-game division inlined six times
  beside `perGameCount`, and four shapes for "by personality". v1 had no per-policy cuts.
- **S9 Med. Telemetry counts the same fact two or three ways.** Assembly influence at base
  prices (`926-937`) and from the stock change (`998-1007`); revolts from counters (`1082`) and
  per move (`871`); votes bought and Voice claims likewise.
- **S10 Med-low. The search cache key is a hand-kept field list** (`policies.ts:217-232`).
- **S11 Med-low. Small re-derivations.** `upgradableColonies` (`2066-2075`) copies part of
  `getUpgradeColonyToCityStatus`; `savingValue` (`1116-1123`) re-derives build, upgrade and
  founding eligibility; `evaluateSmart` re-sums arriving slaves (`946-955`); telemetry
  `classCount` (`154-159`) and its in-transit count (`108-110`) copy engine helpers.
- **S12 Low. Leftover knobs.** `policyEconomyThresholds` (`146-148`); identity or zero knobs
  `LATENT_SLOT_SHARE = 1`, `CONTEST_WEIGHT = 1`, `PROPOSE_THRESHOLD = 0`, `DRAW_THRESHOLD = 0`,
  `drawBuffer = 0`; `politicalStanding` (`1471-1478`) wraps nothing; `FRONTIER_WEIGHT = 2`
  (`1915`) duplicates `DEFAULT_WEIGHTS.frontier`; an orphaned doc comment (`778-791`).
- **S13 Low. Fairness holds by convention.** Bot functions take `HegemonyState`, not
  `ProjectedGameState`; `setup.ts:69` runs `choosePlacement` on the raw state (v1 did too).
- **S14 Low. Tests pin tuning numbers** (`policies.test.ts:50-57`, `144-163`,
  `ideasPolicy.test.ts:123`, `activeEffectParity.test.ts:344-355`); two UI tests sit in the
  sim block (`activeEffectParity.test.ts:275-332`).
- **S15 Low. Policy dispatch is copy-pasted.** Six policies repeat the Assembly → setup → search
  branch (`policies.ts:313-341`, `1235-1245`, `1863-1874`, `1927-1937`, `1985-1997`) beside the
  `personalityPolicy` factory (`1999-2011`); `docs/reference/ai.md` keeps a hand copy of the
  weights table.

## The shell (`src/components/frame`, `src/ui/frameFormat.ts`, `src/ui/frameSelectors.ts`, `src/client/controller.ts`, `src/components/HegemonyBoard.tsx`)

The engine is still the authority for costs and availability. What regressed is explanation and
single sourcing: `src/components/frame` uses `MechanicsDetails` and `ResourceChips` zero times.

- **F1 High. The verb discs drop the engine's blocked reasons.** Each option's `hint` is fixed
  copy whether or not it is blocked (`discs.ts:209`, `226`, `242`, `280`, `313`, `345`, `355`);
  only Ideas reads `status.reasons` (`324`). Fan buttons have no tooltip (`VerbDiscs.tsx:458-497`),
  so a greyed option gives no reason, and touch gets no first-tap explanation. v1's
  `CommandVerb` wrapped each verb in `Tooltip` and `MechanicsDetails`.
- **F2 ✓ High. Two verb tables, one half dead.** `discs.ts:140-162` takes 4 of 7 rows from
  `VERBS` (`board/command/verbs.tsx:149-238`) and hand-builds the rest; the `VERBS` rows for
  grow, build and calm and the flags `canGrowPops`, `canBuild`, `calmUsed` feed nothing, yet
  `HegemonyBoard.tsx:236-275` scans every tile for them each render. Handlers are wired three
  times (`VerbHandlers`, `DiscHandlers`, RealmPanel props).
- **F3 High. A second icon registry, already disagreeing.** `frameFormat.ts:27-50` plus
  `POP_ICON` copies (`discs.ts:103`, `Island.tsx:50`, `CitiesPage.tsx:25`, `LadderPage.tsx:14`,
  `SummaryPage.tsx:21`) and `Alarms.tsx:52`'s partial switch. `BUILDING_ICON` is
  `Record<string, string>` with `?? "buildings/build"` fallbacks. The Port shows
  `events/voyage` though `buildings/port.svg` exists; the Estate shows `buildings/villa`; luxury
  goods are `events/voyage` in two places and `resources/luxury` in Alarms. v1's
  `iconRegistry.ts` is typed `satisfies Record<BuildingId, GlyphId>` with a uniqueness test.
- **F4 ✓ partial, Med-high. Realm pop counts summed by hand.** `publicCensus`
  (`frameSelectors.ts:146-168`) re-implements `realmPops` (it does count pops on the move);
  `SummaryPage.tsx:50` and `LadderPage.tsx:72` sum settlement pops only, so "People" misses pops
  on the move.
- **F5 Med-high. Realm pages invent reasons and prices.** The Ladder always says "No legal move
  now; one ladder step a turn" (`LadderPage.tsx:39-53`, `94`); `bestCost` seeds its reduce from
  the base price, so a Law that raises it still shows the base; Build words refusals through the
  UI ladder `buildRefusal`, whose guard test v2 deleted (`BuildPage.tsx:74`, `121-125`); Found
  shows only `reasons[0]` (`PlacePages.tsx:95`); the cheapest-price logic is written twice
  (`discs.ts:130`, LadderPage).
- **F6 Med. Own price and chip atoms.** `Price` and `Chips` (`parts.tsx:50-91`) print bare
  numbers beside `alt=""` icons, so the resource is never announced; they ignore
  `RESOURCE_ORDER` and render nothing for a free action; `spoken()` duplicates
  `formatResourceCost`.
- **F7 Med. Hand-built tooltips and popovers.** `BoardTip` (`Island.tsx:399-427`) clamps its own
  position and shows on hover only; `EndTurnConfirm` and `ThreatAlarm` (`EndTurn.tsx:183-269`,
  `MomentDiscs.tsx:57-166`) hand-roll outside-click and Escape with no focus handling; `placeFan`
  (`VerbDiscs.tsx:89-247`) reads `[data-exclude]` and `.island .settle` across the document;
  fans use `role="menu"` with every item `tabIndex=0`, which the presentation contract forbids
  without the managed-focus pattern.
- **F8 Med. Forced moments are loose flags.** The `ActiveModal` comment
  (`HegemonyBoard.tsx:85-97`) says one union prevents "six independent booleans"; v2 added
  `riotResultOpen`, `yearRead`, `yearFaceOpen`, `hungerAsk`, `handedOver`, `draftDone`,
  `gameOverDismissed`, a chain of `*Shown`/`momentAhead` flags, two HungerModal mounts and
  EndTurn's private confirm (`108-201`, `762-781`). The decision host that
  `frontend-presentation.md` and the trade plan describe does not exist in the code.
- **F9 ✓ Med. The controller holds dev fixtures and a mutable global.** About 25
  `MOMENT_QUERIES` builders edit state with immer, bypassing commands, selected by the `dev`
  query parameter without an `import.meta.env.DEV` gate (`controller.ts:73`, `84`, `113`,
  `142-433`); `DEV_SHELL` is module-level mutable state that HegemonyBoard reads during render
  (13 reads); it forced dev-only props into production components (`confirmOpen`, `threatOpen`,
  `defaultOpen`, `holdBack`, `replayFrom`, `titlesFrom`, `momentsFrom`).
- **F10 Med. Render churn.** `discGroups(...)` runs inline with fresh closures every board render
  (`HegemonyBoard.tsx:531`); VerbDiscs' effect depends on `groups` (with an `eslint-disable`), so
  document listeners are re-bound every render (`VerbDiscs.tsx:375-420`); the island runs
  `layoutLabels` on every pan pointermove (`Island.tsx:531-548`); three global hotkey listeners
  each check "is the user typing".
- **F11 Med-low. The turn gate re-derived per page** (`BuildPage.tsx:74`, `MarketPage.tsx:33`,
  `LadderPage.tsx:79`, `PlacePages.tsx:32`), with its own strings and without
  `hasPendingPlayerEvent`; `isTurnOpen` (`verbs.tsx:256`) is documented as the one gate.
- **F12 Low-med. Unrest rules in the UI.** TopBar recomputes riot and revolt from the thresholds
  (`TopBar.tsx:115-116`); `happinessDisplay` re-adds the happiness terms
  (`frameSelectors.ts:104-126`); "half your slaves leave" is written four times
  (`TopBar.tsx:143`, `Alarms.tsx:45`, `EndTurn.tsx:230`, `moments.tsx:139`); the Assembly alarm
  quotes base costs unlabelled (`Alarms.tsx:250`).
- **F13 Low. Content by ID and stale hooks.** `id === "port"` (`BuildPage.tsx:34`,
  `SettlementPage.tsx:144`); `TITLE_SHORT` (`frameFormat.ts:78`) and `IDEA_ICON` per ID; raw
  building ids printed (`CitiesPage.tsx:155`); `id === "1"` picks dark ink (`TopBar.tsx:242`,
  `TurnNotice.tsx:35`) instead of a glaze field; `POP_WORD` (`moments.tsx:41`) duplicates
  `formatPopLabel`; SummaryPage's `MOOD` maps words to themselves; the screenshot hooks target
  `[data-option="build-slaves"]`, which never exists (`VerbDiscs.tsx:517-535`); "The civic'
  buildings" (`discs.ts:266`).

## Board, modals and the Assembly sitting (`src/components/board`, `src/ui`)

The engine side improved: vote math, directive previews, founding and pop-economy previews and
victory leaders come from engine selectors. The regression is presentation: the new surfaces
skip the shared primitives and show prose where typed effects exist.

- **B1 ✓ High. Assembly controls lost their action primitive.** Draw, Repeal and Buy vote use
  native `disabled` and `title={reason}` (`AssemblySitting.tsx:247-256`, `279-290`, `712-723`);
  Propose, Discard, Yea and Nay explain nothing. Reasons are unreachable by keyboard and touch.
  v1's `AssemblyAction` carried Tooltip, MechanicsDetails, `aria-disabled` and effective cost.
- **B2 High. Assembly cards are prose only.** The drawn card (`AssemblySitting.tsx:421-422`),
  ballot items (`570`), results (`831-833`) and the Agora's standing Laws (`AgoraTab.tsx:58-60`)
  show `card.text`; only the sitting's standing-Law tooltip uses `ResolutionDetails`.
- **B3 High. National Ideas are prose only.** Ideas carry typed effects and `presentLawEffect`
  has Idea cases, yet `IdeasModal.tsx:117`, `251` and the rulebook's Ideas chapter show
  `idea.text`; disabled Ideas show no reason (`106`) though `getTakeIdeaStatus` returns them;
  `233` types "6 influence" while `179` reads the constant.
- **B4 ✓ Med-high. The riot left the shared dice-table surface.** `EventTableModal`'s docblock
  still says the riot mounts it; `RiotModal` builds its own, and its result card carves only
  `row.effects[0]` (`RiotModal.tsx:91`), so "lose a pop and a building" shows "−1 pop".
- **B5 ✓ Med. The riot screen hard-codes data.** "+1 to the roll each" (`RiotModal.tsx:260`),
  "you roll a d6" (`202`), "puts the lowest row out of reach" (`214`), though insurance
  `modifier` and the table `die` are data; insurance drops `status.reasons` (`313`);
  `INSURANCE_ICON` and `blowIconOf` (`36`, `42`) restate `TABLE_EFFECT_GLYPHS`; native
  `<select>` (`288`, and `IdeasModal.tsx:142`) where `TileListbox` exists for this.
- **B6 Med. Two resource-chip primitives.** Frame `Chips`/`Price` are used by the sitting, the
  Ideas modal and the year card (see F6).
- **B7 Med. Two icon vocabularies.** `Ico path="family/name"` strings and per-ID maps
  (`RESOURCE_ICON`, `BUILDING_ICON`, `IDEA_ICON`, `TERM_ICON`, GameOverModal's `TIEBREAK_ICON`)
  beside the typed `Icon glyph` registry (see F3).
- **B8 Med. The year card is carved again in the modal.** `blowOf` and `TERM_NOUN`
  (`YearCardModal.tsx:19-48`) duplicate `YEAR_TERM_LABELS`/`presentYearCard`; `movesLevel`
  (`51`) hard-codes `luxuryHappiness`; the riot/revolt warning (`164-168`) re-implements
  `outcomeAt`.
- **B9 Med. The pass rule is restated in the UI.** "Tie fails / strict majority" in `sitting.ts`
  `voteLine` (~`102-104`), `verdictWords` (`AssemblySitting.tsx:866`), `headline` (`875`),
  `outcomeWords` (`891`) and `680`; "carried without effect" is inferred from
  `yea > nay && !passed` because `AssemblyResult` has no outcome kind.
- **B10 ✓ Med. Copy-pasted formatters.** Number words five times (`frameFormat.ts:102`,
  `rulebook.tsx:72`, `AgoraTab.tsx:23`, `HungerModal.tsx:16`, `IdeasModal.tsx:13`); `listed`
  (`formatters.ts:81`) and `list` (`sitting.ts:85`); `cap` (`AssemblySitting.tsx:1023`) and an
  inline capitalize (`HungerModal.tsx:89`) beside `capitalize`; "seat name or you" three times;
  two minus signs (U+2212 in `sign`, ASCII in `effects.ts`).
- **B11 Low-med. The sitting's wording layer.** 1,023 lines with about 14 string helpers in the
  JSX; the Law/Directive label built at `245`, `419`, `611`, `1012`; `AssemblyDock` (`164-170`)
  adds a window Escape listener with no deps array and probes for `[aria-modal]`.
- **B12 Low. Base costs on action surfaces.** "Draw from a politician · {drawCost}"
  (`AssemblySitting.tsx:232`), `482`, `610` read the ruleset base instead of `draw.cost` or the
  amount paid.
- **B13 Low. New literals in the rulebook.** "+1 for every Temple" (`rulebook.tsx:730`), "eats 1
  food" (`380`), "makes 1 of the terrain's resource" (`248`), "half your slaves" (`769`), content
  names (`734`, `739`, `809`); `AgoraTab.tsx:127`, `130` check `politician.id === "stratokles"`.
- **B14 Low. Leftover v1 scaffolding.** `verbs.tsx` docblock (`11-19`) and tail (~`288`)
  describe the deleted CommandVerb/CommandDock; `buildRefusal.ts:8-13` justifies itself by the
  deleted SocketPicker; `ledger/slots.ts:11` wraps `buildingGround`; `types.ts:5` `LedgerTab`
  names v1 tabs; `helpers.ts` exports `createEmptyResources` used only inside.
- **B15 Low-med. No decision host, in v1 or v2** (see F8). `useState` count in HegemonyBoard went
  from 12 to 15.

## Styles (`src/styles`)

|                                                | v1                 | v2                 |
| ---------------------------------------------- | ------------------ | ------------------ |
| Raw colours outside token definitions          | 273 (6.2 per 100)  | 122 (3.3 per 100)  |
| Raw px                                         | 1,427              | 609                |
| Literal z-index                                | 35 of 44           | 13 of 22           |
| `!important`                                   | 0                  | 0                  |

`frame.css` has 2 colour literals and 7 raw px (mostly media queries); `sitting.css` 2 and 0.
`ceremony.css` is the outlier: raw px 150 → 237, colours 22 → 30.

- **C1 ✓ High. Two parallel token systems.** `frame.css:15-172` declares `--s-1`…`--s-16`
  beside base.css's `--sp-1`…`--sp-5` (`--s-4` is 16px, `--sp-4` 20px); `--f-name`/`--f-body`
  equal `--disp`/`--body`; frame type sizes are fixed px while `type.css` uses rem roles that
  shrink with `--ui-scale`. Usage: `--s-*` 327 against `--sp-*` 5. `type.css:82-113` patches the
  gap with component selectors. `--t-` means terrain, type size and time.
- **C2 High. The v1 token block in base.css is dead** (~`187-378`): 77 tokens with no consumer,
  including all v1 chrome geometry, the sea textures, four z rungs and `--sp-2`…`--sp-5`; its
  comments cite the deleted `ui/chromeMetrics.ts`; `.frame` (`frame.css:214`) redraws the sea
  instead of `--sea-ground`; `--panel-w` and `--chrome-top` live only for the dev tune panel.
- **C3 High/med. v2 fights v1 primitives.** `.sharedTooltip` three times (`overlays.css:13`,
  `frame.css:298`, `1132`); `.logModal` (`base.css:522`) undone three times (`frame.css:2198`,
  `2751`, `sitting.css:13`); `.primaryButton` undone (`frame.css:2417`, `2424`); `.neg` recoloured
  and `.num` re-fonted app-wide (`frame.css:268-278`); `.sockets` in two files; `.roster`
  overriding `panels.css:58`. About 76 reset declarations exist to undo these.
- **C4 Med. Shared styles copied.** The caps label in 12 rule blocks in frame.css, 2 in
  sitting.css, 8 in modals.css beside `.caps` (`frame.css:305`); four kickers (`2227`, `2525`,
  `2691`, `2780`) plus `.sit-kicker`; name style 16 times; ivory face 10 times; four buttons
  (`.confirm-btn` `2719`, `.act-btn` `2119`, `.rung-btn` `1814`, `.sit-btn` `sitting.css:100`)
  plus `.primaryButton`; the modal card and scrim copied (`frame.css:2749-2751`,
  `sitting.css:10-13`).
- **C5 Med. ceremony.css ignores the new tokens.** 86 of its 464 new lines carry raw px, 7 use
  tokens; the card shadow stack pasted three times (`99`, `412`, `512`); the art fade twice
  (`123`, `438`); a raw 72px size in `font:` shorthand (`419`).
- **C6 Med. The z-index scale is half adopted** (`overlays.css:15`, `47`, `modals.css:13`, `375`,
  `ledger.css:12`); the tooltip (200) now sits below `.sharedPopover` (950); 4 of 11 named levels
  are unused (bug 3).
- **C7 Med. Board text geometry duplicated in CSS and TS.** `frame.css:1275`, `1283`, `1306`,
  `1358` against `Island.tsx:40-44`, `117-120`, `497` with hard-coded 16, 18, 12, beside a
  `tokenPx()` helper.
- **C8 Med. frame.css is ordered by history.** Tokens, the mock layout, an appendix of app states
  (`1319`), the realm pages (`1486`), then an unlabelled tail (Ideas draft `2185-2490`, toasts,
  the second half of the alarms, threat panel, end-turn confirm, turn notice); 18 component
  prefixes have rules in two or more clusters over 200 lines apart.
- **C9 Low. Dead CSS.** About 20 of 739 classes and 6 of 16 keyframes are unused: `.idea`,
  `.idea-name` (`frame.css:917-929`), `.settle-lines`/`.settle-line` (`1037-1055`),
  `.endturn-badge` (`1084`), `.panel` twice (`base.css:530`, `546`), `.alarm`, `.cityIncome`,
  `.tier`, `.gap` (`panels.css`), `.seat` (shell.css) and others; `spineFlashUp/Down`,
  `resourceFlashIncrease/Decrease`, `placementCandidatePulse`, `detailTooltipIn`; `board.css` is
  a 16-line comment still imported.
- **C10 Low. Palette rules broken.** "You" is player 4's colour (`frame.css:2316`,
  `sitting.css:282`, `538`), though player colours mean owner only; shadows use pure black; radii
  borrow spacing tokens.
- **C11 Low. Nested boxes in the sitting.** Outlined `.sit-pol` cards with bordered buttons inside
  the ivory modal (`sitting.css:203`), a pill inside `.sit-card` (`271`, `282`), an outlined
  ivory box on an ivory card (`478`).
- **C12 Low. The UI check script cannot see most of this.** `scripts/check-ui-system.mjs` counts
  `font-size:` and hex only, so 124 `font:` shorthands and 122 `rgb()` literals pass unseen.
