# The influence-aware bot vs smart — Phase 3-C A/B (2026-07-21)

The new `political` policy is `smart` plus the Assembly: a **differential** lens (my gain
minus the strongest rival's — "does this resolution hurt me, help me, or help a rival
more?") driving draw / propose / vote / bribe / veto, atop a standing-in-the-agora term
(progress to the Voice card, the Stratokles clock). A `political`-vs-`smart` table isolates
the political layer on the same economic spine. See `docs/feat/influence-aware-ai.md`.

Assemblies convene from **Year 2**, so all runs use `--turns 280` (a batch's default 40
barely reaches the agora). One `political` seat rotated through all four positions, 24
games (6 seeds × 4 rotations), same seed family so seat bias cancels:

```
batch --seats political,smart,smart,smart --rotate --games 6 --turns 280 --seed 9000
```

## Headline — the agora is now contested, but a lone seat's engagement is ~neutral

| Metric | baseline (pre-3-C `smart`) | `political` |
|---|---|---|
| **Influence sunk / game** | **~0.8** (bots ignore the agora) | **~45–58** |
| Assembly verbs / game | pass 24 · vote 24 (nothing else) | draw ~5 · propose ~4.5 · vote ~40 · bribe ~3 · veto ~1.7 |
| Laws enacted / game | 5 (all house cards) | ~3 (seat-authored) |
| **Win by policy** (finished games) | — | **political 21% (5/24) · smart 26% (19/72)** |

**The instrument works.** Influence sunk jumps from ~0.8 to ~50/game and every Assembly
verb fires — the sim can now measure the agora, which was the whole point of 3-C (the
tuning pass was previously blind).

**But a single influence-aware seat does not beat three passive `smart` seats** — it lands
at ~21% against smart's ~26%, both near the 25% four-player fair line, political a touch
below. This held across **two** heuristic settings (a null result robust to tuning, not a
threshold artefact):

| Heuristic setting | political win | smart win | influence sunk |
|---|---|---|---|
| v1 — propose≥8, bribe≥45, veto≥90, draw≤2, POLITICS_WEIGHT 8 | 21% (5/24) | 26% | 45/game |
| v2 — propose≥12, draw≤1, patronage weighted 2×, POLITICS_WEIGHT via patron 4× | 21% (5/24) | 26% | 58/game |

## Why — a structural 1-vs-3 dynamic, not a bad bot

Laws are **table-wide** (`settlementIncome`, `popIncome`, … apply to every player's board).
So a lone seat that funds the agora is **subsidising its three opponents**: even when the
differential lens picks Laws that favour *its* board, the three `smart` bots free-ride on
the same table-wide effect. The one genuinely *solo* payoff is the **Voice** victory card
(patron of the most politicians — and the passive smart seats never contest patronage), but
one card is not enough to overcome three free-riders at the current dials.

The natural hypothesis was that the edge would appear once the agora is **contested** —
two seats fighting for Voice and denying each other. It does not.

## Contested table (2v2) — the hypothesis is DISPROVEN

```
batch --seats political,smart,political,smart --rotate --games 6 --turns 280 --seed 9000
```

48 political participations, 48 smart, all finished:

| | win by policy | influence sunk |
|---|---|---|
| **political** | **21% (10/48)** | **~101/game** (two engaged seats) |
| **smart** | **29% (14/48)** | ~0 |

Contestation does **not** rescue it — political still trails by ~8 points, and the two
political seats now sink ~100 influence/game between them. (The table also resolves faster
— 20 of 24 games end on the victory race vs 14/24 in the 1-vs-3 — but faster ≠ in
political's favour.) So the negative result is **structural, not a 1-vs-3 artefact**: at
the current dials, funding a table-wide Law is a *public good paid for with a private
resource*, and no amount of contestation changes that arithmetic.

## The core finding for the tuning pass

**At the current `Ruleset.assembly` dials, engaging the agora is a net loss** — a
table-wide Law is a public good paid for with private influence, and the one private
counter-incentive (the Voice card via patronage) does not cover the subsidy, contested or
not. The instrument is built and this is its first reading; the *fix* is the owner's
hand-playtest + dial pass, not more bot tuning. Sim-backed *hypotheses* to test there:

1. **Make the agora privately rewarding enough to justify the subsidy.** Sweep (via
   `--ruleset-patch`, comparing same-`--seed` batches):
   - `dominanceThreshold` **down** and/or a **richer patron buff** — the patron buff is the
     one strictly-private return on authoring a Law; if it outweighs the rivals' free-ride,
     engagement turns positive.
   - `drawCost` / `briberyCost` / `vetoCost` **down** — cheapen the private cost side.
   - `lawCap` **up** — more room for asymmetric Laws that favour one board over others.
2. **Weigh whether table-wide-only Laws are the right default** — a design question for the
   owner: some Laws that favour the *author's* board shape (not everyone's) would give the
   differential lens something to actually win with. (Design change, not a dial — benched
   for the human.)
3. **Bot follow-ups** (future, not blocking): guard the *field*, not just the leader —
   propose only when `myΔ − meanRivalΔ` is large (subsidy-aware), not just
   `myΔ − maxRivalΔ`; and value the Voice card's *completion* (2nd patronage) far above the
   first, since only crossing the Voice minimum converts patronage into a card.

**Regression check:** all games finished (0 turn-capped), determinism preserved (same seed
→ byte-identical report), no crashes, `npm run check` + 337 vitest green. Reports regenerate
from the batch commands above (`--report …`); sim JSONs are gitignored, not committed.
