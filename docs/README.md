# Hegemony documentation

This is the documentation control plane. Start here instead of reading the whole
tree. The roadmap establishes sequence and exit gates; plans define unshipped
work; references describe the game that exists; reports preserve dated evidence;
and the archive is historical context, never current authority.

Last updated: 2026-07-26.

## Now

**Current initiative:** [Phase 3.5 parity closeout](plans/phase-3.5-parity-closeout.md).
The next implementation PR restores parity truth by reconciling documentation,
effective content, and effective costs across engine, frontend, and simulation/AI.

**Owner blocker:** [Q39](questions.md#q39--what-is-the-initial-voice-minimum) must
be answered before the Assembly revision in Step 4. It does not block Steps 1–3.

## Active plans

| Plan                                                            | Phase    | Status    | Position                                    |
| --------------------------------------------------------------- | -------- | --------- | ------------------------------------------- |
| [Phase 3.5 parity closeout](plans/phase-3.5-parity-closeout.md) | 3.5      | `ready`   | Next; execute Steps 1–5 in order            |
| [Outcome-driven AI](plans/outcome-driven-ai.md)                 | Post-3.5 | `ready`   | Approved direction after the closeout       |
| [Luxury goods](plans/luxury-goods.md)                           | 4        | `blocked` | Waits for Phase 3.5 and its owner questions |
| [Player trade](plans/player-trade.md)                           | 4        | `proposed`| Catan-style negotiation; after luxuries          |
| [National Ideas](plans/national-ideas.md)                       | 5        | `proposed`| Pre-filled from the PDF; twelve-idea reverse-snake draft |

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
- [`reference/`](reference/) — living rules, AI, simulation, balance, and design descriptions.
- [`reports/`](reports/) — immutable dated audits, playtests, and simulation evidence.
- [`archive/`](archive/) — shipped or superseded plans and historical work notes.

Run `npm run docs:check` before submitting documentation changes. CI checks plan
metadata, active-plan index coverage, question placement, root layout, local links,
and repository-relative path portability.
