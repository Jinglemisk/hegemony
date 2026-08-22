import { TEST_OPENING_SETUP } from "../game/config";
import { createGameDefinition } from "../game/definition";
import type { GameDefinition } from "../game/definition";
import { getAuthoredGameContent } from "../game/content";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import { GAME_MODES, deriveRuleset } from "../game/ruleset";
import type { GameModeId } from "../game/ruleset";
import { createInitialStateFromDefinition } from "../game/state";
import type { BoardLayout, HegemonyState, PlayerId } from "../game/types";
import type { OpeningKind, RulesetPatch } from "./io";
import { choosePlacement } from "./policies";
import type { SimRng } from "./rng";

export type NewGameOptions = {
  seed: number;
  mode: GameModeId;
  patch?: RulesetPatch | null;
  /** Pre-resolved package for tuned or replayed games. */
  definition?: GameDefinition;
  opening: OpeningKind;
  /** Terrain layout. Defaults to "classic" so historical balance runs stay
   *  reproducible; realistic runs pass "shuffled" to match the live game. */
  boardLayout?: BoardLayout;
  /** Breaks placement ties (policy) or draws placements (random); unused for fixed/manual. */
  simRng: SimRng;
  /** Called once per applied setup move, for history recording. */
  onMove?: (G: HegemonyState, player: PlayerId, command: GameCommand) => void;
};

/**
 * Build a game the sim way (never via createGame — its preload flag belongs to
 * the UI). `policy` places the opening with the shared placement evaluator, `random`
 * draws seed-driven legal placements uniformly, `fixed` replays the scripted UI
 * opening, `manual` stops in setupCapital so placements can be made move-by-move.
 */
export function buildNewGame({
  seed,
  mode,
  patch,
  definition,
  opening,
  boardLayout,
  simRng,
  onMove,
}: NewGameOptions): HegemonyState {
  const base = GAME_MODES[mode].ruleset;
  const resolvedDefinition =
    definition ??
    createGameDefinition({
      ruleset: patch ? deriveRuleset(base, patch) : base,
      content: getAuthoredGameContent(),
    });
  let G = createInitialStateFromDefinition(resolvedDefinition, seed, boardLayout);

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

      const placement = TEST_OPENING_SETUP.find(
        (candidate) => candidate.playerID === G.currentPlayer,
      );
      if (!placement) {
        throw new Error(`fixed opening: no placement for player ${G.currentPlayer}`);
      }

      const command: GameCommand =
        G.phase === "setupCapital"
          ? { type: "placeCapital", tileId: placement.capital.tileId, pops: placement.capital.pops }
          : { type: "placeColony", tileId: placement.colony.tileId, pops: placement.colony.pops };
      G = applyRecorded(G, command, onMove);
    }

    return G;
  }

  // policy / random: place until setup completes — scored, or drawn uniformly.
  let guard = 0;

  while (G.phase !== "gameplay") {
    if (guard++ > 64) {
      throw new Error(`setup did not converge (seed ${seed}, mode ${mode})`);
    }

    const commands = enumerateLegalCommands(G, G.currentPlayer);

    if (commands.length === 0) {
      throw new Error(
        `no legal setup placement for player ${G.currentPlayer} (seed ${seed}, mode ${mode})`,
      );
    }

    const command =
      opening === "policy" ? choosePlacement(G, commands, simRng) : simRng.pick(commands);
    G = applyRecorded(G, command, onMove);
  }

  return G;
}

function applyRecorded(
  G: HegemonyState,
  command: GameCommand,
  onMove?: (G: HegemonyState, player: PlayerId, command: GameCommand) => void,
): HegemonyState {
  const player = G.currentPlayer;
  const result = transition(G.definition, G, player, command);

  if (!result.ok) {
    throw new Error(`setup command rejected: ${JSON.stringify(command)}`);
  }

  onMove?.(result.state, player, command);
  return result.state;
}
