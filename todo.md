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
-- ~~yearly cards on each new year~~ SHIPPED as the **yearly omen** (2026-07-13 overnight, PROVISIONAL): the year's opener publicly rolls a d6 each spring — one ±1-income sign over the whole table until the year turns; top-bar chip + announcement modal + compendium listing. Numbers await review.
-- Still open: an end-of-season resolution step (where happiness bites); ~~the finite-deck endgame clock~~ (shipped with the victory race — the seasonal deck is the clock).

- Add more start setups / game modes.
-- The mode seam already works (standard / fast-start / deathmatch), selected in code by GAME_CONFIG.mode — a mode is just a ruleset patch.
-- ~~SETTLED (roadmap-appendix D3)~~ SUPERSEDED by Q12 (2026-07-12): the standard setup is now METROPOLIS (4 pops) + FOUNDING COLONY (2 pops, any coastal tile or beside the metropolis), snake order. Gameplay colonies chain by contiguity or sail coast-to-coast (leapfrog). Board setting: ?board=classic|shuffled (+ ?seed=N, ?dev=preload, ?setup=manual).
-- Add more modes as data; an in-game mode picker is lobby scope (deferred).

- ~~Add a second tier of buildings.~~ SHIPPED (feat/phase2-terrain, 2026-07-18): the
  Warehouse idea became **Villa** (12w+4g, +2 tile material/level, dead on hills — new
  `tilePrimaryResourceBonus` effect) and **Gymnasion** (12s+4w, −2 ladder-promote cost
  in its settlement — new `promoteCostReduction` effect). Nine buildings now; **every**
  building carries a `maxLevel` cap (owner ruling: no flat effect scales forever). No
  player-facing "tier" vocabulary — they are just mid-game buildings.
-- Seven earlier (2026-07-13 overnight): ~~Aqueduct (+4 capacity)~~, ~~Forum (+2 influence)~~, Odeon (+2 happiness).
-- Still candidates: Barracks (military placeholder — waits for a military design). PDF's Library/Embassy/Luxury Trader wait on National Ideas / Assembly / luxuries.

- Build the Assembly / resolutions system.
-- The Resolutions deck is a "0/0" placeholder in the command panel.
-- Players vote on resolutions that affect some or all of them (rivalry mechanics).
-- This is where players will spend Influence primarily

- ~~Terrain & resource economy rework.~~ SHIPPED (feat/phase2-terrain, 2026-07-18 —
  docs/feat/terrain-economy.md). 37 tiles / 65 slots: forest 15 < mountain 8 < plains 8
  < hill 5 (yield-less, slot-king) + 1 unsettleable oracle. **All tile-gold removed** —
  gold is now pop/event/trade only. `HexTile.resource: Yield | null`; slaves are inert on
  yield-less tiles. Villa + Gymnasion + `maxLevel` caps shipped alongside (above).
-- Still pinned in the feat doc for later: the **constrained shuffle** (landmarks never
   adjacent / not clustered / breadbasket off-rim — the classic board is authored fair
   by hand for now), and **trade-before-stone-sinks** sequencing for the civic tier.
-- Watch (2026-07-18): greedy bots under-build Villa (they value banked wood/stone only
   at material/10) and never touch the Gymnasion (they barely promote) — both need a
   human or smarter-bot read. Seat spread P1 35% / P3 17% over 60 games (small sample).

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

- ~~*** UI refactor: one ledger, vertical tabs, relocated action bar, map-first selection. (user, 2026-07-12/13)~~ SHIPPED (2026-07-17, feat/ui-refit — KYKLOS mode A, docs/feat/ui-refit.md): full-bleed map stage + live-area camera (Step 1); left disc rail + floating ledger card, Codex disc opens the compendium (Step 2); bottom verb-disc spine + the one End Turn square + resources split around the top medallion + the net-new Build verb, map-first (Step 3). The reskin (Q36 keep ×5) is the follow-up PR.
-- The right sidebar's Actions panel and the left Ledger should collapse into ONE ledger; its tabs become
   vertical buttons (the 5-up horizontal row is already cramped and will not survive more tabs).
-- The everyday action verbs (Grow / Move / Found / Upgrade / Calm / Venture / End Turn) move to a dedicated
   home — a bottom bar, or a strip under the top bar — so the board gains width and the verbs stop living
   inside a side panel.
-- **Selection rule 1 — the map IS the picker.** Anything that targets a tile/settlement uses the Found
   Colony pattern (the only picker that already does it right): verb → eligible tiles GLOW on the real board
   → clicking gives the tile the active ring → an anchored popover carries the info (yield, pops, shared-tile
   status) + confirm. Apply to: ladder promote/demote, Grow Pop, Move Pops (source then target — two glowing
   clicks), event pop-placement, riot concession target. Backdrop modals must never cover the board during a
   selection — selection screens become popovers/side-sheets.
-- **Selection rule 2 — no native <select>, ever.** OS/browser dropdowns cannot hold images. Build ONE custom
   listbox component whose row template is the tile-art picker card (terrain sprite + kind/coords + yield +
   shared note, shipped for the ladder modal 2026-07-13), used wherever a list genuinely beats the map (e.g.
   inside the deliberately-blocking riot modal).
-- Scope this WITH the game-reference compendium below (same navigation rethink); flat AAA look throughout.

- ~~*** Game-reference compendium behind the season icon. (user, 2026-07-12)~~ SHIPPED (2026-07-13 overnight, Q18
  answered-by-default): season dial click or `?` opens five read-only data-driven sections — victory cards with
  live standings, all four event tables via the shared `EventTableRows` render (no roll button), bank rates +
  corridor explainer, both deck lists (aggregate counts, never draw order), costs cheat-sheet.
-- Everything rollable or drawable should be *viewable* before it happens — tables are public information,
   that is the point of "decks for economy, dice for drama".

- *** Two-panel UI: left rail *acts* (Cities/Pops/Build/Market), a new right rail *consults*
  (Chronicle/Codex/Players/Victory). (user, 2026-07-17 — designed, docs/feat/two-panel.md, roadmap Phase 3)
-- **The law:** left is what you act on, right is what you consult. Codex + Victory move to the right;
   Chronicle becomes a right disc (retiring ChronicleDrawer — safe now that the dock ticker keeps the latest
   line permanently visible, which reverses Q19). The right rail mirrors `.bar.rail`, discs overhanging inward.
-- **Deep-links:** the term IS the link — `AnnotatedText` already types every resource/pop/building word, so
   clicking "Happiness" in any card/chronicle/modal opens the codex there. No (?) sprinkles. Address by data id,
   never a hand-kept registry (keeps the codex rendering FROM the ruleset).
-- **Player dossier:** click a roster player → the right panel shows their cities/pops/buildings — the same
   ledger tabs aimed elsewhere via an explicit `ownerId` + read-only flag (reuse, never fork — forks drift).
-- **Per-panel back-stack:** pages become `{view, entry, scroll}` with a history stack; each frame restores its
   scroll offset on "back" (the scrolled-down-buildings-comes-back-scrolled ask). Model the route now, add the
   stack when deep-links create a second level.
-- **Responsive uniform-scale (user, 2026-07-17):** chrome scales down proportionally in smaller viewports
   (identical layout, only smaller) via one `--ui-scale` / rem-root pass — cheap because the KYKLOS token table
   already centralises every dimension. Per-element minimums are a later pass. Sweep the stale docked-layout
   `responsive.css` breakpoints. This is what makes the two-panel safe at small widths (both panels float over
   the sea; the board is covered, never reflowed).
-- Pull-forward-able ahead of Phase 3: the rail split, the route model, the uniform-scale. Waits for Phase 3:
   deep-links + the dossier (rivalry-native).

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
