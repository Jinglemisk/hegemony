import { useMemo, useState } from "react";
import type { GameMoves } from "../../../game/controller";
import { DEMOTE_FROM, getBuyRiotInsuranceStatus, getDemotePopStatus } from "../../../game/rules";
import { RIOT_TABLE } from "../../../game/data";
import type { HegemonyState, PlayerId, PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { EventTableModal } from "./EventTableModal";
import { capitalize } from "../helpers";

/**
 * The riot instance of the shared event-table modal (D9). Blocking: it mounts while
 * `G.pendingRiot` stands (income is deferred, endTurn illegal) and stays up one more
 * beat after the roll so the outcome can be read — the parent owns that via
 * `resultOpen` / `onDismissResult`.
 */
export function RiotModal({
  G,
  playerID,
  isActive,
  moves,
  onRolled,
  onDismissResult
}: {
  G: HegemonyState;
  playerID: PlayerId;
  isActive: boolean;
  moves: GameMoves;
  onRolled: () => void;
  onDismissResult: () => void;
}) {
  const pending = G.pendingRiot;
  const severe = pending?.tier === "revolt";
  const tierModifier = severe ? G.ruleset.economy.unrest.severeRollModifier : 0;
  const modifier = (pending?.boughtInsurance.length ?? 0) + tierModifier;

  // Concession targets: every owned settlement × demotable pop with a body to spare.
  const demoteTargets = useMemo(() => {
    if (!pending) {
      return [];
    }

    return G.players[playerID].settlements.flatMap((tileId) =>
      DEMOTE_FROM.filter((from) => getDemotePopStatus(G, playerID, tileId, from).can).map((from) => ({
        tileId,
        from: from as PopType
      }))
    );
  }, [G, playerID, pending]);
  const [demoteChoice, setDemoteChoice] = useState(0);

  const result = !pending && G.lastTableRoll?.tableId === "riot" ? G.lastTableRoll : null;

  return (
    <EventTableModal
      table={RIOT_TABLE}
      modifier={modifier}
      result={result}
      subtitle={
        severe
          ? `${G.players[playerID].name} faces a REVOLT — roll at ${tierModifier}, pop losses doubled, happiness rebounds to ${G.ruleset.economy.unrest.severeRebound}.`
          : `${G.players[playerID].name} faces a riot. Income waits until the table has spoken.`
      }
      footer={
        pending ? (
          <button className="primaryButton eventResolveButton" disabled={!isActive} onClick={() => (onRolled(), moves.resolveRiot())}>
            Roll the Die
          </button>
        ) : (
          <button className="primaryButton eventResolveButton" onClick={onDismissResult}>
            Continue
          </button>
        )
      }
    >
      {pending ? (
        <div className="riotInsuranceStack" role="group" aria-label="Riot insurance">
          <strong className="riotInsuranceTitle">Declare before the die — each once, +1 to the roll</strong>
          {(RIOT_TABLE.insurance ?? []).map((option) => {
            const bought = pending.boughtInsurance.includes(option.id);
            const status = getBuyRiotInsuranceStatus(G, playerID, option.id);
            const costText = option.demotesPop
              ? "demote 1 pop (free — the mob demands it)"
              : Object.entries(option.cost)
                  .map(([resource, amount]) => `${amount} ${resource}`)
                  .join(", ");

            if (option.demotesPop && !bought) {
              const target = demoteTargets[Math.min(demoteChoice, Math.max(0, demoteTargets.length - 1))];

              return (
                <div className="riotInsuranceRow" key={option.id}>
                  <button
                    className="eventChoiceButton"
                    disabled={!isActive || !status.can || demoteTargets.length === 0}
                    onClick={() => target && moves.buyRiotInsurance(option.id, target)}
                  >
                    <strong>{option.label}</strong>
                    <span>{costText}</span>
                  </button>
                  <select
                    aria-label="Pop to demote"
                    disabled={demoteTargets.length === 0}
                    value={demoteChoice}
                    onChange={(event) => setDemoteChoice(Number(event.target.value))}
                  >
                    {demoteTargets.map((candidate, index) => (
                      <option key={`${candidate.tileId}-${candidate.from}`} value={index}>
                        {capitalize(formatPopLabel(candidate.from, 1))} · {candidate.tileId}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <button
                className={bought ? "eventChoiceButton selectedChoice" : "eventChoiceButton"}
                disabled={bought || !isActive || !status.can}
                key={option.id}
                onClick={() => moves.buyRiotInsurance(option.id)}
              >
                <strong>
                  {option.label}
                  {bought ? " — declared" : ""}
                </strong>
                <span>{costText}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </EventTableModal>
  );
}
