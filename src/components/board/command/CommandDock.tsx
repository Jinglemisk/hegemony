import { UiSprite } from "../../Sprites";
import { PLAYER_NAMES } from "../../../game/data";
import { yearOf } from "../../../game/rules";
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
 * The bottom dock (ui-refit Step 3), KYKLOS mode A. The fused command bar splits
 * into placed pieces: the verb discs thread on a spine across the centre, the
 * chronicle's newest line tickers bottom-left, and the commit anchors
 * bottom-right — the whose-turn box above the one dark-red *square*, End Turn.
 *
 * The circle law: every verb is a disc because you press it repeatedly; the only
 * square control is the commit, so it can never be misfired for a verb. Resources
 * left this band entirely — they now ride the top bar, split around the medallion.
 */
export function CommandDock({
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
  const { G, viewer, phase, isActive, hasPendingPlayerEvent, currentPlayerId } = useGameUi();

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

  const seasonsLeft = G.seasonalDrawPile.length;
  const boardLabel = G.boardLayout === "classic" ? "Classic" : "Shuffled";

  return (
    <div className="commandDock">
      {/* The clock reads from the spine's left end, on bone. */}
      <div className="dockSeason">
        <span className="dockSeasonYear">Year {yearOf(G.season)}</span>
        <span className="dockSeasonSub">
          {seasonsLeft} season{seasonsLeft === 1 ? "" : "s"} remain
        </span>
        <span className="dockSeasonDecks">
          Seasonal {seasonsLeft} · Events {G.playerDrawPile.length} · {boardLabel} #{G.seed}
        </span>
      </div>

      <div className="verbSpine" aria-label="Action toolbar">
        {VERBS.map((verb) => (
          <CommandVerb context={context} handlers={handlers} key={verb.id} verb={verb} />
        ))}
      </div>

      <div className="dockCommit">
        {/* The narration sits between the verbs and the commit. */}
        <div className="dockTicker">
          {chronicleTicker ? <p title={chronicleTicker}>{chronicleTicker}</p> : null}
        </div>

        <div className="dockCommitStack">
          <div className="turnbox">
            <span className="turnboxLabel">{isActive ? "Your turn" : "Now acting"}</span>
            <strong>{PLAYER_NAMES[currentPlayerId]}</strong>
          </div>
          <button
            className="endTurnSquare"
            disabled={!isVerbEnabled(END_TURN_VERB, context)}
            onClick={() => END_TURN_VERB.select(handlers)}
            title={verbTitle(END_TURN_VERB, context)}
          >
            <UiSprite item="endTurn" className="endTurnSquareIcon" />
            <span>End Turn</span>
          </button>
        </div>
      </div>
    </div>
  );
}
