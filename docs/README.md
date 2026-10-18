# Hegemony documentation

This is the documentation control plane. Start here instead of reading the whole
tree. The roadmap establishes sequence and exit gates; plans define unshipped
work; references describe the game that exists; reports preserve dated evidence;
and the archive is historical context, never current authority.

Last updated: 2026-10-16.

## Now

**Current initiative:** the [v2 migration](plans/v2-migration.md): the shallow-economy rules
in the Hybrid arc shell, built on `feat/v2` while `main` keeps today's game. Start every
session with "continue the v2 migration" in the `hegemony-v2` worktree.

**Owner blockers:** none. Step 15's owner playtest is next, then the owner's call on
merging `feat/v2` into `main`.

Steps 1 to 10, 13, 14 and 17 to 21 are merged into `feat/v2` (#79 to #90, #94, #95, #99
to #104), and Step 15's pre-merge UI work with them (#105 to #113): the alarms row from one
engine list, and Victory, the Chronicle, the Codex and the Agora as ledgers in two strips
under the bar. Step 11, the sim gate, now runs after player trade (owner, 2026-10-14), and
Q80 waits with it. The full-game browser test also waits.

**Locked sequence:** V1 includes luxury goods, full Catan-style player trade, all twelve
National Ideas, and the intended typed Resolution/Idea effects. The v1 mechanics freeze
precedes full multiplayer.

## Active plans

| Plan                                                | Phase    | Status    | Position                                                                                                |
| --------------------------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------- |
| [v2 migration](plans/v2-migration.md)               | v2       | `active`  | Step 15: the owner's playtest is next; Step 11 runs after player trade; shipped to #113                 |
| [Outcome-driven AI](plans/outcome-driven-ai.md)     | 3.6/post | `ready`   | Observation/capability prerequisites first; advanced search waits for the freeze                        |
| [Luxury goods](plans/luxury-goods.md)               | 4        | `active`  | Slices 1–2 shipped on `main`; the v2 migration carries them unchanged                                   |
| [UI — what is left](plans/ui-remaining.md)          | —        | `active`  | The one UI ledger; the KYKLOS triage ledgers are archived                                               |
| [Player trade](plans/player-trade.md)               | post-v2  | `ready`   | All six decisions answered (2026-10-18); ships to `main` after the v2 merge; Step 11 and Q80 wait on it |
| [National Ideas](plans/national-ideas.md)           | v2       | `active`  | Step 9 shipped (#88); twelve v2 rules, open setup draft (#95), influence purchase                       |
| [V1 mechanics freeze](plans/v1-mechanics-freeze.md) | 5.5      | `blocked` | Final typed Resolution/Idea effects and evidence before multiplayer                                     |

Every file in `docs/plans/` must appear in this table. Start a substantial feature
from [the plan template](plans/_template.md).

## Owner questions

[questions.md](questions.md) is the only place for unresolved owner questions. A
question includes context, options, a recommendation, and an empty `Answer:` slot.
When answered, incorporate the result into the affected plan and remove the
question in the same change. There is no separate decision ledger.

## Workflow

```text
Idea → owner question → accepted plan → implementation PRs → validation → archive
```

1. Place sequence and exit gates in the [roadmap](roadmap.md).
2. Put implementation detail in one active plan and classify all three parity axes.
3. Open focused implementation PRs with the required parity evidence.
4. Update living references as behavior changes and save dated evidence as reports.
5. After validation, move the completed plan to `archive/plans/` with shipping evidence.

## Navigation

- [Roadmap](roadmap.md) — mandatory parity contract, phase order, and exit gates.
- [Questions](questions.md) — unresolved owner decisions only.
- [`plans/`](plans/) — proposed, ready, active, or blocked work only.
- [`reference/`](reference/) — living rules, effective-value and parity-manifest contracts, AI, simulation, balance, and design descriptions.
- [Frontend presentation contract](reference/frontend-presentation.md) — authoritative UI explanation,
  accessibility, overlay, and integration rules.
- [Actors and views](reference/actors-and-views.md) — workflow eligibility, redaction,
  spectator safety, and fair AI observation.
- [Runtime architecture](reference/architecture.md) — engine purity, canonical commands,
  versioning, invariants, and mechanical gates.
- [`reports/`](reports/) — immutable dated audits, playtests, and simulation evidence.
- [`archive/`](archive/) — shipped or superseded plans and historical work notes.

Run `npm run docs:check` before submitting documentation changes. CI checks plan
metadata, active-plan index coverage, question placement, root layout, local links,
and repository-relative path portability.
