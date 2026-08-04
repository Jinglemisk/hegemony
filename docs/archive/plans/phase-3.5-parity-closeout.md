---
status: shipped
phase: "3.5"
updated: 2026-08-04
---

# Phase 3.5 parity closeout

This was the delivery plan after PRs #48–#50. It preserves the agreed work and
the final disposition of the Phase 3.5 train.

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
before merge. The Phase 3.5 order amendment is fulfilled by the implemented
`low-number-core-v1` preset and its
[matched campaign](../../reports/simulation/2026-07-31-low-number-core-v1.md). Step 4's
three-axis Assembly revision and Step 5's automated campaign are complete. The
[closeout report](../../reports/simulation/2026-08-03-phase-3.5-closeout.md) records the
accepted Assembly, prize, Voice, and three-city decisions and explicitly notes that no
separate full-game human playtest transcript was recorded.

## Merge and testing rules

- Open the steps as linked stacked PRs and merge them in order.
- Automated regression tests travel with every implementation PR; Step 5 is the
  final combined playtest/campaign gate, not the first time the work is tested.
- A branch may build on a preceding branch, but no merged feature may leave an
  applicable parity axis for a later PR.
- Balance results before Step 4 are historical results for the old Assembly.

## Settled and open inputs

- Patron standing buffs are removed; only the one-time enactment prizes remain.
- The standard one-time author prizes are Demosthenes +5 food, Perdiccas +3 stone,
  Kleistophenes +4 wood, and Stratokles +2 happiness. Low Numbers uses +2 food,
  +2 stone, +3 wood, and +1 happiness. They remain ruleset dials.
- The house can draw Laws only. Every Stratokles Directive requires one rival target
  before proposal, each authored pass adds one Voice count, and the coup is removed.
- Voice uses a minimum and first-to-reach ownership until strictly exceeded.
  The numeric minimum is **3** (Q39, resolved 2026-07-27) and remains a ruleset dial.
- Patron labels remain a descriptive reading of standing stelae and grant no modifier.

## Retirement

Phase 3.5 closed on 2026-08-04 by owner direction after the recorded automated gates
passed. The next implementation train is
[Phase 3.6 architecture hardening](../../plans/phase-3.6-architecture-hardening.md),
which closes the command/content/projection/replay seams before v1 luxury and trade.
