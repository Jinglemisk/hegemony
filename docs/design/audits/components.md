# Hegemony UI Component-Architecture Audit
Scope: src/components/** (24 TSX/TS files, ~4,950 LOC), src/App.tsx, src/main.tsx, src/ui/formatters.ts, src/ui/resourceVisuals.ts. Branch feat/phase1-currencies @ 8d609f8.

## 1. INVENTORY

| File | Exported component(s)/symbols | LOC | Responsibility |
|---|---|---|---|
| src/App.tsx | App | 18 | Wires useHegemonyGame controller into HegemonyBoard; nothing else |
| src/main.tsx | (entry) | 10 | createRoot + StrictMode + styles.css |
| src/components/HegemonyBoard.tsx | HegemonyBoard | 449 | Top-level layout + ALL modal open/close state (11 useState) + tile-action routing |
| src/components/HexMap.tsx | HexMap (memo of HexMapComponent) + 15 module fns | 687 | SVG hex map: camera pan/zoom engine, drag/click disambiguation, tile rendering, shoreline geometry, pips, settlement shapes, confirm prompt |
| src/components/PopulationModals.tsx | PopulationPickerModal, FoundColonyPopover, UpgradeCityModal, MovePopsModal (+private PlacementModalShell, CostRow, PopulationStepper) | 688 | 4 unrelated population-flow dialogs + 3 shared internals in one legacy file |
| src/components/ResourceGrid.tsx | ResourceGrid (+private ResourceBreakdownTooltip) | 163 | Resource pill band with flash-on-change animation + income breakdown tooltip |
| src/components/SettlementCard.tsx | SettlementSummaryCard, HoldingNetYields, formatTileCoordinates | 125 | Presentational settlement summary row + per-resource net-yield chips |
| src/components/Sprites.tsx | AtlasIcon, ResourceIcon, TerrainSprite, UiSprite | 132 | CSS-sprite atlas wrappers keyed by typed enums |
| src/components/AnnotatedText.tsx | AnnotatedText | 91 | Regex-tokenizes prose, appends resource/pop/building icons |
| src/components/board/types.ts | EmpireTab, OwnedHolding, PopEconomy | 10 | Shared UI types |
| src/components/board/constants.ts | PLAYER_DISPLAY_NAMES, SETTLEMENT_SORT, BUILDING_AFFINITY, DETAIL_TOOLTIP_WIDTH | 19 | UI constants (PLAYER_DISPLAY_NAMES is a bare alias of PLAYER_NAMES) |
| src/components/board/helpers.ts | getOwnedHoldings, calculatePopEconomy, estimateGrowPopIncomeDelta, getBuildingBenefitText, buildingTooltipRows, actionTitle, actionRequirementText, holdingShortLabel, placementKindLabel, createEmptyResources, capitalize | 170 | Non-JSX selector/formatting helpers for board components |
| src/components/board/events.ts | eventCardArtUrl, formatEventEffects | 102 | Event-card art URL map + effect-to-prose formatter |
| src/components/board/ResourceDeltaList.tsx | ResourceDeltaList | 27 | Signed resource-delta chip list |
| src/components/board/command/ActionCommandPanel.tsx | ActionCommandPanel (+private ResourceCost) | 238 | Right-rail verb toolbar (7 hand-written buttons) + DeckShelf + ActionLogPanel |
| src/components/board/command/DeckShelf.tsx | DeckShelf | 66 | Deck-remaining tray + board-layout badge |
| src/components/board/command/ActionLogPanel.tsx | ActionLogPanel | 46 | Chronicle log grouped by season |
| src/components/board/topbar/PlayerScoreboard.tsx | PlayerScoreboard (memo) | 85 | Per-player roster seats with stats + hover resource tooltip |
| src/components/board/topbar/SeasonStatus.tsx | SeasonStatus (memo) | 43 | Year/season/actor clock |
| src/components/board/topbar/SeasonDial.tsx | SeasonDial | 39 | Season emblem ring |
| src/components/board/topbar/TopbarEvents.tsx | TopbarEvents (+private TopbarEventCard) | 65 | Live seasonal + player event cards |
| src/components/board/ledger/EmpireIntelPanel.tsx | EmpireIntelPanel (memo) | 196 | Ledger shell: summary stats, unrest banner, tab strip, tab switch |
| src/components/board/ledger/CitiesTab.tsx | CitiesTab | 181 | Expandable per-holding cards with pop×building matrix |
| src/components/board/ledger/BuildingsTab.tsx | BuildingsTab | 71 | Building-first build matrix |
| src/components/board/ledger/PopsTab.tsx | PopsTab | 126 | Per-pop economy rows + ladder buttons + summary grid |
| src/components/board/ledger/MarketTab.tsx | MarketTab | 83 | Bank buy/sell rows |
| src/components/board/ledger/VictoryTab.tsx | VictoryTab | 55 | Victory-card standings |
| src/components/board/ledger/BuildingChip.tsx | BuildingChip | 117 | Icon chip with portal-based floating tooltip (built/option modes) |
| src/components/board/modals/PendingPlayerEventModal.tsx | PendingPlayerEventModal | 141 | Event-card reveal with choices + pop-target select |
| src/components/board/modals/EventTableModal.tsx | EventTableModal | 74 | Shared dice-table modal (rows, modifier, outcome) |
| src/components/board/modals/RiotModal.tsx | RiotModal | 135 | Riot instance of EventTableModal + insurance controls |
| src/components/board/modals/VentureModal.tsx | VentureModal | 104 | Venture instance of EventTableModal + stake picker |
| src/components/board/modals/CalmModal.tsx | CalmModal | 79 | Civic-calm payment picker |
| src/components/board/modals/GrowPopModal.tsx | GrowPopModal | 139 | Grow-pop holding/pop picker |
| src/components/board/modals/LadderModal.tsx | LadderModal | 140 | Promote/demote settlement targeting |
| src/components/board/modals/GameOverModal.tsx | GameOverModal | 68 | Final standings |
| src/ui/formatters.ts | 14 exports | 144 | Label/number/effect formatting |
| src/ui/resourceVisuals.ts | RESOURCE_ORDER, RESOURCE_VISUALS, resourceCssVars | 77 | Resource palette → CSS custom properties |

## 2. DUPLICATION & MISSING ABSTRACTIONS

**A. Modal scaffold duplicated 5× (no `<Modal>` component).** The `modalBackdrop > logModal > modalHeader(h2+p+Close) ... modalActions(Cancel+primary)` skeleton is copy-pasted in:
- PopulationModals.tsx:52-90 (PopulationPickerModal)
- PopulationModals.tsx:434-517 (MovePopsModal)
- board/modals/GrowPopModal.tsx:51-136
- board/modals/LadderModal.tsx:57-137
- board/modals/GameOverModal.tsx:23-65 (header variant)
A second family (`modalBackdrop eventModalBackdrop`) exists in EventTableModal.tsx:29-72, CalmModal.tsx:40-77, PendingPlayerEventModal.tsx:53-139, and PlacementModalShell (PopulationModals.tsx:526-575). PlacementModalShell is the right idea but is private to PopulationModals and only used by UpgradeCityModal. Missing: one `ModalShell` (backdrop, dialog role/aria, header, footer) with variants.

**B. Ready/error status line duplicated 6×.** The `selectionSummary positive/negative` span pair appears at PopulationModals.tsx:71-78, 385-392, 479-487; GrowPopModal.tsx:106-116; LadderModal.tsx:110-121; PendingPlayerEventModal.tsx:121-125. Should be `<SelectionStatus ok={...}>{msg}</SelectionStatus>`.

**C. Resource cost/delta chip rendered 4 different ways.** Near-identical `RESOURCE_ORDER.filter(...).map(icon+amount with resourceCssVars)` markup:
- CostRow — PopulationModals.tsx:577-598
- ResourceCost — board/command/ActionCommandPanel.tsx:10-21
- ResourceDeltaList — board/ResourceDeltaList.tsx:6-27
- HoldingNetYields — SettlementCard.tsx:89-117
One `ResourceChips` component with props (filterZero, signed, showLabels) covers all four.

**D. `capitalize` defined 4×:** board/helpers.ts:168-170, PopulationModals.tsx:680-682, SettlementCard.tsx:123-125, board/topbar/SeasonDial.tsx:37-39. helpers.ts already exports it; the others are private re-implementations.

**E. Holdings selector duplicated.** `getSettlementEntries` (PopulationModals.tsx:654-662) is an unsorted re-implementation of `getOwnedHoldings` (board/helpers.ts:20-33); `formatTileName` (PopulationModals.tsx:684-688) shadows `holdingShortLabel` (helpers.ts:156-158).

**F. ActionCommandPanel is 7 hand-unrolled copies of the same button.** ActionCommandPanel.tsx:79-230: each verb repeats `disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || <specific>}` (lines 81, 106, 128, 149, 168, 193, 218) and a 3-branch title ternary starting with the literal string "Resolve the pending player event first." repeated 7× (85, 110, 132, 153, 171, 196, 221). Should be a `VERBS` data array mapped over a single `<CommandVerb>` component.

**G. Viewport-clamped popover positioning implemented twice:** FoundColonyPopover's useLayoutEffect (PopulationModals.tsx:136-164) and BuildingChip's showTooltip (board/ledger/BuildingChip.tsx:28-48). Both compute clamp-to-viewport + above/below placement. Candidate `useAnchoredPopover(anchorRect)` hook.

**H. Pop-choice button grid duplicated:** icon+label+count chip grid in FoundColonyPopover (PopulationModals.tsx:224-238), GrowPopModal.tsx:76-93, LadderModal.tsx:73-95 — same `popChoiceGrid`/`selectedChoice` markup with different data.

**I. Settlement `<select>` option formatting duplicated 4×:** PopulationModals.tsx:217-221 and 452-469, GrowPopModal.tsx:67-73, PendingPlayerEventModal.tsx:106-115 — each hand-formats "Kind tileId - Terrain - pops".

## 3. PROP & STATE COUPLING

- **Raw `G: HegemonyState` passed to 25 of 27 components.** Every leaf receives the whole game state; no context/provider. Consequence: any state change re-renders the whole tree except the 4 memoized components (HexMap, EmpireIntelPanel, PlayerScoreboard, SeasonStatus) — and even those receive `G` so memo only helps when G is referentially unchanged.
- **Biggest prop bags:** ActionCommandPanel takes 17 props (ActionCommandPanel.tsx:23-61), 10 of them booleans/callbacks derived in HegemonyBoard; EmpireIntelPanel takes 10 (EmpireIntelPanel.tsx:38-59). The recurring 5-tuple `G, playerID, phase, isActive, on*` is threaded through every modal and tab — a `GameUiContext` (or at least a `ViewerProps` type) would collapse it.
- **Drilling depth:** HegemonyBoard → EmpireIntelPanel → CitiesTab → BuildingChip is 3 levels for `onBuildBuildingRequest`; `moves.bankSell/bankBuy` are renamed to `onBankSell/onBankBuy` at HegemonyBoard.tsx:258-259 then re-drilled through EmpireIntelPanel.tsx:181-188 into MarketTab.
- **Direct state-shape reaches (no tile index/selectors):** `G.board.tiles.find(t => t.id === id)` re-scanned in PopulationModals.tsx:117, 685; PendingPlayerEventModal.tsx:107; `G.players[playerID].resources.gold` MarketTab.tsx:28; `G.bank[material]` MarketTab.tsx:38; `G.transfers.filter` in both MovePopsModal (PopulationModals.tsx:419) and PopsTab.tsx:44-46. Engine `get*Status`/`preview*` functions are used consistently as legality selectors (good), but there is no memoized "holdings/tileById" layer — `getOwnedHoldings` is recomputed per component (EmpireIntelPanel.tsx:61, GrowPopModal.tsx:35, LadderModal.tsx:47).
- **DOM coupling:** HegemonyBoard.tsx:169 does `document.querySelector('[data-tile-id=...]')` to get a DOMRect anchor for FoundColonyPopover — the board reaches into HexMap's rendered SVG by selector instead of HexMap reporting the anchor in its callback.
- **HegemonyBoard owns 11 modal booleans** (HegemonyBoard.tsx:63-80) reset by two parallel effects (123-146) that must be kept in sync by hand; a single `openModal: ModalKind | null` reducer would remove the reset-list drift risk.
- **Unmemoized per-render engine calls:** PlayerScoreboard.tsx:26 runs `calculateEconomyProjection` for all players on every render (no useMemo, inside memo component that re-renders on any G change); PopsTab.tsx:43 same for the viewer; expensive relative to their leaf position.
- **Per-tile status scans in render:** HegemonyBoard.tsx:92-93 evaluates `getFoundColonyStatus`/`getUpgradeColonyToCityStatus` over every tile on every render (not memoized, unlike lines 94-108).

## 4. CONSISTENCY

- **File organization is split-brain:** newer code lives in board/{command,ledger,modals,topbar}, but 8 legacy files sit at components/ root. PopulationModals.tsx holds 4 modals that belong in board/modals/; SettlementCard/ResourceGrid/AnnotatedText/Sprites are shared atoms with no atoms/ or shared/ home. board/events.ts:5-7 even carries a comment apologizing for asset paths caused by the half-finished move.
- **Naming:** memoized components use the `XxxComponent` + `export const Xxx = memo(...)` pattern (HexMap.tsx:80/687, EmpireIntelPanel.tsx:38/196, PlayerScoreboard.tsx:10/85, SeasonStatus.tsx:7/43); everything else exports plain functions — fine but two idioms. Callback prop naming is consistent (`on*Request`, `onCancel/onConfirm`). CSS class naming is camelCase and consistent.
- **Styling:** almost entirely CSS classes + the disciplined `resourceCssVars` CSS-variable bridge (good). Exceptions — hardcoded hex colors in TSX: ResourceGrid.tsx:157-161 (negative-happiness palette `#b13a28` duplicating a rules-threshold color), GameOverModal.tsx:30/45 and VictoryTab.tsx:29/44 and PlayerScoreboard.tsx:39 inline `PLAYER_COLORS` styles (acceptable pattern, but three different style-prop shapes).
- **Hardcoded strings/numbers in TSX:** the 7× "Resolve the pending player event first." tooltip (ActionCommandPanel); riot copy building in RiotModal.tsx:59-62; BuildingChip.tsx:41 magic `150` placement threshold and `gutter = 10` vs DETAIL_TOOLTIP_WIDTH being in constants.ts; PopulationModals.tsx:144-145 margin/gap 12, :161 arrow clamp 18; ResourceGrid.tsx:63 flash timeout 2400. HexMap constants are exemplary (named at HexMap.tsx:35-65).
- **Accessibility:** dialogs consistently set role/aria-modal/aria-labelledby, but PlacementModalShell points aria-labelledby at the body div (PopulationModals.tsx:547/554), not the title; CalmModal/VentureModal reuse EventTableModal's `event-table-title` id — duplicate ids if two ever stack.
- **formatters.ts vs board/helpers.ts vs board/events.ts** all hold formatting; where a formatter lives is unpredictable (`formatEventEffects` in board/events.ts, `formatBuildingEffects` in ui/formatters.ts).

## 5. DEAD / LEGACY CODE

- **Unused exports (verified by grep, definition-only):** `formatPopShort` (formatters.ts:114), `phaseLabel` (formatters.ts:122), `seasonTag` (formatters.ts:33), `buildingName` (formatters.ts:118 — duplicated privately as `buildingNameForEvent` in board/events.ts:100), `placementKindLabel` (board/helpers.ts:160). `PLAYER_DISPLAY_NAMES` (board/constants.ts:4) is a pure alias of `PLAYER_NAMES` imported in 4 files — indirection with no value.
- **PopulationModals.tsx (688 LOC) is a legacy monolith, not dead:** all 4 exports are used by HegemonyBoard, but it is the only multi-modal file left at the old root location, contains its own private modal shell (PlacementModalShell:526), its own cost row (CostRow:577), its own holdings selector (getSettlementEntries:654) and capitalize (:680) — all shadowing board/ equivalents. Decompose into board/modals/{PopulationPickerModal,FoundColonyPopover,UpgradeCityModal,MovePopsModal}.tsx + promote PopulationStepper/PlacementModalShell to shared.
- **HexMap.tsx (687 LOC) is a working monolith, no dead code:** but it is 3 programs in one file — a camera engine (~lines 104-302: rAF-batched viewBox, drag/click suppression, wheel zoom), pure hex geometry (lines 510-685: 12 module functions incl. shoreline computation), and tile JSX (lines 368-503). Natural split: `useMapCamera` hook, `hexGeometry.ts`, `<TileGroup>` component; the geometry functions are pure and unit-testable today.
- No orphaned component files found; every component in the tree is reachable from HegemonyBoard.

## 6. RANKED REFACTOR LIST (value-ordered)

1. **Extract shared `ModalShell` (+ SelectionStatus line) and port all 9 dialogs** — M. Kills duplication A+B, fixes the aria-labelledby/duplicate-id issues once, makes every future modal ~40 LOC cheaper. Prereq for #2.
2. **Split PopulationModals.tsx into board/modals/ files; promote PopulationStepper, PlacementModalShell, CostRow; delete its private getSettlementEntries/capitalize/formatTileName in favor of board/helpers** — M. Finishes the board/ migration, removes the last legacy multi-component file, unlocks per-modal lazy loading.
3. **Data-drive ActionCommandPanel verbs** (VERBS array → one CommandVerb component; hoist `gameplayLocked = !isActive || phase !== "gameplay" || hasPendingPlayerEvent` and the pending-event tooltip string) — S. 238→~120 LOC, adding a verb becomes a data edit.
4. **Introduce `GameUiContext` (G, viewerId, currentPlayerId, phase, isActive, moves)** consumed by tabs/modals — M. Collapses the 17-prop and 10-prop bags (ActionCommandPanel.tsx:23-61, EmpireIntelPanel.tsx:38-59) and the G-threading through all 25 components; enables fine-grained selector hooks later.
5. **Unify resource-chip rendering into one `ResourceChips`** (replaces CostRow, ResourceCost, ResourceDeltaList, HoldingNetYields internals) — S. Ends duplication C; single point for the resourceCssVars/icon pattern.
6. **Split HexMap.tsx: `useMapCamera` hook + `hexGeometry.ts` + `<TileGroup>`** — L. Makes camera logic and geometry unit-testable, tile rendering readable; needed before richer map features (armies, routes) land on the same file.
7. **Replace HegemonyBoard's 11 modal booleans with a single `activeModal` discriminated union + one reset effect** — M. Removes the hand-synced reset lists at HegemonyBoard.tsx:123-146 and makes "only one modal open" an invariant instead of a hope.
8. **Consolidate `useAnchoredPopover` from FoundColonyPopover + BuildingChip positioning code, and have HexMap pass the tile anchor rect in its callback** (delete document.querySelector at HegemonyBoard.tsx:169) — M. Removes DOM-selector coupling between board and map; tooltip/popover placement is then one tested implementation.
9. **Memoize hot engine calls:** wrap PlayerScoreboard per-player `calculateEconomyProjection` (PlayerScoreboard.tsx:26), PopsTab.tsx:43, and HegemonyBoard.tsx:92-93 tile scans in useMemo; add a `tileById` map selector — S. Cheap render-cost win as tile count/log grows.
10. **Delete dead exports** (formatPopShort, phaseLabel, seasonTag, formatters.buildingName, placementKindLabel, PLAYER_DISPLAY_NAMES alias) and hoist stray magic numbers (BuildingChip 150/10, ResourceGrid 2400, ResourceGrid's #b13a28 into resourceVisuals) — S. Pure hygiene; keeps helpers/formatters honest as the single formatting home.


## TOP FINDINGS
- Modal scaffold is copy-pasted across 9 dialogs in two families (PopulationModals.tsx:52/434/526, GrowPopModal, LadderModal, GameOverModal, EventTableModal, CalmModal, PendingPlayerEventModal) — no shared ModalShell exists
- PopulationModals.tsx (688 LOC) is a legacy monolith at the old root location: 4 modals + private shell/cost-row/selector/capitalize that all shadow board/ equivalents (getSettlementEntries:654 duplicates helpers.getOwnedHoldings:20)
- HexMap.tsx (687 LOC) is 3 programs in one: rAF camera engine (104-302), pure hex geometry (510-685), and tile JSX (368-503) — splittable into useMapCamera + hexGeometry.ts + TileGroup with zero dead code
- ActionCommandPanel.tsx hand-unrolls 7 near-identical verb buttons; the disabled predicate and the literal string 'Resolve the pending player event first.' are each repeated 7x (lines 81-221)
- Raw G: HegemonyState is passed to 25 of 27 components with prop bags up to 17 props (ActionCommandPanel.tsx:23-61) and 3-level drilling; no context or selector layer
- Resource cost/delta chips are implemented 4 separate times (PopulationModals CostRow:577, ActionCommandPanel ResourceCost:10, ResourceDeltaList, SettlementCard HoldingNetYields:89)
- HegemonyBoard owns 11 modal booleans reset by two hand-synced effects (HegemonyBoard.tsx:63-80, 123-146) and reaches into HexMap's DOM via document.querySelector (line 169)
- Confirmed dead exports: formatPopShort, phaseLabel, seasonTag, buildingName (ui/formatters.ts), placementKindLabel (board/helpers.ts:160); capitalize is defined 4x
- Unmemoized engine calls in render: PlayerScoreboard.tsx:26 runs calculateEconomyProjection for every player on every render; HegemonyBoard.tsx:92-93 scans all tiles for action status unmemoized
- Viewport-clamped popover positioning is implemented twice (PopulationModals.tsx:136-164 and BuildingChip.tsx:28-48) — candidate useAnchoredPopover hook
