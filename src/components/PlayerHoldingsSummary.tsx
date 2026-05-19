import type { HegemonyState, PlayerId } from "../game/types";
import { calculateIncome } from "../game/rules";
import { formatResourceDelta } from "../ui/formatters";
import { ResourceGrid } from "./ResourceGrid";

export function PlayerHoldingsSummary({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const player = G.players[playerID];
  const projectedIncome = calculateIncome(G, playerID);

  return (
    <section className="holdingsSummary" aria-label={`${player.name} resources and income`}>
      <div className="holdingsStats">
        <span>
          Sites <strong>{player.settlements.length}</strong>
        </span>
        <span>
          Income <strong>{player.collectedThisTurn ? "done" : "open"}</strong>
        </span>
      </div>
      <ResourceGrid resources={player.resources} />
      <div className="incomePreview">
        <span>Next income</span>
        <strong>{formatResourceDelta(projectedIncome)}</strong>
      </div>
    </section>
  );
}
