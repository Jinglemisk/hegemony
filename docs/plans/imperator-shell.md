---
status: active
phase: "UI"
updated: 2026-11-23
---

# The Imperator shell

## Outcome

The game screen becomes the **Improved proposal** of the
[Imperator overhaul page](../reports/product/2026-11-04-imperator-ui-overhaul/README.md)
(owner, 2026-11-23: "implement this new and improved UI end to end"). A player reads the
realm from a full-height sidebar of drawers, acts on a place from one docked place panel,
watches their realm in an outliner, ends the turn from a three-row dock, and every surface is
drawn in parchment, black glaze and bronze, with each seat shown as a struck coin.

The design source is the live prototype (v13), kept outside the repo with its art:
the `hegemony-imperator-ui` folder beside this checkout — readable source in `parts/` (`script.js` behaviour,
`stage.css` styles, `spec.html` the written spec, `sections.html` the stage markup), the built
page in `artifact/index.html` (open it with `python3 -m http.server -d artifact`). The
repo's report folder holds the older v7. Where this plan and the prototype differ, this plan
wins.

## Non-goals

- The engine, projections, bots and the 3D map's renderer. Only the map's mode filter, its
  labels and its fit to the chrome may change.
- Sound, and an animation for the year turning over.
- New rules or new player actions. Every command the shell offers exists today.

## Settled inputs

- **Shell, from the Main proposal (was Proposal B):**
  - Full-height sidebar drawn as a column. Its buttons are Realm, Ideas and Agora, then Trade,
    Victory and Cards. Drawers are 320 wide and full height.
  - One left window at a time. A place picked from a drawer gets a back button.
  - The place panel grows out of the sidebar: 604×404 from the screen's left edge. The hand
    sits at x 624, 480 wide.
  - The dock has three rows: the log line across it, then map modes, then Trade / Buy a card /
    the Dole. End turn sits beside the modes and buttons.
  - The outliner is a fixed column from under the top bar to the dock.
  - Menu at the top bar's right end: Codex, Costs, Plates as movable windows.
  - Standing deals as discs and cards. The confirm bar ("Are you sure…") for every spending
    action.
- **Look, from the Improved proposal:** parchment and black-glaze panels, a bronze rule, bronze
  meander corners on free panel corners, and a meander strip under headers and the top bar.
  Also: drawn controls, seat coins, one-line outliner rows with detail in tooltips, banner
  messages, and unroll / drop / settle motion.
- **Owner rules:** panels never resize with their contents. A box keeps its size and title
  whether open, closed, folded or holding different content. Flat content inside floating
  cards. "x → y" shows y green if it helps, red if it hurts. Card faces never slide or scale
  (the hand's tray may lift a card).
- **Seat coins by glaze** (`src/ui/playerGlazes.ts`):
  - Kyanos (Δ): the owl
  - Melas (Ν): the winged horse
  - Porphyra (Θ): the turtle
  - Kinnabari (Κ): the lion
  - Art is in `assets/chrome/`, made with Codex for this repo.
- **Removed, per the owner's earlier calls:**
  - the verb discs and their curved realm sheet, with their commands moving to the place panel,
    dock, happiness card, drawers and hand
  - the seat discs: a rival's coin in the place panel opens their card, and End turn's waiting
    state names who is acting. Switching the hotseat viewer moves into the menu ("View as").
  - the consult strip: Victory and Agora become drawers, Codex and Costs go to the menu.

## Standards

**Text and readability.** [Xbox Accessibility Guideline 101](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101)
sets 18 px body height at 1080p for PC and asks for text scaling to 200 %.
[XAG 102](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102)
sets 4.5:1 contrast for text, and 3:1 for large text and inactive controls. The shell is
drawn on a 1440×900 canvas and scaled uniformly (1.2 at 1920×1080). At design size:

| Role                                            | Size at 1440×900 | At 1080p |
| ----------------------------------------------- | ---------------- | -------- |
| Smallest text anywhere (small-caps tags, units) | 13 px            | 15.6     |
| Secondary lines, tooltips' body                 | 14 px            | 16.8     |
| Body                                            | 15–16 px         | 18–19    |
| Numbers in panels                               | ≥ 16 px          |          |
| Names / titles                                  | 20–24 px         |          |

- **Text scale.** A Text size setting (Standard / Large = 115 % / Largest = 130 %) scales
  every text token. Boxes keep their size and their contents scroll inside.
- **Contrast.** 4.5:1 for all text, measured against the lightest texture pixel. 3:1 for icons
  and disabled controls.
- **Targets.** Every control is at least 32 px; frequent ones are 44 px or more. Every control
  has an accessible name, a visible focus ring and a tooltip.
- **Motion.** Movement takes 200–320 ms. Everything stops under `prefers-reduced-motion`.
- **Geometry.**
  - Nothing overprints. A panel's size never depends on its contents or state.
  - `ui:audit` and `ui:conduct` are clean at 1280×800, 1440×900 and 1920×1080.
  - `ui:check` ratchets only down: colours live in `tokens.css`, sizes in `type.css`, and
    z-index comes from `--z-*`.

## Open owner questions

- None blocking. Readings taken without asking are listed in the PR body.

## Three-axis parity

| Axis             | Applies? | Required representation and proof                                                                                                                                                  |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine / backend | N/A      | No rule, command or projection changes; the shell reads the same status functions.                                                                                                 |
| Frontend         | Yes      | Every `GameCommand` keeps a surface. `src/parity/commandParity.ts` is updated to the new components, and the parity suite, component tests, e2e, `ui:audit` and `ui:conduct` pass. |
| Simulation & AI  | N/A      | Bots never touch the shell.                                                                                                                                                        |

## Architecture impact

All N/A except presentation: the shell keeps reading engine status functions for costs, blocked
reasons and previews, dispatches only `GameCommand`s, and owns only view state (open drawer,
pick, back target, outliner settings, text scale).

## PR slices

One branch, `feat/imperator-shell`, built in these slices. Each slice leaves the game playable.

0. **Foundation.**
   - A uniformly scaled 1440×900 HUD canvas.
   - Chrome tokens (bronze, parchment, glaze, the type floor, the text-scale setting).
   - Frame and control primitives, `SeatCoin`, motion tokens.
1. **Place panel and confirm.**
   - The docked place panel (own / rival / land / Oracle / good) with its actions.
   - The confirm bar. The verb discs are removed.
2. **Sidebar and drawers.** Realm (Overview / Cities / People), Ideas, Agora, Trade, Victory,
   Cards. Back button, foot line.
3. **Dock and outliner.** The log line, square modes and legend, Trade / Buy a card / the Dole,
   End turn. The outliner's three sections and its settings.
4. **Top bar, menu, alarms, tooltips.**
   - Change under every stock; the happiness card with Calm.
   - The menu with Codex, Costs, Plates, View as and Text size.
   - Coins on the seal and alarms; banner toasts.
5. **Hand and moments.** The tray and hand view. Composer, deal card, Assembly pill and riot
   warning, re-anchored and re-skinned. Every legacy modal is re-skinned to the frame.
6. **Quality passes** against the standards above until reviewers find nothing.

## Acceptance and validation

- `npm run check`, `lint`, `test:run`, `test:parity`, `ui:check`, `docs:check`, `knip` and
  `test:browser` all pass.
- `ui:audit` and `ui:conduct` are clean at the three sizes.
- Screenshots of every surface at the three sizes match the prototype's layout.

## Retirement

After merge, update `docs/reference/frontend-presentation.md` and close `IMP-1` in the
[UI ledger](ui-remaining.md), then archive this plan.
