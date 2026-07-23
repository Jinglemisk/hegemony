# Hegemony — To-Do

!!! If you have made changes to code due to todo.md, or if something needs to be updated later and remembered, edit this document !!!

!!! If the user has made an addition, it will be marked with *** and it must be rehabilitated into the document.

***


## ⭐ Final quality passes — DO AT THE VERY END OF THE WHOLE PHASES RUN (owner, 2026-07-18)

These are deliberately deferred to a polish sweep once all phases have shipped — do
NOT do them mid-run. Revisit each with a fresh balance eye + a human playtest read:

- **Buildings pass** — revisit the whole roster, especially **Villa** (+2 tile
  material/level — sim-tuned, greedy bots under-build it) and **Gymnasion** (−2 promote
  cost — greedy bots never exercise it). Re-check every building's cost, effect size, and
  `maxLevel` cap once the full system (assembly, luxuries, ideas — whatever ships) is in
  and there's a smarter bot or human data. Prices were set for the mid-game in isolation.
- **Market / bank pass** — revisit the bank exchange as a whole: the per-material
  scarcity classes (stone drifted scarce→baseline in Phase 2), the sell/buy spreads, the
  `uniform` vs `scarcity` derivation knob, and the bankBuy churn the greedy bots show
  (~190/game — likely a bot artifact, but confirm it isn't a real exploit). The rates
  have been "PROVISIONAL" since Phase 1; this is where they get finalized. Also fold in:
  the venture wood-stake is strictly cheaper than the gold stake at bank prices, and
  NEITHER sim bot upgrades colony→city (the whole colony→city path is dead) — check
  colony/upgrade pricing here.

---

## Gameplay & mechanics

- Follow the roadmap (docs/roadmap.md) and drive work through its Q&A workbench (docs/roadmap-appendix.md).
-- Phases 0–5 with exit gates; the appendix holds per-phase questions, the decision log, and the execution log. Start each session there.

- Keep the balance ledger current (docs/balance.html).
-- Living balance document: outstanding issues (ranked P0–P2), deck/economy analysis, playtest scenarios. Update it in the same commit as any change to ruleset.ts, data.ts, or the event decks; log the change in its changelog.

- Generalize effect resolution — ONE uniform pipeline for card/resolution effects. (user, 2026-07-23)
-- Any effect from any source (event card, assembly resolution, riot, ...) that says "lose 1 pop" /
   "gain X" must open the SAME designated modal for that effect kind — e.g. a "pop gain/loss" modal,
   distinct from the pop-migration and pop-promotion (mobility) modals — never a per-source one-off.
   Consistency is the point.
-- Temporary player-specific buffs/debuffs (for that season / that year / a resolution's duration)
   that touch income or expenditure must surface in THAT player's income display. Top level stays
   compact (e.g. "city → +1; city → −4" rather than every line item), but the drill-down — hover a
   city card in the ledger, hover a resource — must name the source: "+/− due to card X" or "due to
   resolution Y". Today that level shows the number but not WHERE it comes from.
-- Engine half already exists (`incomeModifier` with season/turn durations, `timedHappinessDelta`,
   and `calculateIncomeBreakdown` carries a `source` string per line); the uniform modal routing and
   the provenance drill-down UI do not. With assembly Laws live, both matter more now.

- Assembly 3-B is BUILT (spec + build record: docs/feat/assembly-politicians.md) — STILL OWED:
-- the hand-playtest, then the tuning numbers (`?tune` + sim), then the influence-aware bot voting
   (Phase 3-C — the `--policy smart` follow-up waits until the Assembly is playtested).

- Victory race minimums are ruleset tunables — the tuning sim campaign is still owed
  (cities min 3→2 verdict pending; see roadmap-appendix).

- Yearly omen (d6, shipped 2026-07-13) is PROVISIONAL — numbers await the user's eyes. The bigger
  yearly/omen d20 table idea stays in the design queue and lands on the shared event-table component.

- Seasonal mechanics — still open: an end-of-season resolution step (where happiness bites).

- Unrest — still open: Luxury Goods relief (needs coasts); the rulebook's exact −2/−4/−6 → 1/2/3
  food-unrest magnitudes. No passive drift (deliberate).

- Buildings — still candidates: Barracks (military placeholder — waits for a military design);
  PDF's Library/Embassy/Luxury Trader wait on National Ideas / Assembly / luxuries.

- Terrain follow-ups (pinned in docs/feat/terrain-economy.md): the **constrained shuffle**
  (landmarks never adjacent / not clustered / breadbasket off-rim — the classic board is authored
  fair by hand for now); **trade-before-stone-sinks** sequencing for the civic tier.
-- Watch (2026-07-18): greedy bots under-build Villa (they value banked wood/stone only at
   material/10) and never touch the Gymnasion (they barely promote) — both need a human or
   smarter-bot read. Seat spread P1 35% / P3 17% over 60 games (small sample).

- More start setups / game modes.
-- The mode seam already works (standard / fast-start / deathmatch), selected in code by
   GAME_CONFIG.mode — a mode is just a ruleset patch. Add more modes as data; an in-game mode
   picker is lobby scope (deferred).

- Luxury goods and trade.
-- **docs/feat/luxury-goods.md is the one-stop shop** (rewritten 2026-07-23): the plan,
   terrain-economy.md §6's amendments folded in, and every open luxury decision — appendix
   Q31/Q32 moved there plus new Q43–Q49. Phase 4's first slice is the **land Trader** (no
   coast needed), which is the gold sink this file's Buildings + Market passes are blocked on.

- National ideas / player identities.
-- Per-player modifiers so the four seats play asymmetrically.
-- They pick these after initial colony placement to further bolster their playstyle.

- Coastal tiles and ports.
-- The map is inland-only right now — no coast, ports, or naval movement.

---

## Presentation & UI

- Two-panel remainders (docs/feat/two-panel.md) — now UNBLOCKED by 3-B:
-- **Player dossier:** click a roster player → the right panel shows their cities/pops/buildings —
   the same ledger tabs aimed elsewhere via an explicit `ownerId` + read-only flag (reuse, never
   fork — forks drift).
-- **Deep-link finer targets:** a specific building/entry, not just the chapter (needs concept-ids).
   These double as the codex-rulebook deep-link destinations (docs/feat/codex-rules.md piece 4).
-- **Per-panel back-stack:** pages become `{view, entry, scroll}` with a history stack; add it when
   deep-links create a second level.
-- **Responsive:** per-element minimums pass; sweep the stale docked-layout `responsive.css`
   breakpoints.

- Codex rulebook follow-up: generate rules.md from the same ruleset/content source so the in-game
  rulebook and the repo player guide can never drift.

- Optional: regenerate the autumn season icon to kill its faint cutout haze (only visible at
  large zoom).

---

## Tooling & testing

- Bot next lever: co-tune `evaluateSmart` weights via `--tune-patch` — the beam-vs-baselines run
  (docs/sim/2026-07-19-beam-vs-baselines.md) showed beam beats one-ply smart but LOSES to greedy
  because the smart EVAL over-promotes into unrest and the beam amplifies it. **The bottleneck is
  the evaluation, not the search.**
-- If large tuning campaigns need beam faster: commit-sequence memoization (provably identical
   output) or tune W/D.

---

## Tech debt & polish

- Shrink the .git history (~129 MB).
-- Bloated by old/replaced binary art still living in past commits.
-- Use git-filter-repo to purge the large blobs; coordinate first (rewrites history → force-push + everyone re-clones).

- Fix the 2 npm-audit vulnerabilities from the toolchain.

- Turn on stricter TypeScript flags.
-- noUncheckedIndexedAccess, noUnusedLocals, and friends.

- Split Resources into spendable goods vs. score meters.
-- Happiness and influence are meters, not spendable stock, but they currently ride in the same resource bag as wood/stone/gold/food.
