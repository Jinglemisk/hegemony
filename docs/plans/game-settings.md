---
status: proposed
phase: "post-v2"
updated: 2026-10-25
---

# Game settings

## Outcome

Before a game, the table picks its settings. Classic is the default set: the game as designed.
Veterans change single settings to tune the game to their liking, such as the board, the length
or base income. Every setting is part of the game's recorded rules, so a game replays exactly.

## Non-goals

- Handicaps for one player.
- Saving named custom presets.
- The networked lobby, which is Phase 6 in the [roadmap](../roadmap.md).

## Settled inputs

**Owner, 2026-10-24**

- Settings can be switched per game. Classic is the default.
- **Board:** Continental or Archipelago. See the [board modes plan](board-modes.md).
- **Length:** for example 6, 12 or 18 years. This answers the question of ties when the year
  deck runs out:
  - The game's length ends the game.
  - If the year deck runs out first, its discards are reshuffled.
  - An Open length has no year limit: only the race ends the game, with a safety stop.
- **Base income per settlement** is a setting, one value per resource. Classic has 0 in each.
  The old base food was 1 food.
- **Deck-end ties:** standing happiness decided 31 of the trader's 116 wins in the
  [2026-10-24 batches](../reports/simulation/2026-10-24-balance-lines.md). The answer is
  settings, not a change to the tiebreak now.
- **The first code change is engine and sim only**, with no screen.

**Built on `feat/game-settings-engine`, 2026-10-24**

- `victory.years`:
  - 14 by default;
  - null for an Open game, which has a safety stop at year 40.
- After the last year the age-end tally decides, with the same tiebreaks.
- A game longer than the 14-card year deck shuffles the spent cards back in. A shorter game ends
  with cards left in the deck.
- The Assembly schedule, the bots' horizon and the sim's default turn cap read the length, not
  the deck.
- The game-end reason keeps its old id, `deckExhausted`, so reports stay comparable.
- `economy.baseIncome`: one value per resource, all 0.
- Sim flags:
  - `--years N|open`;
  - the shuffled board, now named `continental`, is the default board.

## What exists today

- **Modes.** Standard, Fast Start (a richer treasury) and Deathmatch (three founding colonies).
  - Each is a ruleset patch over the default.
  - The client picks the mode with `?mode=`, the board with `?board=` and the seed with
    `?seed=`.
- **No setup screen.** An old roadmap question (Q35) recommended a pre-game setup screen for
  mode, board, seed and players. It was never built.
- **Settings would replay for free.** A game pins its definition (ruleset and content, hashed)
  in its state. A setting written as a ruleset patch is recorded and replayed with the game.
- **The dev tune panel** already edits any ruleset number or switch and starts a new game with
  it.
- **Values already marked as future setup options:**
  - random luxury placement;
  - the bank switch;
  - colony contiguity;
  - the Assembly switch (first year 0 turns it off).
- **A name clash, resolved.** "Classic" named the authored fixed board, which clashed with a
  Classic preset. The owner renamed that board `scenario` (2026-10-25), and the
  [board modes plan](board-modes.md)'s first slice made the rename; the old name is rejected.

## The first list of settings

| Setting                    | Classic         | Choices                                                                                 | State                         |
| -------------------------- | --------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| Board                      | Continental     | Continental, Archipelago                                                                | [Board modes](board-modes.md) |
| Length                     | 14 years        | 6, 12, 14, 18 years, Open                                                               | Built in the engine           |
| Base income per settlement | 0 everywhere    | Per resource, for example +1 food                                                       | Built in the engine           |
| Luxury goods placement     | Even            | Even, random                                                                            | Exists                        |
| Turn order                 | Rotating opener | Rotating; a yearly roll where the last seat may not open next; an influence bid to open | Proposed (owner, 2026-10-25)  |
| Starting resources         | Standard        | Standard, rich                                                                          | Exists as the Fast Start mode |
| Founding colonies at setup | 1               | 1, 3                                                                                    | Exists as the Deathmatch mode |

**Turn order.** The owner, 2026-10-25, wants influence to play a bigger part in the Assembly's
laws first. An influence bid for who opens the year is a candidate game mode: the highest bid
opens, and a tie goes to the seat furthest behind. A batch tests the yearly roll against the
rotation before the setting is built.

**Open for the owner:**

- Which of these belong on v1's setup screen.
- Whether Fast Start and Deathmatch become settings on top of Classic instead of modes.

## Length: what is built and what is not

What is built is listed under Settled inputs. These are not built yet, and each needs batches or
an owner decision:

- **Victory minimums.** They are tuned for 14 years.
  - A 6-year game may end almost always on the tally.
  - An 18-year game may end more often by the race.
  - Batches at 6, 12 and 18 years decide whether the minimums scale with length.
- **The Assembly.** It sits every other year from Year 2: three sittings in 6 years, nine in 18.
  The Voice title needs two standing Laws and can be reached from Year 4 at the earliest.
- **The screen.**
  - The top bar and the year card show "Year N of M" from the length.
  - An Open game shows its safety stop of 40 as its length. Open's countdown needs its own
    design when the setup screen is built.
  - Roman numerals stop at 39.
- **Player guide.** `rules.md` still says fourteen years, the only length a player can choose
  today.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                            |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Each setting is a ruleset value pinned in the game's definition; a settings object that resolves to a ruleset patch and a board; the Classic preset; tests per setting that changes a rule   |
| Frontend         | Yes      | A setup screen before placement, with Classic preselected and each setting showing its effect; the top bar, year card and rulebook read the chosen values; settings shown in the game's info |
| Simulation & AI  | Yes      | Sim flags for each setting (`--years` and `--board` exist); bots read the length and income from the ruleset; batches per setting                                                            |

## Architecture impact

- **Per-match definition.** Settings are a ruleset patch plus the board mode. Both are already
  recorded and hashed, so there is no new save field.
- **No module-level settings.** The client resolves the settings once, before the state is
  created, as it does today with `?mode=`.
- **Save/replay.** A new ruleset value bumps the state schema, as base income and the length
  did.

## PR slices

1. **Done:** the engine for length and base income, and the sim flags.
2. **The settings model.**
   - A settings object, with Classic as its default, resolves to a ruleset patch and a board.
   - URL parameters stand in until a screen exists.
   - Fast Start and Deathmatch fold in if the owner agrees.
3. **The setup screen.**
4. **Batches** at 6, 12, 18 years and Open, on the mixed and masters tables, with a dated
   report. Then the owner decides on minimums per length.

## Acceptance and validation

- A game started with each setting replays exactly from its recorded definition.
- The setup screen starts a game with Classic in one click.
- Batches show how often each length ends by the race and by the tally.

## Retirement

After validation, document the settings in `rules.md` and the rulebook. Then move this plan to
`docs/archive/plans/` with its PRs.
