# Owner questions

Only unresolved owner decisions live here. Answer in chat or after `Answer:`; the
answer is then incorporated into the affected plan and this entry is removed.
Recommendations are defaults for discussion, not silent authorization.

Last updated: 2026-10-26.

## Q84 — Two balance-check rules: a hunger limit, and the stock ratio

**Context:** The balance check's [first report](reports/simulation/2026-10-26-balance-check.md)
ran its rules from the [player trade plan](plans/player-trade.md#the-balance-check) on three
batches: four masters on Continental and on Archipelago, 60 games each, and the mixed table, 160
games. Two rules need an owner decision before the next run. Hunger is recorded with no limit,
and the stock ratio fails on every table.

**Options:**

- **(a) Hunger.** Pops lost to hunger a seat-game: the trader 5.36 on the mixed table, the other
  personalities 0.10 to 1.11; four masters 0.48 on Continental and 0.55 on Archipelago.
  - A: set a limit, such as a number of pops lost a seat-game.
  - B: call hunger a bot matter and keep recording it with no limit.
- **(b) The stock ratio.** The rule asks that the year-10 leader hold at most 2.5 times the
  laggard's stock of wood, stone, gold and food. It reads 5.0× and 7.0× on the masters tables
  and 17.1× on the mixed table. The laggard holds a median 1 to 3 units, since v2 realms spend
  what they earn, so the ratio reads an empty store.
  - A: keep it as written.
  - B: measure pops instead. The leader holds 1.6× the laggard's pops on both masters tables
    and 2.2× on the mixed table; the v1 baseline read 1.56× at round 10.
  - C: drop it and keep the year-5 income leader rule alone.

**Recommendation:**

- **(a) B.** The trader holds gold (Treasurer at the end of 113 of 160 games) and still starves.
  That is the bot not buying food with gold it has, a gap the
  [trade report](reports/simulation/2026-10-22-trade-paired.md) already found. The other builds
  lose under 1.2 pops a seat-game.
- **(b) B, with the same 2.5× limit.** Pops do not run down to zero the way stocks do, and the
  baseline recorded them too, so v1 and v2 compare. All three tables would pass today.

**Answer:**

## Q83 — Seven small calls on the 3D map

**Context:** The 3D map is the only board (owner, 2026-10-26). Its last review left seven
choices for the owner. Each is built one way so the map works today; nothing waits on them.

**Options:** what is built first, then the other way.

- **(a) Number keys.** Built: 1 to 5 switch the map mode, and the verb discs have no number
  keys, so each key does one thing. Other: the discs keep 1 to 6 and the modes move to
  Shift+1 to 5, or take 1 to 5 only while the map has focus.
- **(b) Names during a pick.** Built: when a pick asks for a settlement (Grow, the ladder,
  Build, Move, placing traded pops), the map rings the candidates, but at the opening zoom a
  colony's name stays hidden until you zoom in a notch. Other: show the name plates of the
  ringed tiles while a pick is armed.
- **(c) The compass.** Built: decoration. Turning needs the map focused and Q or E, and
  resetting needs 0, so a mouse player has no button for either. Other: the compass is a
  button that resets the view, with a tooltip naming Q and E, and perhaps two turn arrows
  beside it.
- **(d) The idle loop.** Built: with motion allowed, the waves, rafts, ships and gulls draw
  60 frames a second for as long as the map is on screen, 7 to 15% of the main thread in a
  dev build. Other: 30 frames a second while the camera is still, or a pause after some
  seconds without input.
- **(e) The focus ring.** Built: the keyboard's ring is one ochre band. On the ochre seat's
  tiles in Political it nearly vanishes (contrast 1.17:1). Other: a two-tone ring, an ink or
  ivory band round the ochre, or a ring colour per mode.
- **(f) Trade key wording.** Built: an open good beside unsettled land reads "a Port on hex
  −3,0 takes it", though the board shows no coordinates. Other: name the place by what is
  there ("the 3-wood forest by Pearls"), or say "a Port founded beside it".
- **(g) Unrest chip over a name.** Built: in Unrest, late in a game, a capital's chip can
  cover half of a neighbouring colony's name a notch or two past the opening zoom. Other:
  leave colony plates out of Unrest, as Trade does, or push the covered plate down.

**Recommendation:** keep (a): the modes are the map's own controls and the discs are a click
away. Build (b), (c) and (e): each is small, and each fixes something a player can miss.
(d): 30 frames a second while the camera is still, which keeps the sea moving at half the
cost. (f): "a Port founded beside it". (g): leave colony plates out of Unrest; the chip
already names the realm.

**Answer:**
