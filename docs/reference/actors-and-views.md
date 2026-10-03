# Actors and views

Last updated: 2026-10-03.

This is the living contract between authoritative match state and any browser, bot,
spectator, or future network client. Commands cross `transition`; observations cross a
projection. Neither client input nor a view is authority.

## Workflow actors

`src/game/actors.ts` owns the shared query. `currentPlayer` remains the ordinary setup and
gameplay actor, but it is not treated as universal authorization.

| Workflow          | Eligible actors              | Accepted command family                  |
| ----------------- | ---------------------------- | ---------------------------------------- |
| Setup             | `currentPlayer`              | Placement for the exact setup phase      |
| Normal turn       | `currentPlayer`              | Economy/population actions and `endTurn` |
| Player event      | Decision owner               | `resolveEvent`                           |
| Riot              | Decision owner               | Insurance or `resolveRiot`               |
| Assembly proposal | Every undecided seat         | Draw, discard, propose, repeal, or pass  |
| Assembly voting   | Current sequential voter     | Buy a vote or cast a vote                |
| Assembly closing  | Suspended turn's active seat | `assemblyClose`                          |
| Game over         | Nobody                       | None                                     |

`eligibleActors(state)` powers UI activity and observation metadata.
`commandActorEligibility(state, actor, command)` is the authoritative command-family gate used
inside `transition`. Domain validators remain responsible for payload legality and costs.

## Projection boundary

- `projectForPlayer(definition, state, playerId)` returns `PlayerView` with that seat's
  legal options and private decisions.
- `projectForSpectator(definition, state)` returns `SpectatorView` with no legal options.
- Both carry a branded `ProjectedGameState`, keeping the public presentation shape compatible
  with existing pure selectors while making its provenance explicit.

The projection preserves board, public resources, settlements, Laws, revealed ballots,
discards, results, and public logs. It removes or canonicalizes authority-only information:

- seed and serialized RNG are replaced with zero;
- draw piles preserve counts only, using opaque card identifiers; the next year card
  is hidden from every seat, spectators and bots alike;
- another seat's held Assembly card and sealed proposal are null during proposal;
- spectators see no held card or sealed proposal;
- a pending Player Event is visible only to its decision owner; other views receive a generic
  workflow/log indication until it resolves.

Discard identities remain public and are sorted canonically. Once Assembly proposals enter the
ballot, they are public and the voting view exposes them normally.

## Browser and AI

`src/client/controller.ts` retains authoritative state in its local adapter so hot-seat play can
execute commands, but React receives only the active seat's projection. Switching the viewer
reprojects; it does not mutate or transfer authority.

`src/sim/runner.ts` likewise projects before every policy decision. Search can transition the
sanitized state for deterministic, RNG-free branches, but cannot observe real entropy or deck
order. Political draw evaluation constructs an uncertainty pool from authored content and
public zones; a rival's hidden card remains a possible card rather than becoming inferred truth.

Regression coverage proves that changing only hidden seed/RNG/deck order cannot change a master
policy decision, that player and spectator redactions differ exactly by ownership, and that
asynchronous Assembly commands pass or fail through the public transition according to workflow.

## National Idea choices

After placement, `setupIdeas` allows every seat without a locked pick to submit
`pickIdea`. The headless driver parks `currentPlayer` on the first unfinished seat,
while the shell may act as any unfinished seat. Only the viewer's locked choice is
projected. Ownership and acquisition effects reveal together when every seat has
chosen, before Year 1's reveal and income; no choice-bearing log exists before then.
During play `buyIdea` is an ordinary current-seat action. Held Ideas are permanent
public ownership, so realm pages, rival tooltips and telemetry use the same selector.
