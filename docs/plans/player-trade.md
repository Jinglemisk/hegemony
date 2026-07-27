---
status: proposed
phase: "4"
updated: 2026-07-27
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

## Settled inputs

- **Shape (Q33, resolved 2026-07-27):** a **Catan-style broadcast negotiation**, not a
  fire-and-forget offer. The initiating player broadcasts a proposed trade to the table;
  each recipient can **accept, reject, or modify (counter)**; when both parties agree, the
  trade executes. This overrides the earlier "no counter-offer, no negotiation UI"
  recommendation — the negotiation UI is the important part.
- **What is tradable:** materials (wood/stone/food/gold) and **claimed luxuries** (unique
  monopoly objects — the natural trade currency). Not influence, not happiness.
- Bank rates bracket the price corridor; player trade is the scarcity market inside it.

## Open owner questions

None recorded yet. New questions go to [`questions.md`](../questions.md).

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                       |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | A pending-offer session on `HegemonyState`, propose/modify/accept/reject moves, luxury-claim transfer, and tests       |
| Frontend         | Yes      | The broadcast/negotiation UI: compose an offer, see incoming offers, accept/reject/**modify**, and a resolved history  |
| Simulation & AI  | Yes      | Legal execution + telemetry. ⚠ Bots cannot negotiate well (no opponent model); validate trade with **humans**, not sim |

The async multi-seat session can reuse the Assembly's pattern (a state gate that suspends
the turn machine while multiple seats act) rather than inventing a new one.

## PR slices

1. **Engine** — the pending-offer session, the move surface (propose / modify / accept /
   reject), luxury-claim transfer, and behavioral tests.
2. **Frontend** — the negotiation UI (broadcast, incoming-offer cards, accept/reject/modify).
3. **Sim/telemetry** — legal execution + counts; explicitly *not* a smart trade bot.

## Acceptance and validation

- A full negotiation (broadcast → modify → agree → execute) works and transfers the right
  resources/luxuries; a rejected or unmodified offer changes nothing.
- Human playtest confirms the loop feels like a real deal, not a menu.

## Retirement

After validation, fold the settled rules into `docs/reference/v0.1-rules-spec.md` and move
this plan to `docs/archive/plans/` with its shipping PR and evidence.
