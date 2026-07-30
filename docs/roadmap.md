# Hegemony — Roadmap

This is the canonical delivery sequence and mandatory parity contract. Read it
before planning, implementing, or declaring work complete. Implementation detail
belongs in linked plans; unresolved owner decisions belong only in
[questions.md](questions.md).

Last updated: 2026-07-29.

## Mandatory three-axis parity contract

Every change must be assessed across the same three axes:

| Axis                 | Required assessment and proof                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Engine / backend** | Authoritative state, rules, data, legal moves or automatic resolution, shared status/query functions, and engine tests. Consumers must not duplicate formulas.                                                         |
| **Frontend**         | How a player initiates or sees the result; eligibility and blocked reasons; choices and targets; effective costs/effects; persistent state, history, Codex, accessibility, and focused UI verification where relevant. |
| **Simulation & AI**  | Execution through the real engine/legal-move path; fair observation; reference-policy valuation and planning; telemetry; deterministic “use”, “avoid”, and edge-case scenarios where the feature creates a decision.   |

Cross-axis presence is only half of parity. Each applicable axis must also remain
internally consistent:

- **Backend ↔ backend:** enumeration, validation, previews, queries, execution,
  ruleset overrides, replay, and serialization share authoritative rules.
- **Frontend ↔ frontend:** board, commands, modals, ledger, history, Codex,
  tooltips, and accessibility text derive the same facts and presentations.
- **Simulation ↔ simulation:** observation, evaluation, execution, replay, and
  telemetry use one vocabulary and no contradictory approximations.

Rules of the contract:

1. Every plan and PR classifies all three axes as applicable or `N/A`, with a
   reason for every `N/A`. A blank axis is not a decision.
2. Player-facing gameplay normally requires all three axes. Visual-only,
   documentation, tooling, and internal refactors may use justified `N/A`s.
3. Automatic mechanics need frontend explanation whenever players must understand
   the result, and sim/AI coverage whenever they affect evaluation.
4. Mechanical executability is not AI parity. The reference `master` policy must
   observe, value, plan for, and meaningfully exercise or avoid the feature.
5. Prefer vertical slices containing every applicable engine, frontend,
   simulation/AI, telemetry, test, and documentation change.
6. A feature is complete only when each applicable axis has implementation
   evidence and behavioral regression proof. Limited-policy simulation results
   must be labelled as such, not presented as game-balance evidence.
7. Inventory sibling consumers within each axis. Shared rules and presentations
   use one authoritative function or typed model, plus behavioral parity tests.

Enforcement surfaces:

- `.github/pull_request_template.md` requires three-axis evidence.
- `src/parity/moveParity.ts` exhaustively maps every `LegalMove` to frontend and
  simulation/AI paths.
- `src/parity/featureParity.ts` exhaustively classifies Event, Table, Law,
  Directive, Building, and active-effect vocabularies plus every shipped content
  family across engine, frontend, simulation/AI, telemetry, and behavioral proof.
- Universal action/effect/content telemetry and `npm run test:parity` keep
  classified paths visible, including zero-use buildings and events.
- The parity suite covers legal-move soundness, preview-versus-outcome,
  within-axis consistency, exact content/effect inventories, typed effect
  presentation, policy projection, exact expiry, behavioral evidence pointers,
  and telemetry.
- These gates catch omissions; they do not replace targeted tests proving that
  `master` makes sensible decisions.

Persistent mechanical state has one cross-axis query:
`src/game/activeEffects.ts#getActiveEffects`. Board and ledger UI, CLI
explanations, policy projections, and telemetry consume its typed descriptors
instead of rediscovering effects.

## Current initiative — Phase 3.5 parity closeout

The canonical work order and gates are in
[the Phase 3.5 plan](plans/phase-3.5-parity-closeout.md).

1. **Restore parity truth (merged in PR #58):** reconcile documentation and
   effective content/effective-cost drift through the
   [effective-value contract](reference/effective-values.md).
2. **Extend parity enforcement (merged in PR #59):** exhaustive
   [feature/effect/content manifests](reference/parity-manifests.md) and
   behavioral CI.
3. **Unify interaction presentation (merged in PR #57):** accessible shared
   Tooltip and interactive Popover primitives, canonical mechanics details, and
   migrated Assembly explanations.
4. **Revise the Assembly:** permanent Voice ratchet and minimum, one-time author
   prizes, no coup, player-targeted Stratokles, and all three parity axes.
5. **Validate and tune:** human playtest, Assembly/runaway campaigns, cities 3→2
   rerun, and evidence-driven closure.

Automated tests ship with Steps 1–4. Step 5 is the combined human and simulation
gate, not deferred implementation coverage.

## Delivery principles

1. Close the playable loop before widening it.
2. Build sinks before sources, systems before content, and content before polish.
3. Gameplay features ship as three-axis vertical slices.
4. Interaction and rivalry outrank additional solitaire surface.
5. No substantial work is scheduled without an accepted plan.
6. Simulation is an instrument: use targeted campaigns and label policy limits.
7. Batch visual-design decisions; do not reopen a frozen direction during feature work.

**Phase 3.5 order amendment (2026-07-26):** the canonical effect-presentation seams,
parity enforcement, and bot-evaluator repair have merged. The next implementation
slice is the one-click **low-number core tuning preset** specified in
[its active plan](plans/low-number-economy-preset.md), before the Assembly revision and
final balance campaigns.
The scheduled slice covers rules, buildings, terrain, events, economic tables, and
Assembly participation costs; Assembly resolutions and politician effects are the
explicitly deferred final 16%.

## Phase sequence

| Phase   | Status                 | Scope                                                                                                                                                                                    | Exit gate                                                                                                                        |
| ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **0–2** | Shipped                | Playable victory loop, currencies, interface foundation, terrain economy, and capped buildings                                                                                           | Historical plans and evidence are archived                                                                                       |
| **2.5** | Absorbed               | Debt sweep; remaining authoritative-cost and shared-interaction work travels in Phase 3.5                                                                                                | Remaining debt has an explicit Phase 3.5 owner                                                                                   |
| **3**   | Built, gate incomplete | Two-panel UI, Assembly, and influence-aware AI shipped; first results showed agora engagement is a net loss                                                                              | Closed by the Phase 3.5 train                                                                                                    |
| **3.5** | Active                 | Truth, enforcement, shared interaction primitives, Assembly revision, AI repair, and validation                                                                                          | Parity omissions fail CI; humans can explain effects; `master` credibly exercises the revised game; no-coup runaway check passes |
| **4**   | Blocked                | Topology, land luxuries, coastal luxuries and Port, then structured player trade or explicit v2 deferral                                                                                 | Luxury/unrest economy holds; trade is used; feature set and balance numbers freeze                                               |
| **5**   | Proposed               | National Ideas (twelve-idea reverse-snake draft). **Setup screen, networking, and 2–3-player scaling are deferred until the game is balanced (Q35, 2026-07-27) — out of scope for now.** | Ideas have no automatic pick                                                                                                     |
| **6**   | Deferred               | Post-freeze visual-system and technical-debt session                                                                                                                                     | One coherent visual system over frozen rules and numbers                                                                         |

## Later and parked work

These items are intentionally not active plans:

- Revisit the building roster and bank/market rates only after the luxury gold
  sink exists; include the dead colony→city path and venture-stake pricing.
- Revisit constrained map shuffling during topology work.
- Decide whether seasonal end-of-season reckoning needs a feature plan.
- Generate the external player guide from the same ruleset/content source as the Codex.
- Review the autumn icon, stricter TypeScript flags, npm audit findings, and the
  resource-versus-meter type split during the post-freeze debt session.
- Military, networking, and 2–3-player balance remain unscheduled until designed.

## Documentation map

- [Documentation control plane](README.md) — now, next, blockers, and navigation.
- [Owner questions](questions.md) — unresolved owner decisions only.
- [Active plans](plans/) — proposed, ready, active, or blocked implementation work.
- [Living reference](reference/) — behavior that exists now.
- [Dated reports](reports/) — audits, playtests, and simulation evidence.
- [Archive](archive/) — historical context, never current authority.
