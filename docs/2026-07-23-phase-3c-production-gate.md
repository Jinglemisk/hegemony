# Hegemony after Phase 3-C — production gate review

Date: 2026-07-23  
Status: recommendation, not yet a locked roadmap decision

## Executive verdict

Hegemony is approaching **feature-complete alpha**. It is past the point where another
open-ended systems phase is healthy, but it is not yet at the point where a final balance
or final-art pass will hold.

The recommended order is:

1. **Proposed Phase 3.5 — stabilize the truth, not the look.** Reconcile scope and docs;
   run a narrow Assembly human-playtest gate; repair UI correctness/parity seams; decide
   the side-panel information architecture with low-fidelity prototypes.
2. **Phase 4 — build the wider-world vertical slice.** Board topology/coasts first, then
   one complete port/luxury loop, then the full luxury roster, then minimal structured
   player trade.
3. **Alpha feature lock.** No speculative buildings, military, extra modes, national
   ideas, or multiplayer unless explicitly retained in the v0.1 scope.
4. **Broad balance/content pass.** Buildings, bank, colony upgrade, victory thresholds,
   Assembly, luxury caps, trade behavior, game length, and map/seat fairness.
5. **Beta presentation pass.** Final shell, icon family, coastline illustration, colors,
   motion, responsive/accessibility QA.

This is deliberately not “features now, UI later.” The **semantic UI foundation and
layout decision happen now**; expensive icon production, map illustration, and final
polish happen after the entity list and topology stop moving.

## Current baseline

- TypeScript check: clean.
- Tests: **337 passed across 29 files**.
- Lint: 0 errors, 3 hook-dependency warnings.
- The complete game loop, victory race, terrain economy, events, unrest, ventures,
  Assembly, Politicians, Laws/Directives, and Phase 3-C political policy are present.
- The simulator drives the real engine through `enumerateLegalMoves` and `applyMove`,
  rather than maintaining a second rules implementation.
- Phase 3-C succeeded as instrumentation: political bots now spend roughly 45–58
  influence per game and exercise draw/propose/vote/bribe/veto paths.
- Its first balance reading is a warning, not a verdict: political participation won
  about 21% in the small saved campaigns versus 26–29% for passive smart bots. The
  leading explanation is that a player privately buys a table-wide public good.

Evidence: [Phase 3-C result](sim/2026-07-21-influence-aware-ai.md),
[AI limits](ai.md), [legal move protocol](../src/game/legalMoves.ts), and
[simulation runner](../src/sim/runner.ts).

## Why a narrow gate is needed now

### 1. The Assembly may have a structural incentive problem

Do not broadly retune the economy yet. Do test whether the newly completed rivalry layer
is **rational and enjoyable to engage with** before putting Phase 4 on top of it.

The bot result is not statistically strong enough to prove human imbalance: the saved
runs are small, use one seed family and the classic board, and cannot model bargaining,
threats, coalition behavior, table talk, kingmaking, or perceived fun. It is strong
enough to form a focused playtest question:

> When a Law benefits the whole table but its proposer alone pays influence, what private
> return makes proposing worthwhile?

Run 2–3 complete human tables. Watch proposing, bribing, vetoing, patronage, Voice, and
Stratokles. Only fix blockers, exploits, or clearly dominated participation now. Leave
fine costs until feature lock.

### 2. “Luxury goods” is a coupled mini-phase

The current plan implies at least four systems, not one small feature:

1. coastal topology/features;
2. Port and Luxury Trader buildings;
3. unique-asset ownership, claims, activation/denial, and effective happiness;
4. bilateral trade with an off-turn accept/decline response.

None of these types or moves exists under `src/` yet. The active Phase 4 decisions also
remain open in [the roadmap appendix](roadmap-appendix.md): coastal geometry (Q31),
luxury rules/pricing (Q32), and trade shape (Q33).

There are design contradictions to settle before implementation:

- The original [luxury plan](feat/luxury-goods.md) says every good gives +2 standing
  happiness; [terrain-economy](feat/terrain-economy.md) adds diminishing duplicate copies
  and an approximately three-active-goods cap.
- The roster describes nine named physical goods, apparently unique. If goods are unique,
  “a second copy of the same good” needs a source or must be removed.
- “Effective happiness” must be defined for **every consumer**: riots, Beloved victory,
  deck-exhaustion tiebreaks, UI, bot evaluation, and telemetry—not only the unrest check.
- A pending trade responder does not fit the current assumption that only the current
  player has legal moves. This should be solved as a general acting-seat/decision model,
  not a UI exception.

## Balance policy from here

Balance at three resolutions:

| Resolution            | When                        | What belongs here                                                                                                                 |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Guardrail balance** | continuously                | crashes, deadlocks, duplication exploits, impossible costs, dead currencies, clearly dominated systems, severe seat/map bias      |
| **Feature balance**   | as each Phase 4 slice lands | plausible starting prices, caps, and AI behavior sufficient to exercise and understand the new loop                               |
| **Final balance**     | after feature lock          | exact building effects/costs, bank spreads, upgrades, victory thresholds, Assembly dials, luxury caps, trade economy, game length |

Therefore:

- **Defer** the full buildings/bank/victory pass.
- **Do not defer** the current Assembly incentive question.
- Treat every pre-Phase-4 balance number as provisional unless it guards a hard failure.

## Simulation trust model

“The simulator supports the feature” needs four separate claims:

| Claim                      | Current confidence     | Meaning                                                                                   |
| -------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| **Mechanical coverage**    | high                   | The runner can enumerate and execute the real move through the real engine.               |
| **Policy coverage**        | medium-high by feature | At least one bot meaningfully chooses it; Assembly improved greatly in 3-C.               |
| **Behavioral calibration** | low                    | Bot action distributions have not been compared with human play.                          |
| **Experiential validity**  | none by definition     | A sim cannot measure clarity, tension, negotiation, bluffing, perceived fairness, or fun. |

Use simulations for legality, determinism, termination, conservation, exploit search,
same-seed A/Bs, gross scarcity, action frequency, and broad seat/win distributions.
Do not use the current bots as final evidence about spatial denial, negotiations,
archipelago strategy, coalitions, or comprehension.

Before citing a future sim campaign, record a capability row:

```text
feature | engine implemented | legal-move covered | policy-aware |
telemetry-covered | human-calibrated | confidence / known blind spots
```

### Simulation work before the final balance pass

- Repair `evaluateSmart`'s known over-promotion/unrest objective before calling it a
  skilled-play proxy.
- Run shuffled boards (the UI default) as well as classic; the sim currently defaults to
  classic.
- Use multiple seed families, seat rotation, larger samples, and zero forced action-cap
  endings as campaign-quality gates.
- Add a policy that exercises Stratokles and redraw/fishing behavior; the current
  political bot deliberately avoids meaningful coverage of those paths.
- Add Phase 4 telemetry before tuning Phase 4: port/trader builds, luxury claims and
  transfers, active diversity, happiness relieved, trade bundles, accept/reject rate,
  bank-relative values, and effects by seat/policy.

## UI: what is already good

This is not a greenfield UI rescue. The following foundations are worth protecting:

- `ResourceChips` is the shared resource cost/delta/yield path.
- `ModalShell` is the shared modal scaffold.
- `TilePopover` and map-first target selection establish a coherent interaction grammar.
- `GameUiContext` removes most game-state prop plumbing.
- Command verbs are data-driven.
- Income projections and previews come from engine functions.
- The top-bar income tooltip already shows source and detail.
- `AnnotatedText` gives prose terms icons and Codex links.
- Event tables share one engine roll seam and one modal family.

The problem is that the remaining consistency is **conventional, not enforced**.

## UI truth fixes to do before Phase 4

These affect balance-test correctness and are not optional polish:

1. **Use effective content everywhere.** Several frontend files import default
   `BUILDINGS`/terrain data while the engine deliberately reads tuned content through
   `getBuildings()`/`getTerrainDeck()`. A tuned game can therefore be mechanically right
   and visually stale.
2. **Display effective costs on action surfaces.** `BuildPopover` computes an
   `ActionStatus` but prints the building's base cost. Laws, seasons, and coupons can
   change the actual cost. The rule should be:
   - action surface → `status.cost`;
   - reference surface → explicitly labelled **base cost**.
3. **Expose persistent player effects.** Coupons/discounts, timed happiness modifiers,
   free actions already consumed, income suppression, and next-Assembly Isonomia are
   engine state but do not have one clear UI home. Add an “Active effects” surface with
   source, effect, target, duration, and consumed state. Luxuries naturally join it.
4. **Make asynchronous acting-seat state explicit.** Assembly already stretches the
   current-player convention; trade acceptance will break it. The UI and sim should
   dispatch the same serializable move protocol with explicit authorization.

## Enforceable parity contracts

Create five audited matrices, then turn their closed vocabularies into exhaustive
TypeScript mappings/tests where possible.

### A. Backend action → frontend path

```text
LegalMove type
→ initiating UI affordance
→ eligibility/blocked explanation
→ target/choice interaction
→ confirmation
→ result/history presentation
→ sim policy coverage
```

Every move must be either user-facing or explicitly classified as automatic, forced,
setup-only, headless-only, or internal. The React UI currently uses a parallel `GameMoves`
surface instead of the full legal-move dispatcher; converge these before trade and later
multiplayer.

### B. Effect → resolution → presentation

The engine currently has separate `EventEffect`, `TableEffect`, `LawEffect`, and
`DirectiveEffect` vocabularies. Do **not** replace them with one giant undifferentiated
effect type. Separate semantics still matter:

- instantaneous effects;
- persistent/timed modifiers;
- pending player decisions;
- source-specific orchestration such as voting or trade.

Instead, normalize their presentation into shared semantic tokens:

```ts
type UiEffect =
  | { kind: "resource"; resource: Resource; amount: number; cadence?: string }
  | { kind: "pop"; pop: PopType | "any"; amount: number }
  | { kind: "cost"; resource: Resource; amount: number }
  | { kind: "capacity"; amount: number }
  | { kind: "modifier"; label: string; duration?: string; tone?: "gain" | "cost" };
```

Adapters exhaustively convert each engine union to `UiEffect[]`. One `EffectSummary`
renders compact, card, tooltip, modal, and Codex variants. `AnnotatedText` remains useful
for narrative prose; structured mechanics should no longer become strings and then be
regex-parsed back into meaning.

A common pop-gain/loss decision should route through the same pending-decision family
regardless of whether an event, table, Directive, or future trade produced it. Migration,
promotion, voting, and trading remain separate orchestrators because they are different
player decisions.

### C. Entity → visual language

```text
Resource / pop / building / settlement / luxury / status / action
→ canonical label
→ icon
→ value formatter
→ compact renderer
→ tooltip renderer
→ Codex destination
```

Require exhaustive metadata for every closed ID union. This implements the rule “wherever
a resource name appears, its resource icon appears” without hoping every screen author
remembers it.

### D. Modifier provenance

```text
amount → source ID/type → display label → affected player/settlement → duration → expiry
```

Prefer structured provenance over free-form source strings. Income and cost drill-downs
then consume the same record, and new cards/resolutions/luxuries cannot silently lose
their explanation.

### E. Rules/content coverage

```text
content or rule definition
→ in-game Codex entry
→ external player-rule entry
→ dynamic values sourced from live ruleset/content
```

The Codex is substantial but not a coverage contract. It misses or hard-codes several
placement, setup, unrest, insurance, and active-effect rules. Generate mechanical tables
from live content/rules and keep only explanatory prose handwritten.

## Tooltip and popover convergence

The frontend currently has roughly 94 native `title=` sites, three custom `role=tooltip`
implementations, and multiple positioning paths. They differ in appearance, focus/hover
behavior, viewport collision, icons, and accessibility. Disabled buttons also make native
titles unreliable.

Build:

- one portal-based `Tooltip` primitive for non-interactive explanations;
- one `Popover` primitive for interactive choices;
- one shared anchoring/collision hook;
- standard content slots for heading, semantic effect rows, source, duration, and blocked
  reason;
- hover + keyboard focus + `aria-describedby` support.

Keep native `title` only as nonessential fallback text.

## Layout decision

The conceptual split—left **act**, right **consult**—is coherent. The current shell is
heavier than it needs to be:

- the left ledger opens by default;
- both 360px-class panels can open independently;
- narrow viewports deliberately do not reflow;
- the map camera reserves panel-width assumptions rather than receiving actual open-panel
  state;
- at 1440×900, two open panels leave a legible but visually boxed-in center stage.

Preferred prototype: **one unified left folio** with grouped Act and Consult navigation,
one content surface open at a time. This preserves the accepted top/bottom bars and
almost all current page components while removing one permanent edge.

Lower-risk prototype: keep two rails on wide screens, make the wide panels mutually
exclusive by default, and seat the map from actual open-panel insets.

Compare these with the current shell using real tasks, not an abstract taste vote:

- explain why projected income changed;
- grow, move, build, and identify a blocked action;
- inspect a rival's economy;
- understand a resolution before voting;
- find the rule behind a term;
- inspect active coupons/modifiers.

Test at 1440×900, 1024×768, and 600×900. Use grayscale/current assets. Do not produce the
final icon family until this information architecture is chosen.

## Map and coastline path

The visual coast is further along than expected: `getShorelineEdges()` already detects
every tile edge with no neighbor, including holes and disconnected islands.

The engine and camera remain tied to the current solid radius-3 hex:

- map creation always produces a radius-3 board;
- game coast legality is “outer radius equals 3”;
- camera/world bounds are fixed for the current board;
- foam renders as independent straight segments rather than ordered coastline contours.

Before drawing better coasts, introduce a shared topology model:

```ts
type BoardTopology = {
  tiles: HexTile[];
  landSet: Set<string>;
  neighbors(tileId: string): Neighbor[];
  boundaryEdges: BoundaryEdge[];
  boundaryLoops: BoundaryLoop[];
  coastalTileIds: Set<string>;
  worldBounds: Bounds;
};
```

Both settlement legality and the renderer consume this topology. Coastal features attach
to a stable edge identity such as `{ tileId, side }`, not “the twelfth tile on the outer
ring.” Then:

1. prove the classic board;
2. prove shuffled terrain on the same topology;
3. add one authored archipelago fixture;
4. derive camera bounds dynamically;
5. trace ordered boundary loops and render continuous/smoothed shoreline paths;
6. only then create final coastline art.

Do not build a generalized fair procedural-archipelago generator yet. One authored
fixture is sufficient to validate the architecture; human spatial play must exist before
the generator has a meaningful fairness target.

## Proposed milestone gates

| Milestone                    | Work                                                                                               | Exit gate                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **3.5A Reality reset**       | Lock v0.1 scope; reconcile stale roadmap/todo/specs                                                | One authoritative alpha-scope list; no active contradictions                                        |
| **3.5B Assembly health**     | 2–3 human tables + coarse dial experiments                                                         | Participation is not obviously dominated; rules are understood; no structural redesign remains open |
| **3.5C UI truth/parity**     | Effective content/costs, active effects, five matrices, semantic renderers, shared tooltip/popover | Every implemented move/effect/entity has a classified and consistent presentation path              |
| **3.5D Shell decision**      | Current vs unified folio vs exclusive dual panels                                                  | One shell selected using task tests; top/bottom remain stable                                       |
| **4A Topology spike**        | Shared topology, dynamic bounds, classic + one archipelago fixture                                 | Same rules/renderer handle both without layout-specific branches                                    |
| **4B Luxury vertical slice** | One port, one good, claim/disable/effective-happiness loop, UI/policy/telemetry/tests              | A player can discover, obtain, inspect, lose access to, and understand one luxury                   |
| **4C Full luxuries**         | Ratified roster/caps/Trader/content                                                                | Diversity, caps, happiness and denial work end to end                                               |
| **4D Trade v1**              | Offer, accept/reject, atomic transfer, policy/telemetry/UI                                         | Assets conserve; no cancel/duplication exploit; humans trade for strategic reasons                  |
| **Alpha lock**               | Only missing core affordances/Codex coverage                                                       | Complete start-to-finish v0.1; no core mechanic exists only in docs/backend                         |
| **Balance pass**             | Full-system tuning and content pruning                                                             | Repeated tests produce numeric/content changes rather than redesigns                                |
| **Beta visual pass**         | Final icons, shell, coasts, colors, motion, accessibility                                          | Coherent visual language and unguided task success                                                  |

## Phase 3.5 playtest questions

Record observations, not just ratings.

### Assembly

- Did every player understand why a Law helps them relative to rivals?
- Did anyone voluntarily draw/propose? If not, why not?
- Was patronage/Voice visible enough to feel like a private return?
- Were bribe and veto costs seen before commitment?
- Did the table use Stratokles as a comeback threat, ignore him, or misunderstand him?
- Did voting check a runaway leader, or mostly enrich that leader too?

### Existing economy

- Was colony-to-city upgrade ever attractive?
- Were Villa/Gymnasion effects understood and used?
- Could players explain a resource-income change from its displayed provenance?
- Did UI discoverability suppress any legal option?

### Shell/parity

- Could players complete the six layout tasks above without developer guidance?
- Which side-panel combinations obscured the board or caused navigation search?
- Did the same resource/pop/effect look and read the same across card, tooltip, ledger,
  modal, and Codex contexts?

## Explicit scope decisions required

Before Phase 4 implementation, lock:

1. Is v0.1 complete after Phase 4, or are National Ideas and the pre-game mode/setup
   frame required before alpha lock?
2. Are coastal objects non-settleable features on boundary edges, or new playable tiles?
3. Are all nine luxuries unique? If yes, delete or redefine duplicate-copy diminishing
   returns.
4. Does effective happiness count for riots, Beloved, exhaustion tiebreaks, AI score, and
   every other happiness consumer?
5. What is the active-luxury cap and why?
6. Does a traded coastal luxury remain usable without the receiver owning a Port?
7. Is trade current-player offer → named responder accept/decline, with no counteroffer?
8. What prevents infinite offer spam—one accepted trade, one offer, or one trade action
   per turn?
9. Are gifts allowed, and how much kingmaking is acceptable?
10. Which proposed shell advances to prototype: unified folio, exclusive dual panels, or
    both for comparison?

## Immediate next backlog

1. Ratify the Phase 3.5 concept and v0.1 scope boundary.
2. Reconcile `roadmap.md`, `roadmap-appendix.md`, `todo.md`, `v0.1-rules-spec.md`, and
   `sim/plan.md`; several still say Phase 3-C or already shipped systems are pending.
3. Fix UI effective-content and effective-cost drift.
4. Create the five parity matrices and add exhaustive registry tests.
5. Add the Active Effects surface and structured provenance.
6. Prototype the side-panel shells with current assets.
7. Run the focused Phase 3 human playtests.
8. Lock Phase 4 Q31–Q33 plus the additional scope decisions above.
9. Build topology + one luxury vertical slice.

## External production references

- [GDC 2026 Production Workshop](https://media.gdcvault.com/gdc2026/Slides/Marty_Fleur_ProductionWorkshopPart2.pdf)
- [GDC: Implementing Games User Research Throughout Development](https://media.gdcvault.com/gdcchina14/presentations/833798_GrahamMcAllister_EveryGameIsA_EN.pdf)
- [GDC 2026: Playtesting Process for Ultra-Small Teams](https://media.gdcvault.com/gdc2026/Slides/Cronin_Brian_PlaytestingProcessForUltraSmallTeams.pdf)
- [Automatic Playtesting for Game Parameter Tuning](https://arxiv.org/abs/1908.01417)
- [Microsoft Xbox Accessibility Guideline 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112)
- [Microsoft Xbox Accessibility Guideline 103: multiple visual channels](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103)
- [Unity Analytics: event design](https://docs.unity.com/en-us/analytics/events/events)
