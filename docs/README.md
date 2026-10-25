# Hegemony documentation

This is the documentation control plane. Start here instead of reading the whole
tree. The roadmap establishes sequence and exit gates; plans define unshipped
work; references describe the game that exists; reports preserve dated evidence;
and the archive is historical context, never current authority.

Last updated: 2026-10-24.

## Now

**Current initiative:** [player trade](plans/player-trade.md), on `main`, in two PRs.
The [code-health plan](plans/code-health.md)'s five cleanup PRs are merged. v2, the
shallow-economy rules in the Hybrid arc shell, merged into `main` on 2026-10-18 (#121); its
[plan](archive/plans/v2-migration.md) is archived.

**Owner blockers:** Q80, now that trade's
[paired batches](reports/simulation/2026-10-22-trade-paired.md) and the
[balance batches](reports/simulation/2026-10-24-balance-lines.md) are in. On 2026-10-24 the
owner set base income to 0 and asked for three specs: [board modes](plans/board-modes.md),
[recurring deals](plans/recurring-deals.md) and [game settings](plans/game-settings.md).

**Next (owner, 2026-10-25), in waves of at most three agents with an owner checkpoint after
each:**

1. A confirming batch without base income, the Archipelago generator and its validation, the
   recurring-deals proposal, and board slice 1 (topology; shuffled becomes `continental`,
   classic becomes `scenario`). Then, in sequence overnight:
   - a batch with the coastal leapfrog off, to test whether it causes seat 0's lead;
   - one starting-bonus test, built on a single stated hypothesis rather than a sweep.
2. The Archipelago build, and recurring deals between people.
3. Bots for deals, the game-settings model and setup screen, then batches one at a time.

Then Step 11 on Q80's shape, the development deck, length batches, and the 3D living map,
whose plan is written after Archipelago lands. The full-game browser test still waits.

**Locked sequence:** V1 includes luxury goods, full Catan-style player trade, all twelve
National Ideas, and the intended typed Resolution/Idea effects. The v1 mechanics freeze
precedes full multiplayer.

## Active plans

| Plan                                                | Phase    | Status     | Position                                                                          |
| --------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------- |
| [Outcome-driven AI](plans/outcome-driven-ai.md)     | 3.6/post | `ready`    | Observation/capability prerequisites first; advanced search waits for the freeze  |
| [Luxury goods](plans/luxury-goods.md)               | 4        | `active`   | Slices 1–2 shipped on `main`; the v2 migration carries them unchanged             |
| [UI — what is left](plans/ui-remaining.md)          | —        | `active`   | The one UI ledger; the KYKLOS triage ledgers are archived                         |
| [Code health](plans/code-health.md)                 | post-v2  | `active`   | Five cleanup PRs before trade; all merged, trade next                             |
| [Player trade](plans/player-trade.md)               | post-v2  | `active`   | PRs #131 and #132 merged; batches reported; the owner plays trade next            |
| [Development deck](plans/development-deck.md)       | post-v2  | `proposed` | Replaces Ventures; follows both trade PRs                                         |
| [Board modes](plans/board-modes.md)                 | post-v2  | `proposed` | Slice 1 merged (#139); the generator is validated and goes to the owner (Q81)     |
| [Recurring deals](plans/recurring-deals.md)         | post-v2  | `proposed` | Yearly standing trades; the builder proposes the settlement timing first          |
| [Game settings](plans/game-settings.md)             | post-v2  | `proposed` | Classic plus per-game settings; length and base income built in the engine        |
| [National Ideas](plans/national-ideas.md)           | v2       | `active`   | Step 9 shipped (#88); twelve v2 rules, open setup draft (#95), influence purchase |
| [V1 mechanics freeze](plans/v1-mechanics-freeze.md) | 5.5      | `blocked`  | Final typed Resolution/Idea effects and evidence before multiplayer               |

Every file in `docs/plans/` must appear in this table. Start a substantial feature
from [the plan template](plans/_template.md).

## Owner questions

[questions.md](questions.md) is the only place for unresolved owner questions. A
question includes context, options, a recommendation, and an empty `Answer:` slot.
When answered, incorporate the result into the affected plan and remove the
question in the same change. There is no separate decision ledger.

## Workflow

```text
Idea → owner question → accepted plan → implementation PRs → validation → archive
```

1. Place sequence and exit gates in the [roadmap](roadmap.md).
2. Put implementation detail in one active plan and classify all three parity axes.
3. Open focused implementation PRs with the required parity evidence.
4. Update living references as behavior changes and save dated evidence as reports.
5. After validation, move the completed plan to `archive/plans/` with shipping evidence.

## Navigation

- [Roadmap](roadmap.md) — mandatory parity contract, phase order, and exit gates.
- [Questions](questions.md) — unresolved owner decisions only.
- [`plans/`](plans/) — proposed, ready, active, or blocked work only.
- [`reference/`](reference/) — living rules, effective-value and parity-manifest contracts, AI, simulation, balance, and design descriptions.
- [Frontend presentation contract](reference/frontend-presentation.md) — authoritative UI explanation,
  accessibility, overlay, and integration rules.
- [Actors and views](reference/actors-and-views.md) — workflow eligibility, redaction,
  spectator safety, and fair AI observation.
- [Runtime architecture](reference/architecture.md) — engine purity, canonical commands,
  versioning, invariants, and mechanical gates.
- [`reports/`](reports/) — immutable dated audits, playtests, and simulation evidence.
- [`archive/`](archive/) — shipped or superseded plans and historical work notes.

Run `npm run docs:check` before submitting documentation changes. CI checks plan
metadata, active-plan index coverage, question placement, root layout, local links,
and repository-relative path portability.
