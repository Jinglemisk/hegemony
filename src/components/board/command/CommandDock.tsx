import { AnnotatedText } from "../../AnnotatedText";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { PLAYER_NAMES } from "../../../game/data";
import { useGameUi } from "../GameUiContext";
import { CommandVerb } from "./CommandVerb";
import { EndTurnSeal } from "./EndTurnSeal";
import { SeasonClock } from "./SeasonClock";
import {
  END_TURN_VERB,
  VERBS,
  isVerbEnabled,
  verbTitle,
  type VerbContext,
  type VerbHandlers,
  type VerbId,
} from "./verbs";

/**
 * The bottom rail: a bone ceramic bar with the seven verbs dead-centre and a
 * dial protruding from each end.
 *
 * The two dials are a matched pair on purpose — the season clock at bottom left
 * says what time it is, the END TURN seal at bottom right is how you spend it,
 * and they bracket the verbs between them. They are the only round masses in the
 * chrome, so the eye finds both instantly and never confuses either for a verb.
 *
 * The chronicle's newest line still tickers along the bar, inboard of the clock,
 * where it has room to be long without ever crowding the verbs.
 */
export function CommandDock({
  canGrowPops,
  canMovePops,
  canFoundColony,
  canUpgradeCity,
  canBuild,
  armedVerb,
  chronicleTicker,
  ...handlers
}: {
  canGrowPops: boolean;
  canMovePops: boolean;
  canFoundColony: boolean;
  canUpgradeCity: boolean;
  canBuild: boolean;
  /** The verb that currently holds the map, if any (`armedVerbOf`). */
  armedVerb: VerbId | null;
  /** Latest chronicle line — the drawer's contents at a glance (Q19). */
  chronicleTicker: string | null;
} & VerbHandlers) {
  const { G, viewer, phase, isActive, hasPendingPlayerEvent, currentPlayerId } = useGameUi();

  const context: VerbContext = {
    G,
    playerID: viewer.id,
    phase,
    isActive,
    hasPendingPlayerEvent,
    canGrowPops,
    canMovePops,
    canFoundColony,
    canUpgradeCity,
    canBuild,
    armedVerb,
    calmUsed: viewer.civicCalmUsedThisTurn,
    ventureUsed: viewer.ventureUsedThisTurn,
  };

  const endTurnEnabled = isVerbEnabled(END_TURN_VERB, context);
  const endTurnExplanation = verbTitle(END_TURN_VERB, context);

  return (
    <div className="commandDock">
      <SeasonClock G={G} />

      <div className="verbSpine" aria-label="Action toolbar">
        {VERBS.map((verb) => (
          <CommandVerb context={context} handlers={handlers} key={verb.id} verb={verb} />
        ))}
      </div>

      {/* The narration, inboard of the clock: it has the whole left half to be
          long in, and it can never reach the verbs.

          It is the SAME line the chronicle is showing a few hundred pixels away,
          so it is rendered the same way — the bar used to print the raw message,
          "-5 wood" in flat ink, while the chronicle printed "-5 Wood" in oxblood
          with a timber glyph. One event, two voices, both on screen at once.

          Unlinked, like the chronicle: a status line is not a place you act, and
          the dock already carries every tab stop it should. */}
      <div className="dockTicker">
        {chronicleTicker ? (
          <p className="caption">
            <AnnotatedText links={false} text={chronicleTicker} />
          </p>
        ) : null}
      </div>

      <Tooltip
        content={
          <MechanicsDetails
            blockedReason={endTurnEnabled ? undefined : endTurnExplanation}
            heading="End Turn"
          >
            {endTurnEnabled ? <p className="mechanicsExplanation">{endTurnExplanation}</p> : null}
          </MechanicsDetails>
        }
        preferredPlacement="above"
        triggerClassName="endTurnTooltipTrigger"
      >
        <EndTurnSeal
          actingName={PLAYER_NAMES[currentPlayerId]}
          disabled={!endTurnEnabled}
          onClick={() => END_TURN_VERB.select(handlers)}
        />
      </Tooltip>
    </div>
  );
}
