# Phase 3-C — The influence-aware AI

*Plan. The last leg of Phase 3: teach the sim bots to play the Assembly. Written
2026-07-21, to be built autonomously. Companion to
[assembly-politicians.md](assembly-politicians.md) (the feature this makes the bots
understand) and [../simulation.md](../simulation.md) (the harness that verifies it).*

---

## 0. Why this exists — and what it unblocks

The Assembly shipped (PR #38) and the debt sweep cleared the runway (PR #39). The
roadmap's next gate is a **tuning pass** on the Assembly dials (`Ruleset.assembly`:
draw 3, bribe 10, veto 5, coup 5, …). But that pass is **blind today**: the sim's own
telemetry reads `influence sunk ~0.8/game, assembly verbs ~0`. The bots reach the
agora every game and **pass every time**, so a batch tells us nothing about whether
`drawCost 3` or `coupThreshold 5` plays right — no bot ever draws, bribes, or nears a
coup.

**3-C is the key that unlocks sim-based tuning.** When the bot actually contests the
agora, the telemetry becomes a measuring instrument and the dial pass becomes
data-driven. (The *feel* half — is the politics tense, is a Law worth its cost — stays
a human playtest. 3-C makes the *numeric* half measurable.)

---

## 1. What the bots can and can't see today (the foresight question, answered)

Read `src/sim/policies.ts` before touching anything. The current picture:

**Search.** Two shapes, sharing one scorer each:
- `greedy` / `smart` → `onePlyLookahead`: clone-and-score every single legal move, take
  the best positive score-delta, repeat move-by-move within the turn, else `endTurn`.
  Greedy hill-climbing, one action at a time. No sequence planning.
- `beam` → `beamPlan`: a **within-turn** beam search (width 3, depth 4) over RNG-free
  action sequences; commits the first action of the best 4-move plan. Sees multi-step
  *within one turn* (build-then-promote, save-then-upgrade, bank chains).

**Foresight — yes, but of one specific kind.** The scorer does **not** score current
resources; it projects income **`INCOME_HORIZON = 6` turns forward** through
`calculateIncome` (the engine's real formula) and scores the *projected* state. So:
- *"Grow this pop → it pays for itself over a couple turns"* — **YES, visible.** The
  clone has the new pop; `calculateIncome` on the clone reflects its income/upkeep;
  ×6 captures the net payoff. This is exactly what the horizon is for (see the comment
  at `policies.ts:168`).
- *"Build this granary → +2 food/turn eventually beats its cost"* — **YES**, same
  mechanism.
- *"Found this colony **here** so I can chain-expand to that resource tile two turns
  down the line"* — **NO.** The bot values a colony for its immediate count-term (+3)
  and its tile's projected income, but it does **not** reason about future *move
  availability* or board development. It projects income from the *current* board; it
  never asks "what does this position let me do next?"

So the current foresight is **income-projection foresight, ~6 turns, board-static**. It
is not multi-turn game-tree search and it has no model of positional/strategic options.

**Why the Assembly is invisible to all of this — two independent reasons:**

1. **The payoff is beyond the horizon *and* beyond the search.** Enacting a Law is a
   multi-step, multi-turn, **multi-player** process: draw (spend influence now) →
   propose → *every seat votes across the round* → enacted → reaped over many turns. A
   bot's one-ply (or depth-4) search during its proposal turn sees only "spend 3
   influence to draw → influence drops → score drops → **don't**." The enacted-Law
   payoff is several plies and *other players' votes* away — no search we can afford
   will discover it. (Note: `calculateIncome` **does** consult `G.activeLaws` via
   `getLawIncomeContributions`, so an *already-active* income Law's effect **is** in the
   6-turn projection. The gap is purely *getting there*.)

2. **Evaluation is solo, the Assembly is adversarial.** Every scorer answers only "how
   good is *my* position?" A Law hits everyone; you propose the ones that help you
   *relative to rivals* and vote down the ones that help *them*. That is a **differential**
   question — `myΔ` vs `opponentsΔ` — which nothing in the codebase computes today.

**These two gaps are the whole of 3-C.** Fix them with *explicit heuristics* (not more
search): a value for the political position, and a differential lens for Assembly
choices.

---

## 2. Design

Add one new policy — **`political`** — that is `smart` plus two capabilities. Keeping it
a distinct policy (rather than mutating `smart`) preserves a clean A/B: `smart` stays the
influence-*blind* baseline, `political` is influence-*aware*, and the diff isolates the
Assembly layer exactly as greedy-vs-smart isolates the evaluation. (`beam` stays the
pure search-depth baseline; a `political-beam` is possible later, out of scope now.)

### 2.1 Differential evaluation — "does this hurt me, or others more, or equally?"

The core new primitive. Given a candidate end-state, score the **competitive delta**:

```
politicalDelta(before, after, me) =
  (scoreSmart(after, me)  - scoreSmart(before, me))
  - max over rivals r of (scoreSmart(after, r) - scoreSmart(before, r))
```

- `> 0` → the resolution helps me *more than my strongest rival* → **want it**.
- `< 0` → it helps a rival more than me → **oppose it**.
- `≈ 0` → hurts/helps everyone equally → **neutral** (don't spend to push it either way).

Use **`max` over rivals** (guard against the current leader), not the mean — the race is
won by out-pacing the *front-runner*, not the field. This is the direct encoding of the
owner's framing: "hurts me?" = `myΔ<0`; "hurts others most?" = `rivalΔ ≪ myΔ` (relatively
good for me, support even if `myΔ` is slightly negative); "equally?" = `myΔ ≈ rivalΔ`.

`scoreSmart` is reused unchanged for each player (it already projects income through the
active-Law-aware `calculateIncome`, so a Law's income effect is priced correctly for
whoever it touches). Cost: one clone + 4 player-scores per Assembly decision — cheap,
since Assembly decisions are a handful per year.

### 2.2 A political-position term in the scorer

`scorePolitical(G, me) = scoreSmart(G, me) + POLITICS_WEIGHT * politicalStanding(G, me)`,
used only by the `political` policy for its *ordinary* (non-Assembly) turns, so the bot
also values *building toward* the agora between sessions. `politicalStanding` sums:

- **Patronage progress toward Voice** (the 6th victory card). `victoryCardsHeld` already
  rewards *holding* Voice at 120×; add a smooth ramp for *approaching* it — being sole
  author of the most stelae for a politician, and being patron of more politicians than
  rivals. Read via `politicianStandings` / `patronCount` / `authoredSteleCount` in
  `src/game/assembly/power.ts` (do **not** re-derive; it's board-derived there).
- **The Stratokles clock.** The coup crowns *his patron* outright (a win). If I am (or
  can cheaply become) his patron and I'm **behind** on the race, feeding him is a real
  comeback line → positive; if I'm **ahead**, his rising tally is a threat → negative.
  Weight my Stratokles patronage by `(coup proximity) × (am I his patron ? +1 : −1)`.
  Read `stratoklesCoupStatus` (in `power.ts`).
- **Influence-as-convertible-power.** Keep a modest linear influence term (it's already
  in `scoreSmart` at 2×), but the *reason* it's worth holding is now expressed by the
  Assembly heuristics spending it well — don't double-count.

Start `POLITICS_WEIGHT` and the sub-weights rough; they are sim-tuned in §4.

### 2.3 The Assembly-move policy

The Assembly phases have known structure, so intercept them with targeted heuristics
rather than blind search — exactly as `resolveStochasticByRule` intercepts riots and
ventures today. Add `resolveAssemblyByHeuristic(G, moves)`, called first in
`politicalPolicy.choose` whenever `G.assembly` is set.

Per phase (see `enumerateAssemblyMoves`, `legalMoves.ts:~310`; move variants at
`legalMoves.ts:111-119`):

- **Proposal, holding no card → draw or pass.** Draw iff: I can afford `drawCost`, hold
  a comfortable influence buffer, and either (a) I'm one stele from patron of some
  politician (drawing builds toward Voice), or (b) few Laws stand and I'm influence-rich
  (seed the agora). Pick the politician I'm **closest to patron on** (draws are random &
  secret, so we optimise *patronage*, the one thing a draw reliably advances — the card
  itself is a gamble). Else `assemblyPass`.
- **Proposal, holding a card → propose or discard.** Compute `politicalDelta` of enacting
  the held card (hypothetically apply it, or read its effect and score the projected
  active-Law state). **Propose** if `politicalDelta > PROPOSE_THRESHOLD` (it helps me
  more than my strongest rival); else **discard** (never gift rivals a beneficial Law).
  If proposing at the Law cap requires `replaces`, replace the standing Law with the
  **least** `politicalDelta` for me (shed the one hurting me most / helping a rival most).
- **Voting → yea / nay (+ bribe / veto).** `assemblyVote yea` iff the ballot item's
  `politicalDelta > 0`, else `nay`. **Bribe** (adds vote weight) when the item's
  `|politicalDelta|` is large, I can afford `briberyCost`, and I'm under `briberyCap`.
  **Veto** — rare, decisive — when the item strongly *hurts me relative to rivals*
  (`politicalDelta ≪ 0`), a veto remains this assembly, and I can afford `vetoCost`.
- **Standing Laws → repeal.** In the proposal phase, if a standing Law has strongly
  negative `politicalDelta` for me and I can afford `repealCost`, `assemblyProposeRepeal`
  it (competes with drawing for the turn — take whichever has the larger |delta| per
  influence spent).
- **Closing → `assemblyClose`.** Trivial; the active seat closes.

All heuristics gate on real affordability (the move's `cost` field) and the
`Ruleset.assembly` caps — so they respond to the very dials the tuning pass will move.

### 2.4 Determinism & the anti-peek invariant

Assembly moves are **RNG-free** (draws are secret-but-seeded at deck build, not rolled
mid-move — confirm none are in `STOCHASTIC_MOVE_TYPES`; `assemblyDraw` reveals a
pre-shuffled deck top, which the sim treats as known-to-engine, not a die). The
heuristics must read only committed state and break ties on enumeration order, so batch
runs stay reproducible. If any clone-and-score advances `G.rng`, the beam's existing
assertion will catch it — mirror that guard.

---

## 3. Where it plugs in — file-by-file

- **`src/sim/policies.ts`** — the bulk.
  - `scorePolitical` + `politicalStanding(G, me)` (reads `power.ts`).
  - `politicalDelta(before, after, me)` helper.
  - `resolveAssemblyByHeuristic(G, moves)` (the per-phase logic above).
  - `politicalPolicy`: `choose` = if `G.assembly` → `resolveAssemblyByHeuristic`; else
    `onePlyLookahead(G, moves, scorePolitical)`.
  - Register `"political"` in `POLICIES` and the `PolicyId` union.
- **`src/game/assembly/power.ts`** — likely reuse `politicianStandings`,
  `patronCount`/`authoredSteleCount`, `stratoklesCoupStatus` as-is. Only add a small
  read-only helper if a needed derivation isn't already exported (note: 3-C is *why* the
  §6.1 debt scan kept `getStandingEffects` et al.).
- **`src/sim/policies.test.ts`** — new deterministic tests: the political bot draws when
  flush & near-patron, proposes a self-helping card, discards a rival-helping one, votes
  by differential sign, and consumes **no** game RNG (mirror the beam anti-peek test).
- **`docs/simulation.md`** — document `--policy political`.
- **`docs/roadmap-appendix.md` / roadmap** — mark 3-C built; record the A/B result.
- **No engine rules change.** 3-C is bot intelligence only. If a genuinely missing read
  surfaces, add it to `power.ts` (engine), never recompute in the sim.

---

## 4. Verification & exit gates

Run through the headless harness (`npm run sim -- batch …`; see `../simulation.md`).

**Telemetry must move** (the Assembly line in the batch report, `sim/format.ts`):
- `influence sunk/game`: **~0.8 → a real number** (target ≳ 5), i.e. the bot spends in
  the agora.
- `laws enacted/game > 0`, `standing at end > 0`, `assembly verbs > 0` (draws, proposes,
  votes, some bribes/vetoes appear).

**The A/B — the headline result.** `political` vs `smart` at the same table (mixed-seat
batch; if the harness only runs one policy per batch, add a `--policy-a/--policy-b`
seating or compare win-rates across paired same-seed batches — check how the existing
greedy-vs-smart A/B was run first).
- **Success:** `political` win-rate > `smart` by more than run-to-run noise → the agora
  is a real strategic edge and the numbers are roughly right.
- **Null/negative result is also a finding, not a failure:** if `political` does *not*
  beat `smart`, that's the tuning pass's first datum — either the dials make the agora
  too weak/expensive (feed it to the human playtest) or a heuristic is off.

**No regression** (compare to a pre-3-C baseline batch): games still complete, race
close-rate holds (~50–55%), no crashes, determinism preserved (same seed → same result;
anti-peek assertion never trips), `npm run check` + full vitest green.

**Then — the tuning follow-on (the reason 3-C exists):** with the agora now contested,
sweep the key `Ruleset.assembly` dials via `--ruleset-patch` (draw cost, bribery
cost/cap, veto cost, coup threshold, `tiesPass`) and produce **sim-backed
recommendations** (like `docs/sim/2026-07-13-victory-minimums.md`) — **recorded, not
applied**; the final call is the owner's hand-playtest.

---

## 5. Open decisions → best-practice defaults (autonomous build)

Per the owner's standing instruction (take best-practice calls when he can't answer):

1. **Policy name** — `"political"` (evocative; low collision). *Default: use it.*
2. **Extend `smart` or new policy** — **new policy**, to keep a clean A/B. `smart` stays
   the blind baseline.
3. **Give `beam` the political scorer too?** — **No**, out of scope; keep `beam` the pure
   search-depth control. Revisit if the one-ply political bot underperforms.
4. **Rival aggregation in `politicalDelta`** — **`max` over rivals** (guard the leader),
   not mean.
5. **Draw-target politician** — the one I'm closest to **patron** on (patronage is the
   only thing a random draw reliably advances). Fixed rotation as the flush-and-far
   fallback.
6. **All weights/thresholds** (`POLITICS_WEIGHT`, `PROPOSE_THRESHOLD`, bribe/veto
   triggers) — start rough, **sim-tune in §4**; commit the values with the A/B that
   backs them.
7. **Scope stop-line** — bot intelligence + its tests + the A/B + the tuning
   recommendations. **No** ruleset/engine balance *changes* (those wait for the human
   playtest). One PR.

---

## 6. Definition of done

- `political` policy built, registered, unit-tested (incl. anti-peek), `npm run check`
  + vitest green, batch runs clean.
- Assembly telemetry demonstrably non-trivial (§4).
- A/B run and its result recorded (win either way — the *number* is the deliverable).
- Sim-backed tuning notes on the `Ruleset.assembly` dials filed under `docs/sim/`.
- Docs updated (simulation.md, roadmap). PR opened. Engine rules untouched.
