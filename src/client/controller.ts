import { useEffect, useMemo, useState } from "react";
import { DEV_ROTATION_SEEDS, GAME_CONFIG } from "../game/config";
import { mulberry32 } from "../game/core/rng";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import type { BoardLayout, HegemonyState, Phase, PlayerId } from "../game/types";
import { createGameFromDefinition } from "../game/turn";
import { GAME_MODES } from "../game/ruleset";
import { loadStartAtAssembly, resolveTunedDefinition } from "../dev/tuning";
import { createBrowserSeed } from "./seed";
import { choosePlacement } from "../sim/policies";
import { createSimRng, deriveBotSeed } from "../sim/rng";
import { createCommandEvents, createCommandMoves, reduceGameCommand } from "./commandAdapter";

export type { GameEvents, GameMoves } from "./commandAdapter";

export type { Phase } from "../game/types";

/**
 * URL-driven game options, so a browser session can pick the board and seed without a
 * lobby: `?board=shuffled&seed=42` for a randomized layout, `?setup=manual` to place
 * the opening towns by hand, `?dev=preload` to replay the fixed scripted opening,
 * `?opening=random` for the old uniform draw instead of policy placement.
 *
 * Default dev behavior: the opening is auto-played by the sim's placement policy (the
 * same brain the bots use, seeded from the game seed), and the seed rotates through
 * {@link DEV_ROTATION_SEEDS} on every reload — testing never starts at "place your
 * capital" unless asked to.
 */
function createGameFromUrl(): HegemonyState {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const boardParam = params?.get("board");
  const boardLayout: BoardLayout =
    boardParam === "shuffled" || boardParam === "classic" ? boardParam : GAME_CONFIG.boardLayout;
  const seedParam = Number(params?.get("seed"));
  const pinnedSeed =
    Number.isFinite(seedParam) && params?.get("seed") ? seedParam >>> 0 : undefined;
  const matchSeed = pinnedSeed ?? createBrowserSeed();
  const manualSetup = params?.get("setup") === "manual";
  const preload = params?.get("dev") === "preload" || GAME_CONFIG.preloadOpeningSetupForTesting;

  // Resolve one immutable definition before state creation. Existing matches keep their
  // pinned package even if the tuning controls are changed for the next reset.
  const definition = resolveTunedDefinition(GAME_MODES[GAME_CONFIG.mode].ruleset);

  if (preload) {
    // The scripted opening only fits the classic board's tiles.
    return createGameFromDefinition(definition, matchSeed, "classic", true);
  }

  const seed =
    pinnedSeed ?? (GAME_CONFIG.autoOpeningForDev && !manualSetup ? nextRotationSeed() : matchSeed);
  let G = createGameFromDefinition(definition, seed, boardLayout, false);

  if (!manualSetup && GAME_CONFIG.autoOpeningForDev) {
    G = autoPlayOpening(G, params?.get("opening") === "random");
  }

  // `?dev=assembly` fast-forwards to the first Assembly. The agora sits in the spring
  // of Year 2 — sixteen turns in — and neither a playtest nor a browser check should
  // have to click through a whole year to reach the feature under test. The TUNE panel's
  // "Start at Assembly" toggle sets the same fast-forward as a sticky dev flag, so a plain
  // map regen (reload or Apply) lands there too — no URL param, no sixteen End Turn clicks.
  if (params?.get("dev") === "assembly" || (import.meta.env.DEV && loadStartAtAssembly())) {
    G = fastForwardToAssembly(G);
  }

  // `?dev=assembly2` goes one sitting further, and it is a TEST AFFORDANCE, not a
  // rule: it plays the first Assembly out through the same legal-command path and
  // stops at the next one. The first Assembly always convenes at 0 of 6 laws with
  // every orator on zero, so the six-law cap, a stele with more than one pip, a
  // repeal on the ballot and a non-empty voice ledger were all unreachable in a
  // browser — reviewable only by playing sixteen turns and then a whole sitting
  // by hand. Nothing here touches the engine; it drives it.
  if (params?.get("dev") === "assembly2") {
    G = fastForwardToAssembly(G);
    G = playOutAssembly(G);
    G = fastForwardToAssembly(G);
  }

  return G;
}

/** Resolve the sitting that is open, biased toward landing Laws on the board: draw,
 *  propose what you drew, and vote yea. A sitting that passes nothing leaves the
 *  next Assembly looking exactly like the first, which is the state this exists to
 *  get past. */
function playOutAssembly(initial: HegemonyState): HegemonyState {
  let G = initial;
  let rngState = G.seed ^ 0x1d872b41;
  let guard = 0;

  const preferred = new Set(["assemblyDraw", "assemblyPropose", "assemblyClose"]);

  while (G.assembly && G.phase === "gameplay" && guard++ < 400) {
    const player =
      G.assembly.phase === "voting" ? G.assembly.voteOrder[G.assembly.voteIndex] : null;
    const actor = player ?? G.assembly.activePlayer ?? G.currentPlayer;
    const commands = enumerateLegalCommands(G, actor);

    if (commands.length === 0) {
      return G;
    }

    const step = mulberry32(rngState);
    rngState = step.state;
    const yea = commands.find((command) => command.type === "assemblyVote" && command.yea);
    const wanted = commands.find((command) => preferred.has(command.type));
    const command = yea ?? wanted ?? commands[Math.floor(step.value * commands.length)];

    const result = transition(G.definition, G, actor, command);

    if (!result.ok) {
      // Fall back to whatever the engine will accept rather than spinning: this is
      // a dev shortcut, and a stuck one is worse than an imperfect one.
      const any = commands.find(
        (candidate) => transition(G.definition, G, actor, candidate).ok === true,
      );

      if (!any) {
        return G;
      }

      const forced = transition(G.definition, G, actor, any);
      G = forced.ok ? forced.state : G;
      continue;
    }

    G = result.state;
  }

  return G;
}

/** Play seed-driven legal commands until the Assembly convenes (or the game ends). Uses
 *  the same enumerate→transition path the sim does, so events and riots along the way
 *  resolve through the real engine rather than being skipped. */
function fastForwardToAssembly(initial: HegemonyState): HegemonyState {
  let G = initial;
  let rngState = G.seed ^ 0x5bf03635;
  let guard = 0;

  while (!G.assembly && G.phase === "gameplay" && guard++ < 4000) {
    const commands = enumerateLegalCommands(G, G.currentPlayer);

    if (commands.length === 0) {
      return G;
    }

    const step = mulberry32(rngState);
    rngState = step.state;
    // Bias hard toward ending the turn: the point is to reach spring of Year 2, not
    // to play a good game on the way there.
    const endTurnCommand = commands.find((command) => command.type === "endTurn");
    const command =
      endTurnCommand && step.value < 0.7
        ? endTurnCommand
        : commands[Math.floor(step.value * commands.length)];

    const result = transition(G.definition, G, G.currentPlayer, command);
    if (!result.ok) {
      return G;
    }
    G = result.state;
  }

  return G;
}

/** Next seed from the dev rotation — a localStorage cursor advances it once per page
 *  load (memoized so StrictMode's double state-initialization doesn't skip seeds). */
let rotationSeedThisLoad: number | null = null;

function nextRotationSeed(): number {
  if (rotationSeedThisLoad !== null) {
    return rotationSeedThisLoad;
  }

  const key = "hegemony-dev-opening-index";
  let index = 0;

  try {
    index = Number(window.localStorage.getItem(key) ?? 0) || 0;
    window.localStorage.setItem(key, String((index + 1) % DEV_ROTATION_SEEDS.length));
  } catch {
    // Storage unavailable (private mode etc.) — a fixed first seed is fine.
  }

  rotationSeedThisLoad = DEV_ROTATION_SEEDS[index % DEV_ROTATION_SEEDS.length];
  return rotationSeedThisLoad;
}

/** Play the opening the sim way — the shared placement policy, or a uniform draw when
 *  asked — with a bot stream derived from the game seed exactly as `runGame` does, so
 *  the browser and the headless sim place identically for a seed. Lands in gameplay. */
function autoPlayOpening(initial: HegemonyState, uniform: boolean): HegemonyState {
  let G = initial;
  const rng = createSimRng(deriveBotSeed(G.seed));
  let guard = 0;

  while (G.phase !== "gameplay" && guard++ < 64) {
    const commands = enumerateLegalCommands(G, G.currentPlayer);

    if (commands.length === 0) {
      return G; // leave whatever remains to manual play rather than crash
    }

    const command = uniform ? rng.pick(commands) : choosePlacement(G, commands, rng);
    const result = transition(G.definition, G, G.currentPlayer, command);
    if (!result.ok) {
      return G;
    }
    G = result.state;
  }

  return G;
}

/** Read-only projection of the turn fields now living on {@link HegemonyState}, kept for the UI's convenience. */
export type LocalContext = {
  currentPlayer: PlayerId;
  phase: Phase;
  turn: number;
};

function deriveContext(G: HegemonyState): LocalContext {
  return { currentPlayer: G.currentPlayer, phase: G.phase, turn: G.turn };
}

export function useHegemonyGame() {
  const [playerID, setPlayerID] = useState<PlayerId>("0");
  const [G, setG] = useState<HegemonyState>(createGameFromUrl);

  useEffect(() => {
    // The async assembly proposal lets every seat act at once, so the viewer stays put
    // and switches by hand; snapping it to currentPlayer would fight that. Every other
    // phase is single-actor, so the viewer follows the turn as before.
    if (G.assembly?.phase === "proposal") {
      return;
    }
    setPlayerID(G.currentPlayer);
  }, [G.currentPlayer, G.assembly?.phase]);

  const moves = useMemo(
    () =>
      createCommandMoves((command, actor) => {
        setG((previous) => reduceGameCommand(previous, actor ?? previous.currentPlayer, command));
      }),
    [],
  );
  const events = useMemo(
    () =>
      createCommandEvents((command, actor) => {
        setG((previous) => reduceGameCommand(previous, actor ?? previous.currentPlayer, command));
      }),
    [],
  );
  const view = useMemo(() => projectForPlayer(G.definition, G, playerID), [G, playerID]);
  // Rebuild the whole game from URL + current dev tuning overrides. Reuses this page
  // load's rotation seed, so a re-tune re-rolls the SAME board with new params (clean A/B).
  const resetGame = useMemo(() => () => setG(createGameFromUrl()), []);
  // Stable while G is unchanged, so memoized panels that read the turn context don't re-render on unrelated UI state.
  const ctx = useMemo(() => deriveContext(view.state), [view.state]);

  return {
    game: { G: view.state, ctx },
    view,
    playerID,
    setPlayerID,
    moves,
    events,
    resetGame,
    isActive: view.eligibleActors.includes(playerID),
  };
}

/**
 * UI convenience methods construct intent-only commands and pass them to the same
 * atomic transition used by simulation and replay. Rejections preserve the previous
 * state reference, so React does not render a partial or invalid command result.
 */
