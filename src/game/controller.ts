import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { BuildingId, HegemonyState, PlayerId } from "./types";
import { PLAYER_IDS } from "./data";
import {
  buildBuilding,
  collectIncome,
  createInitialState,
  foundColony,
  INVALID_MOVE,
  placeCapital,
  placeColony,
  startNewSeason,
  upgradeColonyToCity
} from "./rules";

export type Phase = "setupCapital" | "setupColony" | "gameplay";

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
  placeCapital: (tileId: string) => void;
  placeColony: (tileId: string) => void;
  collectIncome: () => void;
  foundColony: (tileId: string) => void;
  upgradeColonyToCity: (tileId: string) => void;
  buildBuilding: (tileId: string, buildingId: BuildingId) => void;
};

export type GameEvents = {
  endTurn: () => void;
};

type SetGame = Dispatch<SetStateAction<HegemonyGame>>;

export function createInitialGame(): HegemonyGame {
  return {
    G: createInitialState(),
    ctx: {
      currentPlayer: "0",
      phase: "setupCapital",
      turn: 1
    }
  };
}

export function useHegemonyGame() {
  const [playerID, setPlayerID] = useState<PlayerId>("0");
  const [game, setGame] = useState<HegemonyGame>(createInitialGame);

  useEffect(() => {
    setPlayerID(game.ctx.currentPlayer);
  }, [game.ctx.currentPlayer]);

  const moves = useMemo(() => createMoves(setGame), []);
  const events = useMemo(() => createEvents(setGame), []);

  return {
    game,
    playerID,
    setPlayerID,
    moves,
    events,
    isActive: playerID === game.ctx.currentPlayer
  };
}

function createMoves(setGame: SetGame): GameMoves {
  return {
    placeCapital: (tileId) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "setupCapital") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = placeCapital(G, previous.ctx.currentPlayer, tileId);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          G,
          ctx: advanceSetupTurn(G, previous.ctx, 1, "setupColony")
        };
      });
    },
    placeColony: (tileId) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "setupColony") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = placeColony(G, previous.ctx.currentPlayer, tileId);

        if (result === INVALID_MOVE) {
          return previous;
        }

        const ctx = advanceSetupTurn(G, previous.ctx, 2, "gameplay");
        beginGameplayTurn(G, ctx);

        return { G, ctx };
      });
    },
    collectIncome: () => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = collectIncome(G, previous.ctx.currentPlayer);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          ...previous,
          G
        };
      });
    },
    foundColony: (tileId) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = foundColony(G, previous.ctx.currentPlayer, tileId);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          ...previous,
          G
        };
      });
    },
    upgradeColonyToCity: (tileId) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = upgradeColonyToCity(G, previous.ctx.currentPlayer, tileId);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          ...previous,
          G
        };
      });
    },
    buildBuilding: (tileId, buildingId) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = buildBuilding(G, previous.ctx.currentPlayer, tileId, buildingId);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          ...previous,
          G
        };
      });
    }
  };
}

function createEvents(setGame: SetGame): GameEvents {
  return {
    endTurn: () => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const next = nextPlayer(previous.ctx.currentPlayer);

        if (next === "0") {
          startNewSeason(G);
        }

        collectIncome(G, next, "automatic");

        return {
          G,
          ctx: {
            ...previous.ctx,
            currentPlayer: next,
            turn: previous.ctx.turn + 1
          }
        };
      });
    }
  };
}

function beginGameplayTurn(G: HegemonyState, ctx: LocalContext) {
  if (ctx.phase === "gameplay") {
    collectIncome(G, ctx.currentPlayer, "automatic");
  }
}

function nextPlayer(playerID: PlayerId): PlayerId {
  const currentIndex = PLAYER_IDS.indexOf(playerID);
  return PLAYER_IDS[(currentIndex + 1) % PLAYER_IDS.length];
}

function allPlayersHaveSettlementCount(G: HegemonyState, count: number) {
  return Object.values(G.players).every((player) => player.settlements.length >= count);
}

function advanceSetupTurn(G: HegemonyState, ctx: LocalContext, count: number, nextPhase: Phase): LocalContext {
  if (allPlayersHaveSettlementCount(G, count)) {
    return {
      currentPlayer: "0",
      phase: nextPhase,
      turn: ctx.turn + 1
    };
  }

  return {
    ...ctx,
    currentPlayer: nextPlayer(ctx.currentPlayer),
    turn: ctx.turn + 1
  };
}
