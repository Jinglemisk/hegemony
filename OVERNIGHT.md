# OVERNIGHT.md — the 2026-07-13 night run

The user is asleep; this file is the contract for what gets built tonight and how it
gets reviewed in the morning. Branch: `feat/ui-refit` (continues; nothing here
collides with the refit's open questions Q17–Q19). **One commit per item** so any
single item can be reverted without touching the rest. One PR at the end.

## Step 0 — GATE (awake): map tile glyphs — **needs user approval before the night run**

Current: white/black squares = building slots, dark circles/pips = resource yield.
Change to text glyphs, both in white:

- **Top: `n/y`** — used/available building slots (e.g. `1/3`).
- **Below: `+n`** — the tile's resource yield, white with a background shadow /
  soft plate so it stands out against every terrain color.
- **Both glyphs scale up with their number** — a `+10` plains reads bigger than a
  `+1` hill at a glance.

Build → screenshot → **PAUSE and check in with the user** → only after approval,
run the rest overnight.

## Overnight items (approved 2026-07-13, in this order)

### 1. Deck overhaul (ledger P1 #5, P2 #10, P2 #12 — spec is in balance.html §VI)

- Halve the free-pop copies (New Citizen ×8, Free Settlers ×8, Captured Laborers ×6);
  convert the removed copies into **half-cost grow coupons** (the existing
  `actionCostDiscount` effect — keeps the theme, re-couples windfalls to food + capacity).
- Retune toward **EV ≈ +2** resource-equivalents per draw (from +4.8) and **~25% harm**
  (from 8%): shrink amounts, add harm copies.
- **One thematic harm card each for spring and summer** pools (floods, wildfire) so no
  season is auto-safe.
- Fix dominated choices: Caravan Contacts option B → 4 wood → 6 gold; Skilled Mason /
  Temple Donation discounts must beat the flat option's value or be replaced;
  Emergency Labor is the model shape (right pick depends on your ledger).
- Verify: EV/harm-share recomputed in a test (guards content edits); 20-game sim
  before/after on same seeds — race close-rate must not collapse; ledger issue rows
  updated + changelog entry.

### 2. Compendium v1 (locks Q18 with Claude's rec — refit will restyle, content survives)

- Entry: the **season icon** in the top bar + the `?` key.
- Sections, all read-only, all rendered FROM ruleset/content data (never hand-written):
  1. Victory cards with **live standings** per player.
  2. All four event tables via the shared EventTableModal render path (no roll button),
     with the new effect chips.
  3. This board's **bank rates** + one-line corridor explainer.
  4. **Deck lists**: seasonal cards with season-weighting notes; player deck as
     aggregate counts (never draw order).
  5. Costs cheat-sheet: actions, buildings, ladder, calm, venture stakes, riot insurance.
- Appendix Q18 gets marked answered-by-default (Claude's rec, user approved the build).

### 3. Yearly omen table — **PROVISIONAL, numbers want the user's eyes later**

- Each new year (spring, alongside the opener rotation), the year's opener rolls a
  public **d6 omen** for the whole table: a year-long, modest, symmetric modifier.
  Drama, not swing — target |EV| well under one tile's season output per player.
- Rides the event-table component: die size becomes table data (`die: 6` default);
  the omen is a fifth table in data.ts; shared modal announces it; the top bar shows
  the active omen chip; compendium lists the table.
- Effects reuse existing seams (income modifiers, happiness deltas, cost discounts).
  Mark PROVISIONAL in appendix + ledger changelog.

### 4. Civic buildings — "a bunch, not wacky", **from Hegemony.pdf**, compatible with today's game

- Read Hegemony.pdf's building list; port everything that works WITHOUT the Phase 2
  terrain rework or undesigned systems (no military, no luxury/port dependencies).
  Known candidates from the todo sketch: Aqueduct (+4 pop capacity), Forum
  (+influence). Take the PDF's own costs where stated; provisional otherwise.
- Honest flag (already accepted by the user): this jumps principle 3's "tier 2 ships
  with the terrain rework" — prices marked provisional, Phase 2 repricing expected.
- Each building: data row + BuildingEffect seams (extend the vocabulary only if a
  PDF effect genuinely needs it), Buildings tab UI (already data-driven), tests,
  sim check that build orders still diverge.

## Conventions for the run

- Gates per commit: `npm run check` + full vitest; sim smoke where behavior shifts.
- Docs ride each commit: balance.html changelog + issue rows, rules.md if
  player-facing, todo.md strikethroughs, appendix execution log at the end.
- Anything discovered-but-undecided goes in this file under "Morning questions,"
  never silently decided.
- At the end: push branch, open PR, update this file with a morning summary.

## Morning questions (Claude appends during the night)

- **Omen numbers (item 3, PROVISIONAL by design):** shipped as ±1 of one resource
  per income, table-wide, for the whole year (three ill / three fair, table EV 0).
  A ±1 income modifier over a 4-season year ≈ 16 resources per player — real texture,
  zero relative swing (symmetric). If that feels too loud in playtest, halve the
  duration (omen expires at autumn) rather than the amount; ±0 vs ±1 is the whole
  drama. Also: the omen consumes seeded rolls, so sim baselines across this commit
  are not seed-comparable.
- **Victory minimums vs the thinner deck** (from item 1's A/B): the race minimums
  (citizens 8, stockpile 80, happiness +10) were tuned against the old +4.9-EV deck.
  With the deck at +2.2 EV, 60-turn close events dipped 3/20 → 1/20 (leader progress
  within noise — 1.85 → 1.75 cards). If morning playtests feel grindy, the lever is
  **retune the minimums down**, not re-fatten the deck. No change made tonight.
