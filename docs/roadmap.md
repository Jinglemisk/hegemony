# Hegemony — Roadmap

The owner's paths, where each stands and its next step, then the rules every change follows.
Open owner decisions live only in [questions.md](questions.md).

## Paths

In the owner's order.

1. **Riot screen redesign** — in progress on `feat/riot-screen`. The d6 table as six small
   cards, insurance as toggle tiles, a die roll, and the result as a card with one line per
   loss. Ledger: [UI open items](plans/ui-remaining.md).
2. **Improving the bots** — next. Bots plan with the remaining year cards, estimate whether a
   rival accepts a trade, use the year forecast, and value, offer and end trade deals (they
   decline every deal today). Then the larger outcome-driven rework.
   Plan: [improving the bots](plans/outcome-driven-ai.md).
3. **Development deck, second pass** — the deck and the card system as a whole: the deck's
   close-out, card balance, bots that play cards well.
   Plan: [development deck](plans/development-deck.md).
4. **Sim batches** — on the owner's word only. The comparison batches measure the agency
   package and the development deck against `main` at `d6ebecd`. Design, switches and the
   balance check: [simulation reference](reference/simulation.md#comparison-batches).
5. **3D map, second pass** — better waves, better object rendering. No plan yet; the map's
   current rules are in the [presentation contract](reference/frontend-presentation.md#map-presentation).
6. **Multiplayer lobby, then networked play** — no plan yet. The engine already has the
   network-shaped boundary (see the architecture contract below); the server, persistence,
   lobby, seat sessions and reconnect are still to build.

**Parked:** the [game settings](plans/game-settings.md) setup screen, until card balance is
done.

## Mandatory three-axis parity contract

Every change is assessed on three axes:

| Axis                 | What it covers                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Engine / backend** | Authoritative state, rules, legal moves, automatic resolution, shared status and query functions, engine tests. Consumers never copy formulas.             |
| **Frontend**         | How a player starts the action or sees the result: eligibility and blocked reasons, choices, effective costs and effects, history, Codex, accessibility.   |
| **Simulation & AI**  | Runs through the real engine and legal moves; fair observation; the bots value, plan for and use or avoid the feature; telemetry; deterministic scenarios. |

1. Every plan and PR marks each axis as applicable or `N/A` with a reason. A blank axis is not
   a decision.
2. Player-facing gameplay normally needs all three. Visual-only, docs, tooling and internal
   refactors may use justified `N/A`s.
3. An automatic mechanic needs a frontend explanation when players must understand its result,
   and sim/AI coverage when it affects evaluation.
4. A move the bots can execute is not AI parity: `master` must observe, value and plan for it.
5. Within each axis, every consumer of a fact uses one authoritative function or typed model
   (enumeration, validation, preview and execution; board, ledger, tooltips and Codex;
   observation, evaluation and telemetry), with behavioural parity tests.
6. A feature is done when each applicable axis has its implementation and a regression test.
   Results from limited bots are labelled as such, never as balance evidence.

Enforcement: `.github/pull_request_template.md`; `src/parity/commandParity.ts` maps every
`GameCommand` to its frontend and sim paths; `src/parity/featureParity.ts` classifies every
content family and effect vocabulary; `npm run test:parity`. Persistent effects have one
query, `getActiveEffects` in `src/game/activeEffects.ts`, which board, ledger, CLI, bots and
telemetry all read. Details: [parity manifests](reference/parity-manifests.md).

## Mandatory architecture contract

Full rules in the [runtime architecture contract](reference/architecture.md).

1. **One immutable definition per match.** Rules and content are pinned by version and hash; no
   mutable module-global content.
2. **One command transition.** Browser, sim, replay and a future server send the same
   `GameCommand`. The engine derives costs, eligibility and outcomes; it never trusts the caller.
3. **Atomic changes.** A transition returns new state and events, or reasons on rejection; a
   failed command leaves nothing half-applied.
4. **Workflow actors.** `currentPlayer` governs ordinary turns; the Assembly and trade expose
   their own eligible actors.
5. **Player-safe views.** The browser and the bots read player or spectator views that hide
   private cards, deck order and RNG.
6. **Stable identity and replay.** Settlements, assets, offers, commands, rules and content
   have stable ids and versions; games stay pinned across deploys and replays are deterministic.
7. **Conservation.** Post-transition invariants cover settlements, pops, card zones, the
   Assembly and ownership.

`src/game` stays pure; browser adapters live in `src/client`. Workspaces (`apps/`,
`packages/`) come only when the server starts.

## Delivery principles

1. The v1 mechanics are frozen. A new mechanic needs the owner's decision; what remains is
   balance, bots, presentation and multiplayer.
2. Close the playable loop before widening it.
3. Systems before content, content before polish.
4. Gameplay ships as vertical slices across all applicable axes; engine, frontend and sim are
   not separate mergeable stages.
5. Interaction between players outranks more solitaire surface.
6. Substantial work starts from a plan in [`plans/`](plans/).
7. Simulation is an instrument: targeted batches with stated bot limits, never a fixed game
   count on every PR.
8. Batch visual decisions; don't reopen a settled look during feature work.
9. Deterministic scenarios and invariants travel with the behaviour they cover.
