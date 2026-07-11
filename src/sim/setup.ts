import { TEST_OPENING_SETUP } from "../game/config";
import { applyMove, enumerateLegalMoves } from "../game/legalMoves";
import type { LegalMove } from "../game/legalMoves";
import { GAME_MODES, deriveRuleset } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import { createInitialState } from "../game/state";
import type { HegemonyState, PlayerId } from "../game/types";
import type { OpeningKind, RulesetPatch } from "./io";
import type { SimRng } from "./rng";

export type NewGameOptions = {
  seed: number;
  mode: GameModeId;
  patch?: RulesetPatch | null;
  opening: OpeningKind;
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
export function buildNewGame({ seed, mode, patch, opening, simRng, onMove }: NewGameOptions): HegemonyState {
  const base = GAME_MODES[mode].ruleset;
  const G = createInitialState(seed, patch ? deriveRuleset(base, patch) : base);

  if (opening === "manual") {
    return G;
  }

  if (opening === "fixed") {
    if (G.ruleset.setup.length !== 2) {
      throw new Error(`--opening fixed only fits the capital+colony setup (mode ${mode} has ${G.ruleset.setup.length} placements)`);
    }

    for (const placement of TEST_OPENING_SETUP) {
      applyRecorded(G, { type: "placeCapital", tileId: placement.city.tileId, pops: placement.city.pops }, onMove);
    }
    for (const placement of TEST_OPENING_SETUP) {
      applyRecorded(G, { type: "placeColony", tileId: placement.colony.tileId, pops: placement.colony.pops }, onMove);
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
