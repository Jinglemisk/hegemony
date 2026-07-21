import { useMemo, useState } from "react";
import { DEMOTE_FROM, getBuyRiotInsuranceStatus, getDemotePopStatus, getTile, insuranceRollBonus } from "../../../game/rules";
import { RIOT_TABLE } from "../../../game/data";
import type { PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { AnnotatedText } from "../../AnnotatedText";
import { EventTableModal } from "./EventTableModal";
import { capitalize, settlementPickerLabel } from "../helpers";
import { useGameUi } from "../GameUiContext";
import { TileListbox } from "../TileListbox";

/**
 * The riot instance of the shared event-table modal (D9). Blocking: it mounts while
 * `G.pendingRiot` stands (income is deferred, endTurn illegal) and stays up one more
 * beat after the roll so the outcome can be read — the parent owns that via
 * `resultOpen` / `onDismissResult`.
 */
export function RiotModal({
  onRolled,
  onDismissResult
}: {
  onRolled: () => void;
  onDismissResult: () => void;
}) {
  const { G, currentPlayerId, isActive: viewerCanAct, moves } = useGameUi();
  // A riot belongs to the seat that triggered it, not to whoever is being viewed —
  // so this modal derives its own owner and its own right-to-act rather than taking
  // the viewer's. Falls back to the current seat for the result beat, after
  // `pendingRiot` has already cleared.
  const playerID = G.pendingRiot?.playerID ?? currentPlayerId;
  const isActive = viewerCanAct && playerID === currentPlayerId;
  const pending = G.pendingRiot;
  const severe = pending?.tier === "revolt";
  const tierModifier = severe ? G.ruleset.economy.unrest.severeRollModifier : 0;
  const modifier = insuranceRollBonus(pending?.boughtInsurance ?? []) + tierModifier;

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
                  .map(([resource, amount]) => `-${amount} ${resource}`)
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
                    <span>
                      <AnnotatedText text={costText} />
                    </span>
                  </button>
                  {/* The one place a list genuinely beats the map (scope 4): the
                      riot blocks by design (Q15), so the board it covers cannot
                      be the picker. */}
                  <TileListbox
                    ariaLabel="Pop to demote"
                    className="riotConcessionList"
                    onChange={(value) => setDemoteChoice(Number(value))}
                    options={demoteTargets.map((candidate, index) => {
                      const tile = getTile(G, candidate.tileId);
                      const where = tile ? settlementPickerLabel(G, tile, playerID) : candidate.tileId;

                      return {
                        value: String(index),
                        icon: candidate.from,
                        title: capitalize(formatPopLabel(candidate.from, 1)),
                        detail: where,
                        label: `Demote a ${formatPopLabel(candidate.from, 1)} in ${where}.`
                      };
                    })}
                    value={String(Math.min(demoteChoice, Math.max(0, demoteTargets.length - 1)))}
                  />
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
                <span>
                  <AnnotatedText text={costText} />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </EventTableModal>
  );
}
