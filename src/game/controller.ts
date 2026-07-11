import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { produce } from "immer";
import { GAME_CONFIG } from "./config";
import type { BoardLayout, BuildingId, HegemonyState, Phase, PlayerId, PopType, Pops } from "./types";
import {
  buildBuilding,
  collectIncome,
  foundColony,
  growPop,
  movePops,
  placeCapital,
  placeCity,
  placeColony,
  resolvePendingPlayerEvent,
  upgradeColonyToCity,
} from "./rules";
import { advanceSetupTurn, beginGameplayTurn, createGame, endTurn } from "./turn";
import { GAME_MODES } from "./ruleset";

export type { Phase } from "./types";

/**
 * URL-driven game options, so a browser session can pick the board and seed without a
 * lobby: `?board=shuffled&seed=42` for a randomized layout, `?dev=preload` to replay
 * the scripted opening (the old testing flag, now opt-in).
 */
function createGameFromUrl(): HegemonyState {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const boardParam = params?.get("board");
  const boardLayout: BoardLayout =
    boardParam === "shuffled" || boardParam === "classic" ? boardParam : GAME_CONFIG.boardLayout;
  const seedParam = Number(params?.get("seed"));
  const seed = Number.isFinite(seedParam) && params?.get("seed") ? seedParam >>> 0 : undefined;
  const preload = params?.get("dev") === "preload" || GAME_CONFIG.preloadOpeningSetupForTesting;

  return createGame(seed, GAME_MODES[GAME_CONFIG.mode].ruleset, boardLayout, preload);
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
  upgradeColonyToCity: (tileId: string, pops?: Pops) => void;
  buildBuilding: (tileId: string, buildingId: BuildingId) => void;
  growPop: (tileId: string, pop: PopType) => void;
  movePops: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
  resolvePendingPlayerEvent: (targetTileId?: string, choiceIndex?: number) => void;
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
    setPlayerID(G.currentPlayer);
  }, [G.currentPlayer]);

  const moves = useMemo(() => createMoves(setG), []);
  const events = useMemo(() => createEvents(setG), []);
  // Stable while G is unchanged, so memoized panels that read the turn context don't re-render on unrelated UI state.
  const ctx = useMemo(() => deriveContext(G), [G]);

  return {
    game: { G, ctx },
    playerID,
    setPlayerID,
    moves,
    events,
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
    upgradeColonyToCity: (tileId, pops) => {
      setG((previous) => commitGameplayMove(previous, (G) => upgradeColonyToCity(G, G.currentPlayer, tileId, pops)));
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
