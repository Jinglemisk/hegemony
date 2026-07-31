# Low-number core v1 matched campaign

Date: 2026-07-31

## Question

Does the production-shaped `low-number-core-v1` preset compress ordinary economy
income below two digits without materially changing race duration or making a core
action family unreachable?

This is the approved 84% preset, not the earlier research candidate. Laws,
Directives, politician effects, the Law cap, and other Assembly content remain
standard. Results therefore do not approve the deferred final 16% or final balance.

## Method

- Shuffled boards, seeds 73000–73009, 120-turn cap.
- Matched standard/preset batches for `smart`, `random`, and `master`: 60 games.
- Browser and simulator used the same preset definition and resolved-content hash
  `06943b7d`.
- Each report records the preset ID, content hash, complete ruleset patch, universal
  move telemetry, population distributions, and configured-floor violations.

## Results

| Policy   | Two-digit income, standard → preset | Mean turns, standard → preset | Finished, standard → preset | Final pops, preset mean / median / p90 | Preset net growth mean | Floor violations |
| -------- | ----------------------------------: | ----------------------------: | --------------------------: | -------------------------------------: | ---------------------: | ---------------: |
| `smart`  |                       80.4% → 11.6% |                   97.8 → 95.4 |                       5 → 7 |                          8.35 / 7 / 15 |                  +5.35 |                0 |
| `random` |                        18.3% → 0.6% |                 120.0 → 119.8 |                       0 → 1 |                           1.33 / 0 / 4 |                  −1.68 |                0 |
| `master` |                        78.8% → 1.5% |                  98.9 → 103.0 |                       6 → 5 |                           4.65 / 4 / 8 |                  +1.65 |                0 |

The primary `smart` target passes: observations with any two-digit spendable-resource
income fell below 15%. Mean race duration changed by −2.5% for `smart`, −0.2% for
`random`, and +4.1% for `master`, all inside the 15% gate. Among finished games,
`smart` moved from 75.6 to 84.9 turns (+12.2%) and `master` from 84.8 to 86.0 (+1.4%).
Turn caps remain disclosed; `random` is not a credible race-finishing policy.

Across the preset batches, growth, building, founding, colony upgrades, bank trade,
civic calm, ventures, events, riots, and Assembly participation all occurred. Riot
resolution was absent under preset `master` but occurred under `smart` and `random`;
this is policy behavior, not mechanical unreachability. All configured-floor stocks
had zero violations.

## Verdict

The preset passes its implementation evidence gate and is ready for human playtesting.
It materially compresses ordinary income without distorting matched race duration.
The large late-game happiness values and the difference between `smart` and `master`
population growth reinforce the declared limitation: unchanged Assembly content can
still be large relative to the compressed core, and policy-specific results are not
final balance approval.

## Raw reports

- [`smart` standard](2026-07-31-low-number-core-v1-standard-smart.json) and
  [`smart` preset](2026-07-31-low-number-core-v1-preset-smart.json)
- [`random` standard](2026-07-31-low-number-core-v1-standard-random.json) and
  [`random` preset](2026-07-31-low-number-core-v1-preset-random.json)
- [`master` standard](2026-07-31-low-number-core-v1-standard-master.json) and
  [`master` preset](2026-07-31-low-number-core-v1-preset-master.json)

## Validation

The implementation also passed the complete TypeScript, documentation, parity,
lint, unit/integration, production-build, CLI, and real-browser preset/reset checks.
Real-device touch validation remains the separate Phase 3.5 owner gate.
