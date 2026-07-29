# Frontend presentation contract

Status: living reference for the implemented frontend.

Last updated: 2026-07-29.

This contract defines how the frontend explains gameplay mechanics without creating a
second rules engine. Engine selectors, action statuses, and content manifests are the
authority; presentation components project their output for sighted, keyboard, touch,
and assistive-technology users.

## Authority and language

- An action surface shows the **effective** cost returned for that concrete action and
  target. A rulebook, Codex, or other reference surface may show a base cost only when
  it labels that value as base.
- Availability and blocked explanations come from the same status or legal-move
  predicate that gates execution when one exists. A temporarily unstatused action must
  mirror the move's exact guard and be listed in the parked reconciliation checklist;
  it must not invent a separate rule.
- Structured effects are projected from typed effect data. Authored prose may provide
  political framing or context, but it must not be the only representation of a cost,
  duration, source, blocked reason, or mechanical effect.
- Presentation code never mutates game state. It may call a controller move only from
  an enabled control.

## Shared primitives

### `Tooltip`

Use a tooltip for an explanation attached to one existing control or compact,
non-interactive board object. Tooltips are portal-rendered, viewport-anchored, and
contain no links, buttons, or other interactive descendants.

Controls remain real buttons. An unavailable action uses `aria-disabled="true"`, stays
keyboard-focusable, and guards its click handler in code. The tooltip is connected with
`aria-describedby` and includes the blocked reason. A non-control board object may use
the focusable tooltip trigger only with an accessible label that identifies the object.

Keyboard focus and pointer hover show the explanation; blur, outside pointer activity,
or Escape dismisses it. On touch, the first tap explains and suppresses its associated
click, while the second tap activates. Pointer cancellation clears suppression. This
touch contract requires owner verification on real hardware; DOM or browser touch
emulation is useful regression coverage but is not equivalent to a device test.

### `Popover`

Use a popover when the surface contains choices or any other interactive content. It
is a labelled, non-modal dialog rendered in a portal. Opening moves focus into the
dialog. Escape or an explicit cancel dismisses it, and unmounting restores focus to the
connected opener when that opener still exists. Positioning must use the shared
anchoring hook rather than component-specific viewport math.

Choice collections use ordinary labelled lists of native buttons and normal Tab
navigation. Do not apply ARIA menu roles unless the complete managed-focus menu
keyboard pattern is implemented.

### `MechanicsDetails`

Use the standard slots in this order where present: heading, structured effects,
effective cost, short explanation, source, duration, and blocked reason. Resource
amounts use `ResourceChips`, whose accessible text includes both amount and resource.
Tooltip content is descriptive only; actions and Codex navigation live outside it.

## Assembly presentation

Assembly action buttons use the same tooltip semantics as command verbs and map
actions. Repeal and full-board replacement choices use the shared popover. Voice,
politician power, proposed cards, standing stelae, and Directive monuments are
keyboard-inspectable board objects with accessible labels.

`presentResolutionEffects` currently projects every `LawEffect` and `DirectiveEffect`
from `RESOLUTION_CARDS` into `MechanicsDetails`. Law cards identify their trade-off and
remain in force until repealed if passed. Directives identify their one-time resolution;
their monument is permanent board history, not a persistent rule. These explanations
do not change Assembly flow, resolution, balance, or AI behavior.

## Required regression coverage

Focused tests must cover keyboard opening and Escape dismissal, `aria-describedby`,
focusable `aria-disabled` controls with guarded activation, popover focus restoration,
first-touch explanation and second-touch activation, pointer cancellation, and
viewport listener cleanup. Manifest-backed presentation tests must fail when a typed
effect has no non-empty semantic projection. Browser smoke tests supplement these
tests; real-device touch remains an owner check.

## Parked integration checklist for PR #57

PR #57 is intentionally a draft until Phase 3.5 Steps 1 and 2 land. Do not replace
their work on this branch. After both merge, rebase and reconcile every seam below.

### Step 1: authoritative effective cost and content

1. Reconcile `ActionStatus.cost` in `src/game/core/results.ts` and all status producers:
   `getFoundColonyStatus`, `getUpgradeColonyToCityStatus`, `getBuildBuildingStatus`, and
   `getGrowPopStatus` in `src/game/status.ts`; `getPromotePopStatus` and
   `getDemotePopStatus` in `src/game/civic.ts`; and the status selectors in
   `src/game/bank.ts`, `src/game/ventures.ts`, `src/game/riot.ts`, and
   `src/game/settlement.ts`.
2. Confirm the final cost pipeline through `getAdjustedActionCost` and
   `getDiscountedGrowPopCost` in `src/game/economy/cost.ts` and
   `applyLawActionCost` in `src/game/assembly/laws.ts`. Execution and presentation must
   consume the same returned cost.
3. Reconcile every PR #57 action-cost consumer: `CommandVerb.tsx` and `verbs.tsx`;
   `FoundColonyPopover.tsx`; `BuildPopover.tsx`; `GrowPopPopover.tsx`;
   `LadderPopover.tsx`; `BuildingsTab.tsx`; and the settlement explanation assembled
   in `src/components/board/helpers.ts`. Remove fallbacks to base data from action
   surfaces where the authoritative API guarantees an effective value.
4. Reconcile the Assembly costs introduced here: `nextDrawCost` in
   `AssemblyColonnade.tsx`, direct `ruleset.assembly.repealCost` and `briberyCost` in
   `AssemblyFoot.tsx`, and direct `ruleset.assembly.vetoCost` in `AssemblyBema.tsx`.
   If Step 1 provides Assembly action statuses, use their cost and blocked reasons;
   otherwise document why these existing execution-owned values remain authoritative.
5. Audit reference-only costs in `ledger/rulebook.tsx` and other Codex/rulebook text.
   Keep them only as explicitly labelled base costs. Do not convert reference examples
   into action previews.

### Step 2: manifests and effect classifications

1. Reconcile the current content sources—`PLAYER_EVENT_CARDS` and
   `SEASONAL_EVENT_CARDS` in `src/game/data.ts`, `RIOT_TABLE`, `EXPEDITION_TABLES`, and
   `OMEN_TABLE`, plus `RESOLUTION_CARDS` in `src/game/assembly/deck.ts`—with Step 2's
   exhaustive content manifests. UI, AI, telemetry, and fixtures must resolve the same
   entries and identifiers.
2. Reconcile `presentEventEffects`, `presentTableEffect`, and
   `presentResolutionEffects` in `src/ui/effects.ts` with the manifest's canonical
   presentation/classification metadata. Remove parallel switches if Step 2 supplies a
   single exhaustive registry; otherwise add compile-time exhaustiveness tests against
   that registry.
3. Reconcile `ACTIVE_EFFECT_KINDS`, `EVENT_EFFECT_ACTIVE_EFFECT_HANDLING`, and active
   effect descriptors in `src/game/activeEffects.ts`. `MechanicsDetails` source,
   duration, scope, and expiry output must come from the canonical classifications.
4. Extend the parity loops in `src/parity/withinAxisParity.test.ts` and
   `src/parity/activeEffectParity.test.ts` so every Step 2 Event, Table, Law, and
   Directive manifest entry has engine handling, frontend presentation, AI handling,
   telemetry classification, and a fixture path where required.
5. Re-run all validation after the rebase and perform keyboard plus browser
   touch-emulation smoke tests. The owner must separately verify first-tap explanation,
   second-tap activation, cancellation, focus behavior, and overlay placement on real
   touch devices.
