# Hegemony documentation

This is the documentation control plane. Start here instead of reading the whole
tree. The roadmap establishes sequence and exit gates; plans define unshipped
work; references describe the game that exists; reports preserve dated evidence;
and the archive is historical context, never current authority.

Last updated: 2026-07-31.

## Now

**Current initiative:** [Phase 3.5 parity closeout](plans/phase-3.5-parity-closeout.md).
Steps 1–3 merged in PRs #58, #59, and #57 through the
[effective content and costs contract](reference/effective-values.md) and exhaustive
[parity manifests](reference/parity-manifests.md), followed by the shared interaction
and mechanics presentation layer defined by the
[frontend presentation contract](reference/frontend-presentation.md). The approved
[`low-number-core-v1` preset](reports/simulation/2026-07-31-low-number-core-v1.md)
is now implemented and validated. The next implementation slice is the Assembly
revision, followed by the final validation campaigns.

**Owner blocker:** None for Steps 1–4. Voice's initial minimum is 3. The remaining
[Q30 and Q50](questions.md) are Step 5 validation inputs, not implementation blockers.

## Active plans

| Plan                                                            | Phase    | Status     | Position                                                                       |
| --------------------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------ |
| [Phase 3.5 parity closeout](plans/phase-3.5-parity-closeout.md) | 3.5      | `active`   | Steps 1–3 and the low-number preset are implemented; Assembly revision is next |
| [Outcome-driven AI](plans/outcome-driven-ai.md)                 | Post-3.5 | `ready`    | Approved direction after the closeout                                          |
| [Luxury goods](plans/luxury-goods.md)                           | 4        | `blocked`  | Waits for Phase 3.5 and its owner questions                                    |
| [Player trade](plans/player-trade.md)                           | 4        | `proposed` | Catan-style negotiation; after luxuries                                        |
| [National Ideas](plans/national-ideas.md)                       | 5        | `proposed` | Pre-filled from the PDF; twelve-idea reverse-snake draft                       |

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
- [`reports/`](reports/) — immutable dated audits, playtests, and simulation evidence.
- [`archive/`](archive/) — shipped or superseded plans and historical work notes.

Run `npm run docs:check` before submitting documentation changes. CI checks plan
metadata, active-plan index coverage, question placement, root layout, local links,
and repository-relative path portability.
