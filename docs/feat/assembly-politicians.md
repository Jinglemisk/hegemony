# The Assembly & Politicians system (Phase 3-B)

**Status: converged v1 design (owner session, 2026-07-19 → 2026-07-20).** The *shape* is locked —
cadence, flow, voting, the **persistent-Law effect model**, board-derived power/patronage, the victory
card, Stratokles, and a full **31-card starter deck**. What remains is **tuning numbers** (the `?tune`
panel + sim settle them) and the build itself. Not built yet; needs a **hand-playtest** before any AI
work. Supersedes the earlier transient/auto-expire sketch; the archive design and Q27–Q29 lineage are
in the appendix.

Feeds / supersedes: `docs/roadmap-appendix.md` (Q27–Q29), `docs/rules-archive.md`, `seasons.md`,
`docs/feat/two-panel.md`, `docs/feat/event-tables.md`, `docs/sim/2026-07-18-greedy-vs-smart.md`,
`todo.md`. Companion brainstorm surface: `docs/reference/assembly-politicians-brainstorm.html`
(still on the old transient model — owed a re-point to this deck).

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

### 1.2 The surface — a mode that "pops over the map"
A **full-screen, toggleable mode** (the sanctioned density valve the flat UI's dossier flagged), mounted
like the yearly omen — an engine-state gate (`G.pendingAssembly`) through a full-bleed `ModalShell`
variant, reusing the two-panel `{view, entry, scroll}` route model. Includes an **active-laws board**
(the archive's "resolutions in the center of the board") showing every standing Law/Sanction, its
author, and each politician's power. Lands with the deferred two-panel deep-links + dossier. Aegean blue
(reserved for politics) is the accent; the voting-urn icon is drawn.

### 1.3 The ballot — pick a politician, draw, then propose or discard
No private hand, no static menu. To put a resolution forward a player **spends influence to draw** —
choosing **which politician's deck** (you pick the faction; the *card* is random) — then **discards or
proposes** it. Discarding and drawing again costs influence each time (the fishing sink). If you draw a
Law already active on the board, it can't be re-enacted (discard it). Each player may **propose at most
one** card per assembly. The ballot is:
- **1 house card** — auto-drawn from a **random** politician's deck, always present.
- **+ every card players chose to propose.**

All proposed cards are **voted in order**; **simple majority** passes, **ties fail** (tunable). Because
you pick the *politician* but not the *card*, patronage stays deliberate (fish to feed your patron)
while the outcome stays varied and un-cherry-pickable.

### 1.4 Influence — the verbs (the sink)
Influence's whole job. A **deep, active sink**:
- **Draw from a chosen politician's deck** — pay to draw one random card of a politician you pick, then
  discard or propose. **Redrawing (fishing) costs influence each time** — the primary sink.
- **Repeal** — propose removing an active Law/Sanction; it is **voted like any card** (majority). Paying
  to propose a repeal is a spend; winning the vote removes the law. Removing a law is as political as
  passing one — a Sanctioned player must marshal a coalition, they can't just buy their way out.
- **Bribery — buy votes** — ~X influence for +1 vote, **capped** at +2–3 per player per assembly
  (tunable). Patronage flavor; keeps the sink deep without letting a hoard buy any outcome outright.
- **Veto** — strike one resolution, **once per assembly**.

### 1.5 Effects — Laws, Directives, Sanctions (standing, until repealed)
Effects are **not** one-year weather. They are structural modifiers built from levers the engine already
has (yields, ladder/bank/action/build/grow-pop/calm costs, happiness) — every effect a `Ruleset` patch.
Three kinds (the split is *Twilight Imperium*'s Laws/Directives, proven):
- **Laws** (the 3 regular politicians) — **table-wide, standing until repealed, unique** (you can't
  enact the same Law twice). **Every Law carries a trade-off** ("−x, but +y") so it favors some builds
  and hurts others — that is what makes the vote political rather than a rubber-stamp.
- **Sanctions** (Stratokles) — **single-target, standing until repealed**, chosen by the buyer. The same
  Sanction can exist **once per victim** (multiple instances). Lasting ostracism, not a one-time hit.
- **Directives** (Stratokles) — **one-time**, resolve immediately (a riot, a seizure).
- **The active-law cap** — ~**6** total on the board (tunable), bounding rule-soup and setting each
  politician's power ceiling. At the cap, a new Law proposal must **name an active Law to replace**
  (single vote), so the board self-manages without deadlock.
- **No auto-expiry, no "next turn" effects** — reverses the earlier sketch. Persistence is the point.

### 1.6 Power & patrons — read off the board, not tracked
No hidden counters, no decay timer — **the board is the scoreboard:**
- **Politician power = the number of their Laws/Sanctions currently active on the board.**
- **Patron = the player who authored the most of that politician's active cards** (ties → earliest
  author, or none — reuse `victoryStandings`' tie→null pattern).
- **Repeal replaces decay** — a card leaving the board (repealed or replaced at the cap) lowers its
  politician's power naturally.
- With a ~6-law cap, a politician is **dominant at ~3 active**. The patron holds that politician's
  **themed standing buff** (continuous incentive to champion one).

### 1.7 The political victory card — a live metric
**"Voice of the Assembly" — patron of the most politicians** (tie-broken by total active-law count). A
6th victory card that recomputes every turn and flips hands like the other five (`victoryStandings` +
board-derived patronage). Fluid and contestable, *not* a one-time achievement. Minimum-to-hold tunable.

### 1.8 Stratokles — the wildcard
- **No auto-targeting.** His Sanctions/Directives carry a **buyer-chosen target**; the leader-check is
  *emergent* (players choose to aim him at whoever's winning). Target is bribeable via table-talk / a
  gift (enforced player trade is Phase 4).
- **Sanctions are his teeth** — standing debuffs on a rival until a repeal vote succeeds (Atimia zeroes
  a rival's political income; Blockade taxes their every action). Scarier and more political than a
  one-time strike.
- **Power → coup.** When Stratokles holds the **most active cards *and* ≥3 of them** (re-anchored from
  "5" to board scale; tunable), the demagogue seizes the city — **his patron wins**. This is the "too
  powerful = game over" idea resolved as a **win, not a mutual loss** (everyone-loses is a dead cap
  nobody triggers). A reason to push the track *and* to fight it. *Playtest watch: swing risk.*

### 1.9 The four politicians
| Politician | Epithet | Ideology / lever focus |
| --- | --- | --- |
| **Demosthenes Archimenid** | Agricultural Reformer | food, the land, the citizen/agrarian order |
| **Perdiccas Tyrpanid** | Urban Planner | buildings, cities, density — **tall** |
| **Kleistophenes Hippaid** | Rural Expansionist | colonies, frontier, sprawl — **wide** (Perdiccas's mirror; they clash) |
| **Stratokles Stratoklid** | Cunning Populist | redistribution, targeted sanction, tearing down |

The full deck is Appendix A.

---

## 2. What the vision implies
- **Politics becomes real** — the first true rivalry engine; each vote reshapes the permanent ruleset.
- **Trade-offs make votes political** — a Law favors some builds and hurts others, so a vote is a
  referendum on which strategy the table backs (the coalition puzzle with teeth).
- **Influence is worth having** — you spend it to rewrite the game's rules in your favor and against
  rivals, permanently. The "just-because" is gone.
- **Perdiccas vs Kleistophenes** (tall vs wide) is a built-in ideological tug-of-war in the assembly.
- **Stratokles is ostracism by consent** — the table *chooses* to sanction the powerful, and pays for
  it by feeding a demagogue toward a coup.

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

## 6. Still open — before build
1. **Tuning numbers** — the §5 dials (verb costs, cap, thresholds, Law magnitudes). Sim + `?tune`.
2. **The standing-modifier engine layer** — the design seam for `activeLaws` that income/cost/happiness
   pipelines consult (the one genuinely new bit of engine).
3. **Stratokles targeting vs Phase 4 trade** — v1: buyer picks target; greasing-trade is table-talk /
   minimal-gift now, full enforced trade when Phase 4 lands.
4. **Bot voting logic** — deferred to Phase 3-C; noted so v1 stays bot-implementable.

---

## Appendix A — the starter deck (31 cards, all distinct)

Regular decks are **sets of unique Laws** (no copies — a standing Law can't be enacted twice; deck size
= that politician's power ceiling). Stratokles's Sanctions are single-target (one instance per victim).
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

### Stratokles — Cunning Populist (7 cards) · *buyer picks the target*
| Card | Type | Effect |
| --- | --- | --- |
| **Atimia** | Sanction | Target's citizens produce no influence *(political castration)* 🌶️🌶️ |
| **Blockade** | Sanction | Target pays +2 gold on every action 🌶️ |
| **Sumptuary Law** | Sanction | Target's stockpiles give no happiness, and −1 happiness/turn 🌶️🌶️ |
| **Debtor's Yoke** | Sanction | Target's freemen produce −1 gold 🌶️ |
| **Incite Unrest** | Sanction | Target −2 happiness every turn 🌶️🌶️ |
| **The Mob Rises** | Directive | Target loses 1 random pop from largest settlement 🌶️🌶️ |
| **Seize the Granaries** | Directive | Target loses 10 food/wood/stone; **buyer takes half** 💰 |

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
