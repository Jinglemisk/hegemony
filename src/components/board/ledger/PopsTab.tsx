import type { Phase } from "../../../game/controller";
import {
  POP_TYPES,
  calculateEconomyProjection,
  getDemotePopStatus,
  getPromotePopStatus,
  totalPops
} from "../../../game/rules";
import type { HegemonyState, PlayerId, PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { AtlasIcon } from "../../Sprites";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { calculatePopEconomy } from "../helpers";
import type { OwnedHolding } from "../types";

/** The social ladder's two directions per pop row (D8). */
const LADDER_MOVES: Partial<Record<PopType, Array<{ kind: "promote" | "demote"; label: string; to: string }>>> = {
  citizens: [{ kind: "demote", label: "↓", to: "freeman" }],
  freemen: [
    { kind: "promote", label: "↑", to: "citizen" },
    { kind: "demote", label: "↓", to: "slave" }
  ],
  slaves: [{ kind: "promote", label: "↑", to: "freeman" }]
};

export function PopsTab({
  G,
  holdings,
  playerID,
  isActive,
  phase,
  onPromote,
  onDemote
}: {
  G: HegemonyState;
  holdings: OwnedHolding[];
  playerID: PlayerId;
  isActive: boolean;
  phase: Phase;
  onPromote: (tileId: string, from: PopType) => void;
  onDemote: (tileId: string, from: PopType) => void;
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
          <span className="ladderControls" aria-label={`${pop} ladder moves`}>
            {(LADDER_MOVES[pop] ?? []).map((move) => {
              // One ladder move per turn (D8); the button acts on the first
              // settlement that can legally pay it and names it in the tooltip.
              const getStatus = move.kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
              const target = holdings.find(({ tile }) => getStatus(G, playerID, tile.id, pop).can);
              const status = target ? getStatus(G, playerID, target.tile.id, pop) : null;
              const costText = status?.cost
                ? Object.entries(status.cost)
                    .map(([resource, amount]) => `${amount} ${resource}`)
                    .join(", ") || "free"
                : "";

              return (
                <button
                  className="ladderButton"
                  disabled={!isActive || phase !== "gameplay" || !target}
                  key={move.kind}
                  title={
                    target
                      ? `${move.kind === "promote" ? "Promote" : "Demote"} to ${move.to} (${costText}) — ${target.tile.terrain} ${target.tile.id}`
                      : `No legal ${move.kind} right now (one ladder move per turn).`
                  }
                  onClick={() =>
                    target && (move.kind === "promote" ? onPromote(target.tile.id, pop) : onDemote(target.tile.id, pop))
                  }
                >
                  {move.label}
                </button>
              );
            })}
          </span>
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
        <span
          className={player.popsGainedFromEvents > 0 ? "popSummaryGain" : undefined}
          title="Pops gained from event cards"
        >
          Gained
          <strong>{player.popsGainedFromEvents}</strong>
        </span>
        <span
          className={player.popsLostToUnrest > 0 ? "popSummaryAlarm" : undefined}
          title="Pops lost to unrest & starvation"
        >
          Deaths
          <strong>{player.popsLostToUnrest}</strong>
        </span>
      </div>
    </div>
  );
}
