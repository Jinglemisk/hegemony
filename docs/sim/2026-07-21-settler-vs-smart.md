# Map foresight (`settler`) vs `smart` — A/B (2026-07-21)

`settler` = `smart` plus a **frontier term**: `FRONTIER_WEIGHT ×` the total yield of the
tiles it could legally found a colony on *next* (`canPlaceColonyOnTile`). The intent: value
the *expansion a placement opens*, not just the fattest single tile. A `settler`-vs-`smart`
table isolates map foresight. See `docs/feat/map-foresight.md`.

One `settler` seat rotated through all four positions, `--turns 280`, same seed family:

```
batch --seats settler,smart,smart,smart --rotate --games 6 --turns 280 --seed 9000
```

## First — how are these games actually won? (nobody turtles)

Of 24 games at weight 2: **14 ended on the victory race** (a seat actively reached the
`cardsToWin = 3` line) and **10 on the deck clock** (most cards when the seasonal deck ran
out). Winners held **2–3 victory cards**, and those cards *are* `cities ≥ 3`, `pops ≥ 16`,
`citizens ≥ 8`, `stockpile ≥ 80`, `happiness ≥ 10`. **Winning requires expanding and growing
a realm** — you cannot reach 3 cities and 16 pops by sitting in a starting town. Both
`settler` and `smart` expand and build toward these thresholds (a direct seat-0 count:
`settler` **40** settlements, `smart` **38**, over 6 games). This A/B is *not* "expand vs
turtle" — it is "expand *more/smarter* vs `smart`'s already-substantial baseline."

## Headline — no weight of the frontier term beats `smart`

| `FRONTIER_WEIGHT` | 1 | **2** | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| **settler win %** | 19 | **25** | 19 | 13 | 13 | 8 |
| smart win % | 27 | 25 | 27 | 29 | 29 | 31 |

(weight 2 = 24 games, the rest 16; 25% is the favourable end of the noise — its neighbours
1 and 3 both read 19%.) The shape is unambiguous: **neutral at low weight, monotonically
worse as it is pushed.** There is no sweet spot where valuing the frontier wins more.

## Why — `smart` already expands about right; the term only makes it over-expand

The scorer already projects `calculateIncome` six turns ahead, and a colony's tile yield —
*and its food upkeep* — flow through that projection. So `smart` already founds colonies up
to roughly where the next one stops paying for itself. The frontier term is **additive**: it
can only push the bot to found *more*, and:

- at low weight it mostly **restates** the income the projection already sees → **neutral**;
- at high weight it **overrides** the projection's upkeep caution → the bot over-expands into
  colonies it can't feed (food shortage → unrest → pop loss) → **it loses**.

So the correct, narrow finding — the one I first over-framed — is: **you cannot out-expand
`smart` for an edge, because `smart` already expands to about the right amount.** Not
"expansion doesn't matter" (it is *necessary* to win), but "*more* expansion than a
well-balanced economy already chooses is worthless-to-harmful."

## What would actually make expansion a lever

Two things this one-ply frontier term structurally cannot capture — the foresight worth
building next, if expansion is to be a real differentiator:

1. **Colony→city *upgrades*, not colony *founding*.** The `cities ≥ 3` card needs **cities**,
   and one-ply bots barely upgrade (`beam` — which plans multi-step — does ~0.7 upgrades/game
   and **beats** `smart`; greedy/smart do ≈0). The expansion that wins is *founding-then-
   upgrading*, a cross-turn sequence a one-ply frontier term can't plan.
2. **Competition for scarce tiles.** The income projection is solo — it never values grabbing
   a rich tile *before a rival* can. Opponent-aware expansion (deny/race) is the part the
   scorer is blind to.

Both are multi-turn / opponent-aware, beyond a one-ply scorer term. **And whether expansion
*should* pay more at all is a game-balance question for the owner** (colony cost/reward,
richer frontier or coastal tiles) — not a scorer change.

## What ships

`settler` stays at `FRONTIER_WEIGHT = 2` — a **measured instrument**, not a stronger bot: it
never beats `smart`, and this A/B is the baseline to re-run against any future expansion
balance change. All games finished, determinism preserved, `npm run check` + vitest green.
Reports: `2026-07-21-settler-vs-smart.json` (w2), `-w6.json` (harmful arm), plus the weight
sweep in `.sim/sweep-w{1,3,4,5}.json`.
