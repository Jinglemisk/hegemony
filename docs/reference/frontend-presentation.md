# Frontend presentation contract

Status: living reference for the implemented frontend.

Last updated: 2026-07-31.

This contract defines how the frontend explains gameplay mechanics without creating a
second rules engine. Engine selectors, action statuses, and content manifests are the
authority; presentation components project their output for sighted, keyboard, touch,
and assistive-technology users.

## Authority and language

- An action surface shows the **effective** cost returned for that concrete action and
  target. A rulebook, Codex, or other reference surface may show a base cost only when
  it labels that value as base.
- Availability and blocked explanations come from the same status or legal-move
  predicate that gates execution when one exists. An action without a dedicated status
  must mirror the move's exact guard; it must not invent a separate rule.
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

The Assembly maps each discriminated card effect through the canonical
`presentLawEffect` or `presentDirectiveEffect` adapter in `src/ui/effects.ts` and sends
those rows to `MechanicsDetails`. Law cards identify their trade-off and remain in
force until repealed if passed. Directives identify their one-time resolution; their
monument is permanent board history, not a persistent rule. These explanations do not
change Assembly flow, resolution, balance, or AI behavior.

## Required regression coverage

Focused tests must cover keyboard opening and Escape dismissal, `aria-describedby`,
focusable `aria-disabled` controls with guarded activation, popover focus restoration,
first-touch explanation and second-touch activation, pointer cancellation, and
viewport listener cleanup. Manifest-backed presentation tests must fail when a typed
effect has no non-empty semantic projection. Browser smoke tests supplement these
tests; real-device touch remains an owner check.

## Step 1–3 integration status

Phase 3.5 Steps 1–3 merged in PRs #58, #59, and #57. Step 3 was rebased over the
effective-value and parity-manifest contracts and reconciled with both before merge.

The Step 1 reconciliation preserves `getBuildings()`, `getBuilding()`,
`getTerrainDeck()`, and `getBuildBuildingOptions()`. Build choices pair each effective
definition with its target-specific status, show `status.cost` as the effective action
cost, and label roster/reference prices as base costs. Command summaries retain the
acting `playerID` and use honest `varies`, `options`, or `stakes` labels until the
engine can quote a concrete target or payment. Assembly draw, repeal, bribe, and veto
explanations continue to read the same session/ruleset values used by Assembly
execution and legal moves; Step 1 did not add separate Assembly action-status APIs.

The Step 2 reconciliation consumes `CONTENT_MANIFEST`, `FEATURE_PARITY`, the exhaustive
effect registries in `src/parity/featureParity.ts`, and active-effect descriptors in
`src/game/activeEffects.ts`. Event, Table, Law, Directive, Building, and active-effect
rows use the canonical presenters exported by `src/ui/effects.ts`. The former
resolution and building presentation switches were removed; Assembly, building
surfaces, and active-effect status now project the canonical typed results through
`MechanicsDetails`. Exhaustive presenter and manifest coverage remains in
`src/parity/featureParity.test.ts` rather than a parallel Assembly-only registry loop.

The development-only `low-number-core-v1` preset uses those same presenters for every
effective building, event, and table value. Numeric event prose is rewritten from the
transformed typed effects, so narrative copy cannot quote the authored magnitude beside
a different effective row. Real-browser verification covers preset on/off, same-seed
reset, manual-override precedence, Reset, terrain totals, action costs, and a complete
event presentation.

## Owner real-device touch checklist

Browser/DOM touch emulation is regression evidence, not a substitute for hardware.
Before Phase 3.5 validation closes, the owner must test the following on iOS Safari
and Android Chrome where those devices are available:

1. First-tap an enabled command, Build candidate, Assembly action, card, Voice, and
   stela/monument: the explanation opens and the action does not run.
2. Tap the same enabled control a second time: the action runs exactly once.
3. Start a touch and cancel it by scrolling or moving away: no action runs, and the
   next deliberate tap still follows the first-tap explanation contract.
4. Inspect disabled controls: the explanation and blocked reason are reachable, while
   repeated taps never activate the action.
5. Open and dismiss map and Assembly popovers with Cancel and, where a hardware
   keyboard is available, Escape: focus returns to the opener and the user's board
   position is retained.
6. Check overlays near every viewport edge, then scroll and rotate the device: content
   remains visible, anchored, dismissible, and free from unintended page activation.
7. With VoiceOver or TalkBack enabled, confirm controls announce their name, disabled
   state where applicable, explanation, effective cost, effect rows, and blocked reason
   without duplicate or unlabeled interactive elements.
