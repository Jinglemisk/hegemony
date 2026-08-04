---
status: blocked
phase: "5.5"
updated: 2026-08-03
---

# V1 mechanics and content freeze

## Outcome

Declare a testable v1 rules boundary after luxury goods, player trade, National Ideas, and
the intended Resolution/Idea effect catalog are complete. From this gate onward, work moves
to balance validation, multiplayer, release hardening, and defect correction—not additional
core systems.

## Non-goals

- Freezing balance numbers before the final matched campaigns and human playtests.
- Preventing bug fixes, accessibility improvements, tuning, or compatibility migrations.
- Adding military, more player counts, learned AI, chat, spectators, or expansion content.

## Settled inputs

- Luxury goods, Catan-style player trade, and all twelve drafted National Ideas are in v1.
- Full multiplayer begins after this mechanics freeze, on the command/projection/version
  foundations established in Phase 3.6.
- V1 includes the specifically selected Resolution and National Idea effects needed for the
  intended political and asymmetric game; placeholders and prose-only effects do not count.
- Content is represented by closed typed effect unions, authoritative selectors, semantic
  presentation, fair policy observation/value, telemetry, and behavioral fixtures.

## Open owner questions

None. Content-specific design choices discovered during implementation must be recorded in
[`docs/questions.md`](../questions.md) rather than silently defaulted.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Engine / backend | Yes      | Final typed effect catalog, complete authoritative behavior, stable content/version manifest, replay and invariants                        |
| Frontend         | Yes      | Every effect visible through canonical presentation, blocked reasons, history, Compendium, accessibility, and full-game browser validation |
| Simulation & AI  | Yes      | Legal execution, fair observation, meaningful valuation where decisions exist, telemetry completeness, targeted scenarios, and campaigns   |

## Freeze inventory

The closeout records one explicit inventory for:

- buildings and their effects;
- seasonal and player events;
- Riot, expedition, and omen table effects;
- Laws, Directives, prizes, targets, durations, and expiry;
- luxury definitions, ownership, transfer, suppression, and effective happiness;
- trade commands, workflow states, cancellation, and atomic settlement;
- all twelve National Ideas, including persistent and consumable effects;
- every victory metric and end condition;
- every command, required decision, active effect, frontend presenter, policy capability,
  telemetry key, and behavioral fixture.

The inventory extends the existing manifests; it does not create a prose-only duplicate.

## Freeze rules

1. No placeholder effect, unimplemented authored modifier, or UI-only interpretation remains.
2. Every consequential number comes from the pinned match definition or authoritative query.
3. Every transferable object changes owner through one conservation-checked operation.
4. Every private fact is absent from unauthorized player projections.
5. Every automatic result is visible and attributable to source, scope, duration, and expiry.
6. AI intelligence is required only where the mechanic presents a meaningful decision; legal
   execution and telemetry remain universal.
7. Broad simulation is risk-based and used for balance claims, not required by arbitrary game
   counts on every gameplay PR.
8. Any post-freeze new mechanic requires an explicit roadmap amendment and owner decision.

## PR slices

1. **Manifest closure:** enumerate the final v1 content and identify missing behavior,
   presentation, observation/value, telemetry, or fixtures.
2. **Effect closure:** implement missing Resolution and National Idea effects as vertical slices,
   grouped by shared typed mechanic rather than by content source.
3. **Full-game validation:** deterministic replay fixtures, targeted simulation campaigns,
   accessibility/browser flows, and human games covering luxury, trade, Ideas, and Assembly.
4. **Freeze record:** publish final version/hash inventory, known balance caveats, deferred-v2
   list, and the exact artifact/commit from which multiplayer begins.

## Acceptance and validation

- No v1 manifest row is placeholder, prose-only, unclassified, or missing behavioral proof.
- A full local game can exercise luxury ownership and trade, drafted Ideas, and the complete
  Assembly/Resolution catalog without bypassing the canonical command transition.
- Human playtests confirm the systems are understandable and trade is socially worthwhile.
- Targeted matched campaigns reveal no automatic National Idea pick, dominant unanswerable
  victory route, or systemic deadlock; policy limitations are stated beside every result.
- The v1 definition and representative recorded games replay deterministically.
- The roadmap and all living references agree on what v1 contains and what moved to v2.

## Retirement

After the freeze is declared, move this plan to `docs/archive/plans/` with the freeze report.
The roadmap retains the v1 definition/version and links to the immutable evidence.
