# RUN-LOG — the UI overhaul autonomous pass

Append-only. One section per phase: what shipped · commits · deviations (and why) ·
anything left red · screenshots taken. This file is the owner's re-entry point.

Branch: `ui-overhaul` · worktree: `~/Desktop/hegemony-ui-overhaul` · run started
2026-08-15. Rules and policies: `THIS-WORKTREE.md`. Plan: `docs/plans/ui-overhaul.md`.

---

## Phase 00 — run scaffold

**Shipped.** The three planning documents and this log, committed as the run's first
commit so every later diff sits on top of a recorded intent.

- `THIS-WORKTREE.md` — branch rules, run loop, owner-ratified policies.
- `docs/plans/ui-overhaul.md` — the technical plan, phases 0a → 6.
- `docs/plans/ui-overhaul-prototypes/` — six screenshot-verified reference scenes
  plus `proto.css`.
- `RUN-LOG.md` — this file.

**Deviations.** None.

**Red.** None.

**Screenshots.** None yet.

---

## Phase 0a — tokens & guards

**Shipped.** The invisible groundwork: one token table, one type vocabulary, one
place that knows how big the chrome is, and a ratchet that stops the old habits
coming back.

- **Self-hosted faces.** Cinzel (display) + Alegreya (body), 24 woff2 files /
  565 KiB in `assets/fonts`, `@font-face` in `src/styles/fonts.css`. Latin,
  latin-ext, greek and greek-ext subsets — the Greek ones are not optional, the UI
  writes real Greek (blazons Δ Ν Θ Κ, ostraka ΝΑΙ / ΟΥ). Marcellus and Source
  Serif 4 retired; the Google Fonts `<link>` is gone from `index.html`.
- **Tokens moved to `:root`.** The whole table left `.shell`, which now carries
  layout only. Two things were broken by the old scoping and are fixed by the
  move: the camera's probe had to be mounted inside `.shell` to read anything, and
  anything portalled out of the shell lost the palette.
- **New tokens.** `--pos/--neg/--warn` plus their `-lit` twins for lacquer
  objects; the four player glazes under their real names (and `--p4` corrected
  from olive `#55673a` to Porphyra `#7c4d79` — it was colliding with `--olive`);
  the terrain ramp; a five-step 8px spacing scale; a nine-rung named z ladder.
- **Nine type roles** in the new `src/styles/type.css`: display / title / verb /
  label / body / body-em / stat / stat-lg / caption, with `.num` tabular figures
  and the `.pos/.neg/.warn` text colours. Sizes are rem, so they ride `--ui-scale`
  with the rest of the chrome.
- **The global button rule is dead.** `button { font-family: var(--disp);
font-weight: 700 }` fired on every button in the app; the display register is
  opt-in now via the role classes.
- **Camera couplings extracted** into `src/ui/chromeMetrics.ts` with a focused
  test: the `{ top: 96, bottom: 100 }` literal became `--camera-inset-top/-bot`
  (each derived from its bar's height), and the bare `360` became
  `--panel-w-base`. `useMapCamera` now holds no dimensions at all.
- **`npm run ui:check`** — `scripts/check-ui-system.mjs`. Counts three habits and
  fails only when a count RISES: font sizes outside the role sheet (224), raw
  hexes outside `base.css` (75), and `title=` sentences explaining mechanics in
  printed chrome (20). Those are the starting budgets; later phases turn them down.

**Commits.** `758f040` fonts · `4685215` tokens + roles · `388b380` camera
metrics · `db0b58d` ratchet.

**Deviations.**

- The plan calls Phase 0a invisible. Killing the global button font rule is item 4
  of that phase and is _not_ invisible — every unstyled button dropped from Cinzel
  700 to Alegreya. Followed the plan; the phases that follow restyle those buttons
  deliberately, which is the point.
- The audit's starting counts were quoted as 237 font-size declarations and ~60
  metatext sites. The ratchet measures 224 and 20 against its own definitions
  (`title=` holding a full sentence, comments stripped). Recorded as measured
  rather than reconciled to the audit's prose — the number that matters is that it
  only goes down from here.
- The metrics test injects a fake measurer rather than driving real CSS: jsdom has
  no layout engine, so `var()`/`calc()` never resolve there. Testing the
  composition against the exact expression strings also pins the token _names_,
  which is the thing that actually rots.

**Red.** None. `check` · `test:parity` (65) · `chromeMetrics` (7) · `lint` ·
`ui:check` all green.

**Screenshots.** `.playwright-mcp/p0a-{table,assembly}-1440x900.png`. Both scenes
render; the only visible change is the typeface. Confirmed the two known bugs
still present for later phases: the TUNE fab sits on top of END TURN, and the
board shows `CITY -2,0` / `COLONY 3,0` rather than names.
