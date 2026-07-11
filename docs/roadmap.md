# Hegemony — Roadmap

The ordered plan. `todo.md` is the backlog (what exists to do); this document is the
sequence (what happens when, and why). Questions, answers, and execution state live in
the companion workbench: **`docs/roadmap-appendix.md`** — that is where this plan gets
interrogated, refined, and driven.

Last updated: 2026-07-11.

## First principles (re-derive the order from these when things change)

1. **Loop closure beats everything.** Until the game ends and produces a winner, every
   playtest and sim batch measures the wrong game.
2. **Sinks before sources; systems before content; content before polish.** Never add a
   currency source before its sink; never add content into a system that creates no
   decisions yet; UI ships *with* each feature, never as its own phase.
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
**Status:** Phase 0 built on `feat/phase0-victory-race` (see the appendix execution
log); its exit gate (flat seat win rates in a planned batch + the minimum-tuning
campaign) is still to be run before Phase 1 starts.

| Phase | Theme | Contents | Gate to exit |
| --- | --- | --- | --- |
| **0** | Make it a game | Victory race (5 public "Most X, min Y" cards, sole leader holds; 3 at your own turn start → win; seasonal deck = failsafe ceiling); **two-city setup** (capital + second city, snake order, no setup colony); colony contiguity (radius 1, colonies chain); **no** capital ring — delete the unenforced claim from rules.md/spec; board setting Classic/Shuffled (seeded); yearly first-player rotation; stockpile happiness capped +2; preload flag off | A 4-seat game ends with a winner; seat-win rates in a planned sim batch are roughly flat |
| **1** | Every currency gets a job | Bank exchange; Stabilize Province; promote/demote ladder; riot table + pre-roll insurance (event-table seam); ventures | No dead currencies in the sim report; riot table replaces random pop removal |
| **2** | The land repriced | Terrain rework (`docs/feat/terrain-economy.md`) + building tier 2, shipped together | Hill starts stop underperforming; bot build orders diverge by terrain |
| **3** | The rivalry layer | Assembly + resolutions + Politicians v1 (needs design session first) | Influence is spent most turns; a runaway leader gets checked in playtest |
| **4** | The wider world | Coasts, ports, luxury goods, player trade | Luxury/happiness economy holds at the ledger's caps; trade actually occurs |
| **5** | Asymmetry & frame | National ideas; mode picker; then the multiplayer track | Ideas draft evenly (no auto-picks) in playtest |

Standing forks and their resolutions live in the appendix (Q1, Q2). Until answered, the
table above reflects Claude's recommendation.

## Design queue (known but not yet designed — needs a spitball + feat plan)

- **Politicians** — PDF sketches four, incl. Stratokles as the leader-check
  (Catan-robber pattern, pooled-resource neutralization). Blocks Phase 3.
- ~~**Victory cards**~~ — designed (appendix D1): 5 public "Most X, min Y" cards, race to hold 3. Minimum-tuning sim campaign still owed.
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
