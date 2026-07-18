# Hegemony — Roadmap

The ordered plan. `todo.md` is the backlog (what exists to do); this document is the
sequence (what happens when, and why). Questions, answers, and execution state live in
the companion workbench: **`docs/roadmap-appendix.md`** — that is where this plan gets
interrogated, refined, and driven.

Last updated: 2026-07-13.

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
**Status:** Phases 0 and 1 **DONE — merged via PR #20 and PR #21 (2026-07-13)**.
Next: **Phase 1.5, the interface refit**, executing on `feat/ui-refit` — slotted
*before* Phase 2 deliberately: Phase 2 (terrain + tier-2 buildings) and Phase 3
(assembly panels) both add UI surface, and building them into the old layout means
converting them twice. **D13 splits its scope:** the interaction grammar and the
refactor ladder (R1–R8, `docs/design/architecture-report.html`) ship regardless —
they're what every later feature's UI is built in; brandbook *visuals* went through
the Q36 keep/park pass — **answered 2026-07-13: KEEP ×5, the full reskin ships with
1.5**. Once 1.5 lands, the brandbook freezes until after Phase 5 (principle 7).
Open questions Q17 and Q19 in the appendix (recs filed). Q13b (colony repricing) awaits the user's verdict —
comparison run, rec is HOLD 20w+2f (docs/sim/2026-07-12-colony-repricing-q13b.md).

**Run charter (appendix Q20–Q23, locked 2026-07-13; stop-line revised 2026-07-15):**
the autopilot sprint runs **Phase 1.5 → Phase 2 and stops.** Stacked PRs, nothing
self-merges; blanks fall to Claude's recs logged PROVISIONAL, explicit owner answers
always override. **Phase 3 is not in the run** — the rivalry layer (assembly,
resolutions, Politicians) is the owner's own design and waits for his session;
building it from Claude's recs would mean inventing it. Phases 4–5 prep is dropped
with it.

| Phase | Theme | Contents | Gate to exit |
| --- | --- | --- | --- |
| **0** | Make it a game | Victory race (5 public "Most X, min Y" cards, sole leader holds; 3 at your own turn start → win; seasonal deck = failsafe ceiling); **metropolis + founding colony setup** (Q12: metropolis 4 pops; colony 2 pops on any coast or adjacent; snake order) + **coastal leapfrog** (Q13a); colony contiguity (radius 1, colonies chain); **no** capital ring — delete the unenforced claim from rules.md/spec; board setting Classic/Shuffled (seeded); yearly first-player rotation; stockpile happiness capped +2; preload flag off | A 4-seat game ends with a winner; seat-win rates in a planned sim batch are roughly flat |
| **1** | Every currency gets a job | Bank exchange; Stabilize Province; promote/demote ladder; riot table + pre-roll insurance (event-table seam); ventures | No dead currencies in the sim report; riot table replaces random pop removal |
| **1.5** | The interface refit | **One ledger** (Actions panel folds in; vertical tab buttons); action verbs move to a dedicated bar (bottom / under-top-bar — Q17); **map-first selection** (the Found Colony pattern — glow → active ring → anchored popover — rolled out to ladder, Grow, Move, event placement, riot concession); **no native selects** — one custom listbox with tile-art card rows; **game-reference compendium** behind the season icon (victory cards, event tables, bank rates, decks — everything rollable is viewable); **refactor ladder R1–R8** in order (front-loads what the reskin needs; monorepo/multiplayer staging explicitly out — Phase 5); **reskin = owner-kept brandbook elements only** (Q36 — answered: KEEP ×5, full reskin) | Playtest: every tile/settlement choice happens on the board or in an art-card list; zero OS dropdowns; a new player can find any rule reference without leaving the game |
| **2** ✅ | The land repriced | **BUILT on `feat/phase2-terrain` (2026-07-18) — awaiting owner sign-off + merge.** Terrain rework + new mid-game buildings, shipped together (`docs/feat/terrain-economy.md`; **spec locked 2026-07-15 in appendix Q24/Q25**). Hills 9→5 **zero-yield / slot-king** (3.20 slots/tile) + 1 unsettleable **Oracle** terrain (Catan's desert — the hole, now at (0,1)); freed tiles → +2 mountain, +1 forest; **all tile gold removed** (gold is pop-borne). Two buildings: **Villa** · **Gymnasion**. `maxLevel` caps every building's stack. **"Tier 2" is this row's label only — no player-facing tier concept.** 199 tests green, browser-verified. | Hill starts stop underperforming; bot build orders diverge by terrain — *engine enforces the divergence (Villa/Workshop dead on hills), but the greedy bot is blind to it; needs a human read* |
| **3** | The rivalry layer | **Owner-ordered 2026-07-18: two-panel UI FIRST, rivalry mechanics after a playtest, influence-aware AI last.** **(A) two-panel UI** — pull-forward pieces building NOW on `feat/two-panel` (rail split: right rail *consults* Chronicle/Codex/Players/Victory; route model `{view,entry,scroll}`; responsive uniform-scale) — `docs/feat/two-panel.md`. **(B) Assembly + resolutions + Politicians v1** — the rivalry mechanics + Influence's main sink; **needs the owner design session first** (appendix Q27–Q29 blank on purpose), then hand-playtest. **(C) influence-aware AI** — deferred until (B) exists: the greedy-vs-smart sim proved the citizen/ladder line loses *because* influence has no sink yet, so tuning the bot now is premature (`docs/sim/2026-07-18-greedy-vs-smart.md`). Deep-links + player dossier (two-panel pieces 4–5) land with (B). | Influence is spent most turns; a runaway leader gets checked in playtest; you can open any rival's cities/pops/buildings and jump from any card term to its rule |
| **4** | The wider world | Coasts, ports, luxury goods, player trade | Luxury/happiness economy holds at the ledger's caps; trade actually occurs |
| **5** | Asymmetry & frame | National ideas; mode picker; then the multiplayer track | Ideas draft evenly (no auto-picks) in playtest |

Standing forks and their resolutions live in the appendix (Q1, Q2). Until answered, the
table above reflects Claude's recommendation.

## Design queue (known but not yet designed — needs a spitball + feat plan)

- **Politicians** — PDF sketches four, incl. Stratokles as the leader-check
  (Catan-robber pattern, pooled-resource neutralization). Blocks Phase 3.
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
- `docs/simulation.md` — the sim CLI; how phases get verified.
