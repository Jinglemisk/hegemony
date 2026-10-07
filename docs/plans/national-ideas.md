---
status: active
phase: "v2"
updated: 2026-10-06
---

# National Ideas

## Outcome

After placement the seats draft one permanent Idea each, in turn, and each buys one
more for 6 influence during play. Every pick and purchase is public at once. An Idea is
held by one seat only, so a taken Idea cannot be picked or bought by another, and a
seat cannot replace an Idea it holds.

Step 9 shipped the roster with a secret simultaneous pick; Step 10 added personality
weights. Step 13 replaced the secret pick with the open draft (owner ruling,
2026-10-06). Step 11 measures the pick spread.

## Settled inputs

- The migration's [Settled inputs](v2-migration.md#settled-inputs) override the
  [direction paper](../reports/balance/2026-09-05-shallow-economy.md).
- Setup is an open draft in turn order and each Idea is held by one seat (owner,
  2026-10-06). Two Ideas per seat total, as before. This replaced Step 9's one
  simultaneous secret pick with no exclusive ownership.
- The capital gets one slot from Idea 4 and Idea 6 adds a physical colony piece.
- The old free luxury trader is retired. Ports still need the coast, claim a luxury,
  and cost resources. There is no veto or gold upkeep.
- Ideas use the same closed standing-effect union as Laws and the match's pinned
  content. No per-player ruleset copies or unused later-acquisition hooks.

## The v2 roster

Each row is the full player-facing sentence, also stored in the match content.

| #   | Idea             | Rule                                                                                                 |
| --- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Good Harvest     | Your realm gains 2 food at each year's income.                                                       |
| 2   | Public Dole      | Your Dole buys 1 food for 2 influence.                                                               |
| 3   | Urban Planning   | Each of your cities has one extra work slot.                                                         |
| 4   | Capital Works    | Your capital has one extra work slot.                                                                |
| 5   | Civic Tradition  | Your realm gains 2 influence at each year's income.                                                  |
| 6   | Frontier Charter | You have one extra colony piece.                                                                     |
| 7   | New Settlers     | When you take this Idea, add one slave or freeman to an owned settlement with room.                  |
| 8   | City Pioneers    | Upgrading a colony adds one freeman to that city if it has room.                                     |
| 9   | Slave Colonies   | Add two slaves to your colonies when you take this Idea and when you found a colony, as room allows. |
| 10  | Harbour Planning | Your Ports take no work slot.                                                                        |
| 11  | Treasury Grant   | When you take this Idea, gain 4 gold.                                                                |
| 12  | Assembly Brokers | You may buy a third vote at each Assembly.                                                           |

## Defaults and interactions

The full Step 9 default block lives in the [migration plan](v2-migration.md#settled-inputs).

- Good Harvest and Civic Tradition are flat realm income; year cards zeroing class
  columns do not take them. General Strike suppresses them with the rest of income.
- Public Dole states a whole price, with the existing food amount and unlimited uses.
- City slots include the capital; Capital Works uses the first setup city, and modes
  with no setup city have no capital. Slot additions stack with Laws; neither changes
  population capacity. Harbour Planning makes a Port occupy zero slots, while Laws'
  building-count limits still count it and its price and claim stay unchanged.
- New Settlers never grants a citizen. Both acquisition grants apply on the purchase
  too; they do not consume growth or ladder actions. Room counts pops in transit.
- Slave Colonies also grants to existing colonies on acquisition. At founding, the
  sent pop's reserved room and Law riders come first; grants stop at capacity.
  City Pioneers grants a freeman at upgrade only, and skips it if there is no room.
- Frontier Charter raises physical supply and placement limit by one; Master Builders
  still cuts only the placement limit. Upgrading and eviction return pieces as usual.
- Assembly Brokers changes the vote-purchase limit, with the existing price,
  currencies and sitting duration. It never cancels a proposal. No consumable Ideas.

## Three-axis parity

| Axis             | Required behavior and evidence                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Engine / backend | Pinned rules, an open draft, exclusive ownership and the paid purchase; focused rule tests.     |
| Frontend         | The draft page with its order strip, the purchase list with holder marks, and a rival's toast.  |
| Simulation & AI  | Legal picks and purchases through the scorer, over untaken Ideas; per-Idea routes, holder wins. |

## Shell and simulation

Fast starts run the draft with the bots' scorer for every seat, including the human, and
skip the page; the routes and explicit picker overrides are in the migration plan's
Step 9 defaults. Normal manual setup keeps the page.

The draft continues the placement snake: placement runs one round per setup placement
(0→3, then 3→0), and the draft is the next round, so the standard two-placement setup
drafts in seat order 0→3. The draft page fills the viewport with no map, HUD or TUNE: a
kicker with the pick number, the choosing seat's mark and name, the flat two-column
list (80px rows) and, beside it, the draft order strip naming who took what, who is
choosing and who is next. A taken row carries its holder's mark and dims. A pick lands
at once with its one-off grants (Treasury Grant's gold, Slave Colonies' slaves) and the
next seat chooses; in hotseat the page follows the turn, so the next seat finds the pick
already marked. No turn notice is needed, since picks are public. After the
last pick the page stays, read-only, with the last pick lit, until the opener turns the
first year. During play, **Ideas** in Civic opens the same list as a sheet over the
frame with the price, what you hold and how many Ideas are left; a bought Idea's mark
carries the year. A purchase closes it, and the other seats see a toast. New Settlers
alone asks for a pop and settlement.

The realm overview lists held Ideas with rule tooltips. Rival tooltips list the same
names and sentences from the public projection. The Codex lists the pinned roster.
Bots score the legal setup choices (the untaken Ideas) through their scorer and search
purchases as ordinary legal moves. Opportunity values price future founding, upgrades, Dole savings, pieces and
votes; Step 10 supplies build preferences. Bots never read the next year card.

The first smart batch picked Slave Colonies 160 times out of 160. A score breakdown
on seeds 42, 1000 and 1001 showed a unique 34-point gain in all twelve sampled
openings: −2 from the immediate effect, plus 36 for six possible future slaves.
The future term omitted those slaves' three-point standing-level loss, worth 18
points under the existing scorer. Charging that cost lowers the gain to 16,
behind Civic Tradition and Public Dole at 24. This was scorer bias, rather than
an exact tie or evidence that the rule is stronger. The grant remains two slaves;
the other opportunity weights remain unchanged. Step 10 and Step 11 still own
personality preferences and measured balance, including Ideas that remain unused.

The five unused Ideas were Public Dole, Urban Planning, Capital Works, Harbour
Planning and Assembly Brokers. In the sampled openings Dole scored 24, the two
slot Ideas 3 each, and Harbour/Brokers 0. The setup grant also fed Slave Colonies'
holders, reducing later Dole savings. A 6-influence purchase costs 12 scorer
points: one extra slot usually falls below that, Harbour needs an existing Port,
and Brokers' three projected extra votes are worth 12 before that cost. Capital
Works also offers less scope than Urban Planning at the same price. These are
the shared scorer's current preferences; the rerun should record their spread
without requiring every Idea to be used or changing the rules to force it.

Telemetry zero-fills all twelve Ideas with setup picks, purchases, holder counts, wins and
holder win rates. Counts include capped games; win rates use finished seat-games only.
A consumed acquisition grant still belongs to its holder and counts in this denominator.
Step 13's state schema 10 and command schema 6 reject earlier saves and scripts.

## Acceptance and validation

- A focused rule test for every Idea, plus draft order, exclusivity, purchase and
  projection tests.
- Engine, shell, sim and replay use canonical commands and selectors.
- The lead's forty-game batch finishes without illegal moves, turn caps or forced turns;
  inspect Idea pick/purchase spread and holder win rates, recording unpicked Ideas.
- The draft page, purchase list, Civic fan, realm and rival tooltip fit at 1280, 1440
  and 1920; conduct stays at the baseline without focusless controls or duplicate names.

## Retirement

After shipping and validation, keep the roster in the player guide and references and
archive this plan with the shipping PR and simulation evidence.
