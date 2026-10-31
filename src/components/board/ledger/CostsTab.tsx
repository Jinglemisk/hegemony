import {
  getAdjustedActionCost,
  getBuildings,
  getCalmCost,
  getDemoteCost,
  getGrowPopCost,
  getPromoteCost,
} from "../../../game/rules";
import { playerDole, votePurchaseLimit } from "../../../game/ideaRules";
import type { HegemonyState, PlayerId, Resource, Resources } from "../../../game/types";
import { presentBuildingEffects } from "../../../ui/effects";
import { formatResourceCost } from "../../../ui/formatters";
import { BUILDING_RASTERS, POP_RASTERS, RESOURCE_RASTERS } from "../../../ui/iconRegistry";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { Ico } from "../../frame/parts";

type Price = Partial<Resources>;

/** One priced act: what it costs this seat now (`live`), and the ruleset's own price
 *  (`base`) it is read against. An act paid one of two ways lists both, "or". */
type CostLine = {
  id: string;
  icon: string;
  name: string;
  note: string;
  live: Price[];
  base: Price[];
};

const units = (price: Price) => RESOURCE_ORDER.reduce((sum, r) => sum + (price[r] ?? 0), 0);
const lowest = (prices: Price[]) => Math.min(...prices.map(units));
const words = (prices: Price[]) => prices.map(formatResourceCost).join(" or ");

/** Cheaper helps, dearer hurts; the same weight in another good is only a change. */
function delta({ live, base }: CostLine): "better" | "worse" | "shift" | undefined {
  if (words(live) === words(base)) return undefined;
  const now = lowest(live);
  const was = lowest(base);
  return now < was ? "better" : now > was ? "worse" : "shift";
}

function costSections(G: HegemonyState, playerID: PlayerId) {
  const R = G.ruleset;
  const dole = playerDole(G, playerID);
  const line = (row: Omit<CostLine, "base"> & { base?: Price[] }): CostLine => ({
    ...row,
    base: row.base ?? row.live,
  });

  return [
    {
      title: "Expand",
      lines: [
        line({
          id: "colony",
          icon: "settlements/colony",
          name: "Found a colony",
          note: "Takes a colony piece. Beside your land, or by sea from a coast.",
          live: [getAdjustedActionCost(G, playerID, "foundColony", R.actionCosts.foundColony)],
          base: [R.actionCosts.foundColony],
        }),
        line({
          id: "city",
          icon: "settlements/city",
          name: "Upgrade to a city",
          note: "Takes a city piece. Never beside another city.",
          live: [
            getAdjustedActionCost(
              G,
              playerID,
              "upgradeColonyToCity",
              R.actionCosts.upgradeColonyToCity,
            ),
          ],
          base: [R.actionCosts.upgradeColonyToCity],
        }),
        line({
          id: "grow-slaves",
          icon: POP_RASTERS.slaves,
          name: "Grow a slave",
          note: "In a settlement with room. One growth per settlement a turn.",
          live: [getGrowPopCost(G, playerID, "slaves")],
          base: [R.growPopCosts.slaves],
        }),
        line({
          id: "grow-freemen",
          icon: POP_RASTERS.freemen,
          name: "Grow a freeman",
          note: "In a settlement with room. Citizens are promoted, never grown.",
          live: [getGrowPopCost(G, playerID, "freemen")],
          base: [R.growPopCosts.freemen],
        }),
        line({
          id: "move",
          icon: "pops/move",
          name: "Move a pop",
          note: "Per pop. One move a turn; they arrive at your next turn.",
          live: [R.movePopCost],
        }),
      ],
    },
    {
      title: "Build",
      sub: "city or capital · one of each",
      lines: getBuildings(G.definition.content).map((building) =>
        line({
          id: building.id,
          icon: BUILDING_RASTERS[building.id],
          name: building.name,
          note: building.claimsLuxury
            ? "Claims an adjacent coastal luxury. A coastal colony may raise one too."
            : presentBuildingEffects(building.effects).text,
          live: [getAdjustedActionCost(G, playerID, "buildBuilding", building.cost, building.id)],
          base: [building.cost],
        }),
      ),
    },
    {
      title: "Civic",
      lines: [
        line({
          id: "promote-slaves",
          icon: "pops/promote",
          name: "Slave to freeman",
          note: "One ladder step a turn.",
          live: [getPromoteCost(G, playerID, "slaves")],
          base: [R.ladder.promoteCosts.slaves],
        }),
        line({
          id: "promote-freemen",
          icon: "pops/promote",
          name: "Freeman to citizen",
          note: "One ladder step a turn.",
          live: [getPromoteCost(G, playerID, "freemen")],
          base: [R.ladder.promoteCosts.freemen],
        }),
        line({
          id: "demote",
          icon: "pops/demote",
          name: "Demote one step",
          note: "Uses the turn's ladder step. Free in your own riot.",
          live: [getDemoteCost(G, playerID, "citizens")],
          base: [R.ladder.demoteCosts.citizens],
        }),
        line({
          id: "calm",
          icon: "unrest/calm-verb",
          name: "Civic calm",
          note: `+${R.civicCalm.happiness} happiness until the year turns. Once a turn.`,
          live: [getCalmCost(G, playerID, "influence"), getCalmCost(G, playerID, "gold")],
          base: [{ influence: R.civicCalm.influenceCost }, { gold: R.civicCalm.goldCost }],
        }),
        line({
          id: "dole",
          icon: "unrest/bread-dole",
          name: "The Dole",
          note: `Buys ${dole.food} food, as often as you can pay.`,
          live: [{ influence: dole.influenceCost }],
          base: [{ influence: R.dole.influenceCost }],
        }),
        line({
          id: "venture",
          icon: "events/venture",
          name: "Fund an expedition",
          note: "Roll on an expedition table. Once a turn.",
          live: [R.ventureCost],
        }),
        line({
          id: "idea",
          icon: "assembly/national-idea",
          name: "Buy an Idea",
          note: "A National Idea after your setup pick.",
          live: [{ influence: R.ideas.influenceCost }],
        }),
      ],
    },
    {
      title: "Assembly",
      sub: "at a sitting",
      lines: [
        line({
          id: "draw",
          icon: "assembly/propose",
          name: "Draw and propose",
          note: "Draw a politician's card and put it to the vote.",
          live: [{ influence: R.assembly.drawCost }],
        }),
        line({
          id: "repeal",
          icon: "assembly/repeal",
          name: "Propose a repeal",
          note: "Put a standing Law on the ballot.",
          live: [{ influence: R.assembly.repealCost }],
        }),
        line({
          id: "bribe",
          icon: "assembly/bribe",
          name: "Buy a vote",
          note: `Per vote, at most ${votePurchaseLimit(G, playerID)} a sitting.`,
          live: [{ gold: R.assembly.briberyCost }, { influence: R.assembly.briberyCost }],
        }),
      ],
    },
  ];
}

/** A price as Catan prints it: one icon per unit, so weight reads at a glance. */
function Pips({ prices }: { prices: Price[] }) {
  return (
    <span aria-label={words(prices)} className="cost-pips" role="img">
      {prices.map((price, i) => {
        const shown = RESOURCE_ORDER.filter((r) => (price[r] ?? 0) > 0);
        return (
          <span className="cost-option" key={i}>
            {i > 0 ? <span className="cost-or">or</span> : null}
            {shown.length === 0 ? <span className="cost-free caps">Free</span> : null}
            {shown.map((resource: Resource) => (
              <span className="cost-res" key={resource}>
                {Array.from({ length: price[resource] ?? 0 }, (_, k) => (
                  <Ico key={k} path={RESOURCE_RASTERS[resource]} size="chip" />
                ))}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The cost card: every priced act on one page, Catan-style. Prices are the seat's
 * own, read from the engine's cost helpers, so a standing Law or an Idea that
 * reprices an act shows here; such a line is marked, and its tooltip gives the
 * ruleset's price.
 */
export function CostsTab({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  return (
    <div className="costsPage" data-c="costs">
      {costSections(G, playerID).map((section) => (
        <section className="cost-section" key={section.title}>
          <h3 className="cost-head">
            <span className="caps">{section.title}</span>
            {section.sub ? <span className="cost-sub">{section.sub}</span> : null}
          </h3>
          {section.lines.map((l) => {
            const mark = delta(l);
            return (
              <div
                className="cost-line"
                data-delta={mark}
                key={l.id}
                title={
                  mark
                    ? `${l.note}\nA Law or Idea changed it; base price ${words(l.base)}.`
                    : l.note
                }
              >
                <Ico path={l.icon} size="ui" />
                <span className="cost-name">{l.name}</span>
                <Pips prices={l.live} />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
