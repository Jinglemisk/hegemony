---
status: active
phase: "v2"
updated: 2026-10-10
---

# v2 migration: the shallow economy in the Hybrid arc shell

## Outcome

On the branch `feat/v2`, Hegemony plays by the shallow-economy rules inside the Hybrid arc
shell, while `main` keeps today's game. A player reads every income as counts on printed
numbers and every price as one number, and acts through six verb discs on the realm panel's
curved edge. The owner can run the old and new games side by side and decides when
`feat/v2` replaces `main`.

## How to run this plan

The owner starts every session with the same sentence, **"continue the v2 migration"**, in
the worktree `hegemony-v2` next to the primary checkout, on branch `feat/v2`. That session
then:

1. Pulls `feat/v2`, reads this plan, and finds the first unticked step and its stretch.
2. If the owner's message answers an open question, folds the answer into Settled inputs
   and removes it from `docs/questions.md` in the same commit.
3. If the stretch's **Before** condition is unmet, presents that question from
   `docs/questions.md` with its recommendation, and stops.
4. Otherwise runs the stretch in its **Mode**, stopping at its **Stop** point or earlier on
   an early-stop condition.
5. Ends with a short report: steps done, commits, defaults picked, and what the owner must
   do next.

Every step:

- Works on its own branch, `v2/step-NN-short-name`, cut from the latest `feat/v2`.
- Builds the step and updates the shell panels it touches.
- Passes `npm run check`, `npm run lint`, `npm run test:run`, `npm run test:parity`, and a
  bot batch through `npm run sim` (commands in [simulation](../reference/simulation.md)).
- Is built by a `codex exec` worker, which reviews its own diff; the session leads and verifies.
- Opens a PR into `feat/v2`, titled like "(Feature) v2 step 3: pops and tiles", with a short
  body per the owner's PR style. Its last commit ticks the step's box here with the PR
  number and a one-line evidence note.
- Merges the PR with a merge commit once CI passes, which runs the full suite, browser tests
  included, on every PR. The step branch stays; the owner decides about deleting branches.

Standing rules:

- When a stretch runs several steps, each step runs in one `codex exec` run briefed with this
  plan and that step, one after another, so the session's own context stays small. Steps
  never run in parallel, except Step 14 when the owner asks for it.
- Early stop: the same failure surviving two real fixes, a conflict with Settled
  inputs, or a rule with no simple default. Otherwise, when a step meets a rule the paper
  leaves unstated (how half a slave rounds, riot thresholds, whether the capital uses a
  city piece, starting stocks, first-seat rotation), it picks the simplest default,
  records it under Settled inputs, and moves on.
- Keep fan-out small: one agent per step, no large workflows. Round 1 of the layout work
  cost about 6M tokens and hit the weekly usage limit, and workflow resume did not replay
  finished agents. Committing per step means a usage limit costs at most the step in
  progress. After Step 1 the owner checks `/usage` to see what one step costs.
- `main` receives docs only until the owner merges `feat/v2`. If `main` has moved, merge it
  into `feat/v2` at the start of a stretch; never rebase `feat/v2`, since it is pushed.
- Nothing is merged into `main` except by the owner. Step 15 ends by opening the one PR
  from `feat/v2` into `main`.

## Non-goals

- Player trade. [Its plan](player-trade.md) stays blocked; the bank's gold corridor bridges
  until it ships.
- Multiplayer and server work.
- Final tuning. Every number in the paper is a placeholder: Step 11 settles structure and a
  human session settles feel.
- More HTML mock rounds. The mock is the reference; the remaining surfaces are designed in
  the app.

## Settled inputs

**Systems.** The [direction paper](../reports/balance/2026-09-05-shallow-economy.md) v0.2,
with the owner's rulings in its section 8, plus these later rulings:

- One Temple and one Granary per settlement, like every building (2026-09-25).
- No per-player cap on active luxuries; each counts +2 happiness (2026-09-25).
- Setup keeps one citizen; every later citizen comes by promotion (2026-09-25).
- Happiness is the level (2026-10-02, the answer to Q77): a state read off the board each
  turn, never banked. Level = Temples + 2 per luxury − half the slaves − Unrest tokens,
  +2 if calm was bought this year. A level of −3 this turn is −3 next turn if nothing
  changes. Riot at −3 or below, revolt at −6 or below, per the paper's section 5.7. This
  replaces the bank-first ruling of 2026-09-06: Step 4's batch showed the bank slides
  ([report](../reports/simulation/2026-10-02-v2-step4-bank-and-food.md)).
- Riots and revolts are checked at the end of the player's own turn, before it passes
  (owner ruling, 2026-10-03). The player can buy calm, build a Temple, or change their
  pops before the check. Ending at −3 or below starts a riot; at −6 or below, a revolt.
  Calm bought this turn counts, including for the last seat before the year turns.
  Victory stays at turn start; income and hunger keep their timing. This supersedes
  the start-of-turn check in Steps 5 and 6.
- No `/code-review ultra` on this migration (owner, 2026-10-02). Each step's own
  medium-effort review is the review.
- National Ideas follow [their plan](national-ideas.md): one picked at setup, one bought
  with influence.
- Luxury goods as shipped on `main`: coastal only, claimed by a Port that is never free.

Step 13 rulings (owner, 2026-10-06), from the
[ceremony design](https://claude.ai/artifact/Wxe7eJMJjccaGUwc1fWMsN), which is Step 13's spec:

- National Ideas are an open draft. Seats pick in turn, continuing the placement snake,
  and each pick is public at once with the picker's icon beside the Idea. An Idea is held
  by one seat only, so in-play purchases come from the Ideas still untaken. This replaces
  the secret simultaneous pick.
- Hunger: the player picks which freemen or citizens leave, by settlement; the card opens
  with freemen preselected. Slaves eat nothing and are not offered. Bots choose with their
  scorer. This replaces the engine's freemen-first pick and matches the paper's section 5.3.
- The Assembly is a modal over the shell, not a takeover. Minimised, it is read-only: the
  map, realm and consult pages read normally, with no actions and end turn locked.
- The year card shrinks into the first disc of the alarms row; the top bar keeps only the
  year and the cards left.
- A turn notice comes before each turn and each Assembly proposal: a small card over
  the table with one Begin button. Its wording belongs to the mode of play (owner,
  2026-10-08). Hotseat, where people share one screen and take the seats in turn, is the
  only mode today, and there the card reads "Pass the screen" above "Nikos's turn" or
  "Nikos's proposal". When the game is played over a network the same notice will read
  "It's Nikos's turn" and never the pass-the-screen line. The card replaces the
  full-screen pass-the-seat cover approved on 2026-10-06. The screen stays with the last
  seat until Begin, so the next seat's fate card and Assembly draw wait behind it. It
  has no on/off switch and never shows against bots.
- A revolt with no slaves costs nothing beyond clearing the tokens. This is intended.

After the independent audit (2026-09-28):

- The shell is still built before the systems.
- Hunger scales with the shortfall: one pop leaves per unfed mouth.
- Hunger is checked at the end of the player's own turn, before the riot check (owner,
  2026-10-08, the answer to Q79). Who eats and what food is stay as they are: freemen and
  citizens eat 1 each, slaves eat nothing, and food is a banked stock. Income may take the
  stock below zero during its owner's turn, and the board shows the shortfall; the player
  can cover it (bank, Dole, Granary) before ending the turn. Ending short, one pop of the
  player's choice leaves per missing food and food returns to zero. Settlements eating and
  food as a level were rejected on the
  [Q79 note](../reports/balance/2026-10-06-q79-food.md)'s evidence. This supersedes
  Step 3's hunger at income; Step 17 builds it.
- Pops on the move count (owner, 2026-10-10). A pop in transit is still in its realm: its
  slaves count toward happiness and its pops toward the titles that count pops. Before, a
  slave moved for 1 food was off the count at the riot check.
- No stock goes below zero, except food during its owner's turn (owner, 2026-10-10). Only
  food had a floor, so Civic Pride's 1 gold a city took gold below zero. A charge now takes
  what the seat holds and no more.
- Victory is checked at the start of each player's own turn, as today, so the last seat in
  a year cannot win unanswered.
- Two colonies of different players may share a tile, as today. They split the tile's
  slots (see the work-slot ruling below), so the half-share goes with the printed yields.
  Upgrading one to a city evicts the other, as today. Shared tiles keep the map from being
  walled off.
- Tiles keep their terrain's resource type and their coast; the printed amount goes and the
  slot counts are re-numbered by the work-slot ruling below.

Work slots (2026-10-01, the answer to Q78, landmark tiles):

- A tile's slots are one pool shared by buildings and working slaves. Each open slot holds
  one working slave, who makes 1 of the terrain's resource; each building takes one slot.
  Seven slots and no buildings is seven working slaves; raise one building and six can work.
- Only slaves take slots. Freemen and citizens live in the settlement without one.
- Slaves beyond the open slots sit idle and make nothing, as slaves on hills do today.
- Slot counts are re-numbered from today's 1 to 4 to roughly 2 to 7. A landmark is a 6 or
  7 and a poor tile a 2 or 3. Today's rich tiles get the high counts: the plains that print
  10, 8, 6 and 6 food, and the 6-stone quarry. A landmark is a tile with many slots, and
  nothing else is printed on it.
- A colony cannot build, so all its tile's slots are work slots, capped by its 4 pops.
- Two colonies sharing a tile split its slots, which makes a landmark a contested site.
- The capital's flat 4 slots go. A capital uses its tile's number like any city.
- Hills are unchanged: their slots hold buildings and their slaves make nothing.
- The Estate takes a slot, so it costs one working slave and doubles the rest. It pays
  only on a tile with 3 or more slots.
- The risk is food. Plains slaves are the only food from land, and slots cap how many can
  work. Hand arithmetic on today's map gives 20 plains slots for four players against 44
  printed food today, so the plains are re-numbered upward. Step 4's bot batch checks it.
- Luxuries stay uncapped; Step 11 measures whether they decide Beloved.

**Shell.** The [Hybrid arc mock](../reference/design/shell-v2/mock/index.html), picked by
the owner on 2026-09-28 from seven candidates. Its [brief](../reference/design/shell-v2/BRIEF.md)
and [gate script](../reference/design/shell-v2/gates.mjs) sit beside it.

- Layout after Imperator: Rome. A quiet top bar carries resources, rival icons and consult
  icons. A large bottom-left realm panel has a curved top-right edge, the six verb discs
  sit on that edge, and end turn is bottom right. The map is a canvas the player drags to
  pan.
- Discs, in order:
  - Grow: slave or freeman.
  - People: Promote, Demote, Move.
  - Expand: Found a colony, Upgrade to a city.
  - Build: a class first (Slaves, Freemen, Citizens, Civic), then that class's buildings.
  - Civic: Calm with gold, Calm with influence, the Dole, Venture.
  - Exchange: a resource first (wood, stone, food), then buy or sell.
- Every fan lists all its options, opens after a 0.5 s hover, and backs out one level on
  Escape. Hotkeys 1–6. Grow as its own disc filled an unnamed sixth slot and can be swapped.
- Rivals are player icons; hovering one shows pops by class, cities and colonies.
- Verb names are written under every icon. Imperator raster icons are used throughout:
  `assets/icons/placeholder` plus the unrest set in `docs/reference/design/shell-v2/icons`.
- The brandbook's visual language stays. The bar is fidelity and execution.
- The two KYKLOS triage ledgers are archived; [ui-remaining](ui-remaining.md) is the one
  UI ledger.
- Checks carried from the judges: an open fan never covers a city name; far fan options
  stay open while the pointer travels to them; Build may skip the class step when a class
  has one building; consult icons get labels or tooltips.

**Defaults picked in Step 1** (2026-09-30):

- Until Step 2, the discs act on a click: a one-option disc runs it, a disc with
  several opens a plain fan. People's Promote and Demote open the Ladder page, and
  Exchange opens the Market page, until their fans carry the choice.
- The consult icons open one sheet on the right, below the bar; one page at a time.
- The realm opens on the viewer's first settlement; picking one of your own tiles
  opens that settlement's page.
- The season card stands where the year card will; the omen is in the year's tooltip.
- A rival's turn shows their glaze and blazon on the end-turn disc.
- `?dev=bots` lets the sim's `master` policy play every seat in the browser.

**Defaults picked in Step 2** (2026-09-30):

- Grow lists Slave, Freeman and Citizen, since v1 still grows citizens; the click
  grows a slave. The citizen option goes when the v2 rule lands.
- Promote and Demote each open a second fan of rungs (slave to freeman, and so on),
  because v1's ladder moves one named pop.
- Build's classes over v1's roster: Slaves (Workshop, Villa), Freemen (Marketplace),
  Citizens (Forum, Gymnasion), Civic (Temple, Granary, Aqueduct, Odeon, Port). A class
  with one building is that building.
- Civic's click calms with gold; Calm with influence and Venture sit beside it. Calm
  acts at once, so its dialog is gone. Venture still opens its dialog to pick the
  expedition and stake. The Dole arrives with its rule.
- Exchange trades at once and closes the fan.
- Picking a pop or a building arms the map for exactly that; the settlement's popover
  opens on it. A click on an armed disc gives the map back.
- Fans keep clear of every settlement's mark and every mooring, not only city names,
  and stay open while the pointer is within their span. Where the sea beside a disc is
  too narrow for an arc, a fan opens as a compact block beside it.
- The realm's pages fit the sheet, with nothing scrolling (the owner's "fit" variant,
  2026-10-01). Build picks the place first, then every building as one cell priced for
  it; Cities, Ladder and Market are ledger rows.
- The last realm tab shows whatever the map last picked: the sea gives the realm's
  overview, a settlement its page (a rival's is read-only), an empty tile its ground
  with a Found button, the oracle its lore and this year's sign, a mooring its good.
- Standing effects (the unrest alarm, food deficit, the omen, timed moods) are discs
  beside the ticker, tinted by sign, explained on hover. The season's modifier stays on
  the season card and standing Laws stay in the Agora.

**Defaults picked in Step 3** (2026-10-01):

- Slot table, keyed off the yield each tile used to print. Plains 10→7, 8→6, 6→5,
  4→4, 2→3 (38 slots); mountain 6→6, 4→4, 3→3, 2→3 (29); forest 4→5, 3→4, 2→3,
  1→2 (51); hills stay 3, 3, 4, 3, 3; the oracle has none.
- On a shared tile the colony founded first takes the odd slot.
- Starting food stays 12.
- Setup places exactly one citizen, in the capital. The other five starting pops are
  slaves or freemen as the player chooses.
- Nobody assigns slaves. Working slaves are the lesser of the slaves and the open
  slots; the rest are idle and still count toward unrest.
- Hunger picks for the player: freemen leave before citizens, each from the
  settlement holding the most of them. It has no first-income grace, and food is
  floored at zero for table and card losses too.
- The hunger alarm shows while food income is negative, with the incomes the stock
  still covers.
- v1's buildings on the slot pool until Step 4: every building takes a slot, the
  Workshop's bonus counts working slaves only, the Villa keeps its flat +2, and the
  +2 slot bonus cities had is gone. Pop capacity stays 10 for a city and 4 for a
  colony until Step 4.
- The citizen grow coupon (Citizenship Rolls) left the player deck. New Citizen still
  adds a citizen until Step 7 replaces the deck.
- An empty tile prints its slot count beside its resource; a settled tile draws its
  slots as pips, solid for a building, tinted for a working slave, hollow when open.
- Bots value a tile by its slots, and their income projection runs the real hunger
  rule.
- The state schema is version 3. Saves from `main` are rejected.

**Defaults picked in Step 4** (2026-10-02):

- Starting stocks are 8 wood, 4 stone and 4 gold: v1's 20, 10 and 10 scaled by the two
  fifths the grow price fell by. Food stays 12. Fast Start doubles all four.
- The capital is its own piece and counts against neither supply. Setup's colony uses a
  colony piece, and a colony a rival's upgrade evicts gives its piece back.
- One of each per settlement is the rule, so the per-building level cap is gone.
- A Port in a colony takes one of the colony's slots. A colony evicted by a rival's
  upgrade keeps the good its Port claimed, as a burned Port does today.
- The Estate is refused on a hill.
- One move a turn carries any number of pops at 1 food each. The target needs room,
  counting pops already on their way, and they arrive next turn as before.
- The Dole has no limit per turn.
- The bank prices every material alike: sell 3 for 1 gold, buy 1 for 2. The scarcity
  classes stay as a knob for sims.
- A demotion costs 1 influence on either rung and no happiness.
- Calm is 2 gold or 2 influence for +2 this year (Step 6 replaces the original
  next-turn expiry). It is not banked and Beloved does not count it. The owner
  ruling of 2026-10-03 makes it cover the buyer's turn-end check.
- Every two slaves in a realm cost 1 happiness a turn, rounded down, so half a slave
  rounds in the player's favour.
- Happiness terms: Temples and slaves are paid into today's bank at each income, and
  luxuries and calm stand beside it. The food-stockpile bonus and the cap of three
  active luxuries stay until Step 5.
- Left at v1's scale for the steps that own them: the two event decks, the riot table
  and its insurance, venture stakes, Laws and Assembly prices, victory minimums.
- A save, script or tune patch that names a cut building is rejected, not migrated.
  The state schema is version 4 and the command schema version 2 (the Dole).
- The low-number dev preset leaves the building roster as authored.
- Build's classes come from each building's column: Slaves is the Estate, Freemen the
  Marketplace, Citizens the Forum, and Civic holds Temple, Granary and Port. Civic's
  fan adds the Dole. Found and Upgrade carry the pieces left as a count on their
  discs, and Expand's disc carries the colony count, as the mock draws them. A
  settlement's column head prints ×1, or ×2 once its class building stands.
- The Estate has its own placeholder raster since Step 14.
- An open fan may cover an empty tile's slot count. It still keeps clear of every
  settlement's mark and every mooring.
- Bots price an open work slot as the slave who could work it, weigh a pop they expect
  to starve above any pop's worth, and take the Dole only when the next income would
  leave a mouth unfed.

**Defaults picked in Step 5** (2026-10-02):

- The lines are tested at the end of the player's own turn, before it passes, with
  this year's calm counted (owner ruling, 2026-10-03, superseding the original
  start-of-turn default). Step 6 defines calm's expiry as the year boundary.
- A one-shot happiness gain or loss has no bank to land in. A loss of any size places
  one Unrest token and a gain clears one: v1's player cards, the Directives and the
  Frontier Spirit rider all work this way. v1's timed moods (Plague, Civil Discord)
  place one token when drawn and nothing ticks afterwards.
- Happiness that a standing Law or the season's card names (per city, per pop, the Cult
  of Demeter threshold, Civic Anxiety) is one more term of the level while it stands,
  until Steps 6 and 8 rewrite them.
- A revolt takes half the slaves, rounded down, each from the settlement holding the
  most. The tokens clear, nothing is rolled, and the turn passes.
  There is no riot in the same turn.
- Riot losses take slaves, then freemen, then citizens, each from the settlement
  holding the most, so only the table roll draws dice.
- The riot table takes 3 food or 3 gold, as the paper has it. Its insurance prices
  stay (4 food, 3 influence), and the concession demotes a citizen only.
- Beloved's minimum is the paper's 4, since the level is a small number. The
  deck-exhaustion tiebreak reads the level without calm.
- Stratokles's prize is 2 gold: a prize is a stock and happiness is no longer one.
- The over-capacity happiness penalty is gone with the population term. Capacity is a
  hard cap.
- The luxury cap and the "counts toward Beloved" dial are gone. Happiness is not a
  resource: no stock, no income line, no price can name it.
- Players carry a count of revolts, for telemetry.
- The gauge spans −6 to +6 and draws one pip per token above it, up to six. Its
  tooltip lists Temples, luxuries, slaves and tokens always, and the other terms when
  they count. A revolt has no ceremony yet: it is a Chronicle line until Step 13.
- Bots score each point of the standing level at 6, up to Beloved's minimum plus 2.
  They charge a riot 50 and a revolt 100 at turn end, including the current turn
  and later turns in the six-income horizon, and run a revolt in the projection.
  They buy calm when it keeps the current check off the riot line (owner ruling,
  2026-10-03). It never counts for Beloved.
- The state schema is version 5.

**Defaults picked in Step 6** (2026-10-03):

- Seat 0 opens Year 1. The opener moves on one seat each year, and every seat takes
  exactly one turn. The first card is revealed after setup; later cards are revealed
  before the Assembly and the opener's turn. Victory stays at each player's turn
  start, before income, under the settled ruling. Unrest is checked at turn end.
- A terrain card zeroes the working-slave column on that terrain, including the
  Estate's raise. Piracy and Ostracism zero the freeman gold and citizen influence
  columns, including their class buildings. Mouths still eat. Flat building income
  and standing Law terms remain; Laws apply after the year card until Step 8.
- Income forecasts use the current card only for a seat that has not collected this
  year. After collection, the shell and bots use printed income for the next year,
  whose card is hidden. Bots assume no new card or token change in later years and
  never read the draw pile. Blockade counts in the current happiness level for every
  seat throughout the year.
- Calm is +2 for the year in which it was bought and clears for every buyer when the
  year turns, before any new-year riot test. It never counts for Beloved or the final
  tiebreak. Under the owner ruling of 2026-10-03, it covers the buyer's current
  turn-end check; bots weigh it against that visible riot or revolt.
- Voice follows the other five titles: a sole leader at the minimum holds it; a tie
  holds nothing. Only standing authored Laws count; repeal and replacement reduce
  their author's count. Directives and the permanent pass record do not count.
- After Year 14's last turn, tally the titles with the final year card still active.
  Ties break on happiness without calm, then total pops, then seat order. The clock
  stays on Year 14. The year deck never reshuffles; the player deck still does.
- The Assembly meets in Years 2, 4, 6, 8, 10, 12 and 14. Until Step 8 its house
  resolution, six-Law cap, prices, citizen votes, bribes and veto remain. Annual Law
  coupons refresh when the year turns. Existing turn-counted effects now count
  player-turns in years. Player cards and ventures wait for Step 7; riot insurance
  stays as shipped. Ideas still wait for Step 9.
- The legacy low-number dev preset keeps its own title minimums: 3 cities, 8 pops,
  6 citizens, 15 gold, happiness 4 and Voice 3. It leaves the year deck unchanged.
- The state schema is version 6; older saves and scripts are rejected. The command
  schema stays 2. The batch's default turn cap is 56, enough for all fourteen years.
- Telemetry includes the opening player-turn and excludes a terminal victory check
  that collected no income. A deck finish counts the completed final turn. It reports
  years and the winning titles, so late riots mean Years 8 to 14. Income, hunger
  and the player-card draw are recorded at turn start. A riot belongs to the year
  recorded by its roll, even if resolution opens a new year or the final tally.
  A year-card reveal still counts when the opener wins before income.

**Defaults picked in Step 7** (2026-10-03):

- Use the player-deck table's explicit counts: 40 cards, with 12 harmful copies
  (30%), despite the paper's "one harmful copy in four" summary. Good Stores is
  food, Timber wood, Shipment stone, Profit gold and Patronage influence. Rats
  takes food, Bandits gold and Fire wood; every resource card gains or loses 2.
- Keep the drawn-card confirmation. Free Settlers adds one freeman and Captured
  Laborers one slave, with the player picking an owned settlement with room. If
  none has room, discard the card with no substitute reward. These gains bypass
  the settlement's normal growth limit, as before.
- Ventures keep a d6 and lose the stake on 1–2. Merchant Convoy pays 2 gold on
  3–5 and 4 on 6: expected return 5/3 gold against the 2-gold stake. Grand Embassy
  pays 1 influence on 3–4 and 2 on 5–6. Colonists' Voyage pays 2 food on 3–4,
  3 on 5, and one freeman plus 2 food on 6. The jackpot keeps its seeded random
  settlement placement and, if none has room, its extra 2-food fallback.
- Retire Monumental Code and Land Rush now: both depend on annual coupons and both
  are absent from Appendix B's Step 8 roster. The Assembly otherwise keeps its
  current flow. Bread and Circuses and Frontier Spirit use explicit token verbs
  with the same effect until Step 8 rewrites or cuts them. The Streets Burn
  places one token through the same effect as Local Unrest and Plague; Festival
  clears all, while Public Calm clears one and stops at zero.
- The low-number dev preset leaves the new player deck, venture price and payouts
  as authored. Existing card art is reused for the corresponding new kinds until
  Step 14; card faces use the paper's rules text without new flavor copy. The state
  schema is 7 and command schema 3; older saves and scripts are
  rejected. Event resolution no longer takes a choice index, and a venture takes
  an expedition only.

**Defaults picked in Step 8** (2026-10-03):

- Resolve conflicts by Settled inputs, then section 5.9's limits, then Appendix B.
  Civic Pride's per-city happiness conflicts with 5.9: it gives flat +1 happiness
  per realm, while each city pays 1 gold a year (lead ruling). Manumission changes
  the existing slave count rather than adding a new per-thing term: count slaves
  three times, then round down by the existing divisor. Show the extra charge as
  one Law line, including zero; Civic Pride is also one line.
- One 2-influence draw per seat per sitting; no redraw. Discarding or passing does
  not refund it. A seat may instead pay the separate 3-influence repeal price,
  including after drawing or discarding. Proposals stay secret until all seats finish.
- Minimum tenure protects the enactment sitting and the next sitting, so Year 2
  Laws first become removable in Year 6. Apply it to automatic replacements and
  The Stele Is Broken too. Stele targets only the newest authored Law and does
  nothing if that Law is protected; it never falls back to an older one. There is
  no delayed repeal. Recheck legality at each ballot's resolution; a majority for
  an item made illegal by an earlier vote has no effect, no prize and is discarded.
- At the cap replace the oldest by enactment order. A new price Law also replaces
  the standing price Law, deduplicating if it is the oldest. Both may leave when
  they differ; either being protected blocks the proposal. Every Law changing an
  action, growth or calm price counts toward the single-price-Law limit.
- Public Works' wood discount conflicts with 5.9's whole-price limit: print and
  charge 3 wood for an Estate or Granary, 2 wood and 2 gold for a Marketplace.
  Other buildings keep their base prices. Tenant Rights states 2 gold per slave
  growth and 3 per freeman; Festival Calendar replaces gold calm with 2 food,
  keeping the influence option. Colonial Charter keeps the founding pop and
  1-food amount, removes wood, and makes upgrading 6 stone only. Harbour Dues
  removes gold from the Port but keeps 2 stone, obeying the settled non-free Port;
  its Marketplace price is 3 wood and 4 gold. Whole Law prices stay fixed under
  tuning presets rather than applying a discount to a patched base.
- Capacity and slot cuts protect existing pops and buildings, including Ports.
  They block new growth, transfers or construction beyond the new limit, with no
  over-capacity count or penalty. Already committed transfers still arrive. Homestead Act's one colony building includes a Port.
  Master Builders lowers the placement limit to three colonies; physical supply
  stays four and an existing fourth colony stays. City changes include capitals.
- Land Reform changes working slaves to food, including hills, and only forbids
  new Estates. Existing Estates keep their raise. Laws patch class columns before
  year cards: Drought stops plains food; Wildfire and Silent Mines stop only wood
  and stone, so Land Reform food on those terrains survives. Sacred Fields food
  is flat building income. Forum Rites sets citizen influence to 2, with no extra
  Forum raise; colony freemen make no gold but still eat. Grain Levy freemen eat
  nothing and cannot leave for hunger.
- Guild Charter gives the setup capital two paid growths; other cities keep one
  and colonies zero. The capital is the first setup city in the existing holding
  order; modes starting with colonies have no capital. Pop cards and founding
  gains still bypass paid growth. Frontier Spirit grants its slave without Unrest.
- Rural Bloc's base vote has a floor of one; city deductions include the capital.
  Isonomia fixes the target's base to one only at the next sitting. Bought votes
  still add, at most two purchases per seat per sitting across both currencies;
  they apply to every remaining ballot. Ties fail.
- The three regular author prizes are 2 of their resource (food, stone, wood).
  Stratokles stays 2 gold, as settled in Step 5; the paper gives no exact prize
  amount. No prize for a repeal, failure or ineligible majority. Bread and Circuses
  is cut; the calm action keeps its name. The Mob Rises keeps the existing
  largest-holding tie order and slaves-first removal.
- Every non-random policy uses the shared Assembly strategy. Draws value unordered
  public deck composition; votes tolerate small private costs to form coalitions,
  block a rival's winning title, and buy only affordable pivotal votes. Draw and
  proposal thresholds are zero, repeal 12, vote-purchase magnitude 8, and coalition
  tolerance 12 on the existing score scale; influence is spent before gold. Telemetry
  reports per-seat proposals, Law passes, standing authorship, passed Directives,
  vote purchases, Voice claims and table-turn observations of Voice held. The CSV
  includes standing authorship and Voice held. The low-number preset leaves the
  new Assembly content, prices and prizes as authored; other tuning dials stay.
- State schema 8 and command schema 4 reject older saves and scripts. Remove house
  items, vetoes and chosen replacements; a bought-vote command names its payment.

**Defaults picked in Step 9** (2026-10-03):

- The rewritten twelve-row roster in the National Ideas plan replaces v1. Good
  Harvest is flat 2 food and Civic Tradition flat 2 influence at yearly income;
  class-zeroing year cards leave them, and General Strike takes them. Public Dole
  replaces gold upkeep with the whole price of 2 influence for the existing 1 food.
- Urban Planning adds one shared work slot to every city, including the capital;
  Capital Works adds one to the first setup city only (none in colony-only modes).
  Slots stack with Law changes, never change pop capacity, and may hold a building
  or a slave. Frontier Charter adds one physical colony piece and one placement;
  Master Builders still cuts the placement limit only.
- New Settlers grants a chosen slave or freeman in a chosen owned settlement;
  citizens remain promotion-only. City Pioneers grants one freeman on upgrade if
  there is room. Slave Colonies adds two slaves to existing colonies on acquisition
  and newly founded colonies, as room allows. Room includes committed transfers;
  at founding the sent pop and Law riders reserve room first. These grants bypass
  paid growth, and an upgrade still returns its colony piece.
- Harbour Planning replaces the retired free luxury trader: Ports take zero work
  slots, but still pay their full price and claim a coastal luxury. A Law's
  building-count limit still counts a Port. Treasury Grant pays 4 gold once on
  acquisition, scaling the old 20 to v2 stocks. All acquisition grants work on
  either the setup pick or the purchase; none has a deferred or consumable token.
- Assembly Brokers replaces proposal cancellation, which conflicts with no veto:
  it permits a third bought vote at the existing price in either currency, through
  every remaining ballot in that sitting; no fourth vote purchase.
- Setup choices happen after placement. Every uncommitted seat may choose in any
  order; choices remain secret, then reveal and take effect together before Year 1's
  card and income. One distinct later Idea costs 6 influence as a turn action, with
  no swap or third acquisition. Fixed openings fix placement only and score Ideas.
- Fast starts skip the picker and score every seat's setup Idea, including the human,
  with the shared bot scorer and its seed-derived RNG. This applies to URL quick games
  (`?seed=N`), Fast Start (`?mode=fastStart` or the configured mode), dev rotation
  starts, scripted preload, bot and Assembly shortcuts, and active dev tuning presets.
  Random placement still scores Ideas. Normal new games keep the picker after manual
  placement. `?setup=manual` preserves that flow even with a pinned seed or preset;
  `?setup=ideas` auto-places and opens the picker for review.
- Civic's **Ideas** option beside the existing influence verbs opens a flat
  two-column picker. Names and full rule sentences come from pinned content;
  New Settlers also asks for its pop and settlement. Held Ideas appear in the realm
  overview and the rival tooltip. Step 13 adds ceremony; Step 14 owns final icons.
  The blocking setup picker replaces the map and HUD with a centred paper page
  naming the choosing seat. It fills the viewport without a scrim or nested plate;
  TUNE is hidden. Its 80px rows and footer fit at 1280×720; the New Settlers selector
  shares the footer. A selected row has a clay mark and a Selected label; the commit
  uses the shell's primary button. The in-play dialog uses the takeover layer.
- Non-random bots use the master scorer for setup picks and their normal search for
  purchases. Future Idea opportunity uses the existing six-year scoring horizon,
  bounded by years left; no personality weights before Step 10. Opportunity scores
  are 4 per year for Civic Tradition; 10 for an extra colony piece across the horizon
  (30 when near the base cap); 12 per possible upgrade; 6 per possible founding pop;
  twice the Dole saving for up to three missing food per year; and 4 per remaining
  Assembly for the extra vote when the purse can buy three. Only available frontier,
  pieces and owned colonies count. Future slave grants subtract their standing-level
  cost, using the engine's slave penalty and the scorer's existing level weight and
  cap; opportunity never falls below zero. This fixes the gross future reward that
  drove 160 of 160 setup picks to Slave Colonies, without changing its rules.
  Telemetry counts acquisition routes from ownership, including capped games, and
  holder wins per finished seat-game, zero-filled for all twelve.
- State schema 9 and command schema 5 reject earlier saves and scripts.

**Defaults picked in Step 10** (2026-10-03):

- Keep one master search and political scorer. Slaver, civic and trader are the
  weight vectors in the [AI reference](../reference/ai.md), applied to placements,
  setup Ideas, purchases and Assembly decisions as well as ordinary turns. Held
  cards remain 120; starvation costs 60 per projected lost pop for every personality.
  Every Assembly action uses its acting seat's policy; coalition prediction uses
  the acting personality's scoring lens for all public seat comparisons.
- Keep beam width 3 and depth 4. Bank trades, the Dole and calm enter ordinary
  search. Ventures are chance leaves at every depth: enumerate the public die
  and uniform Voyage destinations via canonical transitions with synthetic seeds,
  compare expected scores, then replan after the real roll. Forced riots retain
  the shared insurance handler. Score improvements need to exceed 1e-8 so floating
  point round trips cannot make a neutral exchange appear profitable. Deduplicate
  equal positions at the same beam depth and score equivalent venture outcomes
  once, ignoring logs and the last roll display in the comparison.
- Performance follow-up: share economic-position scores across depths within one
  decision, and return a sole improving first move without expanding its
  continuations. Costly first moves retain the full beam. Reuse projected income
  until pop losses or the active year card's expiry changes it. Memoize immutable
  engine queries, unwrap draft ruleset aliases before hashing, and reuse the
  numeric luxury comparator. Keep all weights, width/depth, venture outcomes and
  tie order unchanged; no test timeout increases.
- Reserve one forecast food shortfall plus 2 food against the player deck's loss,
  charging 14 per missing unit when food consumption and future income exist.
  Meeting the reserve adds no reward for a larger food deficit. The ordinary
  horizon may justify more. Forecast at most six remaining
  incomes; include projected influence so Forums and Civic Tradition pay back
  through real income, removing the duplicate Idea-only influence estimate.
  Latent work is bounded by available population room, including committed arrivals.
  Upgrade/founding grant opportunities scale by pop weights, Dole savings by
  influence, extra votes by politics, and future slaves pay the weighted level cost.
- Calm remains active through the current turn-end check, then expires at year
  end (owner ruling, 2026-10-03). It cannot count for Beloved. The earlier bot
  assumption that calm bought after collection protects no check is superseded.
  No Idea has a selection quota. Capital Works is weakly dominated by Urban
  Planning at the same price; Harbour Planning, Treasury Grant and Assembly
  Brokers are evaluated through slot/claim opportunities, actual gold use and
  future votes. For an owned unclaimed Port site, Harbour Planning credits a
  future saved slot at the ordinary 10/8 material weight over the remaining horizon;
  if no building slot remains, use half a luxury's weight for opening the claim
  instead. Cap prospective Port sites at the number of distinct claimable goods,
  keeping the most valuable sites. Existing Ports are valued by their real slots.
  Step 11 decides any remaining content weakness.
- `new`, `auto` and `batch` accept personalities by policy or seat name. Named
  policy openings use each seat's scorer; fixed placements still score Ideas by
  seat; random openings stay uniform. Unnamed `new` uses the neutral setup scorer.
  CLI seat choices are not saved and must be repeated on `auto`. Existing rotation
  is four cyclic seat assignments per seed; ten seeds make forty games. Use master
  as the neutral fourth seat for equal personality exposure.
- Telemetry reports final title IDs for every seat and finished-seat win rates,
  final card distributions and zero-filled title counts per policy, including
  uniform batches. Capped seats are counted separately and excluded from result
  statistics. Duplicate personalities count once per seat occupied.
- No game state or command shape changes: schemas stay state 9 / command 5.
  `?dev=bots` stays master in all seats. No shell changes.

**Defaults picked in Step 13** (2026-10-06):

- The Idea draft continues the placement snake: placement runs one round per setup
  placement, 0→3 then 3→0, and the draft is the next round. Every shipped mode places an
  even number of times, so the draft runs 0→3; an odd count would run 3→0.
- A pick lands at once with its grants, before the next seat chooses. The draft page
  stays after the last pick, read-only with that pick lit, until the opener turns the
  first year. In hotseat the page follows the turn, so the next seat finds the last pick
  already marked; the shell has no live "rival is choosing" view because it seats no bots
  beside humans. The scripted preload drafts Assembly Brokers, City Pioneers, Harbour
  Planning and Frontier Charter in seat order, since one Idea no longer fits all four.
- Hunger holds the turn on `pendingHunger` between income and the fate card. The choice
  names one settlement and class per pop that leaves, only from classes that eat under
  the standing Laws. A Chronicle line notes the strike; the line naming who left carries
  the rival toast.
- The freemen-first rule stays as the card's preselection and as the fallback where no
  one chooses: the bots' income projection.
- Bots weigh each split of the loss between the eating classes, every pop from the
  settlement holding the most of its class, without the fate card drawn after. Ties
  keep freemen-first, which enumeration lists first.
- Telemetry counts one hunger turn per hunger choice and records the player draw when
  the choice resolves.
- The warning a turn ahead reads the hunger alarm's own forecast: the alarm turns loud
  with the starvation raster and lists the Dole's and the bank's food prices, and End
  turn carries "Hunger ahead" unless a riot or revolt warning outranks it.
- Rival moments are `LogMoment`s on Chronicle lines. The toast lane under the ticker
  queues those about other seats as they land, one at a time for four seconds; a click
  dismisses one. A seat's own moment is a card, not a toast.
- Dialogs over the frame (the hunger card, the purchase list) carry no `data-c`, like
  the fate card; the draft page owns the viewport and is gated as a layout. Gate
  queries: `?setup=ideas`, `?dev=draft`, `?dev=draft-done`, `?dev=ideas`, `?dev=hunger`,
  `?dev=hunger-ahead`, `?dev=toasts`.
- State schema 10 and command schema 6 reject older saves and scripts.
- Part B (the ceremonies around the turn). Every browser game but `?dev=bots` is hotseat:
  the shell seats no bots beside people, so "two or more human seats" means every seat.
  The viewer follows the waiting seat through public phases; a seat's turn and its
  Assembly proposal change hands at the turn notice, keyed by the turn or the proposing
  seat. Proposals run one seat at a time in turn order, and the seat
  plaques are read-only while they do. A game opened mid-turn starts handed over.
- The game's end stays with whoever was looking, so the race tablet reads "You rule"
  only for the viewer who won. Its "New game" opens a fresh game without the URL's
  options.
- The engine records each realm's level before and after a year card turns, and the
  income the card takes, on the reveal's Chronicle line; the card's face reads that.
  A riot's roll line and a revolt's line carry the moment too (roll, insurance, the
  concession's settlement, tokens cleared, where each pop left, the level after), so
  the result card and the rivals' toast read them after the turn has passed.
- Year I's card shows after the draft page closes; a game opened mid-year shows no card
  until the year turns. Clicking the alarm disc reopens the face with a Close commit.
- End turn's confirm offers calm only when it changes the outcome, gold before
  influence, tried through the real action on a draft; without such a calm it offers
  only the plain choice. Escape or a click away cancels it.
- The riot result card's blow carries the engine's outcome lines; the table rows have
  no per-row flavour, so the card has no voice line. Each insurance is declared by its
  check box at once, as the engine pays it now; the concession names its settlement
  in a menu.
- The threat panel shows each held title's nearest challenger and how far short of a
  tie they are; it does not judge reach. "Seats before" walks turn order across the
  year boundary. Several threats share one disc.
- Toasts: each seat keeps its own place in the log and its own title snapshot, so a
  seat taking the screen reads what changed since its last look; a new viewer drops
  the last viewer's unread toasts. A title falling to nobody reads "Nobody holds it now".
- Year cards reuse the retired season paintings. Rivals' riot and hunger toasts mark no
  settlement on the map.
- Gate queries: `?dev=year`, `?dev=year-back`, `?dev=year-term`, `?dev=riot-confirm`,
  `?dev=revolt-confirm`, `?dev=riot`, `?dev=riot-result`, `?dev=revolt`,
  `?dev=rival-unrest`, `?dev=threat`, `?dev=race`, `?dev=age-end`, `?dev=turn-notice`. No schema
  change beyond Part A's: the riot's pending state gained two fields within state 10.
- Part C (the Assembly sitting). The ballot read and each item's result are beats the
  shell holds, not engine phases; a game opened mid-sitting does not replay results
  already decided. Minimise, or Escape, folds any stage to a dock in the toast lane
  under the ticker rather than over the map as drawn, so it never covers the island;
  toasts wait while it shows. The dock or Escape restores the same stage; a click on
  the scrim does nothing.
- A discarded draw waits face down with its seat (`assembly.setAside`) and reaches the
  discard pile when the ballot is read; a sealed repeal's Chronicle line names no Law.
  Both were public before. The house rising writes one recap line with every verdict.
- "What your vote does" reads `voteOutlook`: a seat still to cast counts "up to" the
  votes it can still buy and pay for, not only the cap. A Directive's effect on each
  rival comes from running it on a copy of the board. The result beat names the prize
  and how Voice moved, not per-Law consequence prose, which the cards do not carry.
- The viewer follows the caster in hotseat and no bots sit beside people, so the
  "watching a rival cast" form (the vote without controls) shows only when the viewer
  and the caster differ; nothing in the shell makes them differ today.
- The ticker cuts its newest line at a word with an ellipsis to fit the tab, so a long
  Chronicle line no longer runs on under whatever lies beside it.
- Gate queries: `?dev=assembly-ballot`, `?dev=assembly-vote`, `?dev=assembly-rises`. No
  schema change beyond Part A's: the Assembly session gained `setAside` within state 10.

**Defaults picked in Step 17** (2026-10-08):

- Ending the turn is the hunger check. A seat that ends short keeps the turn until it
  names who leaves (`endTurn` sets `pendingHunger`; `resolveHunger` sets food to zero, runs
  the riot check and passes the turn). There is no new command: the shell opens the hunger
  card before it sends `endTurn`, so Go back costs nothing, and confirming sends both.
- At the riot or revolt line the riot confirm comes first and the hunger card second. The
  engine settles hunger before the riot check either way.
- While food is below zero a food cost cannot be paid, a card or table loss of food takes
  nothing, and a gain counts against the shortfall. Income is the only thing that takes
  food below zero.
- A shortfall deeper than the free pops (a Law taking food) takes every free pop and then
  returns to zero.
- The hunger alarm is loud only while food is below zero and reads "N short at turn end",
  with the Dole's and the bank's prices. Step 13's warning a turn ahead is gone: the player
  now has the whole turn to react. The quiet alarm still shows while food income is
  negative.
- End turn's label reads "N pops leave". At the riot line the riot label stays and the
  tooltip names both.
- The food figure shows a shortfall as a negative number in clay, with the underline a
  store that runs short next turn already has.
- State schema 11 rejects older saves: a v10 save can hold a hunger pick taken at income.
  The command schema stays 6.
- Telemetry counts a hunger turn when a turn ends short. The bots' projection settles
  hunger at every projected turn end, the current one included.
- Gate queries: `?dev=hunger` (the card at End turn) and `?dev=hunger-short` (the turn, two
  short). `?dev=hunger-ahead` is gone.

**Defaults picked in Step 18** (2026-10-10):

- Pops on the move are counted in five places: the level's slave term, with
  Manumission's line beside it; Demos and Civic Elite; the base vote; the top bar's
  census; and a revolt's half. One selector (`realmPops`) gives the count.
- They are not counted where a pop must be taken or must stand somewhere. Hunger counts
  and takes only pops standing in a settlement, so a pick can always be made. A riot,
  a revolt and The Mob Rises take pops from settlements only. Income needs no change:
  pops arrive before their owner's next income.
- A revolt's half counts slaves on the move, and those who leave are taken from the
  settlements. Counted the old way, moving slaves out before a revolt cut the loss.
- The realm panel's own counts (people, heads against room, the ladder's tiers) still
  show pops standing in settlements. The happiness line names the rest: "6 slaves (1 on
  the move)". The sim's roster count (`playerStandings`) is also unchanged, with pops
  in transit in their own column.
- Wood, stone, gold and influence stop at 0 in the base ruleset, as food does outside
  income. Civic Pride's card text stays as printed; `rules.md` says the charge takes
  what the realm holds. The Low Numbers preset keeps its own floors line, now the same
  as the base.
- State schema 12 rejects older saves and scripts: both rulings change how a recorded
  game replays. The command schema stays 6.
- A ballot item is worth the seat's own gain, minus the best rival gain, plus the
  leading rival's loss. The thresholds (repeal 12, bought vote 8, tolerance 12) are
  unchanged.
- The food reserve is gone: nothing is held against the next income. One term stays in
  its place, 14 for each food the seat is short of now. With no term at all a seat
  with 100 gold and 7 food short bought nothing and lost 7 pops: the forecast does not
  buy food, so feeding a pop this turn only moves its loss to a later forecast year.
  Step 19's forecast should make the term unnecessary.
- The forecast delivers a seat's pops on the move with the engine's own arrival rule,
  before its first forecast income. The scorers count them in the population sum.
- Public Dole's saving is priced at one Dole a year for each of the realm's first two
  mouths, whatever its food income. Two is what the opening's deficit gave the old term,
  so draft values stay at civic 36, master 24, trader 18; a realm with one mouth gets
  half.
- City Pioneers counts only colonies that do not stand beside a city. Placement adds 6
  (times the city weight over the default's) for such a colony, the size of a good
  frontier tile. Over the audit's 40 setups founding colonies beside a city fall from 76
  to 50. About 22 of those are cut before scoring by the top-three shortlist, which
  ranks tiles on the one-freeman, one-slave split; the shortlist is unchanged.
- The luxury weight is 6, and 9 for the trader (was 36 and 54). A good's +2 already
  counts in the level term at 6 a point, so a good is worth 18 against two Temples' 12:
  a point of luxury happiness costs 1.5 Temple points, down from 4. The 6 that stays
  pays for what the level term cannot see: a good keeps its worth past the level cap,
  where Beloved is decided, and a good claimed is one no rival can claim. It also
  offsets the frontier pull a claim gives up. At level 0 or above a Port is now close
  to break-even, and it is still raised below 0, where the riot buffer pays for it.
- Land Reform's food on hills counts in both frontier terms. Future slave grants read
  Manumission's triple count. Frontier Charter reads the colony limit Master Builders
  leaves.
- The 30-action limit counts a seat's actions up to its accepted `endTurn`. After it
  the loop keeps the Assembly's guard of 500.
- No bot sheds its last citizen while another choice remains: search leaves out the
  demotion of a realm's only citizen and any hunger split that takes every citizen. It
  is a rule in the search for every policy but `random`, not a value in the scorer.
- The projection's `mildRiotEvents`, `severeRiotEvents` and `mildRiotPenalty` are now
  `riotEvents`, `revoltEvents` and `riotPenalty`. Two stale rows name lines in the
  2026-10-04 reach audit; reports are not edited, so they stand.
- Report: a draw's swing is set against what the seat collected that turn, the gains
  in its stock at income. Food upkeep is a loss, so it adds nothing to that sum. The
  old `ratio` stays beside the new `collectedRatio`.
- Report: pop and token cards are counted in their own units (pops moved, tokens
  moved) in `drawSwingSummary`. No resource value is given to a pop or a token: that
  needs an owner ruling, so there is no single ratio over all twelve kinds.
- Report: the luxury leader is given both ways. The sole leader has more active goods
  than every other seat. "Leader or tied" needs at least one good, so four seats with
  none do not count as a tie. Goods count in a Blockade year, when they add nothing.
- Report: influence spent is what the seat's stock fell by at each purchase, so a
  price an Idea or a Law changed is counted as paid. Demotions are an eighth sink
  beside the seven named; a riot concession counts as a demotion.
- Report: a food purchase covers a shortfall when the stock was below zero before it,
  and buys ahead at zero or above. The bank and the Dole are both counted.
- Report: end-of-game luxury happiness is what the active goods are worth in a year
  that counts them, so a last year under Blockade no longer reads 0.
- Report: each game row carries its per-seat counts (`seatCounts`), and the pooled and
  per-personality figures are summed from the rows. Step 19's merge can then work from
  game rows alone.
- Report: which class left at a hunger pick is a reach ID (`hunger:freemen`,
  `hunger:citizens`), which gives the total and the per-personality count at once.
- Report: year-card telemetry is the card order on each game row. What a card did to
  each seat is not aggregated.
- Report: no count was added for "a move that changed the turn-end check". Pops on the
  move now count for the level, so a move no longer changes that check. The riot
  detail row (level, roll, insurance per riot) is left for later.
- `--rotate` plays only the seatings that differ: four identical seats play each seed
  once. `meta.rotations` records the number.
- The CSV's new columns are added at the end, so the old ones keep their places. The
  last-state rows are marked `final`.
- The summary prints the riot share from year 8 and the influence medians from year
  10, the windows Step 11's rules name.

**Salvage.** The branch `archive/asymmetric-shell-rebuild` holds the August rebuild. Take
only its engine pieces, by diff, when a step needs them: the advisory selectors, the victory
danger selector and the real-path previews, with their tests.

## Open owner questions

- Step 11's thresholds are proposals the owner may change before it runs.
- Q80: the shape of Step 11 (the runaway-leader rule's wording, the number of games, the v1
  comparison). It does not block Steps 18 and 19.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                             |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Every rule lands in `src/game` with tests, through one effective ruleset. The UI never computes costs or yields.              |
| Frontend         | Yes      | The new shell shows each rule in the step that lands it. Steps 1–2 replace the old shell outright on `feat/v2`.               |
| Simulation & AI  | Yes      | Bots play every step through legal moves; Step 10 adds personalities; Step 11 compares against the 2026-09-05 baseline seeds. |

Sibling consumers: the realm panel, fans, rival tooltip and sim telemetry all read the same
selectors, so a rule change updates one selector, not three views.

## Architecture impact

- Per-match definition: the v2 ruleset replaces v1 as the default on `feat/v2`, with a
  version bump. Saves from `main` are not migrated.
- Commands: the Dole, the paid pop move, piece-limited founding and upgrading, and the
  two-level Build and Exchange choices are canonical commands with derived legal options.
- Actors: the Assembly stays multi-seat and meets every other year.
- Projections: the rival tooltip reads only the public projection.
- Invariants: pieces are conserved (four colonies and three cities per player), happiness
  is derived and never stored, and no stock goes below zero but food during its owner's turn.
- The year deck replaces seasons and the omen as the clock.

## Steps

### Stretch 1 · Shell (Steps 1–2)

**Mode:** one step per session. **Stop:** after each step, show the owner the real app at
1280, 1440 and 1920 with the gate script's results; the owner approves the look before the
next step.

- [x] **Step 1 · Frame.** ([#79](https://github.com/Jinglemisk/hegemony/pull/79): the gate passes at 1280/1440/1920 on the real app; a `?dev=bots` game plays to victory in the shell.) Replace the old in-match shell with the Hybrid arc frame, wired to
      today's engine: the top bar with rivals and their tooltip, the pannable map, the realm
      panel with its tabs and the settlement's three-column view, and end turn. Port the
      mock's tokens into `src/styles` and delete the old shell's components and CSS.
      Build the happiness display so it can show either a bank value or a level with its
      riot and revolt marks; Q77 decides which at Step 5.
      Exit: bots play a full game in the new shell; browser smoke passes; `ui:audit` and
      `ui:conduct` pass or are updated to the new addresses.
- [x] **Step 2 · Verb discs and fans.** ([#80](https://github.com/Jinglemisk/hegemony/pull/80): a test holds the fans to the engine's legal moves both ways; the gate passes at 1280/1440/1920 with fan hover shots.) The six discs as one data-driven component, since the
      disc count must not be hard-coded, with the fan behaviour above, wired to today's legal
      moves and a full keyboard path. Exit: every legal verb is reachable by mouse and by
      keyboard; no fan leaves the screen or covers a city name from 1280 to 1920.

### Stretch 2 · Core systems (Steps 3–4)

**Before:** nothing; Q78 was answered on 2026-10-01. **Mode:** both steps in one session, back to back. **Stop:**
present Step 4's bot batch (riots per game, share of turns on the riot table) and ask Q77.

- [x] **Step 3 · Pops and tiles.** ([#82](https://github.com/Jinglemisk/hegemony/pull/82): a 40-game bot batch finishes with no illegal moves; per seat, 3.4 to 3.9 hunger turns and 5.2 to 6.9 pops lost a game, 22% to 41% of slaves idle, at v1's prices.) Tiles print terrain and slots only, under the work-slot
      ruling in Settled inputs: slots are shared by buildings and working slaves, a slave
      on an open slot yields 1 of the terrain's resource, and a slave without one is idle.
      Re-number the map's slots to roughly 2 to 7 with today's rich tiles highest, and drop
      the capital's flat 4. Hills yield nothing and slaves eat nothing. Freemen make 1 gold;
      citizens make 1 influence and hold a vote; both eat 1 food. Hunger removes one pop per
      unfed mouth and food stays at zero. Two colonies of different players may share a
      tile and split its slots; an upgrade evicts the other. Citizens come only by
      promotion. Record as defaults the re-numbered slot table, who takes the odd slot on a
      shared tile, and the starting food (12 today, unruled for v2).
- [x] **Step 4 · Buildings and prices.** ([#83](https://github.com/Jinglemisk/hegemony/pull/83): a 40-game bot batch finishes with no illegal moves; the riot table opens on 15% of player-turns, 19% without the food-stockpile bonus and 5% with calm banked; hunger takes 6.2 to 7.9 pops a seat-game and is the bots' doing. [Report](../reports/simulation/2026-10-02-v2-step4-bank-and-food.md).) Marketplace, Estate and Forum raise their class
      column; Temple, Granary and Port state one fact each; one of each per settlement.
      Workshop and Villa merge into the Estate; Odeon, Aqueduct and Gymnasion are cut. One
      price per verb, per the paper's section 5.6, including the Dole and the paid pop move.
      Piece supply: four colonies and three cities, and an upgrade returns the colony piece.
      Write Temples, luxuries, slaves and calm as happiness contributions that Step 5
      combines, not as bank changes. End with a bot batch showing whether today's bank still
      slides without the food debt; that is Q77's evidence. The same batch reports food
      under work slots: turns with hunger, pops lost to it, and idle slaves, per seat.

### Stretch 3 · Remaining systems (Steps 5–10)

**Before:** nothing; Q77 was answered on 2026-10-02. **Mode:** all six steps back to back; this stretch may run
unattended overnight. **Stop:** a summary of the commits and every default picked.

- [x] **Step 5 · Happiness.** ([#84](https://github.com/Jinglemisk/hegemony/pull/84): a 40-game bot batch finishes with no illegal moves; 4.3 riots and 0.5 revolts a game; the riot table opens on 3.4% of player-turns, 1.7% in rounds 8 to 14 and 4.2% after round 7, against Step 4's 15.0% and 14.8%; hunger takes 8.5 to 9.1 pops a seat-game.) The level with Unrest tokens, per the paper's section 5.7
      and the ruling in Settled inputs. Nothing is stored: the level is derived each turn
      from Step 4's named terms. The stored bank, the food-stockpile bonus and the cap of
      three luxuries go; calm is +2 for this year and luxuries are +2 each. A riot clears
      the tokens and then rolls; a revolt sends half the slaves away with no roll. Beloved
      reads the level without calm.
- [x] **Step 6 · Years and the year deck.** ([#85](https://github.com/Jinglemisk/hegemony/pull/85): a 40-game bot batch finishes all fourteen years with no turn caps; 2 games end by the race and 38 by the deck; the riot table opens on 10.7% of player-turns after year 7. [Note](../reports/audits/2026-10-03-v2-step6-years.md).) Seasons and the omen retire. A 14-card year deck
      is the clock and the next card stays hidden. Victory is checked at the start of each
      player's own turn, as today, with the paper's minimums; Treasurer counts gold only; Voice is a level.
- [x] **Step 7 · Cards.** ([#86](https://github.com/Jinglemisk/hegemony/pull/86): a 40-game bot batch finishes all fourteen years with no turn caps, all 40 by the deck; 4.1 riots a game and the riot table on 7.5% of player-turns after year 7; 7.5 ventures a game; the gate passes at 1280/1440/1920 and the conduct audit drops to 24 rows.) A player deck of twelve kinds in the four verbs. Ventures take one
      stake of 2 gold. Coupons, choice cards and per-pop scaling go.
      The token cards (Plague, Festival, Local Unrest, Public Calm, The Streets Burn)
      place and clear Unrest tokens as the paper draws them.
- [x] **Step 8 · Assembly and Laws.** ([#87](https://github.com/Jinglemisk/hegemony/pull/87): a 40-game bot batch finishes with no turn caps; every seat passes about 1.8 Laws a game and Voice is held at 88% of game ends; riots fall to 1.0 a game, 1.8% of player-turns after year 7; the gate passes on the Assembly screen at 1280/1440/1920.) It meets every other year and votes on player proposals
      only. At most four Laws stand, the oldest is replaced, and a new Law has a minimum
      tenure. One vote per seat plus one per citizen, up to two bought votes, no veto. The
      paper's Appendix B Laws and Directives, under its three global limits.
- [x] **Step 9 · National Ideas.** ([#88](https://github.com/Jinglemisk/hegemony/pull/88): a 40-game bot batch finishes with no turn caps, 7 games by the race; bots pick two Ideas at setup and buy five, and four Ideas are never taken; riots 1.6 a game, 3.4% of player-turns after year 7; the gate passes on the map and the Assembly, and the setup picker, a page with no map, has no defects.) First rewrite the Ideas in v2 terms, since seasons, the
      veto, per-pop scaling and gold upkeep no longer exist; then build them per
      [their plan](national-ideas.md).
- [x] **Step 10 · Bot personalities.** ([#90](https://github.com/Jinglemisk/hegemony/pull/90): a rotated batch of slaver, civic, trader and master, 10 seeds × 4 rotations, finishes with no turn caps; wins are slaver 33%, civic 35%, trader 13%, master 20%; riots 4.7 a game, 10.7% of player-turns after year 7; the batch takes 16 minutes on one core.) Slaver, civic and trader as weight vectors over the
      political scorer, with bank and venture moves inside the search, so each personality
      can actually pursue its build.

### Stretch 4 · Sim gate (Steps 17 to 19 and 11)

**Before:** Steps 17 to 19 are merged, so the gate measures the final hunger rule with
bots that play the rules as built, and Q80 is answered. **Mode:** Steps 18 and 19 one after
the other; Step 11 in one session, on the owner's go. **Stop:** the dated report, with a
proposed remedy for each failing rule; the owner decides.

- [x] **Step 17 · Hunger at turn end.** ([#99](https://github.com/Jinglemisk/hegemony/pull/99): a rotated 40-game batch finishes with no turn caps, 3 by the race and 37 by the deck; pops lost to hunger fall from 3.3–3.7 to 0.5–0.8 a seat-game and hunger turns from 1.2–1.4 to 0.3–0.4, against Step 13's batch; riots 2.3 a game, the table on 4.1% of player-turns; wins slaver 33%, civic 20%, trader 15%, master 33%; three bot turns hit the 30-action limit, each a seat with about 100 gold buying 12 to 19 missing food one unit at a time; the hunger card and the short turn pass the gate at 1280/1440/1920 and ui:audit shows 0 defects.) The Q79 ruling in Settled inputs, per the
      [Q79 note](../reports/balance/2026-10-06-q79-food.md)'s option E and its cost
      section. Engine: income stops applying hunger; food may sit below zero only during
      its owner's turn, and turn end settles it before the riot check. Losses at income
      never raise a negative stock. Shell: the food figure shows the shortfall, End turn
      warns about it as it does at the riot line, and the Step 13 hunger card opens at
      turn end with a way back to buy food. Bots settle hunger at turn end in their
      projection. `rules.md` and the reference docs follow.
- [ ] **Step 18 · Sim parity, the bugs.** From the
      [sim parity audit](../reports/simulation/2026-10-10-v2-sim-parity-audit.md). The two
      rulings of 2026-10-10 in Settled inputs: pops on the move count, and no stock below
      zero. Every row the audit marks as a bug: the Assembly's double-counted gain, the food
      reserve, pops in transit in the projection, Public Dole, City Pioneers, the luxury
      weight, the three Laws that read a base number, and the action limit after End turn.
      Two small gaps with them: the setup colony beside a city, and the trader shedding its
      only citizen. The report fields Step 11 needs: how each game was decided, the Beloved
      holder and luxuries per turn, influence per year, per-personality hunger, riots and
      Assembly figures, the CSV's personality and winner columns, and draw swings for pop
      and token cards. Stale comments and docs the audit lists.
- [ ] **Step 19 · Sim parity, the gaps.** The audit's medium gaps: the projection buys food
      before pops leave; a riot is priced from the riot table, and insurance by what it
      saves; a vote and held influence have value outside a sitting; rival harm is priced on
      the rival's terms; the draft follows the personality's weights and sees rivals; Laws
      get a rough value for the prices and rules they change; the Treasurer and Beloved
      chases; the small enumeration and weight gaps left over. Batches run in parallel
      across cores and their reports merge. Left out: planning toward a third title, a
      proper value per Law, and the v1 baseline.
- [ ] **Step 11 · Sim gate.** First phase: AI reach audit: every action and every piece of
      content is used by some personality in a rotated batch, or a fixture proves the bot
      takes it when it is clearly best; bot bugs found are fixed before Step 11's batches.
      Run batches on the baseline seeds, compare with the
      [2026-09-05 baseline](../reports/simulation/2026-09-05-shallow-economy-baseline.md),
      apply the decision rules below, and save a dated report. First commit the class and
      draw telemetry the baseline relied on, and rerun the v1 baseline with food floored at
      zero, so v2 is measured against that fix rather than credited with it. Run at least
      60 games per condition with seats rotated.

### Stretch 5 · Finish (Steps 12–15)

**Mode:** Steps 13–14 back to back, as in Stretch 3; Step 14 may instead run in parallel at
any time in its own worktree when the owner asks. **Stop:** Step 15 ends at the owner's
playtest, with the PR from `feat/v2` into `main` open for the owner to merge.

- [x] **Step 12 · Level model.** Dropped: Q77 picked the level, so Step 5 builds it.
- [x] **Step 13 · Ceremony surfaces.** ([#95](https://github.com/Jinglemisk/hegemony/pull/95): a rotated 40-game batch finishes with no turn caps, 6 by the race and 34 by the deck; every game drafts four distinct Ideas; riots 1.9 a game, the table on 3.5% of player-turns; every new surface passes the gate at 1280/1440/1920 and ui:audit shows 0 defects.) The year-card reveal, the Assembly sitting, hunger and
      riot moments, victory, and the National Idea draft, designed in the app in the mock's
      language, to the [ceremony design](https://claude.ai/artifact/Wxe7eJMJjccaGUwc1fWMsN)
      and the Step 13 rulings above. The Idea draft and the hunger pick are rule changes too.
- [x] **Step 14 · Icons.** ([#94](https://github.com/Jinglemisk/hegemony/pull/94): ten Imperator placeholders for the v2 concepts, picked 2026-10-05; the gate passes at 1280/1440/1920. Year, threshold and National Idea rasters are exported but unwired, since the frame has no icon slot for them.) Rasters for new concepts (year cards, unrest, pieces, the Estate,
      the Dole) through the icon pipeline, as placeholders until the owner approves them.
- [ ] **Step 15 · QA and docs.** Full games by bots and Playwright at 1280, 1440 and 1920;
      the gate script rerun on the real app; `rules.md` rewritten for v2; reference docs
      updated; an owner playtest; the owner's decision on merging `feat/v2` into `main`.
- [ ] **Step 16 · Refactor and optimize the code.**

## Step 11 decision rules

Proposed thresholds; the owner may change them before Step 11 runs.

| Question                        | Rule                                                                                                                       | If it fails                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Do riots stay rare?             | The riot table is reached on at most 10% of turns after year 7                                                             | Retune the level's terms or the token cards                               |
| Does influence plateau?         | Median influence stock grows by at most 5 a year from year 10 to year 14                                                   | Raise the propose and repeal prices first                                 |
| Is every build viable?          | Each personality wins between 20% and 45% of games                                                                         | Rework the weakest build, and check whether missing trade is the real gap |
| Does the leader run away?       | The round-5 income leader wins at most 40% of games, and the leader holds at most 2.5 times the laggard's stock at year 10 | Report, with a proposed catch-up rule                                     |
| Do luxuries decide Beloved?     | Beloved's holder is also the luxury leader in at most 60% of the turns it is held                                          | Raise the Port price or cap what luxuries add                             |
| Is it legible?                  | Recount the paper's section 5.11 reads per decision against the built game                                                 | Report only                                                               |
| Do draws matter?                | The spread of draw swings against income is recorded                                                                       | Report only; cutting the deck is the owner's call                         |
| How long, and how do games end? | Fourteen years; the share ending by the race is recorded                                                                   | Report only                                                               |

The audit showed the first draft of these rules could not measure what they asked: a
linear influence pile passed, and no card could meet the draw rule.

## Acceptance and validation

- Every step: `check`, `lint`, `test:run` and `test:parity` pass, and a bot batch
  completes with no illegal-move errors.
- Step 11's report is saved under `docs/reports/simulation/`.
- Step 15: a full four-seat game plays to victory in the new shell at three widths, and the
  owner playtests it.

## Retirement

When the owner merges `feat/v2` into `main`, update the roadmap, the reference docs and
`rules.md`, then move this plan to `docs/archive/plans/` with the merge PR and the Step 11
report as evidence.
