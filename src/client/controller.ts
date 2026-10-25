import { useEffect, useMemo, useState } from "react";
import { DEV_ROTATION_SEEDS, GAME_CONFIG } from "../game/config";
import { PLAYER_IDS } from "../game/data";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import { projectForPlayer } from "../game/projection";
import type { BoardLayout, HegemonyState, Phase, PlayerId } from "../game/types";
import { createGameFromDefinition } from "../game/turn";
import { GAME_MODES, boardRulesetPatch, type GameModeId } from "../game/ruleset";
import {
  SEATS_EVENT,
  loadSeats,
  loadStartAtAssembly,
  loadTuningPresetId,
  resolveTunedDefinition,
} from "../dev/tuning";
import { DEV_SCENES, fastForwardToAssembly, playOutAssembly } from "../dev/scenes";
import type { DevShell } from "../dev/scenes";
import { createBrowserSeed } from "./seed";
import { choosePlacement, resolvePolicy } from "../sim/policies";
import type { Policy } from "../sim/policies";
import { playTurn } from "../sim/runner";
import { createSimRng, deriveBotSeed } from "../sim/rng";
import { buildNewGame } from "../sim/setup";
import { createCommandEvents, createCommandMoves, reduceGameCommand } from "./commandAdapter";

export type { GameEvents, GameMoves } from "./commandAdapter";

export type { Phase } from "../game/types";

/**
 * URL-driven game options, so a browser session can pick the board and seed without a
 * lobby: `?board=scenario&seed=42` for a quick game on the fixed authored layout,
 * `?board=archipelago` for the islands (with its island hopping of 3 hexes, which the TUNE
 * panel can override), `?mode=fastStart` for the richer treasury, `?setup=manual` to place
 * the opening towns by hand, `?setup=ideas` to auto-place but keep the Idea picker,
 * `?dev=preload` to replay the fixed scripted placements,
 * `?opening=random` for the old uniform draw instead of policy placement, and
 * `?dev=bots` to let the sim's bots play every seat (`&policy=` picks which, `master`
 * by default) — a whole game played through the shell, one turn per tick. On the dev
 * server the TUNE panel makes any seat a bot instead (see {@link readTable}).
 * On the dev server only, `?dev=assembly` (`assembly2` to `assembly7` for later sittings)
 * fast-forwards to an Assembly, and the scenes in src/dev/scenes.ts open their moment.
 *
 * Default dev behavior: the opening is auto-played by the sim's placement policy (the
 * same brain the bots use, seeded from the game seed), and the seed rotates through
 * {@link DEV_ROTATION_SEEDS} on every reload — testing never starts at "place your
 * capital" unless asked to. Quick starts also score every seat's setup Idea.
 */
function createGameFromUrl(): { G: HegemonyState; shell: DevShell } {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const boardParam = params?.get("board");
  const boardLayout: BoardLayout =
    boardParam === "continental" || boardParam === "archipelago" || boardParam === "scenario"
      ? boardParam
      : GAME_CONFIG.boardLayout;
  const seedParam = Number(params?.get("seed"));
  const pinnedSeed =
    Number.isFinite(seedParam) && params?.get("seed") ? seedParam >>> 0 : undefined;
  const matchSeed = pinnedSeed ?? createBrowserSeed();
  const manualSetup = params?.get("setup") === "manual";
  const keepIdeaPicker = params?.get("setup") === "ideas";
  const modeParam = params?.get("mode");
  const mode: GameModeId =
    modeParam === "standard" || modeParam === "fastStart" || modeParam === "deathmatch"
      ? modeParam
      : GAME_CONFIG.mode;
  const dev = params?.get("dev") ?? "";
  const preload = params?.get("dev") === "preload" || GAME_CONFIG.preloadOpeningSetupForTesting;
  const startAtAssembly = import.meta.env.DEV && loadStartAtAssembly();
  const devAutoOpening = import.meta.env.DEV && GAME_CONFIG.autoOpeningForDev;
  const autoOpening =
    !manualSetup &&
    (keepIdeaPicker ||
      pinnedSeed !== undefined ||
      mode === "fastStart" ||
      preload ||
      dev === "bots" ||
      (import.meta.env.DEV && (Object.hasOwn(DEV_SCENES, dev) || /^assembly([2-7])?$/.test(dev))) ||
      startAtAssembly ||
      (import.meta.env.DEV && loadTuningPresetId() !== null) ||
      devAutoOpening);

  // Resolve one immutable definition before state creation, with the settings of the
  // board it plays. Existing matches keep their pinned package even if the tuning controls
  // are changed for the next reset.
  const base = GAME_MODES[mode].ruleset;

  if (preload && autoOpening && !keepIdeaPicker) {
    // Fix placement only; Ideas use the same scorer as other quick starts.
    const G = buildNewGame({
      definition: resolveTunedDefinition(base, boardRulesetPatch("scenario")),
      seed: matchSeed,
      mode,
      boardLayout: "scenario",
      opening: "fixed",
      simRng: createSimRng(deriveBotSeed(matchSeed)),
    });
    return { G, shell: {} };
  }

  const seed = pinnedSeed ?? (autoOpening && devAutoOpening ? nextRotationSeed() : matchSeed);
  const definition = resolveTunedDefinition(base, boardRulesetPatch(boardLayout));
  let G = createGameFromDefinition(definition, seed, boardLayout, false);

  if (autoOpening) {
    G = autoPlayOpening(G, params?.get("opening") === "random", !keepIdeaPicker && dev !== "draft");
  }

  let shell: DevShell = {};
  if (import.meta.env.DEV && !manualSetup && Object.hasOwn(DEV_SCENES, dev)) {
    ({ G, shell = {} } = DEV_SCENES[dev](G));
  }

  // `?dev=assembly` fast-forwards to the first Assembly. The agora sits at the start
  // of Year 2 — four turns in — and neither a playtest nor a browser check should
  // have to click through a whole year to reach the feature under test. The TUNE panel's
  // "Start at Assembly" toggle sets the same fast-forward as a sticky dev flag, so a plain
  // map regen (reload or Apply) lands there too — no URL param, no sixteen End Turn clicks.
  if (
    import.meta.env.DEV &&
    !manualSetup &&
    !keepIdeaPicker &&
    (dev === "assembly" || startAtAssembly)
  ) {
    G = fastForwardToAssembly(G);
  }

  // Later sittings expose standing Laws; Year 8 includes eligible Year 4 repeals.
  const laterSitting =
    import.meta.env.DEV && !manualSetup && !keepIdeaPicker
      ? Number(dev.match(/^assembly([2-7])$/)?.[1] ?? 0)
      : 0;
  if (laterSitting) {
    G = fastForwardToAssembly(G);
    for (let sitting = 1; sitting < laterSitting; sitting++) {
      G = playOutAssembly(G);
      G = fastForwardToAssembly(G);
    }
  }

  return { G, shell };
}

/**
 * Who plays each seat. People share this screen and take their seats in turn (hotseat);
 * the rest are the sim's bots, which the browser plays. The engine never knows which is
 * which. Every seat is a person in a build, every seat a bot under `?dev=bots`, and on
 * the dev server the TUNE panel's seat setting decides.
 */
type Table = { humans: PlayerId[]; bots: Partial<Record<PlayerId, Policy>> };

function readTable(): Table {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  if (params?.get("dev") === "bots") {
    const policy = resolvePolicy(params.get("policy") ?? "master");
    return { humans: [], bots: Object.fromEntries(PLAYER_IDS.map((id) => [id, policy])) };
  }
  const seats = import.meta.env.DEV ? loadSeats() : null;
  const humans = PLAYER_IDS.filter((id) => !seats || seats[id] === "human");
  return {
    humans,
    bots: Object.fromEntries(
      PLAYER_IDS.filter((id) => seats && !humans.includes(id)).map((id) => [
        id,
        resolvePolicy(seats![id]),
      ]),
    ),
  };
}

/**
 * The private moment the screen is about to belong to, as a key that changes with each
 * one: a person's turn, or a person's Assembly proposal until it seals. Null in a public
 * phase (setup, the Idea draft, the preparation once every seat has sealed, the vote,
 * the house rising, the game's end), and for a bot's seat, which needs no screen. In
 * hotseat each new key waits behind the turn notice until its seat begins.
 */
export function privateMoment(
  G: HegemonyState,
  humans: readonly PlayerId[] = PLAYER_IDS,
): string | null {
  if (G.phase !== "gameplay" || !humans.includes(G.currentPlayer)) return null;
  if (!G.assembly) return `turn:${G.turn}`;
  return G.assembly.phase === "proposal" && !G.assembly.proposalDone[G.currentPlayer]
    ? `proposal:${G.assembly.year}:${G.currentPlayer}`
    : null;
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
 *  the browser and the headless sim place identically for a seed. Only an explicit
 *  picker preview stops before Ideas; quick starts score every seat, including the human. */
function autoPlayOpening(
  initial: HegemonyState,
  uniform: boolean,
  chooseIdeas: boolean,
): HegemonyState {
  let G = initial;
  const rng = createSimRng(deriveBotSeed(G.seed));
  let guard = 0;

  while (G.phase !== "gameplay" && (chooseIdeas || G.phase !== "setupIdeas") && guard++ < 64) {
    const commands = enumerateLegalCommands(G, G.currentPlayer);

    if (commands.length === 0) {
      return G; // leave whatever remains to manual play rather than crash
    }

    const command =
      uniform && G.phase !== "setupIdeas" ? rng.pick(commands) : choosePlacement(G, commands, rng);
    const result = transition(G.definition, G, G.currentPlayer, command);
    if (!result.ok) {
      return G;
    }
    G = result.state;
  }

  return G;
}

const BOT_TICK_MS = 250;

/** The bot seats play through the same `playTurn` the headless batch uses, one turn per
 *  tick, so the shell renders a real bot game. A tick stops where a person must act: on
 *  their turn, an offer naming them, or the sitting's recap; bots answer at once. */
function useBotTable(G: HegemonyState, setG: (next: HegemonyState) => void, table: Table) {
  // One bot stream per game seed, as `runGame` derives it.
  const rng = useMemo(() => createSimRng(deriveBotSeed(G.seed)), [G.seed]);

  useEffect(() => {
    const bot = PLAYER_IDS.map((id) => table.bots[id]).find(Boolean);
    if (!bot || G.phase === "gameOver") {
      return;
    }

    // The turn is played here, not in a state updater: StrictMode runs updaters
    // twice, which would spend the bot stream twice per tick.
    const tick = window.setTimeout(() => {
      try {
        setG(
          playTurn(G, bot, rng, {}, { seatPolicies: table.bots, humans: new Set(table.humans) }),
        );
      } catch (error) {
        console.error("dev bots stopped:", error);
      }
    }, BOT_TICK_MS);
    return () => window.clearTimeout(tick);
  }, [G, table, rng, setG]);
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
  // The dev scene's shell flags follow the game they were built with, reset included.
  const [start, setStart] = useState(createGameFromUrl);
  const [G, setG] = useState<HegemonyState>(start.G);
  const [table, setTable] = useState(readTable);
  useEffect(() => {
    const follow = () => setTable(readTable());
    window.addEventListener(SEATS_EVENT, follow);
    return () => window.removeEventListener(SEATS_EVENT, follow);
  }, []);
  const hotseat = table.humans.length > 0;
  const [playerID, setPlayerID] = useState<PlayerId>(
    () =>
      start.shell.viewer ??
      (table.humans.includes(G.currentPlayer)
        ? G.currentPlayer
        : (table.humans[0] ?? G.currentPlayer)),
  );

  const moment = privateMoment(G, table.humans);
  useEffect(() => {
    // The viewer follows the seat the game waits on. In hotseat a private moment (a
    // turn, an Assembly proposal) changes hands at the turn notice instead, when its
    // seat begins it, and the game's end stays with whoever was looking. The screen
    // stays on the people: a bot's turn is watched from a person's seat.
    if (G.phase === "gameOver" || (hotseat && moment)) return;
    if (hotseat && !table.humans.includes(G.currentPlayer)) {
      setPlayerID((viewer) => (table.humans.includes(viewer) ? viewer : table.humans[0]));
      return;
    }
    setPlayerID(G.currentPlayer);
  }, [G.currentPlayer, G.phase, moment, hotseat, table]);

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
  useBotTable(G, setG, table);
  const view = useMemo(() => projectForPlayer(G.definition, G, playerID), [G, playerID]);
  // Rebuild the whole game from URL + current dev tuning overrides. Reuses this page
  // load's rotation seed, so a re-tune re-rolls the SAME board with new params (clean A/B).
  const resetGame = useMemo(
    () => () => {
      const next = createGameFromUrl();
      setStart(next);
      setG(next.G);
    },
    [],
  );
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
    devShell: start.shell,
    hotseat,
    humans: table.humans,
    // A bot plays its own seat, even while a person looks at it.
    isActive: view.eligibleActors.includes(playerID) && !table.bots[playerID],
  };
}

/**
 * UI convenience methods construct intent-only commands and pass them to the same
 * atomic transition used by simulation and replay. Rejections preserve the previous
 * state reference, so React does not render a partial or invalid command result.
 */
