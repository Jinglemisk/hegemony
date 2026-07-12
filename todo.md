# Hegemony — To-Do

!!! If you have made changes to code due to todo.md, or if something needs to be updated later and remembered, edit this document !!! 

!!! If the user has made an addition, it will be marked with *** and it must be rehabilitated into the document.


*** 



---

## Gameplay & mechanics

- Follow the roadmap (docs/roadmap.md) and drive work through its Q&A workbench (docs/roadmap-appendix.md).
-- Phases 0–5 with exit gates; the appendix holds per-phase questions, the decision log, and the execution log. Start each session there.

- ~~Event tables — dice + lookup table as a reusable, data-driven component (never hardcoded; shared engine seam + UI modal).~~ DONE (feat/phase1-currencies — docs/feat/event-tables.md; tables in data.ts, `rollOnTable` seam in game/tables.ts, one shared EventTableModal).
-- ~~Riot table replaces random unrest pop removal at ≤ −5~~ SHIPPED: d6 with building destruction on the 1 (rows 1–2 swapped per Q15 for monotonic severity), pop losses random (the mob decides); severe tier (≤ −10) rolls at −2 with doubled pop losses, rebound −4; the riot blocks the turn and defers income until the roll.
-- ~~Pre-roll insurance~~ SHIPPED (amended per Q15: all THREE may be bought, once each, max +3): bread dole 4 food, free concession-demotion, 3 influence patronage. Full insurance makes a mild riot pop-proof by design.
-- ~~Ventures ("Fund an Expedition")~~ SHIPPED (widened per Q16): three expeditions, player's choice, each ~−7% EV — Merchant Convoy (gold), Grand Embassy (influence), Colonists' Voyage (food; +1 freeman on a 6 only). Stake 5 gold / 8 wood, once per turn, open from turn 1.
-- Still open: the yearly/omen d20 table (design queue) lands on the same component.

- ~~Coastal leapfrog placement rule.~~ DONE (feat/phase0-victory-race, with the Q12 metropolis setup).
-- The island's 18 rim tiles are the coastline. Hold any settlement on a coastal tile → you may found colonies on any other coastal tile (sailing, not teleporting); interior colonies still chain by contiguity. Tuning knob: +2 food voyage cost for sea-founded colonies.
-- Dovetails with the metropolis fork (Q12): the founding colony could be "any coastal tile" — the apoikia pattern.

- ~~Promote / demote pop ladder.~~ DONE (feat/phase1-currencies — D8).
-- Promote: slave→freeman 4 food, freeman→citizen 4 gold. Demote: citizen→freeman 2 influence, freeman→slave 3 influence −1 happiness. One ladder move per player per turn; demotion is free (and throttle-exempt) during a riot. UI: ↑/↓ on the ledger's Pops tab.

- ~~Civic calm actions.~~ DONE (feat/phase1-currencies — D7).
-- Stabilize Province 4 influence or Bread & Circuses 6 gold → +3 happiness; one shared calm per turn. Calm verb in the Actions toolbar.

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
-- Shipped the rulebook's Unrest system mapped onto negative happiness; SUPERSEDED at the
   thresholds by the riot TABLE (feat/phase1-currencies, D9): ≤ -5 parks a blocking riot
   roll instead of flat removal; ≤ -10 is the severe tier. Starvation (two -2 food turns
   → 1 pop) and `timedHappinessDelta` multi-turn unrest carry over unchanged.
-- No passive drift (deliberate). Still open: Luxury Goods relief (needs coasts), the
   rulebook's exact -2/-4/-6 → 1/2/3 food-unrest magnitudes. (Player-choice pop removal
   resolved by Q15: the mob chooses — random; the player's levers are insurance + demote.)

- Deepen seasonal mechanics. (in progress on feat/seasons — see seasons.md)
-- ~~The season is just a bare counter.~~ DONE: it now reads as Year N / Spring–Winter (derived in core/calendar.ts), shown on the medallion + chronicle.
-- ~~Season cards have no seasonal character.~~ DONE: the seasonal deck is weighted by season — winter draws more harsh cards, spring more growth, etc. (tags, not deterministic penalties).
-- Still open: an end-of-season resolution step (where happiness bites), yearly cards on each new year, and the finite-deck endgame clock.

- Add more start setups / game modes.
-- The mode seam already works (standard / fast-start / deathmatch), selected in code by GAME_CONFIG.mode — a mode is just a ruleset patch.
-- ~~SETTLED (roadmap-appendix D3)~~ SUPERSEDED by Q12 (2026-07-12): the standard setup is now METROPOLIS (4 pops) + FOUNDING COLONY (2 pops, any coastal tile or beside the metropolis), snake order. Gameplay colonies chain by contiguity or sail coast-to-coast (leapfrog). Board setting: ?board=classic|shuffled (+ ?seed=N, ?dev=preload, ?setup=manual).
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

- ~~Bank exchange via gold as the medium.~~ DONE (feat/phase1-currencies — D6/Q14; rates provisional)
-- Never direct barter; gold is the unit of account. Rates are PER-MATERIAL and board-derived (Q14, user's call): tile-count scarcity classes computed once at game creation, static all game — classic prices wood 4→1g/2g, stone 2→1g/3g, food 3→1g/2g. `uniform` derivation stays a ruleset knob (A/B verdict 2026-07-12: no measurable difference; scarcity kept for board texture — docs/sim/2026-07-12-bank-rates-ab.md). No trade cap. UI: ledger Market tab.
-- Watch (ledger): venture wood-stake is strictly cheaper than the gold stake at bank prices; bankBuy churn in sims is a bot artifact.

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
