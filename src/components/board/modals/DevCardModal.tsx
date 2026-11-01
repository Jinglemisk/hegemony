import { useEffect, useState } from "react";
import { capitalize } from "../../../game/core/format";
import { getOwnedSettlement } from "../../../game/core/query";
import {
  devCardBlocked,
  devCardGain,
  devCardOf,
  devCardPlays,
  raidAmount,
} from "../../../game/devCards";
import type { DevCardPlay } from "../../../game/devCards";
import { settlementRoom } from "../../../game/settlement";
import type { DevCard, HegemonyState, LogMoment, PlayerId, Resource } from "../../../game/types";
import { deckLine, devCardFace } from "../../../ui/cardFace";
import { RESOURCE_LABELS } from "../../../ui/formatters";
import { SETTLEMENT_GLYPHS } from "../../../ui/iconRegistry";
import { settlementNameOf } from "../../../ui/settlementNames";
import { AnnotatedText } from "../../AnnotatedText";
import { DeckLine } from "../../cards/DeckLine";
import { GameCard } from "../../cards/GameCard";
import { SeatMark } from "../../frame/parts";
import { useGameUi } from "../GameUiContext";
import { deckMark } from "../helpers";
import type { DeckMark } from "../helpers";
import { TileListbox } from "../TileListbox";
import type { TileListboxOption } from "../TileListbox";
import { commitVerb } from "./ceremonyMood";
import { DrawnReveal } from "./DrawnReveal";
import { ModalShell } from "./ModalShell";

/**
 * The development deck at the table (docs/plans/development-deck.md): the card a buy
 * drew, and the hand a seat plays from. Every choice the hand offers is one of the
 * engine's legal plays (`devCardPlays`); the screen only asks which.
 */

type CardMoment = Extract<LogMoment, { kind: "devCard" }>;

/** The card line the seat's command wrote since `mark`. */
function cardMoment(G: HegemonyState, playerID: PlayerId, mark: DeckMark): CardMoment | null {
  for (const entry of G.log.slice(mark.log))
    if (entry.about === playerID && entry.moment?.kind === "devCard") return entry.moment;
  return null;
}

const contentCard = (G: HegemonyState, id: string) =>
  G.definition.content.devCards.find((card) => card.id === id);

/** The deck line under a card, naming the seat at the deck. */
function SeatAtDeck({ playerID, verb }: { playerID: PlayerId; verb: string }) {
  const { G } = useGameUi();
  return (
    <DeckLine line={deckLine(G, { kind: "dev" })}>
      <span className="deck-who">
        <SeatMark playerID={playerID} />
        {G.players[playerID].name} {verb}
      </span>
    </DeckLine>
  );
}

/** The card a buy drew: a yield with what it gave, or a held card going to the hand. */
export function DrawnCardModal({ mark, onClose }: { mark: DeckMark; onClose: () => void }) {
  const { G, viewerId } = useGameUi();
  const kept = G.devHands[viewerId].find((held) => !mark.hand.includes(held.id));
  const moment = kept ? null : cardMoment(G, viewerId, mark);
  const card = kept ? devCardOf(G, kept.id) : moment ? contentCard(G, moment.cardId) : undefined;

  // A buy the engine refused draws nothing: there is no card to show.
  useEffect(() => {
    if (!card) onClose();
  }, [card, onClose]);
  if (!card) return null;

  const gained = card.effect.type === "gain" ? card.effect.resources[0] : undefined;
  return (
    <DrawnReveal
      card={<GameCard arrive="turn" face={devCardFace(card)} titleId="drawn-card-title" />}
      deck={<SeatAtDeck playerID={viewerId} verb="buys" />}
      labelledBy="drawn-card-title"
      mood={kept ? "rite" : "gift"}
      onDismiss={onClose}
      slip={
        <p className="body">
          {kept ? (
            "Kept in your hand. You can play it from your next turn."
          ) : (
            <AnnotatedText links={false} text={`${capitalize(moment!.outcome)}.`} />
          )}
        </p>
      }
    >
      <button className="ceremonyCommit verb verb-lg" onClick={onClose} type="button">
        {kept ? "Keep It" : commitVerb("gift", gained && RESOURCE_LABELS[gained])}
      </button>
    </DrawnReveal>
  );
}

/** The values a choice can take among `plays`, in the engine's order. */
function valuesOf<K extends "target" | "resource" | "tileId">(plays: DevCardPlay[], key: K) {
  return [
    ...new Set(plays.map((play) => play[key]).filter((value) => value !== undefined)),
  ] as Array<NonNullable<DevCardPlay[K]>>;
}

/** The hand, on the seat's own turn: pick a card, make its choice, play it. */
export function HandModal({ onClose }: { onClose: () => void }) {
  const { G, viewerId, isActive, moves } = useGameUi();
  const hand = G.devHands[viewerId];
  const [picked, setPicked] = useState<string | null>(
    () => hand.find((held) => devCardPlays(G, viewerId, held.id).length)?.id ?? hand[0]?.id ?? null,
  );
  const [choice, setChoice] = useState<Omit<DevCardPlay, "card">>({});
  const [played, setPlayed] = useState<DeckMark | null>(null);

  const result = played ? cardMoment(G, viewerId, played) : null;
  if (result) {
    const card = contentCard(G, result.cardId);
    return (
      <DrawnReveal
        card={card ? <GameCard face={devCardFace(card)} titleId="played-card-title" /> : null}
        deck={<SeatAtDeck playerID={viewerId} verb="plays" />}
        labelledBy="played-card-title"
        mood="gift"
        onDismiss={onClose}
        slip={
          <p className="body" role="status">
            <AnnotatedText links={false} text={`${capitalize(result.outcome)}.`} />
          </p>
        }
      >
        <button className="ceremonyCommit verb verb-lg" onClick={onClose} type="button">
          Done
        </button>
      </DrawnReveal>
    );
  }

  const held = hand.find((entry) => entry.id === picked);
  const card = held ? devCardOf(G, held.id) : undefined;
  const plays = held && isActive ? devCardPlays(G, viewerId, held.id) : [];
  const blocked = held ? devCardBlocked(G, viewerId, held.id) : null;
  // Each choice narrows the next: the rival first, then what is taken from them.
  const targets = valuesOf(plays, "target");
  const target = choice.target ?? (targets.length === 1 ? targets[0] : undefined);
  const forTarget = plays.filter((play) => play.target === target);
  const resources = valuesOf(forTarget, "resource");
  const tiles = valuesOf(forTarget, "tileId");
  const resource = choice.resource ?? (resources.length === 1 ? resources[0] : undefined);
  const tileId = choice.tileId ?? (tiles.length === 1 ? tiles[0] : undefined);
  const play = forTarget.find((option) => option.resource === resource && option.tileId === tileId);

  return (
    <ModalShell
      backdropClassName="eventModalBackdrop drawnScrim"
      ceremony="rite"
      className="drawnReveal handReveal"
      label="Your hand"
      onDismiss={onClose}
    >
      <div className="hand-row" role="group" aria-label="Your cards">
        {hand.map((entry) => {
          const face = devCardOf(G, entry.id);
          if (!face) return null;
          const isPicked = entry.id === picked;
          return (
            <button
              aria-pressed={isPicked}
              className="hand-card"
              key={entry.id}
              onClick={() => {
                setPicked(entry.id);
                setChoice({});
              }}
              title={face.text}
              type="button"
            >
              <GameCard
                className={
                  isPicked
                    ? "is-picked"
                    : devCardBlocked(G, viewerId, entry.id)
                      ? "is-dim"
                      : undefined
                }
                face={devCardFace(face)}
                size="hand"
              />
            </button>
          );
        })}
      </div>
      <SeatAtDeck playerID={viewerId} verb={`holds ${hand.length}`} />
      {card ? (
        <div className="drawn-tray">
          <div className="drawn-slip">
            <p className="body">
              <strong>{card.name}.</strong> <AnnotatedText links={false} text={card.text} />
            </p>
            {blocked && plays.length === 0 ? <p className="caption">{blocked}</p> : null}
            {targets.length > 1 ? (
              <ChoiceList
                label="Rival"
                onChange={(value) => setChoice({ target: value })}
                options={targets.map((seat) => ({
                  value: seat,
                  icon: "crowd",
                  title: G.players[seat].name,
                  detail: rivalDetail(G, card, seat),
                }))}
                value={target}
              />
            ) : null}
            {resources.length > 1 ? (
              <ChoiceList
                label={card.kind === "rival" ? "Take" : "Kind"}
                onChange={(value) => setChoice({ target, resource: value })}
                options={resources.map((option) => ({
                  value: option,
                  icon: option,
                  title: RESOURCE_LABELS[option],
                  detail: resourceDetail(G, viewerId, card, option, target),
                }))}
                value={resource}
              />
            ) : null}
            {tiles.length > 1 ? (
              <ChoiceList
                label="Settlement"
                onChange={(value) => setChoice({ tileId: value })}
                options={tiles.map((option) => settlementOption(G, viewerId, option))}
                value={tileId}
              />
            ) : null}
          </div>
          <button
            className="ceremonyCommit verb verb-lg"
            disabled={!play}
            onClick={() => {
              if (!play) return;
              setPlayed(deckMark(G, viewerId));
              moves.playDevCard(play);
            }}
            type="button"
          >
            Play {card.name}
          </button>
        </div>
      ) : null}
    </ModalShell>
  );
}

/** One of a card's choices, as the fate card's settlement picker draws it. */
function ChoiceList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<TileListboxOption<T>>;
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div className="fieldGroup fateTarget">
      <span className="label">{label}</span>
      <TileListbox ariaLabel={label} onChange={onChange} options={options} value={value ?? null} />
    </div>
  );
}

/** What the table knows of a rival that the card acts on: its hand, or its stocks. */
function rivalDetail(G: HegemonyState, card: DevCard, seat: PlayerId): string {
  if (card.effect.type === "discardHeld") return `${G.devHands[seat].length} cards held`;
  if (card.effect.type === "raid")
    return card.effect.resources
      .map((resource) => `${G.players[seat].resources[resource]} ${RESOURCE_LABELS[resource]}`)
      .join(" · ");
  return "";
}

/** What a kind gives: Caravan's count of it, or what Raiders would take. */
function resourceDetail(
  G: HegemonyState,
  playerID: PlayerId,
  card: DevCard,
  resource: Resource,
  target: PlayerId | undefined,
): string {
  if (card.effect.type === "gain") return `+${devCardGain(G, playerID, card.effect)}`;
  if (card.effect.type === "raid" && target)
    return `takes ${raidAmount(G, target, resource, card.effect.amount)}`;
  return "";
}

function settlementOption(G: HegemonyState, playerID: PlayerId, tileId: string) {
  const settlement = getOwnedSettlement(G, tileId, playerID)!;
  return {
    value: tileId,
    icon: settlement.kind === "colony" ? SETTLEMENT_GLYPHS.colony : SETTLEMENT_GLYPHS.city,
    title: settlementNameOf(G.board.tiles, settlement.id),
    detail: `room for ${settlementRoom(G, settlement)} more`,
  } as const;
}
