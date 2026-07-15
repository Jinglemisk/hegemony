import type { Phase } from "../../../game/controller";
import type { HegemonyState } from "../../../game/types";
import { phaseHint } from "../../../ui/formatters";
import { UiSprite } from "../../Sprites";
import { ActionLogPanel } from "./ActionLogPanel";
import { DeckShelf } from "./DeckShelf";
import { CommandVerb, END_TURN_VERB, VERBS, isVerbEnabled, verbTitle, type VerbContext, type VerbHandlers } from "./verbs";

/**
 * The verbs' current home. The bar itself is now `VERBS.map(...)` — this panel
 * only decides *where* that row lives, which is the whole point of R3: Q17 moves
 * the row to a bottom command bar by mounting the same map somewhere else.
 */
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
  ...handlers
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
} & VerbHandlers) {
  const context: VerbContext = {
    G,
    phase,
    isActive,
    hasPendingPlayerEvent,
    canGrowPops,
    canMovePops,
    canFoundColony,
    canUpgradeCity,
    isFoundColonyActive,
    calmUsed,
    ventureUsed
  };

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
        {VERBS.map((verb) => (
          <CommandVerb context={context} handlers={handlers} key={verb.id} verb={verb} />
        ))}

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

      <DeckShelf G={G} />

      <ActionLogPanel G={G} />
    </div>
  );
}
