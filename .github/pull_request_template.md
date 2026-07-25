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
- [ ] New or changed `LegalMove` members are classified in `src/parity/moveParity.ts`.
- [ ] New automatic mechanics are visible to players where needed and represented in sim telemetry and AI evaluation.
- [ ] Consequential AI decisions have clearly-use, clearly-avoid, and edge-case behavior tests.
- [ ] Any deliberately deferred axis is recorded as incomplete work in `docs/roadmap.md`.

## Validation

- [ ] `npm run check`
- [ ] `npm run test:parity`
- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run build`

<!-- List any check that was not run and explain why. -->
