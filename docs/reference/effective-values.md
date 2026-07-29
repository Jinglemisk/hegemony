# Effective content and costs

Last updated: 2026-07-29.

This is the living contract for values that can differ from authored defaults. It
records the Phase 3.5 Step 1 inventory. Step 2's compile-time and behavioral
classification is defined by the [parity manifests](parity-manifests.md), while
Step 3 presentation components consume both contracts.

## Vocabulary

- **Authored content** is the immutable source data in `src/game/data.ts`.
- **Effective content** is the roster fixed before game creation and returned by
  `getBuildings()` / `getBuilding()` or `getTerrainDeck()`. With no development
  override, it is authored content.
- A **base cost** comes from the active ruleset or effective content before local,
  seasonal, event, or standing-Law modifiers. Game modes and tuning patches are
  already reflected in this value.
- An **effective cost** is `ActionStatus.cost` from the authoritative `get*Status`
  query for the acting player and selected target/option.

Action surfaces show effective costs. Reference surfaces may show base costs, but
must label them as base costs and explain that modifiers appear at the action.

## Effective-content inventory

| Content   | Authoritative query                                                                | Engine consumers                                                                                               | Frontend consumers                                                                                                  | Simulation consumers                                                                     |
| --------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Buildings | `getBuildings()`, `getBuilding()`, and target-specific `getBuildBuildingOptions()` | Build legality/execution, income, settlement capacity/slots, growth and promotion discounts, table destruction | Board availability, map selection, Build popover, Cities/Buildings ledgers, Codex, building labels and benefit text | Legal-move enumeration and policy evaluation through the same engine income/status paths |
| Terrain   | `getTerrainDeck()`                                                                 | Initial map/state creation and shuffle                                                                         | Codex terrain aggregates                                                                                            | Game setup and tuning runs through engine map creation                                   |

Runtime consumers must not import `BUILDINGS` or `TERRAIN_DECK` directly. Authored
constants remain appropriate for development override construction, immutable
comparison tests, and stable ID vocabulary.

## Effective-cost inventory

| Action family          | Authoritative query                                                                           | Execution / simulation                                             | Action surfaces                                                                    | Reference surfaces                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Found colony           | `getFoundColonyStatus()`                                                                      | Execution and `LegalMove.cost` reuse the status                    | Command quote and Found popover reuse the status                                   | Codex labels the active-ruleset price as base cost                      |
| Upgrade colony         | `getUpgradeColonyToCityStatus()`                                                              | Execution and `LegalMove.cost` reuse the status                    | Command quote and Upgrade modal reuse the status                                   | Codex labels the active-ruleset price as base cost                      |
| Build building         | `getBuildBuildingOptions()` pairing each effective definition with `getBuildBuildingStatus()` | Execution, legal moves, and policy search reuse the paired status  | Build popover and ledger candidates show `status.cost`; building tooltips reuse it | Codex and roster headers label effective-definition prices as base cost |
| Grow pop               | `getGrowPopStatus()`                                                                          | Execution and legal moves reuse the status                         | Target picker shows the selected status cost; the pre-target command says `varies` | Codex labels class prices as base costs                                 |
| Promote / demote       | `getPromotePopStatus()` / `getDemotePopStatus()`                                              | Execution and legal moves reuse the status                         | Ladder target picker shows the status cost                                         | Codex labels ladder prices as base costs                                |
| Bank buy / sell        | `getBankBuyStatus()` / `getBankSellStatus()`                                                  | Execution and legal moves reuse player-specific Law-adjusted rates | Market buttons render the status costs                                             | Codex labels board-derived rates as base rates                          |
| Civic calm             | `getCivicCalmStatus()`                                                                        | Execution and legal moves reuse the selected payment status        | Calm payment choices render the status cost; pre-choice command says `options`     | Codex labels both payments as base costs                                |
| Venture                | `getFundExpeditionStatus()`                                                                   | Execution and legal moves reuse the selected stake status          | Stake choices render the status cost; pre-choice command says `stakes`             | Codex labels both stakes as base stakes                                 |
| Riot insurance         | `getBuyRiotInsuranceStatus()`                                                                 | Execution and legal moves reuse the table option status            | Riot choices use the same option/status                                            | Riot table is the base reference                                        |
| Assembly participation | `nextDrawCost()` and the Assembly legal-move/status rules                                     | Execution, legal moves, policy and telemetry share move costs      | Live Assembly controls read the same rules/session queries                         | Codex labels active-ruleset participation prices as base costs          |

Pre-target command summaries only print a number when the engine can answer it
without a target. Target-dependent or alternative-payment actions say `varies`,
`options`, or `stakes`; their chooser shows the exact effective cost.

## PR #57 reconciliation checklist

After Steps 1 and 2 merge, PR #57 must rebase onto main and:

- Replace any rebased runtime reads of `BUILDINGS` / `TERRAIN_DECK` with
  `getBuildings()`, `getBuilding()`, `getTerrainDeck()`, or the paired
  `getBuildBuildingOptions()` query.
- Pass the selected option's `building` and `status` into shared Build
  Tooltip/Popover presentation; render `status.cost` as the action price.
- Keep Found, Upgrade, Grow, ladder, bank, Calm, Venture, riot-insurance, and
  Assembly explanations on their named status/legal-move queries above. Do not
  reconstruct costs inside presentation components.
- Preserve the base/effective distinction in Codex or other reference content.
- Consume `CONTENT_MANIFEST`, `FEATURE_PARITY`, the exhaustive effect
  registries in `src/parity/featureParity.ts`, `src/parity/moveParity.ts`,
  `getActiveEffects()`, and the typed adapters in `src/ui/effects.ts`; do not
  create a UI-only classification registry.
- Rerun the full parity suite plus PR #57's accessibility, keyboard, touch
  emulation, and interaction checks, then record any owner real-device tests.

## Regression contract

`src/parity/withinAxisParity.test.ts` applies a tuned building definition together
with a seasonal multiplier and event coupon, then proves that the paired query,
frontend-facing label, legal move, execution payment, and resulting income agree.
It also proves that the smart policy reverses a build decision when effective
building economics reverse. Existing status, legal-move, preview, and parity suites
cover the remaining action families.

The [Step 2 manifest contract](parity-manifests.md) now enforces the exhaustive
classification around these values. This reference still does not prescribe Step
3's Tooltip/Popover rendering; PR #57 must consume both contracts when it rebases
after this Step 2 change merges.
