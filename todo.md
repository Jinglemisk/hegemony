# Hegemony — To-Do

!!! If you have made changes to code due to todo.md, or if something needs to be updated later and remembered, edit this document !!! 

!!! If the user has made an addition, it will be marked with *** and it must be rehabilitated into the document.


*** Promote Slave->Freeman with Resources, Freeman->Citizen with Gold, Demote Citizen -> Freeman with Influence, Freeman->Slave with Influence

*** Event tables — dice + lookup table as a reusable resolution pattern. Start with a riot table for unrest pop-loss determination (d6: 1-2 lose food, 3-4 lose a pop, 5-6 a building is disabled / pay a ransom, etc. — keep expected severity constant, vary the texture). Influence can be utilized here: spend influence to shift the roll. Possible extension: player event cards become a d20 roll on an event table (yearly/seasonal events stay as drawn cards).

*** Opt-in gambles (ventures) — burn resources on dice rolls: pay a stake (gold/wood), roll a d6 for windfall / break-even / lost stake. If you can't trade resources away, you might as well stake them. Doubles as a gold sink; feel-bad-free because the risk is chosen.

*** Riot-table refinements (settled in the dice spitball):
1. Demotion during a riot is FREE — the mob forces the concession. Voluntary peacetime demotion still costs influence per the ladder above (no double-charging the influence path).
2. Deliberate riots are a legitimate play: a player may WANT unrest so they can demote for free — citizen->freeman keeps the gold but eats less, freeman->slave trades gold for raw tile resources. Guard: expected riot cost must stay above the demotion's market value (cap at one free demotion per riot), or torching your own city becomes a free pop-respec.
3. Riot mitigation is PRE-ROLL ONLY — insurance, not bribery. Bread, concessions, and influence spends are committed before the die is cast; no post-roll fixes. Braced-and-lucky means you wasted the stake; unbraced-and-unlucky hurts. That's the game.

*** 



---

## Gameplay & mechanics

- Keep the balance ledger current (docs/balance.html).
-- Living balance document: outstanding issues (ranked P0–P2), deck/economy analysis, playtest scenarios. Update it in the same commit as any change to ruleset.ts, data.ts, or the event decks; log the change in its changelog.

- Add an end condition and scoring.
-- The game never ends — the event decks reshuffle their discard piles forever — and every player shows "VP --", so there is no reason to play well.
-- Direction (user's idea): make the event deck a finite clock. Stop the reshuffle; when all event cards are spent, the game ends and "victory cards" resolve, awarding for categories like most resource points, most pops, most cities, most X. The deck length becomes the game length.
-- Interim/fallback: a fixed end-of-season-10 tally — +5 per city, +3 per colony, +1 per citizen, +1 per freeman, +1 per 10 material resources (rounded down), -1 per point of negative happiness.

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
-- Add more modes as data; an in-game mode picker is lobby scope (deferred).

- Temple stacking looks dominant (sim finding, 2026-07-11).
-- 6 stone for +1 happiness/turn with no diminishing returns: projection bots fill every
   slot with temples (11/game) and happiness runs away (+19 by season 7). Consider a
   per-settlement cap, scaling cost, or diminishing returns — dovetails with the terrain
   rework's stone-as-civic pricing. Reproduce:
   `npm run sim -- batch --games 10 --turns 24 --policy greedy --seed 100`.

- Add a second tier of buildings.
-- Only four basic buildings exist; economic paths barely differ.
-- Candidates once scoring/happiness matter: Aqueduct (+4 capacity), Forum (+2 influence), Barracks (military placeholder / +1 score), Warehouse (+1 tile material income).

- Build the Assembly / resolutions system.
-- The Resolutions deck is a "0/0" placeholder in the command panel.
-- Players vote on resolutions that affect some or all of them (rivalry mechanics).
-- This is where players will spend Influence primarily

- Terrain & resource economy rework. (planned — see docs/feat/terrain-economy.md)
-- Settled 2026-07-11: wood/food/stone are first-order (from tiles); gold/influence are second-order (from pops/trade/buildings) — gold tiles removed, hills become the slot-rich "acropolis" terrain (token stone/food yields).
-- Also pinned there: the building pricing grammar (wood=economic, stone=civic, gold=commerce, food=pops-only), the landmark-tile principle + constrained shuffle, trade-before-stone-sinks sequencing, and luxury goods as the capped, diminishing, tradeable happiness tier.
-- Ship the hill rework together with the second building tier (slots must have something to bind against).

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

- Provisional victory points are shown but scoring is not real yet.
-- The roster and ledger display an interim VP tally (src/game/score.ts) using the fallback formula from the scoring item above. Replace it once the real end-condition scoring lands.

---

## Tooling & testing

- ~~Headless sim CLI + legal-move enumeration + bots + batch telemetry.~~ DONE (feat/sim-cli — see docs/simulation.md).
-- `npm run sim` drives the pure engine from the terminal: play move-by-move, auto-play
   with random/greedy bots, run seeded batches with an aggregated balance report + CSV,
   and record/replay games as a rules-regression net. `scenario()` builder
   (src/game/testing/scenario.ts) constructs mid-game states for tests.

- Grow the greedy bot into a credible baseline player / CPU opponents. (parked — see docs/ai.md)
-- ~~One-ply score underrated delayed payoffs (zero granaries/temples in 10 games → death spiral).~~
   DONE: the score now projects income 6 turns ahead through calculateIncome; same seeds went
   from happiness -5.4 / half the seats in unrest to +19 / 80% calm.
-- Remaining (deliberately not now): multi-move sequencing (2-ply / in-turn beam), spatial
   strategy, opponent modeling, difficulty tiers + personalities. docs/ai.md has the
   architecture, the determinism contract, and the ladder to CPU players.

- Wire a batch smoke run into CI.
-- e.g. `sim batch --games 5 --turns 16` after tests, so rules regressions that only
   surface in full games get caught.

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
