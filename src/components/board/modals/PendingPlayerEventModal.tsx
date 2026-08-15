import { useEffect, useMemo, useState } from "react";
import {
  getAddPopsEffect,
  getEventEffectChoices,
  getEventPopTargetTileIds,
  getTile,
} from "../../../game/rules";
import { presentEventEffects } from "../../../ui/effects";
import { PLAYER_GLAZES, glazeOf } from "../../../ui/playerGlazes";
import { AnnotatedText } from "../../AnnotatedText";
import { EffectLine } from "../../EffectLine";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { eventCardArtUrl } from "../events";
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
  const targetTileIds = useMemo(
    () => (popEffect ? getEventPopTargetTileIds(G, playerID, popEffect) : []),
    [G, playerID, popEffect],
  );
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
  // The mood decides the frame AND the verb. A card that hurts you should not ask
  // to be "claimed" — you endure it. This is the whole of the ceremony dial: one
  // word and one colour, read off the effects the engine already presented.
  const tone = presentEventEffects(selectedEffects, G.definition.content).tone;
  const ceremony = tone === "negative" ? "wound" : tone === "positive" ? "gift" : "rite";
  const moodVerb = tone === "negative" ? "Endure It" : tone === "positive" ? "Take It" : "So Be It";
  const actionLabel = choices.length > 1 ? "Resolve Choice" : popEffect ? "Place Pops" : moodVerb;

  return (
    // Blocking on purpose: a drawn event must be resolved, never dismissed.
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony={ceremony}
      className="eventCardReveal"
      labelledBy="pending-event-title"
    >
      <div className="eventCardSurface">
        <div className="eventCardCrest">
          <span className="seatGlaze label" style={{ background: glazeOf(playerID) }}>
            {PLAYER_GLAZES[playerID].blazon}
          </span>
          <b className="label">{G.players[playerID].name} draws</b>
        </div>

        <div className="eventCardArtFrame">
          <img alt={`${card.name} card art`} src={eventCardArtUrl(card)} />
        </div>

        <div className="eventCardBody">
          <span className="eventCardDeckLabel label">
            {tone === "negative" ? "A dark fate" : tone === "positive" ? "A kind wind" : "A fate"}
          </span>
          <h2 className="display" id="pending-event-title">
            {card.name}
          </h2>
          <p className="body-em">
            <AnnotatedText text={card.text} />
          </p>

          {choices.length > 1 ? (
            <div className="eventChoiceStack" role="group" aria-label="Event choices">
              {choices.map((effects, index) => {
                const optionPopEffect = getAddPopsEffect(effects);
                const disabled = Boolean(
                  optionPopEffect &&
                  getEventPopTargetTileIds(G, playerID, optionPopEffect).length === 0,
                );

                return (
                  <button
                    className={
                      index === selectedChoiceIndex
                        ? "selectedChoice eventChoiceButton"
                        : "eventChoiceButton"
                    }
                    disabled={disabled}
                    key={`${card.id}-${index}`}
                    onClick={() => setSelectedChoiceIndex(index)}
                  >
                    <strong>Option {index + 1}</strong>
                    <span>
                      <EffectLine effect={presentEventEffects(effects, G.definition.content)} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            // The blow: one band, the effect's own glyph, and the sentence with
            // its signed numbers already coloured. A card does ONE thing to you,
            // and this is where the eye lands.
            <div className="blow">
              {selectedEffects.length > 0 ? (
                <EffectIcon effect={selectedEffects[0]} family="event" size="rail" />
              ) : null}
              <EffectLine
                className="blowLine"
                effect={presentEventEffects(selectedEffects, G.definition.content)}
              />
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
                    label: `Place the pops in ${where}.`,
                  };
                })}
                value={targetTileId || null}
              />
              {targetTileIds.length === 0 ? (
                <em>No owned settlement has enough capacity for this option.</em>
              ) : null}
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
            onClick={() =>
              moves.resolvePendingPlayerEvent(
                popEffect ? targetTileId : undefined,
                selectedChoiceIndex,
              )
            }
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
