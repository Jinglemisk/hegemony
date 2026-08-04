## Summary

<!-- What changed, and why? -->

## Three-axis parity

Read the [mandatory parity contract](docs/roadmap.md#mandatory-three-axis-parity-contract).
Every row needs implementation evidence or a justified `N/A`; a blank row means the
change is not ready to merge.

| Axis             | Applicable / N/A | Evidence or N/A reason |
| ---------------- | ---------------- | ---------------------- |
| Engine / backend |                  |                        |
| Frontend         |                  |                        |
| Simulation & AI  |                  |                        |

### Parity checks

- [ ] Every applicable axis landed in this vertical slice.
- [ ] Affected consumers within every applicable axis were inventoried; no sibling surface or code path was silently left behind.
- [ ] Backend queries, previews, legal-move enumeration, and execution reuse authoritative rules and agree in regression tests.
- [ ] Frontend surfaces reuse shared selectors/presenters for the same fact, cost, status, or effect.
- [ ] Simulation observation, evaluation, execution, and telemetry reuse their canonical paths.
- [ ] New or changed `GameCommand` members are classified in `src/parity/commandParity.ts`.
- [ ] New automatic mechanics are visible to players where needed and represented in sim telemetry and AI evaluation.
- [ ] Consequential AI decisions have clearly-use, clearly-avoid, and edge-case behavior tests.
- [ ] Any deliberately deferred axis is recorded as incomplete work in `docs/roadmap.md`.

## Architecture impact

Classify applicable items in the PR summary; use `N/A` with a reason where they do not apply.

- [ ] Browser, simulation, replay, and future server behavior crosses the canonical command transition; no parallel domain-mutation path was added.
- [ ] Match rules/content come from the pinned per-match definition; no module-global match state or client-derived authority was introduced.
- [ ] Actor eligibility covers ordinary turns and any multi-seat workflow affected by this change.
- [ ] Private/public information is represented by player/spectator projections and anti-peek tests where relevant.
- [ ] New addressable entities use stable ids; ownership/transfer/card-zone changes have conservation and post-transition invariant coverage.
- [ ] Save/replay schema, command, ruleset, and content version compatibility was assessed.
- [ ] Required decisions and persistent effects use the shared typed projection/presentation contracts rather than feature-private overlay infrastructure.

## Validation

- [ ] `npm run check`
- [ ] `npm run docs:check`
- [ ] `npm run test:parity`
- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run build`

<!-- List any check that was not run and explain why. -->

Simulation campaigns are risk-based. Link matched campaign evidence when probabilities,
balance, policy evaluation, or multi-system behavior warrants it; otherwise list the
deterministic scenarios/invariants run. No fixed number of full games is required for every PR.
