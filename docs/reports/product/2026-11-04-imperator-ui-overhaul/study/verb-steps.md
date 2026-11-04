# Verb click-path audit

Live build, `main` at c0739d0, 2026-11-03. Viewport 1440×900.

## How it was counted

- **Landing:** the seat's own turn has started, the fate card is resolved, nothing is selected, and the realm sheet shows its default Overview page with the camera at the opening view.
- **Step:** one click or one key press. A hover counts only where the control cannot be reached without it. Every count runs up to the moment the state changes, confirm included.
- **"tile":** a click on a settlement or tile on the map. The player has to know where that place is. Routes that arm the map light up the legal tiles, which helps.
- **Scrolls:** none needed. At 1440×900 every control used here sits above y = 900, on both a two-settlement and a four-settlement board. The lowest is the Build page's Granary cell at y = 880.
- **Verified in the app:** at least one option per verb by every route, with Playwright headless. The boards were `?mode=fastStart&seed=42` (Year I, almost every option live), `?dev=cards` (a held card), `?dev=ideas` (influence for an Idea), `?dev=trade`, `?dev=riot-confirm` and `?dev=mid-game` (Year 6; most options disabled there, so it was used only for fold checks). Each result was confirmed by a chronicle line and the changed counts. Rows marked *code* were read from the code and not clicked.

### How the discs behave

- **Disc click.** A click runs the disc's default option if that option is live. Grow's default is a slave, which arms the map. Expand's default is Found, which arms the map. Civic's default is Calm for gold, which **commits at once, with no confirm**. Trade's default is Offer, which opens the offer card. People and Build have no default, so their click opens the fan. When the default is disabled (capped, unaffordable), the click opens the fan instead. This was verified: after three Calms, the fourth Civic click opened the fan.
- **The default click is a one-step route only for Calm (gold).** For Grow, Expand and Trade it is the first step of the default option's path.
- **Hover.** A 500 ms hover on a disc opens its fan. It was closed at 300 ms and open at 700 ms. Without the hover, the fans of Grow, Expand, Civic and Trade can't be reached by mouse, because the click runs the default. So the hover counts as a step for their non-default options. People and Build open by click, so a hover there is optional and isn't counted.
- **Keyboard.** From a fresh landing it takes Tab ×32 to reach Grow, then ×33 People, ×34 Expand, ×35 Build, ×36 Civic and ×37 Trade. Then Enter opens the fan, arrows walk it, and Enter picks. No action has a hotkey. The global keys are 1–4 (map mode), `?` (Codex), 0 (compass), Q/E (rotate) and Esc (cancel).

## Table: one row per verb option

Counts are clicks. "+1h" means one required hover on the disc.

| Verb | Option | Via the verb | Best other route (steps) | Other routes | Verb-only | Notes |
|---|---|---|---|---|---|---|
| Grow | Slave | **3**: disc, tile, confirm | none | none | **yes** | Needs a target settlement. Disabled when no settlement can grow one (food, room, growths left there this turn). |
| Grow | Freeman | **3 +1h**: hover, Freeman, tile, confirm. Or **4** with no hover: disc, tile, Freeman in the popover, confirm | none | none | **yes** | The popover's pop switch gives the no-hover path. |
| People | Promote slave → freeman | **5**: disc, Promote, Slave to freeman, tile, confirm (*code*) | Ladder page **4**: Ladder tab, "Free" rung, tile, confirm | none | no | Ladder cap 3 a turn, shared by every rung. With dwell hovers instead of clicks the verb takes 3 clicks + 2 hovers. |
| People | Promote freeman → citizen | **5** (verified) | Ladder page **4** (verified) | none | no | Same armed map mode and popover on both routes. |
| People | Demote citizen → freeman | **5** (verified) | Ladder page **4** (verified) | none | no | |
| People | Demote freeman → slave | **5** (*code*) | Ladder page **4**: Ladder tab, "Sell" rung, tile, confirm | none | no | |
| People | Move | **7** for one pop: disc, Move, source tile, "Move From Here", target tile, +1 pop, Send | none | none | **yes** | Each extra pop adds 1. Needs two settlements on the map. One move a turn. Disabled with no room or no food. |
| Expand | Found | **3**: disc, tile, "Found Colony" | Map **3**: empty tile, "Found a colony here", "Found Colony" (verified) | none | no | Equal count. The verb lights the legal tiles (9 on the test board). The map route needs the player to pick a legal tile unaided. The popover defaults to the first source and its first pop, which is a **citizen**. Picking another source or pop adds 1 on either route. |
| Expand | Upgrade | **2 +1h**: hover, Upgrade, "Upgrade City" (verified). **3** with no hover when Found is disabled (the click opens the fan) | none | keyboard: Tab ×34, Enter, →, Enter, confirm | **yes** | Picking a colony other than the first listed adds 1. |
| Build | Slaves (Estate) | **4**: disc, Slaves, tile, confirm (*code*) | Build page **2**: Build tab, cell | Build page in another settlement 3 (tab, "Raise in" pick, cell). Map tile → "Raise a building" → cell 3. Cities tab → "raise" → cell 3 | no | A Build page cell commits on one click, with no confirm. Its default settlement is the first one with an open slot. That route needs no map knowledge. |
| Build | Freemen (Marketplace) | **4** (verified) | Build page **2** | same as above | no | A class with one building skips its second fan. |
| Build | Citizens (Forum) | **4** (*code*) | Build page **2** | same | no | |
| Build | Civic → Temple | **5**: disc, Civic, Temple, tile, confirm (verified) | Build page **2** (verified) | map tile → "Raise a building" → cell **3** (verified). Cities → raise → cell **3** (verified) | no | |
| Build | Civic → Granary | **5** (*code*) | Build page **2** | same | no | |
| Build | Civic → Port | **5** (*code*) | Build page **2** | same | no* | *The Build page claims the first claimable good automatically. Only the map popover lets the player pick, and only the verb reaches it. A code comment says current placement never offers two goods. |
| Civic | Calm (gold) | **1**: disc click commits (verified) | none during the turn | End turn's confirm, "Calm, then end": hold End turn + 1 click. It appears only when ending would start a riot or a revolt, and it also ends the turn (verified present in `?dev=riot-confirm`) | **yes** in practice | Cap 3 a turn. No confirm: a stray click spends 2 gold. |
| Civic | Calm (influence) | **1 +1h** (verified) | none | the same End-turn confirm, if it picks influence | **yes** in practice | |
| Civic | The Dole | **1 +1h** (verified) | none | none | **yes** | Cap 3 a turn. |
| Civic | Ideas (buy the second Idea) | **3 +1h**: hover, Ideas, pick an Idea, buy (verified) | none | none | **yes** | Picking a pop or settlement target adds 1 for Ideas that ask one (*code*). Live once a game: 6 influence, after the setup pick. Disabled on the mid-game board. |
| Civic | Buy a card | **1 +1h**: commits on the click (verified) | none | none | **yes** | Once a turn. The drawn-card reveal comes after the commit. |
| Civic | Your hand (play a card) | **2 +1h**: hover, Your hand, Play. **3 +1h** for a card with a choice (Caravan: pick the kind, verified) | none | none | **yes** | The first playable card is preselected. A rival or settlement choice adds 1 each. |
| Trade | Offer | **6** for one-for-one to the table: disc, + I want, item, + I give, item, "Offer to the table" (verified) | none during a turn | During an Assembly sitting, "Offer a trade as X" opens the same card | **yes** (in a turn) | Naming seats adds 1 each, and each extra unit adds 1. Traded pops add map picks. The fan holds this one option, which the disc click already runs. |

## Actions outside the verbs, in no fan

- **End turn** (press and hold), and its riot/revolt confirm: "Calm, then end" or "Face the riot" / "Revolt".
- **Answering offers** on the alarms row: each offer disc opens a card to accept, decline, counter, settle with a partner, or withdraw your own.
- **The Assembly sitting:** draw a politician, discard the held one, propose (with a target), propose a repeal, pass, bribe, vote yea or nay, Ready, close. It also has its own "Offer a trade as X".
- **Forced moments:** fate card (resolve or decline), hunger (who leaves), riot (insurance, roll, pay pops), revolt and year-card dismissals.
- **Setup:** the Idea draft pick and the town placements.

That is the full list. There are no hotkeys and no right-click menus for turn actions. The settlement page carries one action link, "Raise a building", which hands off to the Build page.

## Per-verb verdict

| Verb | Verdict | Numbers |
|---|---|---|
| Grow | **essential** | 2 of 2 options are verb-only (3, or 3+1h / 4). |
| People | **partly redundant** | 4 of 5 options (every promote and demote) are 1 step shorter on the Ladder page (4 vs 5). Move is verb-only (7). |
| Expand | **partly redundant** | Found ties with the map's tile page (3 vs 3). Upgrade is verb-only (2+1h). |
| Build | **redundant** | All 6 buildings are shorter on the Build page: 2 vs 4 (class buildings) and 2 vs 5 (civic buildings), or 3 when the place isn't the default. The only gap is Port's choice of good, which current maps never offer. |
| Civic | **essential** | 6 of 6 options are verb-only during the turn. Calm's only other route is welded to ending the turn at the riot line. 5 of the 6 need the hover. |
| Trade | **essential** | Offer is verb-only during a turn (6). The fan holds one option and adds nothing over the disc click. |

## Surprises

1. **The settlement page has no people controls.** Clicking your own city on the map opens a page whose only action is "Raise a building". `SettlementCard.tsx` is a read-only summary used inside the Found and Upgrade dialogs. Promote and demote live only on the People fan and the Ladder page.
2. **Civic hides five of its six options behind a 500 ms hover**, because its click spends 2 gold on Calm at once, with no confirm. The same holds for Upgrade under Expand and Freeman under Grow.
3. **The Build page beats the Build fan by 2–3 steps and skips the map entirely.** It names the settlements and commits on one click. The fan path goes through a map pick and a confirm popover.
4. **Found's popover sends a citizen by default** (first in pop order), the most valuable pop. This was verified: "Damon sent 1 Citizen to seed the new colony."
5. **The Cities page drops its "raise" links past three settlements** (only the open place keeps its line), so that route vanishes in the mid game.
6. **The realm sheet's page is not reset between turns.** A player who left the Ladder or Build page open starts the next turn one step closer: 3 for a promote, 1 for a build in the default place.
