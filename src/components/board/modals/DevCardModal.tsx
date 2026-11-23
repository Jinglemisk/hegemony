import { useEffect, useState } from "react";
import { standingHappiness } from "../../../game/happiness";
import { capitalize } from "../../../game/core/format";
import { getOwnedSettlement } from "../../../game/core/query";
import {
  devCardBlocked,
  devCardGain,
  devCardOf,
  devCardPlays,
  getBuyDevCardStatus,
  raidAmount,
} from "../../../game/devCards";
import type { DevCardPlay } from "../../../game/devCards";
import { settlementRoom } from "../../../game/settlement";
import type { DevCard, HegemonyState, LogMoment, PlayerId, Resource } from "../../../game/types";
import { deckLine, devCardFace } from "../../../ui/cardFace";
import { RESOURCE_LABELS, formatSignedNumber } from "../../../ui/formatters";
import { SETTLEMENT_GLYPHS } from "../../../ui/iconRegistry";
import { namePlaces, settlementNameOf } from "../../../ui/settlementNames";
import { AnnotatedText } from "../../AnnotatedText";
import { DeckLine } from "../../cards/DeckLine";
import { GameCard } from "../../cards/GameCard";
import { useConfirm } from "../../chrome/confirmContext";
import { SpendDetail } from "../../chrome/confirmDetail";
import { Lacquer, Plaque } from "../../chrome/controls";
import { PanelHead } from "../../chrome/Panel";
import { Chips, SeatMark, Tip, TipBody } from "../../frame/parts";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { deckMark } from "../helpers";
import type { DeckMark } from "../helpers";
import { TileListbox } from "../TileListbox";
import type { TileListboxOption } from "../TileListbox";
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
            <AnnotatedText
              links={false}
              text={`${capitalize(namePlaces(G.board.tiles, moment!.outcome, viewerId))}.`}
            />
          )}
        </p>
      }
    >
      <button className="ceremonyCommit verb verb-lg" onClick={onClose} type="button">
        {/* A yield is paid on the draw: the slip says what it gave, the button only closes. */}
        {kept ? "Keep It" : "Done"}
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

/**
 * The hand view, on the seat's own turn: every held card at full size, each with Play
 * or the engine's reason it can't be played. A card with a choice asks for it here, in
 * place; under the cards, what buying costs, the free card and what can take a card.
 */
export function HandModal({ onClose, onBuy }: { onClose: () => void; onBuy: () => void }) {
  const { G, viewerId, isActive, moves } = useGameUi();
  const ask = useConfirm();
  const hand = G.devHands[viewerId];
  const [picked, setPicked] = useState<string | null>(null);
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
            <AnnotatedText
              links={false}
              text={`${capitalize(namePlaces(G.board.tiles, result.outcome, viewerId))}.`}
            />
          </p>
        }
      >
        <button className="ceremonyCommit verb verb-lg" onClick={onClose} type="button">
          Done
        </button>
      </DrawnReveal>
    );
  }

  const play = (instanceId: string, chosen: Omit<DevCardPlay, "card">) => {
    const plays = devCardPlays(G, viewerId, instanceId);
    const resolved = resolvePlay(plays, chosen);
    if (!resolved.play) return;
    setPlayed(deckMark(G, viewerId));
    moves.playDevCard(resolved.play);
  };

  const held = hand.find((entry) => entry.id === picked);
  const card = held ? devCardOf(G, held.id) : undefined;
  const pile = G.devDrawPile.length;
  const sub = `${hand.length} held · ${pile} in the deck · one played a turn`;
  const buy = getBuyDevCardStatus(G, viewerId);
  const cost = buy.cost ?? {};
  const rules = G.ruleset.devCards;
  const standing = standingHappiness(G, viewerId);

  return (
    <ModalShell
      backdropClassName="hand-scrim"
      className="hand-view"
      label="Your hand"
      onDismiss={onClose}
    >
      <PanelHead
        closeLabel="Close the hand"
        icon="events/venture"
        onClose={onClose}
        sub={sub}
        title={card ? `Play ${card.name}` : "Your hand"}
      />
      {held && card ? (
        <HandChoice
          card={card}
          choice={choice}
          instanceId={held.id}
          onBack={() => {
            setPicked(null);
            setChoice({});
          }}
          onChoice={setChoice}
          onPlay={() => play(held.id, choice)}
          plays={isActive ? devCardPlays(G, viewerId, held.id) : []}
        />
      ) : (
        <>
          <div className="hand-view-body">
            {hand.length ? (
              <ul aria-label="Your cards" className="hand-view-row">
                {hand.map((entry) => {
                  const face = devCardOf(G, entry.id);
                  if (!face) return null;
                  const blocked = devCardBlocked(G, viewerId, entry.id);
                  const plays = isActive ? devCardPlays(G, viewerId, entry.id) : [];
                  const direct = resolvePlay(plays, {});
                  return (
                    <li className="hand-view-slot" key={entry.id}>
                      {/* At hand size the sentence is read from the card's tooltip. */}
                      <Tooltip
                        ariaLabel={face.name}
                        content={
                          <Tip title={face.name}>
                            <TipBody>{face.text}</TipBody>
                          </Tip>
                        }
                        focusable
                        preferredPlacement="above"
                        triggerAs="div"
                      >
                        <GameCard face={devCardFace(face)} size="hand" />
                      </Tooltip>
                      {blocked || plays.length === 0 ? (
                        <p className="hand-view-why">{blocked ?? "It can't be played now."}</p>
                      ) : (
                        <Lacquer
                          aria-label={`Play ${face.name}`}
                          onClick={() => {
                            // A card with nothing to choose plays at once; any other asks here.
                            if (direct.play && direct.settled) play(entry.id, {});
                            else {
                              setPicked(entry.id);
                              setChoice({});
                            }
                          }}
                        >
                          Play
                        </Lacquer>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="hand-view-empty body">
                No cards held. Buy one here or in the dock for <Chips amounts={cost} />, once a
                turn: a yield pays at once, any other card comes here.
              </p>
            )}
          </div>
          <div className="hand-view-facts">
            <div>
              <h3 className="hand-view-fact">Buy a card</h3>
              <p>
                <Chips amounts={cost} /> once a turn. A yield pays on the draw; any other card comes
                to the hand.
              </p>
              <Plaque
                aria-label={buy.can ? "Buy a card" : `Buy a card: ${buy.reasons[0] ?? ""}`}
                disabled={!buy.can}
                onClick={() =>
                  ask({
                    icon: "events/convoy",
                    question: "Are you sure you want to buy a card?",
                    detail: <SpendDetail cost={cost} G={G} viewerId={viewerId} />,
                    verb: "Buy a card",
                    onYes: onBuy,
                  })
                }
              >
                Buy a card
              </Plaque>
              {buy.can ? null : <p className="hand-view-why">{buy.reasons[0]}</p>}
            </div>
            {rules.freeCard ? (
              <div>
                <h3 className="hand-view-fact">A free card</h3>
                <p>
                  When your turn ends at {formatSignedNumber(rules.freeCardLevel)} happiness or
                  higher. You stand at {formatSignedNumber(standing)}.
                </p>
              </div>
            ) : null}
            <div>
              <h3 className="hand-view-fact">At risk</h3>
              <p>
                {rules.riotCard ? "A Riot may take a held card in place of a pop. " : null}A
                rival&rsquo;s Informer discards one at random.
              </p>
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/** What a play resolves to from the choices made so far: the rival first, then what is
 *  taken or where. `settled`: nothing was left to choose. */
function resolvePlay(plays: DevCardPlay[], choice: Omit<DevCardPlay, "card">) {
  const targets = valuesOf(plays, "target");
  const target = choice.target ?? (targets.length === 1 ? targets[0] : undefined);
  const forTarget = plays.filter((play) => play.target === target);
  const resources = valuesOf(forTarget, "resource");
  const tiles = valuesOf(forTarget, "tileId");
  const resource = choice.resource ?? (resources.length === 1 ? resources[0] : undefined);
  const tileId = choice.tileId ?? (tiles.length === 1 ? tiles[0] : undefined);
  const play = forTarget.find((option) => option.resource === resource && option.tileId === tileId);
  const settled = targets.length <= 1 && resources.length <= 1 && tiles.length <= 1;
  return { targets, target, resources, resource, tiles, tileId, play, settled };
}

/** A card's choice, asked in place of the row: the card, its sentence, the choices, Play. */
function HandChoice({
  card,
  instanceId,
  plays,
  choice,
  onChoice,
  onPlay,
  onBack,
}: {
  card: DevCard;
  instanceId: string;
  plays: DevCardPlay[];
  choice: Omit<DevCardPlay, "card">;
  onChoice: (choice: Omit<DevCardPlay, "card">) => void;
  onPlay: () => void;
  onBack: () => void;
}) {
  const { G, viewerId } = useGameUi();
  const { targets, target, resources, resource, tiles, tileId, play } = resolvePlay(plays, choice);
  const blocked = devCardBlocked(G, viewerId, instanceId);
  return (
    <div className="hand-view-choose">
      <GameCard face={devCardFace(card)} size="hand" />
      <div className="hand-view-ask">
        <p className="body">
          <AnnotatedText links={false} text={card.text} />
        </p>
        {blocked && plays.length === 0 ? <p className="hand-view-why">{blocked}</p> : null}
        {targets.length > 1 ? (
          <ChoiceList
            label="Rival"
            onChange={(value) => onChoice({ target: value })}
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
            onChange={(value) => onChoice({ target, resource: value })}
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
            onChange={(value) => onChoice({ tileId: value })}
            options={tiles.map((option) => settlementOption(G, viewerId, option))}
            value={tileId}
          />
        ) : null}
        <footer className="hand-view-acts">
          <Plaque onClick={onBack}>Back to the hand</Plaque>
          <Lacquer disabled={!play} onClick={onPlay}>
            Play {card.name}
          </Lacquer>
        </footer>
      </div>
    </div>
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
