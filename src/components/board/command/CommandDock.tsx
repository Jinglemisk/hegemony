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
    armedVerb,
    calmUsed: viewer.civicCalmUsedThisTurn,
    ventureUsed: viewer.ventureUsedThisTurn,
  };

  return (
    <div className="commandDock">
      {/* The bar's two end blocks. They are the frame's corners: the bottom bar
          steps up at each end to a block deep enough to seat a dial, and the
          tablet above lands on it. Without them the tablet's bottom edge, the
          rail's, and the bar's all ended in mid-air a hundred pixels apart with
          open sea between them, and a disc floated in the gap (FRAME-1).
          They are drawn here rather than as more pseudo-elements because the
          bar already spends both of its own on the plate and the meander, and
          each block carries a meander of its own along its top. */}
      <div aria-hidden="true" className="dockPlinth dockPlinth-left" />
      <div aria-hidden="true" className="dockPlinth dockPlinth-right" />

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
