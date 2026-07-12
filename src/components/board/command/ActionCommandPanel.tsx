import type { Phase } from "../../../game/controller";
import { POP_TYPES } from "../../../game/rules";
import type { HegemonyState, Resources } from "../../../game/types";
import { phaseHint } from "../../../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../../../ui/resourceVisuals";
import { AtlasIcon, ResourceIcon, UiSprite } from "../../Sprites";
import { ActionLogPanel } from "./ActionLogPanel";
import { DeckShelf } from "./DeckShelf";

function ResourceCost({ cost }: { cost: Partial<Resources> }) {
  return (
    <span className="commandVerbCost">
      {RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) > 0).map((resource) => (
        <span className="commandVerbCostItem" key={resource} style={resourceCssVars(resource)}>
          <ResourceIcon resource={resource} className="commandVerbCostIcon" />
          {cost[resource]}
        </span>
      ))}
    </span>
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
              <span className="commandVerbCostItem" style={resourceCssVars("food")}>
                <ResourceIcon resource="food" className="commandVerbCostIcon" />
                {minGrowFood}
              </span>
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
              <span className="commandVerbCostItem" style={resourceCssVars("influence")}>
                <ResourceIcon resource="influence" className="commandVerbCostIcon" />
                {G.ruleset.civicCalm.influenceCost}
              </span>
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
              <span className="commandVerbCostItem" style={resourceCssVars("gold")}>
                <ResourceIcon resource="gold" className="commandVerbCostIcon" />
                {G.ruleset.ventureStakes.gold.gold}
              </span>
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
