# Hegemony documentation

This is the documentation control plane. Start here instead of reading the whole
tree. The roadmap establishes sequence and exit gates; plans define unshipped
work; references describe the game that exists; reports preserve dated evidence;
and the archive is historical context, never current authority.

Last updated: 2026-10-27.

## Now

**Current initiative:** the [development deck](plans/development-deck.md), whose card list
waits on the owner's review. [Player trade](plans/player-trade.md)'s two PRs, the
[code-health plan](plans/code-health.md)'s five, and v2 (#121, its
[plan](archive/plans/v2-migration.md) archived) are merged.

**Owner blockers:** the development deck's card list. Base income is 0 (owner, 2026-10-24). The
[balance check](plans/player-trade.md#the-balance-check)'s
[first report](reports/simulation/2026-10-26-balance-check.md) has win rates in range and Beloved
within noise; Q84 (2026-10-26) retired the stock ratio for pops and income ratios and left hunger
to the bots.

**Next:**

1. The development deck, slice 1 once the owner signs off the card list.
2. Balance batches wait until the bots play the deck (owner, 2026-10-26): the mixed table on the
   Archipelago, the default board since 2026-10-26 (#150), then length batches.
3. Parked until card balance is done (owner, 2026-10-27): [recurring deals](plans/recurring-deals.md)
   (#138), bots for deals, and the [game settings](plans/game-settings.md) setup screen.

The full-game browser test waits.

**The board:** 3D only, no 2D fallback (owner, 2026-10-26); open calls in [Q83](questions.md).

**Locked sequence:** V1 includes luxury goods, full Catan-style player trade, all twelve
National Ideas, and the intended typed Resolution/Idea effects. The v1 mechanics freeze
precedes full multiplayer. The mechanics are effectively frozen (owner, 2026-10-27): no new
features. What remains is balance: the development deck, the player events and the year cards.

## Active plans

| Plan                                                | Phase    | Status     | Position                                                                          |
| --------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------- |
| [Outcome-driven AI](plans/outcome-driven-ai.md)     | 3.6/post | `ready`    | Observation/capability prerequisites first; advanced search waits for the freeze  |
| [Luxury goods](plans/luxury-goods.md)               | 4        | `active`   | Slices 1–2 shipped on `main`; the v2 migration carries them unchanged             |
| [UI — what is left](plans/ui-remaining.md)          | —        | `active`   | The one UI ledger; the KYKLOS triage ledgers are archived                         |
| [Code health](plans/code-health.md)                 | post-v2  | `active`   | Five cleanup PRs before trade; all merged, trade next                             |
| [Player trade](plans/player-trade.md)               | post-v2  | `active`   | PRs #131 and #132 merged; the owner plays trade next; holds the balance check     |
| [Development deck](plans/development-deck.md)       | post-v2  | `proposed` | Replaces Ventures; follows both trade PRs                                         |
| [Board modes](plans/board-modes.md)                 | post-v2  | `proposed` | Engine and sim (#145); Q81 answered: hop 3, seven goods, the oracle on an island  |
| [Recurring deals](plans/recurring-deals.md)         | post-v2  | `proposed` | Parked until card balance is done (owner, 2026-10-27)                             |
| [Game settings](plans/game-settings.md)             | post-v2  | `proposed` | Length and base income built in the engine; the setup screen is parked            |
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
