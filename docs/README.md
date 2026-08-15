# Hegemony documentation

This is the documentation control plane. Start here instead of reading the whole
tree. The roadmap establishes sequence and exit gates; plans define unshipped
work; references describe the game that exists; reports preserve dated evidence;
and the archive is historical context, never current authority.

Last updated: 2026-08-04.

## Now

**Current initiative:** [Phase 4 luxury goods](plans/luxury-goods.md), beginning with the
topology and shared-vertex marker slice. Phase 3.6 is closed; its
[architecture contract](reference/architecture.md) is now living reference and its
[delivery plan](archive/plans/phase-3.6-architecture-hardening.md) is archived.

**Owner blocker:** None for the Phase 4 opening slice.

**Locked sequence:** V1 includes luxury goods, full Catan-style player trade, all twelve
National Ideas, and the intended typed Resolution/Idea effects. The v1 mechanics freeze
precedes full multiplayer.

## Active plans

| Plan                                                | Phase    | Status    | Position                                                                              |
| --------------------------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------- |
| [Outcome-driven AI](plans/outcome-driven-ai.md)     | 3.6/post | `ready`   | Observation/capability prerequisites first; advanced search waits for the freeze      |
| [Luxury goods](plans/luxury-goods.md)               | 4        | `active`  | Opening slice: topology and canonical shared-vertex marker                            |
| [UI overhaul](plans/ui-overhaul.md)                 | —        | `active`  | Presentation only, on the `ui-overhaul` worktree branch; adoption is the owner's call |
| [UI triage](plans/ui-triage.md)                     | —        | `active`  | The defect ledger closing the holes found by driving the overhauled UI                |
| [UI triage — parity](plans/ui-triage-parity.md)     | —        | `active`  | What the showcase designed and the app never built; companion feed to the ledger      |
| [Player trade](plans/player-trade.md)               | 4        | `blocked` | V1 after luxuries; full negotiation ships before the mechanics freeze                 |
| [National Ideas](plans/national-ideas.md)           | 5        | `blocked` | V1; twelve-idea reverse-snake draft after Phase 4                                     |
| [V1 mechanics freeze](plans/v1-mechanics-freeze.md) | 5.5      | `blocked` | Final typed Resolution/Idea effects and evidence before multiplayer                   |

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
