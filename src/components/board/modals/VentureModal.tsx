import { useState } from "react";
import { AnnotatedText } from "../../AnnotatedText";
import { RESOURCE_LABELS } from "../../../ui/formatters";
import type { GameMoves } from "../../../game/controller";
import { getFundExpeditionStatus } from "../../../game/rules";
import type { VentureStake } from "../../../game/rules";
import { EXPEDITION_TABLES } from "../../../game/data";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { EventTableModal } from "./EventTableModal";
import { useGameUi } from "../GameUiContext";

/**
 * The venture instance of the shared event-table modal (D10/Q16): pick an
 * expedition, post a stake, roll. One venture per turn; the stake is spent win
 * or lose — rows 1–2 ARE "stake lost".
 */
export function VentureModal({
  onClose
}: {
  onClose: () => void;
}) {
  const { G, viewerId: playerID, isActive, moves } = useGameUi();
  const [expeditionIndex, setExpeditionIndex] = useState(0);
  const [stake, setStake] = useState<VentureStake>("gold");
  const [rolled, setRolled] = useState(false);

  const table = EXPEDITION_TABLES[expeditionIndex];
  const status = getFundExpeditionStatus(G, playerID, table.id, stake);
  const result = rolled && G.lastTableRoll?.playerID === playerID ? G.lastTableRoll : null;
  const resultTable = result ? (EXPEDITION_TABLES.find((candidate) => candidate.id === result.tableId) ?? table) : table;

  return (
    <EventTableModal
      table={resultTable}
      modifier={0}
      result={result}
      subtitle={rolled ? undefined : "Stake it, sail, and let the table speak — one venture per turn."}
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
            {EXPEDITION_TABLES.map((candidate, index) => (
              <button
                className={index === expeditionIndex ? "eventChoiceButton selectedChoice" : "eventChoiceButton"}
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
              const cost = G.ruleset.ventureStakes[candidate];
              const label = Object.entries(cost)
                .map(([resource, amount]) => `-${amount} ${RESOURCE_LABELS[resource as keyof typeof RESOURCE_LABELS] ?? resource}`)
                .join(" + ");

              return (
                <button
                  className={candidate === stake ? "eventChoiceButton selectedChoice" : "eventChoiceButton"}
                  key={candidate}
                  onClick={() => setStake(candidate)}
                >
                  <strong>
                    Stake · <AnnotatedText text={label} />
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
