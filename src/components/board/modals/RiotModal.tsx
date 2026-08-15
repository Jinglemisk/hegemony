import { useMemo, useState } from "react";
import {
  DEMOTE_FROM,
  getBuyRiotInsuranceStatus,
  getDemotePopStatus,
  getTile,
  insuranceRollBonus,
} from "../../../game/rules";
import { getRiotTable } from "../../../game/content";
import type { PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { presentTableEffect } from "../../../ui/effects";
import { AnnotatedText } from "../../AnnotatedText";
import { ceremonyMood, commitVerb } from "./ceremonyMood";
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
  onDismissResult,
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
  const riotTable = getRiotTable(G.definition.content);
  const severe = pending?.tier === "revolt";
  const tierModifier = severe ? G.ruleset.economy.unrest.severeRollModifier : 0;
  const modifier =
    insuranceRollBonus(pending?.boughtInsurance ?? [], G.definition.content) + tierModifier;

  // Concession targets: every owned settlement × demotable pop with a body to spare.
  const demoteTargets = useMemo(() => {
    if (!pending) {
      return [];
    }

    return G.players[playerID].settlements.flatMap((tileId) =>
      DEMOTE_FROM.filter((from) => getDemotePopStatus(G, playerID, tileId, from).can).map(
        (from) => ({
          tileId,
          from: from as PopType,
        }),
      ),
    );
  }, [G, playerID, pending]);
  const [demoteChoice, setDemoteChoice] = useState(0);

  const result = !pending && G.lastTableRoll?.tableId === "riot" ? G.lastTableRoll : null;
  // The verb is the outcome, and it comes from the shared mood map rather than
  // the word "Continue" — a riot is something you endure, not something you
  // navigate past.
  const landed = result
    ? (riotTable.rows
        .find((row) => row.roll === result.modified)
        ?.effects.map((effect) => presentTableEffect(effect)) ?? [])
    : [];
  const gain = landed.find((effect) => effect.tone === "positive");
  const mood = ceremonyMood(
    gain
      ? "positive"
      : landed.some((effect) => effect.tone === "negative")
        ? "negative"
        : "neutral",
  );

  return (
    <EventTableModal
      table={riotTable}
      modifier={modifier}
      result={result}
      subtitle={
        severe
          ? `${G.players[playerID].name} faces a REVOLT — roll at ${tierModifier}, pop losses doubled, happiness rebounds to ${G.ruleset.economy.unrest.severeRebound}.`
          : `${G.players[playerID].name} faces a riot. Income waits until the table has spoken.`
      }
      footer={
        pending ? (
          <button
            className="ceremonyCommit verb verb-lg"
            disabled={!isActive}
            onClick={() => (onRolled(), moves.resolveRiot())}
          >
            Roll the Die
          </button>
        ) : (
          <button className="ceremonyCommit verb verb-lg" onClick={onDismissResult}>
            {commitVerb(mood, gain?.subject)}
          </button>
        )
      }
    >
      {pending ? (
        <div className="riotInsuranceStack" role="group" aria-label="Riot insurance">
          <strong className="label">Before the die</strong>
          {(riotTable.insurance ?? []).map((option) => {
            const bought = pending.boughtInsurance.includes(option.id);
            const status = getBuyRiotInsuranceStatus(G, playerID, option.id);
            const costText = option.demotesPop
              ? "demote 1 pop (free — the mob demands it)"
              : Object.entries(option.cost)
                  .map(([resource, amount]) => `-${amount} ${resource}`)
                  .join(", ");

            if (option.demotesPop && !bought) {
              const target =
                demoteTargets[Math.min(demoteChoice, Math.max(0, demoteTargets.length - 1))];

              return (
                <div className="riotInsuranceRow" key={option.id}>
                  <button
                    className="ceremonyPick"
                    disabled={!isActive || !status.can || demoteTargets.length === 0}
                    onClick={() => target && moves.buyRiotInsurance(option.id, target)}
                  >
                    <strong className="title">{option.label}</strong>
                    <span className="caption">
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
                      const where = tile
                        ? settlementPickerLabel(G, tile, playerID)
                        : candidate.tileId;

                      return {
                        value: String(index),
                        icon: candidate.from,
                        title: capitalize(formatPopLabel(candidate.from, 1)),
                        detail: where,
                        label: `Demote a ${formatPopLabel(candidate.from, 1)} in ${where}.`,
                      };
                    })}
                    value={String(Math.min(demoteChoice, Math.max(0, demoteTargets.length - 1)))}
                  />
                </div>
              );
            }

            return (
              <button
                className={bought ? "ceremonyPick ceremonyPickTaken" : "ceremonyPick"}
                disabled={bought || !isActive || !status.can}
                key={option.id}
                onClick={() => moves.buyRiotInsurance(option.id)}
              >
                <strong className="title">
                  {option.label}
                  {bought ? " — declared" : ""}
                </strong>
                <span className="caption">
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
