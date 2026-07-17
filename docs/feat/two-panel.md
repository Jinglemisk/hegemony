# Two-panel — the left/right rail split, deep-links, and the player dossier

**Status:** planned. Primary slot **Phase 3** (the rivalry layer), because the player
dossier — sizing up a rival's cities, pops and buildings — is a rivalry surface. Three
pieces are cheap and self-contained and may be **pulled forward** ahead of Phase 3 (see
Sequencing): the rail split, the route model, and the responsive uniform-scale.

Grows out of the KYKLOS refit (`docs/feat/ui-refit.md`) — same grammar (full-bleed sea,
flush glass spines, discs threaded on them, floating cards), extended to the right edge.

---

## The law: left is what you *act on*, right is what you *consult*

The KYKLOS rail today mixes two kinds of surface. You **act on** Cities, Pops, Build and
the Market — each opens a page you *do something* in. You do not act on the Codex; it is
reference. That is why the Codex read wrong as a ledger page even after it moved there: it
is reference wearing a control's clothes.

Split the two and the whole UI gains a test that answers "which side does X go?":

| Left rail — **act** | Right rail — **consult** |
| --- | --- |
| Cities | Chronicle |
| Pops | Codex |
| Build | Players (dossier) |
| Market | Victory |

- **Codex** leaves the left rail for the right — it is the reference surface, and most
  future reference candidates (dice tables, decks, the omen table) fold into it as
  *sections* rather than earning their own disc. Resist a rail of nine discs; that is the
  menu KYKLOS was reacting against.
- **Victory** moves right: you do not act on it, it is a race table *about everyone*. Its
  count already lives permanently in the ledger header, so the number stays visible on the
  left while the detail — who leads each card, by how much — is consult-only on the right.
- **Chronicle** becomes a right-rail disc instead of the current edge drawer
  (`ChronicleDrawer`). This **reverses Q19**, which ruled the chronicle could not be a tab
  because a running narration must stay visible and a tab hides it. That ruling was correct
  *then*; it is safe to reverse *now* because the **dock ticker** shows the latest line
  permanently (see `.dockTicker` in the command dock). The ticker is therefore
  load-bearing, not decoration — do not drop it when this lands.

### The right rail is a mirror of the left, not the mock's single tab

`DECIDED-UI-LAYOUT.html` only ever had one right-side view, so it uses a lone `.c-tab`
disc. This plan mirrors `.bar.rail` on the right edge — a flush glass spine with discs
overhanging *inward* onto the sea — which is an extension of the mock's own grammar, not a
departure from it. The floating card opens to the **left** of the right rail, as the ledger
opens to the right of the left rail.

---

## Responsive: uniform-scale first, per-element minimums later

**Decided (user, 2026-07-17): the chrome scales down uniformly in smaller viewports — the
layout stays identical, only smaller — with per-element minimum sizes added later.**

Today it does *not* do this. Measured at a 1200px viewport, the chrome is the same absolute
pixels as at 1600 (topbar 73 / rail 62 / ledger 308 / dock 97 / knob 54; root font 16px);
only the full-bleed map absorbs the difference, and the existing `@media` blocks in
`responsive.css` mostly target dead class names from the pre-KYKLOS docked layout.

The uniform-scale is cheap **because the KYKLOS token table already centralises every chrome
dimension** (`--top-h`, `--bot-h`, `--rail-w`, `--bub`, `--vb`, `--panel-w`, `--chron-w`,
type sizes). Two viable mechanisms:

1. **Scale the root font-size** with `clamp()`/`vw` and express chrome dimensions in `rem`.
   Everything typeset in `rem` scales for free; the px tokens convert to `rem` once.
2. **A single `--ui-scale` factor** (a `clamp()` on viewport width) that the tokens
   multiply through. Keeps px authoring, one dial to reason about.

Either way it is a token-layer change, not a per-component rewrite — the payoff of having
ported the table. **This makes the two-panel safe at small viewports without float-vs-reflow
agonising**: both panels still float over the sea (the board is never reflowed, only
covered), and the whole thing shrinks together so 308 + 292 of chrome stays proportional.
Per-element minimums (a floor below which a disc or the ledger stops shrinking) come as a
later pass, exactly as the small-viewport story tightens.

The stale `responsive.css` breakpoints targeting docked-layout class names should be swept
when this lands — they are dead weight and misleading.

---

## The route model: model routes now, add history when the second level exists

Both panels become small in-app routers with a per-panel **history stack**.

- **Model the route from day one**, even while the stack is only ever one deep. A page is
  `{ view: "codex", entry: "happiness", scroll?: number }`, not a bare `activeTab` enum.
  Retrofitting a route onto an enum is painful; widening a shallow route is not. Do this in
  the cheap early pass so nothing is built against the enum shape.
- **Add the history stack + a "back" control when the second level exists** — which is
  exactly when the deep-links (below) land, because a deep-link is the first way to *arrive*
  somewhere without having navigated there step by step. Before that, "back" has nowhere to
  go; a stack then is over-engineering.
- **Each history frame stores its scroll offset**, restored on pop. This is the explicit
  ask ("a scrolled-down buildings menu that comes back scrolled") and the fiddliest, most-
  felt part. It is the reason the frame is `{view, entry, scroll}` and not just `{view}`.

Both the left ledger and the right panel get their own independent stack and "back" control.

---

## Deep-links: the term IS the link (no (?) sprinkles)

**Do not scatter (?) / (i) buttons.** That is chrome on every noun — the exact clutter the
refit has been removing. Reserve a literal (?) only for a header that has no prose term to
hang a link on.

`AnnotatedText` already parses card/chronicle/modal prose and **types every resource, pop
and building word** it finds (`TOKEN_MAP`: `"granary"` → `{type:"building", key:"granary"}`).
It is already locating and identifying the terms. Make the identified term itself the link:
clicking "Happiness" in any card, chronicle line or modal opens the right panel at the
codex entry for happiness. One change, and it works everywhere prose already appears —
across the whole game at once, not per-site.

**Address entries by data id** (resource / building / pop / table ids), never a hand-kept
entry registry. This preserves the codex's real invariant — it renders *from* the ruleset,
so it cannot disagree with the engine. A parallel id→entry registry would be the first thing
to rot.

---

## The player dossier: reuse the ledger tabs, do not fork them

Click a player in the top-bar roster → the right panel opens their dossier: their cities,
pops, buildings — the same views the left ledger shows for *you*, aimed at *them*.

`CitiesTab` / `PopsTab` / `BuildingsTab` already take `holdings` as a prop (good) but read
`viewerId` from context to gate their **actions** (build buttons, ladder moves). Point them
at another player unchanged and the rendering is correct while the action checks quietly
evaluate *your* ability against *their* tiles — wrong.

So thread an explicit **`ownerId` + a read-only flag** through the three tabs: rendering
keys off `ownerId`, and read-only mode drops every action control. Then the dossier is
nearly free — the same components aimed elsewhere. **Forking them yields two renderers that
drift**, which is precisely the class of failure this whole effort has been cleaning up
(chrome rebuilt beside the mock instead of from it). One renderer, parameterised.

---

## Sequencing

**Pull-forward-able ahead of Phase 3 (cheap, self-contained, everything else depends on
them):**

1. **Rail split** — Codex + Victory move to a new right rail mirroring `.bar.rail`;
   Chronicle becomes a right disc; `ChronicleDrawer` retires (ticker stays). Sweep the
   dead `responsive.css` breakpoints.
2. **Route model** — pages become `{view, entry, scroll}` on both panels, stack still one
   deep. No behaviour change; unblocks the rest.
3. **Responsive uniform-scale** — the `--ui-scale` (or rem-root) token pass. Independent of
   the two-panel but raised alongside it and what makes it safe small.

**Waits for Phase 3 (rivalry-native, or needs a second navigation level first):**

4. **Deep-links** — the `AnnotatedText` term-as-link hook; brings the history stack + back
   control online because it is the first way to arrive two levels deep.
5. **Player dossier** — `ownerId` + read-only threading through the three tabs; the roster
   opens it. This is the rivalry surface proper.

---

## Costs and non-goals

- **Width.** Left 308 + right 292 = 600px of chrome. At 1600 the board still gets ~1000.
  The uniform-scale above is the answer at smaller widths — both panels float over the sea
  (board covered, never reflowed) and everything shrinks together.
- **Not a redesign of what the pages contain** — this is where each page *lives* and how you
  *reach and stack* them. The page contents (Cities matrix, codex sections, etc.) are
  untouched except for the `ownerId`/read-only parameterisation.
- **One ticker stays sacred.** The dock ticker is what lets the chronicle leave the screen
  edge; it must survive every future dock change.
