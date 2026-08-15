import { useState } from "react";
import { AnnotatedText } from "../../AnnotatedText";
import { formatResourceCost } from "../../../ui/formatters";
import { getFundExpeditionStatus } from "../../../game/rules";
import type { VentureStake } from "../../../game/rules";
import { getExpeditionTables } from "../../../game/content";
import { EventTableModal } from "./EventTableModal";
import { useGameUi } from "../GameUiContext";

/**
 * The venture instance of the shared event-table modal (D10/Q16): pick an
 * expedition, post a stake, roll. One venture per turn; the stake is spent win
 * or lose — rows 1–2 ARE "stake lost".
 */
export function VentureModal({ onClose }: { onClose: () => void }) {
  const { G, viewerId: playerID, isActive, moves } = useGameUi();
  const [expeditionIndex, setExpeditionIndex] = useState(0);
  const [stake, setStake] = useState<VentureStake>("gold");
  const [rolled, setRolled] = useState(false);

  const expeditionTables = getExpeditionTables(G.definition.content);
  const table = expeditionTables[expeditionIndex];
  const status = getFundExpeditionStatus(G, playerID, table.id, stake);
  const result = rolled && G.lastTableRoll?.playerID === playerID ? G.lastTableRoll : null;
  const resultTable = result
    ? (expeditionTables.find((candidate) => candidate.id === result.tableId) ?? table)
    : table;

  return (
    <EventTableModal
      table={resultTable}
      modifier={0}
      result={result}
      subtitle={undefined}
      onDismiss={onClose}
      footer={
        rolled ? (
          <button className="primaryButton eventResolveButton" onClick={onClose}>
            Continue
          </button>
        ) : (
          <div className="eventTableFooterRow">
            <button className="ghostButton" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primaryButton eventResolveButton"
              disabled={!isActive || !status.can}
              title={status.reasons.join(" ") || undefined}
              onClick={() => {
                setRolled(true);
                moves.fundExpedition(table.id, stake);
              }}
            >
              Fund &amp; Roll
            </button>
          </div>
        )
      }
    >
      {!rolled ? (
        <div className="ventureControls">
          <div className="eventChoiceStack" role="group" aria-label="Expedition">
            {expeditionTables.map((candidate, index) => (
              <button
                className={
                  index === expeditionIndex
                    ? "eventChoiceButton selectedChoice"
                    : "eventChoiceButton"
                }
                key={candidate.id}
                onClick={() => setExpeditionIndex(index)}
              >
                <strong>{candidate.name}</strong>
                <span>{candidate.flavor}</span>
              </button>
            ))}
          </div>

          <div className="ventureStakeRow" role="group" aria-label="Stake">
            {(Object.keys(G.ruleset.ventureStakes) as VentureStake[]).map((candidate) => {
              const candidateStatus = getFundExpeditionStatus(G, playerID, table.id, candidate);

              return (
                <button
                  className={
                    candidate === stake ? "eventChoiceButton selectedChoice" : "eventChoiceButton"
                  }
                  key={candidate}
                  onClick={() => setStake(candidate)}
                >
                  <strong>
                    Stake · <AnnotatedText text={formatResourceCost(candidateStatus.cost ?? {})} />
                  </strong>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </EventTableModal>
  );
}
