# Actors and views

Last updated: 2026-08-04.

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
| Assembly voting   | Current sequential voter     | Bribe, vote, or veto                     |
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
- draw piles preserve counts only, using opaque card identifiers;
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
