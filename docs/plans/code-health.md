---
status: active
phase: "post-v2"
updated: 2026-10-19
---

# Code health after v2

## Outcome

Each rule, number and screen fact has one home again. A rule lives in one engine function or
ruleset field that bots, screens and other rules call; content is typed data; a screen shows the
engine's reasons through the shared primitives; the stylesheets run on one token table. The
[v2 merge audit](../reports/audits/2026-10-19-v2-merge-code-health.md) lists what drifted, by ID;
this plan schedules it.

This is v2's Step 16, the refactor, except the island map, which the living map replaces.

## Non-goals

- Code that a later plan deletes: the bank and Exchange screens and the bank's copies of the
  pending-decision check (trade slice 2); Ventures, the Colonists' Voyage, the bots' venture
  valuation and the manifest's `ventureOutcomes` entry (deck slice 1).
- The island renderer, its labels, tips and CSS (living map): F7's `BoardTip`, F10's label
  layout, C7. The verb disc menu waits for the living map plan to say whether it survives: F2,
  F10's disc half, and the fans in F1 and F7.
- Behaviour changes beyond the bugs below. Tuning waits for trade, as before.
- Year cards as data (E10), the search cache key (S10) and bots typed on the projection (S13,
  which belongs to the [outcome-driven AI](outcome-driven-ai.md) plan's fair-observation
  prerequisites). They stay in the audit, unscheduled.

## Settled inputs

- Owner, 2026-10-19: the five cleanup PRs land before player trade slice 1, apart from feature
  work, so each can prove it leaves the game unchanged. Only the forecast's bank-adjacent code and
  the telemetry rewrite stay with trade slice 2, which rewrites them anyway.
- Owner, 2026-10-19: a slice may leave a bug in place when a later slice of the same sequence
  fixes it or deletes its code.
- `rules.md`: every way to add a pop needs room, pop grants reserve room for pops already on the
  move, and standing over the cap carries no penalty. Bug 1 is the event cards not following it,
  not a rules question.
- The trade plan keeps the Dole after the bank goes, so the bots' copy of the Dole is fixed, not
  skipped.

## Open owner questions

None. C11 (outlined boxes inside the Assembly sitting) changes the look, so it is shown to the
owner with screenshots before it is touched.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                                                       |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | Yes      | One function or ruleset field per rule; typed Law effects read by one applier; refactors keep behaviour (parity suites green); new tests for the two engine bugs and the restored Law grammar test                      |
| Frontend         | Yes      | Screens read engine reasons, typed effects and ruleset numbers through Tooltip, MechanicsDetails and one resource chip; one icon registry; one token table; browser pass at 1920, 1440 and 1280 for each UI-touching PR |
| Simulation & AI  | Yes      | Bots call the engine's outcome, Assembly and Dole functions instead of copies; game length from the year deck; fixed-seed `sim auto` logs identical or each difference traced; ask the owner before any batch           |

Sibling consumers this plan unifies: the riot and revolt outcome (engine turn end, status, bot
forecast, top bar, alarms, end-turn confirm, year card, moments); the pass rule (engine, sitting
wording); room (growth, Ideas, events, later trade); pop income (income, breakdown, class
columns); the pending-decision gate (7 engine sites outside the bank and Ventures); icons and
resource chips (shell, board, modals).

## Architecture impact

- Definition: the ruleset gains the Idea price and post-setup purchase limit, the pass rule and
  the revolt's slave share; Laws change shape to typed effects. The definition hash and the
  state schema version change (13 after PR 1; `RULESET_VERSION` has never moved); older saves
  are rejected, as today.
- Commands: unchanged.
- Actors: the pending-decision gate derives from `currentWorkflow`, which trade slice 1 extends
  with its workflow.
- Projections: one typed required decision for the seat (source, actor, choices, reasons), read
  by the board's moment host.
- No module-global match state: the controller's mutable `DEV_SHELL` goes (F9).
- Invariants and replay: unchanged; refactor PRs prove it with identical fixed-seed logs.

## Before and after

### 1. Single sources

| Part                  | Before                                                                                                              | After                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Loose numbers         | Idea price 6, one-Idea limit, "ties fail", revolt "half" are literals; the 6 retyped in UI copy (E4, E8)            | Ruleset fields; refusal text and UI copy built from them; the tune panel reaches them                         |
| Riot/revolt outcome   | Tier test 3× in the engine; copied in the bot forecast, top bar, alarms, end turn, moments, year card (E8, S1, F12) | One exported engine function returns the tier and what it takes; one presenter words it; all callers use both |
| Pass rule             | "Tie fails" restated 5× in the sitting; "carried without effect" inferred (B9)                                      | Engine result carries an outcome kind and a `wouldPass` helper; one presenter words it                        |
| Capital               | "First settlement" in ~6 places; an unused capital kind and row (E9)                                                | One `isCapital` query; the capital kind stays, as it also names the setup step (see E9)                       |
| Game length           | 14 years and 56 turns hard-coded in bots, the batch cap, report format and tests (S3)                               | From the year deck size and seat count                                                                        |
| Bots and the Assembly | Bribe affordability and vote tally copied; `>= 6` literal (S4)                                                      | Bots call `votesLeftToBuy`, `voteOutlook` and `briberyCost`                                                   |
| Policy dispatch       | Six policies repeat the Assembly → setup → search branch; identity knobs and wrappers (S15, S12)                    | One policy factory; the knobs deleted                                                                         |
| Bot tests             | Tests pin tuning numbers (S14)                                                                                      | Tests assert behaviour, not current tuning values                                                             |

### 2. Decision host and shared primitives

| Part                      | Before                                                                                     | After                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forced moments            | 7 loose flags and a precedence chain on the board; no decision host exists (F8, B15)       | The board picks one moment from a typed union, in precedence order, and mounts it through one switch; hunger, Ideas, riot, year card, turn notice and game over move onto it          |
| Blocked during a decision | 11 copies in 4 variants; a pending riot missed (E6, bug 2)                                 | One reason from `currentWorkflow`, used by every status and the transition; the 4 copies in the bank and Ventures go with their code                                                  |
| Resource chips            | `ResourceChips` plus the frame's `Price`/`Chips`, bare numbers to a screen reader (F6, B6) | One chip with frame styling that reads "4 wood"                                                                                                                                       |
| Action button             | New screens use native `disabled` and `title`, or fixed hints (F1, B1)                     | One shared button: Tooltip, MechanicsDetails, `aria-disabled`, engine reasons, effective cost; the realm pages, Assembly buttons and Ideas use it (the verb fans wait, see non-goals) |

Trade slice 1's answer card is the decision host's first new user, and its screens are built on
the shared button.

### 3. Typed Laws, one income, one room

| Part           | Before                                                                                                                                                                                                                              | After                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Laws           | 8 of 16 are flags; their numbers in if-checks across status, settlement, income and Assembly; `text` equals `tradeOff` (E1)                                                                                                         | Typed effects read by one applier; tones in the UI; `tradeOff` dropped; the upside/downside test is back (E12)    |
| Ideas and Laws | Ideas reuse the Law effect type; table-wide queries read seat 0's Ideas (E5)                                                                                                                                                        | Table effects from Laws only; seat effects are Laws plus the seat's own Ideas                                     |
| Income         | Pop income has one definition and a hand-coded breakdown; the class raise computed twice (E3)                                                                                                                                       | Breakdown and class columns from the one definition, so trade slice 2's base food lands once                      |
| Small copies   | `realmPops`, slave unhappiness, eating classes, "fullest settlement" re-implemented (E7); "port" checks and content labels (E11); `RulesSource` probing and a dead over-capacity helper (E13); food floor (E14); v1 leftovers (E15) | Shared helpers; a `claimsLuxury` flag and labels from the source; functions take the state; the dead code deleted |
| Bot Ideas      | ID checks, an if-chain of unnamed numbers, a manifest pointing at the wrong functions (S5, S6, S7, S11)                                                                                                                             | An exhaustive switch over named values on the typed effects; manifest entries name the real functions             |
| Room           | Pops on the move counted by growth and Ideas, ignored by event cards (E2, bug 1)                                                                                                                                                    | One room function for growth, Ideas and events; trade slice 3's "no room, no deal" calls it                       |

### 4. UI cleanup

| Part            | Before                                                                                                                            | After                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Explanations    | Realm pages, Assembly buttons and Ideas show fixed hints; cards and Ideas show prose (F1, F5, B1, B2, B3, B12)                    | The shared action button; typed effects through MechanicsDetails; effective costs                 |
| Icons           | A typed registry plus untyped maps that disagree on the Port, the Estate and luxury (F3, B7)                                      | One typed registry                                                                                |
| Rules in the UI | Hand-summed pop counts, per-page turn gate, year card carved again, rulebook literals, content by ID (F4, F11, F12, F13, B8, B13) | `realmPops`, one turn gate on the context, the year-card presenter, ruleset reads, content fields |
| Popovers        | End-turn confirm and threat alarm hand-roll dismissal (F7)                                                                        | `Popover`                                                                                         |
| Formatters      | Number words 5×, list 2×, capitalize 3×, two minus signs; sitting wording in the JSX (B10, B11)                                   | One formatter module; the sitting's wording in its own module; Escape through the shell           |
| Hotkeys         | Three global hotkey listeners each check "is the user typing" (F10)                                                               | One check                                                                                         |
| Dev fixtures    | ~25 scenario builders and a mutable global in the controller, ungated (F9)                                                        | A dev-only module behind `import.meta.env.DEV`, passed in once                                    |
| Leftovers       | v1 scaffolding (B14)                                                                                                              | Deleted                                                                                           |

### 5. CSS cleanup

| Part            | Before                                                                                                                                    | After                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Tokens          | Two token tables that disagree, 77 dead tokens, ~76 declarations undoing v1 (C1, C2, C3)                                                  | One table (the frame's); the v1 block and v1 base styles deleted                          |
| Shared styles   | Caps label ~20×, four kickers, four buttons, copied card and scrim; ceremony.css off the tokens; "you" in player 4's colour (C4, C5, C10) | One caps, kicker, button, card and scrim; ceremony on the tokens; the viewer's own colour |
| Stacking        | Half the z-index values off the scale (C6, bug 3)                                                                                         | All on the scale; the setup picker checked in the browser                                 |
| Main stylesheet | 2.8k lines ordered by history; dead classes and keyframes (C8, C9)                                                                        | Split by component, island styles left for the living map; dead rules deleted             |
| UI check script | Counts `font-size:` and hex only (C12)                                                                                                    | Also counts `font:` sizes, `rgb()`/`hsl()` and literal z-index                            |

### 6. In trade slice 2

| Part      | Before                                                                             | After                                                                                                          |
| --------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Forecast  | Copies of buying calm, the Dole and bank food (S1)                                 | The bank code goes with the bank; calm and the Dole run through the engine on the draft                        |
| Telemetry | One ~615-line report function, pasted cuts, 4 shapes, facts counted twice (S8, S9) | One cut function and one shape (total, per seat, per personality), one count per fact; trade's metrics plug in |

### 7. In the development deck

- Slice 1 deletes Ventures: the Voyage half of bug 1, `ventureOutcomes`, the venture verb, and
  `EventTableModal` if nothing else mounts it (B4's stale docblock goes with it).
- Slice 2 changes what a riot takes (Q82, B): the bots value riots through the engine's table
  lookup instead of `expectedRiot` (S2); the riot screen shows every effect of the landed row,
  reads the insurance modifier and the die from data, shows insurance reasons and uses
  `TileListbox` (B4, B5).

## PR slices

All to `main`, before player trade slice 1, in this order:

1. **Single sources** (section 1). Merged, #125.
2. **Decision host and shared primitives** (section 2). Merged.
3. **Typed Laws, one income, one room** (section 3).
4. **UI cleanup** (section 4).
5. **CSS cleanup** (section 5).

Then trade slice 2 carries section 6, and deck slices 1 and 2 carry section 7.

## Acceptance and validation

- Every audit ID is fixed, deleted with its code, or listed as waiting or unscheduled above.
- Bugs: engine tests show an event card skipping a settlement whose last room is held by a pop on
  the move, and every action status refusing while a riot is pending; the setup picker draws above
  the chrome in a browser check.
- Refactor PRs keep behaviour: parity suites green, and fixed-seed `sim auto` logs identical
  before and after. Where a PR fixes a bug or replaces a bot copy that had drifted from the
  engine, each log difference is traced to that fix.
- The restored Law grammar test passes on typed effects.
- UI PRs: browser pass at 1920, 1440 and 1280, `ui:audit` and `ui:conduct` re-run.

## Retirement

When PRs 1 to 5 and the trade and deck items have landed: update
[frontend-presentation.md](../reference/frontend-presentation.md) (the decision host, one
resource chip, the action button), [ai.md](../reference/ai.md) (point at `PERSONALITY_WEIGHTS`
instead of its copy of the weights table) and `rules.md` where wording changed; move this plan to
`docs/archive/plans/` with its PRs.
