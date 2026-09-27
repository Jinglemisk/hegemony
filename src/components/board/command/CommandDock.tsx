import { AnnotatedText } from "../../AnnotatedText";
import { useGameUi } from "../GameUiContext";
import { CommandVerb } from "./CommandVerb";
import { VERBS, type VerbContext, type VerbHandlers, type VerbId } from "./verbs";

/**
 * The bottom rail: a bone ceramic bar carrying the seven verbs, each disc
 * standing proud of its top edge.
 *
 * It used to carry a dial at each end as well — the season clock at bottom left,
 * the END TURN seal at bottom right. Both moved into the single turn dial in the
 * top bar. What that bought is the board's two bottom corners back: the bar is
 * now one flat run of verbs, and the only round masses on it are the seven
 * things you press to act.
 *
 * The chronicle's newest line tickers along the bar's left half, where it has
 * room to be long without ever crowding the verbs.
 */
export function CommandDock({
  canGrowPops,
  canMovePops,
  canFoundColony,
  canUpgradeCity,
  canBuild,
  armedVerb,
  chronicleTicker,
  targetLabel,
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
  /** Selected owned settlement, if one should contextualize targetable verbs. */
  targetLabel?: string;
} & VerbHandlers) {
  const { G, viewer, phase, isActive, hasPendingPlayerEvent } = useGameUi();

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
    targetLabel,
    armedVerb,
    calmUsed: viewer.civicCalmUsedThisTurn,
    ventureUsed: viewer.ventureUsedThisTurn,
  };

  return (
    <div className="commandDock">
      <div className="verbSpine" aria-label="Action toolbar">
        {VERBS.map((verb) => (
          <CommandVerb context={context} handlers={handlers} key={verb.id} verb={verb} />
        ))}
      </div>

      {/* The narration: it has the whole left half to be long in, and it can
          never reach the verbs.

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
    </div>
  );
}
