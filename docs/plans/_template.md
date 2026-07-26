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

## PR slices

1. Define independently reviewable vertical slices and their dependency order.

## Acceptance and validation

- List behavioral acceptance tests and required human/simulation evidence.
- Automated tests travel with the PR that introduces the behavior.

## Retirement

After validation, update living references and move this plan to
`docs/archive/plans/` with its shipping PR and evidence.
