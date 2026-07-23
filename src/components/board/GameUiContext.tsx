import { createContext, useContext } from "react";
import type { GameEvents, GameMoves, Phase } from "../../game/controller";
import type { HegemonyState, PlayerId, PlayerState } from "../../game/types";

/**
 * The shared game-UI seam (ladder rung R4). Every panel, tab and dialog needed the
 * same five things — the state, who is looking, the phase, whether they may act,
 * and the moves — so all five were threaded by hand through every layer. The tabs
 * re-declared `G / playerID / phase / isActive` five times over; only the leaves
 * actually used them.
 *
 * This is also the network-client seam the architecture report calls for: when the
 * UI converges on `applyMove`, a server-backed client swaps `moves` here and the
 * tree below is unchanged.
 *
 * NOT a state store. It carries what the controller already owns, read-only. The
 * engine stays the single source of truth (see the pure-rules-engine invariant);
 * nothing below may write to `G` except through `moves`.
 */
export type GameUi = {
  G: HegemonyState;
  /** The seat being *looked at* — whose ledger and resources are on screen. */
  viewerId: PlayerId;
  viewer: PlayerState;
  /** The seat whose turn it actually is. Differs from the viewer when spectating. */
  currentPlayerId: PlayerId;
  phase: Phase;
  /** Whether the viewer may act right now. Already folds in the seat check. */
  isActive: boolean;
  /** A drawn event blocks every verb until it is resolved. */
  hasPendingPlayerEvent: boolean;
  moves: GameMoves;
  events: GameEvents;
};

// Exported so <GameUiProvider> (split into GameUiProvider.tsx) can reach it while this
// module stays a data/hook module — a file mixing a component with the hook can't Fast
// Refresh, and useGameUi is imported by ~two dozen live panels.
export const GameUiContext = createContext<GameUi | null>(null);

export function useGameUi(): GameUi {
  const value = useContext(GameUiContext);

  if (!value) {
    throw new Error("useGameUi must be called inside <GameUiProvider>.");
  }

  return value;
}
