# The Assembly & Politicians system (Phase 3-B)

**Status: BUILT (2026-07-20).** Design converged in the owner sessions of 2026-07-19 → 07-20; the
whole of §1 is now implemented, tested and browser-verified — see **§7, the build record**, for what
shipped, where it lives, and the handful of places the code deliberately departs from this document.
What remains is **tuning the numbers** (every one is a `Ruleset.assembly` dial in `?tune`) and the
**hand-playtest** the design asks for before any AI work. Supersedes the earlier transient/auto-expire
sketch; the archive design and Q27–Q29 lineage are in the appendix.

Feeds / supersedes: `docs/roadmap-appendix.md` (Q27–Q29), `docs/rules-archive.md`, `seasons.md`,
`docs/feat/two-panel.md`, `docs/feat/event-tables.md`, `docs/sim/2026-07-18-greedy-vs-smart.md`,
`todo.md`. **Approved visual reference (owner, 2026-07-20): `docs/design/showcases/assembly-mode-showcase.html`**
— the Assembly rendered in the real KYKLOS chrome across its three states (proposal / voting / the
board), as a panel sized to the sea gap with the ledger and top bar still live.

---

## 0. Where this sits, and why it is the linchpin

Phase 3 order (owner, 2026-07-18): **(A) two-panel UI** — *shipped*; **(B) Assembly + resolutions +
Politicians** — *this*, needs a hand-playtest after build; **(C) influence-aware AI** — last.

Fills a **proven** hole. The greedy-vs-smart sim (`docs/sim/2026-07-18-greedy-vs-smart.md`) showed the
citizen/ladder line builds a real influence economy (52 banked) and **loses the race** to colony sprawl
— because **influence has almost no sink until the Assembly exists.** The Assembly is Influence's
primary job; until it ships the citizen line can't pay and there's nothing for a bot to spend on.

**The design's north star (owner, 2026-07-20):** a resolution must **change how you play the game, not
just tweak one turn.** A one-year +1 buff makes the vote low-stakes — "an influence sink just-because."
So effects are **standing, structural, trade-off-bearing Laws** that reshape the economy until repealed.
Each of the ~4–7 assemblies in a game becomes pivotal.

---

## 1. The v1 design

### 1.1 Cadence & the clock
- **Annual, each spring** (`isNewYear` in `core/calendar.ts`), resolved **before the opener's turn**.
- **First assembly = Spring of Year 2.**
- **Game length sets the count.** The seasonal deck is the finite clock — 33 cards, never reshuffles,
  hard-ends on `resolveDeckExhaustion` (`victory.ts`). Ceiling ~8 years; race wins land ~Year 5. So a
  race-decided game holds **~4 assemblies** (Y2–Y5); a grind to exhaustion, up to ~7.
- **Twice-yearly (spring + autumn) is a tuning lever**, not the v1 default — `isNewYear` generalizes to
  "is-assembly-season" if playtest wants more runway.

### 1.2 The surface — a panel over the map, not a takeover
**A large floating surface sized to the sea — *not* full-screen (owner ruling, 2026-07-20).** It covers
the **map only**, inside the normal float insets: below the top bar, above the dock, between the rails /
ledger panels. **The surrounding chrome stays live** — resources, the player roster, the season, the
left ledger and the chronicle stay visible and reachable, which matters because you *want* to check your
cities/pops/market before you vote.

This is also what makes it fit: because the chrome already shows resources, roster and season, the
panel never re-states them and carries only **the four politicians + their stelae, the card under vote,
and the assembly-specific actions**. (Full-screen wasted its space duplicating context.) It remains the
density valve the flat UI's dossier called for — just sized to the sea, honouring the KYKLOS law that
floating surfaces cover the sea and never reflow the board. Mounted like the yearly omen — an
engine-state gate (`G.pendingAssembly`) through a `ModalShell` variant sized to the sea — reusing the
two-panel `{view, entry, scroll}` route model. Includes an **active-laws board**
(the archive's "resolutions in the center of the board") showing every standing Law and tally monument,
its author, and each politician's power. Lands with the deferred two-panel deep-links + dossier. Aegean blue
(reserved for politics) is the accent; the voting-urn icon is drawn.

**The visual language — the Agora, laws as stelae.** Athenian laws were inscribed on stone **stelae**
planted in the agora, which hands the persistent-Law model its picture: each active Law (and each
Stratokles tally) is a **stele colored by its author**, and each politician's stelae **stack directly beneath their figure**.
That one visualization does quadruple duty — **power** (stack height), **patron** (the owner-color that
dominates the stack), the **Voice-of-the-Assembly** race (who owns the most stacks), and **Stratokles's
coup** (his stack nearing 3). Votes are **pebbles** (the *psephos* / voting-urn icon). Layout: a
colonnade of the four politicians across the top (each over its stele-stack), a central **bema**
(speaker's floor) where the card under vote sits, and the action dock along the bottom.

**Scope — plain first (owner, 2026-07-20).** v1 dresses this in the existing **flat card/hairline
grammar** — stelae as small labeled hairline tiles with an author dot, politicians as headers, votes as
simple markers — plain elegance, no bespoke art. The painterly agora (colonnade, black-figure
vase-figures, carved stone, urns) is a **later enhancement**, not a v1 cost.

### 1.3 The sequence — propose (reverse turn order), then vote
Each assembly runs in two phases.

**Proposal phase — in reverse turn order (fairness).** One **house card** auto-drops from a random
politician's deck onto the ballot. Then, going in **reverse turn order**, each player may **spend
influence to draw** from a politician's deck they choose (the *card* is random), look at it **in
secret**, and **discard or propose** it. Discarding and drawing again costs influence each time (the
fishing sink); a drawn card is **hidden from everyone until proposed**. A Law already active on the
board can't be re-enacted. Each player proposes **at most one** card.

**Voting phase.** The ballot — house card + every proposal — is **voted one card at a time, in order**.
For each card, players cast **openly and in turn** — every vote is visible as it lands (no secret
pebbles). Votes are your citizen count (+ capped bribery); **simple majority** passes, **ties fail**
(tunable). Passed **Laws** plant a **stele** on the board (respecting the cap / replace-at-cap); passed
**Directives** resolve immediately and plant a **tally monument**. Either way their politician's power
rises. *(Open sequential
voting makes the last voter a kingmaker on close cards and invites live vote-trading — accepted, it's
the negotiation-friendly choice; vote order follows turn order, tunable.)*

Because you pick the *politician* but not the *card*, patronage stays deliberate (fish to feed your
patron) while outcomes stay varied and un-cherry-pickable. *(Subtlety to watch: with cards secret until
proposed, later proposers see more before committing — so reverse turn order only balances if the
first-proposal slot is the stronger one. A playtest check, not a proven fairness win.)*

### 1.4 Influence — the verbs (the sink)
Influence's whole job. A **deep, active sink**:
- **Draw from a chosen politician's deck** — pay to draw one random card of a politician you pick, then
  discard or propose. **Redrawing (fishing) costs influence each time** — the primary sink.
- **Repeal** — propose removing an **active Law**; it is **voted like any card** (majority). Paying to
  propose a repeal is a spend; winning the vote removes the law. Removing a law is as political as
  passing one — whoever a Law is hurting must marshal a coalition, not just buy their way out.
  (Directives can't be repealed — they already resolved — and tally monuments are permanent, §1.6.)
- **Bribery — buy votes** — ~X influence for +1 vote, **capped** at +2–3 per player per assembly
  (tunable). Patronage flavor; keeps the sink deep without letting a hoard buy any outcome outright.
- **Veto** — strike one resolution, **once per assembly**.

### 1.5 Effects — Laws (standing) and Directives (one-time)
Effects are **not** one-year weather. They are structural modifiers built from levers the engine already
has (yields, ladder/bank/action/build/grow-pop/calm costs, happiness) — every effect a `Ruleset` patch.
Two kinds (the split is *Twilight Imperium*'s Laws/Directives, proven):
- **Laws** (the 3 regular politicians) — **table-wide, standing until repealed, unique** (you can't
  enact the same Law twice). **Every Law carries a trade-off** ("−x, but +y") so it favors some builds
  and hurts others — that is what makes the vote political rather than a rubber-stamp.
- **Directives** (Stratokles alone) — **one-time and temporary**, resolving immediately and hitting
  **the whole table**; they never single out a player (§1.8). A passed Directive leaves a **tally
  monument** on his stack — momentum, not an active rule.
- **The active-law cap** — ~**6** Laws on the board (tunable), bounding rule-soup. At the cap, a new
  Law proposal must **name an active Law to replace** (single vote), so the board self-manages without
  deadlock. **Stratokles's tally monuments do not consume the cap** — they are not active rules.
- **Laws never auto-expire; only Directives are transient.** Persistence is the point for the three
  regulars — transience is Stratokles's whole identity.

### 1.6 Power & patrons — read off the board, not tracked
No hidden counters, no decay timer — **the board is the scoreboard:**
- **Politician power = the number of their stelae on the board** — active **Laws** for the three
  regulars, **tally monuments** for Stratokles.
- **Patron = the player who authored the most of that politician's stelae** (ties → earliest author,
  or none — reuse `victoryStandings`' tie→null pattern).
- **Repeal replaces decay** — a Law leaving the board (repealed or replaced at the cap) lowers its
  politician's power naturally. **Stratokles is the exception: tallies are permanent and only ever
  rise** — you cannot repeal a monument to something that already happened. His track is therefore a
  true doomsday clock, checked only by voting his Directives *down*.
- A politician is **dominant at ~3 stelae**. The patron holds that politician's **themed standing
  buff** (continuous incentive to champion one).

### 1.7 The political victory card — a live metric
**"Voice of the Assembly" — patron of the most politicians** (tie-broken by total active-law count). A
6th victory card that recomputes every turn and flips hands like the other five (`victoryStandings` +
board-derived patronage). Fluid and contestable, *not* a one-time achievement. Minimum-to-hold tunable.

### 1.8 Stratokles — the Directive politician, and the coup
- **He targets no one** (owner ruling, 2026-07-20). No VP/leader targeting, and no single-player
  sanctions at all. His cards are **temporary, table-wide upheavals** — riots, strikes, doles, and
  disruptions of the assembly itself. Everyone is hit at once.
- **Why that still checks a runaway.** Table-wide chaos costs the **over-extended** player most (whoever
  expanded hardest has the most to lose), so he levels the table without singling anyone out. And
  because the coup crowns *his patron*, a **trailing player can quietly patron Stratokles and win by
  feeding the chaos** — a comeback path, which is healthier than dogpiling the leader.
- **Tally monuments.** Each passed Directive plants a **tally stele** — a monument to a populist
  victory. It is momentum, not a standing rule, so it does **not** consume the Law cap, and it can
  never be repealed (§1.6): his track only ever rises.
- **Power → coup.** When Stratokles holds the **most stelae *and* ≥3 tallies** (tunable), the demagogue
  seizes the city — **his patron wins**. "Too powerful = game over" resolved as a **win, not a mutual
  loss** (everyone-loses is a dead cap nobody would ever trigger). A reason to push the track *and* to
  fight it — the only brake is voting his Directives down. *Playtest watch: swing risk.*
- **Patron buff** — *the demagogue's ear*: your slaves cause no unhappiness.

### 1.9 The four politicians
| Politician | Epithet | Ideology / lever focus |
| --- | --- | --- |
| **Demosthenes Archimenid** | Agricultural Reformer | food, the land, the citizen/agrarian order |
| **Perdiccas Tyrpanid** | Urban Planner | buildings, cities, density — **tall** |
| **Kleistophenes Hippaid** | Rural Expansionist | colonies, frontier, sprawl — **wide** (Perdiccas's mirror; they clash) |
| **Stratokles Stratoklid** | Cunning Populist | temporary table-wide upheaval — riots, strikes, doles, assembly disruption |

The full deck is Appendix A.

---

## 2. What the vision implies
- **Politics becomes real** — the first true rivalry engine; each vote reshapes the permanent ruleset.
- **Trade-offs make votes political** — a Law favors some builds and hurts others, so a vote is a
  referendum on which strategy the table backs (the coalition puzzle with teeth).
- **Influence is worth having** — you spend it to rewrite the game's rules in your favor and against
  rivals, permanently. The "just-because" is gone.
- **Perdiccas vs Kleistophenes** (tall vs wide) is a built-in ideological tug-of-war in the assembly.
- **Stratokles is the price of chaos** — the table can unleash temporary upheaval on *everyone*, and
  pays for it by feeding a demagogue toward a coup that crowns **his** patron.

---

## 3. Engine seams — what this plugs into
- **Influence** — `Resource` on `PlayerState.resources`; sinks today are `civic.ts`/`riot.ts`; never
  bankable is structural (`types.ts:16`, `victory.ts:40-43`).
- **New-year hook** — `calendar.ts:35` `isNewYear` → `startNewSeason` (`season.ts:43-49`); the yearly
  omen (`G.yearOmen`, mounted via a `year !== seen` gate, `HegemonyBoard.tsx:598-611`) is the working
  precedent for `G.pendingAssembly` and for standing per-year state.
- **Content-as-data** — the `EventEffect` union + `applyEventEffects` (`events.ts:158-264`) already
  expresses resourceDelta / incomeModifier / buildingCostMultiplier / actionCostDiscount / choice, etc.
  A Law's effect is a **standing** patch of this kind; the new work is a persistent-modifier layer that
  income/cost/happiness calculators consult (vs today's one-shot application).
- **The levers** — `Ruleset` (`ruleset.ts:125`, on `HegemonyState.ruleset`): `popIncome`, `ladder`,
  `economy.bank`, `actionCosts`, `civicCalm`, happiness/unrest. All live in `?tune`.
- **Votes & targets** — `countPlayerPopType` / `scaledByPops` (`settlement.ts`) for citizen votes;
  `victoryStandings` (`victory.ts:82-104`) for the "Voice of the Assembly" card and any leader read.
- **Surface** — `ModalShell` (full-bleed variant), the `{view, entry, scroll}` route model; a
  `resolutionDeck` sprite + dropped "Resolutions 0/0" placeholder already exist (`DeckShelf.tsx:7`).
- **New engine state** — an `activeLaws` list on `G` (each: card id, author, optional target), consulted
  by the income/cost/happiness/action pipelines; `G.pendingAssembly` for the surface.

---

## 4. Pros & cons

**Pros:** fills a *proven* sink; rivalry-native; **high strategic stakes** (each vote is permanent);
trade-offs force real politics; board-derived power = few moving parts, all visible; reuses the
content-as-data + victory-card machinery; rich Greek-political theme; unlocks the deferred
dossier/deep-links.

**Cons / risks:** **rule-soup & load** (bounded by the ~6 cap + replace-at-cap); **balance is genuinely
harder** than bounded buffs — permanent trade-off modifiers interact combinatorially (lean on sim +
`?tune` + playtest); **lock-in / rich-get-richer** (the citizen-vote-dominant faction entrenches its
laws — countered by repeal, Stratokles, the bribery cap; watch it); **repeal deadlock** if the board
fills with laws nobody will vote out (mitigated by replace-at-cap; playtest watch); **bots can't
validate it yet** → hand-playtest first; **Stratokles's coup is swingy** (telegraphed + counterable, but
watch); the **standing-modifier engine layer is new** (income/cost/happiness must consult active laws).

---

## 5. What's tunable / experimentable
Every dial is a `Ruleset` value or data edit (`?tune` + `npm run sim`). Loop: build → **hand-playtest**
(bots can't judge) → re-arm the sim.
- **Cadence × power scale** — Year-2 annual (default) vs twice-yearly; board cap (~6); dominance/coup
  threshold (~3); "Voice" minimum.
- **Influence verb costs** — draw/redraw, propose, repeal, veto, bribery price + cap. *The sink depth* —
  the most important A/B.
- **Law magnitudes & trade-off balance** — each card's "−x / +y" numbers.
- **Patron buff strength**; tie-break rules for patron and the victory card.
- **The validation A/B** — re-run greedy-vs-smart with a sink-aware bot *after* v1 + playtest.

> **Balance note — the dead colony→city upgrade path.** The greedy-vs-smart sim found **neither bot ever
> upgrades a colony into a city** (max 2 cities; 1/400 player-turns > 1). At current `upgradeColonyToCity`
> pricing the action is never worth it. **Kleistophenes's *Enfranchise the Colonies* (upgrades cost
> half) is the natural lever to revive it** — a resolution doubling as a balance experiment. Flag for the
> end-of-run market/pricing pass **regardless of Phase 3**.

---

## 6. Still open — after the build
1. **Tuning numbers** — the §5 dials. All live in `Ruleset.assembly` and appear in `?tune`
   automatically. Untouched by playtest so far; the shipped values are the ones in this document
   plus the approved showcase's own figures (draw 3, bribe 10 cap 2, veto 5).
2. ~~**The standing-modifier engine layer**~~ — built (`src/game/assembly/laws.ts`, §7).
3. **Bot voting logic** — still deferred to Phase 3-C, as designed. The sim now *measures* the gap:
   a smart-policy batch sinks **0.8 influence per game** into the agora, because nothing teaches the
   bots to value it. That number is the Phase 3-C target.
4. **The hand-playtest** — the gate this design set before any AI work. Not yet done.

---

## 7. The build record (2026-07-20)

### Where it lives
| Module | What it owns |
| --- | --- |
| `src/game/assembly/types.ts` | State shapes; the `LawEffect` / `DirectiveEffect` vocabularies |
| `src/game/assembly/deck.ts` | The four politicians and all 31 cards — content, no logic |
| `src/game/assembly/laws.ts` | **The standing-modifier layer** (§6.2's open question) |
| `src/game/assembly/power.ts` | Power, patrons, the Voice metric, the coup — all read off the board |
| `src/game/assembly/assembly.ts` | Cadence, the proposal round, the ballot, enactment |
| `src/components/board/assembly/` | The panel: colonnade, bema, action dock, icons |
| `src/components/board/ledger/AgoraTab.tsx` | The standing record, as a right-rail consult page |
| `src/styles/assembly.css` | The panel and the Agora page |

**The standing-modifier layer, concretely.** Every other content system in this engine applies its
effects once, at resolution. A Law does not — so five pipelines now *consult* `G.activeLaws` on every
computation: the income breakdown, `getAdjustedActionCost`, `getDiscountedGrowPopCost`, the ladder
costs in `civic.ts`, and the bank rate. Each standing effect lands as its own labelled breakdown line,
so a player can trace any number on screen back to the stele that caused it.

**How it suspends the turn machine.** `endTurn` hands control to the agora each spring from Year 2 and
returns without opening the opener's turn; `closeAssembly` opens it. `G.currentPlayer` follows the
assembly's actor, which is why every existing turn gate — the move enumerator, the dispatcher, the
UI's `isActive`, the scoreboard highlight — works unchanged.

### Deliberate departures from §1 and Appendix A
1. **Land Rush** reads "first colony/year free of **wood**", not "of stone & gold". Founding costs
   neither stone nor gold since the Phase-2 repricing (`wood 20 + food 2`), so the line as written was
   a literal no-op.
2. **Uniqueness** is enforced as *"never active twice"* (§1.3's phrasing) rather than *"never enacted
   twice"* (§1.5's). A repealed Law returns to its politician's deck and may be enacted again later —
   without that, repeal would permanently shrink the game's content.
3. **The house resolution is unauthored.** §1.3 calls it the card "no seat authored", so it plants a
   stele that lends its politician power but hands **nobody** patronage, and renders in stone rather
   than a seat colour. Crediting it to the season opener would have paid them free Voice-card progress
   — and, for a house Directive, free progress on the coup clock — for doing nothing.
4. **The house card clears the same gate a proposal does:** it is redrawn if it duplicates a standing
   Law, and at the cap it names the **oldest** standing Law as its casualty (with no author to make
   the choice, deferring to age picks no side).
5. **Veto costs the vetoer their vote** on that resolution, and is spent on your own turn to cast. A
   veto is a walkout, not a free extra lever.
6. **Patron buffs** for the three regulars were not specified; they use the approved showcase's own
   labels (+1 food income · buildings −1 stone · colonies −5 wood). Stratokles's is the design's
   (§1.8) — his slaves cause no unhappiness, expressed as a `+0.5` happiness coefficient that exactly
   cancels the base `−0.5`.

### Verification
303 tests (86 new across four suites), `tsc` clean, zero new lint warnings. Browser-verified end to
end at 1280 / 1024 / 900 px with zero console errors: draw → fish → propose → pass → open sequential
vote → enact → rise, with laws planted, powers and patronage computed off the stelae, and the standing
laws showing up in the income breakdown afterwards. The sim plays full games through assemblies without
deadlocking, and the batch report now carries an Assembly line (§6.3).

Three engine bugs surfaced by the new tests and fixed before merge: the house card bypassed the Law
cap, the house card could re-enact a standing Law (doubling its effects and its politician's power off
one card), and the unauthored stele was being credited to the season opener.

---

## Appendix A — the starter deck (31 cards, all distinct)

Regular decks are **sets of unique Laws** (no copies — a standing Law can't be enacted twice; deck size
= that politician's power ceiling). Stratokles's Directives are one-time and table-wide.
All numbers are `Ruleset` tunables. Provisional pending sim + playtest.

### Demosthenes — Agricultural Reformer (8 Laws) · *the agrarian/citizen order*
| Law (standing until repealed) | Trade-off axis |
| --- | --- |
| **Grain Dole** — promotions cost −1 food; but slaves produce −1 | citizen-rush vs slave-extraction |
| **Land Reform** — +1 food income/settlement; but cities yield −1 gold | agrarian-wide vs urban-gold |
| **Sacred Fields** — +1 food per citizen; but +1 unhappiness per 3 citizens | food-growth vs contentment |
| **Manumission Law** — slave→freeman promotions −2; but +1 unhappiness per 2 slaves | free labor vs slavery |
| **Festival Calendar** — +1 happiness/settlement; but −1 gold income/settlement | bread over coin |
| **Agrarian Tariff** — +1 gold per 2 food gathered above 10/turn; but wood income −1 | food surplus vs timber |
| **Tenant Rights** — grow-pop food cost −3; but grow-pop gold cost +2 | feed mouths, pay in coin |
| **Cult of Demeter** — +2 happiness while holding ≥15 food; but −2 while below | rewards food security |

### Perdiccas — Urban Planner (8 Laws) · *tall, dense, built*
| Law | Trade-off axis |
| --- | --- |
| **Public Works** — buildings cost −3 wood & stone; but +1 unhappiness/city | builders who eat unhappiness |
| **Guild Charter** — grow-pop food −3 in cities; but +2 food in colonies | tall vs wide |
| **Forum Rites** — +1 influence income/city; but −1 food/city | cities as political engines |
| **Civic Pride** — +1 happiness/city; but −1 happiness/colony | urban contentment vs frontier |
| **Aqueduct Levy** — stone bank rate one step better; but wood income −1 | stone-builders vs timber |
| **Monumental Code** — first building/year costs no wood; but each colony −1 wood | build up, strip the frontier |
| **Census Rolls** — +1 gold/city; but +1 unhappiness/city | urban taxation |
| **Master Builders** — civic buildings cost −4; but colony founding +5 wood | cities over sprawl |

### Kleistophenes — Rural Expansionist (8 Laws) · *wide, frontier* (Perdiccas's mirror)
| Law | Trade-off axis |
| --- | --- |
| **Homestead Act** — colonies yield +1 wood; but cities yield −1 gold | wide vs tall |
| **Colonial Charter** — colony founding −10 wood; but city upgrade +10 wood | found more, consolidate less |
| **Enfranchise the Colonies** — colony→city upgrades cost half; but +1 unhappiness/city | *revives the dead path* |
| **Frontier Spirit** — founding grants +1 freeman; but −2 happiness on founding | expansion has a cost |
| **Pioneer Levy** — +1 food/colony; but −1 food/city | rural vs urban food |
| **Manifest Destiny** — colony founding −5 food; but grow-pop +1 food in cities | cheap to found, costly to densify |
| **Land Rush** — first colony/year free of stone & gold; but buildings +2 wood | expansion over construction |
| **Rural Bloc** — +1 influence per 2 colonies; but −1 influence/city | rural political base vs urban |

### Stratokles — Cunning Populist (7 Directives) · *one-time, temporary, and they hit **everyone***
No targets, no VP/leader targeting, nothing standing. Each passed Directive plants a permanent **tally
monument** (§1.8) that never repeals and does not consume the Law cap.

| Card | Flavor | Effect (resolves once, table-wide) |
| --- | --- | --- |
| **Grain Riot** | Mob | Every player loses **half their stored food** (rounded down) 🌶️🌶️ |
| **The Streets Burn** | Mob | Every player **−3 happiness** 🌶️ |
| **General Strike** | Mob | **No player collects income** this turn 🌶️🌶️ |
| **The Mob Rises** | Mob | Every player loses **1 random pop** from their largest settlement 🌶️🌶️🌶️ |
| **Bread and Circuses** | Mob (dole) | Every player **+3 happiness, −5 gold** — the populist giveaway 💰 |
| **The Stele Is Broken** | Agitator | The **most recently enacted Law is torn down** at once — a free repeal that skips the repeal vote |
| **Isonomia** | Agitator | At the **next assembly**, every player has exactly **1 vote**, regardless of citizens — the demos demanding equal rights |

---

## Appendix B — lineage (history)
- **Archive design** (`rules-archive.md:303-375`): fixed-interval unskippable assembly, two **drawn**
  resolutions replaceable from hand, yay/nay majority, passed → **persist in the center**; votes 1 +
  1/10 citizens; four politicians with power tracks; Stratokles a danger-track/leader-check; political
  victory = double all others' votes. "Not ready for v0.1." The v1 design keeps the four politicians and
  the power/patron/Stratokles spine, and (after a detour through a transient/auto-expire model)
  **returns to persistent effects** — now as trade-off **Laws** enacted by a pick-a-politician → draw →
  propose flow, with **board-derived** power and a **live-metric** political victory.
- **Q27–Q29** (`roadmap-appendix.md:679-736`): the design-session questions. Q27 = the owner pivot
  (choose-not-draw, Year 2). Q28/Q29 resolved by §1 + Appendix A above (deck contents included).
