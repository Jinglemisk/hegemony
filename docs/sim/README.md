# Simulations

The headless simulator (`npm run sim`) drives the pure rules engine so we can play,
auto-play with bots, and run seeded batches that produce balance reports — no UI, fully
reproducible. This folder is the **experiment log**: each campaign's writeup plus the raw
JSON reports it produced.

## Where the sim docs live

| Doc | What it is |
|---|---|
| **[../simulation.md](../simulation.md)** | The command reference — every `sim` subcommand, flag, and report field. Read this to *run* a sim. |
| **[../ai.md](../ai.md)** | How the bots work: the policy seam, the determinism contract, the evaluation functions, and the **tuning loop** (how to change a bot's brain and measure it). Read this to *change* a bot. |
| **[plan.md](plan.md)** | The forward balance/tuning plan — what to run next and why. Right now it's centered on tuning the `smart` evaluation, which the beam A/B flagged as the bottleneck. |
| `YYYY-MM-DD-*.md` + `.json` | The experiment log below — a dated writeup and the batch report(s) it drew from. |

## How an experiment is recorded

A campaign is: a **question**, a **seeded batch** (or before/after pair), and a **writeup**
that states the verdict and links its `.json` report(s). Reports are byte-reproducible from
their seed, so anyone can regenerate or extend one. New experiments go here as
`YYYY-MM-DD-<topic>.md` next to their reports.

```bash
# the general shape (see ../simulation.md for the full surface)
npm run sim -- batch --games 50 --turns 300 --policy smart --seed 9000 --report docs/sim/2026-mm-dd-topic.json
```

## Experiment log

| Date | Campaign | Verdict / finding |
|---|---|---|
| 2026-07-12 | [bank-rate derivation A/B](2026-07-12-bank-rates-ab.md) | `uniform` vs `scarcity` bank rates — no measurable difference; scarcity kept for board texture. |
| 2026-07-12 | [Q13b colony repricing](2026-07-12-colony-repricing-q13b.md) | Colony cost comparison after the bank changes. |
| 2026-07-13 | [deck overhaul A/B](2026-07-13-deck-overhaul-ab.md) | Before/after the event-deck rework (ledger issues 5/10/12). |
| 2026-07-13 | [victory minimums](2026-07-13-victory-minimums.md) | Victory-card minimums vs the thinner deck — candidate thresholds. |
| 2026-07-18 | [greedy vs smart](2026-07-18-greedy-vs-smart.md) | The Phase-2-aware `smart` bot vs `greedy`; surfaced that smart over-promotes into unrest. |
| 2026-07-18 | phase2 terrain (`.json`) | Raw reports from the Phase-2 terrain-economy tuning. |
| 2026-07-19 | [beam vs baselines](2026-07-19-beam-vs-baselines.md) | Beam search beats one-ply `smart` and upgrades colonies, but loses to `greedy` — **the evaluation, not the search, is the ceiling.** |

## Trust notes (post-audit, 2026-07-19)

Since the sim-audit fixes (PRs #29/#30), reports are trustworthy: `winRate` counts **finished
games only** (`terminations` gives the denominator), turn counts have no deck-exhaustion
off-by-one, force-ended turns are surfaced (`forced`), and `--board`/`--tune-patch`/`--seats`/
`--rotate` let a batch represent real games and A/B any lever. Reports from **before** July 19
predate those fixes — read their win-rate/turn figures with that caveat.
