import { Fragment, useEffect, useMemo, useState } from "react";
import {
  countPlayerPopType,
  getAddPopsEffect,
  getEventEffectChoices,
  getEventPopTargetTileIds,
  getOwnedSettlement,
  getTile,
  settlementCapacity,
  totalPops,
} from "../../../game/rules";
import type { EventEffect, HegemonyState, PlayerId } from "../../../game/types";
import { presentEventEffects } from "../../../ui/effects";
import type { EffectPresentation } from "../../../ui/effects";
import { formatPopLabel, formatSignedNumber } from "../../../ui/formatters";
import { PLAYER_GLAZES, glazeOf } from "../../../ui/playerGlazes";
import { settlementNameOf } from "../../../ui/settlementNames";
import { SETTLEMENT_GLYPHS, eventBlowGlyph } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { eventCardArtUrl } from "../events";
import { capitalize } from "../helpers";
import { CeremonyBlow, DurationStrip } from "./CeremonyBlow";
import { ceremonyMood, commitVerb, moodKicker } from "./ceremonyMood";
import { ModalShell } from "./ModalShell";
import { useGameUi } from "../GameUiContext";
import { TileListbox } from "../TileListbox";

/**
 * What an option is actually WORTH, on this board, at this moment.
 *
 * "+1 Gold per freeman, minimum 2" is not a number — it is a sum the player
 * cannot do without counting pops that are behind the scrim. Set beside a flat
 * "+3 Gold" it made a two-option card undecidable: the card offered a choice and
 * withheld the one figure the choice turns on.
 *
 * This is the dock's own rule applied to a ceremony: **the number you need in
 * order to decide is printed, and only the arithmetic behind it is demoted**. So
 * the figure becomes the resolved total and the rule that produced it drops to
 * the condition line, with the pop count that drove it named there.
 */
function presentOption(
  G: HegemonyState,
  playerID: PlayerId,
  effects: readonly EventEffect[],
): EffectPresentation {
  const presented = presentEventEffects(effects, G.definition.content);
  const effect = effects.length === 1 ? effects[0] : null;

  if (!effect || effect.type !== "resourceDeltaPerPop") {
    return presented;
  }

  // Counted with the engine's own query, and combined the way the card's own
  // data spells it — see the `resourceDeltaPerPop` arm of `applyEventEffects`.
  const held = countPlayerPopType(G, playerID, effect.pop);
  const amount = Math.max(effect.minimum, held * effect.amountPerPop);

  return {
    ...presented,
    magnitude: formatSignedNumber(amount),
    condition: `${formatSignedNumber(effect.amountPerPop)} per ${formatPopLabel(effect.pop, 1)} · you hold ${held}`,
  };
}

/**
 * A settlement, described by the thing the card is asking about.
 *
 * These rows used to read "BOURA · CITY · PLAINS +6 FOOD" — the tile's yield,
 * which is not what "a settlement with room" is a question about, and which left
 * the ONE number that decides it (how much room) off the card entirely.
 */
function settlementRoom(G: HegemonyState, tileId: string, playerID: PlayerId) {
  const tile = getTile(G, tileId);
  const settlement = getOwnedSettlement(G, tileId, playerID);

  if (!tile || !settlement) {
    return { title: tileId, detail: "", isCity: false };
  }

  const capacity = settlementCapacity(settlement, G.ruleset, G.definition.content);
  const filled = totalPops(settlement.pops);
  const rivals = tile.settlements.filter((candidate) => candidate.owner !== playerID);
  const shared = rivals.length
    ? ` · shares the tile with ${rivals.map((candidate) => G.players[candidate.owner].name).join(", ")}`
    : "";

  return {
    title: `${settlementNameOf(G.board.tiles, settlement.id)} · ${capitalize(settlement.kind)}`,
    detail: `room for ${Math.max(0, capacity - filled)} more · ${filled} of ${capacity} filled${shared}`,
    isCity: settlement.kind !== "colony",
  };
}

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
  const blow = presentOption(G, playerID, selectedEffects);
  // The mood decides the frame AND the verb. A card that hurts you should not ask
  // to be "claimed" — you endure it. One word and one colour, read off the
  // effects the engine already presented.
  const mood = ceremonyMood(blow.tone);
  // The verb names the option that is currently taken, so the button and the lit
  // row say the same thing. "Resolve Choice" named the dialog, not the outcome —
  // and on a card where nothing else marked the rows as alternatives, it was one
  // more thing that failed to say only one of them happens.
  const actionLabel = popEffect ? "Place Pops" : commitVerb(mood, blow.subject);

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

        {/* PAR-CER-1: the card's VOICE, and only that. `card.text` is the rules
            sentence and belongs in the blow band, which never fails to render it
            — a presenter with no single number to carve falls back to the flat
            sentence, and a two-option card puts one band under each option. So
            this slot never repeats mechanics, and a card with no authored line
            simply does not render it: the 15px that parts the title from the
            band lives on the band, so nothing leaves a gap.

            Deliberately NOT run through `AnnotatedText` — glossary chips down
            the middle of a quoted line would make prose read as a rules index,
            which is the register this slot exists to escape. */}
        {card.flavor ? <p className="fateVoice body-em">“{card.flavor}”</p> : null}

        {choices.length > 1 ? (
          // Alternatives, and they have to LOOK like alternatives. The rows used
          // to sit flush under each other with the taken one wearing the same
          // tint a single-effect card's blow band wears — so a reader saw a card
          // that granted both. The heading says how many you get, the "or"
          // between them says they exclude each other, and the option you have
          // not taken recedes.
          <div className="fateChoices" role="group" aria-label="Choose one">
            <span className="fateChoicesLabel label">Choose one</span>
            {choices.map((effects, index) => {
              const optionPopEffect = getAddPopsEffect(effects);
              const option = presentOption(G, playerID, effects);
              const disabled = Boolean(
                optionPopEffect &&
                getEventPopTargetTileIds(G, playerID, optionPopEffect).length === 0,
              );

              return (
                <Fragment key={`${card.id}-${index}`}>
                  {index > 0 ? (
                    <span aria-hidden="true" className="fateOr caption">
                      or
                    </span>
                  ) : null}
                  <button
                    aria-pressed={index === selectedChoiceIndex}
                    className={
                      index === selectedChoiceIndex ? "fateChoice fateChoiceTaken" : "fateChoice"
                    }
                    disabled={disabled}
                    onClick={() => setSelectedChoiceIndex(index)}
                  >
                    <CeremonyBlow
                      className="blowChoice"
                      figureRole="stat-lg"
                      icon={
                        effects.length > 0 ? (
                          <Icon glyph={eventBlowGlyph(effects[0])} size="verb" />
                        ) : null
                      }
                      presentation={option}
                    />
                  </button>
                </Fragment>
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
                <Icon glyph={eventBlowGlyph(selectedEffects[0])} size="rail" />
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
                const where = settlementRoom(G, tileId, playerID);

                return {
                  value: tileId,
                  icon: where.isCity ? SETTLEMENT_GLYPHS.city : SETTLEMENT_GLYPHS.colony,
                  title: where.title,
                  detail: where.detail,
                  label: `Place the pops in ${where.title} — ${where.detail}.`,
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
