---
status: active
phase: "3.5"
updated: 2026-07-29
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

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                    |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Engine / backend | Yes      | Authoritative content, costs, status/effect queries, Assembly state and execution, ruleset dials, and behavioral tests               |
| Frontend         | Yes      | Shared effective-cost/effect presentation, accessible Tooltip/Popover behavior, revised Assembly controls/status, history, and Codex |
| Simulation & AI  | Yes      | Exhaustive classification, fair observation, revised policy valuation/planning, telemetry, fixtures, and validation campaigns        |

## Delivery train

| Step                                  | PR type                 | Scope                                                                                                                                                                                                                                                                   | Exit gate                                                                                                                                                  |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Restore parity truth**           | Corrective patch        | Reconcile current documentation; make every building/action surface consume effective content and effective costs. Action surfaces show authoritative status costs; reference surfaces label base costs.                                                                | A tuned building or cost change agrees across engine execution, every affected frontend sibling, and simulation policy evaluation.                         |
| **2. Extend parity enforcement**      | Implementation          | Add exhaustive feature/effect/content manifests, including Table, Law, and Directive effects; connect classifications to frontend presentation, AI observation/value, telemetry, and behavioral fixtures.                                                               | A consequential passive, automatic, or read-only feature cannot compile or pass CI with an unclassified axis.                                              |
| **3. Unify interaction presentation** | Implementation          | Add shared accessible Tooltip and interactive Popover primitives with common anchoring, collision, semantic effect rows, source, duration, and blocked-reason slots. Migrate gameplay-critical surfaces first.                                                          | Costs, blocked reasons, active effects, and Assembly explanations behave consistently with hover, focus, and accessibility output.                         |
| **4. Revise the Assembly**            | Gameplay implementation | Replace Voice with the permanent authored-and-passed ratchet and a minimum; add one-time politician prizes; remove the Stratokles coup; make Stratokles effects player-targeted; ship frontend state, master-policy behavior, telemetry, and behavioral tests together. | The revised Assembly is complete on all three axes and no PR depends on a later branch for required parity.                                                |
| **5. Validate and tune**              | Validation              | Record the human playtest; run Assembly participation and runaway-leader checks; rerun cities 3→2 and the agreed balance campaigns; apply only evidence-driven tuning; close the Phase 3.5 record.                                                                      | A tester can explain changes, the reference policy exercises the revised game credibly, the agora is worth engaging, and the no-coup runaway check passes. |

**Delivery state:** Steps 1–3 merged in PRs #58, #59, and #57. The shared presentation
layer was rebased and reconciled with the effective-value APIs and parity manifests
before merge. Under the Phase 3.5 order amendment, the approved low-number economy
preset is the next implementation slice. Steps 4 and 5 remain pending.

## Merge and testing rules

- Open the steps as linked stacked PRs and merge them in order.
- Automated regression tests travel with every implementation PR; Step 5 is the
  final combined playtest/campaign gate, not the first time the work is tested.
- A branch may build on a preceding branch, but no merged feature may leave an
  applicable parity axis for a later PR.
- Balance results before Step 4 are historical results for the old Assembly.

## Settled and open inputs

- Patron standing buffs are removed; only the one-time enactment prizes remain.
- The implementation owns balanced initial prizes for Perdiccas, Kleistophenes,
  and Stratokles. Prizes never grant citizens and remain ruleset dials.
- All Stratokles Directives target a chosen player, each passed Directive adds
  one ratchet count, and the coup is removed.
- Voice uses a minimum and first-to-reach ownership until strictly exceeded.
  The numeric minimum is **3** (Q39, resolved 2026-07-27) — a ruleset dial for Step 5 tuning.

## Retirement

After Step 5 passes, move this plan to the documentation archive and leave only
the Phase 3.5 outcome and validation links in the roadmap.
