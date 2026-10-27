import { useEffect, useMemo, useState } from "react";
import {
  getAddPopsEffect,
  getEventPopTargets,
  getOwnedSettlement,
  getTile,
} from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { deckLine, fateCardFace } from "../../../ui/cardFace";
import { presentEventEffects } from "../../../ui/effects";
import { settlementNameOf } from "../../../ui/settlementNames";
import { SETTLEMENT_GLYPHS } from "../../../ui/iconRegistry";
import { Prose } from "../../AnnotatedText";
import { DeckLine } from "../../cards/DeckLine";
import { GameCard } from "../../cards/GameCard";
import { SeatMark } from "../../frame/parts";
import { eventCardArtUrl } from "../events";
import { capitalize } from "../helpers";
import { ceremonyMood, commitVerb } from "./ceremonyMood";
import { DrawnReveal } from "./DrawnReveal";
import { useGameUi } from "../GameUiContext";
import { TileListbox } from "../TileListbox";

/**
 * A settlement, described by the thing the card is asking about.
 *
 * These rows used to read "BOURA · CITY · PLAINS +6 FOOD" — the tile's yield,
 * which is not what "a settlement with room" is a question about, and which left
 * the ONE number that decides it (how much room) off the card entirely. The kind
 * is the row's glyph, so the title is the name alone; the label keeps the kind.
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
    return { title: tileId, kind: "Settlement", detail: "", isCity: false };
  }

  const rivals = tile.settlements.filter((candidate) => candidate.owner !== playerID);
  const shared = rivals.length
    ? ` · shares the tile with ${rivals.map((candidate) => G.players[candidate.owner].name).join(", ")}`
    : "";

  return {
    title: settlementNameOf(G.board.tiles, settlement.id),
    kind: capitalize(settlement.kind),
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
    // Blocking on purpose: a drawn event must be resolved, never dismissed. The card,
    // the fates' deck line, the settlement slip when it asks for one, then the commit.
    <DrawnReveal
      caption={
        !isActive ? (
          <p className="drawn-wait">
            <Prose links={false}>Only the active player can resolve this event.</Prose>
          </p>
        ) : null
      }
      card={
        <GameCard
          arrive="turn"
          face={fateCardFace(card, eventCardArtUrl(card))}
          titleId="pending-event-title"
        />
      }
      deck={
        <DeckLine kinds="hover" line={deckLine(G, { kind: "fate" })} noun="fates left">
          <span className="deck-who">
            <SeatMark playerID={playerID} />
            {G.players[playerID].name} draws
          </span>
        </DeckLine>
      }
      labelledBy="pending-event-title"
      mood={mood}
      slip={
        popEffect ? (
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
                  label: `Place the pops in ${where.title} (${where.kind}) — ${where.detail}.`,
                };
              })}
              value={targetTileId || null}
            />
            {targetTileIds.length === 0 ? (
              <em className="caption">
                <Prose links={false}>No owned settlement has room.</Prose>
              </em>
            ) : null}
          </div>
        ) : null
      }
    >
      <button
        className="ceremonyCommit verb verb-lg"
        disabled={!canConfirm}
        onClick={() => moves.resolvePendingPlayerEvent(popEffect ? targetTileId : undefined)}
      >
        {actionLabel}
      </button>
    </DrawnReveal>
  );
}
