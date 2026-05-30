import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { BuildingId, HegemonyState, PlayerId, PopType, Pops } from "./types";
import { GAME_CONFIG, TEST_OPENING_SETUP } from "./config";
import { PLAYER_IDS } from "./data";
import {
  buildBuilding,
  collectIncome,
  createInitialState,
  drawSeasonalEvent,
  expireTurnEventModifiers,
  foundColony,
  growPop,
  INVALID_MOVE,
  movePops,
  placeCapital,
  placeColony,
  resolvePendingPlayerEvent,
  resolveArrivingPops,
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

type SetGame = Dispatch<SetStateAction<HegemonyGame>>;

export function createInitialGame(): HegemonyGame {
  return GAME_CONFIG.preloadOpeningSetupForTesting ? createPreloadedOpeningSetupGame() : createEmptySetupGame();
}

function createEmptySetupGame(): HegemonyGame {
  return {
    G: createInitialState(),
    ctx: {
      currentPlayer: "0",
      phase: "setupCapital",
      turn: 1
    }
  };
}

function createPreloadedOpeningSetupGame(): HegemonyGame {
  const game = createEmptySetupGame();

  for (const placement of TEST_OPENING_SETUP) {
    assertSetupTurn(game.ctx, placement.playerID, "setupCapital");
    const result = placeCapital(game.G, placement.playerID, placement.capital.tileId, placement.capital.pops);
    assertValidSetupMove(result, placement.playerID, "capital", placement.capital.tileId);
    game.ctx = advanceSetupTurn(game.G, game.ctx, 1, "setupColony");
  }

  for (const placement of TEST_OPENING_SETUP) {
    assertSetupTurn(game.ctx, placement.playerID, "setupColony");
    const result = placeColony(game.G, placement.playerID, placement.colony.tileId, placement.colony.pops);
    assertValidSetupMove(result, placement.playerID, "colony", placement.colony.tileId);
    game.ctx = advanceSetupTurn(game.G, game.ctx, 2, "gameplay");
  }

  beginGameplayTurn(game.G, game.ctx);
  return game;
}

function assertSetupTurn(ctx: LocalContext, playerID: PlayerId, phase: Phase) {
  if (ctx.currentPlayer !== playerID || ctx.phase !== phase) {
    throw new Error(`Invalid test setup order: expected ${playerID} during ${phase}.`);
  }
}

function assertValidSetupMove(
  result: typeof INVALID_MOVE | void,
  playerID: PlayerId,
  settlementKind: "capital" | "colony",
  tileId: string
) {
  if (result === INVALID_MOVE) {
    throw new Error(`Invalid test setup: ${playerID} cannot place ${settlementKind} on ${tileId}.`);
  }
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
    placeCapital: (tileId, pops) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "setupCapital") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = placeCapital(G, previous.ctx.currentPlayer, tileId, pops);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          G,
          ctx: advanceSetupTurn(G, previous.ctx, 1, "setupColony")
        };
      });
    },
    placeColony: (tileId, pops) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "setupColony") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = placeColony(G, previous.ctx.currentPlayer, tileId, pops);

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
    foundColony: (tileId, sourceTileId, pop) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = foundColony(G, previous.ctx.currentPlayer, tileId, sourceTileId, pop);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          ...previous,
          G
        };
      });
    },
    upgradeColonyToCity: (tileId, pops) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = upgradeColonyToCity(G, previous.ctx.currentPlayer, tileId, pops);

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
    },
    growPop: (tileId, pop) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = growPop(G, previous.ctx.currentPlayer, tileId, pop);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          ...previous,
          G
        };
      });
    },
    movePops: (sourceTileId, targetTileId, pops) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = movePops(G, previous.ctx.currentPlayer, sourceTileId, targetTileId, pops);

        if (result === INVALID_MOVE) {
          return previous;
        }

        return {
          ...previous,
          G
        };
      });
    },
    resolvePendingPlayerEvent: (targetTileId, choiceIndex) => {
      setGame((previous) => {
        if (previous.ctx.phase !== "gameplay") {
          return previous;
        }

        const G = structuredClone(previous.G);
        const result = resolvePendingPlayerEvent(G, previous.ctx.currentPlayer, targetTileId, choiceIndex);

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
        if (previous.ctx.phase !== "gameplay" || previous.G.pendingPlayerEvent) {
          return previous;
        }

        const G = structuredClone(previous.G);
        const next = nextPlayer(previous.ctx.currentPlayer);

        expireTurnEventModifiers(G, previous.ctx.currentPlayer);

        if (next === "0") {
          startNewSeason(G);
        }

        resolveArrivingPops(G, next);
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
    if (!G.activeSeasonEvent) {
      drawSeasonalEvent(G);
    }

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
