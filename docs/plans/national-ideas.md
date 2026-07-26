---
status: proposed
phase: "5"
updated: 2026-07-26
---

# National Ideas — feature plan (pre-filled from `Hegemony.pdf`)

## Outcome

The four seats play **asymmetrically**. Each player picks two permanent modifiers
("National Ideas") after placement, so no two games — and no two seats — open the same
way. Ideas are a small, legible identity layer built from existing rule seams, never a
runaway advantage.

## Non-goals

- The pre-game setup/mode screen (that is [Q35](../questions.md#q35), a separate slice).
- Networking or 2–3-player scaling.
- New content systems — every Idea reuses an existing engine seam wherever possible.

## Settled inputs (from `Hegemony.pdf` + prior decisions)

- **Draft:** each player picks **two** National Ideas, drafted **after** capital/colony
  placement (PDF: "players draft thrice… finally to pick their 2 National Ideas").
- **Definition:** "unique modifiers that affect your nation for the entire duration of the
  game." Permanent, public.
- **Later acquisition (PDF):** additional Ideas can arrive via **Resolutions**, **Event
  Cards**, or the **Library** building (*"Every 2 Libraries grant one National Idea"*).
  Library is not yet built (parked with the civic roster); leave the hook open.
- **Draft shape recommendation** — [Q34](../questions.md#q34): eight public ruleset-patch
  ideas, one per player, **snake-drafted in reverse placement order** (last placer picks
  first), validated so none is an automatic pick.

## The PDF roster (source content)

The PDF lists twelve candidate Ideas. Verbatim, with today's-engine reconciliation:

| # | PDF National Idea | Reuses which seam today | Notes |
| - | ----------------- | ----------------------- | ----- |
| 1 | **+2 Food income for every 5 Pops** | income pipeline (`economy/income.ts`) | scales with pop count; watch late-game food inflation |
| 2 | **Pops consume Gold instead of Food** | income upkeep | **novel** — inverts the food-upkeep model for that seat; largest engine change, biggest identity swing |
| 3 | **+1 Building slot in all Cities** | `settlementCapacity` / slot count | additive slot bonus |
| 4 | **+2 Building slots in the Capital** | capital slot bonus | ⚠ the Capital **already** carries +2 slots (`data.ts`); this Idea would stack to +4 or needs re-pricing |
| 5 | **Gain +2 Influence every Season** | seasonal income | flat influence flow; interacts with the Assembly ratchet |
| 6 | **Maximum Colonies +1** | `ruleset.placement` colony cap | expansion identity |
| 7 | **Start with one additional Pop** | setup placement counts | small tempo edge |
| 8 | **Always gain an extra Pop when founding a City** | `upgradeColonyToCity` | rewards the (currently dead) colony→city path — could revive it |
| 9 | **Each Colony begins with 2 Slaves** | `foundColony` | slave-economy opener |
| 10 | **Start with a Luxury Goods' Trader in your Capital** | luxury claims | ⚠ **the Trader is retired** (luxuries are coastal/Port-only, 2026-07-26) — reframe as "start with one claimed luxury" or "a free Port"; blocked on the luxury slice |
| 11 | **Start the game with 20 Gold** | starting resources | flat economic head start |
| 12 | **One free Veto of any Resolution, then discard this Idea** | Assembly veto (`assembly/`) | one-shot; the only *consumable* Idea — models a discard-after-use hook |

**Reconciliation summary:** most Ideas (1, 3, 5, 6, 7, 8, 9, 11) are **pure ruleset
patches** on seams that already exist — cheap and data-driven. Three need design care:
**#2** (novel gold-upkeep inversion), **#4** (double-counts the Capital's existing +2
slots), and **#10** (depends on the retired Trader → luxury slice). **#12** is the only
consumable Idea and defines the "discard-after-use" mechanic the acquisition hook (Library
/ Resolutions / Events) also needs.

## Open owner questions

- [Q34](../questions.md#q34--what-is-the-national-ideas-draft) — the draft shape, catalog,
  and which of the twelve above ship in v1 (or whether the roster is re-authored). This
  plan stays `proposed` until Q34 is answered.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                     |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | A per-seat modifier channel on `PlayerState`/`Ruleset`, the draft sub-phase after placement, and behavioral tests    |
| Frontend         | Yes      | The draft picker after setup, a persistent "your Ideas" surface in the dossier, and Codex entries rendered from data |
| Simulation & AI  | Yes      | The bot drafts an Idea (no auto-pick), values its own Idea in evaluation, and telemetry records picks and win-rate   |

The engine has **no per-seat modifier channel today** — `Ruleset` is patched per *mode*,
not per *player*. That channel is the core new seam; every Idea then threads through the
income/cost/placement pipelines already in place.

## PR slices

1. **The modifier channel + draft sub-phase** — `PlayerState` per-seat idea list, the
   post-placement draft phase, enumeration, and the picker UI. Ship with ~4 pure-patch
   Ideas (e.g. 3, 5, 6, 11) to prove the channel end to end across all three axes.
2. **The rest of the pure-patch roster** (1, 7, 8, 9) — data only, once the channel exists.
3. **The design-heavy Ideas** — #2 (gold upkeep), #4 (Capital slots re-price), #12 (the
   consumable/discard hook, shared with later acquisition).
4. **The acquisition hooks** — Library / Resolution / Event routes to gain an Idea mid-game
   (depends on the Library building and the Assembly deck).

## Acceptance and validation

- Draft evenness: a simulation batch shows **no Idea is an automatic pick** and seat
  win-rates stay roughly flat across drafted openings.
- Every Idea's effect is authoritative (reuses the engine seam, not a re-implemented
  formula), visible in the dossier + Codex, and valued by the reference `master` policy.
- Human playtest confirms the identities *feel* distinct without one being oppressive.

## Retirement

After validation, fold the settled Ideas catalog into
`docs/reference/v0.1-rules-spec.md` + the balance ledger and move this plan to
`docs/archive/plans/` with its shipping PR and evidence.
