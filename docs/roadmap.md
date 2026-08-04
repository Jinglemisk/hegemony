# Hegemony — Roadmap

This is the canonical delivery sequence and mandatory parity contract. Read it
before planning, implementing, or declaring work complete. Implementation detail
belongs in linked plans; unresolved owner decisions belong only in
[questions.md](questions.md).

Last updated: 2026-08-04.

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
- `src/parity/commandParity.ts` exhaustively maps every `GameCommand` to frontend and
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

## Mandatory architecture contract

The parity contract is only credible when every runtime crosses the same boundary.
[Phase 3.6](plans/phase-3.6-architecture-hardening.md) therefore lands before new
Phase 4 systems and establishes these rules:

1. **One immutable definition per match.** Rules and content are pinned by version/hash;
   mutable module-global content is forbidden. Concurrent matches may use different
   definitions without leakage.
2. **One command transition.** Browser, simulator, replay, and future server submit the
   same client-input `GameCommand`. Effective costs, eligibility, effects, and outcomes
   are derived by the engine, never trusted from the caller.
3. **Atomic state changes.** A transition returns a new state and structured events on
   success or reasons on rejection. Failed commands cannot leave partial mutation.
4. **Workflow-aware actors.** `currentPlayer` governs ordinary turns, but multi-seat
   Assembly and trade workflows expose their own authoritative actor eligibility.
5. **Player-safe projections.** The browser and AI observation consume explicit
   player/spectator views that redact private cards, deck order, RNG, and future private
   negotiation state.
6. **Stable identity and replay.** Settlements, transferable assets, offers, decisions,
   commands, state, rules, and content have stable identities/versions. Ongoing games
   stay pinned across deployments and supported replays remain deterministic.
7. **Conservation and integrity.** Inexpensive post-transition invariants cover indexed
   settlements, pops/transfers, card zones, Assembly state, and transferable ownership.

Repository organization stays incremental: first keep `src/game` pure and move browser
adapters to `src/client`; create `apps/` and `packages/` workspaces only when the server
runtime begins. Import boundaries, behavioral command-parity tests, dead-code checks,
warning-free lint, a scoped formatting gate, non-duplicative CI, and one browser smoke
flow mechanically enforce the contract.

## Phase 3.5 closeout — shipped

The [archived Phase 3.5 plan](archive/plans/phase-3.5-parity-closeout.md) and
[closeout campaign](reports/simulation/2026-08-03-phase-3.5-closeout.md) preserve the
completed work and validation evidence.

1. **Restore parity truth (merged in PR #58):** reconcile documentation and
   effective content/effective-cost drift through the
   [effective-value contract](reference/effective-values.md).
2. **Extend parity enforcement (merged in PR #59):** exhaustive
   [feature/effect/content manifests](reference/parity-manifests.md) and
   behavioral CI.
3. **Unify interaction presentation (merged in PR #57):** accessible shared
   Tooltip and interactive Popover primitives, canonical mechanics details, and
   migrated Assembly explanations.
4. **Revise the Assembly:** permanent Voice ratchet and minimum,
   scarcity-weighted one-time author prizes, descriptive patrons, no coup,
   rival-targeted Stratokles, and all three parity axes.
5. **Validate and tune:** Assembly/runaway campaigns, cities 3→2 rerun, prize sweep,
   and evidence-driven closure. Automated gates passed; owner review accepted the
   closeout without representing the absent full-game human transcript as completed.

Polis Builder remains at three cities. Standard prizes are +5 food / +3 stone / +4 wood /
+2 happiness; Low Numbers uses +2 / +2 / +3 / +1. The `master` policy's slow city
result is recorded as a cross-turn planning limitation, not used to shorten the card.

## Current initiative — Phase 3.6 architecture hardening

The [Phase 3.6 plan](plans/phase-3.6-architecture-hardening.md) is active. Definition
isolation, the canonical atomic transition, workflow actors, player/spectator projections,
fair AI observation, stable settlement/transfer identities, versioned recipes, replay
compatibility handling, and post-transition invariants are implemented. The final slice
adds mechanical import/parity/dead-code/format/CI enforcement and a browser smoke path.

## Locked v1 finish line

The owner confirmed on 2026-08-03 that **luxury goods, Catan-style player trade, and
National Ideas are all v1**. They are not optional v2 deferrals. After those systems
and the intended typed Resolution/Idea effects are complete, the
[v1 mechanics-freeze plan](plans/v1-mechanics-freeze.md) closes the content manifest.

Full multiplayer follows that mechanics freeze. Phase 3.6 deliberately lands its
network-shaped command, actor, projection, identity, definition, and replay foundations
before Phase 4, so trade and Ideas do not need a gameplay rewrite when server authority
arrives. The server runtime, persistence, lobby, reconnect, and deployment remain deferred
until the rules are frozen.

## Delivery principles

1. Close the playable loop before widening it.
2. Build sinks before sources, systems before content, and content before polish.
3. Gameplay features ship as three-axis vertical slices.
4. Interaction and rivalry outrank additional solitaire surface.
5. No substantial work is scheduled without an accepted plan.
6. Simulation is an instrument: use targeted campaigns and label policy limits.
7. Batch visual-design decisions; do not reopen a frozen direction during feature work.
8. Deterministic scenarios and invariants travel with behavior; broad balance batches are
   risk-based, never an arbitrary fixed game count on every gameplay PR.
9. New feature PRs are vertical capabilities. Engine, frontend, and simulation/telemetry
   are not separate mergeable stages of an incomplete behavior.

**Phase 3.5 order amendment (closed 2026-08-04):** the one-click
**low-number core tuning preset** is implemented across rules, buildings, terrain,
events, economic tables, Assembly participation costs, browser tuning, and simulator
evidence. Its [matched campaign](reports/simulation/2026-07-31-low-number-core-v1.md)
passes the denomination and race-duration gates. Effective Assembly resolutions and
politician prizes complete the preset; the final campaign accepted the three-city
threshold and scarcity-scaled prizes.

## Phase sequence

| Phase   | Status   | Scope                                                                                                                                                                   | Exit gate                                                                                                                       |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **0–2** | Shipped  | Playable victory loop, currencies, interface foundation, terrain economy, and capped buildings                                                                          | Historical plans and evidence are archived                                                                                      |
| **2.5** | Absorbed | Debt sweep; remaining authoritative-cost and shared-interaction work travels in Phase 3.5                                                                               | Remaining debt has an explicit Phase 3.5 owner                                                                                  |
| **3**   | Shipped  | Two-panel UI, Assembly, and influence-aware AI                                                                                                                          | Closed by the Phase 3.5 train                                                                                                   |
| **3.5** | Shipped  | Truth, enforcement, shared interaction primitives, Assembly revision, AI repair, and validation                                                                         | Closeout evidence accepted; the missing separate human transcript remains disclosed                                             |
| **3.6** | Active   | Per-match definition, canonical atomic commands, workflow actors, player projections, stable identities/versioned replay, invariants, and mechanical architecture gates | Browser, sim, replay, and async Assembly all cross one deterministic, player-safe engine boundary                               |
| **4**   | Blocked  | Topology, six coastal luxury assets and Port, then v1 Catan-style player trade using universal ownership transfer and tested multi-seat workflow primitives             | Luxury/unrest economy holds; full trade negotiation is used and understandable in human games                                   |
| **5**   | Blocked  | Twelve National Ideas through a typed per-seat modifier channel; complete the intended typed Resolution and Idea effect families                                        | Draft has no automatic pick; every intended effect is authoritative, visible, observable, valued where relevant, and manifested |
| **5.5** | Blocked  | V1 mechanics/content inventory, targeted balance and full-game validation, version/hash record, known caveats, and explicit v2 list                                     | The v1 mechanics freeze is published and representative games replay deterministically                                          |
| **6**   | Deferred | Server-authoritative multiplayer: web/server/package split, validated protocol schemas, persistence, lobby, seat sessions, reconnect, synchronization, and deployment   | Four-player matches survive reconnect/deploy boundaries without leaking private state or diverging                              |
| **7**   | Deferred | Final balance ratification, generated player guide, visual-system/debt consolidation, performance, accessibility, browser coverage, and release polish                  | One coherent, documented, deployable v1 artifact                                                                                |

## Later and parked work

These items are intentionally not active plans:

- Revisit the building roster and bank/market rates only after luxury and player
  trade establish the complete v1 economy; include the dead colony→city path and
  venture-stake pricing. Luxury is not required to force a predetermined gold sink.
- Revisit constrained map shuffling during topology work.
- Decide whether seasonal end-of-season reckoning needs a feature plan.
- Implement only the fair-observation, capability-scenario, and policy-modularization
  prerequisites from the outcome-driven AI plan before the mechanics freeze. MCTS,
  learned evaluation, and large tournament infrastructure wait until the v1 target is stable.
- Generate the external player guide from the same typed rules/content source as the
  Compendium after the v1 mechanics freeze.
- Review the autumn icon, stricter TypeScript flags, resource-versus-meter type split,
  and other visual/debt work during Phase 7 rather than mixing them into gameplay PRs.
- Military, chat, spectators, Redis, microservices, learned AI, and 2–3-player scaling
  are explicit post-v1 work unless the roadmap is amended.

## Documentation map

- [Documentation control plane](README.md) — now, next, blockers, and navigation.
- [Owner questions](questions.md) — unresolved owner decisions only.
- [Active plans](plans/) — proposed, ready, active, or blocked implementation work.
- [Living reference](reference/) — behavior that exists now.
- [Dated reports](reports/) — audits, playtests, and simulation evidence.
- [Archive](archive/) — historical context, never current authority.
