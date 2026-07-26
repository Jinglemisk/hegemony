---
status: blocked
phase: "4"
updated: 2026-07-26
---

# Luxury Goods — feature plan & open decisions

> **Status 2026-07-26 · blocked by Phase 3.5 and unresolved owner questions · nothing built yet.**
> This file is the **single source** for luxury-goods mechanics. It absorbs
> `docs/archive/plans/terrain-economy.md` §6 (the "scaling tier of happiness" amendments) and the
> appendix's **Q31 / Q32**, which are answered here now — `docs/archive/roadmap-appendix.md` keeps
> only a pointer. New questions raised by the reconciliation are **Q43–Q49** (numbering
> continues the appendix's, so nothing collides).

---

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                   |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Unique claims, authoritative happiness calculation, legality, costs, suppression lifecycle, content overrides, and behavioral tests |
| Frontend         | Yes      | Build/claim choices, blocked reasons, raw/bonus/effective happiness, owned goods, Codex rules, and accessible effect presentation   |
| Simulation & AI  | Yes      | Real legal execution, Trader/Port valuation and planning, luxury-aware unrest evaluation, telemetry, and sink/threshold campaigns   |

Sibling engine calculations, every happiness surface, and every simulation
projection must share authoritative selectors rather than restating luxury rules.

## 0. Where this sits

**Phase 4, re-scoped 2026-07-23** (`docs/roadmap.md:81`). Build order:
`isCoastalTile` → topology (S) → **luxury goods, land-trader slice** (M, _no coast needed_)
→ **coastal luxuries + Port** (L) → player trade (XL, last or v2).

Two things gate the first line of code:

- **Phase 3.5 lands first.** The sim's `evaluateSmart` uses a _linear_ happiness penalty
  (`src/sim/policies.ts:209,283`) that cannot see the −5/−10 riot cliff, so any luxury A/B
  run today would measure the bot's flaw, not the feature. Luxuries are a happiness
  feature; they are exactly what that bug blinds.
- **`<EffectLine>` is being built in 3.5 ahead of the Assembly rework** so new content is
  its _first consumer_ rather than a retrofit. Luxuries are the next new content —
  they use it, they don't fork it.

**Build rule carried from Phase 3-C:** teach the sim bot the new verb **in the same slice**.
The `political` bot shipped after the Assembly and promptly reported the layer as a net
loss — half of that was design, half was "the bot doesn't know the verb exists." Don't
repeat it with the Trader.

**Why this feature is first in Phase 4:** it is the **gold sink** the deferred Buildings
pass and Market/bank pass are both blocked on (`docs/archive/todo.md:15-27`). Gold today is earned
by pops (+2/citizen, +2/freeman per turn) against thin sinks — Villa 4g, civic calm 6g,
freemen→citizen promotion 4g, venture stakes.

---

## 1. Source context (`Hegemony.pdf`)

- 6 Luxury Goods distributed across **coastal** tiles; coastal resources are reached by
  building a **Port** in a City.
- 3 more are obtained **on land** by building a **Luxury Goods' Trader**.
- Every Luxury Good gives its owner a permanent **−2 Unrest**.
- One National Idea starts a player with a Trader in their Capital (Phase 5 — appendix Q34;
  leave the hook open).
- Resolution concepts already name **Deny Luxury Good** and **Blockade Player Port**, so the
  model must leave room for temporary denial (§3.5, Q48).

---

## 2. What changed since this plan was written

The plan predates the Phase 1–3 engine. Corrections:

| The old plan said                                                               | Today                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claim rules go in `src/game/rules.ts`                                           | `rules.ts` is a 52-line **barrel**. Validators → `status.ts`, mutators → `actions.ts`, enumeration → `legalMoves.ts`, income → `economy/income.ts`                                                                           |
| "The prototype uses only the 37 inland hexes"                                   | **18 of the 37 are already coastal** — `isCoastalTile` (`map.ts:48`) drives coastal leapfrog and the founding voyage, and the SVG coastline is drawn _topologically_ (`hexGeometry.ts:133`). No canvas rewrite is needed     |
| "Does not yet implement … the resolution effects that interact with them"       | The **Assembly shipped 2026-07-20**. Laws and Directives exist (`src/game/assembly/`), and Q40 (2026-07-23) makes **every Stratokles Directive player-directed** — the denial carrier now exists                             |
| "Happiness is the inverse pressure track for unrest"                            | Still true, and it has teeth: riot at **≤ −5**, severe revolt at **≤ −10** (`ruleset.ts:230-231`, `unrest.ts:55-59`). Happiness is **also a victory card** — _Beloved of the People_, minimum **10** (`victory.ts:33,51-52`) |
| "Luxury bonus is never banked (effective happiness)"                            | **Contradicted** by `terrain-economy.md` §6, which amended it to "+2 happiness **flow**". Both are on record. → **Q43**                                                                                                      |
| "9 named goods, one claimant each" + terrain-economy's "diminishing duplicates" | **Mutually unreachable** — unique goods with one owner each means nobody can ever hold two of a kind. → **Q45**                                                                                                              |
| "Use ChatGPT image generation tool to create its icons"                         | Stale — art goes through the project's configured image-generation and background-removal pipeline into `assets/`                                                                                                            |
| Building roster context                                                         | The roster is now **9 buildings** (`data.ts:222-298`), every one capped by `maxLevel`, and swappable through the `getBuildings()` content-override seam (`content.ts`) that the `?tune` panel drives                         |

**The happiness sources that already exist** — a luxury has to be priced against these:

| Source                                       | Shape          | Size                                |
| -------------------------------------------- | -------------- | ----------------------------------- |
| Temple (6 stone, 1 slot, max 2)              | flow           | +1/turn                             |
| Odeon (8 stone + 4 wood, 1 slot, max 2)      | flow           | +2/turn                             |
| Food stockpile                               | flow           | +1 per 5 stored food, **capped +2** |
| Civic calm (4 influence _or_ 6 gold, 1/turn) | one-shot       | +3                                  |
| Slaves                                       | flow           | **−0.5 per slave per turn**         |
| Over-capacity pops                           | flow           | −1 per pop over                     |
| Event/law timed modifiers                    | flow, expiring | varies                              |

Every one of them is a **flow into a stored bank**. There is no "standing offset" concept
anywhere in the engine today — which is the whole weight of Q43.

---

## 3. The design as it stands

### 3.1 What a luxury is

A **named, physical, unique object on the board**, owned by exactly one player, that raises
that player's happiness floor for as long as it is held and active. It is **not** a resource,
**not** banked, and **costs no building slot itself** — the _acquisition_ costs the slot
(a Trader or a Port), the good does not.

Per `terrain-economy.md` §6, luxuries are the **scaling tier of happiness** — above the
Temple, below nothing:

- Temple → early insurance, cheap, eats a slot.
- Luxury → late-game infrastructure, gold- or coast-gated, permanent, no slot.

Their design job is to make a **slave economy runnable**: slaves pay −0.5 happiness each per
turn, so 3 luxuries at +2 offsets 12 slaves. That is the intended fantasy — not "buy calm,"
but "buy the _right to expand ugly_."

### 3.2 Two acquisition paths

| Path                                                    | Cost                                      | Count                                                  | Slice |
| ------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------ | ----- |
| **Luxury Goods' Trader** — a building in any settlement | 100 gold (dial), `maxLevel: 1`            | **3 land goods exist for the whole table**             | A     |
| **Port** — a building in a settlement on a coastal tile | 20 wood / 5 stone / 10 gold (provisional) | claims 1 adjacent coastal feature; **6 coastal goods** | B     |

### 3.3 The happiness effect

**Open — Q43.** The plan's original reading:

```text
Effective Happiness = stored happiness + (active luxuries × 2)

Base Happiness:      -7
2 active luxuries:   +4
Effective Happiness: -3      →  above the −5 riot line
```

The stored bank must **not** grow by +2 every turn; the relief is a standing floor, not income.
Q43 puts the three candidate implementations side by side, because `terrain-economy.md` §6
already wrote it down the other way.

### 3.4 Monopoly, caps, and why they matter

- **One good, one owner** — the core rule. This is what makes luxuries the natural currency
  of player trade (appendix Q33) and worth denying.
- **Per-player active cap ~3** (dial). Goods held over the cap stay **owned but inactive** —
  a trade asset, not dead weight.
- **Diminishing duplicates** — inherited from `terrain-economy.md` §6, currently unreachable
  (Q45).

### 3.5 The denial seam

Every claim carries `active: boolean` and `suppressedTurns: number` **from day one**, even
though nothing suppresses them yet. Cheap now, and it is the difference between "add a
Directive" and "re-model claims" when the Assembly deck is re-cut (Q48).

---

## 4. Implementation plan

### Slice A — the land Trader (ships without any coast)

1. **Types** (`src/game/types.ts`) — `LuxuryGoodId`, `LuxuryGoodDefinition
{ id, name, source: "land" | "coastal" }`, and a **board-level** claim list on
   `HegemonyState`:
   ```ts
   interface LuxuryClaim {
     goodId: LuxuryGoodId;
     owner: PlayerId;
     via: "trader" | "port";
     tileId: string; // the settlement that holds it
     active: boolean;
     suppressedTurns: number; // denial seam — 0 today
   }
   ```
   Board-level, **not** on `PlayerState`: a good is a physical object with exactly one
   owner, and that invariant is far easier to hold in one list than across four player
   buckets. Denial effects mutate the list, not a player.
2. **Content** (`data.ts` + `content.ts`) — a `LUXURY_GOODS` table behind a
   `getLuxuryGoods()` accessor, so the dev content-override seam covers it exactly like
   `getBuildings()`.
3. **Building** — `luxuryTrader` joins `BuildingId` and `BUILDINGS`: `cost { gold: 100 }`,
   `maxLevel: 1`, **empty `effects` array** (its effect is the claim, not an income line).
4. **Legality** (`status.ts` `getBuildBuildingStatus`, enumerated at `legalMoves.ts:612`) —
   a Trader is buildable only while an **unclaimed land good remains** and the player is
   under the active cap. The `ActionStatus` reason string carries the _why not_, so the UI
   greys it out with an explanation instead of silently hiding it.
5. **Claim** (`actions.ts` `buildBuilding`) — building a Trader claims a land good. Which
   one is a **player choice** via a picker, following the existing ladder-target /
   riot-concession modal precedent.
6. **The effect** — a new `src/game/luxury.ts` exporting
   `luxuryHappinessBonus(G, playerID)` and `activeClaims(G, playerID)`. Under Q43(a) the
   bonus is read by exactly three engine sites — the two threshold tests in
   `applyUnrestUpkeep` (`unrest.ts:55-59`), the tier in `unrestStatus`, and the ledger's
   readout — and **explicitly not** by `victoryMetricValue` (Q44).
7. **Dials** — a `luxury` block on `EconomyRules` (`ruleset.ts`) so the `?tune` panel picks
   every number up for free (§5).
8. **UI** — Trader on the build surfaces (`BuildingsTab.tsx`, `BuildingChip.tsx`,
   `SettlementCard.tsx`); a claimed-goods row in the player dossier
   (`EmpireIntelPanel.tsx`); and **wherever happiness is shown, show all three numbers**:
   raw, luxury bonus, effective. Every effect string goes through `<EffectLine>`.
   _Legibility is a hard requirement, not polish_ — the state-of-the-game audit's finding
   was that invisible engine state corrupts human playtests.
9. **Codex** — a rulebook section (`rulebook.tsx`), rendered live from `ruleset.ts` so it
   cannot drift.
10. **Sim** — a telemetry line (`src/sim/telemetry.ts`): traders built, goods held,
    happiness-from-luxury, and **end-of-game banked gold** (the sink's actual measurement);
    and `policies.ts` must value the Trader, on top of the 3.5 eval fix.
11. **Art** — 3 land-good icons via the project's configured image-generation and
    background-removal pipeline, into `assets/` beside `resource-icons/`.

### Slice B — the coast (Port + 6 coastal goods)

1. **Topology first.** `isCoastalTile` (`map.ts:48`) already marks the 18 rim tiles; the job
   is removing the radius-3 assumption engine-side so the board can change shape later.
2. **A feature ring, not tiles** (Q31): coastal goods attach to rim tiles as features —
   never settleable, no slots, not `HexTile`s.
3. **`port`** joins the building roster, location-gated (Q47), claiming one unclaimed
   adjacent coastal feature.
4. Everything else — claims, caps, the bonus, the denial seam — is **already built by
   slice A**. Slice B adds no new concepts.

### Tests (`src/game/luxury.test.ts`)

- A claimed good **never mutates** `resources.happiness` (the does-not-bank invariant).
- Effective happiness moves the riot threshold in `applyUnrestUpkeep` — but the _Beloved_
  metric is unmoved (Q44).
- One good, one owner: a second claim on a claimed good is refused.
- The Trader is unbuildable when every land good is claimed, and the refusal carries a reason.
- The per-player active cap holds; goods over it are owned-but-inactive.
- `suppressedTurns > 0` removes the bonus and restores it on expiry.

---

## 5. Proposed ruleset block

```ts
// EconomyRules.luxury — every number a ?tune dial
luxury: {
  happinessPerGood: 2,
  activeCapPerPlayer: 3,
  countsTowardBelovedCard: false,   // Q44
  traderCost: { gold: 100 },        // Q46
  landGoods: 3,                     // Q45 — global, first-come
  // slice B
  coastalGoods: 6,
  portCost: { wood: 20, stone: 5, gold: 10 }   // PROVISIONAL — Q32
}
```

---

## 6. The named roster

9 unique goods — 6 coastal, 3 land. Deliberately kept to the PDF's count rather than
overbuilt before ports, denial and the happiness pass are done.

| Source      | Good                 | Flavour                 |
| ----------- | -------------------- | ----------------------- |
| Coastal     | **Tyrian Dye**       | the murex trade         |
| Coastal     | **Pearls**           | deep-water diving       |
| Coastal     | **Coral**            | reef harvest            |
| Coastal     | **Glassware**        | eastern kilns           |
| Coastal     | **Incense**          | the southern routes     |
| Coastal     | **Fine Linen**       | riverine weaving        |
| Land Trader | **Marble**           | stone / monument luxury |
| Land Trader | **Silverwork**       | gold / metal luxury     |
| Land Trader | **Wine & Olive Oil** | food / estate luxury    |

---

## 7. Open owner questions

The full context, options, recommendations, and answer slots live only in
[the owner question queue](../questions.md). This plan remains blocked until the
questions required by its current slice are answered.

| ID                                                                                   | Decision                                   |
| ------------------------------------------------------------------------------------ | ------------------------------------------ |
| [Q43](../questions.md#q43--how-do-luxuries-affect-happiness)                         | Happiness model                            |
| [Q44](../questions.md#q44--do-luxuries-count-toward-beloved-of-the-people)           | Beloved victory metric                     |
| [Q45](../questions.md#q45--what-are-the-monopoly-and-cap-rules)                      | Uniqueness, active cap, and land-good race |
| [Q46](../questions.md#q46--what-is-the-traders-price-and-placement-rule)             | Trader price and placement                 |
| [Q31](../questions.md#q31--should-coastal-luxuries-use-a-feature-ring-or-real-tiles) | Coastal geometry                           |
| [Q47](../questions.md#q47--may-the-port-be-location-gated)                           | Port location gate                         |
| [Q32](../questions.md#q32--is-the-luxury-roster-and-provisional-port-price-accepted) | Roster and provisional Port price          |
| [Q48](../questions.md#q48--should-luxury-denial-ship-now-or-only-its-state-seam)     | Denial seam                                |
| [Q49](../questions.md#q49--are-luxury-goods-tradable)                                | Transferability                            |

---

## 8. Phase-4 exit checks for this feature

- **The sink bites** — end-of-game banked gold drops materially against the pre-luxury
  baseline, and the Trader is a real decision against Villa / civic calm / promotions.
- **The happiness economy holds at the ledger's caps** — luxuries relieve unrest without
  retiring it; riots still happen to expansionist players.
- **A tester can see why** — raw / luxury / effective happiness visible wherever the number
  appears, every effect string through `<EffectLine>`.
- **The bot understands the verb** before any luxury A/B is trusted.

## 9. Post-implementation cleanup requirement

Once implemented, **ask the owner explicitly** whether to delete this file or fold its
settled rules into `docs/reference/v0.1-rules-spec.md` + the balance ledger. `terrain-economy.md` §6's
luxury bullets should be reduced to a pointer here at the same time.
