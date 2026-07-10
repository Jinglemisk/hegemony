import { POP_TYPES, calculateEconomyProjection, totalPops } from "../../../game/rules";
import type { HegemonyState, PlayerId, PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { AtlasIcon } from "../../Sprites";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { calculatePopEconomy } from "../helpers";
import type { OwnedHolding } from "../types";

export function PopsTab({
  G,
  holdings,
  playerID
}: {
  G: HegemonyState;
  holdings: OwnedHolding[];
  playerID: PlayerId;
}) {
  const player = G.players[playerID];
  const economyByPop = calculatePopEconomy(holdings);
  const projection = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  const inTransit = G.transfers
    .filter((transfer) => transfer.owner === playerID)
    .reduce((total, transfer) => total + totalPops(transfer.pops), 0);
  const totals = POP_TYPES.reduce(
    (counts, pop) => ({
      ...counts,
      [pop]: holdings.reduce((total, { settlement }) => total + settlement.pops[pop], 0)
    }),
    { citizens: 0, freemen: 0, slaves: 0 } as Record<PopType, number>
  );

  return (
    <div className="popsLedger">
      {POP_TYPES.map((pop) => (
        <section className="popEconomyRow" key={pop}>
          <div className="popEconomyLead">
            <AtlasIcon icon={pop} className="buildingButtonIcon" />
            <span>
              <strong>{formatPopLabel(pop, totals[pop])}</strong>
              <em>{totals[pop]} total</em>
            </span>
          </div>
          <ResourceDeltaList resources={economyByPop[pop]} />
        </section>
      ))}

      <section className="netEconomyPanel">
        <strong>Projected Net Income</strong>
        <ResourceDeltaList resources={projection.income} />
      </section>

      <div className="popSummaryGrid">
        <span>
          Grown
          <strong>{player.grownSettlementsThisTurn.length}</strong>
        </span>
        <span>
          In Transit
          <strong>{inTransit}</strong>
        </span>
        <span>
          Event Cards
          <strong>{G.playerDrawPile.length}</strong>
        </span>
        <span className={player.popsLostToUnrest > 0 ? "popSummaryAlarm" : undefined}>
          Deaths
          <strong>{player.popsLostToUnrest}</strong>
        </span>
      </div>
    </div>
  );
}
