---
archive_status: implemented
archived: 2026-07-26
shipping_pr: "#52"
---

> Implemented by the documentation-control-plane reset. Validation and the final
> PR number are recorded in this header before merge.

# Documentation control-plane reset

## Problem

At audit time, merged `main` had 47 Markdown documents under `docs/` and about
9,500 lines. Current plans, shipped build records, dated reports, owner Q&A,
living references, and superseded notes share the same folders and use
incompatible status conventions. Examples include shipped work still marked
`EXECUTING`, answered questions still marked `OPEN`, and roadmap text that
still lists the PR #50 active-effects work as missing.

## Outcome

Give contributors one short starting point and a single lifecycle for ideas,
owner questions, plans, implementation, validation, and history. Preserve useful
history without letting historical documents compete with current truth.

## Proposed layout

```text
docs/
├── README.md          # control plane: now, next, blocked, and navigation
├── roadmap.md         # short phase sequence and exit gates
├── questions.md       # only questions currently awaiting the owner
├── plans/             # proposed, ready, active, or blocked work only
├── reference/         # living descriptions of the implemented game/tooling
├── reports/           # immutable dated audits, playtests, and sim results
└── archive/           # shipped/superseded plans and historical work notes
```

There is deliberately no separate decision ledger. When the owner answers a
question, the answer is incorporated into the affected accepted plan. The
question then leaves `questions.md`; its historical context remains in the
archived plan and Git history.

## Working lifecycle

```text
Idea → owner question → accepted plan → implementation PRs → validation → archive
```

### File responsibilities

- `docs/README.md` is the only start-here page. Keep it under roughly 100
  lines and show the current initiative, next PR, owner blockers, active plans,
  and navigation.
- `docs/roadmap.md` records sequence, phase status, and exit gates. It links to
  plans instead of embedding implementation histories or Q&A.
- `docs/questions.md` contains only unresolved questions with context,
  options, a recommendation, and an `Answer:` slot.
- `docs/plans/*.md` contains work not yet shipped. A large feature gets one
  plan with outcome/non-goals, settled inputs, open question IDs, the
  three-axis matrix, PR slices, and acceptance tests.
- `docs/reference/` describes behavior that exists now. It changes when the
  implementation changes.
- `docs/reports/` contains point-in-time evidence. Reports are not silently
  rewritten into current plans.
- `docs/archive/` contains shipped or superseded plans and historical work
  notes. Archive material is context, never current authority.

## Plan metadata

Every file in `docs/plans/` uses a small header:

```yaml
---
status: proposed | ready | active | blocked
phase: "3.5"
updated: YYYY-MM-DD
---
```

On completion, the implementation PR updates living reference documentation and
moves the plan to `docs/archive/plans/` with its final PR and validation
evidence.

## Proposed migration

### Keep at the control-plane root

| Current path               | Proposed action                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `docs/roadmap.md`          | Keep and shorten to phase status, order, exit gates, and active-plan links.                                         |
| `docs/archive/roadmap-appendix.md` | Retire after extracting unresolved questions; move intact to `docs/archive/roadmap-appendix.md`.                    |
| `docs/archive/todo.md`             | Retire after assigning every live item to the roadmap, questions, or a plan; move intact to `docs/archive/todo.md`. |

### Active plans

| Current path                          | Proposed destination                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `docs/plans/luxury-goods.md`           | `docs/plans/luxury-goods.md`                                                     |
| `docs/plans/outcome-driven-ai.md` | `docs/plans/outcome-driven-ai.md`                                                |
| `docs/archive/notes/simulation-plan.md`                    | Fold still-valid campaigns into the active Phase 3.5 plan; archive the original. |
| New five-step delivery train          | `docs/plans/phase-3.5-parity-closeout.md`                                        |

### Living reference

| Current path                                        | Proposed destination                         |
| --------------------------------------------------- | -------------------------------------------- |
| `docs/reference/ai.md`                                        | `docs/reference/ai.md`                       |
| `docs/reference/simulation.md`                                | `docs/reference/simulation.md`               |
| `docs/reference/v0.1-rules-spec.md`                           | `docs/reference/v0.1-rules-spec.md`          |
| `docs/reference/design/README.md`                             | `docs/reference/design/README.md`            |
| `docs/reference/design/direction-dossier.md`                  | `docs/reference/design/direction-dossier.md` |
| `docs/reference/design/brandbook-v0.1.html`                   | `docs/reference/design/brandbook-v0.1.html`  |
| `docs/reference/design/showcases/`                            | `docs/reference/design/showcases/`           |
| Existing `docs/reference/assets/` and showcase HTML | Keep under `docs/reference/`.                |

### Point-in-time reports

| Current path                                  | Proposed destination                                          |
| --------------------------------------------- | ------------------------------------------------------------- |
| `docs/reports/product/2026-07-23-phase-3c-production-gate.md` | `docs/reports/product/2026-07-23-phase-3c-production-gate.md` |
| `docs/reports/product/2026-07-23-state-of-the-game.md` | `docs/reports/product/2026-07-23-state-of-the-game.md`        |
| `docs/reports/audits/*.md`                     | `docs/reports/audits/`                                        |
| `docs/reports/audits/architecture-report.html`        | `docs/reports/audits/architecture-report.html`                |
| `docs/reports/balance/initial-round-balance.md`               | `docs/reports/balance/initial-round-balance.md`               |
| `docs/reports/simulation/2026-*.md`                          | `docs/reports/simulation/`                                    |
| `docs/reports/simulation/README.md`                          | `docs/reports/simulation/README.md`                           |
| `docs/reports/audits/2026-07-23-ai-bot-parity.md`                  | `docs/reports/audits/2026-07-23-ai-bot-parity.md`             |
| `docs/reports/simulation/2026-07-21-map-foresight.md`                  | `docs/reports/simulation/2026-07-21-map-foresight.md`         |

### Shipped or superseded plans

Move these to `docs/archive/plans/`, adding a short archive header with the
shipping PR/date or the plan that superseded them:

- `docs/archive/plans/assembly-politicians.md`
- `docs/archive/plans/codex-rules.md`
- `docs/archive/plans/event-cards.md`
- `docs/archive/plans/event-tables.md`
- `docs/archive/plans/influence-aware-ai.md`
- `docs/archive/plans/seasons.md`
- `docs/archive/plans/terrain-economy.md`
- `docs/archive/plans/two-panel.md`
- `docs/archive/plans/ui-refit.md`
- `docs/archive/plans/unrest.md`

Move these historical work notes to `docs/archive/notes/`:

- `docs/archive/notes/OVERNIGHT.md`
- `docs/archive/notes/resource-color-rollback-note.md`
- `docs/archive/notes/rules-archive.md`
- the original `docs/archive/notes/simulation-plan.md`

### Delete after rehabilitation

Deletion means removal from the active tree; Git history remains available.

| Current path               | Reason and prerequisite                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/feat/ui-overhaul.md` | Raw early UI note superseded by the shipped UI-refit/two-panel plans. Confirm any still-valid requirement is represented before deletion. |
| `docs/next-mechanics.md`   | Temporary scoring/happiness/influence recommendation superseded by shipped victory, unrest, civic-calm, and Assembly systems.             |

No other document should be deleted merely for being old. Unique research or
implementation history belongs in reports or archive.

## Migration sequence

1. Create `docs/README.md`, `docs/questions.md`, and the plan template.
2. Reconcile the roadmap and extract only genuinely unresolved questions.
3. Classify and move reference, report, plan, and archive files; update all
   internal links mechanically.
4. Rehabilitate live `todo.md` and appendix items into their destinations,
   then archive the originals.
5. Delete only the two superseded documents listed above after a content check.
6. Add a lightweight `docs:check` gate for required plan metadata, active-plan
   index coverage, unresolved-question placement, and internal links.

## Acceptance

- A new agent can start from `docs/README.md` without reading the whole tree.
- Each fact has one current owner: roadmap, question, plan, reference, or report.
- Every active plan appears in the control-plane index.
- No answered question remains marked open.
- No shipped plan remains in `docs/plans/`.
- Every moved link resolves and README/player-facing asset paths remain valid.
- The five-step Phase 3.5 train remains the explicit next implementation work.
