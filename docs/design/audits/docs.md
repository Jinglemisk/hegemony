# Hegemony docs extraction — raw data for brandbook synthesis

Sources read: docs/roadmap-appendix.md, docs/roadmap.md, rules.md, todo.md, docs/resource-color-rollback-note.md, docs/v0.1-rules-spec.md (headings + Resources/Deferred/Implementation sections), docs/feat/ (ui-overhaul.md, terrain-economy.md, luxury-goods.md + event-tables.md headings), README.md, seasons.md, unrest.md, plus grep across docs/reference showcases and src/styles for design language.

---

## 1. CONCEPT INVENTORY (what a player-facing UI must represent)

### Currencies / resources (six tracked, per rules.md + spec)
- **Wood** — first-order material from Forest tiles; the expansion/tempo currency (colonies 20w, most economic buildings). UI: ledger resource pills with CSS-mask icons.
- **Stone** — first-order material from Mountain tiles; civic/permanent buildings (Temple 6). UI: ledger pill.
- **Gold** — currently from Hill tiles + pops; **unit of account at the bank**; pays Bread & Circuses, citizen promotion, venture stake, riot bribes. UI: ledger pill. (Phase 2 removes gold tiles — gold becomes second-order, pop/trade-driven.)
- **Food** — from Plains tiles; pop upkeep, pop growth, promotion (slave→freeman 4 food), riot bread dole; stored food gives +1 happiness per 5 held, capped +2. UI: ledger pill.
- **Influence** — political currency earned by citizens; sinks: Stabilize Province (4), demotions (2/3), riot patronage (3), Grand Embassy payout; Assembly is the future primary sink. Never bankable. UI: ledger pill.
- **Happiness** — a *meter, not stock* (todo.md explicitly wants "spendable goods vs score meters" split someday); lifted by temples/food/calm, dragged by slaves/overcrowding/hunger; negative = unrest with escalating banner (Discontent ochre → Unrest clay → Revolt deeper clay). UI: ledger pill + EmpireIntelPanel warning banner + tooltip.
- Starting stock: 20w / 10s / 10g / 12f / 0 inf / 0 hap.

### Phase 1 additions (all shipped on feat/phase1-currencies)
- **The Bank / Market** — gold-mediated static exchange ("a corridor, not a merchant"); per-material rates derived once from board tile counts (classic: wood 4→1g / 2g buy, stone 2→1g / 3g, food 3→1g / 2g), static all game, no trade cap; every trade destroys net value. UI: **Market tab** in the ledger (5-up ledger), rates always visible.
- **Civic calm** — one calm action per player per turn, two payments: **Stabilize Province** (4 influence) or **Bread & Circuses** (6 gold), both +3 happiness. UI: **Calm verb** in Actions toolbar.
- **Social ladder (promote/demote)** — slave→freeman 4 food, freeman→citizen 4 gold; citizen→freeman 2 inf, freeman→slave 3 inf −1 hap; one move/turn; demotion free during riots. UI: **↑/↓ controls on the Pops tab**.
- **Riot table** — at happiness ≤ −5 at turn start, a **blocking d6 roll** before income; outcomes from "mob torches the works" (1) to "mob disperses" (6); pre-roll **insurance** (each once per riot, +1 each, max +3): bread dole 4 food, concession (free demote, target picker), patronage 3 inf. Severe tier ≤ −10: roll −2, doubled pop losses, rebound to −4. Lost pops chosen randomly — "the mob decides." UI: shared **EventTableModal** with insurance slots.
- **Ventures — "Fund an Expedition"** — once/turn, stake 5 gold or 8 wood, player chooses among three d6 tables at ~−7% EV ("catch-up casino"): **Merchant Convoy** (gold), **Grand Embassy** (influence), **Colonists' Voyage** (food; +1 freeman jackpot on a 6 only). UI: **Venture verb** + EventTableModal.
- **Event tables (component)** — reusable data-driven dice tables (`EventTable` data, `rollOnTable` engine seam, one shared `EventTableModal`); riot + 3 expeditions today; yearly/omen d20 table lands on it later. Tables are public information — "decks for economy, dice for drama."

### Pops
- Three kinds: **Citizen** (+2 gold +1 influence, eats 2 food), **Freeman** (+2 gold, eats 1), **Slave** (+1 of tile's resource, eats 1, −happiness). Each fills 1 capacity unit. UI: Pops tab (production/consumption with signed colored numbers per ui-overhaul.md, Gained/Deaths counters), roster pop counts, inline pop icons via AnnotatedText.

### Settlements
- **Metropolis** (the mother city / "Capital" in spec — 10 pops, tile slots +2, no yield bonuses — the capital-privilege ban); **City** (upgraded colony, 10 pops, slots+2); **Colony** (4 pops, no buildings; two rival colonies may share a tile at half yield). Setup: metropolis (4 pops) + founding colony (2 pops, any coastal tile — the apoikia pattern) in snake order.

### Board / map
- 37-hex island; **Forest→Wood, Hill→Gold, Mountain→Stone, Plains→Food**; printed yield numbers + building-slot counts; 18 rim tiles = coastline (coastal leapfrog founding). Classic authored layout or Shuffled (seeded) via `?board=`.

### Buildings (four, stackable)
- **Marketplace** (12w, +2 gold/freeman up to 3), **Temple** (6s, +1 hap, +1 inf/citizen up to 2), **Workshop** (12w, +1 tile resource/slave up to 3), **Granary** (12w 2s, +2 food, −2 growth cost). Tier 2 coming (Aqueduct, Forum, Barracks, Warehouse candidates). UI: Buildings tab, slots in city view.

### Time / seasons
- Years of 4 seasons (Spring/Summer/Autumn/Winter); season = one round of 4 turns; first player rotates each year. Season character via **deck weighting** (winter draws more harsh cards — tendency, never a rule). UI: central **season medallion/dial** with hand-painted Greek season art (tree / sun / bare tree / snowflake), "Year N / Spring" label, chronicle tags "Y1·Sp", seasons-remaining counter in top bar.

### Events
- **Seasonal events** (shared, one per season, season-weighted deck — also the finite game clock, ~29 seasons) and **player events** (per active player, resolved before actions; some offer choices). Some cause **lingering unrest** (timedHappinessDelta, "−2/turn for 3 turns"). UI: top-left event cards with inline-icon effect summary + hover tooltip; slim deck tray. Future: **yearly cards** on each new Spring.

### Victory
- **Victory race**: 5 public "Most X, min Y" cards — **Polis Builder** (most cities, min 3), **Demos** (most pops, 16), **Civic Elite** (most citizens, 8), **Treasurer** (stockpile 80), **Beloved of the People** (happiness +10); sole leader holds; **3 at your own turn start = win**; deck exhaustion → most cards held. UI: **Victory tab** in ledger, roster n/3 badges, seasons-left in top bar, game-over screen.

### Verbs (the action vocabulary, per rules.md turn order)
Found a colony · Upgrade colony to city · Grow a pop (per-settlement once/turn) · Move pops · Build · Trade at the bank · Civic calm · Social ladder move · Fund an expedition · End turn. Current UI: cost-labeled 2×2 buttons greyed when unaffordable; user wants them relocated (see roadmap pressure).

### Other status surfaces
- Unrest banner (three escalation tiers), starvation counter (2 consecutive −2 food turns → 1 pop), Chronicle (event log folded per season), empire summary (icon + count), universal **AnnotatedText** inline icon system across cards/modals/chronicle.

---

## 2. PRIOR DESIGN DECISIONS (visual direction)

- **Greek-vase / Kerameikos ceramic language** (docs/reference/codex-showcase.html + codex-banana-showcase.html): two explored systems — **black-figure dark mode** and **red-figure light mode on warm slip**; terracotta as main figure color, **Aegean blue reserved for navigational/political contrast**; "copperplate-like inscriptional capitals give the interface a stamped ceramic rim" (no remote font loading); tiles rendered as "ceramic hex components."
- **Parchment theme**: base palette variables in src/styles/base.css and docs/balance.html — `--parchment #f4ebd6`, `--parchment-deep #ecdfc2`, `--olive #5e6e3a`, plus clay/ochre/aegean chips (#5E6E3A "Olive Yield" named in the showcase).
- **Flat AAA-strategy preference** (user, explicit): hates box-backgrounds; the "heavy Greek-key panel frame was demoted to a hairline"; ui-overhaul work item says "flat AAA look throughout." Framed icon tiles = "clay border + parchment ground (terrain-hex aesthetic, **no hue overlay**)" (shared.css comment).
- **THE RESOURCE-COLOR ROLLBACK (design regret to honor)** — docs/resource-color-rollback-note.md: the map used to tint each hex by its resource — hex polygon fill/stroke, tile yield plate, and terrain art all colorized via `resourceCssVars` gradients (mountain grey-green, hill brown-gold, forest olive, plains wheat). This was **rolled back in favor of a neutral ceramic terrain scheme** — terrain hexes no longer carry resource hues; shape/art carries the kind. The note preserves the exact old colors for revert (wood #5e6e3a, stone #8f8571, gold #d98a35, food #c0461c, influence #1f6977, unrest #b13a28) — those hues survive in the **UI resource pills/icons**, just not on the board. Implication for a brandbook: resource color belongs to iconography and text annotation, not to terrain surfaces; the board stays ceramic-neutral so **color can mean owner** (hex grammar: shape = kind, color = owner — per the project's design-vision memory).
- **Semantic status colors in use**: olive = gains/positive, clay = losses/deaths/unrest, ochre = warning/discontent (unrest banner escalation and Pops-tab stat tinting).
- **Season art**: hand-painted Greek season icons already exist (tree/sun/bare tree/snowflake); one known defect — autumn icon has a faint cutout haze at large zoom.
- **Sprites**: generated with Nano Banana, backgrounds always removed (CLAUDE.md).
- **Architecture invariant relevant to design**: pure engine / React UI split; UI never re-derives thresholds (e.g. unrestStatus helper) — visual system should assume data comes annotated from the engine.

---

## 3. ROADMAP PRESSURE (design for tomorrow's game)

Immediate (user-filed, 2026-07-12, todo.md Presentation section):
- **UI refactor: ONE ledger with VERTICAL tabs** — the 5-up horizontal tab row "is already cramped and will not survive more tabs"; Actions panel + Ledger collapse into one; **action verbs move to a dedicated home (bottom bar or strip under top bar)** so the board gains width. Brandbook must define a vertical-tab ledger and a verb bar.
- **Game-reference compendium behind the season icon**: a categorized modal — victory-card roster, every event table (read-only EventTableModal render), bank rates, deck contents/season weighting, costs cheat-sheet. "Everything rollable or drawable should be viewable before it happens."

Phase 2 — "The land repriced" (terrain-economy.md, settled decisions):
- **Gold tiles removed**; hills become the **"acropolis" terrain** — slot-rich, yield-poor. Hill tile art and `resourceVisuals.ts` "currently read hills as gold" and will need rework. Landmark tiles (breadbasket food-10, quarry stone-6, old-growth wood-4) worth visually distinguishing. **Building tier 2** ships alongside (roster grows — building iconography must scale).
- Pricing grammar to keep legible: wood=economic buildings+expansion, stone=civic/permanent, gold=commerce/special, food=pops only, influence=political acts only — a brandbook can echo this as a currency-to-domain mapping.

Phase 3 — rivalry layer: **Assembly + resolutions + Politicians v1** (a resolutions deck, voting UI, politician cards — Stratokles as leader-check). Influence gets its primary sink; Assembly convenes each new-year Spring.

Phase 4 — the wider world: **coasts, ports, luxury goods, player trade**. Radial map grammar: interior = production, coastal rim = trade/gold/contentment. Luxury goods = distinct named goods (Wine & Olive Oil etc.), diminishing duplicates, ~3 per player — needs token/badge treatment. Player-to-player trade happens inside the bank's corridor.

Phase 5 — **national ideas** (per-player asymmetry, drafted after placement), mode picker/lobby, multiplayer track.

Design queue also holds: **yearly cards / d20 omen table** (same EventTable component — modal must scale past d6), end-of-season resolution step, military (explicitly parked), 2–3 player support (parked).

Other pressure: Q13b colony repricing may change costs (14w+6g variant); rates and minimums are ruleset tunables — **never hard-code numbers into art/copy**. Modes exist (standard / fast-start / deathmatch) and are data.

---

## 4. TERMINOLOGY (canonical names)

- Game: **Hegemony**; players build a **Greek city-state**; win by becoming **the hegemon**.
- Settlements: **Metropolis** ("mother city"), **City**, **Colony**, **Founding colony**; **founding** (not "building") a colony; **coastal leapfrog**; "the great colonization: your settlers sail."
- Pops: **Pops** (never "units/population points"); **Citizen / Freeman / Slave**; **the social ladder**; **promote/demote**; **grow a pop**.
- Economy: **the bank** ("a corridor, not a merchant"); **Market tab**; **sell-rate/buy-rate/the spread**; **stockpile**; **materials** = wood/stone/gold/food; gold = **the unit of account**.
- Civic: **Civic calm**; **Stabilize Province**; **Bread & Circuses**; **unrest** (negative happiness "reads as unrest"); tiers **Discontent → Unrest → Revolt**; **the riot table**; **insurance** (**bread dole / concession / patronage**); "the mob decides"; **lingering unrest**; **starvation**.
- Ventures: **Fund an Expedition**; **Merchant Convoy / Grand Embassy / Colonists' Voyage**; **the stake**; "catch-up casino" (internal), "the expedition is a gamble... meant for whoever is behind."
- Victory: **victory cards**; **the victory race**; card names **Polis Builder, Demos, Civic Elite, Treasurer, Beloved of the People**; "Most X, minimum Y"; **sole leader holds**; seasonal deck = **the game's clock**; "the age ends."
- Time: **Year N**, **Spring/Summer/Autumn/Winter**; **the season medallion**; first-player **rotation** ("the year turns, the order turns").
- Events: **seasonal events / player events / yearly cards** (future); **event tables**; **omen table** (future d20); "decks for economy, dice for drama."
- Surfaces: **the Ledger** (tabs: Market, Pops, Buildings, Victory, +empire summary), **the Chronicle** (game log), **the roster** (four-seat player strip), **the deck tray**, **the top bar**, **EventTableModal**, **AnnotatedText** (inline icon system), **verbs** (Grow / Move / Found / Upgrade / Build / Trade / Calm / Venture / End Turn).
- Board: **the island**, **tiles/terrain** (Forest/Hill/Mountain/Plains), **building slots**, **the coastline/rim**, future **acropolis terrain** and **landmark tiles** (**breadbasket**, **quarry**, **old-growth forest**), **Classic/Shuffled** boards.
- Deferred-but-named: **the Assembly**, **Resolutions**, **Politicians** (Stratokles), **National Ideas**, **Luxury Goods**, **ports**, **Traders**.

Key file paths for the synthesis step: /Users/jinglemisk/Desktop/hegemony/docs/resource-color-rollback-note.md, /Users/jinglemisk/Desktop/hegemony/docs/reference/codex-showcase.html (and codex-banana-showcase.html — full explored vase-system palettes/typography), /Users/jinglemisk/Desktop/hegemony/src/styles/base.css (live palette variables), /Users/jinglemisk/Desktop/hegemony/src/ui/resourceVisuals.ts (live resource colors), /Users/jinglemisk/Desktop/hegemony/docs/feat/terrain-economy.md (Phase 2 map grammar), /Users/jinglemisk/Desktop/hegemony/todo.md lines 97–111 (the user's pending UI refactor + compendium).

## TOP FINDINGS
- Resource-color rollback is the key design regret: terrain hexes were once tinted per-resource and deliberately reverted to a neutral ceramic scheme — resource hues now live only in UI icons/pills (exact old hex values preserved in docs/resource-color-rollback-note.md), keeping board color free to mean ownership (shape=kind, color=owner).
- Established visual language: Greek-vase/Kerameikos ceramic — black-figure dark mode + red-figure light mode on warm slip, parchment base (#f4ebd6), terracotta figures, Aegean blue reserved for navigation/politics, inscriptional capitals; user explicitly wants flat AAA-strategy, no box backgrounds, hairline frames (docs/reference/codex-showcase.html).
- Concept inventory spans 6 resources (wood/stone/gold/food + influence and happiness, the latter two meters not stock), 3 pop tiers on a promote/demote ladder, 3 settlement kinds (metropolis/city/colony), 4 buildings (tier 2 coming), seasons/years, 2 event decks, and Phase 1's bank Market tab, civic calm, riot table with insurance, and three named ventures — all with existing UI surfaces noted.
- Victory is a race for 5 public 'Most X, min Y' cards (Polis Builder, Demos, Civic Elite, Treasurer, Beloved of the People); hold 3 at own turn start to win; the finite seasonal deck is the clock — Victory tab, roster n/3 badges, seasons-left counter already exist.
- Nearest roadmap pressure (user-filed): collapse Actions+Ledger into ONE ledger with VERTICAL tabs (horizontal 5-up row won't survive more tabs), move the verb row to a bottom/top strip, and add a game-reference compendium modal behind the season icon (all tables/rates/decks viewable before they fire).
- Phase 2 will remove gold tiles and turn hills into the slot-rich 'acropolis' terrain with landmark tiles (breadbasket/quarry/old-growth) — hill art and resourceVisuals.ts currently read hills as gold and must change; Phases 3-5 add Assembly/resolutions/politicians, coasts/ports/luxury goods/player trade, and national ideas.
- Event tables are a reusable public-information component (riot d6 + 3 expedition tables via one shared EventTableModal; future d20 omen table) — 'decks for economy, dice for drama' is a stated design principle.
- Canonical terminology matters: metropolis (not capital-with-bonuses), pops, verbs (Grow/Move/Found/Upgrade/Calm/Venture), Stabilize Province vs Bread & Circuses, bread dole/concession/patronage insurance, the Ledger/Chronicle/roster/medallion, 'the bank is a corridor, not a merchant'.
- All balance numbers (bank rates, victory minimums, costs) are ruleset tunables expected to move — the brandbook should never bake numbers into art or fixed copy.
- Semantic status colors already in use: olive = gains, clay = losses/unrest, ochre = warnings; unrest escalates Discontent → Unrest → Revolt in the ledger banner.
