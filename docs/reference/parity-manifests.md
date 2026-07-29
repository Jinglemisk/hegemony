# Parity manifests

Last updated: 2026-07-29.

This reference defines the Phase 3.5 Step 2 enforcement boundary for consequential
gameplay that is passive, automatic, content-driven, or read-only. It complements
the effective-value contract rather than replacing it.

## Enforcement layers

| Layer               | Authoritative seam                           | What it prevents                                                                                                                            |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Player actions      | `src/parity/moveParity.ts`                   | A new `LegalMove` cannot omit frontend initiation or simulation execution.                                                                  |
| Persistent state    | `src/game/activeEffects.ts#getActiveEffects` | A lasting mechanic cannot disappear from status, presentation, policy observation, or telemetry.                                            |
| Effects and content | `src/parity/featureParity.ts`                | A passive/automatic effect type or shipped content ID cannot silently miss an engine, frontend, simulation, telemetry, or behavioral route. |
| Effective values    | `docs/reference/effective-values.md`         | A routed consumer cannot substitute authored defaults for the effective content or cost the engine uses.                                    |

These layers intentionally overlap. A seasonal event may apply an immediate effect,
create persistent state, change an action's effective cost, and alter a later policy
decision. Each applicable layer must remain true.

## Exhaustive effect registries

`src/parity/featureParity.ts` keeps separate exhaustive records for the closed
effect vocabularies below. Keeping them separate preserves the engine's actual
resolution boundaries instead of inventing one lossy universal effect type.

| Registry                        | Closed vocabulary              | Required axes                                                                                                         |
| ------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `EVENT_EFFECT_PARITY`           | `EventEffect["type"]`          | Engine application, frontend presentation, policy observation/value, telemetry, behavioral fixture                    |
| `TABLE_EFFECT_PARITY`           | `TableEffect["type"]`          | Table resolution, frontend presentation, stochastic policy rule, telemetry, behavioral fixture                        |
| `LAW_EFFECT_PARITY`             | `LawEffect["type"]`            | Standing-law engine path, frontend presentation, policy observation/value, Assembly telemetry, behavioral fixture     |
| `DIRECTIVE_EFFECT_PARITY`       | `DirectiveEffect["type"]`      | One-time Assembly resolution, frontend presentation, policy observation/value, Assembly telemetry, behavioral fixture |
| `BUILDING_EFFECT_PARITY`        | `BuildingEffect["type"]`       | Effective-content engine query, frontend presentation, policy projection, building telemetry, behavioral fixture      |
| `ACTIVE_EFFECT_MECHANIC_PARITY` | `ActiveEffectMechanic["type"]` | Persistent-state query, frontend presentation, policy projection, prevalence telemetry, lifecycle/behavior fixture    |

Each record uses `satisfies Record<Union["type"], EffectParityCoverage>`. Adding an
effect variant therefore fails TypeScript until its classification exists. The
frontend adapters in `src/ui/effects.ts` are exhaustive switches over the same
unions; they are the presentation API for Step 3 and PR #57.

## Shipped content manifest

`CONTENT_MANIFEST` declares the exact authored IDs and cross-axis routes for:

| Family                 |                 Shipped IDs |
| ---------------------- | --------------------------: |
| Buildings              |                           9 |
| Terrain kinds          |                           5 |
| Seasonal events        |                          13 |
| Player events          |                          26 |
| Event tables           |                           5 |
| Riot-insurance options |                           3 |
| Politicians            |                           4 |
| Resolution cards       | 31 (24 Laws + 7 Directives) |
| Victory cards          |                           6 |

The IDs are deliberately explicit. `src/parity/featureParity.test.ts` compares
them with the live authored rosters, recursively inventories event choices, and
compares every authored effect discriminator with its exhaustive registry. A new,
removed, or renamed content item fails CI until the manifest is reconciled.

Building, player-event, and seasonal-event telemetry is zero-filled from these
closed IDs. Unused content stays visible in reports instead of vanishing from the
measurement vocabulary.

## Behavioral evidence

`PARITY_BEHAVIOR_FIXTURES` is the shared registry of concrete regression tests.
Every effect and feature classification names at least one fixture. CI verifies
that each fixture file exists and still contains its registered test title.

An implementation/evidence pointer proves that a deliberate route exists; it does
not prove that the route's model is strategically adequate. Behavioral fixtures
carry that burden. Stochastic table valuation remains an explicitly named policy
heuristic, and campaign evidence remains necessary before making balance claims.

## Adding consequential gameplay

When adding or changing a passive, automatic, content-driven, or read-only mechanic:

1. Extend the engine's narrow discriminated union or authored roster.
2. Add the exhaustive effect classification or explicit content ID.
3. Route it through the typed frontend presentation adapter.
4. Connect reference-policy observation and valuation without future RNG or hidden
   information.
5. Add or extend zero-visible telemetry.
6. Register a deterministic behavioral fixture proving use, avoidance, resolution,
   fallback, or lifecycle behavior as appropriate.
7. Run `npm run test:parity` and the complete validation suite.

A visual-only label or layout does not belong in this manifest. A mechanical fact
that changes player understanding or policy choice does.

## PR #57 reconciliation

After this Step 2 PR merges, draft PR #57 must rebase onto main and consume:

- `CONTENT_MANIFEST` and `FEATURE_PARITY` for the classified presentation scope;
- `presentEventEffect`, `presentTableEffect`, `presentLawEffect`,
  `presentDirectiveEffect`, and `presentBuildingEffect` for effect rows;
- `presentActiveEffect` for persistent status;
- the effective-content and `ActionStatus.cost` APIs in
  `docs/reference/effective-values.md`.

PR #57 must not introduce a UI-only effect or content registry. Its shared
Tooltip/Popover/MechanicsDetails work owns interaction and accessibility, while
these manifests remain the authoritative classification seam.
