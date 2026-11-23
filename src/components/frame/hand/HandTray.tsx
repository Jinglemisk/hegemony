import { useEffect, useEffectEvent, type CSSProperties } from "react";
import { devCardBlocked, devCardOf } from "../../../game/devCards";
import type { DevCardKind } from "../../../game/types";
import { devCardFace } from "../../../ui/cardFace";
import { isTyping } from "../../../ui/keys";
import { GameCard } from "../../cards/GameCard";
import { useGameUi } from "../../board/GameUiContext";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Tip, TipBody } from "../parts";

/**
 * The hand's tray: the seat's held development cards peeking from the bottom edge in
 * one fixed box (x 624, 480 × 72 at design size) that never moves or resizes, whatever
 * opens beside it. Each card shows as a plate (its kind and name); under the pointer or
 * focus the whole card stands above its plate, fading in where it lies. A click, or H
 * anywhere, opens the hand view.
 */
export function HandTray({ onOpen }: { onOpen: () => void }) {
  const { G, viewerId } = useGameUi();
  const hand = G.devHands[viewerId];

  // H opens the hand: never while typing, behind a dialog, or on a held key.
  const open = useEffectEvent(onOpen);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "h" && event.key !== "H") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (isTyping(event.target) || document.querySelector('[aria-modal="true"]')) return;
      open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (hand.length === 0) {
    return (
      <Tooltip
        content={
          <Tip title="Your hand">
            <TipBody>No cards held. Buy one in the dock.</TipBody>
            <p className="tip-act">Click or press H to open the hand</p>
          </Tip>
        }
        triggerClassName="hand-tray"
        preferredPlacement="above"
      >
        <button
          aria-label="Your hand: no cards held. Buy one in the dock."
          className="hand-empty"
          data-c="hand-tray"
          data-exclude
          onClick={onOpen}
          type="button"
        >
          <Ico path="events/venture" size="ui" />
          <span>
            <b>No cards held</b> · Buy one in the dock
          </span>
        </button>
      </Tooltip>
    );
  }

  return (
    <div
      aria-label={`Your hand: ${hand.length} held`}
      className="hand-tray"
      data-c="hand-tray"
      data-exclude
      role="group"
      style={{ "--n": hand.length } as CSSProperties}
    >
      {/* The tab stands inside the tray, so nothing that opens above the hand's row
          (a place's pops, a rival's card) can cover it. */}
      <div className="hand-tab">
        <span>Hand · {hand.length}</span>
        <button aria-label="View the hand" className="hand-view-btn" onClick={onOpen} type="button">
          View <kbd>H</kbd>
        </button>
      </div>
      <div className="hand-slots">
        {hand.map((held, index) => {
          const card = devCardOf(G, held.id);
          if (!card) return null;
          const blocked = devCardBlocked(G, viewerId, held.id);
          return (
            <Tooltip
              content={
                <Tip title={card.name}>
                  <TipBody>{card.text}</TipBody>
                  {blocked ? <TipBody>{blocked}</TipBody> : null}
                  <p className="tip-act">Click to open the hand</p>
                </Tip>
              }
              key={held.id}
              preferredPlacement="above"
              triggerClassName="hand-slot"
              triggerStyle={{ "--i": index } as CSSProperties}
            >
              <button
                aria-label={`${card.name}. ${blocked ?? "Can be played now."} Open the hand.`}
                className="hand-card-btn"
                onClick={onOpen}
                type="button"
              >
                {/* The risen card: shown whole above the tray under the pointer or focus.
                    The slot grows to hold it, so the tooltip stands above the card. */}
                <span className="hand-face">
                  <GameCard face={devCardFace(card)} size="hand" />
                </span>
                {/* The plate in the tray: the card's kind over its name. */}
                <span aria-hidden="true" className="hand-plate">
                  <span className="hand-plate-k">{KICKERS[card.kind]}</span>
                  <span className="hand-plate-n">{card.name}</span>
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

/** A plate's kicker: how the card is played. */
const KICKERS: Record<DevCardKind, string> = { held: "Held", rival: "Rival", yield: "Yield" };
