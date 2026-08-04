---
status: blocked
phase: "4"
updated: 2026-08-03
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
> the **coastal-gated exception** with an authoritative blocked reason (Q47).
>
> **Folded 2026-07-27:** no dedicated gold sink is needed — gold already sinks into
> actions and market trade, so the Port stays cheap (Q46). The roster is the **six**
> coastal goods (Q32). Ship **stable claims + the suppression/derived-activity seam now**; add
> suppression Directives later via the Assembly (Q48). All owner questions resolved.
>
> **Architecture reconciliation 2026-08-03:** Phase 3.6 is now a prerequisite. Luxury
> goods use stable asset and settlement ids, one universal ownership-transfer operation,
> per-match content, canonical commands, and derived activity. They never store a second
> `active` truth that can disagree with ownership, caps, or suppression.

---

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                    |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Engine / backend | Yes      | Unique claims, authoritative happiness calculation (incl. _Beloved_), legality, costs, suppression lifecycle, overrides, tests       |
| Frontend         | Yes      | Port build/claim choices, blocked reasons, raw/bonus/effective happiness, owned goods, the shared-vertex map marker, Codex rules     |
| Simulation & AI  | Yes      | Real legal execution, Port valuation and planning, luxury-aware unrest + Beloved evaluation, telemetry, and sink/threshold campaigns |

Sibling engine calculations, every happiness surface, and every simulation
projection must share authoritative selectors rather than restating luxury rules.

## 0. Where this sits

**Phase 4, after Phase 3.6.** With land goods removed (owner, 2026-07-26), luxuries are **coastal-only**,
so the coastal + shared-vertex map work is now a **prerequisite** — there is no longer a
"ships without any coast" MVP. Build order:

`isCoastalTile` → **topology** (S) → **shared-vertex geometry** (M, new) →
**coastal luxuries + Port** (L) → v1 player trade (XL, required before the freeze).

Two things gate the first line of code:

- **Phase 3.5 lands first.** The sim's `evaluateSmart` uses a _linear_ happiness penalty
  (`src/sim/policies.ts:209,283`) that cannot see the −5/−10 riot cliff, so any luxury A/B
  run today would measure the bot's flaw, not the feature. Luxuries are a happiness
  feature; they are exactly what that bug blinds.
- **`<EffectLine>` shipped in Phase 3.5** (PR #49) as the shared effect seam. Luxuries are
  new content — they use it, they don't fork it.
- **Phase 3.6 lands next.** The feature depends on immutable per-match content, stable
  settlement/asset ids, canonical atomic commands, player-safe projections, and the
  invariant/transfer seams that player trade will reuse.

**Build rule carried from Phase 3-C:** teach the sim bot the new verb **in the same slice**.
The `political` bot shipped after the Assembly and promptly reported the layer as a net
loss — half of that was design, half was "the bot doesn't know the verb exists." Don't
repeat it with the Port.

**No dedicated gold sink (Q46, resolved 2026-07-27).** Luxuries were originally slotted
first in Phase 4 as the gold sink the Buildings/Market pass was blocked on — but the owner
ruled **no gold sink is needed**: gold already sinks into existing actions and into market
trade. The Port therefore stays cheap (its provisional 20 wood / 5 stone / 10 gold), and
luxuries are a **happiness** feature, not the economy's gold sink. The Buildings/Market
balance pass no longer depends on this feature.

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

| The old plan said                                                 | Today                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two acquisition paths (land Trader + coastal Port)                | **One path — the Port.** Land goods and the Trader are **removed** (owner, 2026-07-26). All luxuries are coastal.                                                                                                           |
| Coastal goods attach to **rim edges** as a feature ring (Q31 rec) | **Overridden.** A good sits **offset from the shared vertex of two coastal tiles**, with a clear icon, so a Port on **either** adjacent tile can claim it (owner, 2026-07-26). See §3.2.                                    |
| Claim rules go in `src/game/rules.ts`                             | `rules.ts` is a 52-line **barrel**. Validators → `status.ts`, mutators → `actions.ts`, enumeration → `legalMoves.ts`, income → `economy/income.ts`                                                                          |
| "The prototype uses only the 37 inland hexes"                     | **18 of the 37 are already coastal** — `isCoastalTile` (`map.ts:48`) drives coastal leapfrog, and the SVG coastline is drawn _topologically_ (`hexGeometry.ts:133`). No canvas rewrite; the **shared-vertex marker is new** |
| "Happiness bonus is never banked (effective happiness)"           | **Resolved (Q43): standing offset.** `effective = stored + active × 2`; the stored bank never grows from luxuries.                                                                                                          |
| Luxuries do **not** count toward _Beloved_                        | **Overridden (Q44): they DO count.** Effective happiness feeds the _Beloved of the People_ metric.                                                                                                                          |
| "9 named goods" + "diminishing duplicates"                        | **Unique only, no duplicates** (Q45). Count is coastal-only now and **still open** (Q32).                                                                                                                                   |
| Trader cost 100 gold is the gold sink                             | **Trader retired; Q46 resolved.** No dedicated replacement sink is required. The Port stays affordable and end-game gold remains monitored rather than forced toward a predetermined direction.                             |

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

| Building                                                | Cost                      | Claims                                                                                     |
| ------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------ |
| **Port** — a building in a settlement on a coastal tile | 20 wood, 5 stone, 10 gold | one unclaimed luxury at a shared vertex of the settlement's tile; **first Port claims it** |

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
- **Per-player active cap ~3** (dial). Activity is derived in a stable ordering from
  ownership, cap, and suppression. Goods held over the cap stay **owned but inactive** —
  a trade asset, not dead weight.
- **No duplicates** — every good is unique, so there is no second-copy case (Q45 resolved;
  `terrain-economy.md` §6's "diminishing duplicates" is dropped as unreachable).

### 3.5 The denial seam

Every claimed asset carries suppression state **from day one**, even though nothing suppresses
it yet. Whether it is active is derived by one selector from ownership, the active cap, and
suppression. This prevents impossible combinations such as `active: true` while suppressed
and makes later Directives additions rather than model rewrites (Q48 — deferred).

---

## 4. Implementation plan

The land-Trader slice is **gone**; coastal work is the whole feature.

The slices below are vertical capabilities, not engine/frontend/simulation handoffs.
Each PR includes its applicable definition/model, authoritative query/transition,
frontend projection/presentation, simulator execution/valuation/telemetry, deterministic
fixtures, and docs. A stacked branch may depend on the previous slice, but no merged
luxury behavior leaves an applicable axis for a later PR.

### Slice 1 — topology + the shared-vertex marker

This is the **opening Phase 4 PR**. Its deliverable is the reusable board-position seam;
it deliberately does not add the Port, ownership, happiness, or authored luxury roster.

1. **Topology (`src/game/map.ts`).** Replace the `BOARD_RADIUS` equality inside
   `isCoastalTile` with an occupied-neighbour query over the actual board. Keep radius 3 only
   as the classic map generator's input. Settlement legality must consume this query so an
   irregular map, internal inlet, or later archipelago has the same coast in every engine rule.
2. **Stable shared vertices (`src/game/mapTopology.ts`, new).** Canonically enumerate a
   board's geometric vertices from tile coordinates, deduplicate the three-tile intersections,
   and give each one a stable order-independent id. A luxury-eligible vertex touches exactly
   two adjacent coastal tiles and open sea; expose its two claimable tile ids explicitly.
3. **Geometry (`src/ui/hexGeometry.ts`).** Project the canonical board vertex to SVG space and
   expose the sea-facing offset as pure tested geometry. Engine identity never depends on
   floating-point coordinates.
4. **Marker (`src/components/HexMap.tsx`, new child component if useful).** Render a neutral
   fixture marker at authored eligible-vertex ids so its position and hit target can be judged
   before ownership behavior exists. Its accessible name identifies both adjacent tiles; the
   future good name and owner are typed optional presentation fields.
5. **Fixtures and proof.** Add topology tests for the classic board (18 coastal tiles, no
   duplicate vertex ids, every eligible vertex references two real adjacent tiles), an
   irregular board, and deck shuffling. Add geometry tests proving the marker stays on the
   same canonical vertex across tile iteration orders, plus one focused rendered-map test.

**Non-goals:** no `LuxuryAsset`, Port build action, claim choice, happiness offset, AI
valuation, telemetry, or art asset. Simulation & AI is `N/A` because this PR introduces no
legal verb or scoring state; the topology fixtures are shared engine data that Slice 2 will
consume.

**Exit gate:** engine coast legality and SVG coastline/vertex placement derive from the same
board topology; the classic map is behaviorally unchanged; six authored marker locations can
be selected without coordinate guesses; type-check, map tests, render test, lint, and build pass.

### Slice 2 — the Port, claims, and the happiness bonus

1. **Types** (`src/game/types.ts`) — `LuxuryGoodId`, `LuxuryAssetId`,
   `LuxuryGoodDefinition { id, name }` (all coastal — no `source` field), stable
   settlement/vertex ids, and a **board-level** asset registry on `HegemonyState`:
   ```ts
   interface LuxuryAsset {
     id: LuxuryAssetId;
     goodId: LuxuryGoodId;
     vertexId: LuxuryVertexId;
     owner: PlayerId | null;
     claimedAtSettlementId: SettlementId | null;
     suppressedTurns: number;
   }
   ```
   Board-level, **not** duplicated into four player buckets: a good is a physical object
   with at most one owner. `claimedAtSettlementId` remains its stable Port origin when
   trade changes `owner`; a tile id alone cannot identify one settlement on a shared tile.
   Denial effects mutate suppression, and activity is never stored.
2. **Content** — a `LUXURY_GOODS` table inside the immutable per-match
   `GameDefinition.content`, so authored, tuned, browser, simulator, replay, and future
   server consumers resolve the same pinned roster without a module-global accessor.
3. **Building** — `port` joins `BuildingId` and `BUILDINGS`, `maxLevel: 1`, **empty
   `effects` array** (its effect is the claim, not an income line), **coast-gated**.
4. **Legality** (`status.ts` `getBuildBuildingStatus`, enumerated at `legalMoves.ts:612`) —
   a Port is buildable only on a **coastal** settlement adjacent to an **unclaimed** luxury,
   while the player is under the active cap. The `ActionStatus` reason string carries the
   _why not_ (inland, no unclaimed luxury, cap reached) so the UI greys it out with an
   explanation instead of silently hiding it.
5. **Claim** (`actions.ts` `buildBuilding`) — building a Port claims one adjacent unclaimed
   luxury through the same atomic `transferAssets`/ownership seam future trade uses; if two
   are reachable, expose a typed required decision rather than adding another private modal
   workflow. First Port wins a contested good.
6. **The effect** — a new `src/game/luxury.ts` exporting
   `deriveLuxuryActivity(definition, G)`, `luxuryHappinessBonus(...)`, and
   `activeClaims(...)`, read by the two threshold tests in `applyUnrestUpkeep`
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
- Trade changes only the owner; the stable claim origin continues to identify the Port
  that first claimed the asset.
- The Port is unbuildable inland and when no adjacent luxury is unclaimed, each with a reason.
- The per-player active cap holds; goods over it are owned-but-inactive and the same state
  always produces the same active set.
- `suppressedTurns > 0` removes the bonus and restores it on expiry.
- No state stores an `active` boolean; invariant checks reject duplicate ownership or an
  invalid asset/settlement reference.

---

## 5. Proposed ruleset block

```ts
// EconomyRules.luxury — every number a ?tune dial
luxury: {
  happinessPerGood: 2,
  activeCapPerPlayer: 3,
  countsTowardBelovedCard: true,   // Q44 — luxuries DO count
  coastalGoods: 6,                 // Q32 — six, accepted
  portCost: { wood: 20, stone: 5, gold: 10 }   // Q46 — stays cheap; not a gold sink
}
```

---

## 6. The named roster

**Six** unique coastal goods (Q32, accepted) — the PDF's coastal set; the three former land
goods are dropped.

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

**None** — all luxury owner questions are resolved (folded above). The Phase 4 opening PR is
fully scoped; the plan stays `blocked` only until Phase 3.6 supplies stable identity and the
canonical transition/projection boundaries Slice 2 requires.

---

## 8. Phase-4 exit checks for this feature

- **The Port has a legible opportunity cost** without being treated as a required new gold
  sink; end-of-game gold remains telemetry rather than a predetermined pass/fail direction.
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
