---
title: UI — open items
status: active
phase: post-v1
updated: 2026-11-25
---

# UI — open items

The one ledger for UI work that is not a feature plan. An item leaves this file when it ships
or the owner closes it. Standards for every surface are in the
[presentation contract](../reference/frontend-presentation.md#the-shell).

## Three-axis parity

| Axis             | Applies? | Proof                                                                                     |
| ---------------- | -------- | ----------------------------------------------------------------------------------------- |
| Engine / backend | N/A      | Presentation only; the riot table and its results are already engine data.                |
| Frontend         | Yes      | Driven in a real browser at 1280, 1440 and 1920, with `ui:audit` and `ui:conduct` re-run. |
| Simulation & AI  | N/A      | Nothing here is reachable from the headless sim.                                          |

## RIOT-1 — the riot screen in the current UI · in progress

On branch `feat/riot-screen`. The riot screen predates the Imperator shell. The redesign:

- The d6 table shows as six small cards, one per row.
- Riot insurance shows as toggle tiles.
- A die roll lands on the row.
- The result is a card in the shared card format, with one line per loss: pops, burned
  buildings, resources, cards given up. Today the result shows one headline loss and lists the
  rest in a caption.
