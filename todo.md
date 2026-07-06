# Hegemony — To-Do

!!! If you have made changes to code due to todo.md, or if something needs to be updated later and remembered, edit this document !!! 

!!! If the user has made an addition, it will be marked with *** and it must be rehabilitated into the document.

---

## Gameplay & mechanics

- Add an end condition and scoring.
-- The game never ends — the event decks reshuffle their discard piles forever — and every player shows "VP --", so there is no reason to play well.
-- Direction (user's idea): make the event deck a finite clock. Stop the reshuffle; when all event cards are spent, the game ends and "victory cards" resolve, awarding for categories like most resource points, most pops, most cities, most X. The deck length becomes the game length.
-- Interim/fallback: a fixed end-of-season-10 tally — +5 per city, +3 per colony, +1 per citizen, +1 per freeman, +1 per 10 material resources (rounded down), -1 per point of negative happiness.

- Give happiness real consequences.
-- Happiness accrues but does nothing yet — it is a meter with no teeth.
-- Simple thresholds to start: -5 warning, -10 lose 1 gold/turn, -15 cannot found colonies, -20 lose a pop from your largest settlement then happiness +5.

- Deepen seasonal mechanics. (in progress on feat/seasons — see seasons.md)
-- ~~The season is just a bare counter.~~ DONE: it now reads as Year N / Spring–Winter (derived in core/calendar.ts), shown on the medallion + chronicle.
-- ~~Season cards have no seasonal character.~~ DONE: the seasonal deck is weighted by season — winter draws more harsh cards, spring more growth, etc. (tags, not deterministic penalties).
-- Still open: an end-of-season resolution step (where happiness bites), yearly cards on each new year, and the finite-deck endgame clock.

- Add more start setups / game modes.
-- The mode seam already works (standard / fast-start / deathmatch), selected in code by GAME_CONFIG.mode — a mode is just a ruleset patch.
-- Add more modes as data; an in-game mode picker is lobby scope (deferred).

- Add a second tier of buildings.
-- Only four basic buildings exist; economic paths barely differ.
-- Candidates once scoring/happiness matter: Aqueduct (+4 capacity), Forum (+2 influence), Barracks (military placeholder / +1 score), Warehouse (+1 tile material income).

- Build the Assembly / resolutions system.
-- The Resolutions deck is a "0/0" placeholder in the command panel.
-- Players vote on resolutions that affect some or all of them (rivalry mechanics).
-- This is where players will spend Influence primarily

- Luxury goods and trade.
-- Deferred design; see docs/feat/luxury-goods.md.

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
