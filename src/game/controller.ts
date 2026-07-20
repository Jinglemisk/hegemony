import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { produce } from "immer";
import { DEV_ROTATION_SEEDS, GAME_CONFIG } from "./config";
import { mulberry32 } from "./core/rng";
import { applyMove, enumerateLegalMoves } from "./legalMoves";
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
} from "./types";
import {
  bankBuy,
  bankSell,
  buildBuilding,
  buyRiotInsurance,
  civicCalm,
  collectIncome,
  demotePop,
  foundColony,
  fundExpedition,
  growPop,
  movePops,
  placeCapital,
  placeCity,
  placeColony,
  promotePop,
  resolvePendingPlayerEvent,
  resolveRiot,
  upgradeColonyToCity,
} from "./rules";
import type { CivicCalmPayment, VentureStake } from "./rules";
import { advanceSetupTurn, beginGameplayTurn, closeAssembly, createGame, endTurn } from "./turn";
import {
  assemblyBribe,
  assemblyDiscardHeld,
  assemblyDraw,
  assemblyPass,
  assemblyPropose,
  assemblyProposeRepeal,
  assemblyVeto,
  assemblyVote,
} from "./assembly";
import type { PoliticianId } from "./assembly";
import { GAME_MODES } from "./ruleset";
import { resolveTunedRuleset } from "../dev/tuning";

export type { Phase } from "./types";

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
  const pinnedSeed = Number.isFinite(seedParam) && params?.get("seed") ? seedParam >>> 0 : undefined;
  const manualSetup = params?.get("setup") === "manual";
  const preload = params?.get("dev") === "preload" || GAME_CONFIG.preloadOpeningSetupForTesting;

  // Fold any dev tuning overrides (localStorage) onto the mode's ruleset and install the
  // building content override. A no-op in production or when nothing is being tuned.
  const ruleset = resolveTunedRuleset(GAME_MODES[GAME_CONFIG.mode].ruleset);

  if (preload) {
    // The scripted opening only fits the classic board's tiles.
    return createGame(pinnedSeed, ruleset, "classic", true);
  }

  const seed = pinnedSeed ?? (GAME_CONFIG.autoOpeningForDev && !manualSetup ? nextRotationSeed() : undefined);
  const G = createGame(seed, ruleset, boardLayout, false);

  if (!manualSetup && GAME_CONFIG.autoOpeningForDev) {
    autoPlayOpening(G);
  }

  // `?dev=assembly` fast-forwards to the first Assembly. The agora sits in the spring
  // of Year 2 — sixteen turns in — and neither a playtest nor a browser check should
  // have to click through a whole year to reach the feature under test.
  if (params?.get("dev") === "assembly") {
    fastForwardToAssembly(G);
  }

  return G;
}

/** Play seed-driven legal moves until the Assembly convenes (or the game ends). Uses
 *  the same enumerate→apply path the sim does, so events and riots along the way
 *  resolve through the real engine rather than being skipped. */
function fastForwardToAssembly(G: HegemonyState) {
  let rngState = G.seed ^ 0x5bf03635;
  let guard = 0;

  while (!G.assembly && G.phase === "gameplay" && guard++ < 4000) {
    const moves = enumerateLegalMoves(G, G.currentPlayer);

    if (moves.length === 0) {
      return;
    }

    const step = mulberry32(rngState);
    rngState = step.state;
    // Bias hard toward ending the turn: the point is to reach spring of Year 2, not
    // to play a good game on the way there.
    const endTurnMove = moves.find((move) => move.type === "endTurn");
    const move = endTurnMove && step.value < 0.7 ? endTurnMove : moves[Math.floor(step.value * moves.length)];

    if (!applyMove(G, G.currentPlayer, move).ok) {
      return;
    }
  }
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
function autoPlayOpening(G: HegemonyState) {
  let rngState = G.seed ^ 0x9e3779b9;
  let guard = 0;

  while (G.phase !== "gameplay" && guard++ < 64) {
    const moves = enumerateLegalMoves(G, G.currentPlayer);

    if (moves.length === 0) {
      return; // leave whatever remains to manual play rather than crash
    }

    const step = mulberry32(rngState);
    rngState = step.state;

    if (!applyMove(G, G.currentPlayer, moves[Math.floor(step.value * moves.length)]).ok) {
      return;
    }
  }
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
  collectIncome: () => void;
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
  buyRiotInsurance: (optionId: RiotInsuranceId, demoteTarget?: { tileId: string; from: PopType }) => void;
  resolveRiot: () => void;
  // The Assembly (Phase 3-B). These are the only moves available while the agora
  // sits — the engine refuses every other verb until the house rises.
  assemblyDraw: (playerID: PlayerId, politician: PoliticianId) => void;
  assemblyDiscardHeld: (playerID: PlayerId) => void;
  assemblyPropose: (playerID: PlayerId, replaces?: string) => void;
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
 * Each move runs a pure engine mutator inside an Immer `produce`, committing the
 * result only on success. Immer gives structural sharing — unchanged subtrees keep
 * their identity across moves (so memoized components can skip re-rendering) — and
 * freezes the result, hardening the engine/UI immutability boundary. On failure we
 * discard the draft and return the previous reference unchanged, so no re-render fires.
 */
function createMoves(setG: SetState): GameMoves {
  return {
    placeCapital: (tileId, pops) => {
      setG((previous) => commitSetupPlacement(previous, "setupCapital", (G) => placeCapital(G, G.currentPlayer, tileId, pops)));
    },
    placeCity: (tileId, pops) => {
      setG((previous) => commitSetupPlacement(previous, "setupCity", (G) => placeCity(G, G.currentPlayer, tileId, pops)));
    },
    placeColony: (tileId, pops) => {
      setG((previous) => commitSetupPlacement(previous, "setupColony", (G) => placeColony(G, G.currentPlayer, tileId, pops)));
    },
    collectIncome: () => {
      setG((previous) => commitGameplayMove(previous, (G) => collectIncome(G, G.currentPlayer)));
    },
    foundColony: (tileId, sourceTileId, pop) => {
      setG((previous) =>
        commitGameplayMove(previous, (G) => foundColony(G, G.currentPlayer, tileId, sourceTileId, pop)),
      );
    },
    upgradeColonyToCity: (tileId) => {
      setG((previous) => commitGameplayMove(previous, (G) => upgradeColonyToCity(G, G.currentPlayer, tileId)));
    },
    buildBuilding: (tileId, buildingId) => {
      setG((previous) => commitGameplayMove(previous, (G) => buildBuilding(G, G.currentPlayer, tileId, buildingId)));
    },
    growPop: (tileId, pop) => {
      setG((previous) => commitGameplayMove(previous, (G) => growPop(G, G.currentPlayer, tileId, pop)));
    },
    movePops: (sourceTileId, targetTileId, pops) => {
      setG((previous) =>
        commitGameplayMove(previous, (G) => movePops(G, G.currentPlayer, sourceTileId, targetTileId, pops)),
      );
    },
    resolvePendingPlayerEvent: (targetTileId, choiceIndex) => {
      setG((previous) =>
        commitGameplayMove(previous, (G) => resolvePendingPlayerEvent(G, G.currentPlayer, targetTileId, choiceIndex)),
      );
    },
    bankSell: (material) => {
      setG((previous) => commitGameplayMove(previous, (G) => bankSell(G, G.currentPlayer, material)));
    },
    bankBuy: (material) => {
      setG((previous) => commitGameplayMove(previous, (G) => bankBuy(G, G.currentPlayer, material)));
    },
    civicCalm: (payment) => {
      setG((previous) => commitGameplayMove(previous, (G) => civicCalm(G, G.currentPlayer, payment)));
    },
    promotePop: (tileId, from) => {
      setG((previous) => commitGameplayMove(previous, (G) => promotePop(G, G.currentPlayer, tileId, from)));
    },
    demotePop: (tileId, from) => {
      setG((previous) => commitGameplayMove(previous, (G) => demotePop(G, G.currentPlayer, tileId, from)));
    },
    fundExpedition: (expeditionId, stake) => {
      setG((previous) => commitGameplayMove(previous, (G) => fundExpedition(G, G.currentPlayer, expeditionId, stake)));
    },
    buyRiotInsurance: (optionId, demoteTarget) => {
      setG((previous) =>
        commitGameplayMove(previous, (G) => buyRiotInsurance(G, G.currentPlayer, optionId, demoteTarget)),
      );
    },
    resolveRiot: () => {
      setG((previous) => commitGameplayMove(previous, (G) => resolveRiot(G, G.currentPlayer)));
    },
    assemblyDraw: (playerID, politician) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyDraw(G, playerID, politician)));
    },
    assemblyDiscardHeld: (playerID) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyDiscardHeld(G, playerID)));
    },
    assemblyPropose: (playerID, replaces) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyPropose(G, playerID, replaces)));
    },
    assemblyProposeRepeal: (playerID, cardId) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyProposeRepeal(G, playerID, cardId)));
    },
    assemblyPass: (playerID) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyPass(G, playerID)));
    },
    assemblyBribe: (playerID) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyBribe(G, playerID)));
    },
    assemblyVote: (playerID, yea) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyVote(G, playerID, yea)));
    },
    assemblyVeto: (playerID) => {
      setG((previous) => commitGameplayMove(previous, (G) => assemblyVeto(G, playerID)));
    },
    assemblyClose: () => {
      setG((previous) => commitGameplayMove(previous, closeAssembly));
    },
  };
}

/** Run a setup placement inside `produce`; on success the setup machine advances (and
 *  bootstraps gameplay after the final placement). */
function commitSetupPlacement(
  previous: HegemonyState,
  phase: Phase,
  mutate: (G: HegemonyState) => { ok: boolean },
): HegemonyState {
  if (previous.phase !== phase) {
    return previous;
  }

  let ok = false;
  const next = produce(previous, (draft) => {
    if (!mutate(draft).ok) {
      return;
    }

    advanceSetupTurn(draft);

    if (draft.phase === "gameplay") {
      beginGameplayTurn(draft);
    }

    ok = true;
  });
  return ok ? next : previous;
}

/** Run a gameplay-phase mutator inside `produce`, committing only if the phase was valid and the move succeeded. */
function commitGameplayMove(
  previous: HegemonyState,
  mutate: (G: HegemonyState) => { ok: boolean },
): HegemonyState {
  if (previous.phase !== "gameplay") {
    return previous;
  }

  let ok = false;
  const next = produce(previous, (draft) => {
    ok = mutate(draft).ok;
  });
  return ok ? next : previous;
}

function createEvents(setG: SetState): GameEvents {
  return {
    endTurn: () => {
      setG((previous) => {
        let ok = false;
        const next = produce(previous, (draft) => {
          ok = endTurn(draft).ok;
        });
        return ok ? next : previous;
      });
    },
  };
}
