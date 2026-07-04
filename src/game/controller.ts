import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { BuildingId, HegemonyState, Phase, PlayerId, PopType, Pops } from "./types";
import {
  buildBuilding,
  collectIncome,
  foundColony,
  growPop,
  movePops,
  placeCapital,
  placeColony,
  resolvePendingPlayerEvent,
  upgradeColonyToCity,
} from "./rules";
import { advanceSetupTurn, beginGameplayTurn, createGame, endTurn } from "./turn";

export type { Phase } from "./types";

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
  const [G, setG] = useState<HegemonyState>(createGame);

  useEffect(() => {
    setPlayerID(G.currentPlayer);
  }, [G.currentPlayer]);

  const moves = useMemo(() => createMoves(setG), []);
  const events = useMemo(() => createEvents(setG), []);

  return {
    game: { G, ctx: deriveContext(G) },
    playerID,
    setPlayerID,
    moves,
    events,
    isActive: playerID === G.currentPlayer,
  };
}

/**
 * Each move clones the current state, runs a pure engine mutator, and commits the
 * clone only on success — keeping React state immutable while the engine mutates.
 */
function createMoves(setG: SetState): GameMoves {
  return {
    placeCapital: (tileId, pops) => {
      setG((previous) => {
        if (previous.phase !== "setupCapital") {
          return previous;
        }

        const G = structuredClone(previous);

        if (!placeCapital(G, G.currentPlayer, tileId, pops).ok) {
          return previous;
        }

        advanceSetupTurn(G, 1, "setupColony");
        return G;
      });
    },
    placeColony: (tileId, pops) => {
      setG((previous) => {
        if (previous.phase !== "setupColony") {
          return previous;
        }

        const G = structuredClone(previous);

        if (!placeColony(G, G.currentPlayer, tileId, pops).ok) {
          return previous;
        }

        advanceSetupTurn(G, 2, "gameplay");
        beginGameplayTurn(G);
        return G;
      });
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

/** Clone, run a gameplay-phase mutator, and commit only if the phase was valid and the move succeeded. */
function commitGameplayMove(
  previous: HegemonyState,
  mutate: (G: HegemonyState) => { ok: boolean },
): HegemonyState {
  if (previous.phase !== "gameplay") {
    return previous;
  }

  const G = structuredClone(previous);
  return mutate(G).ok ? G : previous;
}

function createEvents(setG: SetState): GameEvents {
  return {
    endTurn: () => {
      setG((previous) => {
        const G = structuredClone(previous);
        return endTurn(G).ok ? G : previous;
      });
    },
  };
}
