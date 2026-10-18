import { useEffect, useMemo, useState } from "react";
import {
  getAddPopsEffect,
  getEventPopTargets,
  getOwnedSettlement,
  getTile,
} from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { presentEventEffects } from "../../../ui/effects";
import { PLAYER_GLAZES, glazeOf } from "../../../ui/playerGlazes";
import { settlementNameOf } from "../../../ui/settlementNames";
import { SETTLEMENT_GLYPHS, eventBlowGlyph } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { eventCardArtUrl } from "../events";
import { capitalize } from "../helpers";
import { CeremonyBlow } from "./CeremonyBlow";
import { ceremonyMood, commitVerb, moodKicker } from "./ceremonyMood";
import { ModalShell } from "./ModalShell";
import { useGameUi } from "../GameUiContext";
import { TileListbox } from "../TileListbox";

/**
 * A settlement, described by the thing the card is asking about.
 *
 * These rows used to read "BOURA · CITY · PLAINS +6 FOOD" — the tile's yield,
 * which is not what "a settlement with room" is a question about, and which left
 * the ONE number that decides it (how much room) off the card entirely.
 */
function settlementRoom(
  G: HegemonyState,
  target: { tileId: string; capacity: number; filled: number; room: number },
  playerID: PlayerId,
) {
  const { tileId, capacity, filled, room } = target;
  const tile = getTile(G, tileId);
  const settlement = getOwnedSettlement(G, tileId, playerID);

  if (!tile || !settlement) {
    return { title: tileId, detail: "", isCity: false };
  }

  const rivals = tile.settlements.filter((candidate) => candidate.owner !== playerID);
  const shared = rivals.length
    ? ` · shares the tile with ${rivals.map((candidate) => G.players[candidate.owner].name).join(", ")}`
    : "";

  return {
    title: `${settlementNameOf(G.board.tiles, settlement.id)} · ${capitalize(settlement.kind)}`,
    detail: `room for ${room} more · ${filled} of ${capacity} filled${shared}`,
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
  const effects = card?.effects ?? [];
  const popEffect = getAddPopsEffect(effects);
  const targets = useMemo(
    () => (popEffect ? getEventPopTargets(G, playerID, popEffect) : []),
    [G, playerID, popEffect],
  );
  const targetTileIds = targets.map((target) => target.tileId);
  const [targetTileId, setTargetTileId] = useState(targetTileIds[0] ?? "");

  useEffect(() => {
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
  const blow = presentEventEffects(effects);
  // The mood decides the frame AND the verb. A card that hurts you should not ask
  // to be "claimed" — you endure it. One word and one colour, read off the
  // effects the engine already presented.
  const mood = ceremonyMood(blow.tone);
  const tokenEffect = effects.find((effect) => effect.type === "unrestTokens");
  const actionLabel = tokenEffect
    ? tokenEffect.change === "placeOne"
      ? "Place Unrest"
      : "Clear Unrest"
    : popEffect
      ? "Place Pop"
      : commitVerb(mood, blow.subject);

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
            sentence. So
            this slot never repeats mechanics, and a card with no authored line
            simply does not render it: the 15px that parts the title from the
            band lives on the band, so nothing leaves a gap.

            Deliberately NOT run through `AnnotatedText` — glossary chips down
            the middle of a quoted line would make prose read as a rules index,
            which is the register this slot exists to escape. */}
        {card.flavor ? <p className="fateVoice body-em">“{card.flavor}”</p> : null}

        <CeremonyBlow
          className="blowBand"
          icon={effects.length > 0 ? <Icon glyph={eventBlowGlyph(effects[0])} size="rail" /> : null}
          presentation={blow}
        />

        {popEffect ? (
          <div className="fieldGroup fateTarget">
            <span className="label">Settlement target</span>
            {/* A list, not the map: this dialog blocks by design (a drawn card
                must be resolved), so the board behind it cannot be the picker
                — exactly scope 4's carve-out. */}
            <TileListbox
              ariaLabel="Settlement target"
              onChange={setTargetTileId}
              options={targets.map((target) => {
                const { tileId } = target;
                const where = settlementRoom(G, target, playerID);

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
              <em className="caption">No owned settlement has room.</em>
            ) : null}
          </div>
        ) : null}

        {!isActive ? (
          <p className="fateWait caption">Only the active player can resolve this event.</p>
        ) : null}

        <button
          className="ceremonyCommit verb verb-lg"
          disabled={!canConfirm}
          onClick={() => moves.resolvePendingPlayerEvent(popEffect ? targetTileId : undefined)}
        >
          {actionLabel}
        </button>
      </div>
    </ModalShell>
  );
}
