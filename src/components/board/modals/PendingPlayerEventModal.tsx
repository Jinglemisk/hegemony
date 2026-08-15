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
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { eventCardArtUrl } from "../events";
import { settlementPickerLabel } from "../helpers";
import { CeremonyBlow, DurationStrip } from "./CeremonyBlow";
import { ceremonyMood, commitVerb, moodKicker } from "./ceremonyMood";
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
  const blow = presentEventEffects(selectedEffects, G.definition.content);
  // The mood decides the frame AND the verb. A card that hurts you should not ask
  // to be "claimed" — you endure it. One word and one colour, read off the
  // effects the engine already presented.
  const mood = ceremonyMood(blow.tone);
  const carved = Boolean(blow.magnitude && blow.subject) && choices.length <= 1;
  const actionLabel =
    choices.length > 1 ? "Resolve Choice" : popEffect ? "Place Pops" : commitVerb(mood);

  return (
    // Blocking on purpose: a drawn event must be resolved, never dismissed.
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony={mood}
      className="fateCard"
      labelledBy="pending-event-title"
      scrimNote={
        <p className="deckEcho label">The deck of fates · {G.playerDrawPile.length} remain</p>
      }
    >
      <div className="fateArt">
        <img alt={`${card.name} card art`} src={eventCardArtUrl(card)} />
        <span className="fateSeat">
          <span className="seatGlaze label" style={{ background: glazeOf(playerID) }}>
            {PLAYER_GLAZES[playerID].blazon}
          </span>
          <b className="label">{G.players[playerID].name} draws</b>
        </span>
      </div>

      <div className="fateBody">
        <span className="fateKicker label">{moodKicker(mood)}</span>
        <h2 className="display display-xl" id="pending-event-title">
          {card.name}
        </h2>

        {/* PAR-CER-1: the card must not say its one thing twice. `card.text` IS
            the rules sentence — the data model has no flavour field of its own —
            so it is printed only where the blow below cannot carry the mechanics
            on its own. The card's missing VOICE is a documented gap, not a
            styling one; giving it a voice is an engine change. */}
        {carved ? null : (
          <p className="fateVoice body-em">
            <AnnotatedText text={card.text} />
          </p>
        )}

        {choices.length > 1 ? (
          <div className="fateChoices" role="group" aria-label="Event choices">
            {choices.map((effects, index) => {
              const optionPopEffect = getAddPopsEffect(effects);
              const option = presentEventEffects(effects, G.definition.content);
              const disabled = Boolean(
                optionPopEffect &&
                getEventPopTargetTileIds(G, playerID, optionPopEffect).length === 0,
              );

              return (
                <button
                  aria-pressed={index === selectedChoiceIndex}
                  className={
                    index === selectedChoiceIndex ? "fateChoice fateChoiceTaken" : "fateChoice"
                  }
                  disabled={disabled}
                  key={`${card.id}-${index}`}
                  onClick={() => setSelectedChoiceIndex(index)}
                >
                  <CeremonyBlow
                    className="blowChoice"
                    figureRole="stat-lg"
                    icon={
                      effects.length > 0 ? (
                        <EffectIcon effect={effects[0]} family="event" size="verb" />
                      ) : null
                    }
                    presentation={option}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          // The blow: one band across the card's waist, the effect's own glyph,
          // the carved figure, and what it lands on. A card does ONE thing to
          // you, and this is where the eye goes.
          <CeremonyBlow
            className="blowBand"
            icon={
              selectedEffects.length > 0 ? (
                <EffectIcon effect={selectedEffects[0]} family="event" size="rail" />
              ) : null
            }
            presentation={blow}
          />
        )}

        {blow.turns ? <DurationStrip turns={blow.turns} /> : null}

        {popEffect ? (
          <div className="fieldGroup fateTarget">
            <span className="label">Settlement target</span>
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
              <em className="caption">No owned settlement has enough capacity for this option.</em>
            ) : null}
          </div>
        ) : null}

        {!isActive ? (
          <p className="fateWait caption">Only the active player can resolve this event.</p>
        ) : null}

        <button
          className="ceremonyCommit verb verb-lg"
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
    </ModalShell>
  );
}
