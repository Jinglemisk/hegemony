# Hegemony — Roadmap

The ordered plan. `todo.md` is the backlog (what exists to do); this document is the
sequence (what happens when, and why). Questions, answers, and execution state live in
the companion workbench: **`docs/roadmap-appendix.md`** — that is where this plan gets
interrogated, refined, and driven.

Last updated: 2026-07-23.

## First principles (re-derive the order from these when things change)

1. **Loop closure beats everything.** Until the game ends and produces a winner, every
   playtest and sim batch measures the wrong game.
2. **Sinks before sources; systems before content; content before polish.** Never add a
   currency source before its sink; never add content into a system that creates no
   decisions yet; UI ships *with* each feature, never as its own phase. (Paying down
   *interaction debt* the playtest keeps tripping over — Phase 1.5 — is not a "UI
   phase" in this sense: features still ship their own UI, the refit fixes how
   existing ones are reached.)
3. **Ship map changes with the systems that price them** (hills rework travels with
   building tier 2).
4. **Rivalry systems outrank solitaire systems.** When in doubt, prioritize interaction
   density.
5. **Nothing is scheduled without a feat plan; nothing is built without being scheduled.**
   Pipeline: design spitball → `docs/feat/*.md` → phase slot → build → sim gate.
6. **Sims are an instrument, not a ceremony** (amended per appendix Q11). The PR gate is
   `npm run check` + tests. The sim CLI (`docs/simulation.md`) is used three ways:
   ad-hoc spitball tests, planned campaigns (e.g. tuning victory thresholds), and
   phase-exit checks — never as a blanket per-PR requirement.
7. **Design deliberation is batched, never ambient** (D13). Look-and-feel gets decided
   in dedicated design sessions (`docs/design/`), not during feature work. Phase 1.5
   applies only brandbook elements the owner explicitly keeps (Q36 keep/park — a blank
   parks the element at the current look, undiscussed; taste is never delegated to a
   default). Once 1.5 lands the brandbook freezes until a post-Phase-5 design session;
   playtest legibility fixes are part of landing 1.5, not new design work. The
   architecture report's monorepo/multiplayer staging waits for Phase 5's track.

## Phases

Each phase ends in a playable, sim-verified milestone.
**Status (2026-07-23):** Phases **0, 1, 1.5 and 2 are merged**. **2.5 is partially
done** — `status.ts` now has its test suite ✅, but `controller.ts` still lives in
`src/game/` (a React hook in the pure-engine dir) and the formatter/popover-unification
items are open; both fold into 3.5. **Phase 3 is BUILT** — 3-A two-panel, 3-B Assembly,
3-C the `political` bot all shipped — **but its gate is NOT met**: the hand-playtest
never happened, the Assembly tuning pass is owed, and 3-C's own first measurement found
that *engaging the agora is a net loss*. **Next: Phase 3.5** — close Phase 3's gate and
make both instruments (the sim and a human playtest) trustworthy before Phase 4 adds
more surface. Phases 4–5 are specced with recommendations, but **every fork (Q30–Q35)
is still unanswered**, as are three carry-over verdicts: **cities 3→2**, the **yearly
omen numbers**, and **Q13b** (colony price, held at 20w+2f pending a balance talk).

**Run charter (appendix Q20–Q23, locked 2026-07-13; stop-line revised 2026-07-15):**
the autopilot sprint runs **Phase 1.5 → Phase 2 and stops.** Stacked PRs, nothing
self-merges; blanks fall to Claude's recs logged PROVISIONAL, explicit owner answers
always override. **Phase 3 is not in the run** — the rivalry layer (assembly,
resolutions, Politicians) is the owner's own design and waits for his session;
building it from Claude's recs would mean inventing it. Phases 4–5 prep is dropped
with it.

**Post-sprint consolidation (added 2026-07-20):** the autopilot sprint ran past its
stop-line through PRs #24–#35 (two-panel rails, Codex rulebook, deep-links, terrain
economy, three bot policies, sim CLI — ~19.8k lines across 101 files, all self-merged
with zero reviews). A four-way audit of that window
(`docs/design/audits/post-sprint-debt.md`) found the engine/UI invariant **intact** —
the UI never recomputes engine formulas — but ~525 lines of dead code, one live bug on
the dev tuning path, and five balance knobs leaking outside `DEFAULT_RULESET`. That
becomes **Phase 2.5, the debt sweep**, slotted immediately before Phase 3 rather than
folded into it: Phase 3 is where the owner's own design work lands, and it should not be
built on top of scaffolding the audit already flagged as duplicated.

| Phase | Theme | Contents | Gate to exit |
| --- | --- | --- | --- |
| **0** | Make it a game | Victory race (5 public "Most X, min Y" cards, sole leader holds; 3 at your own turn start → win; seasonal deck = failsafe ceiling); **metropolis + founding colony setup** (Q12: metropolis 4 pops; colony 2 pops on any coast or adjacent; snake order) + **coastal leapfrog** (Q13a); colony contiguity (radius 1, colonies chain); **no** capital ring — delete the unenforced claim from rules.md/spec; board setting Classic/Shuffled (seeded); yearly first-player rotation; stockpile happiness capped +2; preload flag off | A 4-seat game ends with a winner; seat-win rates in a planned sim batch are roughly flat |
| **1** | Every currency gets a job | Bank exchange; Stabilize Province; promote/demote ladder; riot table + pre-roll insurance (event-table seam); ventures | No dead currencies in the sim report; riot table replaces random pop removal |
| **1.5** | The interface refit | **One ledger** (Actions panel folds in; vertical tab buttons); action verbs move to a dedicated bar (bottom / under-top-bar — Q17); **map-first selection** (the Found Colony pattern — glow → active ring → anchored popover — rolled out to ladder, Grow, Move, event placement, riot concession); **no native selects** — one custom listbox with tile-art card rows; **game-reference compendium** behind the season icon (victory cards, event tables, bank rates, decks — everything rollable is viewable); **refactor ladder R1–R8** in order (front-loads what the reskin needs; monorepo/multiplayer staging explicitly out — Phase 5); **reskin = owner-kept brandbook elements only** (Q36 — answered: KEEP ×5, full reskin) | Playtest: every tile/settlement choice happens on the board or in an art-card list; zero OS dropdowns; a new player can find any rule reference without leaving the game |
| **2** ✅ | The land repriced | **BUILT on `feat/phase2-terrain` (2026-07-18) — awaiting owner sign-off + merge.** Terrain rework + new mid-game buildings, shipped together (`docs/feat/terrain-economy.md`; **spec locked 2026-07-15 in appendix Q24/Q25**). Hills 9→5 **zero-yield / slot-king** (3.20 slots/tile) + 1 unsettleable **Oracle** terrain (Catan's desert — the hole, now at (0,1)); freed tiles → +2 mountain, +1 forest; **all tile gold removed** (gold is pop-borne). Two buildings: **Villa** · **Gymnasion**. `maxLevel` caps every building's stack. **"Tier 2" is this row's label only — no player-facing tier concept.** 199 tests green, browser-verified. | Hill starts stop underperforming; bot build orders diverge by terrain — *engine enforces the divergence (Villa/Workshop dead on hills), but the greedy bot is blind to it; needs a human read* |
| **2.5** | The debt sweep | **Consolidation pass over the 2026-07-18/19 sprint (PRs #24–#35, ~19.8k lines / 101 files) — full findings in `docs/design/audits/post-sprint-debt.md`.** Slotted here for the same reason 1.5 preceded 2: Phase 3 adds the largest UI surface yet (assembly panels, resolution cards, Politician dossiers) on top of the popover/ledger scaffolding this sprint left duplicated, and leans hard on `status.ts` — the most load-bearing untested engine module. Sweeping first means building Phase 3 once. **Ordered contents (audit §7):** (1) `cost.ts`/`preview.ts` → `getBuildings()` — TunePanel currently accepts Granary edits and ignores them; (2) `key` on `HegemonyBoard` — live bug, stale `seenOmenYear` survives `resetGame` and suppresses omens in the next A/B game; (3) `BOARD_RADIUS` constant; (4) sweep ~525 dead lines (`DeckShelf`, 51 CSS classes, 31 unused imports, 7 dead exports); (5) **`status.ts` test suite**; (6) wire terrain + event tables into TunePanel; (7) move `controller.ts` → `src/app/` (a React hook currently lives in the pure-engine dir); (8–10) `riot.ts` `option.modifier`, formatter/popover unification, shared popover primitives. Sim/CLI splits explicitly **out** — no Phase 3 surface. | `npm run lint` at 0 warnings; TunePanel edits provably reach the engine (terrain + event tables included); `status.ts` covered; `src/game/` imports no React |
| **3** | The rivalry layer | **Owner-ordered 2026-07-18: two-panel UI FIRST, rivalry mechanics after a playtest, influence-aware AI last.** **(A) two-panel UI** ✅ **shipped** (rail split: right rail *consults* Chronicle/Codex/Players/Victory; route model `{view,entry,scroll}`; responsive uniform-scale; deep-links landed with PR #35) — `docs/feat/two-panel.md`. **(B) Assembly + resolutions + Politicians v1** ✅ **SHIPPED 2026-07-20** — the rivalry mechanics + Influence's main sink, built end to end (engine in `src/game/assembly/`, panel in `src/components/board/assembly/`, an Agora consult page, a Codex chapter, 86 new tests; build record in `docs/feat/assembly-politicians.md` §7). **Still owed: the hand-playtest this design gates AI work on, and the tuning pass** — every number is a `Ruleset.assembly` dial in `?tune`, and the sim's new Assembly line measures the sink (a smart-policy batch currently sinks only 0.8 influence/game, because the bots do not yet value the agora — that is the Phase 3-C target). **Design session DONE 2026-07-20 — converged v1 in `docs/feat/assembly-politicians.md`**: persistent-**Law** effect model, board-derived power/patronage, political victory card, Stratokles, 31-card starter deck. Q28/Q29 resolved there; Q27 corrected — **first assembly is Spring of YEAR 2**, not 3. The *shape* is locked; numbers want the `?tune` panel + sim, and the build wants a **hand-playtest** before any AI work. **Visual design approved 2026-07-20** — the Assembly is a floating panel sized to the **sea gap, not a full-screen takeover** (top bar, rails, ledger and dock stay live around it, so you can check cities/pops/market before voting); reference built in the real KYKLOS chrome at `docs/design/showcases/assembly-mode-showcase.html`. **Stratokles settled 2026-07-20** — he targets no one (no VP/leader targeting, no single-player sanctions); his seven cards are **one-time, temporary, table-wide Directives** (riots, strikes, doles, plus two that disrupt the assembly itself), each planting a permanent **tally monument** that never repeals and doesn't consume the Law cap — so his track is a true doomsday clock whose only brake is voting his Directives down, and the coup crowns *his patron*. **(C) influence-aware AI** — deferred until (B) exists: the greedy-vs-smart sim proved the citizen/ladder line loses *because* influence has no sink yet, so tuning the bot now is premature (`docs/sim/2026-07-18-greedy-vs-smart.md`). Deep-links + player dossier (two-panel pieces 4–5) land with (B). **(C) SHIPPED 2026-07-21** — the `political` bot (`docs/sim/2026-07-21-influence-aware-ai.md`), which made the layer *measurable* and promptly measured a problem. **⚠ REVISION FILED 2026-07-23 → lands in Phase 3.5:** engaging the agora is a **net loss** (political seat ~21% vs a smart economic seat's ~26%). Four targeted changes, skeleton preserved: political VP becomes a permanent global **ratchet** counter (authored-and-passed, repeal-immune, Catan Largest-Army semantics — knowingly breaks §1.6's "board is the scoreboard"); passing pays the author a **one-time politician-themed prize** (the actual net-loss fix; never citizens); the **Stratokles coup is deleted**; and Stratokles regains **player-directed targeting** (⚠ reverses the §1.8 "he targets no one" ruling). Spec + the six owed decisions (Q37–Q42) are in the appendix. **This invalidates the 3-C bot and every Assembly sim reading — rework first, then re-teach the bot, then re-run campaigns.** | Influence is spent most turns; a runaway leader gets checked in playtest; you can open any rival's cities/pops/buildings and jump from any card term to its rule |
| **3.5** | Close the loop & fix the instruments | **Filed 2026-07-23.** Phase 3 is *built* but its gate is unmet, and neither instrument can currently be trusted: the sim's `evaluateSmart` uses a **linear** happiness penalty (`policies.ts:209,283`) that cannot see the −5/−10 riot cliff, so the bot over-promotes into it and **beam loses to plain greedy 8% vs 31%** — every ruleset A/B measures the bot's flaw, not the game; and a human playtest would read equally false, because the newest content is partly invisible on screen. **Ordered contents:** (1) **the Assembly revision** — ratchet VP + one-time author prize + coup deleted + robber targeting, and the new permanent counter **ships visible** (it knowingly breaks §1.6's "board is the scoreboard", so hiding it would repeat the General-Strike bug); spec + Q37–Q42 in the appendix. (2) **The `<EffectLine>` seam + a written presentation contract**, built just ahead of the rework's UI so it is the first consumer rather than a retrofit (`todo.md`'s "ONE uniform pipeline"). (3) **Legibility + ground-clearing** — surface invisible engine state (`incomeSuppressedTurns` has **zero** UI, the starvation countdown, an active-effects list), fix the `income.ts:313` `activePlayer`-scope bug (its guard is always-true, so those effects hit all four players), delete the dead `setupCity` path, ship issue #8, sweep the leftover 2.5 items. (4) **Bot work** — Track A eval fix, then re-teach `political` the revised rules. (5) **Hand-playtest the revised Assembly** + settle citizen identity (issue #9). (6) **Campaigns** — cities 3→2 re-run + the Q41 runaway check. | A tester can always see *why* a number changed; beam beats greedy; the agora is worth engaging; and a runaway leader is still checked **without** the coup (Q41) |
| **4** | The wider world | Coasts, ports, luxury goods, player trade — **re-scoped 2026-07-23**. Order matters: `isCoastalTile` → **topology** first (S — the SVG renderer already draws coastline topologically, the radius-3 assumption is engine-side only; this unblocks luxuries *and* de-risks every future map change), then **luxury goods, land-trader slice** (M — needs no coast at all, and it is the gold sink `todo.md` says the Buildings + Market passes are blocked on), then **coastal luxuries + Port** (L — ⚠ the Port would be the first *location-gated* building, which brushes the standing terrain-gating ban), then **player trade LAST, or v2** (XL — dominated not by the mechanic but by the AI: the economic bots have no opponent modeling, so trade is un-simmable and must be human-validated). Then **FREEZE** (MoSCoW, with an explicit Won't-have → v2 list), then the **balance lock**: `todo.md`'s deferred whole-roster Buildings pass + Market/bank pass, finally unblocked because the gold sink exists. Forks: **Q31–Q33**. | Luxury/happiness economy holds at the ledger's caps; trade actually occurs; the freeze doc is published and the numbers stop moving |
| **5** | Asymmetry & frame | National ideas; mode picker; then the multiplayer track. Forks: **Q34–Q35**. National ideas are a *third* new system — build them only if the 3.5 playtest shows a full game feels thin without seat asymmetry; otherwise they go to the v2 list rather than re-opening the freeze. | Ideas draft evenly (no auto-picks) in playtest |
| **6** | The design session | **The post-Phase-5 design session principle 7 already reserves — where the brandbook un-freezes.** Collapse the **two-rail board to one** (M, mostly deletion — both rails already share `DiscRail`, the panel shell and the route model, and `seatViewBox` is already written for a single-side asymmetric inset; the alternative is keeping both rails but allowing only one open at a time. ⚠ Either way you trade away *simultaneous act-and-consult*, which is the reason the split exists). One from-scratch **icon set** — inline-SVG `currentColor` on the `AssemblyIcons` pattern, scoped by `icon-ab-verdict.md`'s hybrid rule — replacing the seven competing icon systems and the two duplicate resource-icon families. **Coastline reskin** (foam → sea-gap grout, per the direction dossier) and **archipelago / dynamic maps if wanted** (the renderer is already topology-ready; the engine and the design are not — L–XL, and currently undesigned). The **full frontend↔frontend cosmetic retrofit**: retire the per-source formatters into `<EffectLine>`, extract one shared `<Tooltip>` (~30 surfaces use native `title=` today), collapse the two resource-render systems. Tech debt: `.git` shrink, stricter TS flags, npm-audit fixes. | One coherent visual system over a frozen layout and frozen numbers; the cosmetic parity debt is paid as a single sweep with nothing redrawn |

Standing forks and their resolutions live in the appendix (Q1, Q2). Until answered, the
table above reflects Claude's recommendation.

## Design queue (known but not yet designed — needs a spitball + feat plan)

- ~~**Politicians**~~ — designed 2026-07-20: `docs/feat/assembly-politicians.md`. Keeps
  the four politicians and the power/patron/Stratokles spine from the PDF (Stratokles as
  the leader-check, Catan-robber pattern), now as trade-off **Laws** enacted through a
  pick-a-politician → draw → propose flow. **No longer blocks Phase 3.**
- ~~**Victory cards**~~ — designed and tuned (appendix D1): 5 public "Most X, min Y" cards, race to hold 3; minimums confirmed by the 2026-07-12 campaign.
- **Yearly cards / d20 omen table** — from `seasons.md`; slot flexible (Phase 1 or 3).
- ~~**Two-panel UI** (left/right rail split, deep-links, player dossier)~~ — designed:
  `docs/feat/two-panel.md`. Slotted Phase 3 (dossier is rivalry-native); rail split +
  route model + responsive uniform-scale are pull-forward-able earlier.
- **Military** — Barracks placeholder only. Explicitly parked: not designed, not
  scheduled.
- **2–3 player support** — rules exist per spec intent; needs a design pass on map size
  and deck scaling. Parked until Phase 5.

## Document map

- `todo.md` — backlog; user additions arrive as `***` items.
- `docs/roadmap.md` — this file; the order and the principles.
- `docs/roadmap-appendix.md` — the working Q&A: open questions, answers, decisions,
  execution log. **The active surface — start here each session.**
- `docs/balance.html` — the balance ledger; analysis, ranked issues, playtest scenarios.
- `docs/feat/*.md` — per-feature design plans.
- `docs/design/audits/*.md` — point-in-time code audits.
  **`post-sprint-debt.md`** is the live one: it *is* Phase 2.5's work order.
- `docs/simulation.md` — the sim CLI; how phases get verified.
