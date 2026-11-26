# Frontend presentation contract

Status: living reference for the implemented frontend.

Last updated: 2026-11-23.

This contract defines how the frontend explains gameplay mechanics without creating a
second rules engine. Engine selectors, action statuses, and content manifests are the
authority; presentation components project their output for sighted, keyboard, touch,
and assistive-technology users.

## Authority and language

- An action surface shows the **effective** cost returned for that concrete action and
  target. A rulebook, Codex, or other reference surface may show a base cost only when
  it labels that value as base.
- Availability and blocked explanations come from the same status or legal-move
  predicate that gates execution when one exists. An action without a dedicated status
  must mirror the move's exact guard; it must not invent a separate rule.
- Structured effects are projected from typed effect data. Authored prose may provide
  political framing or context, but it must not be the only representation of a cost,
  duration, source, blocked reason, or mechanical effect.
- Presentation code never mutates game state. It may call a controller move only from
  an enabled control.

## Shared primitives

### `Tooltip`

Use a tooltip for an explanation attached to one existing control or compact,
non-interactive board object. Tooltips are portal-rendered, viewport-anchored, and
contain no links, buttons, or other interactive descendants.

Controls remain real buttons. An unavailable action uses `aria-disabled="true"`, stays
keyboard-focusable, and guards its click handler in code. The tooltip is connected with
`aria-describedby` and includes the blocked reason. A non-control board object may use
the focusable tooltip trigger only with an accessible label that identifies the object.

Keyboard focus and pointer hover show the explanation; blur, outside pointer activity,
or Escape dismisses it. One tooltip shows at a time: opening one closes the last at
once, even inside a locked card's grace (owner, 2026-11-23). On touch, the first tap explains and suppresses its associated
click, while the second tap activates. Pointer cancellation clears suppression. This
touch contract requires owner verification on real hardware; DOM or browser touch
emulation is useful regression coverage but is not equivalent to a device test.

### `Popover`

Use a popover when the surface contains choices or any other interactive content. It
is a labelled, non-modal dialog rendered in a portal. Opening moves focus into the
dialog. Escape or an explicit cancel dismisses it, and unmounting restores focus to the
connected opener when that opener still exists. Positioning must use the shared
anchoring hook rather than component-specific viewport math.

Choice collections use ordinary labelled lists of native buttons and normal Tab
navigation. Do not apply ARIA menu roles unless the complete managed-focus menu
keyboard pattern is implemented.

### `MechanicsDetails`

Use the standard slots in this order where present: heading, structured effects,
effective cost, short explanation, and blocked reason. A source is not a slot: the
thing's owner already stands beside it (a Law's stele, its Agora line). Resource
amounts use the frame's `Chips`, which read each amount in words ("4 Wood"). The holding
table's net-income grid is the one exception: it shows every resource, a zero as a dash,
so its columns line up. Tooltip content is descriptive only; actions and Codex
navigation live outside it.

### Headings, icons and countdowns

Three rules, each owned by one shared part so a new surface gets it by using the part
(owner, 2026-10-22):

- **A heading is a name.** The frame tooltip (`Tip`) takes a title and, at the far end
  of its line, a countdown; nothing else. A number the chip or disc already shows is not
  repeated beside it, and what the tooltip adds goes in its body. Kickers above a card's
  title name the moment ("Turn end"); they do not restate a number. Screen readers keep
  the words in the trigger's label. `npm run ui:check` counts tooltip titles or
  paragraphs built by hand outside the parts.
- **Every sentence a player reads takes its terms' icons.** `AnnotatedText` (a string)
  and `Prose` (JSX) put each game term's icon before its word: resources, classes,
  buildings, settlements, terrain, luxuries and each good, unrest, titles and each
  title, Ideas and each Idea, trade, development cards, the Assembly's nouns. The term list is
  built from the icon registry and the content package, so new content gets its icon
  without touching a sentence. Tooltip paragraphs (`TipBody`), ledger labels, warnings,
  blocked reasons, toasts and card text all pass through it; an effect renders through
  `EffectLine`, never as raw text.
- **A countdown is a token.** `Turns` is the hourglass and how many of the seat's own
  turns are left (`effectTurns`, `turnsLeftInYear`, `turnsUntilYear`). A turn, an income
  and a seat's year are the same tick, so one number serves food that lasts, a strike, a
  year card, calm and the next Assembly. Rates and limits ("once a turn") stay words, and
  a card's authored rule keeps its own wording.

Changes read "x → y" through `Delta`: y is green when it helps and red when it hurts.

### Card faces

Every card prints through one `GameCard` (owner, 2026-10-27): year cards, fates, Laws,
Directives and National Ideas. A presenter per deck (`src/ui/cardFace.ts`) builds the
face from the engine's typed card, so the face cannot disagree with the rules:

- **Corners** are a closed vocabulary: kind, reach, timing and duration. Each mark's word
  is its accessible name and its hover title. Nothing else goes in a corner.
- **The equation** is built from the card's typed effects, one row per effect, three at
  most; a row's tone (a leaf or clay notch, and a sign) comes from the effect presenters,
  and a Law's costs sit under a "but" rule. It is hidden from screen readers.
- **The sentence** is the card's authored `text`, always in the DOM: printed at ceremony
  size, visually hidden at hand size, where the card's tooltip carries it.
- **Deck counts are never on the card.** A drawn card lands on a table in one order:
  the card, the deck line, the slip, the commit (`DrawnReveal`). `deckLine` is the one
  selector for what a deck makes public: the year deck's cards left and what is left of
  each kind, the fates' count with the kinds on hover, an Assembly draw's politician
  deck. It reads only the projected state, so it never shows an order or a next card.
  The year card has no slip: card, deck line, commit. The commit (`DrawnCommit`) is the
  moment's one lacquer, as wide as its words, which name what the card does from its
  typed effect, with the icon of what it acts on: "Clear the Unrest", "Settle the
  Freeman", "Keep the Raiders" (owner, 2026-11-23). Next year's card shows on the
  clock's hover in the top bar (owner, 2026-11-03); the final year has none.
- **Nothing moves** (owner, 2026-10-28). A card lands at its final place: it turns over
  or fades in where it lies, never sliding or scaling. The stack under it is laid out at
  its final size from the first frame, and what shows later only fades in place (the
  year's commit waits, hidden, while its card is on its back).
- **Fixed rows.** Every card of a size has one layout: the band, the window, the name
  (two lines held) and, at ceremony size, the voice (two lines held), then the panel,
  which takes the room left, then the foot. Every panel starts at the same place, so a
  long effect never pushes a name up.

A mini card carries no text and is decoration beside a name printed elsewhere. A card is
a button only where it can be picked (an Idea, a Law armed for repeal).

## Required decisions and multi-seat workflows

Do not add one unrelated boolean/modal/controller method for every new forced choice.
Engine state may keep domain-specific workflow data, but a player projection exposes a
closed typed required-decision view with source, eligible actor, choices, blocked reasons,
visibility, and completion state. A shared decision host routes that union to focused
renderers using `ModalShell`, `Popover`, and `MechanicsDetails` as appropriate.

Assembly remains an Assembly workflow and trade remains a negotiation workflow; this is
not a generic rules scripting engine. The shared layer owns only presentation, actor,
focus, cancellation/expiry, and public/private projection contracts. Luxury claim choices,
trade responses, National Idea picks and the hunger choice use it rather than creating
feature-private overlay infrastructure. A rival's public moment (its hunger, its Idea
purchase, its riot or revolt) lands as a toast in the lane under the compass: the engine
tags the Chronicle line with a `LogMoment`, and `src/components/frame/moments.tsx` queues
and words it. Each seat keeps its own place in the log, so in hotseat a seat taking the
screen reads what the others did since its last look. Title changes toast every seat,
read off `titleChanges`.

One moment owns the screen at a time, in the engine's order: the last seat's riot result
or revolt card, the year card, the game's end, then the turn notice; the Assembly
and the fate card wait behind them (`HegemonyBoard`). The hunger card belongs to End turn:
a seat that is short of food gets it when it holds End turn, with Go back to return to the
turn, and the turn ends only when it confirms who leaves. The riot and revolt cards read
their moments, so nothing on them is recomputed after the turn has passed. End
turn's confirm at the riot and revolt lines reads `turnEndUnrest`, which tries calm through
the real action on a draft. Bots never wait on any of these: against bots the year card,
the cover and the seat's own cards do not show.

The riot is one sheet of one size from insurance to result (`RiotModal`, RIOT-1). Its table
is six small cards, one per face of the die, and each insurance chosen seals the lowest card
still open with its own seal. The die tumbles about a second (not at all under reduced
motion) and rings the card it found; that card is then read in the shared card format
beside one line per loss, before → after, from the engine's record (`TableLoss` on the roll
and the riot's moment), never recomputed. A seat holding development cards answers pop or
card on that same card. The revolt is read on the same sheet.

Controls dispatch canonical `GameCommand` values through `src/client/controller.ts` and
render engine-derived legal-option/status projections. They never call domain mutators
directly or submit displayed costs and outcomes as authority. The controller retains local
authority only to execute commands; React receives `PlayerView.state`, never that authority.
Changing the hot-seat viewer recomputes the projection so only that seat's private Assembly
and event decision data becomes visible.

## The shell

The game screen is the Imperator shell: a full-height sidebar of drawers on the left
(Realm, Ideas, Agora, Trade, Victory, Cards), one docked place panel, the outliner on the
right (it folds to its own head), the dock with End turn under it, the top bar, and the hand
tray. One left window is open at a time. Panels are parchment or black glaze with bronze
corners, and each seat is shown as its struck coin. Every spend goes through the confirm bar,
which shows the engine's own before → after numbers (`confirmPreview`); a trade or deal card
is its own question and shows its after-values instead. Tooltips wait 400 ms on hover, open at
once on keyboard focus or touch, and only one is ever shown.

### Standards

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
| A head's title (panel, drawer, window, card)    | 20 px            | 24       |
| A moment's sheet title (Assembly, ceremonies)   | 24 px            | 28.8     |
| A drawn verb (lacquer, plaque), sentence case   | 15 px            | 18       |

- **Type roles.** One size per tier, as tokens (`--t-head`, `--t-sheet`, `--t-verb` in
  `tokens.css`): every head's title at 20, every moment sheet's at 24, every lacquer and
  plaque verb in Alegreya Sans 15. Small caps keep `--track-caps`; tracking lives on the
  role, never on a reset. Every figure is lining and tabular (Alegreya's old-style 0
  reads as an o); proper names and the top bar's figures stay in Cinzel.
- **Text scale.** A Text size setting (Standard / Large = 115 % / Largest = 130 %) scales
  every text token. Boxes keep their size and their contents scroll inside.
  - The sizes above are design px on the 1440×900 canvas. A smaller screen scales the
    canvas down, so the 13 px floor draws at 11.6 css px at 1280×800 (k = 0.889). Until
    the player picks a Text size, it starts at Large wherever k < 0.95, which puts that
    floor back above 13 css px.
  - The top bar is the one exception: it keeps one size at every Text size, because its
    44 px cells are already full. Its labels stay whole at every size, and each cell's
    tooltip, which does scale, carries the full words.
- **Contrast.** 4.5:1 for all text, measured against the texture pixel behind it that reads
  worst (for ink, parchment's darkest grain, about rgb 237 215 170; a footer band's 219 198
  154). 3:1 for icons and disabled controls. Text inks are their own tokens: `--ink-72` for quiet text,
  `--pos-ink` and `--neg-ink` for a change that helps or hurts, `--clay-ink` for clay words.
  `ui:conduct` photographs the page with its text hidden and samples the real pixels, so
  textured grounds are checked.
- **Targets.** Every control is at least 32 px; frequent ones are 44 px or more. Every control
  has an accessible name, a visible focus ring and a tooltip.
- **Motion.** Movement takes 200–320 ms. Everything stops under `prefers-reduced-motion`.
- **Geometry.**
  - Nothing overprints. A panel's size never depends on its contents or state.
  - `ui:audit` and `ui:conduct` are clean at 1280×800, 1440×900 and 1920×1080.
  - `ui:check` ratchets only down: colours live in `tokens.css`, sizes in `type.css`, and
    z-index comes from `--z-*`.

## Map presentation

The board is the 3D map, drawn with three.js. The owner ruled on 2026-10-26 that there is
no 2D board and no fallback: without WebGL the game does not load. The map reads the board
and the engine's selectors through one pure projection (`mapModel`), so it cannot disagree
with the rules. The map mode is shell view state and changes nothing in the game.

The canvas is only a picture. Each tile is a real HTML button over the scene, clipped to
the hex as drawn, whose accessible name follows the mode, and each luxury good's name is a
button too. The other labels are HTML that stays upright at any angle and takes no pointer,
so a label never eats a tile's click. That keeps clicks, focus, screen readers, popover
anchors, the browser smoke test and the UI audits working on tiles rather than pixels.

The camera moves, so anything placed by a tile's screen position goes stale. A popover
pinned to a tile closes when the view moves, while the armed pick stays armed, and no tile
tooltip opens while the view is still moving.

Keys 1 to 4 switch the map mode from anywhere but a field or a dialog, so the verb discs
take no number keys and each key has one job; the owner kept that on 2026-10-27, since the
modes are the map's own controls and the discs are a click away. The scene draws only while
the camera eases or ambient motion is allowed: the page visible, the map on screen, no
reduced motion, and a GPU rather than software rendering. With the camera still, only the
sea and its life move, and they draw at 30 frames a second, where 60 cost 7 to 15% of the
main thread in a dev build; a pan, a zoom or a turn draws every frame.

**Two zoom levels (owner, 2026-10-28).** The zoom stays smooth, but the map's look changes
once, at one threshold (`T_CLOSE` in `bandAlphas`), with a short crossfade. The opening view
is the overview, and one press of + crosses the threshold. Three bands with their own label
rules read as three different maps; the owner asked for consistency, two levels and many
anchored entities.

- **3D in every mode.** Every mode draws the same board at both levels: the terrain in its
  own colours, the towns, Ports, goods and Oracle as models. A mode is a light filter over
  it. Political tints each owned tile and every model on it toward the owner's glaze (50%),
  through each instance's colour, so the tint adds no draw call, and draws each realm's
  border in place of the owner rings. Economy fades the trees, rocks and fields. Trade adds
  the trading ships and their routes. The flat seals that stood in for the towns and Ports
  outside Terrain, and Trade's flat discs for the goods, are gone: the models and the badges
  carry what they said. The anchored chips stay, because no model says it: a Port's good
  (Trade), a ship's pops and destination, a riot or the titles, and a building's icon on its
  stem.
- **Goods where they float.** Each luxury good's icon is centred on its raft, never offset,
  at every zoom and in every mode; under it, once held, the holder's seat mark, then the
  good's name on a dark chip, which reads where a raft off the coast puts the name over a
  tile.
- **One anchor per tile.** Each tile's badge (its slots and its land's resource as an icon,
  never words, on one dark chip, the icon as tall as the numeral) stands on its hex's centre
  in every mode. What hangs under the badge is the mode's (a plate, the realm's name,
  Economy's readout), so nothing jumps when the zoom or the mode changes.
- **Quiet badges (owner, 2026-10-30).** The badges were the loudest thing on the board, and
  close in they covered the towns. Close in they fade (the camera's `res`), since the land's
  trees, rocks and fields say the same, except in Economy, where the readout needs them. The
  tile hovered or selected, a pick's candidates, and every tile while Alt is held keep
  theirs, the way Old World's held key and Civ VII's placement preview show yields only when
  asked. The badge keeps a numeral rather than repeated icons: slots run 2 to 7, past what
  the eye takes in without counting, and repeated icons read as yield a turn.
- **The Plates menu.** After the map modes in the dock, a display choice rather than a mode:
  the badge's look (dark chip, ivory plate, or the slots as dots in a hex, dice-like), its
  size, and whether it fades close in. It is kept in the browser until a settings screen
  takes it (owner, 2026-10-31: keep every option and decide later). Ivory, large and kept is
  the badge as it stood from 2026-10-28.
- **Owner paint.** In the overview each settled tile is painted solid in its lead owner's
  colour, in the 3D board itself, so the town still stands on it: who holds which resource,
  read at a glance. The paint gives way over the threshold to the mode's own look (the
  terrain and the owner rings, or Political's 50% tint). It replaced round owner discs
  behind the badges (owner, 2026-10-28: the tile's own shape, not a circle).
- **The overview names only the capitals.** Every other settlement is its owner's paint;
  close in, every settlement's plate, one line with its owner's seat disc first, then its
  name, pips and pops (owner, 2026-11-03). Two settlements
  sharing a tile (Continental only) stack a line each, so the plate is no wider than one.
  The realm's name in Political, with its Unrest tokens, hangs under its capital in place of
  the capital's plate; the tokens moved there from the seals.
- **Sizes.** The badge's numeral is 0.3 of the hex's drawn width, up to 24px (Large: 0.55,
  up to 32px), and never wider than 0.92 of the hex; the board's label size (`--lab`) is about 13% larger
  at every zoom. Each label waits until the hexes are drawn wide enough to hold it under its
  badge: a short label 44–50px, every plate 56–64px, Trade's hint 94–98px, Economy's
  three-row card and a realm's glaze and counts 110–120px. A
  phone's opening view shows the badges alone.
- **Trade's hint** (`tradeLean`, in the engine) hangs under each capital's plate in Trade, a
  box the plate's size: a red ↑ and the realm's export, the wood, stone or food
  it makes most of beyond its needs a turn; a green ↓ and its import, of those it makes
  nothing of beyond its needs, the one it will hold least of once the turn's income lands.
  Both read only public income and stocks. It waits for hexes wide enough that it stays
  clear of the next row's badges; a capital's tag still stands over the tags below it in
  Trade. Hovering the hint shows the
  numbers; clicking it picks the capital. The capital's accessible name in Trade says the
  same.
- **No seat shares a hue with the board.** Nikos's seat was Melichron (honey), which read as
  the plains' wheat; since 2026-10-28 it is Melas, the black-figure glaze. Every seat is now
  dark enough for an ivory blazon.

The owner's other map calls of 2026-10-27:

- **A pick names its candidates.** While a pick is armed (Grow, the ladder, Build, Move,
  placing traded pops), each ringed settlement shows its name plate at any zoom; under a
  capital in Political, in place of the realm's name. Without that, in the overview a
  colony's name waits for the close level, and on a small screen every name does. Economy
  draws no plates, and a pick leaves it so.
- **The compass is a button.** A click returns to the opening view, as 0 does; its tooltip
  names Q and E for turning and 0 for the reset. It is a real button with a label, so the
  keyboard reaches it, and it has no turn arrows. Without it a mouse player had no way back.
- **The keyboard's focus ring is two-tone:** an ochre band edged in ink on both sides. The
  ochre alone was 1.17:1 on the ochre seat's tiles in Political, where the ink edge measures
  7.3:1.
- **The trade key's wording** ("a Port on hex −3,0 takes it", naming a coordinate the board
  never shows) was to become "a Port founded beside it"; the map key had already gone in
  #155, so nothing was left to change.

The owner's map calls of 2026-11-23:

- **The pick wears a gold frame.** The black ring did not show on the dark seats' paint.
  The selected tile is framed in a white-gold band between ink keylines (the ink carries
  it on the palest land, the Oracle's), and the gold breathes toward a deeper gold every
  1.8 s; under reduced motion it holds still at white gold. While the Realm drawer is open,
  each tile the viewing seat holds wears a narrower frame of the same gold, so the pick
  still stands out.
- **Realm names never print over one another** (two touching realms read "DAMONTHERON").
  The larger realm keeps its place; the other moves along its own land, then shrinks to
  0.72, and if it still meets a name it is hidden until the view gives it room.
- **The Oracle stands tall**, about two and a half times its old height (deeper steps, long
  columns, the same roof), so the island's one sanctuary reads from the overview.

## Assembly presentation

The sitting is a modal over the shell (`AssemblySitting`), and the map, top bar and realm
stay drawn behind its light scrim. `useSitting` reads the engine's three phases as six
stages: the proposal choice, the drawn card, the ballot read, the vote, an item's result
and the house rising. The ballot read and each result are shell beats the engine does
not wait for. Minimise (or Escape) folds any stage to the dock under the compass, where
rivals' toasts sit otherwise; the dock or Escape restores the same stage. While the
Assembly sits the shell only reads: the sitting is the turn gate's pending reason
(`turnPending`, read through `turnBlocked` on the context), so the verb discs wear a lock,
end turn reads "In Assembly" and the realm pages' and map popovers' actions show that
reason.

Every figure comes from the engine: draw, repeal and purchase status, the Law a draw
would replace (`lawReplacementIds`), a Directive's effect on each rival
(`previewDirective`, run on a copy of the board), the base vote's parts
(`voteWeightParts`) and the vote outlook (`voteOutlook`, `restCanTurn`), which the
"what your vote does" line words from public numbers. A standing Law's tooltip maps its
typed effects through `presentLawEffect` or `presentDirectiveEffect` into
`MechanicsDetails`. A seat watching another cast sees the same vote with no controls;
in hotseat the viewer follows the caster, so that form shows only when the viewer and
the caster differ.

## Required regression coverage

Focused tests must cover keyboard opening and Escape dismissal, `aria-describedby`,
focusable `aria-disabled` controls with guarded activation, popover focus restoration,
first-touch explanation and second-touch activation, pointer cancellation, and
viewport listener cleanup. Manifest-backed presentation tests must fail when a typed
effect has no non-empty semantic projection. Browser smoke tests supplement these
tests; real-device touch remains an owner check.

## Step 1–3 integration status

Phase 3.5 Steps 1–3 merged in PRs #58, #59, and #57. Step 3 was rebased over the
effective-value and parity-manifest contracts and reconciled with both before merge.

The Step 1 reconciliation preserves `getBuildings()`, `getBuilding()`,
`getTerrainDeck()`, and `getBuildBuildingOptions()`. Build choices pair each effective
definition with its target-specific status, show `status.cost` as the effective action
cost, and label roster/reference prices as base costs. Command summaries retain the
acting `playerID` and use honest `varies`, `options`, or `stakes` labels until the
engine can quote a concrete target or payment. Assembly draw and repeal explanations read `getAssemblyDrawStatus()` and
`getAssemblyRepealStatus()`. Vote purchases
use `getAssemblyBuyVoteStatus()` for price, availability and blocked reason in both
payments. Replacement is automatic and minimum tenure comes from
`lawProposalReason()` and `repealableLawIds()`. Controls have distinct accessible
names; the scene has no house item or veto.

The Step 2 reconciliation consumes `CONTENT_MANIFEST`, `FEATURE_PARITY`, the exhaustive
effect registries in `src/parity/featureParity.ts`, and active-effect descriptors in
`src/game/activeEffects.ts`. Event, Table, Law, Directive, Building, and active-effect
rows use the canonical presenters exported by `src/ui/effects.ts`. The former
resolution and building presentation switches were removed; Assembly, building
surfaces, and active-effect status now project the canonical typed results through
`MechanicsDetails`. Exhaustive presenter and manifest coverage remains in
`src/parity/featureParity.test.ts` rather than a parallel Assembly-only registry loop.

The development-only `low-number-core-v1` preset uses those same presenters for every
effective building, event, and table value. Numeric event prose is rewritten from the
transformed typed effects, so narrative copy cannot quote the authored magnitude beside
a different effective row. Real-browser verification covers preset on/off, same-seed
reset, manual-override precedence, Reset, terrain totals, action costs, and a complete
event presentation.

## Owner real-device touch checklist

Browser/DOM touch emulation is regression evidence, not a substitute for hardware.
Before Phase 3.5 validation closes, the owner must test the following on iOS Safari
and Android Chrome where those devices are available:

1. First-tap an enabled command, Build candidate, Assembly action, card, Voice, and
   stela/monument: the explanation opens and the action does not run.
2. Tap the same enabled control a second time: the action runs exactly once.
3. Start a touch and cancel it by scrolling or moving away: no action runs, and the
   next deliberate tap still follows the first-tap explanation contract.
4. Inspect disabled controls: the explanation and blocked reason are reachable, while
   repeated taps never activate the action.
5. Open and dismiss map and Assembly popovers with Cancel and, where a hardware
   keyboard is available, Escape: focus returns to the opener and the user's board
   position is retained.
6. Check overlays near every viewport edge, then scroll and rotate the device: content
   remains visible, anchored, dismissible, and free from unintended page activation.
7. With VoiceOver or TalkBack enabled, confirm controls announce their name, disabled
   state where applicable, explanation, effective cost, effect rows, and blocked reason
   without duplicate or unlabeled interactive elements.
