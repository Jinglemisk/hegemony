import type { HegemonyState, PlayerId } from "../game/types";
import { playerPopulationTotals } from "../game/rules";

export function PlayerHoldingsSummary({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const player = G.players[playerID];
  const population = playerPopulationTotals(G, playerID);
  const overCapacity = Math.max(0, population.pops - population.capacity);
  const inTransit = G.transfers
    .filter((transfer) => transfer.owner === playerID)
    .reduce((total, transfer) => total + transfer.pops.citizens + transfer.pops.freemen + transfer.pops.slaves, 0);

  return (
    <section className="holdingsSummary" aria-label={`${player.name} holdings`}>
      <div className="holdingsStats">
        <span>
          Sites <strong>{player.settlements.length}</strong>
        </span>
        <span>
          Pops{" "}
          <strong className={overCapacity > 0 ? "overCapacityText" : undefined}>
            {population.pops}/{population.capacity}
          </strong>
        </span>
        <span>
          Transit <strong>{inTransit}</strong>
        </span>
      </div>
      <p className="incomePreview">
        Income is collected automatically at the start of each gameplay turn.
      </p>
    </section>
  );
}
