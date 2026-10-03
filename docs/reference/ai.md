# Bot players

The bots are simulation policies for balance batches and browser development.
Step 10 adds `slaver`, `civic` and `trader` as weight vectors over the shared
political scorer and master search. They are not separate implementations.
The [outcome-driven AI plan](../plans/outcome-driven-ai.md) remains future work.

## Contract

`Policy.choose(view, commands, rng)` receives the acting seat's `PlayerView` and
engine-enumerated commands. Costs, yields, capacity, happiness, Ideas, Laws and
victory titles come from engine selectors. Each hypothetical action uses the
canonical transition; execution uses that same transition in the browser and sim.

The view hides the seed, game RNG, draw order, next year card, rival private
Assembly cards and secret setup picks. Choices are pure functions of the view,
commands and injected bot RNG. Placement and Idea ties use that bot stream;
ordinary search ties keep enumeration order. Bot randomness never changes the
game's card or die stream. `?dev=bots` still uses `master` for every browser seat.

## Policies

- `random`: choose a move type uniformly, then a command within that type.
- `greedy`: one-ply search over the simpler population/material score.
- `smart`: one-ply search with class, material, work-slot and luxury values.
- `beam`: smart score with width 3, depth 4 search within the current turn.
- `political`: smart score plus standing authored Laws, using one-ply search.
- `settler`: smart score plus the one-step expansion frontier, using one-ply search.
- `master`: political score plus the frontier, using the beam.
- `slaver`, `civic`, `trader`: master with the following initial weights.

These are starting preferences. Step 11 measures whether each build can win.

| Weight                | Master | Slaver | Civic | Trader |
| --------------------- | -----: | -----: | ----: | -----: |
| Slave                 |    1.2 |    4.5 |   1.2 |    1.2 |
| Freeman               |      2 |    1.5 |     2 |      4 |
| Citizen               |      3 |    1.5 |   4.5 |    1.5 |
| Food                  |    0.4 |    0.4 |   0.4 |    0.4 |
| Wood                  |    0.6 |      1 |   0.5 |    0.5 |
| Stone                 |   0.85 |      1 |   1.2 |    0.7 |
| Gold                  |      1 |    0.8 |     1 |    1.8 |
| City                  |      6 |      8 |     6 |      6 |
| Colony                |      3 |      4 |     3 |      3 |
| Standing happiness    |      6 |      4 |     8 |      6 |
| Influence             |      2 |      2 |     3 |    1.5 |
| Active luxury         |     36 |     36 |    36 |     54 |
| Standing authored Law |      8 |      4 |    16 |      4 |
| Frontier              |      2 |      2 |     2 |      2 |

Population, city and colony weights are multiplied by 10. Projected materials
and latent work are multiplied by 10/8. Influence, happiness, luxury and Law
weights apply directly; every held victory card is worth 120 for all personalities.
An inactive owned luxury keeps half its weight. The standing-level cap is the
Beloved minimum plus two. Unrest and hunger costs stay shared.

The slaver values slaves, Estates' real production, yielding slots and expansion.
The civic values citizens, Forums' influence, Temples and standing Laws toward
Voice. The trader values freemen, Marketplaces' gold, Ports and luxuries. Buildings
have no personality bonus: their changes to income, slots and happiness carry
the value. Each build can convert through the bank and choose ventures in search.

## Search and forecasts

All optional economic actions enter search, including unit bank buys and sells,
the Dole, calm, Ideas and ventures. A bank sale can unlock a building or promotion
later in the same four-action search. Forced riots keep the shared insurance/roll
handler; search never evaluates the live riot roll.

Ventures are chance leaves at every search depth. Score every public die face,
and every uniform settlement destination for the Voyage jackpot, with its actual
probability. Synthetic RNG seeds reproduce those outcomes through canonical
transitions independently of the game's RNG. Compare the expected score with the
other branches; after execution, observe the real roll and replan. This supports
bank-to-venture sequences without expanding subsequent turns or a chance tree.
A negative mean gold payout can still be useful near a title threshold. Equal
positions at the same depth are expanded once. Scores are shared across depths
and venture outcomes within one decision, keyed by the economic fields that can
change during that search. Logs and the last roll display do not distinguish
positions. When the only optional first move already improves the score, return
it immediately: deeper search cannot change that first move. A costly first move
still gets the full search to find a later payoff. Width, depth, odds and tie order
stay unchanged.

Forecast at most six incomes, bounded by the years remaining. This year's card
applies only to a seat that has not collected; later incomes use printed values.
The projection runs engine hunger and deterministic revolts, clears tokens after
a projected riot, and recalculates income after pop losses or the year's card
expires. Otherwise it reuses income through the horizon; stocks and tokens do
not change printed yields. It assumes no future card or token changes.
Influence uses projected income too, so a Forum pays back
through its actual citizen column; Civic Tradition needs no duplicate future bonus.

Engine queries reuse immutable Law/Idea effects and tile indexes. Changed drafts
and mutable fixtures still read their current inputs. Definition checks unwrap
unchanged draft aliases before hashing. These caches remove repeated work from
candidate transitions and Assembly forecasts without changing rules or saved state.

A projected lost pop costs 60, above every personality's population weight.
For a realm with food consumption and another income remaining, reserve food
for one forecast shortfall plus two against the player deck's food loss. Each
unit missing from that target costs 14. This makes unit buys and Dole purchases
useful before a whole shortage is covered, and discourages selling or spending
the last food. The horizon can justify a larger reserve. There is no hard-coded trade order.
Latent slave slots count only where population room remains, including transfers
already committed to that settlement.

Calm enters search at its engine price. Under the settled Step 6 rule it expires
before the next upkeep and never counts for Beloved. Buying it after collection
cannot improve survival or a title, so a bot normally declines it. Making calm
useful in that position is a Step 11 rules/balance question.

## Setup, Ideas and the Assembly

Policy openings use each seat's own personality for placements and secret Idea
picks. Fixed openings fix placement only; Ideas still use the seat's scorer.
Random openings choose uniformly. New games without a named policy retain the
neutral placement/Idea scorer. Ordinary purchases enter the seat's normal search.
Immediate grants and permanent income use real transitions/projections. Future
pieces, founding grants, upgrade grants, Dole savings and extra votes use the
Step 9 opportunity estimates, scaled by the relevant personality weights. Future
slave grants also pay their standing-level cost.

All non-random policies use one Assembly handler. It scores real enactments and
repeals, draws against unordered public composition, supports modest private
costs to form coalitions, blocks a rival's winning title, and buys only affordable
pivotal votes. The acting personality weights both its own and rival score changes;
coalition prediction assumes that same public scoring lens for uncast votes.
Mixed tables route every Assembly action to its actual seat, including when a
sitting spans one opener's player-turn.

Capital Works adds no benefit that Urban Planning lacks when both are available:
Urban Planning covers the capital and later cities at the same price. Harbour
Planning credits a saved slot at the ordinary projected material value for an
owned unclaimed Port site; if the site has no building slot left, use half a
luxury's weight for opening that claim instead. Count at most one prospective
site per distinct claimable good, keeping the most valuable sites. Existing Ports
use their real slot value. Treasury Grant matters when gold can fund a move or
take Treasurer; Assembly Brokers values future third-vote opportunities at the
personality's politics weight. No Idea receives a fixed selection quota. Step 11
should distinguish missing opportunity from weak or dominated content when reading
unused Ideas.

## Limits and validation

Search cannot save deliberately across turns, model general rival replies, or
plan multi-hop routes. Riot severity and future Idea opportunities are heuristics.
Venture expectation is exact for the shipped public tables; it does not implement
the outcome-driven AI program. Focused tests cover build preferences, food rescue,
bank-to-Port sequences, venture odds and title decisions, Idea picks/purchases,
private-information invariance, seat routing and telemetry denominators.

Use the rotated [simulation commands](simulation.md) for full-game evidence.
Record seeds, definitions, policies and opening type before interpreting balance.
