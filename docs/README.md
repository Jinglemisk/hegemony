# Hegemony documentation

Start here. The player guide is [rules.md](../rules.md) at the repository root.

- [Roadmap](roadmap.md) — the owner's paths and the binding contracts.
- [Questions](questions.md) — the only place for open owner questions.
- [`plans/`](plans/) — work not yet shipped, one plan per path.
- [`reference/`](reference/) — how the game and its tooling work today.
- [`reports/`](reports/) — only the sim results the coming batches compare against.

## Plans

| Plan                                             | Status    | Path                                              |
| ------------------------------------------------ | --------- | ------------------------------------------------- |
| [Improving the bots](plans/outcome-driven-ai.md) | `ready`   | Bots: forecasts, trade and deals, then the rework |
| [Development deck](plans/development-deck.md)    | `ready`   | Second pass at the deck and the card system       |
| [Game settings](plans/game-settings.md)          | `blocked` | Setup screen, after card balance                  |

Every file in `docs/plans/` must appear in this table. A plan has frontmatter (`status`:
proposed, ready, active or blocked; `phase`; `updated`) and a `## Three-axis parity` section
with `Engine / backend`, `Frontend` and `Simulation & AI` lines.

## The rule for shipped work

When work ships, its lasting facts go into [rules.md](../rules.md) (player rules) or the
matching `reference/` file (engine, bots, UI, tooling), and its plan is deleted. No dated
logs, no shipped lists, no archive: git history keeps the past. A report is deleted once
nothing compares against it.

## Owner questions

A question in [questions.md](questions.md) has context, options, a recommendation and an empty
`Answer:`. Once answered, fold the result into the plan or reference it affects and delete the
question in the same change.

Run `npm run docs:check` before submitting doc changes. It checks plan metadata, this table,
question format, root layout and that every local link resolves.
