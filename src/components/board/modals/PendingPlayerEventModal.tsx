import { useEffect, useState } from "react";
import type { GameMoves } from "../../../game/controller";
import { getAddPopsEffect, getEventEffectChoices, getEventPopTargetTileIds, getTile } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { AnnotatedText } from "../../AnnotatedText";
import { eventCardArtUrl, formatEventEffects } from "../events";
import { settlementPickerLabel } from "../helpers";
import { ModalShell } from "./ModalShell";
import { useGameUi } from "../GameUiContext";
import { TileListbox } from "../TileListbox";

export function PendingPlayerEventModal() {
  const { G, currentPlayerId, isActive: viewerCanAct, moves } = useGameUi();
  const pending = G.pendingPlayerEvent;
  // The card belongs to the seat that drew it. Deriving the owner here (rather than
  // taking it as a prop) keeps "who may resolve this" in one place.
  const playerID = pending?.playerID ?? currentPlayerId;
  const isActive = viewerCanAct && playerID === currentPlayerId;
  const card = pending?.card;
  const choices = card ? getEventEffectChoices(card) : [];
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(0);
  const selectedEffects = choices[selectedChoiceIndex] ?? choices[0] ?? [];
  const popEffect = getAddPopsEffect(selectedEffects);
  const targetTileIds = popEffect ? getEventPopTargetTileIds(G, playerID, popEffect) : [];
  const [targetTileId, setTargetTileId] = useState(targetTileIds[0] ?? "");

  useEffect(() => {
    setSelectedChoiceIndex(0);
    setTargetTileId("");
  }, [card?.id]);

  useEffect(() => {
    if (!popEffect) {
      setTargetTileId("");
      return;
    }

    if (!targetTileIds.includes(targetTileId)) {
      setTargetTileId(targetTileIds[0] ?? "");
    }
  }, [popEffect, targetTileId, targetTileIds]);

  if (!pending || !card) {
    return null;
  }

  const canConfirm = isActive && (!popEffect || targetTileIds.length > 0);
  const actionLabel = choices.length > 1 ? "Resolve Choice" : popEffect ? "Place Pops" : "Claim Event";

  return (
    // Blocking on purpose: a drawn event must be resolved, never dismissed.
    <ModalShell backdropClassName="eventModalBackdrop" className="eventCardReveal" labelledBy="pending-event-title">
        <div className="eventCardSurface">
          <div className="eventCardCrest">
            <span>Player Event</span>
            <b>{G.players[playerID].name}</b>
          </div>

          <div className="eventCardArtFrame">
            <img alt={`${card.name} card art`} src={eventCardArtUrl(card)} />
          </div>

          <div className="eventCardBody">
            <span className="eventCardDeckLabel">Hegemony Event</span>
            <h2 id="pending-event-title">{card.name}</h2>
            <p>
              <AnnotatedText text={card.text} />
            </p>

            {choices.length > 1 ? (
              <div className="eventChoiceStack" role="group" aria-label="Event choices">
                {choices.map((effects, index) => {
                  const optionPopEffect = getAddPopsEffect(effects);
                  const disabled = Boolean(optionPopEffect && getEventPopTargetTileIds(G, playerID, optionPopEffect).length === 0);

                  return (
                    <button
                      className={index === selectedChoiceIndex ? "selectedChoice eventChoiceButton" : "eventChoiceButton"}
                      disabled={disabled}
                      key={`${card.id}-${index}`}
                      onClick={() => setSelectedChoiceIndex(index)}
                    >
                      <strong>Option {index + 1}</strong>
                      <span>
                        <AnnotatedText text={formatEventEffects(effects)} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="eventSingleEffect">
                <strong>Effect</strong>
                <span>
                  <AnnotatedText text={formatEventEffects(selectedEffects)} />
                </span>
              </div>
            )}

            {popEffect ? (
              <div className="fieldGroup eventTargetField">
                <span>Settlement target</span>
                {/* A list, not the map: this dialog blocks by design (a drawn card
                    must be resolved), so the board behind it cannot be the picker
                    — exactly scope 4's carve-out. */}
                <TileListbox
                  ariaLabel="Settlement target"
                  onChange={setTargetTileId}
                  options={targetTileIds.map((tileId) => {
                    const tile = getTile(G, tileId);
                    const where = tile ? settlementPickerLabel(G, tile, playerID) : tileId;

                    return {
                      value: tileId,
                      icon: tile?.settlements.some((s) => s.owner === playerID && s.kind !== "colony")
                        ? ("city" as const)
                        : ("colony" as const),
                      title: where,
                      label: `Place the pops in ${where}.`
                    };
                  })}
                  value={targetTileId || null}
                />
                {targetTileIds.length === 0 ? <em>No owned settlement has enough capacity for this option.</em> : null}
              </div>
            ) : null}

            {!isActive ? (
              <div className="selectionSummary negative">
                <span>Only the active player can resolve this event.</span>
              </div>
            ) : null}
          </div>

          <div className="eventCardFooter">
            <button
              className="primaryButton eventResolveButton"
              disabled={!canConfirm}
              onClick={() => moves.resolvePendingPlayerEvent(popEffect ? targetTileId : undefined, selectedChoiceIndex)}
            >
              {actionLabel}
            </button>
          </div>
        </div>
    </ModalShell>
  );
}
