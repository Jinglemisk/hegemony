---
status: blocked
phase: "4"
updated: 2026-07-26
---

# Luxury Goods — feature plan & open decisions

> **Status 2026-07-26 · blocked by Phase 3.5 · nothing built yet.**
> This file is the **single source** for luxury-goods mechanics. It absorbs
> `docs/archive/plans/terrain-economy.md` §6 and the appendix's Q31/Q32.
>
> **Owner decisions folded 2026-07-26 (from `questions.md`):** luxuries are
> **all coastal, no land goods** (Q44/Q45); each is **unique** with a per-player active
> cap (Q45); acquisition is the **Port only — the land Trader is retired** (owner call
> 2026-07-26); goods sit at a **shared two-tile vertex** and are claimed by the **first
> Port on either adjacent tile** (Q31 + owner call); happiness is a **standing offset**
> (Q43) that **counts toward _Beloved_** (Q44); goods are **tradable** (Q49); the Port is
> the **coastal-gated exception** with an authoritative blocked reason (Q47). **Still
> open: the Port's price and the gold-sink question (Q46), the exact roster/count (Q32),
> and denial timing (Q48).**

---

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                   |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | Unique claims, authoritative happiness calculation (incl. _Beloved_), legality, costs, suppression lifecycle, overrides, tests      |
| Frontend         | Yes      | Port build/claim choices, blocked reasons, raw/bonus/effective happiness, owned goods, the shared-vertex map marker, Codex rules    |
| Simulation & AI  | Yes      | Real legal execution, Port valuation and planning, luxury-aware unrest + Beloved evaluation, telemetry, and sink/threshold campaigns |

Sibling engine calculations, every happiness surface, and every simulation
projection must share authoritative selectors rather than restating luxury rules.

## 0. Where this sits

**Phase 4.** With land goods removed (owner, 2026-07-26), luxuries are **coastal-only**,
so the coastal + shared-vertex map work is now a **prerequisite** — there is no longer a
"ships without any coast" MVP. Build order:

`isCoastalTile` → **topology** (S) → **shared-vertex geometry** (M, new) →
**coastal luxuries + Port** (L) → player trade (XL, last or v2).

Two things gate the first line of code:

- **Phase 3.5 lands first.** The sim's `evaluateSmart` uses a _linear_ happiness penalty
  (`src/sim/policies.ts:209,283`) that cannot see the −5/−10 riot cliff, so any luxury A/B
  run today would measure the bot's flaw, not the feature. Luxuries are a happiness
  feature; they are exactly what that bug blinds.
- **`<EffectLine>` shipped in Phase 3.5** (PR #49) as the shared effect seam. Luxuries are
  new content — they use it, they don't fork it.

**Build rule carried from Phase 3-C:** teach the sim bot the new verb **in the same slice**.
The `political` bot shipped after the Assembly and promptly reported the layer as a net
loss — half of that was design, half was "the bot doesn't know the verb exists." Don't
repeat it with the Port.

**⚠ The gold-sink premise now needs a decision (Q46).** Luxuries were slotted first in
Phase 4 because they were meant to be the **gold sink** the deferred Buildings pass and
Market/bank pass are blocked on (`docs/archive/todo.md:15-27`). That sink was the
**100-gold Trader** — now retired. The Port's provisional price is only **10 gold**, which
is not a gold sink. So either the **Port is re-priced with a real gold cost** (making it the
sink), or luxuries stop being the gold sink and the Buildings/Market pass needs a different
one. **This is the central open question — see Q46.**

---

## 1. Source context (`Hegemony.pdf`) — and where we diverge

- The PDF has 6 coastal Luxury Goods reached by a **Port**, plus 3 land goods via a
  **Luxury Goods' Trader**, each giving its owner a permanent unrest relief.
- **We diverge (owner, 2026-07-26):** there are **no land goods and no Trader** — every
  luxury is coastal, unique, and claimed by a Port. The PDF's land path is dropped.
- One National Idea starts a player with luxury access in their Capital (Phase 5 —
  Q34; leave the hook open, now Port-flavoured rather than Trader).
- Resolution concepts already name **Deny Luxury Good** and **Blockade Player Port**, so the
  model must leave room for temporary denial (§3.5, Q48).

---

## 2. What changed since this plan was written

The plan predates the Phase 1–3 engine, and the 2026-07-26 owner decisions. Corrections:

| The old plan said                                                          | Today                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two acquisition paths (land Trader + coastal Port)                         | **One path — the Port.** Land goods and the Trader are **removed** (owner, 2026-07-26). All luxuries are coastal.                                                                                                            |
| Coastal goods attach to **rim edges** as a feature ring (Q31 rec)          | **Overridden.** A good sits **offset from the shared vertex of two coastal tiles**, with a clear icon, so a Port on **either** adjacent tile can claim it (owner, 2026-07-26). See §3.2.                                     |
| Claim rules go in `src/game/rules.ts`                                      | `rules.ts` is a 52-line **barrel**. Validators → `status.ts`, mutators → `actions.ts`, enumeration → `legalMoves.ts`, income → `economy/income.ts`                                                                          |
| "The prototype uses only the 37 inland hexes"                              | **18 of the 37 are already coastal** — `isCoastalTile` (`map.ts:48`) drives coastal leapfrog, and the SVG coastline is drawn _topologically_ (`hexGeometry.ts:133`). No canvas rewrite; the **shared-vertex marker is new** |
| "Happiness bonus is never banked (effective happiness)"                    | **Resolved (Q43): standing offset.** `effective = stored + active × 2`; the stored bank never grows from luxuries.                                                                                                          |
| Luxuries do **not** count toward _Beloved_                                 | **Overridden (Q44): they DO count.** Effective happiness feeds the _Beloved of the People_ metric.                                                                                                                          |
| "9 named goods" + "diminishing duplicates"                                 | **Unique only, no duplicates** (Q45). Count is coastal-only now and **still open** (Q32).                                                                                                                                   |
| Trader cost 100 gold is the gold sink                                      | **Trader retired.** The gold-sink role is unresolved — it must move to the **Port price** or elsewhere (Q46).                                                                                                               |

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

Every one of them is a **flow into a stored bank**. The luxury **standing offset** (Q43) is
a new concept in the engine — it adjusts _effective_ happiness for threshold and _Beloved_
tests without ever touching the stored bank.

---

## 3. The design as it stands

### 3.1 What a luxury is

A **named, physical, unique object on the board**, owned by exactly one player, that raises
that player's **effective** happiness floor for as long as it is held and active. It is
**not** a resource, **not** banked, and **costs no building slot itself** — the Port that
claims it costs the slot, the good does not.

Luxuries are the **scaling tier of happiness** — above the Temple, below nothing:

- Temple → early insurance, cheap, eats a slot.
- Luxury → late-game infrastructure, coast-gated, permanent, no slot.

Their design job is to make a **slave economy runnable**: slaves pay −0.5 happiness each per
turn, so 3 luxuries at +2 offsets 12 slaves. That is the intended fantasy — not "buy calm,"
but "buy the _right to expand ugly_."

### 3.2 One acquisition path — the Port, and shared-vertex placement

Every luxury is **coastal**. It sits at a fixed **offset from the shared vertex of two
coastal tiles**, drawn with a clear icon, positioned so **either** of the two adjacent
tiles can reach it.

| Building                                                   | Cost                | Claims                                                                                    |
| ---------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| **Port** — a building in a settlement on a coastal tile    | **open — Q46**      | one unclaimed luxury at a shared vertex of the settlement's tile; **first Port claims it** |

**Claiming rule (owner, 2026-07-26):** a luxury between tile A and tile B is claimable by a
Port in a settlement on **A _or_ B**. Because goods are **unique** (§3.4), the **first Port
built wins** — they are contested race objects with a real clock, exactly the monopoly
intent. The Port is **coast-gated** (Q47): building it on a non-coastal settlement is
refused with an authoritative reason the UI renders.

### 3.3 The happiness effect — standing offset (Q43)

```text
Effective Happiness = stored happiness + (active luxuries × 2)

Base Happiness:      -7
2 active luxuries:   +4
Effective Happiness: -3      →  above the −5 riot line
```

The stored bank **never** grows from luxuries; the relief is a **standing floor**, read by
the riot/revolt threshold tests and — per Q44 — by the **_Beloved of the People_** victory
metric.

### 3.4 Monopoly and caps

- **One good, one owner** — the core rule. This is what makes luxuries the natural currency
  of player trade (Q33) and worth denying.
- **Per-player active cap ~3** (dial). Goods held over the cap stay **owned but inactive** —
  a trade asset, not dead weight.
- **No duplicates** — every good is unique, so there is no second-copy case (Q45 resolved;
  `terrain-economy.md` §6's "diminishing duplicates" is dropped as unreachable).

### 3.5 The denial seam

Every claim carries `active: boolean` and `suppressedTurns: number` **from day one**, even
though nothing suppresses them yet. Cheap now, and it is the difference between "add a
Directive" and "re-model claims" when the Assembly deck is re-cut (Q48 — deferred).

---

## 4. Implementation plan

The land-Trader slice is **gone**; coastal work is the whole feature.

### Slice 1 — topology + the shared-vertex marker

1. **Topology.** `isCoastalTile` (`map.ts:48`) already marks the 18 rim tiles; remove the
   radius-3 assumption engine-side so the board can change shape later.
2. **Shared-vertex model (new).** A luxury's board position is a pair of adjacent coastal
   tiles + a fixed offset from their shared vertex — not a `HexTile`, not settleable, no
   slot. Enumerate the eligible vertices from the coastal-tile adjacency graph.
3. **Marker (new frontend primitive).** Draw the icon at the vertex offset over the SVG map;
   it must read as belonging to *both* tiles. Accessible label names the good and its owner.

### Slice 2 — the Port, claims, and the happiness bonus

1. **Types** (`src/game/types.ts`) — `LuxuryGoodId`, `LuxuryGoodDefinition { id, name }`
   (all coastal — no `source` field), and a **board-level** claim list on `HegemonyState`:
   ```ts
   interface LuxuryClaim {
     goodId: LuxuryGoodId;
     owner: PlayerId;
     tileId: string; // the settlement (with the Port) that claimed it
     active: boolean;
     suppressedTurns: number; // denial seam — 0 today
   }
   ```
   Board-level, **not** on `PlayerState`: a good is a physical object with exactly one
   owner, and that invariant is far easier to hold in one list than across four player
   buckets. Denial effects mutate the list, not a player.
2. **Content** (`data.ts` + `content.ts`) — a `LUXURY_GOODS` table behind a
   `getLuxuryGoods()` accessor, so the dev content-override seam covers it like
   `getBuildings()`.
3. **Building** — `port` joins `BuildingId` and `BUILDINGS`, `maxLevel: 1`, **empty
   `effects` array** (its effect is the claim, not an income line), **coast-gated**.
4. **Legality** (`status.ts` `getBuildBuildingStatus`, enumerated at `legalMoves.ts:612`) —
   a Port is buildable only on a **coastal** settlement adjacent to an **unclaimed** luxury,
   while the player is under the active cap. The `ActionStatus` reason string carries the
   _why not_ (inland, no unclaimed luxury, cap reached) so the UI greys it out with an
   explanation instead of silently hiding it.
5. **Claim** (`actions.ts` `buildBuilding`) — building a Port claims one adjacent unclaimed
   luxury; if two are reachable, a **player-choice** picker (ladder-target / riot-concession
   modal precedent). First Port wins a contested good.
6. **The effect** — a new `src/game/luxury.ts` exporting `luxuryHappinessBonus(G, playerID)`
   and `activeClaims(G, playerID)`, read by the two threshold tests in `applyUnrestUpkeep`
   (`unrest.ts:55-59`), the tier in `unrestStatus`, the ledger readout, **and now
   `victoryMetricValue` for _Beloved_ (Q44).**
7. **Dials** — a `luxury` block on `EconomyRules` (`ruleset.ts`) so `?tune` picks every
   number up for free (§5).
8. **UI** — Port on the build surfaces (`BuildingsTab.tsx`, `BuildingChip.tsx`,
   `SettlementCard.tsx`); a claimed-goods row in the player dossier (`EmpireIntelPanel.tsx`);
   the shared-vertex marker on the map; and **wherever happiness is shown, show all three
   numbers**: raw, luxury bonus, effective. Every effect string goes through `<EffectLine>`.
   _Legibility is a hard requirement, not polish._
9. **Codex** — a rulebook section (`rulebook.tsx`), rendered live from `ruleset.ts`.
10. **Sim** — a telemetry line (`src/sim/telemetry.ts`): Ports built, goods held,
    happiness-from-luxury, _Beloved_ contribution, and **end-of-game banked gold**; and
    `policies.ts` must value the Port (contested-claim timing + happiness), on top of the
    3.5 eval fix.
11. **Art** — coastal-good icons via the project's image-generation + background-removal
    pipeline, into `assets/`.

### Tests (`src/game/luxury.test.ts`)

- A claimed good **never mutates** `resources.happiness` (the does-not-bank invariant).
- Effective happiness moves the riot threshold in `applyUnrestUpkeep` **and** the _Beloved_
  metric (Q44).
- One good, one owner: a second claim on a claimed good is refused; first Port wins.
- The Port is unbuildable inland and when no adjacent luxury is unclaimed, each with a reason.
- The per-player active cap holds; goods over it are owned-but-inactive.
- `suppressedTurns > 0` removes the bonus and restores it on expiry.

---

## 5. Proposed ruleset block

```ts
// EconomyRules.luxury — every number a ?tune dial
luxury: {
  happinessPerGood: 2,
  activeCapPerPlayer: 3,
  countsTowardBelovedCard: true,   // Q44 — luxuries DO count
  coastalGoods: 6,                 // Q32 — count still open
  portCost: { /* open — Q46: must carry a real gold cost to be the sink */ }
}
```

---

## 6. The named roster

Unique coastal goods. Count is **open (Q32)** — the six below are the PDF's coastal set;
the three former land goods are dropped, and whether to re-add coastal replacements is part
of Q32.

| Good           | Flavour             |
| -------------- | ------------------- |
| **Tyrian Dye** | the murex trade     |
| **Pearls**     | deep-water diving   |
| **Coral**      | reef harvest        |
| **Glassware**  | eastern kilns       |
| **Incense**    | the southern routes |
| **Fine Linen** | riverine weaving    |

---

## 7. Open owner questions

Context, options, and answer slots live only in [the owner question queue](../questions.md).
The 2026-07-26 decisions are folded above; what remains open:

| ID                                                                                   | Decision                                                                   |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [Q46](../questions.md#q46--what-is-the-ports-price-and-is-it-the-gold-sink)          | **The Port price + the gold-sink question** (100-gold Trader retired)      |
| [Q32](../questions.md#q32--is-the-coastal-luxury-roster-accepted)                    | The coastal roster and its count                                            |
| [Q48](../questions.md#q48--should-luxury-denial-ship-now-or-only-its-state-seam)     | Denial seam vs. shipping a Directive (deferred — "discuss later")          |

---

## 8. Phase-4 exit checks for this feature

- **The sink bites** — end-of-game banked gold drops materially against the pre-luxury
  baseline. (Contingent on Q46 giving the Port a real gold cost.)
- **The happiness economy holds at the ledger's caps** — luxuries relieve unrest without
  retiring it; riots still happen to expansionist players; _Beloved_ stays winnable but not
  trivially bought.
- **A tester can see why** — raw / luxury / effective happiness visible wherever the number
  appears, the shared-vertex marker legible, every effect string through `<EffectLine>`.
- **The bot understands the verb** before any luxury A/B is trusted.

## 9. Post-implementation cleanup requirement

Once implemented, **ask the owner explicitly** whether to delete this file or fold its
settled rules into `docs/reference/v0.1-rules-spec.md` + the balance ledger.
`terrain-economy.md` §6's luxury bullets should be reduced to a pointer here at the same time.
