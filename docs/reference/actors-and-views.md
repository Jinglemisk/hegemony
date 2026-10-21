# Actors and views

Last updated: 2026-10-21.

This is the living contract between authoritative match state and any browser, bot,
spectator, or future network client. Commands cross `transition`; observations cross a
projection. Neither client input nor a view is authority.

## Workflow actors

`src/game/actors.ts` owns the shared query. `currentPlayer` remains the ordinary setup and
gameplay actor, but it is not treated as universal authorization.

| Workflow          | Eligible actors              | Accepted command family                                                 |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------- |
| Setup             | `currentPlayer`              | Placement for the exact setup phase                                     |
| Normal turn       | `currentPlayer`              | Economy/population actions, trade offers and settlements, and `endTurn` |
| Player event      | Decision owner               | `resolveEvent`                                                          |
| Riot at turn end  | Decision owner               | Insurance or `resolveRiot`                                              |
| Assembly proposal | Every seat not yet Ready     | Draw, discard, propose, repeal or pass; trade; `assemblyReady`          |
| Assembly voting   | Current sequential voter     | Buy a vote or cast a vote                                               |
| Assembly closing  | Suspended turn's active seat | `assemblyClose`                                                         |
| Game over         | Nobody                       | None                                                                    |

`eligibleActors(state)` powers UI activity and observation metadata.
`commandActorEligibility(state, actor, command)` is the authoritative command-family gate used
inside `transition`. Domain validators remain responsible for payload legality and costs.

**Out of turn.** `outOfTurnActors(state)` names the seats outside the workflow's actors that may
still act, and the commands each may send; the gate admits exactly those. Trade is the first
use. On a turn, each seat an open offer names that has not answered may send `tradeAnswer`, and
nothing else; the first accept settles the trade. In the Assembly's preparation a Ready seat
may still answer, and take a counter to its own offers or withdraw them. Listing a recipient as a turn actor instead would have let it play the
turn's verbs, since the gate checks the seat and the command's family apart. The enumerator
lists an out-of-turn seat's answers, so a driver that routes by actor finds them.

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
- another seat's held Assembly card, sealed proposal and set-aside draw are null during
  proposal; a discarded draw waits in `assembly.setAside` and reaches its politician's
  discard pile only when the ballot is read, and a sealed repeal's log line does not
  name its Law;
- spectators see no held card or sealed proposal;
- a pending Player Event is visible only to its decision owner; other views receive a generic
  workflow/log indication until it resolves.

A pending hunger choice is public: every view sees which seat must send how many pops away,
and the chosen pops in the Chronicle once they leave.

Trade offers are public (D5 of the trade plan): every view sees every open offer, its terms and
each answer, so nothing on `offers` is redacted.

Discard identities remain public and are sorted canonically. Once Assembly proposals enter the
ballot, they are public and the voting view exposes them normally.

## Browser and AI

`src/client/controller.ts` retains authoritative state in its local adapter so hot-seat play can
execute commands, but React receives only the active seat's projection. Switching the viewer
reprojects; it does not mutate or transfer authority.

In hotseat (every browser game but `?dev=bots`: people share the screen and take the seats in
turn) the viewer follows the seat the game waits on only through public phases: setup, the Idea
draft, the vote and the house rising. A private moment, a seat's turn or its Assembly proposal
(`privateMoment`), changes hands at the turn notice, which says to pass the screen: the viewer,
and so the projection, stays the last seat's until Begin. A networked mode will word the notice
"It's Nikos's turn" instead. Proposals run one seat at a time in
turn order (`assembly.activePlayer`), and the sitting has no seat switcher, so no seat
reads another's drawn card. Once every seat has sealed, the preparation is public: the
sheet is shared, offers are made and answered on it, and each seat presses Ready there. The
game's end stays with whoever was looking. Trade answers have no notice either: the offer card
lists every seat the offer names at once, and the first to accept trades.

`src/sim/runner.ts` likewise projects before every policy decision. Search can transition the
sanitized state for deterministic, RNG-free branches, but cannot observe real entropy or deck
order. Political draw evaluation constructs an uncertainty pool from authored content and
public zones; a rival's hidden card remains a possible card rather than becoming inferred truth.

Regression coverage proves that changing only hidden seed/RNG/deck order cannot change a master
policy decision, that player and spectator redactions differ exactly by ownership, and that
asynchronous Assembly commands pass or fail through the public transition according to workflow.

## National Idea choices

After placement, `setupIdeas` is an open draft: only `currentPlayer` may submit
`pickIdea`, in the placement snake's next round. A pick lands at once, with its
acquisition effects, and is public to every view; an Idea held by any seat cannot be
picked or bought by another. During play `buyIdea` is an ordinary current-seat action
over the untaken Ideas. Held Ideas are permanent public ownership, so the picker, realm
pages, rival tooltips and telemetry use the same selectors (`ideaHolders`, `ideaDraft`).

## Hunger choices

Income may take a seat's food below zero; the seat plays its turn with the shortfall
and can buy it back. When it ends the turn still short, `endTurn` sets `pendingHunger`
instead of passing the turn: `resolveHunger` is then that seat's only legal command, and
it names exactly as many freemen or citizens as the shortfall, one entry per pop. Food
returns to zero, and the riot check and the hand-off follow. Enumeration offers bots each
split between the eating classes, every pop from the settlement holding the most of its
class; the shell's card may pick any settlement. The shell opens its card before it sends
`endTurn`, so Go back costs nothing; confirming sends `endTurn` and `resolveHunger`
together.
