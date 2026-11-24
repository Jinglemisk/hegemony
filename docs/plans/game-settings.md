---
status: blocked
phase: "post-v2"
updated: 2026-11-25
---

# Game settings

## Outcome

Before a game, the table picks its settings. Classic is the default set: the game as
designed. Veterans change single settings, such as the board, the length or base income.
Every setting is part of the game's recorded rules, so a game replays exactly.

Blocked: the setup screen waits until the cards are balanced (see the
[roadmap](../roadmap.md)).

## Decided

- Settings are chosen per game. Classic is the default.
- Each setting is a ruleset value or the board mode. Both are already pinned and hashed in
  the game's definition, so a setting needs no new save field and replays for free. The
  client resolves the settings once, before the game state is created.
- **Length** ends the game. If the year deck runs out first, its discards are reshuffled; a
  shorter game ends with cards left in the deck. An Open length has no year limit: only the
  race ends it, with a safety stop at year 40. After the last year the age-end tally decides,
  with the same tiebreaks.
- **Base income per settlement** is one value per resource. Classic has 0 in each.
- Deck-end ties are answered by settings, not by a change to the tiebreak.
- Not in scope: handicaps for one player, saved custom presets, the networked lobby.

Built in the engine and the sim: the length (`victory.years`, 14 by default, `null` for
Open) and base income (`economy.baseIncome`), with the sim flags `--years N|open` and
`--board`. The client still picks the mode, board and seed with `?mode=`, `?board=` and
`?seed=`; there is no setup screen.

## Open

**Which settings, and which belong on the first setup screen.** Candidates:

| Setting                    | Classic         | Choices                                                      | State                         |
| -------------------------- | --------------- | ------------------------------------------------------------ | ----------------------------- |
| Board                      | open            | Archipelago, Continental                                     | Exists                        |
| Length                     | 14 years        | 6, 12, 14, 18 years, Open                                    | Exists in the engine          |
| Base income per settlement | 0 everywhere    | Per resource, for example +1 food                            | Exists in the engine          |
| Luxury goods placement     | Even            | Even, random                                                 | Exists                        |
| Turn order                 | Rotating opener | Rotating; a yearly roll (last seat may not open next); a bid | Proposed                      |
| Starting resources         | Standard        | Standard, rich                                               | Exists as the Fast Start mode |
| Founding colonies at setup | 1               | 1, 3                                                         | Exists as the Deathmatch mode |

- **Classic's board.** The client starts on the Archipelago and the sims on Continental.
- **Fast Start and Deathmatch**: stay modes, or become settings on top of Classic.
- **Turn order.** Influence should first matter more in the Assembly's laws. An influence bid
  for who opens the year is a candidate mode: the highest bid opens, a tie goes to the seat
  furthest behind. A batch tests the yearly roll against the rotation before it is built.

**Length, once batches can run.**

- Victory minimums are tuned for 14 years. A 6-year game may end almost always on the tally,
  an 18-year game more often by the race. Batches at 6, 12, 18 years and Open, on the mixed
  and masters tables, decide whether the minimums scale with length.
- The Assembly sits every other year from Year 2: three sittings in 6 years, nine in 18. The
  Voice title needs two standing Laws and can be reached from Year 4 at the earliest.

**The screen.** A setup screen before placement, with Classic preselected and one click to
start. The top bar and year card show "Year N of M"; Open needs its own countdown; Roman
numerals stop at 39. `rules.md` and the Codex document each setting once it ships.

## Three-axis parity

- **Engine / backend:** a settings object that resolves to a ruleset patch and a board, with
  Classic as its default; a test for each setting that changes a rule; replay from the
  recorded definition.
- **Frontend:** the setup screen; the top bar, year card and rulebook read the chosen values;
  the settings shown in the game's info.
- **Simulation & AI:** a sim flag for each setting; bots read length and income from the
  ruleset; batches per setting.
