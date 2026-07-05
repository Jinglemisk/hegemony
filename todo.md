# Hegemony — To-Do

Working backlog. `-` is a task; the `--` lines under it say what's wrong, how to
fix, or give context. Cross out finished items with ~~strikethrough~~ instead of
deleting them, so the history stays visible. `---` divides sections.

---

## Gameplay & mechanics

- Add a 10-season end condition and prototype scoring.
-- The game never ends and every player shows "VP --", so there is no reason to play well.
-- Suggested end-of-season-10 score: +5 per city, +3 per colony, +1 per citizen, +1 per freeman, +1 per 10 material resources (rounded down), -1 per point of negative happiness.

- Give happiness real consequences.
-- Happiness accrues but does nothing yet — it is a meter with no teeth.
-- Simple thresholds to start: -5 warning, -10 lose 1 gold/turn, -15 cannot found colonies, -20 lose a pop from your largest settlement then happiness +5.

- Add an influence sink ("Stabilize Province").
-- Influence has no use yet, so citizens have no strategic payoff.
-- One action: spend 4 influence to gain 3 happiness.

- Deepen seasonal mechanics.
-- Seasonal event cards exist, but the season itself is just a counter that flips after all four players move.
-- e.g. season-long modifiers, seasonal cadence for certain actions, an end-of-season resolution step.

- Add more start setups / game modes.
-- The mode seam already works (standard / fast-start / deathmatch), selected in code by GAME_CONFIG.mode — a mode is just a ruleset patch.
-- Add more modes as data; an in-game mode picker is lobby scope (deferred).

- Add a second tier of buildings.
-- Only four basic buildings exist; economic paths barely differ.
-- Candidates once scoring/happiness matter: Aqueduct (+4 capacity), Forum (+2 influence), Barracks (military placeholder / +1 score), Warehouse (+1 tile material income).

- Build the Assembly / resolutions system.
-- The Resolutions deck is a "0/0" placeholder in the command panel.
-- Players vote on resolutions that affect some or all of them (rivalry mechanics).

---

## Content & scope

- Luxury goods and trade.
-- Deferred design; see docs/feat/luxury-goods.md.

- National ideas / player identities.
-- Per-player modifiers so the four seats play asymmetrically.

- Coastal tiles and ports.
-- The map is inland-only right now — no coast, ports, or naval movement.

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
