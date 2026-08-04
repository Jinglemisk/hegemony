import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEV_ROTATION_SEEDS, GAME_CONFIG } from "../game/config";
import { mulberry32 } from "../game/core/rng";
import { enumerateLegalCommands, transition } from "../game/legalMoves";
import type { GameCommand } from "../game/legalMoves";
import type {
  BoardLayout,
  BuildingId,
  EventTableId,
  HegemonyState,
  Phase,
  PlayerId,
  PopType,
  Pops,
  RiotInsuranceId,
  TradableMaterial,
} from "../game/types";
import type { CivicCalmPayment, VentureStake } from "../game/rules";
import { createGameFromDefinition } from "../game/turn";
import type { PoliticianId } from "../game/assembly";
import { GAME_MODES } from "../game/ruleset";
import { loadStartAtAssembly, resolveTunedDefinition } from "../dev/tuning";

export type { Phase } from "../game/types";

/**
 * URL-driven game options, so a browser session can pick the board and seed without a
 * lobby: `?board=shuffled&seed=42` for a randomized layout, `?setup=manual` to place
 * the opening towns by hand, `?dev=preload` to replay the fixed scripted opening.
 *
 * Default dev behavior: the opening is auto-played with seed-driven legal placements,
 * and the seed rotates through {@link DEV_ROTATION_SEEDS} on every reload — testing
 * never starts at "place your capital" unless asked to.
 */
function createGameFromUrl(): HegemonyState {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const boardParam = params?.get("board");
  const boardLayout: BoardLayout =
    boardParam === "shuffled" || boardParam === "classic" ? boardParam : GAME_CONFIG.boardLayout;
  const seedParam = Number(params?.get("seed"));
  const pinnedSeed =
    Number.isFinite(seedParam) && params?.get("seed") ? seedParam >>> 0 : undefined;
  const manualSetup = params?.get("setup") === "manual";
  const preload = params?.get("dev") === "preload" || GAME_CONFIG.preloadOpeningSetupForTesting;

  // Resolve one immutable definition before state creation. Existing matches keep their
  // pinned package even if the tuning controls are changed for the next reset.
  const definition = resolveTunedDefinition(GAME_MODES[GAME_CONFIG.mode].ruleset);

  if (preload) {
    // The scripted opening only fits the classic board's tiles.
    return createGameFromDefinition(definition, pinnedSeed, "classic", true);
  }

  const seed =
    pinnedSeed ?? (GAME_CONFIG.autoOpeningForDev && !manualSetup ? nextRotationSeed() : undefined);
  let G = createGameFromDefinition(definition, seed, boardLayout, false);

  if (!manualSetup && GAME_CONFIG.autoOpeningForDev) {
    G = autoPlayOpening(G);
  }

  // `?dev=assembly` fast-forwards to the first Assembly. The agora sits in the spring
  // of Year 2 — sixteen turns in — and neither a playtest nor a browser check should
  // have to click through a whole year to reach the feature under test. The TUNE panel's
  // "Start at Assembly" toggle sets the same fast-forward as a sticky dev flag, so a plain
  // map regen (reload or Apply) lands there too — no URL param, no sixteen End Turn clicks.
  if (params?.get("dev") === "assembly" || (import.meta.env.DEV && loadStartAtAssembly())) {
    G = fastForwardToAssembly(G);
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

/** Play the opening with seed-driven legal placements (the sim's "random" opening,
 *  driven by the game's own seed so it is reproducible), landing in gameplay. */
function autoPlayOpening(initial: HegemonyState): HegemonyState {
  let G = initial;
  let rngState = G.seed ^ 0x9e3779b9;
  let guard = 0;

  while (G.phase !== "gameplay" && guard++ < 64) {
    const commands = enumerateLegalCommands(G, G.currentPlayer);

    if (commands.length === 0) {
      return G; // leave whatever remains to manual play rather than crash
    }

    const step = mulberry32(rngState);
    rngState = step.state;

    const command = commands[Math.floor(step.value * commands.length)];
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

export type HegemonyGame = {
  G: HegemonyState;
  ctx: LocalContext;
};

export type GameMoves = {
  placeCapital: (tileId: string, pops: Pops) => void;
  placeCity: (tileId: string, pops: Pops) => void;
  placeColony: (tileId: string, pops: Pops) => void;
  foundColony: (tileId: string, sourceTileId: string, pop: PopType) => void;
  upgradeColonyToCity: (tileId: string) => void;
  buildBuilding: (tileId: string, buildingId: BuildingId) => void;
  growPop: (tileId: string, pop: PopType) => void;
  movePops: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
  resolvePendingPlayerEvent: (targetTileId?: string, choiceIndex?: number) => void;
  bankSell: (material: TradableMaterial) => void;
  bankBuy: (material: TradableMaterial) => void;
  civicCalm: (payment: CivicCalmPayment) => void;
  promotePop: (tileId: string, from: PopType) => void;
  demotePop: (tileId: string, from: PopType) => void;
  fundExpedition: (expeditionId: EventTableId, stake: VentureStake) => void;
  buyRiotInsurance: (
    optionId: RiotInsuranceId,
    demoteTarget?: { tileId: string; from: PopType },
  ) => void;
  resolveRiot: () => void;
  // The Assembly (Phase 3-B). These are the only moves available while the agora
  // sits — the engine refuses every other verb until the house rises.
  assemblyDraw: (playerID: PlayerId, politician: PoliticianId) => void;
  assemblyDiscardHeld: (playerID: PlayerId) => void;
  assemblyPropose: (playerID: PlayerId, replaces?: string, target?: PlayerId) => void;
  assemblyProposeRepeal: (playerID: PlayerId, cardId: string) => void;
  assemblyPass: (playerID: PlayerId) => void;
  assemblyBribe: (playerID: PlayerId) => void;
  assemblyVote: (playerID: PlayerId, yea: boolean) => void;
  assemblyVeto: (playerID: PlayerId) => void;
  assemblyClose: () => void;
};

export type GameEvents = {
  endTurn: () => void;
};

type SetState = Dispatch<SetStateAction<HegemonyState>>;

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

  const moves = useMemo(() => createMoves(setG), []);
  const events = useMemo(() => createEvents(setG), []);
  // Rebuild the whole game from URL + current dev tuning overrides. Reuses this page
  // load's rotation seed, so a re-tune re-rolls the SAME board with new params (clean A/B).
  const resetGame = useMemo(() => () => setG(createGameFromUrl()), []);
  // Stable while G is unchanged, so memoized panels that read the turn context don't re-render on unrelated UI state.
  const ctx = useMemo(() => deriveContext(G), [G]);

  return {
    game: { G, ctx },
    playerID,
    setPlayerID,
    moves,
    events,
    resetGame,
    isActive: playerID === G.currentPlayer,
  };
}

/**
 * UI convenience methods construct intent-only commands and pass them to the same
 * atomic transition used by simulation and replay. Rejections preserve the previous
 * state reference, so React does not render a partial or invalid command result.
 */
function createMoves(setG: SetState): GameMoves {
  const dispatch = (command: GameCommand, actor?: PlayerId) => {
    setG((previous) => reduceGameCommand(previous, actor ?? previous.currentPlayer, command));
  };

  return {
    placeCapital: (tileId, pops) => dispatch({ type: "placeCapital", tileId, pops }),
    placeCity: (tileId, pops) => dispatch({ type: "placeCity", tileId, pops }),
    placeColony: (tileId, pops) => dispatch({ type: "placeColony", tileId, pops }),
    foundColony: (tileId, sourceTileId, pop) =>
      dispatch({ type: "foundColony", tileId, sourceTileId, pop }),
    upgradeColonyToCity: (tileId) => dispatch({ type: "upgradeColonyToCity", tileId }),
    buildBuilding: (tileId, buildingId) =>
      dispatch({ type: "buildBuilding", tileId, buildingId }),
    growPop: (tileId, pop) => dispatch({ type: "growPop", tileId, pop }),
    movePops: (sourceTileId, targetTileId, pops) =>
      dispatch({ type: "movePops", sourceTileId, targetTileId, pops }),
    resolvePendingPlayerEvent: (targetTileId, choiceIndex = 0) =>
      dispatch({ type: "resolveEvent", choiceIndex, ...(targetTileId ? { targetTileId } : {}) }),
    bankSell: (material) => dispatch({ type: "bankSell", material }),
    bankBuy: (material) => dispatch({ type: "bankBuy", material }),
    civicCalm: (payment) => dispatch({ type: "civicCalm", payment }),
    promotePop: (tileId, from) => dispatch({ type: "promotePop", tileId, from }),
    demotePop: (tileId, from) => dispatch({ type: "demotePop", tileId, from }),
    fundExpedition: (expeditionId, stake) =>
      dispatch({ type: "fundExpedition", expeditionId, stake }),
    buyRiotInsurance: (optionId, demoteTarget) =>
      dispatch({ type: "buyRiotInsurance", optionId, ...(demoteTarget ? { demoteTarget } : {}) }),
    resolveRiot: () => dispatch({ type: "resolveRiot" }),
    assemblyDraw: (playerID, politician) =>
      dispatch({ type: "assemblyDraw", politician }, playerID),
    assemblyDiscardHeld: (playerID) => dispatch({ type: "assemblyDiscardHeld" }, playerID),
    assemblyPropose: (playerID, replaces, target) =>
      dispatch(
        {
          type: "assemblyPropose",
          ...(replaces ? { replaces } : {}),
          ...(target ? { target } : {}),
        },
        playerID,
      ),
    assemblyProposeRepeal: (playerID, cardId) =>
      dispatch({ type: "assemblyProposeRepeal", cardId }, playerID),
    assemblyPass: (playerID) => dispatch({ type: "assemblyPass" }, playerID),
    assemblyBribe: (playerID) => dispatch({ type: "assemblyBribe" }, playerID),
    assemblyVote: (playerID, yea) => dispatch({ type: "assemblyVote", yea }, playerID),
    assemblyVeto: (playerID) => dispatch({ type: "assemblyVeto" }, playerID),
    assemblyClose: () => dispatch({ type: "assemblyClose" }),
  };
}

/** Pure browser adapter, exported so parity tests can compare UI execution with the engine boundary. */
export function reduceGameCommand(
  previous: HegemonyState,
  actor: PlayerId,
  command: GameCommand,
): HegemonyState {
  const result = transition(previous.definition, previous, actor, command);
  return result.ok ? result.state : previous;
}

function createEvents(setG: SetState): GameEvents {
  return {
    endTurn: () => {
      setG((previous) => reduceGameCommand(previous, previous.currentPlayer, { type: "endTurn" }));
    },
  };
}
