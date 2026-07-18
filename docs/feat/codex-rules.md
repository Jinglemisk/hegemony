# Codex — the whole rulebook, in the game

**Status:** planned (owner ask, 2026-07-18). Grows the Codex from a numbers reference
(Dice Tables / Bank / Decks / Costs) into the **complete in-game rulebook**, so a player
never has to leave the board — or open `rules.md` — to learn or check how the game works.

**Shipped 2026-07-19 (feat/consult-polish), ahead of the rulebook content:**
- **Navigation** — the header is now two tiers: the section chips, then a *sticky
  sub-entry jump strip* for the active section, tracked by a scroll-spy. This is the
  navigation the sections below need; it landed early because the four current sections
  already had unreachable sub-chapters (Costs alone has seven). NOTE: implemented as a
  **sticky top nav**, not the "left-hand section index" sketched below — the consult
  panel is only ~240–290px wide, so a persistent side column would starve the content.
  When the section list grows toward a dozen, revisit whether the tier-1 chips need to
  become a collapsible outline; the jump strip already scales (it only ever lists the
  active section's entries).
- **Deck faces** — the Decks section renders the cards' painted art
  (`assets/event-cards/*.webp`) two-up, replacing the text-only rows.

Companion to the two-panel work: the Codex is the **destination** for the prose deep-links
(two-panel.md piece 4). Build the rulebook, and every rule term in every card, chronicle
line and modal becomes a link into it.

---

## The one invariant: the Codex renders FROM the engine, never beside it

Today's Codex sections already hold to this — the bank rates come off `G.bank`, the costs
off `G.ruleset`, the decks off the content tables, the tables off the same `EventTableRows`
the live modals use. **Nothing is hand-transcribed, so the Codex can never quote a number
the engine doesn't actually use.** The rulebook must keep that law as it grows:

- **Every number is sourced.** Capacities, thresholds, minimums, income coefficients,
  costs, slot counts, deck sizes — each pulls from `G.ruleset` / the content data at render
  time. A rule that says "citizens eat 2 food" reads `ruleset.popIncome.citizens.flat.food`,
  so a ruleset patch (a mode, a tuning-panel override) rewrites the rulebook for free.
- **Prose is the only hand-written part**, and it holds no numbers — it explains the
  *shape* of a rule (why hills are yield-less, how the ladder climbs) and lets sourced
  values fill the blanks. Think templated sentences, not static paragraphs.
- **This is also the anti-drift fix for `rules.md`.** Right now the player guide (`rules.md`)
  and the game are two hand-kept copies that already disagree in places. The end state: the
  narrative prose lives in ONE content module; the Codex renders it in-game, and `rules.md`
  is *generated* from the same source (a sim/build step), so they cannot drift. Port into
  the Codex first; wire the `rules.md` generator second.

## Structure — sections, in learn-order then reference-order

A navigable index inside the Codex card (the flat horizontal tab row doesn't scale to a
dozen sections). *Shipped as a sticky two-tier top nav — section chips + a scroll-spy'd
sub-entry jump strip — rather than a left-hand column, which the ~240–290px panel is too
narrow to afford (see Status).* Proposed sections, each a data-aware page:

1. **How to win** — the victory race qua *rule* (the 5 cards, `ruleset.victory.minimums`,
   "hold N at your turn start", the deck-exhaustion failsafe). This is the entry removed
   from the live Victory tab (owner: "victory has its own tab, need not be in codex unless
   qua rule"). It documents the rule; the live standings stay in the Victory consult tab.
2. **The board** — terrain kinds, their yields and slot counts, hills (yield-less,
   slot-rich) and the oracle (unsettleable). Sourced from the terrain data + `resourceVisuals`.
3. **Resources** — the six, first-order (land) vs second-order (pops/trade), what each buys.
4. **Population** — citizens / freemen / slaves: what each earns and eats (from
   `ruleset.popIncome`), the capacity model (`ruleset.settlements`, the Aqueduct).
5. **Settlements** — capital / city / colony: capacities, slot bonuses, what can build,
   founding & upgrade rules.
6. **The turn** — income → actions → end turn; the verb menu; per-turn throttles.
7. **Growing & the ladder** — grow costs, the promote/demote ladder, the Gymnasion.
8. **Buildings** — the roster, costs, effects, `maxLevel` caps (folds in today's *Costs*).
9. **Happiness, food & unrest** — the food-shortage pressure, stockpile calm cap, the
   unrest thresholds and the riot table (`ruleset.economy.unrest`; folds in *Dice Tables*).
10. **Seasons & the deck** — the seasonal clock, the yearly omen, event decks (folds in
    today's *Decks*).
11. **The bank** — exchange rates & the spread (today's *Bank*).
12. **Ventures** — the three expeditions, stakes, EV framing.

The four current sections aren't lost — they become the reference tail (8–12) under the
new narrative head (1–7).

## Addressing — every section and term has a stable id

The Codex already addresses its data entries by real ids (resource / building / pop / table
keys), never a hand-kept registry — that's what keeps it rendering from the ruleset. Extend
that to **concept ids** for the narrative sections (`concept:unrest`, `concept:ladder`,
`concept:victory`, …). Then:

- A deep-link (two-panel piece 4) is `route.entry = "concept:unrest"` or `"building:villa"`;
  the Codex opens to that section and scroll-highlights the entry (the route model's `entry`
  + `scroll` fields, already laid in).
- `AnnotatedText`'s `TOKEN_MAP` already types resource/pop/building words; add the concept
  nouns ("happiness", "unrest", "ladder", "season") so those become links too — one change,
  live everywhere prose appears.

## Sequencing

**Buildable now (independent of Phase 3):**
1. **Content module** — a `rulesContent` structure: ordered sections, each a title + id +
   templated prose with `{sourced}` slots resolved against `G.ruleset`/data at render time.
2. **Section index + the narrative pages** — ~~render the module in the Codex with a left
   index~~ the navigation shipped 2026-07-19 (sticky top nav, see Status); this step is now
   just *rendering the narrative content module through it* and folding the four existing
   sections in as the reference tail. Ship **How to win** first (it closes the "victory qua
   rule" loop the owner opened). The jump strip already reads its entries from data, so each
   new section becomes navigable for free.

**Lands with Phase 3 / two-panel piece 4:**
3. **Deep-link arrival** — concept ids in `TOKEN_MAP`, open-to-entry + scroll-highlight via
   the route's `entry`/`scroll`.

**Later:**
4. **`rules.md` generator** — emit the player-guide markdown from `rulesContent` so the two
   can't diverge. Retire the hand-kept `rules.md` body.

## Non-goals

- Not an interactive tutorial — it's reference you *consult*, consistent with the right rail.
- Not a duplicate of live state — standings, your own income breakdown, and the live event
  tables stay in their own surfaces; the Codex documents the *rules*, showing live values
  only where the value *is* the rule (this board's bank rates, this game's minimums).
- Not a re-theme — this is content + navigation inside the existing consult card.
