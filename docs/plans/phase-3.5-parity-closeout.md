---
status: ready
phase: "3.5"
updated: 2026-07-26
---

# Phase 3.5 parity closeout

This is the active delivery plan after PRs #48–#50. It preserves the agreed work
as one coordinated, stacked PR train. Each PR must be independently reviewable
and green; implementation may be developed together, but branches merge in
dependency order.

## Outcome

Finish the remaining truth, enforceability, interaction, and Assembly work needed
before Phase 3.5 can be validated as a whole. Every gameplay change follows the
roadmap's engine/frontend/simulation-AI parity contract.

## Delivery train

| Step                                  | PR type                 | Scope                                                                                                                                                                                                                                                                   | Exit gate                                                                                                                                                  |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Restore parity truth**           | Corrective patch        | Reconcile current documentation; make every building/action surface consume effective content and effective costs. Action surfaces show authoritative status costs; reference surfaces label base costs.                                                                | A tuned building or cost change agrees across engine execution, every affected frontend sibling, and simulation policy evaluation.                         |
| **2. Extend parity enforcement**      | Implementation          | Add exhaustive feature/effect/content manifests, including Table, Law, and Directive effects; connect classifications to frontend presentation, AI observation/value, telemetry, and behavioral fixtures.                                                               | A consequential passive, automatic, or read-only feature cannot compile or pass CI with an unclassified axis.                                              |
| **3. Unify interaction presentation** | Implementation          | Add shared accessible Tooltip and interactive Popover primitives with common anchoring, collision, semantic effect rows, source, duration, and blocked-reason slots. Migrate gameplay-critical surfaces first.                                                          | Costs, blocked reasons, active effects, and Assembly explanations behave consistently with hover, focus, and accessibility output.                         |
| **4. Revise the Assembly**            | Gameplay implementation | Replace Voice with the permanent authored-and-passed ratchet and a minimum; add one-time politician prizes; remove the Stratokles coup; make Stratokles effects player-targeted; ship frontend state, master-policy behavior, telemetry, and behavioral tests together. | The revised Assembly is complete on all three axes and no PR depends on a later branch for required parity.                                                |
| **5. Validate and tune**              | Validation              | Record the human playtest; run Assembly participation and runaway-leader checks; rerun cities 3→2 and the agreed balance campaigns; apply only evidence-driven tuning; close the Phase 3.5 record.                                                                      | A tester can explain changes, the reference policy exercises the revised game credibly, the agora is worth engaging, and the no-coup runaway check passes. |

## Merge and testing rules

- Open the steps as linked stacked PRs and merge them in order.
- Automated regression tests travel with every implementation PR; Step 5 is the
  final combined playtest/campaign gate, not the first time the work is tested.
- A branch may build on a preceding branch, but no merged feature may leave an
  applicable parity axis for a later PR.
- Balance results before Step 4 are historical results for the old Assembly.

## Inputs still required

- Choose initial one-time prizes for Perdiccas, Kleistophenes, and Stratokles.
- Choose the minimum authored-and-passed count required to hold Voice.

Both values should remain ruleset dials and are validated in Step 5.

## Retirement

After Step 5 passes, move this plan to the documentation archive and leave only
the Phase 3.5 outcome and validation links in the roadmap.
