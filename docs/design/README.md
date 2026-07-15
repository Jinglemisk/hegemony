# docs/design — the visual-identity decision record

Produced 2026-07-13 in a brandbook/architecture working session (multi-agent audit → three
art directions → adversarial judging → owner rulings → controlled icon A/B test). Everything
here is a **static, self-contained HTML/markdown snapshot** — open any file directly in a
browser. Nothing here is wired into the app; the app applies these decisions during the
Phase 1.5 interface refit (`docs/roadmap-appendix.md`).

## The deliverables

| File | What it is | Status |
| --- | --- | --- |
| `brandbook-v0.1.html` | The visual constitution: diagnosis of the current UI, the Five Laws, palette / type / iconography / board / component / modal / layout systems, the three-direction verdict, application plan. Carries every owner ruling to date. | **Living draft** — leading composite: Katalogos chrome + polychrome board + stylized icons |
| `architecture-report.html` | Code-health audit (component duplication, engine/UI boundary), multiplayer-readiness scorecard, staged monorepo plan (Stage 0–3), refactor ladder R1–R8 sequenced against the reskin. | Reference — feeds `docs/feat/ui-refit.md` |
| `direction-dossier.md` | Unabridged specs of the three art directions (Katalogos, Painted Table, Strategos) + the three judge verdicts (craft / shipping / playtest lenses). | Archive — verdict folded into the brandbook |

## showcases/ — full-screen mockups (1440×900 stage, real 37-tile classic board)

All six render the **same canonical mid-game scene** so comparisons isolate one variable.
The first five are static 1440×900 stages; `DECIDED-UI-LAYOUT.html` reuses their board data verbatim but
**fits the viewport at any size** and is the only interactive one — pan/zoom, open/close panels, live A/B/C switch.
Board state in all: polychrome kind-glazes (wheat/olive/sienna/grey), bone yield chits,
slots visible on every tile, pops as class-glyph + numeral, keylined owner rims.

| File | Arm | Status |
| --- | --- | --- |
| `katalogos.html` | Base direction — paper-catalog chrome, generic minimal glyphs | Superseded by the stylized arm |
| `katalogos-stylized.html` | **Icon A/B winner, owner-ratified** — dedicated Greek pictograms under the legibility law (silhouette-first, 12px floor, one-glyph-one-resource); refined pass fixed all 8 recorded collisions | **Leading candidate for the game's look** |
| `katalogos-plain.html` | Icon A/B counter-arm — zero pictorial icons; text/numerals/color/geometry only | Archive — proves a text-only fallback exists (future accessibility mode is cheap) |
| `painted-table.html` | Second-place direction — material tabletop, vase-black rail (its rail + board grammar were grafted into the verdict) | Archive |
| `strategos.html` | Third-place direction — dark command HUD (its tooltips, receipts-table method, turn banner were grafted) | Archive |
| `DECIDED-UI-LAYOUT.html` (direction name: **KYKLOS**) | **The chosen layout (2026-07-15)** — drawn to the owner's own brief, not the agent bake-off; supersedes the five arms above as the interface KYKLOS ships. Discs are always *threaded on an edge* with ~3/5 spilling onto the sea; never a panel behind them. Round verb discs (name+cost beneath), one square hourglass End Turn, permanent left rail of menu discs opening collapsible slabs, fully-collapsible chronicle, free-floating map clamped by its **centre**. Top: cards left · season medallion dead centre · players right; whose-turn above End Turn. Fits the viewport exactly at any size — the only showcase that never scrolls. **Light-mode parchment** throughout, per ruling 1 below — bone-glass chrome, ivory discs with ink glyphs, and the black glaze kept only as the ceremony register (tooltips, key chips, the commit). The teal sea is the one dark value left, so anything floating on it (season, whose-turn, zoom) stays ivory. Carries a live **three-arm switch**: **A** straight spines; **B** elliptical **domes** (footer + sidebar) with the resource row across the dome floor and the verbs fanned — apex centre, lower at the rim; **C** domes with resources split wood/stone/food · medallion · gold/influence/happiness. A and C share the split resources and differ *only* in the chrome's shape, so the switch isolates one variable at a time. Measured, not guessed: a true circle cannot carry the fan (7 verbs need ~630px of span; a circle only reaches that at its equator, where the arc runs vertical), and the fan (744px with labels) — **not** the resource row (446px) — is what sizes the dome. Dead space under the apex = `ry − 73`, so each arm tunes depth: B `ry 105` (carries the row), C `ry 96, cyOff −8` (carries nothing, hugs the fan). | **Decided — this is the layout.** Two things are still open *inside* it: (1) the A/B/C arm (chrome shape + resource placement); (2) its verb/resource/menu glyphs are placeholder line-drawings for silhouette only — the ratified **stylized** pictograms (ruling 4) still govern iconography and have not been cut into this file. |

## audits/ — the ground-truth reports the work was built on

`components.md` (React duplication/coupling) · `styles.md` (CSS tokens/palette extraction) ·
`assets.md` (iconography inventory) · `boundary.md` (engine/UI + server-readiness) ·
`docs.md` (design-relevant docs extraction) · `split.md` (repo-structure options) ·
`icon-ab-verdict.md` (the stylized-vs-plain judge report + field-vs-list hybrid rule).

## Owner rulings captured (2026-07-13)

1. **Game is light-mode parchment**; black glaze only as ceremony register (verb rail, tooltips, game over).
2. **Polychrome board**: terrain fill hue = kind (art on tiles stays banned; color was never the problem).
3. **Bone yield chit** always on; **slot sockets on every tile at rest**; **pops as numerals**, never one mark per pop.
4. **Iconography: stylized**, ratified via A/B test, bound to the §V legibility law; UI glyphs are hand-authored SVG, Nano Banana reserved for ceremony art.

> **Superseded in part (2026-07-13, later that day — D13/Q36 in `docs/roadmap-appendix.md`):**
> the owner has flagged reservations about parts of the overhaul. The rulings above are no
> longer blanket-ratified — each visual element ships in the Phase 1.5 reskin only on an
> explicit per-element **keep** (Q36); blanks park at the current look until a post-Phase-5
> design session. The interaction grammar and refactor ladder are unaffected.

## Caveat on "verified"

Agents verified the **stimulus** (contrast, sizes, silhouettes, overflow — machine-checkable)
and modeled glance-reads. Human legibility claims await playtest: arm's-length test on a real
laptop, a Sim Daltonism pass over wheat-vs-sienna, and the chit pictogram/numeral toggle test.

## Published artifact mirrors (private, may be deleted from the gallery at any time)

- Brandbook: https://claude.ai/code/artifact/d366e1d5-fb34-4972-975b-e0ee0c22c303
- Architecture report: https://claude.ai/code/artifact/97341bce-e7e4-4dfd-90ab-b6045a7de60f
- Direction dossier: https://claude.ai/code/artifact/26ad50bd-02f4-40fb-aba9-dc9ee8526bca
- Showcases: Katalogos https://claude.ai/code/artifact/635703c7-3319-41ee-9173-fbbac3789935 ·
  Painted Table https://claude.ai/code/artifact/adc3e236-0849-4f38-acce-abba807588d2 ·
  Strategos https://claude.ai/code/artifact/f1457bf6-8ce9-4943-94eb-b7e595ae45d9 ·
  Stylized https://claude.ai/code/artifact/8ff6e39a-0c39-4b94-8100-b376cf533922 ·
  Plain https://claude.ai/code/artifact/6cb906d1-4370-4f83-82a7-8ab6cf54d3cd

**This directory is the source of truth**; the artifact links are disposable mirrors.
