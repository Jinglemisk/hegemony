# THIS WORKTREE — the UI overhaul, one autonomous pass

This directory is a **git worktree** of the Hegemony repo, on branch **`ui-overhaul`**,
created 2026-08-15 from `origin/main` @ `14acdcc`. It shares the `.git` store with the
primary checkout at `~/Desktop/hegemony` but has its own HEAD, files, and node_modules.

The owner is away. The implementing agent executes the **entire overhaul in one
continuous pass**, self-checking as it goes, and never waits on the owner. Decisions
are made, logged, and moved past — not asked.

Pitch with before/after screenshots:
https://claude.ai/code/artifact/e9b9fc1d-4d72-4ea6-a03f-22327529b3cd
Detailed technical plan: `docs/plans/ui-overhaul.md`
Reference prototypes (screenshot-verified HTML/CSS): `docs/plans/ui-overhaul-prototypes/`

## The mission, in order

Implement every phase of `docs/plans/ui-overhaul.md`, in this order, in one run:

| #   | Phase              | Scope                                                                                                                                                                                                                                                                                    |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0a  | Tokens & guards    | palette + `--pos/--neg/--warn`, nine type roles, spacing scale, z-ladder; tokens `.shell`→`:root`; extract the 3 JS↔CSS camera couplings; kill the global display-face button rule; add the `ui:check` ratchet script                                                                    |
| 0b  | Effect-icon system | `iconRegistry` total over all typed-effect discriminants + parity totality test + `<EffectIcon>`; **all glyphs are hand-drawn inline SVG line icons** — one line-weight, 24px grid, `currentColor`, self-consistent set; no AI-generated art, no PNGs beyond the existing resource masks |
| 1   | The great deletion | remove/relocate all ~60 metatext sites; `blockedHint` optional → tooltip only; kill deck/seed telemetry; re-dock the TUNE fab so it can never cover End Turn                                                                                                                             |
| 2   | The ceramic shell  | light bone bars + clay meander edges; symmetric layout (resources dead-center top, verbs dead-center bottom, tab icons centered in rails); **twin dials** (SeasonClock bottom-left, EndTurnSeal bottom-right); sea chart full-bleed under the board; docked tablets                      |
| 3   | The board          | ceramic terrain ramp + engraved emblems; settlement seals, pop beads, glaze rims, name plates (ARGOS, not "City 1,1"); stroke-based states; fix the Found-banner overlap bug                                                                                                             |
| 4   | Panels & ceremony  | all seven tabs rebuilt per `f-panels.html` (Cities alarm, The Ladder, Build cards, Market rates, Victory laurels, Agora, Chronicle in game voice); ceremony dial through ModalShell (dark fates, venture die)                                                                            |
| 5   | The Assembly       | rename `assembly.css` classes first; proposal + voting scenes per prototypes (stelae with "HIS LAWS TEND TO" example effects, law card at the bema, tug-bar tally, ostraka, lit voting seat)                                                                                             |
| 6   | Closing QA         | full screenshot sweep at 1440×900 and 1280×800 across every surface; fix what the sweep catches; final RUN-LOG summary                                                                                                                                                                   |

## The continuous loop (every phase)

1. **Implement** against the prototype references. Fidelity order when sources
   disagree: prototype HTML → `docs/plans/ui-overhaul.md` → the artifact pitch.
2. **Check**: `npm run check` · `npm run test:parity` · `npm run ui:check` (the
   ratchet must never rise) · `npm run lint`.
3. **See it**: run the dev server, drive the real app with Playwright, screenshot the
   changed surfaces at 1440×900, compare against the prototype images, fix visual
   defects. Use the tune panel (backtick; `Start at Assembly` flag) to reach deep
   states. Screenshots go in `.playwright-mcp/` here (gitignored) as the running
   baseline.
4. **Commit** in small, one-decision commits as `Jinglemisk <ctaner95@gmail.com>`,
   no co-author trailers. Phase complete → **push** `ui-overhaul` to origin.
5. **Log**: append a RUN-LOG entry (below), then continue to the next phase without
   pausing.

## Owner-ratified run policies (2026-08-15)

- **Icons: SVG line icons, pure and simple.** The entire effect-icon set is inline
  SVG in one consistent style. Consistency beats ornament; if a glyph can't be drawn
  cleanly, draw it simpler.
- **Work clean, future-proof — no patchwork.** If doing something right requires
  refactoring beyond the presentation layer (e.g. structured chronicle entries
  instead of string-munging, a proper settlement-name field), **do the refactor**.
  Constraints that still hold: no game-rule or balance changes; determinism, saves,
  and the parity/scenario suites stay meaningful and green; engine-touching commits
  are prefixed `engine:` so the adoption review can find every boundary crossing.
- **Push after each phase.** Push the branch only — never open a PR, never merge
  into main.
- **If stuck after honest attempts: leave it red and keep going.** Mark the commit
  `WIP-RED:`, write exactly what is broken and what was tried in the RUN-LOG, and
  continue with the next phase. Do not stop the run; do not silently revert. The
  owner triages on return.
- **Never wait for the owner.** Ambiguity is resolved by the fidelity order above
  plus the brandbook; every judgment call gets one RUN-LOG line.

## RUN-LOG

Keep `RUN-LOG.md` at this root, append-only, one section per phase:
what shipped · commits · deviations from plan (and why) · anything left red ·
screenshots taken. This file is the owner's re-entry point.

## Standing rules of this branch

1. **Never merge `ui-overhaul` into `main`.** Adoption is the owner's explicit call.
2. **Sync from main by merge, never rebase**: `git fetch origin && git merge
origin/main` — once at run start; no mid-run merges expected while the owner is
   away.
3. Engine-side edits follow the "work clean" policy above — never casual, never
   patchwork, always `engine:`-prefixed, never rules/balance.
4. Both checkouts run side by side for A/B: `npm run dev` here and in
   `~/Desktop/hegemony` (Vite picks free ports; localStorage is per-port).

## Endgames (owner decides after the run)

- **Adopt:** PR from `ui-overhaul`; take this branch for presentation files, review
  every `engine:` commit explicitly; delete this file and RUN-LOG.
- **Reject:** `git worktree remove ~/Desktop/hegemony-ui-overhaul`, delete branch.

## Kickoff prompt for the implementing agent

> Work in `~/Desktop/hegemony-ui-overhaul` only. Read `THIS-WORKTREE.md`, then
> `docs/plans/ui-overhaul.md`, then open the prototypes in
> `docs/plans/ui-overhaul-prototypes/`. First commit = these three doc paths +
> RUN-LOG.md scaffold. Then run the sync ritual and execute phases 0a → 6 in one
> continuous pass per the loop and policies in THIS-WORKTREE.md. The owner is away:
> decide, log, continue.
