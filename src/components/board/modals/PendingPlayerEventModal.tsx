import { useEffect, useState } from "react";
import type { GameMoves } from "../../../game/controller";
import { getAddPopsEffect, getEventEffectChoices, getEventPopTargetTileIds } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { AnnotatedText } from "../../AnnotatedText";
import { eventCardArtUrl, formatEventEffects } from "../events";
import { capitalize } from "../helpers";

export function PendingPlayerEventModal({
  G,
  playerID,
  isActive,
  moves
}: {
  G: HegemonyState;
  playerID: PlayerId;
  isActive: boolean;
  moves: GameMoves;
}) {
  const pending = G.pendingPlayerEvent;
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
    <div className="modalBackdrop eventModalBackdrop" role="presentation">
      <section className="eventCardReveal" role="dialog" aria-modal="true" aria-labelledby="pending-event-title">
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
              <label className="fieldGroup eventTargetField">
                <span>Settlement target</span>
                <select value={targetTileId} onChange={(event) => setTargetTileId(event.target.value)}>
                  {targetTileIds.map((tileId) => {
                    const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
                    const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

                    return (
                      <option value={tileId} key={tileId}>
                        {tile ? `${capitalize(settlement?.kind ?? "settlement")} ${tile.id} - ${capitalize(tile.terrain)}` : tileId}
                      </option>
                    );
                  })}
                </select>
                {targetTileIds.length === 0 ? <em>No owned settlement has enough capacity for this option.</em> : null}
              </label>
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
      </section>
    </div>
  );
}
