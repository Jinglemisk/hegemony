import { UiSprite } from "../../Sprites";
import { ResourceGrid } from "../../ResourceGrid";
import type { IncomeContribution } from "../../../game/rules";
import type { Resources } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import {
  CommandVerb,
  END_TURN_VERB,
  VERBS,
  isVerbEnabled,
  verbTitle,
  type VerbContext,
  type VerbHandlers
} from "./verbs";

/**
 * The bottom command bar (refit scope 2, Q17): resources left, verbs centre, End
 * Turn anchored right.
 *
 * The verbs used to live in a side panel, which put them a screen's width away
 * from the resources they spend. Fusing the two into one band gives the classic
 * RTS grammar — eyes drop from the board to their hands — and reclaims the entire
 * right column, because the panel that held them is now empty and gone.
 *
 * This only decides WHERE the row lives; the row itself is `VERBS.map(...)` from
 * R3, which is what made the move a layout change rather than a rewrite.
 */
export function CommandBar({
  projectedIncome,
  projectedIncomeBreakdown,
  canGrowPops,
  canMovePops,
  canFoundColony,
  canUpgradeCity,
  canBuild,
  isFoundColonyActive,
  isBuildActive,
  chronicleTicker,
  ...handlers
}: {
  projectedIncome: Resources;
  projectedIncomeBreakdown: IncomeContribution[];
  canGrowPops: boolean;
  canMovePops: boolean;
  canFoundColony: boolean;
  canUpgradeCity: boolean;
  canBuild: boolean;
  isFoundColonyActive: boolean;
  isBuildActive: boolean;
  /** Latest chronicle line — the drawer's contents at a glance (Q19). */
  chronicleTicker: string | null;
} & VerbHandlers) {
  const { G, viewerId, viewer, phase, isActive, hasPendingPlayerEvent } = useGameUi();

  const context: VerbContext = {
    G,
    phase,
    isActive,
    hasPendingPlayerEvent,
    canGrowPops,
    canMovePops,
    canFoundColony,
    canUpgradeCity,
    canBuild,
    isFoundColonyActive,
    isBuildActive,
    calmUsed: viewer.civicCalmUsedThisTurn,
    ventureUsed: viewer.ventureUsedThisTurn
  };

  return (
    <div className="commandBar">
      <div className="commandBarResources" aria-label={`${viewer.name} resources`}>
        <ResourceGrid
          breakdown={projectedIncomeBreakdown}
          className="bandResourceGrid"
          deltas={projectedIncome}
          resetKey={viewerId}
          resources={viewer.resources}
        />
      </div>

      <div className="commandBarVerbs" aria-label="Action toolbar">
        {VERBS.map((verb) => (
          <CommandVerb context={context} handlers={handlers} key={verb.id} verb={verb} />
        ))}
      </div>

      <div className="commandBarEnd">
        {chronicleTicker ? (
          <p className="commandBarTicker" title={chronicleTicker}>
            {chronicleTicker}
          </p>
        ) : null}
        <button
          className="commandEndTurn"
          disabled={!isVerbEnabled(END_TURN_VERB, context)}
          onClick={() => END_TURN_VERB.select(handlers)}
          title={verbTitle(END_TURN_VERB, context)}
        >
          <UiSprite item="endTurn" className="endTurnSprite" />
          <span>{END_TURN_VERB.label}</span>
        </button>
      </div>
    </div>
  );
}
