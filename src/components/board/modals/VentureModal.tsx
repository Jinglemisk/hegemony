import { useState } from "react";
import { AnnotatedText } from "../../AnnotatedText";
import { formatResourceCost } from "../../../ui/formatters";
import { getFundExpeditionStatus } from "../../../game/rules";
import type { VentureStake } from "../../../game/rules";
import { getExpeditionTables } from "../../../game/content";
import { presentTableEffect } from "../../../ui/effects";
import { ceremonyMood, commitVerb } from "./ceremonyMood";
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

  // What the die found, so the commit can name it. "Continue" is a navigation
  // instruction; the design's verb is the outcome — you take the gold.
  const landedRow = result
    ? resultTable.rows.find((row) => row.roll === result.modified)
    : undefined;
  const landed = landedRow?.effects.map((effect) => presentTableEffect(effect)) ?? [];
  const gain = landed.find((effect) => effect.tone === "positive");
  const mood = ceremonyMood(
    gain ? "positive" : landed.some((e) => e.tone === "negative") ? "negative" : "neutral",
  );

  return (
    <EventTableModal
      table={resultTable}
      modifier={0}
      result={result}
      subtitle={undefined}
      // The stake outlives the picker that set it: after the roll, what you
      // risked is the only thing the tablet still has to tell you about it.
      kicker={
        <>
          Venture · {G.players[playerID].name} stakes{" "}
          <AnnotatedText links={false} text={formatResourceCost(status.cost ?? {})} />
        </>
      }
      onDismiss={onClose}
      footer={
        rolled ? (
          <button className="ceremonyCommit verb verb-lg" onClick={onClose}>
            {commitVerb(mood, gain?.subject)}
          </button>
        ) : (
          <div className="tabletFootRow">
            <button className="ghostVerb verb" onClick={onClose}>
              Cancel
            </button>
            <button
              className="ceremonyCommit verb verb-lg"
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
          <div className="ceremonyPicks" role="group" aria-label="Expedition">
            {expeditionTables.map((candidate, index) => (
              <button
                aria-pressed={index === expeditionIndex}
                className={
                  index === expeditionIndex ? "ceremonyPick ceremonyPickTaken" : "ceremonyPick"
                }
                key={candidate.id}
                onClick={() => setExpeditionIndex(index)}
              >
                <strong className="title">{candidate.name}</strong>
                <span className="caption">{candidate.flavor}</span>
              </button>
            ))}
          </div>

          <div className="ceremonyPicks ventureStakeRow" role="group" aria-label="Stake">
            {(Object.keys(G.ruleset.ventureStakes) as VentureStake[]).map((candidate) => {
              const candidateStatus = getFundExpeditionStatus(G, playerID, table.id, candidate);

              return (
                <button
                  aria-pressed={candidate === stake}
                  className={
                    candidate === stake ? "ceremonyPick ceremonyPickTaken" : "ceremonyPick"
                  }
                  key={candidate}
                  onClick={() => setStake(candidate)}
                >
                  <strong className="title">
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
