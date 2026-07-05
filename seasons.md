# feat/seasons — working doc

Design + tasks for the seasons feature. Plain bullets: `-` is a thing to do or a
decision; `--` is detail or a random thought. Keep it current as we work; cross
out done items with ~~strikethrough~~.

---

## Goal

- Turn "season" from an empty counter into the game's rhythm, clock, and the
  moment happiness and the Assembly finally matter.
-- Today a season is just one round of 4 turns plus a shared event card — no
   theme, no stakes. This is where tempo comes from.

---

## Time model

- Time runs in YEARS; each year has 4 SEASONS in order: Spring, Summer, Autumn, Winter.
- The game always starts in Spring.
- One season = each of the 4 players takes one turn (a round), then the season advances.
-- Spring -> Summer -> Autumn -> Winter -> Spring (next year) -> ...
- Reaching Spring again = a NEW YEAR.
-- On a new year (Spring): draw a YEARLY card and hold the ASSEMBLY.
-- Open question: does the very first Spring (game start) count as a new year
   (yearly card + assembly)? User said "whenever the NEXT spring comes" — leaning
   toward NO assembly on the opening spring, first assembly at year 2. Confirm.

---

## Cards / decks

- Three kinds of card, each its own deck and flavor.

- Season cards.
-- One per season, shared by everyone, drawn as the season begins.
-- Themed to the season: crop yield, shortages, weather — cyclical / agrarian stuff.
-- e.g. good harvest (+food this season), drought (-food), hard winter (upkeep up).

- Player cards.
-- Four per season — one per player, on their own turn.
-- Themed to a player's economy: pops, resource income, small personal boons/setbacks.

- Yearly cards.
-- One per year, drawn in Spring when the new year begins.
-- Broad boons/mali for the year. Contents still fuzzy — needs more design.
-- Thought: maybe world/era effects or a theme the whole year is played under.

- So a full year deals: 4 season cards + 16 player cards (4x4) + 1 yearly card.

---

## Season flavor (the predictable cycle modifier)

- Each season also applies a fixed, recurring modifier — separate from the random
  season card — so players plan against a known rhythm, not just luck:
-- Spring (sowing): pop growth cheaper — the season to grow population.
-- Summer (campaign): founding colonies cheaper — the season to grab land.
-- Autumn (harvest): bonus material + food income — bank for winter.
-- Winter (scarcity): higher food upkeep + happiness pressure — survive it.
-- First-draft flavors; balance later. Could also be left out if the season cards
   already carry enough character.

---

## Where happiness finally bites (end-of-season reckoning)

- Add a resolution step at each season boundary (seasons currently just flip).
-- Natural home for happiness consequences: low happiness at season end -> unrest
   (lose a pop / revolt / founding freeze), worst in Winter.
-- Also the home for any seasonal upkeep/tax and a scoring checkpoint.

---

## The Assembly (Spring / new year)

- The Assembly convenes each new year (Spring).
-- The scheduled window where Influence is spent — voting on resolutions.
-- Ties the deferred Assembly/resolutions system to the seasonal clock.
-- Details TBD — see the Assembly item in todo.md.

---

## Endgame (ties to the victory-cards idea)

- Today the event decks reshuffle their discards forever, so there is no end.
-- For the "victory cards when the deck runs out" ending, the decks should be
   finite (draw-once) so the clock actually runs down.
-- Deck length = game length; victory cards resolve at the end (most resources /
   pops / cities / X). See the scoring item in todo.md.

---

## Open questions

- First-Spring assembly + yearly card, yes or no? (see Time model)
- How long is a game — how many years, how big are the decks?
- Do season cards persist for the whole season, or resolve once and stop?
- How do yearly cards interact with season cards — stack, or override the season?
- Are the season flavor modifiers fixed, or should they vary / be drawn too?

---

## Build notes (implementation seams)

- Season handling lives in src/game/season.ts (`startNewSeason`) + turn.ts.
- Seasonal draws are in src/game/events.ts; decks reshuffle in `drawFromEventDeck`
  (this is what to change for a finite clock).
- Season is a plain number on HegemonyState today; we'll need a season *type*
  (spring/summer/autumn/winter) + a year counter, both serializable + testable.
- Add yearly-card and (later) resolution decks alongside the existing seasonal /
  player decks in HegemonyState + data.ts.
