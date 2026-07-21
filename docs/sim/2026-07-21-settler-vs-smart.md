# Map foresight (`settler`) vs `smart` — A/B (2026-07-21)

`settler` = `smart` plus a **frontier term**: `FRONTIER_WEIGHT ×` the total yield of the
tiles it could legally found a colony on *next* (reachability via `canPlaceColonyOnTile`).
The intent: value the *expansion a placement opens*, not just the fattest single tile — the
second-order "found here to chain to that cluster" move the board-static scorer misses. A
`settler`-vs-`smart` table isolates map foresight. See `docs/feat/map-foresight.md`.

One `settler` seat rotated through all four positions, 24 games (6 seeds × 4 rotations),
`--turns 280`, same seed family:

```
batch --seats settler,smart,smart,smart --rotate --games 6 --turns 280 --seed 9000
```

## Headline — map foresight is redundant with the income projection

| `FRONTIER_WEIGHT` | settler win | smart win | verdict |
|---|---|---|---|
| **2** | **25% (6/24)** | 25% (18/72) | exact parity — win-neutral |
| **6** | **8% (2/24)** | 31% (22/72) | actively **harmful** |

It **changes behaviour** — a direct seat-0 count over 6 seeds shows settler founding
slightly more (**40 vs 38** settlements) — but that extra expansion **buys nothing** at
weight 2 and **loses** at weight 6.

## Why — the bots already have expansion foresight, and over-expansion is a trap

Two things the A/B makes clear:

1. **The frontier term is largely redundant.** The scorer already projects
   `calculateIncome` six turns ahead, and a colony's tile yield flows through that
   projection — so a colony's *future* value is already priced. Adding an explicit
   "reachable yield" term restates information the bot mostly has, hence parity. The
   feared "board-static" blind spot is smaller than it looked: the bots are static about
   future *options/positioning*, but not about a colony's own forward yield.
2. **Pushing it breaks the economy.** Colonies cost food upkeep; the income projection
   correctly *declines* colonies it cannot feed. At weight 6 the frontier term **overrides**
   that judgement — the bot over-expands into unsustainable colonies (upkeep → food
   shortage → unrest → pop loss) and its win rate collapses (8%). The economic evaluation
   was already doing the right thing; more "map foresight" just shouts over it.

**The instrument works and its reading is a negative result** — a legitimate finding, per
the sim philosophy: *raw expansion breadth is not a differentiating lever for these bots.*
The winning levers are the economy and the victory-card thresholds (cities/pops/stockpile),
not colony count.

## Implications

**For the game designer (the interesting part):** if expansion is meant to be "the heart
of the game," the bots reveal it currently *isn't* a strategic differentiator — a bot that
expands more does not win more. That is a **balance** signal, not a bot bug: expansion pays
its own way but does not *out-pace* building/pop play. Making expansion a genuine lever is a
*game* tuning question (cheaper colonies, richer coastal/frontier tiles, an
expansion-flavoured victory incentive), benched for the owner's read — not a scorer change.

**For a future stronger bot** (not this PR): the foresight that *would* matter is the part
the income projection can't see — **competitive** and **cross-turn**: racing a rival to a
scarce rich tile before they claim it, or founding a weak colony now purely to *unlock* a
strong city upgrade two turns on. Both need multi-turn or opponent-aware lookahead, well
beyond a one-ply scorer term.

## What ships

`settler` stays in the roster at `FRONTIER_WEIGHT = 2` — a **measured-neutral** policy that
isolates map foresight, useful for re-running this A/B against any future expansion
tuning. It never regresses `smart` (parity, all games finished, determinism preserved,
`npm run check` + vitest green). Reports: `2026-07-21-settler-vs-smart.json` (weight 2),
`2026-07-21-settler-vs-smart-w6.json` (weight 6, the harmful arm).
