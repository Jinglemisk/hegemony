import type { Phase } from "../../../game/controller";
import { POP_TYPES } from "../../../game/rules";
import type { HegemonyState, Resources } from "../../../game/types";
import { phaseHint } from "../../../ui/formatters";
import { AtlasIcon, UiSprite } from "../../Sprites";
import { ActionLogPanel } from "./ActionLogPanel";
import { DeckShelf } from "./DeckShelf";
import { ResourceChips } from "../ResourceChips";

function ResourceCost({ cost }: { cost: Partial<Resources> }) {
  return (
    <ResourceChips
      resources={cost}
      variant="cost"
      className="commandVerbCost"
      chipClassName="commandVerbCostItem"
      iconClassName="commandVerbCostIcon"
    />
  );
}

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
  calmUsed,
  ventureUsed,
  onMovePopsRequest,
  onGrowPopRequest,
  onFoundColonyRequest,
  onUpgradeCityRequest,
  onCalmRequest,
  onVentureRequest,
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
  calmUsed: boolean;
  ventureUsed: boolean;
  onMovePopsRequest: () => void;
  onGrowPopRequest: () => void;
  onFoundColonyRequest: () => void;
  onUpgradeCityRequest: () => void;
  onCalmRequest: () => void;
  onVentureRequest: () => void;
  onEndTurn: () => void;
}) {
  const foundCost = G.ruleset.actionCosts.foundColony;
  const upgradeCost = G.ruleset.actionCosts.upgradeColonyToCity;
  const minGrowFood = Math.min(
    ...POP_TYPES.map((pop) => G.ruleset.growPopCosts[pop].food ?? Number.POSITIVE_INFINITY)
  );

  return (
    <div className="commandStack">
      <div className="panelTitle compactPanelTitle">
        <UiSprite item="voteToken" className="titleIcon" />
        <div>
          <h2>Actions</h2>
          <span>{phase === "gameplay" ? "What you can do this turn" : phaseHint(phase)}</span>
        </div>
      </div>

      <div className="commandToolbar" aria-label="Action toolbar">
        <button
          className="commandVerb"
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
          <span className="commandVerbBody">
            <strong>Grow</strong>
            <span className="commandVerbCost">
              <em>from</em>
              <ResourceChips
                resources={{ food: minGrowFood }}
                variant="cost"
                chipClassName="commandVerbCostItem"
                iconClassName="commandVerbCostIcon"
              />
            </span>
          </span>
        </button>

        <button
          className="commandVerb"
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
          <span className="commandVerbBody">
            <strong>Move</strong>
            <span className="commandVerbCost">
              <em>free</em>
            </span>
          </span>
        </button>

        <button
          aria-pressed={isFoundColonyActive}
          className={isFoundColonyActive ? "commandVerb commandIconActive" : "commandVerb"}
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
          <span className="commandVerbBody">
            <strong>Found</strong>
            <ResourceCost cost={foundCost} />
          </span>
        </button>

        <button
          className="commandVerb"
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
          <span className="commandVerbBody">
            <strong>Upgrade</strong>
            <ResourceCost cost={upgradeCost} />
          </span>
        </button>

        <button
          className="commandVerb"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || calmUsed}
          onClick={onCalmRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : calmUsed
                ? "One civic-calm action per turn — already used."
                : "Buy happiness: influence or gold, once per turn."
          }
        >
          <UiSprite item="voteToken" className="commandIcon" />
          <span className="commandVerbBody">
            <strong>Calm</strong>
            <span className="commandVerbCost">
              <em>from</em>
              <ResourceChips
                resources={{ influence: G.ruleset.civicCalm.influenceCost }}
                variant="cost"
                chipClassName="commandVerbCostItem"
                iconClassName="commandVerbCostIcon"
              />
            </span>
          </span>
        </button>

        <button
          className="commandVerb"
          disabled={!isActive || phase !== "gameplay" || hasPendingPlayerEvent || ventureUsed}
          onClick={onVentureRequest}
          title={
            hasPendingPlayerEvent
              ? "Resolve the pending player event first."
              : ventureUsed
                ? "One venture per turn — the ships are already out."
                : "Fund an expedition: stake gold or wood, roll the table."
          }
        >
          <UiSprite item="seal" className="commandIcon" />
          <span className="commandVerbBody">
            <strong>Venture</strong>
            <span className="commandVerbCost">
              <em>stake</em>
              <ResourceChips
                resources={{ gold: G.ruleset.ventureStakes.gold.gold }}
                variant="cost"
                chipClassName="commandVerbCostItem"
                iconClassName="commandVerbCostIcon"
              />
            </span>
          </span>
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
