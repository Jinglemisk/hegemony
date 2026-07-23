# State of the Game — Production Brief (2026-07-23)

A cross-cutting "lay of the land" after Phase 3-C, written to answer one question:
**with the core systems built, what do I do next, and in what order?** Grounded in an
8-dimension code audit (engine, backend→frontend, frontend↔frontend, sim, UI/canvas,
rulebook, remaining features, balance) + production research + a 3-lens strategy panel.
Every load-bearing claim was verified against the actual code.

> This brief is a *plan*, not a contract. The live rules contract stays `docs/v0.1-rules-spec.md`;
> the single backlog stays `docs/todo.md`. Fold accepted items into those.

---

## TL;DR

**Trust your two instruments first (the sim and the on-screen state), spend an evening
proving the loop is fun, THEN build luxury goods → (maybe) trade to greybox, freeze scope,
balance, and do the art/icon overhaul dead last.**

The engine is genuinely mature (~22k lines incl. tests, nearly every system "solid"). The
temptation is "just two more features, then polish." The audit says: not yet — because
**both instruments a solo dev relies on to make good calls are currently broken**, and the
target is about to move.

---

## The situation, honestly

- **No fire to fight.** 12 of 15 balance-ledger issues are resolved; the systems are complete
  and tested. This is a good position.
- **But your measuring instrument (the sim) is miscalibrated.** `evaluateSmart` uses a *linear*
  happiness penalty (`src/sim/policies.ts:209,283`) that can't see the −5 riot / −10 revolt
  cliff, so the bot over-promotes into it — and beam-search *loses to plain greedy 8% vs 31%*.
  Every ruleset A/B you've run measures the bot's flaw, not the game. **Verified in code.**
- **And most balance verdicts on file are stale by construction.** Every pre-3-C verdict
  (cities 3→2, bank rates, deck overhaul, colony repricing) ran with the Assembly/law economy
  effectively *switched off* and on stub venture/bank policies. Your instinct that "the sims
  don't represent all features so they may be inaccurate" is **correct, and worse than you
  thought.**
- **Your other instrument (a human playtest) would also give corrupted signal today** — because
  the newest, highest-value content is partly *invisible on screen* (see the two findings below).
- **The target is about to move.** Luxury goods + trade reset every relative value. This is
  exactly why your own `docs/todo.md:10-27` parks the Buildings pass and Market/bank pass to
  "the very end of the whole phases run." Balancing now = redoing it the day a feature ships.

So the order is **forced**: make the instruments trustworthy → validate fun cheaply → finish
breadth to greybox → freeze → balance → polish.

---

## Notable findings you should know about

**Two things to fix regardless of sequence:**

1. **A real latent bug.** `effectAppliesToPlayer` (`src/game/economy/income.ts:313`) returns
   `scope === "allPlayers" || PLAYER_IDS.includes(playerID)` — the second clause is *always*
   true, so a seasonal event scoped to `"activePlayer"` silently applies its effect to **all
   four players**. Masked by current content, but it will bite the moment such a card ships.
   Quick fix + regression test.
2. **A whole political-attack Law is invisible.** `incomeSuppressedTurns` (the Stratokles
   "General Strike") is set by `assembly.ts:741` and burns a turn of income at `actions.ts:241`,
   but **zero components reference it** (verified). A player's income gets stolen with no
   on-screen explanation. This is the single clearest "engine feature with no UI."

**Good news that shrinks the scary work:**

3. **Luxury goods does NOT require a canvas/coastline rewrite.** The map is SVG, the coastline
   is drawn *topologically* (`getShorelineEdges`, `hexGeometry.ts:133`), and coastal tiles
   already exist (`isCoastalTile`, `map.ts:48` — 18 of 37 tiles). A **land-trader-only luxury
   slice needs no coast at all** and can ship as the gold sink your balance pass is waiting on.
4. **Your in-game rulebook is excellent.** `rulebook.tsx` (861 lines) renders nearly every
   number *live* from `ruleset.ts`/content tables and covers every system incl. the full
   Assembly — near-zero drift. The doc that's actually stale is the repo guide `rules.md`
   (still says the Assembly is "being designed"; lists only 5 victory cards, missing *Voice*).
   A ~1-hour patch fixes the only real doc-parity break.
5. **The two-rail layout you dislike is cheap to merge.** Both rails already share one
   `DiscRail` component, one panel shell, and one route model; `seatViewBox` is already built
   for an asymmetric single-side inset. Collapsing to one rail is **M effort, mostly deletion**
   — a consolidation, not a rewrite.

**The genuinely expensive thing is player trade** — not the mechanic (the Assembly's async
multi-seat session pattern can be cloned), but the **AI**: the economic bots have *no opponent
modeling* (only `political`'s assembly-scoped `competitiveDelta`), so a two-sided deal is
un-simmable. Trade is **XL, dominated by the bot problem**, and must be human-validated.

---

## Direct answers to your four questions

### 1. Balance now, or defer?
**Defer the comprehensive push.** Do only balance-*enabling* work now: fix the bot eval
(Track A — cheap, design-free), re-run the small owed campaigns with the fixed bot + a political
seat, and the owner hand-playtest. The real numbers sweep is **Phase 3, after feature freeze.**
Balancing a broken instrument against a moving target is the textbook trap.

### 2. Where does the UI overhaul fit?
**Split it in two.** *Functional/readability* UI goes **first** (surface the invisible engine
state; build the one effect-display seam) — that's instrument-fixing, not polish; a tester who
can't see *why* income vanished gives you garbage signal. The *from-scratch art* overhaul
(icons, coastlines, re-skin) goes **last**, over frozen numbers + a frozen layout, or you'll
redraw everything. **Exception:** the two-rail→one-rail *merge* is layout, not art, and is cheap
(M, mostly deletion) — pull it forward if the double rail bugs you day-to-day; it doesn't depend
on frozen numbers.

### 3. What feature order?
**Luxury goods first, trade last (or v2).**
- **Luxury (land-trader slice) first** — it's the gold sink the whole Buildings/Market balance
  pass is blocked on, and it's single-player-legible so the sim can partly value it (M, no coast).
- **Coastal luxuries + Port second** — after a small `isCoastalTile`→topology refactor (S). The
  Port is your *first location-gated building*, which brushes against your own ban on
  terrain-gated buildings — a design call, not just code (L).
- **Player trade last, or defer to v2** — XL and dominated by an AI problem; un-simmable, must be
  human-validated. Decide explicitly whether it's in the freeze.
- The **"Buildings pass" you lump in is not a feature** — it's balance finalization, correctly
  parked to after luxuries.
- **National ideas / seat asymmetry** is a *third* new system — v2 unless the playtest proves the
  game feels thin without it.

### 4. How to attack the three "parities"?
Treat them as **three different clocks:**
- **Backend→Frontend (invisible state):** action-side parity is essentially *done* — all 28 moves
  are wired. The gap is *display* of engine state. Close the high-severity ones **now** (income
  suppression, starvation countdown, active-effects list) as functional UI — they corrupt the
  playtest you're about to run.
- **Frontend↔Frontend (component consistency):** your instinct is right and it's tractable. The
  problem isn't "no shared components" — it's **two parallel render systems** (`ResourceChips`
  vs `AnnotatedText`) with no chosen boundary, plus 4+ effect formatters and a raw-text path
  (the identical Assembly card renders *with* icons in the Agora tab and *without* on the voting
  bema). Build **one `<EffectLine>` + a written "presentation contract"** now so new luxury/trade
  content stops forking it; grab the cheap quick-wins; **defer** the full retrofit of ~30 legacy
  surfaces and the shared-Tooltip extraction to the Phase-4 art sweep. This is your logged
  `todo.md:39` "ONE uniform pipeline" item.
- **Sim→Feature:** fix the bot eval first; teach the bots each new verb as it lands; accept a
  permanent ceiling on trade/opponent-modeling verdicts (validate those with humans).

---

## Recommended sequence

| Phase | Goal | Effort | Exit gate |
|---|---|---|---|
| **0 — Make both instruments trustworthy** | You can't get a reliable read from the sim OR a playtest. Fix that before measuring anything. | M | A tester can always see *why* a number changed; beam beats greedy in sim. |
| **1 — Collapse the biggest design unknowns cheaply** | Answer "is the core + Assembly loop actually fun?" with the cheapest experiments. | M | Clear owner verdict on fun + the Assembly-dial / citizen-identity direction. |
| **2 — Build remaining features to greybox, then FREEZE** | Finish breadth on rails, ugly-but-legible, then lock scope. | L–XL | A full game plays with luxury (±trade) live and legible; freeze doc published. |
| **3 — Real balance pass on the frozen target** | Small isolated tuning loops on a stable target with a credible bot. | L | Win-rate curves stable; numbers stop moving. |
| **4 — Art / UI overhaul as one coherent deliverable** | Spend the high-cost, low-reversibility art budget once, over a frozen layout + numbers. | XL | One coherent visual system; parity debt paid in a single sweep. |

### Phase 0 — Make both instruments trustworthy (M)
- **Sim:** execute `docs/sim/plan.md` Track A — rebalance `SMART_POP_WEIGHT` (`policies.ts:225`)
  and replace the linear `Math.max(0,-happiness)` penalty (`:209,283`) with a threshold-ramped
  one that sees the riot cliff; A/B until beam-over-smart beats greedy.
- **Readability (functional, not polish):** income-suppression badge + chronicle line
  (`incomeSuppressedTurns`, 0 UI today); persistent "N turns to starvation" chip regardless of
  happiness tier; an "active effects" list (timed happiness mods w/ source+turns-left, cost
  coupons, law free-action).
- **Ground-clearing + parity quick-wins:** fix the `effectAppliesToPlayer` bug
  (`income.ts:313`) + test; delete the dead `setupCity/placeCity` path; ship issue #8 (evicted
  colony pops walk home, don't vanish); route the 3 bare-text cost popovers (Build/GrowPop/Ladder)
  through `ResourceChips`; wrap `AssemblyBema` resolution effect in `AnnotatedText` so bema == agora;
  move `ResourceGrid`'s hardcoded happiness-red into `resourceVisuals`.
- **Docs:** patch `rules.md` (Assembly is shipped; add the 6th victory card *Voice*).

### Phase 1 — Collapse the biggest design unknowns cheaply (M)
- **Owner hand-playtest** of the current loop with the Assembly live — multiple full games to
  victory *and* to seasonal-deck exhaustion. Write down every moment of confusion, boredom, or
  unfair-feeling punishment. This is the qualitative "why" the sim can never give.
- **Decide two owed, now-time-critical design questions:** the *agora net-loss* (is engaging the
  Assembly worth it? political 21% vs smart 26%) and *citizen identity* (issue #9 — the +2-gold
  citizen flips from dominated to dominant now that votes exist).
- **Re-run the small owed sim campaigns** now the bot is credible: victory minimums / cities 3→2
  with a political seat on `--board shuffled`. Treat as provisional until luxuries land.
- **Resolve the luxury design conflicts on paper** (cheap): the happiness model (non-accumulating
  "effective happiness" per `luxury-goods.md` vs the "+2/turn flow" per `terrain-economy.md` —
  they produce *different* numbers because happiness is stored income here) and the coastal
  geometry (are coastal tiles settleable, as shipped, or pure feature tiles, as the luxury doc
  assumed?).

> Note: the "throwaway coastline spike" the strategy panel suggested is **not needed** — the audit
> showed the renderer is already topology-ready and coast already exists. Archipelago (multi-
> landmass) is the only genuinely un-sized, un-designed map item, and it's optional.

### Phase 2 — Build remaining features to greybox, then FREEZE (L–XL)
- **First** build the single `<EffectLine>`/effect→tokens function + write the one-line
  presentation contract (chips = tabular/summary, `AnnotatedText` = genuine prose). Author all
  new UI against it. Do **not** retrofit legacy surfaces yet.
- **Luxury goods, land-trader slice first** (M): new material flows through `ResourceChips`
  automatically; wire the standing happiness relief; define its gold sink; wire into sim
  enumeration + telemetry (do **not** tune it).
- **`isCoastalTile`→topology refactor** (S) — unblocks coastal luxuries *and* de-risks any future
  map change; the render already computes the algorithm.
- **Coastal luxuries + Port** (L) — after the geometry + location-gate rulings from Phase 1.
- **Player trade** (XL) — *only if in scope*; clone the Assembly async-session pattern; keep it
  minimal; a pending offer renders as an active-effect chip via the Phase-0 surface. Validate with
  humans, not the sim.
- **Declare the FEATURE FREEZE in writing** (MoSCoW): IN = luxury (± trade); Won't-have =
  embargoes, dynamic price discovery, luxury-driven unrest sub-economies → explicit v2 list.
  National ideas → v2 unless Phase 1 proved thinness.

### Phase 3 — Real balance pass on the frozen target (L)
- Buildings whole-roster pass (esp. Villa/Gymnasion under-build) + Market/bank corridor pass —
  now the gold sink (luxury) exists. Resolve Granary-first dominance and the PROVISIONAL bank rates.
- Re-run the headline verdicts with the tuned bot + a political seat + the constrained board
  shuffle (landmarks non-adjacent, breadbasket off-rim).
- Lock the provisional numbers: omen magnitudes (your eyes, not the sim), assembly costs/thresholds,
  most Law magnitudes.
- Refresh the two-phase-stale `balance.html` narrative to the post-luxury economy.

### Phase 4 — Art / UI overhaul as one coherent deliverable (XL)
- Merge the two rails into one (M, mostly deletion — fold reference pages into *sections*, heed
  `two-panel.md`'s "no rail of nine discs"; keep the load-bearing dock ticker).
- From-scratch unified icon set: one inline-SVG `currentColor` family modeled on `AssemblyIcons`,
  scoped by `icon-ab-verdict.md`'s hybrid rule (real icons only where a field is scanned); merge
  away the 7 competing icon systems and the two duplicate resource-icon families.
- Full frontend↔frontend cosmetic retrofit: retire the per-source formatters into the `<EffectLine>`
  pipeline, extract the one shared `<Tooltip>`, collapse the two resource-render systems.
- Coastlines re-skin + archipelago/dynamic maps **if desired** (design it first; the renderer is
  ready, the engine + design aren't).
- Tech-debt sweep: `.git` history shrink, stricter TypeScript flags, npm-audit fixes.

---

## Top risks

1. **Never actually declaring the freeze** — drifting into permanent "almost done, one more
   thing." The single highest-leverage decision; the most-cited solo-dev failure mode.
2. **Playtesting before the Phase-0 legibility fixes** — you'd misread "I can't tell what's
   happening" as "this mechanic is bad" and cut/over-tune systems that are just *unreadable*.
3. **Skipping Track A and jumping to ruleset A/Bs** — locking in wrong numbers because the probe
   measures its own over-promotion, not the game.
4. **Scope creep on "just two more features"** — luxury and trade each spawn sub-systems. Counter
   with a hard MoSCoW Won't-have list to a v2 file.
5. **Gold-plating the effect/status framework** beyond what luxury/trade provably need — every
   abstraction must have a named consumer.
6. **Treating pre-3-C sim verdicts as ground truth** — they ran with the assembly economy off;
   re-run before ratifying.

---

## Decisions only you can make

- **Agora net-loss:** is engaging the Assembly supposed to be worth it, and via which lever
  (richer patron buff / lower dominance threshold / cheaper draw-bribe-veto / author-favoring Laws)?
- **Citizen identity (issue #9):** politics-only unit (revert the +2 gold) vs a priced elite?
- **Luxury happiness model:** non-accumulating effective-happiness vs +2/turn flow?
- **Coastal geometry:** coastal tiles settleable (as shipped) or pure feature tiles (as the luxury
  doc assumed)? And is a location-gated Port acceptable given you banned terrain-gated buildings?
- **Is player trade IN this freeze, or a v2?** (Given its XL / AI cost.)
- **National ideas: in, or v2?**
- **Dead paths:** reprice/keep/cut the colony→city upgrade (economically dead today) and the
  `setupCity` 2-city path (unreachable in every shipping mode)?
- **Archipelago:** do you actually want multi-landmass maps? It's undesigned and L–XL; the renderer
  is ready but the engine + design are not.

---

*Sources: 8-dimension code audit + web research + 3-lens strategy panel (2026-07-23). Key claims
re-verified against `src/sim/policies.ts`, `src/game/economy/income.ts`, `src/game/assembly/`,
`src/components/`, `src/ui/hexGeometry.ts`, `src/game/map.ts`.*
