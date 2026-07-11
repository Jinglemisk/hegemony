# Hegemony — To-Do

!!! If you have made changes to code due to todo.md, or if something needs to be updated later and remembered, edit this document !!! 

!!! If the user has made an addition, it will be marked with *** and it must be rehabilitated into the document.


*** 



---

## Gameplay & mechanics

- Follow the roadmap (docs/roadmap.md) and drive work through its Q&A workbench (docs/roadmap-appendix.md).
-- Phases 0–5 with exit gates; the appendix holds per-phase questions, the decision log, and the execution log. Start each session there.

- Event tables — dice + lookup table as a reusable, data-driven component (never hardcoded; shared engine seam + UI modal). (settled — roadmap-appendix Q9/Q10)
-- Riot table replaces random unrest pop removal at ≤ −5: d6 for the mob's demand (lose pops / building shuttered / grain sacked / ransom / disperses), severity ≈ constant, texture varies; severe tier rolls at −2 with doubled pop losses.
-- Pre-roll insurance only (max +2): bread dole 4 food, free concession-demotion, 3 influence patronage.
-- Ventures ("Fund an Expedition"): stake 5 gold / 8 wood, d6 for lost / break-even / win 9 — ~−7% EV, the catch-up casino. Another event table + Actions-tab entry.

- Promote / demote pop ladder. (costs settled — roadmap-appendix Q8)
-- Promote: slave→freeman 4 food, freeman→citizen 4 gold. Demote: citizen→freeman 2 influence, freeman→slave 3 influence −1 happiness. One ladder move per player per turn; demotion is free during a riot (the mob forces it).

- Keep the balance ledger current (docs/balance.html).
-- Living balance document: outstanding issues (ranked P0–P2), deck/economy analysis, playtest scenarios. Update it in the same commit as any change to ruleset.ts, data.ts, or the event decks; log the change in its changelog.

- ~~Add an end condition and scoring.~~ DONE (feat/phase0-victory-race — victory race per roadmap-appendix D1).
-- ~~The game never ends — the event decks reshuffle their discard piles forever — and every player shows "VP --", so there is no reason to play well.~~
-- Shipped: 5 public "Most X, min Y" victory cards (sole leader holds; 3 at your own turn start wins); seasonal deck is the finite clock (~29 seasons); exhaustion resolves most-cards-held. Minimums are ruleset tunables — the tuning sim campaign is still owed.
-- Direction (user's idea): make the event deck a finite clock. Stop the reshuffle; when all event cards are spent, the game ends and "victory cards" resolve, awarding for categories like most resource points, most pops, most cities, most X. The deck length becomes the game length.
-- Interim/fallback: a fixed end-of-season-10 tally — +5 per city, +3 per colony, +1 per citizen, +1 per freeman, +1 per 10 material resources (rounded down), -1 per point of negative happiness.
-- ~~SETTLED (roadmap-appendix D1)~~ BUILT: victory RACE — 5 public victory cards, each "Most X, minimum Y" (sole leader above the floor holds it; ties hold nothing); hold any 3 at the start of your own turn to win. Seasonal deck stops reshuffling and is only the failsafe ceiling (~7 years; most cards held wins on exhaustion, tiebreak happiness then pops). Provisional VP replaced everywhere (ledger Victory tab, roster badges, game-over screen).

- ~~Give happiness real consequences.~~ DONE (feat/unrest-consequences — see unrest.md).
-- ~~Happiness accrues but does nothing yet — it is a meter with no teeth.~~
-- Shipped the rulebook's Unrest system mapped onto negative happiness: a start-of-turn
   upkeep removes 2 pops at happiness ≤ -5, 4 pops + rebound to -4 at ≤ -10 (random,
   via the seeded RNG); two consecutive -2 food turns starve a pop; and a new
   `timedHappinessDelta` event effect drives multi-turn unrest ("Civil Discord", "Plague").
-- No passive drift (deliberate). Still open: Luxury Goods relief (needs coasts), the
   rulebook's exact -2/-4/-6 → 1/2/3 food-unrest magnitudes, player-choice pop removal.

- Deepen seasonal mechanics. (in progress on feat/seasons — see seasons.md)
-- ~~The season is just a bare counter.~~ DONE: it now reads as Year N / Spring–Winter (derived in core/calendar.ts), shown on the medallion + chronicle.
-- ~~Season cards have no seasonal character.~~ DONE: the seasonal deck is weighted by season — winter draws more harsh cards, spring more growth, etc. (tags, not deterministic penalties).
-- Still open: an end-of-season resolution step (where happiness bites), yearly cards on each new year, and the finite-deck endgame clock.

- Add more start setups / game modes.
-- The mode seam already works (standard / fast-start / deathmatch), selected in code by GAME_CONFIG.mode — a mode is just a ruleset patch.
-- ~~SETTLED (roadmap-appendix D3)~~ BUILT: the standard setup is TWO CITIES — capital + second city, snake order, no setup colony, 3 pops each. Colonies are all player-founded, chained by radius-1 contiguity. Board setting shipped as ?board=classic|shuffled (+ ?seed=N, ?dev=preload).
-- Add more modes as data; an in-game mode picker is lobby scope (deferred).

- Add a second tier of buildings.
-- Only four basic buildings exist; economic paths barely differ.
-- Candidates once scoring/happiness matter: Aqueduct (+4 capacity), Forum (+2 influence), Barracks (military placeholder / +1 score), Warehouse (+1 tile material income).

- Build the Assembly / resolutions system.
-- The Resolutions deck is a "0/0" placeholder in the command panel.
-- Players vote on resolutions that affect some or all of them (rivalry mechanics).
-- This is where players will spend Influence primarily

- Terrain & resource economy rework. (planned — see docs/feat/terrain-economy.md; ships with building tier 2, roadmap Phase 2)
-- Settled: wood/food/stone are first-order (from tiles); gold/influence are second-order (from pops/trade/buildings) — gold tiles removed, hills become the slot-rich "acropolis" terrain.
-- Also pinned there: building pricing grammar, landmark-tile principle + constrained shuffle, trade-before-stone-sinks sequencing.

- Bank exchange via gold as the medium. (SETTLED — roadmap-appendix D6; rates provisional)
-- Sell any material 3:1 for gold, buy any material for 2 gold — never direct barter; gold is the unit of account (user's Age-of-Empires model). Static bank: its rates bracket future player trade. Rates are ruleset tunables expected to move with playtesting.

- Luxury goods and trade.
-- Deferred design; see docs/feat/luxury-goods.md — amended by docs/feat/terrain-economy.md (distinct goods, diminishing duplicates, ~3 active per player cap).

- National ideas / player identities.
-- Per-player modifiers so the four seats play asymmetrically.
-- They pick these after initial colony placement to further bolster their playstyle.

- Coastal tiles and ports.
-- The map is inland-only right now — no coast, ports, or naval movement.

---


## Presentation & UI

- Finish the interface overhaul (started from the UI audit).
-- DONE so far: the top bar is re-gridded — a central season dial with hand-painted Greek season art (tree / sun / bare tree / snowflake), Year + acting player either side, and a uniform four-seat roster showing each player's city / colony / pop counts and a provisional VP. Events moved back to the top-left as cards with an inline-icon effect summary + full-text hover tooltip. Ledger gained an empire summary (icon + count) and always shows every resource icon (dimmed dash when zero). Decks collapsed to a slim tray (dead "Resolutions" placeholder removed). A universal inline resource/pop/building icon system (AnnotatedText) now runs across cards, modals, and the chronicle.
-- ~~Also done: action verbs are now 2x2 buttons showing each action's cost (greyed when unavailable/unaffordable); the chronicle is folded under one sticky heading per season; the heavy Greek-key panel frame is demoted to a hairline; the Buildings tab gained the inline-icon system (the Pops tab was already aligned).~~
-- Still open: nothing major from the audit. Optional — regenerate the autumn season icon to kill its faint cutout haze (only visible at large zoom).

- ~~Provisional victory points are shown but scoring is not real yet.~~ DONE (feat/phase0-victory-race).
-- The roster shows victory cards held (n/3), the ledger gained a Victory tab (all five cards, holders, per-player values vs minimums), the top bar shows seasons-remaining and the year's opener, and a game-over screen names the winner.

---

## Tooling & testing

- ~~Headless sim CLI + legal-move enumeration + bots + batch telemetry.~~ DONE (feat/sim-cli — see docs/simulation.md).
-- `npm run sim` drives the pure engine from the terminal: play move-by-move, auto-play with bots, run seeded batches with an aggregated balance report + CSV, record/replay games. `scenario()` builder (src/game/testing/scenario.ts) constructs mid-game states for tests.

- Grow the greedy bot into a credible baseline player.
-- Current heuristic is one-ply VP-anchored; batch results underrate delayed payoffs (buildings). A 2-ply or turn-level rollout would make balance reports read closer to human play. Needed for the Q1 victory-threshold tuning campaign.

- ~~Wire a batch smoke run into CI.~~ DECLINED (roadmap-appendix Q11): no per-PR sim gate — sims are for ad-hoc hypothesis tests, planned campaigns, and phase-exit checks. PR gate stays `npm run check` + tests.

---

## Tech debt & polish

- Memoize the last two panels (ActionCommandPanel, ResourceGrid).
-- The render-perf pass memoized the heavy panels; these two were left out (cheap, same pattern).

- Shrink the .git history (~129 MB).
-- Bloated by old/replaced binary art still living in past commits.
-- Use git-filter-repo to purge the large blobs; coordinate first (rewrites history → force-push + everyone re-clones).

- Fix the 2 npm-audit vulnerabilities from the toolchain.

- Turn on stricter TypeScript flags.
-- noUncheckedIndexedAccess, noUnusedLocals, and friends.

- Split Resources into spendable goods vs. score meters.
-- Happiness and influence are meters, not spendable stock, but they currently ride in the same resource bag as wood/stone/gold/food.
