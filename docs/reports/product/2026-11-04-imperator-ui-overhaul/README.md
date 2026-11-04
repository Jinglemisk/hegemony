# The Imperator-style UI overhaul: the proposal page

On 2026-11-03 the owner asked for the shell to be brought up to the standard of Imperator: Rome.
Four rounds of owner notes followed over two days. On 2026-11-04 the owner parked the overhaul for
later and asked that this page never be lost. It is tracked as `IMP-1` in the
[UI ledger](../../../plans/ui-remaining.md).

Open [the page](artifact/index.html) in a browser. It is v7 of the claude.ai artifact
(<https://claude.ai/artifact/WDp5gzzJCoYqdJeSXtDd5o>, private to the owner, version
1793781706-13a2).

The prototype at the top is a working 1440×900 shell with three toggles:

- **Proposal B**, the default: the Proposal with the owner's 2026-11-04 changes. The log line runs
  across the dock, the rail is a centred tab with larger buttons, the drawers are the outliner's
  width (320 px), and the drawer contents are icon tiles with the rules in tooltips.
- **Proposal**: the layout as the owner's 2026-11-03 calls left it.
- **Today**: stills of the live build in the same frame.

Below the prototype are the verb click-path study, what Imperator does and what we take from it,
the overhaul zone by zone, the build order and the sources.

## Open

- The Proposal or Proposal B.
- What the owner meant by "notification circle icons". The alarms are already circles.
- Then the design freezes, and the overhaul is built in eight UI-only slices, one PR each.

The verb study found four problems in the live build at main c0739d0:

- A click on the Civic disc buys Calm for 2 gold with no confirm.
- Found sends a citizen by default.
- The Cities page drops its raise links past three settlements.
- The realm panel's tab isn't reset between seats.

## Rebuilding the page

`python3 tools/compose.py` rebuilds `artifact/index.html` from `artifact/v1.html`, the first
version, and `parts/`. `parts/script.js` is the prototype and `parts/stage.css` its styles.
Proposal B is the `st.b` flag: `winHtmlB` and `winBodyB` build its drawers, and its styles sit
under `.stage.b` and `.bw`. The page fragments end in `.htm` because their links resolve from
`artifact/`, not from `parts/`, and the docs link check would read them from `parts/`.

To check the page, serve it with `python3 -m http.server 8765 -d artifact` from this folder, then
run `node tools/check3.cjs <outdir>` (every state, both proposals), `tools/interact.cjs`,
`tools/dock.cjs <outdir>`, `tools/tips.cjs <outdir>` and `tools/b.cjs`. Each ends with
`errors []` when the page runs clean.

## Not in the repo

The repo is public, so the Imperator: Rome screenshots stay out. So do the check stills, the
live-build captures and versions 2 to 6 of the page, which are also in the artifact's history.
All of it is in the `hegemony-imperator-ui` folder on the owner's Mac.
