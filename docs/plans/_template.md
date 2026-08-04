---
status: proposed
phase: "X"
updated: YYYY-MM-DD
---

# Plan title

## Outcome

State the player or contributor outcome, not the implementation mechanism.

## Non-goals

- Name adjacent work deliberately excluded from this plan.

## Settled inputs

- Record accepted owner answers and existing constraints here.

## Open owner questions

- Link stable IDs from [`docs/questions.md`](../questions.md), or write `None`.

## Three-axis parity

| Axis             | Applies?  | Required representation and proof                                                                |
| ---------------- | --------- | ------------------------------------------------------------------------------------------------ |
| Engine / backend | Yes / N/A | Authoritative state, rules, queries, execution, and tests; explain every N/A                     |
| Frontend         | Yes / N/A | Initiation, status, choices, effects, history/reference, accessibility, and focused verification |
| Simulation & AI  | Yes / N/A | Legal execution, observation, policy value/planning, telemetry, and behavioral scenarios         |

Also inventory sibling consumers within each applicable axis so backend↔backend,
frontend↔frontend, and simulation↔simulation representations cannot drift.

## Architecture impact

Classify each item as applicable or `N/A` with a reason:

- Per-match rules/content definition and version/hash.
- Canonical client-input command, derived legal option, and atomic transition.
- Single-actor or multi-seat actor eligibility.
- Public, private-player, and spectator projections.
- Stable identities, ownership/conservation, save/replay, and migrations.
- Required-decision/active-effect presentation without a feature-private workflow.
- Post-transition invariants and deterministic scenarios.

Do not introduce module-global match state, trust client-derived costs/outcomes, or add a
second engine path for browser convenience.

## PR slices

1. Define independently reviewable vertical capabilities and their dependency order.
   Engine, frontend, and simulation are evidence inside each applicable slice—not
   separate mergeable stages of an incomplete feature.

## Acceptance and validation

- List behavioral acceptance tests and required human/simulation evidence.
- Automated tests travel with the PR that introduces the behavior.

## Retirement

After validation, update living references and move this plan to
`docs/archive/plans/` with its shipping PR and evidence.
