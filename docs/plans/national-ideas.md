---
status: blocked
phase: "5"
updated: 2026-09-06
---

# National Ideas — feature plan (pre-filled from `Hegemony.pdf`)

## Outcome

The four seats play **asymmetrically**. Each player picks two permanent modifiers
("National Ideas") after placement, so no two games — and no two seats — open the same
way. Ideas are a small, legible identity layer built from existing rule seams, never a
runaway advantage.

## Non-goals

- The pre-game setup/mode screen and multiplayer — deferred until the game is balanced
  (Q35, resolved 2026-07-27; out of scope for now).
- Networking or 2–3-player scaling.
- A generic scripting language. Ideas use a closed typed effect union and reuse existing
  authoritative engine seams wherever possible.

## Settled inputs (from `Hegemony.pdf` + prior decisions)

- **Shape (owner, 2026-09-06, supersedes Q34):** Ideas are **not mutually exclusive**. Each
  player picks **one** Idea at game start, by simultaneous secret pick, with **immediate
  effect**; the **second** is **bought later in the game with influence** as a turn action, at
  a flat price (placeholder 6). Two Ideas per player in total. No draft phase, no pick order.
- **Definition:** "unique modifiers that affect your nation for the entire duration of the
  game." Permanent, public.
- **Later acquisition (PDF):** additional Ideas can arrive via **Resolutions**, **Event
  Cards**, or the **Library** building (_"Every 2 Libraries grant one National Idea"_).
  Library is not yet built (parked with the civic roster); leave the hook open.
- **Catalog:** the twelve PDF ideas below, minus Idea 10 (see Q53 below). Because Ideas are
  non-exclusive, the balance test is a **pick-rate spread**: measured with the personality
  policies of the 2026-09-05 direction paper, no Idea may be picked by every build.
- **V1 scope (owner, 2026-08-03):** all twelve Ideas and their intended specific effects
  are required before the v1 mechanics freeze. Full multiplayer follows the freeze.
- Ideas build on Phase 3.6's per-match definition, canonical commands, stable ids,
  player-safe projections, replay versions, and invariants. They are never browser-only
  modifiers or process-global tuning patches.

## The PDF roster (source content)

The PDF lists twelve candidate Ideas. Verbatim, with today's-engine reconciliation:

| #   | PDF National Idea                                           | Reuses which seam today                      | Notes                                                                                                                                           |
| --- | ----------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **+2 Food income for every 5 Pops**                         | income pipeline (`economy/income.ts`)        | scales with pop count; watch late-game food inflation                                                                                           |
| 2   | **Pops consume Gold instead of Food**                       | income upkeep                                | **novel** — inverts the food-upkeep model for that seat; largest engine change, biggest identity swing                                          |
| 3   | **+1 Building slot in all Cities**                          | `settlementCapacity` / slot count            | additive slot bonus                                                                                                                             |
| 4   | **+2 Building slots in the Capital**                        | capital slot bonus                           | ⚠ the Capital **already** carries +2 slots (`data.ts`); this Idea would stack to +4 or needs re-pricing                                         |
| 5   | **Gain +2 Influence every Season**                          | seasonal income                              | flat influence flow; interacts with the Assembly ratchet                                                                                        |
| 6   | **Maximum Colonies +1**                                     | **No matching seam yet**                     | the current placement cap is per tile, not per player; define a per-player colony supply/cap first (answered 2026-09-06: one more colony piece) |
| 7   | **Start with one additional Pop**                           | Post-placement grant or changed draft timing | the draft currently occurs after placement, so “start with” needs an explicit resolution (answered 2026-09-06: granted right after the pick)    |
| 8   | **Always gain an extra Pop when founding a City**           | `upgradeColonyToCity`                        | rewards the (currently dead) colony→city path — could revive it                                                                                 |
| 9   | **Each Colony begins with 2 Slaves**                        | `foundColony`                                | slave-economy opener                                                                                                                            |
| 10  | **Start with a Luxury Goods' Trader in your Capital**       | luxury assets/Port                           | **dropped** (owner, 2026-09-06): luxuries are coastal, Port-claimed, and the Port is never free                                                 |
| 11  | **Start the game with 20 Gold**                             | starting resources                           | flat economic head start                                                                                                                        |
| 12  | **One free Veto of any Resolution, then discard this Idea** | Assembly veto (`assembly/`)                  | one-shot; the only _consumable_ Idea — models a discard-after-use hook                                                                          |

**Reconciliation summary:** none of these should be implemented as an ad hoc per-seat
`Ruleset` clone. Author a closed `NationalIdeaEffect` union and make the affected income,
capacity, placement, founding, setup, luxury, and Assembly selectors interpret those typed
effects. Ideas 1, 3, 5, 8, 9, and 11 reuse clear seams. Ideas **#2** (gold-upkeep
inversion), **#4** (Capital slot stacking, answered 2026-09-06: +1 slot),
**#6**, **#7**, and **#10** need explicit rules reconciliation. **#12** is the only
consumable Idea and defines the discard-after-use lifecycle the later acquisition hook
(Library / Resolutions / Events) also needs.

## Owner answers folded (2026-09-06)

- **Q51 (extra starting pop, Idea 7):** grant one player-chosen pop to a legal owned settlement
  immediately after the draft pick, as a canonical command.
- **Q52 (Maximum Colonies +1, Idea 6):** the 2026-09-05 direction paper introduces a Catan-style
  piece supply (four colony pieces, three city pieces per player); the Idea adds one colony piece.
- **Q54 (capital slots, Idea 4):** the Idea grants +1 capital building slot, not +2.
- **Q53 (Idea 10, the retired Trader):** luxuries stay coastal only, a Port is required to
  claim one, and the Port is never free. Idea 10 is **dropped**; any replacement is authored in
  the direction paper's grammar.
- **Q66 (non-exclusive Ideas):** accepted, see the shape above. One picked at game start with
  immediate effect, one bought later with influence.

The feature remains blocked on Phase 4; none of the remaining decisions may be silently
defaulted during implementation.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                     |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | A per-seat modifier channel on `PlayerState`/`Ruleset`, the setup pick and the influence-priced purchase action, and behavioral tests |
| Frontend         | Yes      | The setup pick, the in-game purchase, a persistent "your Ideas" surface in the dossier, and Codex entries rendered from data          |
| Simulation & AI  | Yes      | The bot picks and later buys an Idea matching its build, values its own Ideas in evaluation, and telemetry records picks and win-rate |

The engine has **no per-seat modifier channel today** — `Ruleset` is patched per _mode_,
not per _player_. Add an explicit public `nationalIdeas` ownership list plus typed effect
definitions in the pinned match content. Authoritative selectors interpret effects; they do
not spread `if (player has idea)` branches across unrelated mutators. Canonical presentation,
active-effect descriptors, fair AI observation, telemetry, and the Compendium all consume
the same definitions.

## PR slices

1. **Typed ownership, setup pick, and purchase, vertically:** `NationalIdeaDefinition` and closed effect
   union, stable ownership ids, the simultaneous setup pick and the influence-priced purchase
   command, player projections, picker, deterministic pick policy, telemetry, replay, and four low-risk Ideas proving the
   selectors end to end.
2. **Economy and settlement effects, vertically:** group Ideas by the authoritative seam
   they modify (income/upkeep, capacity, founding/setup), with semantic presentation,
   clearly-use/avoid scenarios, and invariant coverage in each PR.
3. **Luxury and Assembly effects, vertically:** Port-compatible Idea #10 and consumable
   Veto #12 through the shared asset/effect lifecycle, UI, policy, telemetry, and expiry.
4. **Catalog closeout:** all twelve manifest entries, Compendium/reference generation,
   targeted matched pick-rate campaign, human identity playtest, and v1-freeze evidence.
5. **Later acquisition hooks:** Library / Resolution / Event routes are part of v1 only
   when named in the final Resolution/Idea catalog; no vague unused hook is shipped merely
   for hypothetical expansion content.

## Acceptance and validation

- Pick-rate spread: targeted matched simulations with the personality policies plus
  deterministic clearly-pick/clearly-avoid scenarios show **no Idea is picked by every
  build**; policy limitations accompany the result.
- Every Idea's effect is authoritative (reuses the engine seam, not a re-implemented
  formula), visible in the dossier + Codex, and valued by the reference `master` policy.
- Every persistent/consumable lifecycle is derived from typed ownership/effects and survives
  save/replay; no effect exists only in prose, the UI, or policy code.
- Human playtest confirms the identities _feel_ distinct without one being oppressive.

## Retirement

After validation, fold the settled Ideas catalog into
`docs/reference/v0.1-rules-spec.md` + the balance ledger and move this plan to
`docs/archive/plans/` with its shipping PR and evidence.
