---
status: ready
phase: "3.5"
updated: 2026-07-26
---

# Low-number core economy tuning preset

- **Status:** APPROVED FOR IMPLEMENTATION · scheduled in Phase 3.5
- **Decision date:** 2026-07-26
- **Preset ID:** low-number-core-v1

## 1. Decision

Add a development-only, one-click tuning preset implementing the agreed **84% cutoff**
of the low-number economy study. It compresses ordinary production, costs, growth,
buildings, terrain, events, riots, expeditions, and Assembly participation costs. It
deliberately does not transform Assembly resolution cards or politician effects.

This is an experimental playtest instrument, not a replacement for the standard rules
and not a production game mode. Activating or removing it starts a fresh game on the
same seed for direct A/B testing.

The engine and TypeScript content are authoritative. Hegemony.pdf is outdated and
supplies no values. The derivation and existing evidence are in
[the low-number economy report](../reports/simulation/2026-07-25-low-number-economy.md).

## 2. Scope boundary

The preset includes:

- starting resources, population, capacities, growth, victory, actions, income, bank,
  civic calm, ladder, ventures, and food pressure;
- building costs, effects, supported-pop counts, and copy limits;
- the complete 37-tile terrain deck, with producing yields compressed to 1–3;
- seasonal/player-event effects and player-deck weights;
- riot, expedition, insurance, and yearly-omen table values;
- compressed Assembly draw, redraw, repeal, bribe, and veto costs;
- an explicit engine-backed zero floor for wood, stone, gold, and influence.

The preset excludes:

- all Assembly resolutions, Laws, Directives, and politician effects;
- the candidate Law-cap reduction: the Law cap remains 6;
- dominance, coup, voting, politician-deck, or Assembly timing changes;
- cohort production, productive jobs, pop-type caps, or any other population/income
  decoupling experiment;
- registration in GAME_MODES, production UI, permanent default changes, and final
  balance approval.

No job or type slots may be introduced. Five citizens, freemen, or slaves in one
settlement remain legal when total capacity permits them.

## 3. Locked values

### 3.1 Terrain

Keep every tile identity, terrain, slot count, ordering, Oracle, and settlement rule.
Change only producing yields:

| Resource | Current → preset mapping | Preset distribution | Board total |
| -------- | ------------------------ | ------------------- | ----------: |
| Wood     | 1→1, 2→1, 3→2, 4→2       | 1×10, 2×5           |          20 |
| Stone    | 2→1, 3→1, 4→2, 6→3       | 1×5, 2×2, 3×1       |          12 |
| Food     | 2→1, 4→2, 6→2, 8→2, 10→3 | 1×1, 2×6, 3×1       |      **16** |

The deck remains 37 tiles. Every producing tile yields 1, 2, or 3.

### 3.2 Opening, settlements, and population

| Lever                               |        Preset |
| ----------------------------------- | ------------: |
| Starting wood / stone / gold / food | 9 / 5 / 4 / 6 |
| Starting influence / happiness      |         0 / 0 |
| Capital or city placement pops      |             2 |
| Colony placement pops               |             1 |
| Capital/city base capacity          |             5 |
| Colony base capacity                |             2 |

| Pop     | Growth cost     | Recurring effect per pop                  |
| ------- | --------------- | ----------------------------------------- |
| Slave   | 3 food          | +1 tile material, −1 food, −0.5 happiness |
| Freeman | 4 food          | +1 gold, −1 food                          |
| Citizen | 5 food + 1 gold | +1 gold, +1 influence, −1 food            |

All other settlement and placement rules remain standard.

### 3.3 Actions, buildings, and victory

| Action                 | Preset cost               |
| ---------------------- | ------------------------- |
| Found colony           | 9 wood + 1 food           |
| Upgrade colony to city | 9 wood + 6 stone + 3 food |

| Building    | Preset cost      | Effect per copy                          | Max |
| ----------- | ---------------- | ---------------------------------------- | --: |
| Marketplace | 6 wood           | +1 gold for 1 freeman                    |   2 |
| Temple      | 5 stone          | +1 happiness; +1 influence for 1 citizen |   2 |
| Workshop    | 6 wood           | +1 tile material for 1 slave             |   2 |
| Granary     | 6 wood + 2 stone | +1 food; −1 growth-food cost             |   2 |
| Forum       | 4 wood + 4 stone | +1 influence                             |   2 |
| Aqueduct    | 7 stone          | +2 capacity                              |   1 |
| Odeon       | 2 wood + 5 stone | +1 happiness                             |   2 |
| Villa       | 6 wood + 2 gold  | +1 tile material                         |   1 |
| Gymnasion   | 2 wood + 7 stone | −1 promotion cost                        |   1 |

Pop-supporting building effects use supportedPops: 1. Other structural fields retain
their authored values.

| Victory minimum          |    Preset |
| ------------------------ | --------: |
| Cities / pops / citizens | 3 / 8 / 6 |
| Material stockpile       |        40 |
| Happiness / Voice        |    10 / 2 |
| Cards to win             |         3 |

### 3.4 Economy and civic costs

| Lever                    | Preset                                 |
| ------------------------ | -------------------------------------- |
| Bank baseline            | sell 2 / buy 2                         |
| Abundant                 | sell 3 / buy 2                         |
| Scarce                   | sell 2 / buy 3                         |
| Civic calm               | +2 happiness for 2 influence or 3 gold |
| Promote slave / freeman  | 2 food / 2 gold                        |
| Demote citizen / freeman | 1 influence / 2 influence              |
| Venture stake            | 2 gold or 3 wood                       |
| Food-stockpile happiness | +1 per 3 food, cap +1                  |
| Food-deficit threshold   | net food ≤ −1                          |

Standard demotion happiness penalties and omitted unrest settings remain unchanged.

### 3.5 Assembly boundary

Only resource-denominated participation costs change:

| Lever               |          Preset |
| ------------------- | --------------: |
| First draw / redraw | 1 / 1 influence |
| Repeal              |     2 influence |
| Bribe               |     3 influence |
| Veto                |     2 influence |

The Law cap remains 6. Every other Assembly ruleset value and every resolution and
politician object must be deeply equal to active standard content. This overrides the
study candidate's provisional Law cap of 4 and its Assembly-content transforms.

### 3.6 Events and tables

For a non-zero magnitude:

    scaled(value, divisor) =
      sign(value) × max(1, round(abs(value) / divisor))

Apply this to cloned event content:

- ordinary resource deltas and action discounts: divisor 3;
- happiness and timed-happiness deltas: divisor 2;
- scaled resource/happiness effects: magnitude divisor 2, step ceil(step / 2), and
  minimum-magnitude divisor 2;
- income modifiers: divisor 3, except happiness uses 2;
- added pops: max(1, ceil(amount / 2));
- exchange maximums: max(1, round(maxAmount / 2));
- per-pop resource effects: keep per-pop amount and halve only their minimum;
- preserve multipliers, durations, scopes, targets, and other structural fields;
- recursively transform every choice option.

Keep the player-event deck at 83 cards and set:

| Card ID                  | Count |
| ------------------------ | ----: |
| player-new-citizen       |     2 |
| player-free-settlers     |     2 |
| player-captured-laborers |     2 |
| player-citizenship-rolls |     6 |
| player-willing-hands     |     6 |
| player-slave-auction     |     4 |

All other counts remain authored. The deck retains 21 harmful copies.

For riot and expedition tables:

- resource gains/losses use divisor 3, except happiness uses 2;
- gain-pop food fallbacks use divisor 2;
- insurance costs use divisor 3, except happiness uses 2;
- pop/building loss, rolls, modifiers, row order, and targets stay atomic.

Yearly omens remain their authored ±1. They still resolve through the active-content
seam so frontend and simulator consume the same package.

### 3.7 Stock floors

Add this ruleset field:

    EconomyRules.stockpileFloors:
      Partial<Record<Resource, number>>

The standard ruleset uses an empty map. This preset uses:

    { wood: 0, stone: 0, gold: 0, influence: 0 }

Apply floors through one authoritative player-resource mutation/normalization seam
whenever income, an event, or a table can cross a configured floor. Costs remain
affordability-gated and must not rely on post-payment clamping. Food can remain in
deficit and happiness remains an intentionally negative unrest ledger.

This replaces, rather than supplements, the study runner's floorSpendableStocks hook.

## 4. Implementation contract

### 4.1 Pure named preset

Define a shared preset registry under src/dev with this public shape:

    type TuningPresetId = \"low-number-core-v1\";

    type TuningPreset = {
      id: TuningPresetId;
      label: string;
      rulesetPatch: RulesetPatch;
      createContent(base: GameContent): GameContent;
    };

Move reusable candidate constants/transforms out of the simulator-only installer.
createContent must clone its input and return a fresh package every time. It must never
mutate authored buildings, terrain, events, cards, or table rows.

### 4.2 Reversible content registry

Extend the existing content seam to own active versions of buildings, terrain, seasonal
events, player events, riot table, expedition tables, and omen table.

Game creation, legality, riot/venture resolution, table lookup, Codex/reference views,
and UI previews consume these accessors. Missing overrides return authored content.
Clearing a preset restores authored content exactly. Content is fixed for one game's
lifetime and changes only before a fresh game is created.

Do not add Assembly content to the override package.

### 4.3 Tuning state and precedence

Keep the existing hegemony-dev-overrides map for backward compatibility. Store the
preset ID under a separate versioned local-storage key. Resolution order is:

    authored defaults
      → selected game mode
      → selected preset
      → manual tuning overrides

Preset-aware field helpers treat the preset value as the revert/default value. Manual
overrides persist when toggling the preset and display as Low-number core + N edits.
Reset clears both layers.

### 4.4 Frontend

Add a **Low Numbers · 20W / 12S / 16F** control to the development tuning panel.
Clicking toggles the preset and immediately invokes the existing same-seed reset. The
active state is explicit; no mid-game state is mutated.

The Phase 3.5 typed effect-presentation work is a prerequisite. At implementation,
src/ui/effects.ts, src/components/EffectLine.tsx, and the active-effect seams must
already exist. Render effective event/table values through them; do not create a
parallel formatter. Building summaries, terrain aggregates, Codex entries, tooltips,
and previews must show effective values.

### 4.5 Simulator

Add:

    --tune-preset low-number-core-v1

Unknown IDs fail clearly. A tune patch may be combined and applies after the preset,
matching browser precedence. Reports record preset ID, stable resolved-content hash,
and manual patch/hash separately.

Frontend and simulator import the same preset definition. Remove process-global
one-way mutation and runner-only flooring after shared behavior is covered. This
84% variant needs a new dated report because Assembly content and Law cap differ from
the original study candidate.

## Three-axis parity

| Axis             | Status     | Evidence                                                                                    |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------- |
| Engine / backend | Applicable | Pure resolution, reversible content, floors, unchanged standard behavior                    |
| Frontend         | Applicable | Same-seed toggle, effective presentation, persistence, reset                                |
| Simulation & AI  | Applicable | Shared preset/hash, deterministic real-engine execution, capability tests, named-policy A/B |

No new LegalMove is expected, but the exhaustive parity regression remains mandatory.
AI evaluators must read active rules/content; hardcoded standard-denomination
affordability or thresholds exposed by this preset must become authoritative queries.
Balance conclusions remain limited to the policies actually measured.

## 6. Implementation order

1. Land the canonical effect-presentation and active-effect seams.
2. Add the pure preset registry and stockpileFloors ruleset field.
3. Expand the reversible content registry and migrate included consumers.
4. Resolve the preset during game creation, then layer manual overrides.
5. Add tuning-panel activation, persistence, state, and same-seed reset.
6. Add simulator selection and hashes; remove simulator-only mutation/flooring.
7. Add engine, UI, parity, AI-capability, and standard-mode regression tests.
8. Run a new matched campaign and publish its dated report before human playtesting.

## 7. Acceptance

### Invariants and behavior

- Terrain is 37 tiles, totals 20 wood / 12 stone / 16 food, and yields are 1–3.
- Every core action/building cost component is at most 9.
- Opening stock is 24 wood/stone/gold/food with three pops, below every compressed
  victory minimum.
- The player deck is 83 cards with 21 harmful copies and the locked counts above.
- Assembly costs change while Law cap, resolutions, politicians, and derived Assembly
  decks/maps remain standard.
- Repeated activation/deactivation is idempotent and never mutates authored constants.
- Deactivation restores a same-seed standard game; activation preserves topology, tile
  identity, and deterministic shuffle order while changing yields.
- Manual overrides win; revert returns to preset; Reset clears both layers.
- Configured stocks do not finish a mutation below zero. Food deficit, negative
  happiness, and standard-mode behavior remain intact.
- Browser and simulator resolve identical rules, content, preset ID, and hash.
- Cards, tables, Codex, previews, and logs display applied mechanical values.

### Evidence gate

Run matched shuffled-board smart-policy A/B batches with at least 10 games × 120 turns
and the same seeds, plus deterministic AI capability scenarios. Target:

- observations with any two-digit spendable-resource income below 15%;
- mean race duration within 15% of matched standard, with turn caps disclosed;
- no negative configured-floor stock;
- growth, construction, expansion, trade, civic, venture, event, riot, and Assembly
  participation remain reachable.

Report population mean, median, p90, and net growth. Label evidence from policies without
full parity as applying only to those named policies.

Run:

    npm run check
    npm run docs:check
    npm run test:parity
    npm run lint
    npm run test:run
    npm run build

Browser verification covers preset on/off on one seed, effective values, manual edits,
Reset, and a complete event/table resolution.

## 8. Deferred final 16%

Assembly resolution and politician-effect conversion is deliberately deferred. It
requires a new owner decision or explicit amendment. Until then, late-game Assembly
outcomes may be large relative to this economy and every report must state that limit.

The high-population cohort-yield idea is also separate. If approved, implement it as a
second overlay so denomination compression and diminishing production can be measured
independently.
