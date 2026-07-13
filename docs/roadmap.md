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

## Phases

Each phase ends in a playable, sim-verified milestone.
**Status:** Phases 0 and 1 **DONE — merged via PR #20 and PR #21 (2026-07-13)**.
Next: **Phase 1.5, the interface refit**, executing on `feat/ui-refit` — slotted
*before* Phase 2 deliberately: Phase 2 (terrain + tier-2 buildings) and Phase 3
(assembly panels) both add UI surface, and building them into the old layout means
converting them twice. Open questions Q17–Q19 in the appendix. Q13b (colony
repricing) awaits the user's verdict — comparison run, rec is HOLD 20w+2f
(docs/sim/2026-07-12-colony-repricing-q13b.md).

A **wholesale-execution battery (Q20–Q35)** is filed in the appendix: the run
charter (stop-line, merge policy, decision authority, gate substitution) plus every
design fork Phases 2–5 need locked — including the Politicians design session as
questions. Answer the battery (blanks fall to Claude's recommendations if the Q22
rule is confirmed) and the roadmap becomes executable end-to-end in one unattended
run.

| Phase | Theme | Contents | Gate to exit |
| --- | --- | --- | --- |
| **0** | Make it a game | Victory race (5 public "Most X, min Y" cards, sole leader holds; 3 at your own turn start → win; seasonal deck = failsafe ceiling); **metropolis + founding colony setup** (Q12: metropolis 4 pops; colony 2 pops on any coast or adjacent; snake order) + **coastal leapfrog** (Q13a); colony contiguity (radius 1, colonies chain); **no** capital ring — delete the unenforced claim from rules.md/spec; board setting Classic/Shuffled (seeded); yearly first-player rotation; stockpile happiness capped +2; preload flag off | A 4-seat game ends with a winner; seat-win rates in a planned sim batch are roughly flat |
| **1** | Every currency gets a job | Bank exchange; Stabilize Province; promote/demote ladder; riot table + pre-roll insurance (event-table seam); ventures | No dead currencies in the sim report; riot table replaces random pop removal |
| **1.5** | The interface refit | **One ledger** (Actions panel folds in; vertical tab buttons); action verbs move to a dedicated bar (bottom / under-top-bar — Q17); **map-first selection** (the Found Colony pattern — glow → active ring → anchored popover — rolled out to ladder, Grow, Move, event placement, riot concession); **no native selects** — one custom listbox with tile-art card rows; **game-reference compendium** behind the season icon (victory cards, event tables, bank rates, decks — everything rollable is viewable) | Playtest: every tile/settlement choice happens on the board or in an art-card list; zero OS dropdowns; a new player can find any rule reference without leaving the game |
| **2** | The land repriced | Terrain rework (`docs/feat/terrain-economy.md`) + building tier 2, shipped together | Hill starts stop underperforming; bot build orders diverge by terrain |
| **3** | The rivalry layer | Assembly + resolutions + Politicians v1 (needs design session first) | Influence is spent most turns; a runaway leader gets checked in playtest |
| **4** | The wider world | Coasts, ports, luxury goods, player trade | Luxury/happiness economy holds at the ledger's caps; trade actually occurs |
| **5** | Asymmetry & frame | National ideas; mode picker; then the multiplayer track | Ideas draft evenly (no auto-picks) in playtest |

Standing forks and their resolutions live in the appendix (Q1, Q2). Until answered, the
table above reflects Claude's recommendation.

## Design queue (known but not yet designed — needs a spitball + feat plan)

- **Politicians** — PDF sketches four, incl. Stratokles as the leader-check
  (Catan-robber pattern, pooled-resource neutralization). Blocks Phase 3.
- ~~**Victory cards**~~ — designed and tuned (appendix D1): 5 public "Most X, min Y" cards, race to hold 3; minimums confirmed by the 2026-07-12 campaign.
- **Yearly cards / d20 omen table** — from `seasons.md`; slot flexible (Phase 1 or 3).
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
