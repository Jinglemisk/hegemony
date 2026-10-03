---
status: active
phase: "v2"
updated: 2026-10-03
---

# National Ideas

## Outcome

Each seat picks one permanent Idea after placement and buys one more for 6 influence
during play. Ideas are public once setup choices reveal. Different seats may hold the
same Idea; a seat cannot take an Idea twice or replace one it holds.

Step 9 is implemented in the working tree. The lead still runs the forty-game batch,
the browser audits and the shell gate before shipping. Step 13 owns the setup ceremony;
Step 10 adds personality weights and Step 11 measures the pick spread.

## Settled inputs

- The migration's [Settled inputs](v2-migration.md#settled-inputs) override the
  [direction paper](../reports/balance/2026-09-05-shallow-economy.md).
- One simultaneous secret pick after placement, with effect before Year 1; one later
  purchase with influence. Two Ideas total, no draft or exclusive ownership.
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

| Axis             | Required behavior and evidence                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Engine / backend | Pinned rules, private setup picks, paid purchase and public ownership; twelve focused rule tests. |
| Frontend         | Plain picker in setup and Civic, realm names and rival rules from the player projection.          |
| Simulation & AI  | Legal picks and purchases through the scorer; per-Idea route counts and holder wins.              |

## Shell and simulation

Normal browser auto-placement stops for a human Idea choice; bot and Assembly shortcuts
score the choices. The setup picker is a flat two-column list of full sentences; choices stay secret until
all seats lock, then reveal and apply together before the first year card. During play,
**Ideas** in Civic opens the same list beside Calm with influence and the Dole. A purchase
closes it. New Settlers alone asks for a pop and settlement. No new verb disc.

The realm overview lists held Ideas with rule tooltips. Rival tooltips list the same
names and sentences from the public projection. The Codex lists the pinned roster.
Bots score legal setup choices through the master scorer and search purchases as ordinary
legal moves. Opportunity values price future founding, upgrades, Dole savings, pieces and
votes; Step 10 supplies build preferences. Bots never read the next year card.

Telemetry zero-fills all twelve Ideas with setup picks, purchases, holder counts, wins and
holder win rates. Counts include capped games; win rates use finished seat-games only.
A consumed acquisition grant still belongs to its holder and counts in this denominator.
State schema 9 and command schema 5 reject earlier saves and scripts.

## Acceptance and validation

- A focused rule test for every Idea, plus secrecy, purchase and projection tests.
- Engine, shell, sim and replay use canonical commands and selectors.
- The lead's forty-game batch finishes without illegal moves, turn caps or forced turns;
  inspect Idea pick/purchase spread and holder win rates, recording unpicked Ideas.
- The picker, Civic fan, realm and rival tooltip fit at 1280, 1440 and 1920; conduct
  stays at the 25-row baseline without focusless controls or duplicate names.

## Retirement

After shipping and validation, keep the roster in the player guide and references and
archive this plan with the shipping PR and simulation evidence.
