# Asymmetric shell audit — 2026-09-06

Read-only audit of the recovered `feat/asymmetric-shell-rebuild` worktree (the `hegemony-asymmetric-shell` worktree beside the repository, base b3b9a92, uncommitted) driven headless at 1920×1080, 1440×900 and 1280×720 with `?dev=preload&seed=42`. Companion to [The Asymmetric Table](../product/2026-09-06-asymmetric-table.md). The 62 screenshots, the two JSON measurement dumps and the three Playwright scripts it cites were produced in a session scratchpad and are not committed; the screenshot names below identify states, not repository files.

## 1. Screenshot index

All files are in this directory. `W` = 1920 / 1440 / 1280.

| State | File(s) | Notes |
|---|---|---|
| (a) Table at rest | `W-rest.png` | after "Endure It" |
| (b) Settlement hex selected | `W-subject.png` | tile `-2,0` AIGAI (viewer's city); Realm block gains an "AIGAI" workspace tab |
| (c) Realm tabs | `W-cities.png`, `W-pops.png`, `W-build.png`, `W-market.png`, `W-compare.png` | Compare = toggle on the Cities page |
| (d) Consult drawer | `W-drawer-chronicle.png`, `W-drawer-codex.png`, `W-drawer-victory.png`, `W-drawer-agora.png` | |
| (e) End Turn docket | `W-docket.png` | opens on **click** of `.turnDocketToggle` ("END TURN / Year I · spring") — not hover; `aria-expanded` toggles; Escape or "Close" closes; clicking outside does **not** close it |
| (f) Grow verb armed / candidate clicked / preview modal | `W-grow-armed.png`, `W-grow-popover.png`, `W-preview.png` | Grow → tile `-2,0` → popover; "Grow citizen" is blocked (9 food, player has 7) so the preview was reached via "Grow freeman" (7 food). `1440-error.png` shows the blocked-citizen tooltip state. |
| (g) Seat handoff | `W-handoff.png`, `W-handoff-digest.png`, `W-after-handoff.png` | via docket "End turn now" |
| (h) Assembly | `W-assembly.png` | `?dev=assembly&seed=42` |
| (i) Readability A+ at 1280 | `1280-readability-large.png`, `1280-readability-large-pops.png`, `1280-readability-large-drawer.png` | plus `1280-readability-compact.png` for A− |

Every requested state was reachable. The one caveat: the first Grow candidate/pop-type is blocked by cost at this seed, so the preview screenshot uses the second pop type (`report2.json` → `growChoice_*`).

---

## 2. Defect ledger

Severity: **P1** breaks a flow or hides content; **P2** visible wrong/clipped; **P3** polish.

### D1 · P1 · Seat-handoff buttons have no visible label (all viewports)
`W-handoff.png`, `W-handoff-digest.png` — the "I am Nikos" and "Begin turn" buttons render as an empty outlined box.
Evidence (`report2.json` → `handoffDom.button`): `color: rgb(255,248,231)` on `background-color: rgba(255,248,231,0.86)`, `background-image: none`, `::before` has no fill. Ivory on ivory.
Cause: `SeatHandoff.tsx:65,95` use `className="primaryButton handoffButton verb"`. `resources.css:269` sets `.primaryButton { color: var(--ivory) }` assuming a clay fill, but the fill only comes from `.eventResolveButton` (base.css:536+); `.handoffButton` (asymmetric-shell.css:956) only sets size. Every other `primaryButton` in the app pairs it with `eventResolveButton`.

### D2 · P1 · The handoff does not cover the next seat
`W-handoff.png`. Copy says "The next turn stays covered until its ruler takes the seat", but behind the 66% scrim (`.handoffBackdrop` z 101, no blur) the next seat is already on screen:
- `report2.json` → `handoffDom.viewerNow`: while the card says "Pass the table to Nikos", `.operationsOwner` = "Nikos", `.rosterSeat.isViewing` = Nikos, resource pill = "Wood 20" (Nikos's), Realm block shows Nikos's `-0.5 Discontent` alarm, fate card = "Captured Laborers".
- Nikos's `PendingPlayerEventModal` (`.fateCard`, z 100, `visibility: visible`, `opacity: 1`, not `inert`, not `aria-hidden`) is mounted under the handoff: card art, title, "+2 slaves", the BOURA/PHLIOUS target list and "PLACE POPS" are legible through the scrim (`1920-handoff.png`).
Cause: `src/client/controller.ts:234-242` snaps `playerID` to `G.currentPlayer` in an effect, so the viewer switches in the same commit that mounts `SeatHandoff`; `SeatHandoff.onTakeSeat` (`SeatHandoff.tsx:67`) is a no-op by the time it is clicked. The component only covers *some* of the screen; it does not defer the seat switch.
Side effect: two `ModalShell`s are mounted at once (fate card + handoff), each installing a capture-phase Tab trap on `document` (`ModalShell.tsx:113`). The later-registered handoff wins today (Tab cycles only on "I am Nikos" — `handoffTabs`), but it is order-dependent.

### D3 · P1 · Cities page content is unreachable inside the 360px Realm block
`W-cities.png`, `1920-rest.png` (bottom of block: "AIGAI … 4/10" half-visible).
Evidence (`report.json` → `measurements.cities_scroll`): `.intelBody` (the scrolling list) has `clientHeight` **58px at 1920/1440** and **5px at 1280** (scrollHeight 285/305). `.operationsBody` is `overflow: hidden` (asymmetric-shell.css:358). Cities-page furniture (masthead "CITIES" + empire strip + unrest alarm + active effects + bead legend) consumes the block; the city cards themselves are scrollable only through a 5px strip at 1280 and are invisible in `1280-cities.png`.
Related: Pops page `intelBody` 169px/530 at 1280 (ladder rung buttons cut — `1280-pops.png`, worse at A+ `1280-readability-large-pops.png`); Build 169–222px for 1109px of content; Market 169–222/360. Compare open at 1280 leaves a 76px body (`1280-compare.png`).
Also: `LedgerPanelHeader` prints "CITIES" directly under the selected "CITIES" tab (`EmpireIntelPanel.tsx:55`) — a duplicated masthead costing ~40px of the block's scarcest resource.

### D4 · P2 · Consult rail labels overflow the rail and are clipped by the viewport edge (all widths)
`1920-rest.png` ("CHRONIC"), `1280-rest.png` ("CHRON", "VICTOR").
Evidence (`report.json` → `measurements.rail`): label column is 48px wide (36px at 1280) but the rendered text is 67.3px for "Chronicle" and 50.3px for "Victory" (40px for Codex/Agora vs 36px at 1280). `overflow: visible`, `text-overflow: clip`, `white-space: normal` (single words cannot wrap). Ink right edge: **1934px at 1920, 1454px at 1440, 1306px at 1280** — beyond the viewport. The rail sits at `right: 0` with `border-right: 0` (asymmetric-shell.css:659-668), so only the viewport clips it.
When the drawer is open the same ink spills 14–19px over the drawer's left edge (`railOpen` textInkRight 1534 vs rail right 1520 at 1920); on the active (ink-filled) tab the overflowing ivory letters land on the bone drawer and vanish (`1920-drawer-chronicle.png`), on inactive tabs they show over the drawer (`1440-drawer-codex.png`: "CHRONICLE" crossing the border).
Cause: `.consultDrawerTab { grid-template-columns: 24px minmax(0,1fr) }` (asymmetric-shell.css:679-681) plus the `label` role at 11px display face; `--consult-rail-w` 92px/86px is too narrow for the longest word.

### D5 · P2 · Verb-target context truncates to "A…" on the spine (all widths)
`1920-subject.png` (Build: "from 6 · A…"), `1280-subject.png` (Grow: "5–9 · AI…", Build "from 6 · A…").
Evidence (`report.json` → `steps.verbTargets`): `.verbTarget` `scrollWidth 32` vs `clientWidth 16` (Build, all widths), `27→11` (Grow at 1280), `0` (Upgrade — target hidden entirely). `.verbTarget { max-width: 54px; text-overflow: ellipsis }` (asymmetric-shell.css:786) inside a `nowrap` `.verbMeta` in a 74px×scale column.

### D6 · P2 · Realm block overlaps island tiles at 1440
`1440-rest.png`, `1440-subject.png` — the OLYNTHOS name plate is cut ("LYNTHOS").
Evidence: `report.json` → `measurements.rest.overlaps.realm` = 1 tile (`-3,0`) at 1440; 0 at 1920 and 1280. The board fit deliberately reserves `--board-reserve-l: var(--ops-w) − 48px` (asymmetric-shell.css:24 / 996), i.e. the block is allowed to lie 48–50px over the island; at 1440 the width-limited fit puts the west-most settlement under that strip.

### D7 · P2 · Consult drawer and rail cover playable tiles at ≤1440
`1440-drawer-chronicle.png`, `1280-drawer-chronicle.png`.
Evidence (`overlaps`): 1440 — rail 3 tiles (`2,-2 3,-3 3,-2`), drawer 6 (`1,2 2,0 2,1 3,-2 3,-1 3,0` incl. SIKYON and PYLOS); 1280 — rail 4, drawer 3. 1920 — 0. The docket likewise sits over 13 (1920) / 18 (1440) / 25 (1280) tiles while open (`W-docket.png`). Overlays are transient, but at 1440 the east coast is un-clickable while consulting the Chronicle.

### D8 · P2 · Focus is lost to `body` after the economy preview modal closes
Evidence (`report2.json` → `previewFocusAfter` = `body`, all viewports). `ModalShell` restores focus to the element that was active on mount (`ModalShell.tsx:78,118`), but the opener is the popover's confirm button, which `HegemonyBoard.tsx:679-682` unmounts (`mapSelection.clear()`) in the same commit that opens the modal. Keyboard users land at the top of the document after Confirm/Cancel/Escape. Same pattern for the docket's "Close" button (`TurnDocket.tsx:62-68`: the button unmounts itself, no restore — by code reading).

### D9 · P2 · Text below the 11px floor in the top strip (all widths; worst at 1280)
Full 1280 list in §4. Headline: `.topbarEventLabel` **7.17px** (1280) / 7.48 (1440) / 8.39 (1920); `.topbarEventName` 9.44 / 9.84; `.topbarEventEffect` 9.84 (1440); `.activeEffectsBoardCopy strong` "Effects" 8px; Codex chip `.codexJumpLink` 9.6px inside the drawer. `type.css:63-66` declares 11px as the floor "on purpose". Under A− (`1280-readability-compact.png`) 16 more selectors drop to 10.1px (realm tabs, rail labels, roster header, ladder labels).

### D10 · P2 · Truncated / clipped labels
- Top-strip event names: "Spring Fl…", "Warehouse…" at 1280 (`.topbarEventName` 77>63, 82>65), "Warehouse Fi…" at 1440 (86>80); the effect line "-1 Gold income, all yea" hard-clipped at 1920 (`1920-rest.png`). At A+ 1280: "Silent mine", "Captured…" (84>48, 113>65).
- Ticker at 1280 after the handoff: `.dockTicker p` 550>541 ("…Add 2 Sl", `1280-handoff.png` state).
- `.verbTarget` (D5).
- At ≤1365 the effects pill collapses to a bare count ("2", `1280-rest.png`) with `.activeEffectsBoardCopy` hidden (asymmetric-shell.css:1001).

### D11 · P3 · Docket is a single-click commit next to a hold dial
`W-docket.png`. The dial exists so "a stray click cannot spend a turn" (`TurnDial.tsx:58-60,104-107`). The docket ends the turn with two plain clicks (toggle → "End turn now"), and the commit is enabled whenever there is no *blocker*; warnings (food shortage, riot risk) do not gate it (`TurnDocket.tsx:93`, `advisory.ts:181`). Verified: dial click → no turn change; Space held 850ms → turn ends; pointer hold → turn ends; docket click → turn ends (`report2.json` → `dial`, `handoffDom`).

### D12 · P3 · Docket is not dismissed by clicking elsewhere and has no dialog semantics
`report2.json` → `docketOpenAfterOutsideClick: 1`. `.turnDocket` is a `section` with `aria-label` but no `role`, no `tabindex`, focus stays on the toggle (`docketFocus`). Tab order from the toggle: Close → End turn now → back to the Gold pill (fine, DOM-adjacent), but nothing announces the panel opening.

### D13 · P3 · `role="tablist"` without the pattern
`OperationsBlock.tsx:69-90,133-158`: two `role=tablist`s with `role=tab`/`aria-selected` but no `aria-controls`, the `role=tabpanel` (`:162`) has no `aria-labelledby`, no arrow-key navigation, and the Compare button (`aria-expanded`, not a tab) is a child of the tablist. `nav role="tablist"` also discards the navigation landmark.

### D14 · P3 · Consult tabs carry both `aria-pressed` and `aria-expanded`
`ConsultDrawer.tsx:50-52`. Two contradictory state attributes on one button; pick one (expanded, since they `aria-controls` the drawer).

### D15 · P3 · Two adjacent controls both named "End turn"
Dial `aria-label="End turn — press and hold. Year I, spring…"`, toggle name "End turnYear I · spring" (no aria-label; text concatenates without a separator — `report2.json` → `docketDom.toggle.text`).

### D16 · P3 · Escape handlers stack
`ConsultDrawer.tsx:31-36` calls `event.stopPropagation()` on a `window` listener, which does not stop sibling `window` listeners (`TurnDocket.tsx:27-30`, `ModalShell.tsx:129-133`); one Escape closes drawer + docket together. Harmless today.

### D17 · P3 · Realm-page furniture resets when a tile is selected
`RealmWorkspace` unmounts whenever `workspace === "subject"` (`OperationsBlock.tsx:94-109`), so `comparisonOpen` and the Compare `pinned` list (`:129,182`) are lost every time a hex is clicked and restored via the "Realm" tab.

### D18 · P3 · Dev "TUNE" fab overlaps the map/Assembly title
`button.tune-fab` at (351,76) sits over the sea and, in `W-assembly.png`, over "THE ASSEMBLY" heading. Dev-only.

Not defects but noted: the ticker never overlaps tiles; the verb spine never overlaps tiles; roster is correctly `aria-hidden` + `visibility: hidden` + `tabIndex -1` while the drawer covers it (`drawer-*-roster` in `report.json`); drawer receives focus on open and restores it to the rail tab on Escape/Close (verified: `focusAfterEscape` → Agora tab, `focusAfterCloseButton` → Victory tab).

---

## 3. Measurements

Bounding boxes in CSS px at rest (drawer/docket measured when open). "Island" = union of the 37 `g.svgButton[data-tile-id]` hit targets; "layer" = `g.mapBoardLayer` incl. foam.

| Viewport | Realm block | Roster | Verb spine | Top strip | Consult rail | Drawer (open) | Island tiles (layer) | Tile size |
|---|---|---|---|---|---|---|---|---|
| 1920×1080 | x16 y628 480×360 | x1624 y708 280×280 | x682 y1004 556×76 | 0,0 1920×64 | x1828 y84 92×180 | x1520 y64 400×940 | x651 y146 803×728 (638,141 822×741) | 112.5×130 |
| 1440×900 | x16 y448 480×360 | x1144 y528 280×280 | x442 y824 556×76 | 0,0 1440×64 | x1348 y84 92×180 | x1040 y64 400×760 | x495 y135 637×577 (484,130 652×588) | 89×103 |
| 1280×720 | x15 y327 428×307 | x1034 y404 231×231 | x363 y649 554×71 | 0,0 1280×60 | x1200 y80 80×180 | x926 y60 354×590 | x494 y114 482×437 (486,110 493×444) | 67.5×78 |

Other chrome: ticker 1920 x512 y959 1096×30 · 1440 x512 y779 616×30 · 1280 x458 y606 562×28. Docket 420×303 at (750,72) / (510,72) / (430,68).

Tile hit-targets intersecting chrome (count of 37):

| Viewport | Realm | Roster | Verb spine | Top strip | Rail (closed) | Rail (open) | Drawer | Ticker | Docket | Any at rest |
|---|---|---|---|---|---|---|---|---|---|---|
| 1920 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 | **0** |
| 1440 | **1** (`-3,0` OLYNTHOS) | 0 | 0 | 0 | 0 | 3 | 6 | 0 | 18 | **1** |
| 1280 | 0 | 0 | 0 | 0 | 0 | 4 | 3 | 0 | 25 | **0** |

Readability A+ at 1280 changes no chrome box (geometry rides `--ui-scale`, type rides `--readability-scale`; root font 18.4px, `data-readability="large"`, persisted to `localStorage.hegemony-readability`).

---

## 4. Text below 11px at 1280 (standard readability, at rest and per state)

| Rendered px | Selector | Sample | Where |
|---|---|---|---|
| 7.17 | `.topbarEvents .topbarEventCard .topbarEventBody .topbarEventLabel` | "Omen · Year I", "Fate · Damon" | top strip, every state |
| 9.44 | `.topbarEvents .topbarEventCard .topbarEventBody strong.topbarEventName` | "Silent mines", "Warehouse Fire" | top strip |
| 9.6 | `.intelBody .codexNav .codexJump button.codexJumpLink` | "The race", "The cards" | Codex drawer |
| 7.89 / 10.38 | same two topbar selectors | | at A+ (still < 11) |
| 6.8 / 8.94 / 10.12 / 10.3 | topbar label/name; `.realmTab .label`, `.readabilityChoice`, `.rosterSquareHead .label`, `.rosterColumns span`, `.consultDrawerTab .label`, `.ladderPage h3.pageSection.label`, `.beadPlace.label`, `.anchorKey.label`, `.dockTicker p.caption` | | at A− only |

At 1440 add `.topbarEventEffect .effectLine` / `b.neg.num` / `.richToken` at 9.84px and `.activeEffectsBoardCopy strong` 8px; at 1920 the labels are 8.39px and "Effects" 8px. No SVG map text falls under 11px rendered at any width (checked via `getScreenCTM`).

---

## 5. Focus order

First 25 Tab stops at rest, 1920 (identical structure at 1440/1280; `report.json` → `steps.tabOrder`):

1 `button.tune-fab` (dev) · 2 `body` (wrap — the fab is the last element in DOM order) · 3–5 event cards (Omen, Season, Player) · 6–8 Wood/Stone/Food pills · 9 turn dial "End turn — press and hold…" · 10 docket toggle "End turn Year I · spring" · 11–13 Gold/Influence/Happiness pills · 14 active-effects pill · 15–17 readability A−/A/A+ · 18 workspace tab "Realm" · 19–22 realm tabs Cities/Pops/Build/Market · 23 Compare · 24–25 `.richTokenLink` "Food", "Pop" (Codex deep links inside the Cities page).

Full cycle (60 stops, `report2.json` → `tabTrace`): … 26 "Gold" link · 27–29 three open building sockets · **30 the board (single roving stop, `Hex -3,0`)** · 31–34 roster seats · 35–38 consult rail tabs · **39–45 the seven verbs** · 46 tune fab · wrap.

Observations: the primary act controls (verbs) are stops 39–45 and the board is stop 30, after every Realm-page link and socket; the Realm page's content links precede the map. With the drawer open, Tab from the drawer's last item goes to the verbs (drawer is non-modal, no trap — fine); `div.chronicleList` receives focus as a scroll container. The two `body` stops are wrap artifacts, not missing elements.

---

## 6. Code review

### (a) Engine numbers computed in shell components
Shell components mostly read engine selectors (`getTurnAdvisory`, `calculateEconomyProjection`, `settlementNetYield`, `victorySeatStatuses`, `playerStandings`, `getGrowPopStatus`, `getBuildBuildingOptions`, `getUpgradeColonyToCityStatus`, `preview*`). The advisory itself lives in the engine (`src/game/advisory.ts`, exported via `rules.ts:55`) and the victory leader/tie rule was moved *into* the engine (`victory.ts:157-203`, `VictoryTab.tsx` diff) — both good.
Remaining UI-side derivations:
- `HegemonyBoard.tsx:212-218` `canMovePops = holdings.length >= 2 && some(totalPops > 0)` — a move-legality rule written in the UI rather than asked of an engine status (pre-existing, untouched by the rebuild).
- `HegemonyBoard.tsx:522` `canEndTurn = turnOpen && !G.pendingRiot && !G.assembly` duplicates what `advisory.canCommit` (`advisory.ts:37-80,181`) derives from the same five state fields; `TurnDocket.tsx:93-96` then ANDs both.
- `SeatHandoff.tsx:21-43` keeps per-seat "last log index seen" in refs and slices `G.log` to build the digest — game-adjacent bookkeeping owned by the UI (lost on reload; wrong if a seat is viewed via the roster in between).
- `RosterSquare.tsx:25-28` decides threat precedence (wins-at-dawn over one-card-away, excluding the viewer) — presentation, acceptable.
- `verbs.tsx:109-143` (pre-existing) defines "cheapest building" as the smallest unit-sum over engine-priced costs — a UI notion of cheapness.
- `advisory.ts:152-158` sums transfer pops in the engine file — fine, but note `TurnAdvisory.projectedResources` is computed and never rendered by `TurnDocket`.

### (b) Where UI state lives
`HegemonyBoard.tsx` holds 11 `useState`s (`selectedTileId`, `operationsWorkspace`, `tileConfirmation`, `activeModal`, `gameOverDismissed`, `riotResultOpen`, `seenOmenYear`, `ledgerRoute`, `consultRoute`, `isConsultOpen`, `codexTarget`) plus `useMapSelection`. Local state elsewhere: `TurnDocket.open`; `RealmWorkspace.comparisonOpen` and `SettlementComparison.pinned` (lost on unmount — D17); `ReadabilityControl.value` (mirrored to `documentElement.dataset` and `localStorage`); `SeatHandoff.handoff` + three refs; `HexMap.rovingTileId`.
Duplication / drift risks:
- `operationsWorkspace` and `selectedTileId` must agree; `OperationsBlock.tsx:94` papers over `subject` with a null tile by falling back to Realm.
- "Name of the viewer's settlement on tile X" is written four times: `HegemonyBoard.tsx:440-444` (`labelTile`), `:480-485` (`selectedTargetLabel`), `OperationsBlock.tsx:389-397` (`tileSubjectLabel`), `EconomyActionPreviewModal.tsx:125-133` (`currentSettlementName`).
- `tileConfirmation` is **never set to a non-null value** (all eight `setTileConfirmation` calls — lines 264, 279, 292, 308, 374, 383, 399, 493 — pass `null`), so the `PendingTileConfirmation` type (`:71-75`), `confirmTileAction` (`:388-400`), the `confirmation` memo (`:487-498`) and `HexMap`'s `confirmation`/`pendingTileId` props are dead state kept alive by the rebuild.
- `ledgerRoute`/`consultRoute` are `PanelRoute` objects whose `entry`/`scroll` fields are unused (`route.ts`), and `codexTarget` is a separate deep-link state beside `consultRoute.entry` which was designed for exactly that.
- `TurnDocket.tsx:20` `panelRef` is assigned and never read.

### (c) Dead / vestigial code from the symmetric shell
TSX: `LedgerRail.tsx`, `ConsultRail.tsx`, `TabRail.tsx`, `PlayerScoreboard.tsx` are deleted (git `D`); no TS/TSX references remain. `turnCommitTitle` removed from `verbs.tsx`.
Still present with no DOM user (`css-report.json` → `orphanReport`, cross-checked by grep of `src/**/*.tsx`):
- `shell.css` `.dockPlinth`, `.dockPlinth-left/-right`, `.dockPlinth::after` (103–140) — the two plinth divs were removed from `CommandDock.tsx`.
- `shell.css` `.tabRail`, `.tabRail-left/-right`, `.railTab`, `.railTabOn`, `.railTabOn::before`, `.railTabBadge` (859–950) — TabRail's rules.
- `shell.css` `.roster`, `.seat`, `.seatViewing`, `.seatActing`, `.seatGlaze`, `.seatName` (355–410) and `.topbarStatusCluster` (706; also `intel.css`) — PlayerScoreboard's rules; no TSX sets any of these classes.
- `shell.css` `.intelPanel`, `.consultPanel` (860–861, 962–963, 988–1003) and `.turnDialTrigger` (689) — the floating cards and the dial tooltip wrapper.
- `base.css` tokens `--plinth-h`, `--plinth-l`, `--plinth-r`, `--tablet-bot` (280–285), `.workbench` (623), `.appButton` (499, never used in TSX).
- `shell.css:67-69` `.commandDock::after { right/left: var(--plinth-*) }` still ships and is then overridden (see d).
- `HegemonyBoard.tsx:503` still adds `uiOverhaulShell` to `<main>`; **no stylesheet selects `.uiOverhaulShell`** — a class with no CSS user. `kyklos`/`twoPanel` survive only in comments (`hexGeometry.ts:22`, `resourceVisuals.ts:21`, `HexMap.tsx:353`, `useBoardFrame.ts:75`, `base.css:113,461,591`, `map.css:13`, `responsive.css:4`, `HegemonyBoard.tsx:144,286`).
- Older orphans, not from this rebuild but in the same sheets: `command.css` `.turnLog*`, `.chronicleFilter*`, `.candidateButton`, `.buildCandidateGrid`, `.popSummary*` (the live chronicle uses `panels.css` `.chronFilter`); `panels.css` `.ladderSection`; the tile-confirm flow in `HexMap.tsx:407-440` + its CSS (never triggered, see b).

### (d) CSS: overrides vs. replacements
`asymmetric-shell.css`: 146 rules, 641 declarations. **53 declarations in 25 rules override a property already set on the same element by an earlier sheet** (72 selector pairs: 37 against `shell.css`, 11 `command.css`, 8 `base.css`, 4 `resources.css`, 4 `intel.css`, 2 each `type.css`/`ceremony.css`/`ledger.css`, 1 each `map.css`/`board.css`). The `.asymmetricShell` prefix exists to out-specify `shell.css`, whose `.topbar`, `.resourceSpine`, `.commandDock`, `.verbSpine`, `.dockTicker`, `.turnDial` rules remain fully live and are then fought back. Largest:
1. `.asymmetricShell .commandDock` (L735) — 9 pairs: `position/z-index/display/min-height/padding` vs `command.css:148-159`, `shell.css:47-51`.
2. `.asymmetricShell .dockTicker` (L792) — 7: `position/bottom/left/z-index/max-width/height` vs `shell.css:613-620`, `command.css:193`.
3. `:root` tokens (L20-25, L996-997) — 6–8: `--chrome-top/-bot`, `--camera-inset-*`, `--board-reserve-l/-r` vs `base.css:243-244,371-380` (the old symmetric values still exist and feed `shell.css`).
4. `.asymmetricShell .resourceSpine`, `… .resourceGrid` (×2), `… .resourceIcon` — 14 pairs vs `shell.css:169-198,245-280`, `resources.css:7,41-42` (`position: static; transform: none` to undo the centred-absolute spine).
5. `.consultDrawerTab .label` (L692) — undoes the `label` role's `text-transform: uppercase` / `letter-spacing: .14em` from `type.css:30,68`.
6. `.asymmetricShell .verbSpine/.railVerb/.verbKnob/.verbMeta > .verbCost` — 8 pairs vs `shell.css:445-566`, `command.css:217`.
7. `.asymmetricShell .turnDial` vs `shell.css:643-644`; `.asymmetricShell .mapSetupCaption` vs `map.css:54` + `board.css:266`; `.asymmetricShell .topbarEvents max-width` vs `shell.css:154`; media-query `display: none` on `.topbarEventEffect`, `.activeEffectsBoardCopy`, `.topbarEventCard:not(:first-child)`, `.activeEffectsBoard`.
The remaining 588 declarations style new selectors (operations block, roster, drawer, docket, handoff, preview) and are replacements, not overrides. Sheet order matters: `asymmetric-shell.css` is imported after `responsive.css` (`styles.css:40`), which that file's header says "MUST load LAST".

### (e) Accessibility of the new controls
- Names: `aside[aria-label="Realm operations"]`; workspace/realm tablists labelled; roster seats have full names ("Damon: 1 cities, 6 population, 0 laurels, acting"); roster columns C/P/L `aria-hidden` with `title`s; readability `fieldset` + hidden legend + `aria-pressed` + `aria-label`; consult drawer `aside` named "<Page> drawer", Close button labelled; preview modal `role=dialog aria-modal aria-labelledby`; handoff dialog "Pass the table to X"; docket section "End-turn review"; `SubjectAction` uses `aria-disabled` and drops `onClick` when disabled. Gaps: D12–D15 above; `div.subjectActions[aria-label]` has no role so the label is ignored; `.operationsOwner` and `.rosterThreat` are plain spans (fine).
- Focus restoration: drawer → rail tab, verified for Escape and Close. Preview modal → **lost to `body`** (D8). Docket Close → lost (code). Handoff → focus moves to the card, then to the fate card underneath on "Begin turn" (`afterHandoffFocus`), which is the right next stop.
- End Turn: hold path (`TurnDial.tsx:113-168`, 620ms via rAF, pointer capture, Enter/Space keydown with keyup cancel, cancelled on disable/blur) verified by pointer and keyboard; plain click verified inert. Click path (`TurnDocket.tsx:92-106`) is a plain click with no hold and no confirmation beyond the list — D11.
- Keyboard shortcuts `?` and `l` (`HegemonyBoard.tsx:315-339`) are undiscoverable in the UI and `l` collides with nothing today.

### (f) `shell.test.tsx` coverage
Covers: `SeatHandoff` mounts on `currentPlayer` change with the right dialog name, "I am Nikos" calls `onTakeSeat("1")`, first-turn digest copy, "Begin turn" unmounts; `TurnDocket` toggle opens the review with "Next income" and "End turn now" calls `onEndTurn` once; `ConsultDrawer` Close returns focus to the active rail tab and unmounts the drawer.
Does not cover: the invisible-label and seat-leak bugs (D1, D2 — the handoff is tested in isolation with a stubbed `onTakeSeat`, never against the controller's auto-switch); `TurnDocket` blocker path (`aria-disabled` when `!canCommit` or `!canEndTurn`), Escape, warning items; `ConsultDrawer` Escape path, tab toggling/closing on re-press, `codexTarget`; `OperationsBlock` entirely (subject tab appearing, `SubjectAction` gating, Compare pins, workspace fallback); `RosterSquare` (standings, threat footer, `covered` → `aria-hidden`/`tabIndex`); `ReadabilityControl` (dataset + storage, storage-throws path); `EconomyActionPreviewModal` (delta rendering, `changedSettlements` filter, confirm/cancel, focus after close); `SeatHandoff` digest with real entries (`lastLeftAt` bookkeeping, `slice(-5)`), suppression during assembly/non-gameplay; any `HegemonyBoard` integration (verb → popover → preview → move). Engine side: `advisory.test.ts` and the `victory.test.ts`/`preview.test.ts` additions exist.

---

## Appendix — files
`audit.mjs` (states, measurements, text audit, tab order), `audit2.mjs` (preview via affordable pop, handoff at all widths + computed styles, 60-stop tab trace, docket focus, dial hold), `css-analysis.mjs` → `css-report.json` (postcss override pairs + orphan classes), `report.json`, `report2.json`.
