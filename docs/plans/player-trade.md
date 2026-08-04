---
status: blocked
phase: "4"
updated: 2026-08-03
---

# Player Trade — feature plan

## Outcome

Players can trade resources and claimed luxuries with each other through a live,
Catan-style negotiation, so scarcity and monopoly goods become the basis for deals rather
than only bank exchanges.

## Non-goals

- The bank exchange (already shipped) — this is the player-to-player layer inside the bank
  corridor.
- Trading influence or happiness (standing rule: never tradable).
- AI that negotiates well — bots have no opponent model today (see the AI parity report).
- The full production multiplayer runtime. Phase 3.6 supplies the network-shaped command,
  actor, projection, identity, and replay contracts; the server/lobby/reconnect work begins
  after the v1 mechanics freeze.

## Settled inputs

- **Shape (Q33, resolved 2026-07-27):** a **Catan-style broadcast negotiation**, not a
  fire-and-forget offer. The initiating player broadcasts a proposed trade to the table;
  each recipient can **accept, reject, or modify (counter)**; when both parties agree, the
  trade executes. This overrides the earlier "no counter-offer, no negotiation UI"
  recommendation — the negotiation UI is the important part.
- **What is tradable:** materials (wood/stone/food/gold) and **claimed luxuries** (unique
  monopoly objects — the natural trade currency). Not influence, not happiness.
- Bank rates bracket the price corridor; player trade is the scarcity market inside it.
- **V1 scope (owner, 2026-08-03):** full Catan-style player trade is required before
  the v1 mechanics freeze; it is not a v2 option.
- Trade is implemented after luxury goods and before National Ideas. Full multiplayer
  follows the v1 mechanics freeze, so local/hotseat trade must nevertheless use the
  Phase 3.6 canonical command and player-projection boundaries from its first slice.

## Open owner questions

None recorded yet. New questions go to [`questions.md`](../questions.md).

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                      |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | A pending-offer session on `HegemonyState`, propose/modify/accept/reject moves, luxury-claim transfer, and tests       |
| Frontend         | Yes      | The broadcast/negotiation UI: compose an offer, see incoming offers, accept/reject/**modify**, and a resolved history  |
| Simulation & AI  | Yes      | Legal execution + telemetry. ⚠ Bots cannot negotiate well (no opponent model); validate trade with **humans**, not sim |

Assembly and trade provide two real multi-seat workflow consumers. Extract only the proven
shared primitives: actor eligibility, public/private projection, completion/cancellation,
deadline/disconnect policy hooks, and deterministic history. Do not clone the Assembly's
state machine, and do not force Assembly and negotiation rules into one generic workflow.

Tradeable resources and luxury assets move through one atomic, conservation-checked
`transferAssets` operation used by acceptance and every future ownership change. A command
refers to stable asset/offer ids and proposed amounts; the engine rechecks current ownership,
availability, and affordability at acceptance. No UI or client-provided cost/ownership fact is
trusted.

## PR slices

1. **Broadcast and reject, vertically:** canonical propose/reject commands, authoritative
   workflow and actor state, public/private player projections, composer/incoming UI,
   deterministic bot resolution, telemetry, history, and behavioral fixtures.
2. **Counter, vertically:** stable offer lineage, modify/counter commands, UI comparison,
   deterministic policy rule, telemetry, expiry/cancellation, and replay proof.
3. **Accept and settle, vertically:** atomic resource/luxury transfer, stale-offer and
   insufficient-assets rejection, resolved history, UI confirmation, telemetry, invariants,
   and clearly-use/clearly-reject scenarios.
4. **Human validation and closeout:** full four-seat negotiations, accessibility/browser
   flow, targeted usage telemetry, and the freeze manifest entries.

No slice merges an engine-only session that the browser or simulator cannot exercise.

## Acceptance and validation

- A full negotiation (broadcast → modify → agree → execute) works and transfers the right
  resources/luxuries; a rejected or unmodified offer changes nothing.
- Acceptance is atomic: if either side's assets changed, the stale offer fails without
  partial transfer. Each unique luxury has exactly one owner before and after settlement.
- Only workflow-eligible actors see and submit the appropriate commands; projections reveal
  no private counter/held data beyond the approved negotiation design.
- Recorded negotiations replay through the same transition and pinned match definition.
- Human playtest confirms the loop feels like a real deal, not a menu.

## Retirement

After validation, fold the settled rules into `docs/reference/v0.1-rules-spec.md` and move
this plan to `docs/archive/plans/` with its shipping PR and evidence.
