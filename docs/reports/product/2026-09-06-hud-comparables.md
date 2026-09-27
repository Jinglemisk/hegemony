# HUD comparables — research notes (2026-09-06)

Forty-four sources on in-match HUD anatomy in RTS, grand-strategy, 4X, RTwP and digital board games, gathered for [The Asymmetric Table](2026-09-06-asymmetric-table.md).

Scope: in-match HUD anatomy of RTS, grand-strategy, 4X, RTwP and digital board games. Positions are approximate regions as described by the cited page; bot-blocked pages are cited only where a search excerpt or official mirror confirmed the claim.

## 1. Layout anatomy

**Age of Empires II DE / III DE (World's Edge "Definitive HUD")**
- Official layouts: "Definitive HUD" = minimap bottom-right, resources along the top; "Classic HUD" = minimap bottom-left with resources adjacent; devs note "The HUD is less obtrusive overall, appearing and disappearing as you select different units and buildings" and added scaling options. https://www.ageofempires.com/news/aoe3de-hud-and-ui/
- The command panel (actions for the selected unit/building) sits opposite the minimap on the bottom band; the bottom-left command card convention dates to Warcraft: Orcs & Humans, where "if a building or unit(s) is selected, the bottom left shows their status and any upgrades and the actions that can be performed". https://en.wikipedia.org/wiki/Warcraft:_Orcs_%26_Humans
- AoE II DE offers an in-game HUD scale slider "up to 125%", a separate tooltip-scale slider, and optional dark "Readability Panels" behind text. https://www.ageofempires.com/age-ii-de-accessibility/
- Selection drives the bottom band; persistent: resources, minimap, menu buttons.

**Age of Empires IV**
- Minimap is a square in the lower-left; two small corner panels beside it hold ally pings (top-right of minimap) and camera rotate/minimap-zoom (bottom-right of minimap). https://ageofempires.fandom.com/wiki/Mini_map
- Season Four added a minimap zoom (Normal/125%/150%) via "the zoom button to the lower right of the minimap HUD". https://www.ageofempires.com/news/ageiv_seasonfour_update_60878/

**Imperator: Rome (Paradox)**
- Top bar: treasury, manpower, research, influence, stability, AE, tyranny; "Many major actions will have alerts at the top of the screen." Left edge: twelve god-icon buttons (F1–F10) for empire screens. Macro-builder top-left under the flag. Outliner on the right (Tab) listing armies, navies, claims, constructions. Date/speed/outliner toggle in the upper right. Clicking a province opens its detail panel. https://imperator.paradoxwikis.com/Beginner%27s_guide

**Crusader Kings III**
- Top: "a group of icons relating to the current events, containing tips or information about matters that you can take care of", then resources. Right edge: seven vertical buttons (realm, military, council, court, intrigue, factions, decisions). Bottom bar: speed/pause/date. Lower-left: ruler, dynasty, religion, culture icons. https://www.gamepressure.com/crusader-kings-3/interface-description/z2f0f6
- Alerts are grouped: the "Powerful vassal expects council position" alert lives "in the 'current situation' menu dropdown at the top of the screen". https://steamcommunity.com/sharedfiles/filedetails/?id=3030326050 CK2 let players disable alerts individually; CK3 "groups certain issues into a Situation Button". https://forum.paradoxplaza.com/forum/threads/customizable-outliner-ledger-and-other-ck2-ui-features-id-like-to-see-return.1586759/
- Console port rationale: "Avoiding the use of lots of fullscreen menus that potentially break the immersion of gameplay was a driver"; "most of the community want as much information at their fingertips as possible". https://www.paradoxinteractive.com/games/crusader-kings-iii/news/ck3-console-dev-diary-3-uiux-and-controls

**Old World (Mohawk)**
- Resources top-centre; leader portrait bottom-left with the orders scroll and legitimacy crown on it. https://ladiesgamers.com/old-world-tips-guide-1/
- End turn is "a rectangle-shaped box in the lower left corner … (Lower-right of leader's portrait)"; events queue opened with "1". https://steamcommunity.com/app/597180/discussions/0/4364625713981970868/
- Selection opens a contextual "selection panel"; empire-level screens (tech, families, laws) are separate tabbed windows.

**Total War: Warhammer III (campaign)**
- Three top bars: left = menu/advisor/help; centre = treasury, income, faction currencies; right = tactical map, events, lords/heroes, provinces, factions. Lower-right round menu: end-turn in the middle ("if you haven't done all the possible actions, the game will inform you about it here"), with missions, diplomacy and tech buttons around it; turn counter and notification settings below. Selecting an army or province: left side shows province data or lord details; centre shows buildings/garrison. https://www.gamepressure.com/total-war-warhammer-3/user-interface/z9f67f

**RTwP party RPGs**
- Baldur's Gate (1998): three stone panels bordering bottom and both sides. Left panel = seven full-screen modes (inventory, map, journal…); right panel = party portraits (left-click select, right-click inventory); bottom = action buttons for the selected character with the feedback log above; clock/pause bottom-left. https://lilura1.blogspot.com/2019/10/Baldurs-Gate-Retrospective-Review-User-Interface.html
- Pillars of Eternity II: portraits along the bottom; clicking a portrait "unlock[s] the quick access bar" of abilities and items; six global party buttons (attack, cancel, select all, formation, rest, stealth); icons for inventory/character/journal/map/ship/options; a notifications/combat log; several HUD layouts selectable in options. https://www.gamepressure.com/pillars-of-eternity-2/interface/z6a849
- Pattern: the party roster is persistent; selection swaps only the action row.

**Humankind (Amplitude)**
- Science button bottom-left. https://humankind-encyclopedia.games2gether.com/en-us/beginner-guide Encyclopaedia and game menu bottom-right. https://outsidergaming.com/humankind-controls-guide-for-pc-and-how-to-play/ End-turn in the bottom row next to Civics/Tenets. https://community.amplitude-studios.com/amplitude-studios/humankind/forums/169-game-design/threads/39921-ui-suggestion-show-building-options-in-main-screen
- Amplitude's own retrospective (Endless Legend 2): "We split information on different sides of the screen because there was a logical difference (for us) or we wanted to minimize overlap on the center of the screen. But it ended up being frustrating for players." Fix: consolidate empire actions upper-left, city info at the bottom, remove the "Divided UI". https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/996-ui-ux-next-steps

**Civilization VI**
- Yields top bar; ranking, city-state and trade panels on the right; "In the lower left corner of the interface, there's the minimap" with map options above it; bottom-right action panel "responsible for showing you which actions require your attention … after doing all important actions, you'll be able to end the turn here"; unit and city panels appear contextually. https://www.gamepressure.com/sidmeierscivilization6/interface/ze92ba

## 2. Bottom-left command cards vs turn-based alternatives

- Rationale (Josh Bycer): "The bottom portion of the screen was reserved for contextual information such as unit stats, building details … This allowed you to quickly assess information or make commands in a centralized location"; scattering commands (Planetary Annihilation: build bottom, resources top, orders right) "requires you to split your attention". https://www.gamedeveloper.com/design/ui-strategy-game-design-dos-and-don-ts
- History: Westwood's right sidebar vs Blizzard's bottom bar ("very similar bar but on the left"); Homeworld 2 as a hybrid of bar and pull-out widget. https://medium.com/@treeform/strategy-game-battle-ui-3b313ffd3769
- Civ VI: the end-turn button "change[s] to other icons to represent other actions that you might need to take before ending your turn"; clicking it "take[s] you where you need to go"; only when nothing remains does it become End Turn. https://steamcommunity.com/app/289070/discussions/0/4149455258732511192
- Old World: "End Turn button now always active, clicking it will cycle to decisions preventing turn from ending". https://mohawkgames.com/2026/02/18/old-world-update-143/ Design context: Orders pool and undo replace move-every-unit. https://www.gamespress.com/en-US/Soren-Johnson-GDC-2022-Talk
- Humankind: "Enable Mandatories" (Settings > UI) gates end-turn on required actions; players ask for a ctrl-click force-end like Civ. https://community.amplitude-studios.com/amplitude-studios/humankind/ideas/2976-enable-mandatories-button-when-turned-off-way-to-force-end-turn-when-turned-on
- Total War: end-turn button itself reports undone actions (see §1).

## 3. End-of-turn ledger / notification stacks

- Civ VI: notification bar on the right "when there are notifications … When there are no notifications, there is no bar". https://steamcommunity.com/app/289070/discussions/0/340412122418036182/
- CK3: issues grouped into a single top "current situation" dropdown (§1 sources).
- Old World turn summary: shown at turn start with an OK button, categories ordered (injuries above deaths). https://mohawkgames.com/2023/05/31/old-world-update-109/ Always lists royal births; also emailed for cloud games. https://mohawkgames.com/2024/05/01/old-world-update-122/ Summary lists only player-owned affected tiles; the separate turn notifications list all visible ones. https://mohawkgames.com/2026/07/01/old-world-update-148/
- Victoria 3: laws, diplomatic plays, revolutions and pending events "are automatically pinned to the right side of your screen. Below those are outliner elements you can manually pin". https://vic3.paradoxwikis.com/User_interface Per-message settings (display style, auto-pause) and halving notification volume by splitting significant/insignificant. https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-74-ux-improvements
- Stellaris: square alerts in the top bar "remain until the circumstance changes or the player right clicks them". https://stellaris.paradoxwikis.com/Main_interface

## 4. Hot-seat handoff patterns

- Civ VI shows a blocking "Please Wait" / player-change popup between human turns (files PlayerChange.lua/.xml) that must be confirmed. https://steamcommunity.com/app/289070/discussions/4/282992646969652531/ A mod "removes the screen that blocks view in between players' turns, automatically confirms the beginning of next turn". https://steamcommunity.com/sharedfiles/filedetails/?id=2924856042 Complaint: Civ V kept the map visible; Civ VI "the screen cuts". https://forums.civfanatics.com/threads/the-screen-between-turns-in-hotseat-mode-is-awful-is-there-a-way-to-remove-it.610985/
- Tabletop Simulator hotseat: players pick colours and table sides; "The table will rotate to the active player's side"; End Turn at top; "inactive players should turn away". https://pinnguaq.com/learn/socializing-at-a-distance/tabletop-simulator/ Hand hiding on player change has been reported broken. https://steamcommunity.com/app/286160/discussions/0/3647273545688677039/
- Tabletopia hotseat: click End Turn; "your hand will now be hidden and your opponent will not see it". https://help.tabletopia.com/knowledge-base/game-modes-solo-hotseat-online/
- Through the Ages: pass-and-play shows a blacked-out screen with the current player's name (mobile). https://www.pixelatedcardboard.com/through-the-ages-review/ Developer: "you can see other players hidden information … not an issue on a tablet … But it is a problem on a big screen". https://steamcommunity.com/app/758370/discussions/0/1697168437879148985/
- Root: pass-and-play means "any onlookers would be able to see their opponents' hands"; hiding the screen adds downtime. https://waytoomany.games/2020/11/11/review-root-digital-edition/
- Scythe: hotseat leaves ammo panels and secret objectives visible ("text only at the top left"). https://steamcommunity.com/app/718560/discussions/0/3559414588262717191/

## 5. UI scaling and minimum type

- Xbox Accessibility Guideline 101 (body height): console ≥26 px @1080p / 52 @4K; PC/VR ≥18 px @1080p / 36 @4K; mobile 18 px @100 DPI; text scalable to 200% without loss; icons/glyphs meet the same minimum; line width ≤80 chars, leading ≥1.5. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101
- Game Accessibility Guidelines: 28 px @1080p "as a minimum rather than a target". https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/
- IGDA GA-SIG: 32 px @1080p default, 46 px for timed text. https://igda-gasig.org/how/platform-level-accessibility-recommendations/text-size/
- Steam Deck Verified: smallest glyph "should never fall below 9 pixels in height at 1280x800", 12 px recommended, readable at 30 cm. https://partner.steamgames.com/doc/steamhardware/compat
- AoE II DE: HUD scale to 125% (§1). CK3 ships a UI-scale setting; a mod keeps windows on-screen, "Tested at 130% scaling at 1920x1080". https://steamcommunity.com/sharedfiles/filedetails/?id=2217509277

## 6. Asymmetric vs symmetric; inspector vs empire management

- No strong published argument for asymmetry per se was found; the evidence is about consolidation. Bycer: keep commands in "one or at most two areas". https://www.gamedeveloper.com/design/ui-strategy-game-design-dos-and-don-ts Amplitude: splitting related info across sides "ended up being frustrating for players". https://community.amplitude-studios.com/amplitude-studios/endless-legend-2/blogs/996-ui-ux-next-steps
- Peripheral vision (Player Research): acuity drops beyond ~2° from fixation; edge elements should be "big, stark … with variations in brightness", no text strings, use motion for attention. https://www.gamedeveloper.com/design/perceiving-without-looking-designing-huds-for-peripheral-vision
- Outliner pattern (Paradox): a right-edge quick-access list "divided into 4 tabs" with double-click to centre; a navigation tool distinct from the selection/inspection windows. https://stellaris.paradoxwikis.com/Outliner Victoria 3 makes it pinnable and auto-pins situations (§3).
- Total War: selection panels (left/centre) are separate from the persistent right-edge lists of lords, provinces, factions and events (§1).

## 7. Persistent rosters in digital board games

- Terraforming Mars: main screen keeps the map focal; "Opponent corporation listings (tappable to view their stats)" along the top; generation and global parameters as top indicators; own condensed mat lower-left; card categories lower-right. https://www.meeplemountain.com/reviews/terraforming-mars-digital/
- Scythe: "mouse over their icon in the bottom right to see all the info about your opponents" (faction icons in the turn panel; not explained in-game). https://steamcommunity.com/app/718560/discussions/0/1710690176750163495/
- Root: faction boards are behind a click; reviewer misses "taking in all the info from everyone's faction boards with no more than a sweep of my eyes". https://spritesanddice.com/reviews/root-digital-review/
- Tabletop Simulator: active player marked by "the star next to their name (in the upper right)". https://kb.tabletopsimulator.com/host-guides/turns/

## What transfers to Hegemony (neutral synthesis)

1. Every comparable keeps empire totals on a top strip and a turn/speed control bottom-right; only the middle band varies.
2. RTS command cards are selection-driven and vanish when idle (AoE III DE blog); turn-based games keep a stable panel and add contextual sub-panels (Old World selection panel, Total War left panel).
3. The strongest published rule is consolidation, not symmetry: Bycer's "one or at most two areas", Amplitude's "Divided UI" regret.
4. Turn-based end-turn buttons double as a to-do cursor (Civ VI, Old World, Total War); Humankind's hard gate drew requests for a force-end override.
5. A start-of-turn ledger (Old World turn summary with OK) and a right-edge pinned situation list (Vic3, Civ VI) coexist; ledgers are per-player, notification lists are shared.
6. Edge elements read best as large glyphs/numbers, not text (peripheral-vision guidance).
7. Hot-seat privacy is usually a full-screen blocking card with the next player's name and a confirm; skipping it is a known mod target, hiding hands is where implementations break.
8. Digital board games keep a compact opponent roster (top or bottom-right) and put detail behind hover/tap; reviewers notice when a glance no longer suffices.
9. Type floor for desktop: 18 px body @1080p (XAG PC) to 28–32 px (GAG/IGDA); at 1280 wide that argues for a scale option rather than a fixed 12–14 px.
10. Outliner-style lists (right edge, pinnable, double-click to centre) are the grand-strategy answer to "what am I forgetting" without opening a full screen.
