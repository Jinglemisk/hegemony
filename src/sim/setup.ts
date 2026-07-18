import { TEST_OPENING_SETUP } from "../game/config";
import { applyMove, enumerateLegalMoves } from "../game/legalMoves";
import type { LegalMove } from "../game/legalMoves";
import { GAME_MODES, deriveRuleset } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import { createInitialState } from "../game/state";
import type { BoardLayout, HegemonyState, PlayerId } from "../game/types";
import type { OpeningKind, RulesetPatch } from "./io";
import type { SimRng } from "./rng";

export type NewGameOptions = {
  seed: number;
  mode: GameModeId;
  patch?: RulesetPatch | null;
  opening: OpeningKind;
  /** Terrain layout. Defaults to "classic" so historical balance runs stay
   *  reproducible; realistic runs pass "shuffled" to match the live game. */
  boardLayout?: BoardLayout;
  /** Decides random-opening placements; unused for fixed/manual openings. */
  simRng: SimRng;
  /** Called once per applied setup move, for history recording. */
  onMove?: (G: HegemonyState, player: PlayerId, move: LegalMove) => void;
};

/**
 * Build a game the sim way (never via createGame — its preload flag belongs to
 * the UI). `random` plays seed-driven legal placements to gameplay, `fixed`
 * replays the scripted UI opening, `manual` stops in setupCapital so placements
 * can be made move-by-move.
 */
export function buildNewGame({ seed, mode, patch, opening, boardLayout, simRng, onMove }: NewGameOptions): HegemonyState {
  const base = GAME_MODES[mode].ruleset;
  const G = createInitialState(seed, patch ? deriveRuleset(base, patch) : base, boardLayout);

  if (opening === "manual") {
    return G;
  }

  if (opening === "fixed") {
    if (G.ruleset.setup.join() !== "capital,colony") {
      throw new Error(`--opening fixed only fits the capital+colony standard setup (mode ${mode})`);
    }

    // The setup machine runs snake order; follow whoever it says is up.
    let guard = 0;
    while (G.phase !== "gameplay") {
      if (guard++ > 16) {
        throw new Error(`fixed opening did not converge (mode ${mode})`);
      }

      const placement = TEST_OPENING_SETUP.find((candidate) => candidate.playerID === G.currentPlayer);
      if (!placement) {
        throw new Error(`fixed opening: no placement for player ${G.currentPlayer}`);
      }

      const move: LegalMove =
        G.phase === "setupCapital"
          ? { type: "placeCapital", tileId: placement.capital.tileId, pops: placement.capital.pops }
          : { type: "placeColony", tileId: placement.colony.tileId, pops: placement.colony.pops };
      applyRecorded(G, move, onMove);
    }

    return G;
  }

  // random: pick uniformly among legal placements until setup completes.
  let guard = 0;

  while (G.phase !== "gameplay") {
    if (guard++ > 64) {
      throw new Error(`setup did not converge (seed ${seed}, mode ${mode})`);
    }

    const moves = enumerateLegalMoves(G, G.currentPlayer);

    if (moves.length === 0) {
      throw new Error(`no legal setup placement for player ${G.currentPlayer} (seed ${seed}, mode ${mode})`);
    }

    applyRecorded(G, simRng.pick(moves), onMove);
  }

  return G;
}

function applyRecorded(
  G: HegemonyState,
  move: LegalMove,
  onMove?: (G: HegemonyState, player: PlayerId, move: LegalMove) => void,
) {
  const player = G.currentPlayer;
  const result = applyMove(G, player, move);

  if (!result.ok) {
    throw new Error(`setup move rejected: ${JSON.stringify(move)}`);
  }

  onMove?.(G, player, move);
}
