import type { Phase } from "../../../game/controller";
import type { HegemonyState } from "../../../game/types";
import { phaseHint } from "../../../ui/formatters";
import { AtlasIcon, UiSprite } from "../../Sprites";
import { ActionLogPanel } from "./ActionLogPanel";
import { CurrentEvents } from "./CurrentEvents";
import { DeckShelf } from "./DeckShelf";

export function ActionCommandPanel({
  G,
  phase,
  isActive,
  canGrowPops,
  canMovePops,
  canFoundColony,
  canUpgradeCity,
  isFoundColonyActive,
  hasPendingPlayerEvent,
  onMovePopsRequest,
  onGrowPopRequest,
  onFoundColonyRequest,
  onUpgradeCityRequest,
  onEndTurn
}: {
  G: HegemonyState;
  phase: Phase;
  isActive: boolean;
  canGrowPops: boolean;
  canMovePops: boolean;
  canFoundColony: boolean;
  canUpgradeCity: boolean;
  isFoundColonyActive: boolean;
  hasPendingPlayerEvent: boolean;
  onMovePopsRequest: () => void;
  onGrowPopRequest: () => void;
  onFoundColonyRequest: () => void;
  onUpgradeCityRequest: () => void;
  onEndTurn: () => void;
}) {
  return (
    <div className="commandStack">
      <CurrentEvents G={G} />

      <div className="panelTitle compactPanelTitle">
        <UiSprite item="voteToken" className="titleIcon" />
        <div>
          <h2>Actions</h2>
          <span>{phase === "gameplay" ? "What you can do this turn" : phaseHint(phase)}</span>
        </div>
      </div>

      <div className="commandToolbar" aria-label="Action toolbar">
        <button
          className="commandIconButton"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || !canGrowPops}
          onClick={onGrowPopRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : canGrowPops
                ? "Choose a holding and pop type to grow."
                : "Requires an owned holding."
          }
        >
          <UiSprite item="growAction" className="commandIcon" />
          <span>Grow</span>
        </button>

        <button
          className="commandIconButton"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || !canMovePops}
          onClick={onMovePopsRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : canMovePops
                ? "Move pops between two owned settlements."
                : "Requires at least two settlements."
          }
        >
          <UiSprite item="moveAction" className="commandIcon" />
          <span>Move</span>
        </button>

        <button
          aria-pressed={isFoundColonyActive}
          className={isFoundColonyActive ? "commandIconButton commandIconActive" : "commandIconButton"}
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || (!canFoundColony && !isFoundColonyActive)}
          onClick={onFoundColonyRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : isFoundColonyActive
                ? "Pick a glowing tile on the map, or click again to cancel."
                : canFoundColony
                  ? "Send a pop from an existing settlement to found a new colony."
                  : "Requires an open tile, a spare pop, and enough resources."
          }
        >
          <AtlasIcon icon="colony" className="commandIcon commandAtlasIcon" />
          <span>Found</span>
        </button>

        <button
          className="commandIconButton"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || !canUpgradeCity}
          onClick={onUpgradeCityRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : canUpgradeCity
                ? "Upgrade one of your colonies into a city."
                : "Requires an upgradeable colony and enough resources."
          }
        >
          <AtlasIcon icon="city" className="commandIcon commandAtlasIcon" />
          <span>Upgrade</span>
        </button>

        <button
          className="commandEndTurn"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent}
          onClick={onEndTurn}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : isActive
                ? "End the current player's turn."
                : "Current player's turn only."
          }
        >
          <UiSprite item="endTurn" className="endTurnSprite" />
          <span>End Turn</span>
        </button>
      </div>

      <DeckShelf G={G} />

      <ActionLogPanel G={G} />
    </div>
  );
}
