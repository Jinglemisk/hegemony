---
status: ready
phase: "post-v2"
updated: 2026-11-25
---

# Improving the bots

## Outcome

One bot, master with its three personalities, that sees only what a player sees, gives an
explicit estimate for every uncertain thing it faces, and plays every part of the game: the
year deck, trade, standing deals and the development deck. Later, the same bot plans toward
victory by outcomes instead of fixed prices on cities, pops and resources, and becomes the
player-facing CPU.

How the bots play today is in the [bots reference](../reference/ai.md); its "Limits and
validation" section lists what they cannot do.

## Decided

- **One bot.** Master and its three personalities (slaver, civic, trader) stay; `random`
  stays as a test opponent. New behaviour goes into the shared forecast and score, not into
  rules added feature by feature.
- **Parity of estimates.** Every uncertain quantity gets an explicit estimate from public
  information only: the year cards still to come, event and development draws, whether a
  rival accepts a deal, how a sitting will vote.
- **Fair play.** A bot reads only its own player view. It never reads draw order, the seed,
  the live RNG or a rival's hand, and never bluffs or reads table talk.
- **Personalities are hidden.** A bot judges a rival at master's weights.
- **Bot tuning and balance stay apart.** A bot experiment keeps the ruleset fixed; balance
  batches wait until the bots play the feature being measured.

## Open: first work

These change the bots only, not the rules. Each one lands with focused tests and telemetry,
and goes into the comparison batches on the owner's go.

1. **The remaining year cards.** The lean-year reserve reads the share of Drought and Piracy
   among the year cards still to come, not the whole deck: a game plays all fourteen, so what
   is left is public. The six-year forecast applies each remaining year card's effect,
   weighted by its chance of being drawn, instead of plain years once the current card
   expires.
2. **The year forecast.** Next year's card is public; the bots' forecast does not read it yet.
3. **The Dole cap.** The forecast buys food as if the Dole had no per-turn cap. It should plan
   within the cap of three a turn.
4. **A trade-acceptance estimate.** For a deal and a rival, the chance the rival accepts, from
   its stock and projected income at master's weights. The forecast then prices future food at
   the cheaper of the Dole and the expected trade price, so a bot may grow a pop that trade
   can feed.
5. **Standing deals.** Bots decline yearly lines and leased goods today. They need to value a
   deal over its whole term, offer one, keep or cancel a short payment, and end a deal that
   no longer pays.
6. **Cards.** Bots trade development cards and price a held card as riot cover in the
   forecast. Details are in the [development deck plan](development-deck.md).

## Open: the outcome-driven rework

Starts after the first work and the card balance. The approved direction:

- **An ordered outcome hierarchy** for every decision, setup and the Assembly included: win
  now; stop a rival's win before your next turn; avoid collapse (riot, revolt, starvation,
  forced pop loss); raise the chance of completing a victory route; shorten the current plan;
  resources count only as inputs to those.
- **Victory routes and named plans.** A route is a set of titles that reaches the win. A plan
  (found a colony, upgrade a city, pass a Law, stabilise) has a target, a cost, an expected
  completion time and conditions to abandon it. Ending the turn to save for a plan is a valid
  step.
- **Resource value from plans.** Wood is worth the turns it saves toward the planned colony or
  building, and little once that is paid for. No permanent price per city, pop or resource
  decides the final choice.
- **Sampled rollouts first, tree search later.** For each candidate move, sample hidden
  worlds consistent with the player view, play every rival's reply and the acting seat's next
  turn opening, and compare outcomes. Current master is the rollout policy, a leaf evaluator
  and the baseline. Tree search (MCTS) comes only once rollouts pass their behaviour tests and
  never read hidden state. A learned value model is optional and last; no neural policy
  first.
- **Statistical ties.** Sampled values carry their spread; overlapping estimates count as a
  tie, and the next level of the hierarchy decides.
- **Promotion.** A new bot replaces master only when it beats a frozen league on the same
  seeds with every seat rotated, the gain holds across seats, boards and opponents, and no
  collapse, replay or fairness test regresses. An unclear result is recorded as unclear.
- **Difficulty and personality.** Difficulty sets the search budget, horizon and sample
  count. Personality picks among near-equal outcomes only: it never passes up a win, lets a
  rival win, reads hidden information or plays an illegal move.
- **Explanations.** Each choice can report its plan and the hierarchy level that decided it,
  for debugging and later for the player.

Open for the owner when the rework starts:

- **An LLM-driven player**: a language model choosing among the engine's legal moves from a
  player view, instead of search or beside it. To settle: cost, speed, determinism and
  replay, and fairness.
- **Which part ships first**: the rollouts as a stronger sim bot, or straight to the
  player-facing CPU with difficulty levels.

## Three-axis parity

- **Engine / backend:** the player view and legal commands the bots already use; a
  rollout-safe way to play out hypothetical turns without touching live state or RNG; replay
  and fairness tests.
- **Frontend:** CPU seats with a difficulty choice once the rework ships; optional plan
  summaries from the same explanation vocabulary.
- **Simulation & AI:** the estimates above in the shared forecast and score; telemetry for
  each; focused behaviour tests; paired, seat-rotated batches against frozen baselines.
