import { useEffect, useState } from "react";
import { Coins, Hammer, Hexagon, Landmark, ScrollText, Wheat } from "lucide-react";
import type { BuildingId, HegemonyState, PlayerId, Resource } from "./game/types";
import { BUILDINGS, PLAYER_COLORS, PLAYER_IDS } from "./game/data";
import {
  buildBuilding,
  collectIncome,
  createInitialState,
  getPlayerName,
  INVALID_MOVE,
  placeCapital,
  placeColony,
  startNewSeason,
  toPlayerId
} from "./game/rules";

type Phase = "setupCapital" | "setupColony" | "gameplay";

type LocalContext = {
  currentPlayer: PlayerId;
  phase: Phase;
  turn: number;
};

type GameMoves = {
  placeCapital: (tileId: string) => void;
  placeColony: (tileId: string) => void;
  collectIncome: () => void;
  buildBuilding: (tileId: string, buildingId: BuildingId) => void;
};

type BoardProps = {
  G: HegemonyState;
  ctx: LocalContext;
  moves: GameMoves;
  events: {
    endTurn: () => void;
  };
  playerID: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
  isActive: boolean;
};

const RESOURCE_LABELS: Record<Resource, string> = {
  wood: "Wood",
  stone: "Stone",
  gold: "Gold",
  food: "Food",
  influence: "Influence",
  unrest: "Unrest"
};

const RESOURCE_ICONS: Partial<Record<Resource, typeof Wheat>> = {
  food: Wheat,
  gold: Coins,
  stone: Landmark,
  wood: Hammer
};

function HegemonyBoard({
  G,
  ctx,
  moves,
  events,
  playerID = "0",
  onPlayerIDChange,
  isActive
}: BoardProps) {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const currentPlayer = G.players[currentPlayerId];
  const viewer = G.players[viewerId];
  const isSetup = ctx.phase === "setupCapital" || ctx.phase === "setupColony";

  const handleTileAction = (tileId: string) => {
    setSelectedTileId(tileId);

    if (!isActive) {
      return;
    }

    if (ctx.phase === "setupCapital") {
      moves.placeCapital(tileId);
      return;
    }

    if (ctx.phase === "setupColony") {
      moves.placeColony(tileId);
    }
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div className="turnPlate">
          <span>{phaseLabel(ctx.phase)}</span>
          <strong>{getPlayerName(G, currentPlayerId)}</strong>
        </div>

        <div className="statusRail" aria-label="Game status">
          <span>Season {G.season}</span>
          <span>Turn {ctx.turn}</span>
          <span>{isActive ? "Active" : "Inspecting"}</span>
          <span>{isSetup ? "Place settlement" : "Develop realm"}</span>
        </div>

        <div className="topActions">
          <div className="seatSwitcher" aria-label="Hotseat player selector">
            {PLAYER_IDS.map((id) => (
              <button
                className={playerID === id ? "selectedSeat" : ""}
                key={id}
                onClick={() => onPlayerIDChange(id)}
                style={{ borderColor: PLAYER_COLORS[id] }}
              >
                P{Number(id) + 1}
              </button>
            ))}
          </div>
          <button className="iconButton" onClick={() => setIsLogOpen(true)}>
            <ScrollText size={16} />
            Log
          </button>
        </div>
      </header>

      <section className="workbench">
        <aside className="sideStack">
          <section className="panel rosterPanel">
            <div className="panelTitle">
              <Hexagon size={18} />
              <h2>Players</h2>
            </div>
            <div className="playerList">
              {Object.values(G.players).map((player) => (
                <article
                  className={`playerCard ${player.id === currentPlayerId ? "active" : ""}`}
                  key={player.id}
                  style={{ borderColor: PLAYER_COLORS[player.id] }}
                >
                  <div>
                    <strong>{player.name}</strong>
                    <span>{player.id === viewerId ? "View" : "Rival"}</span>
                  </div>
                  <div className="miniStats">
                    <span>{player.settlements.length} sites</span>
                    <span>{player.collectedThisTurn ? "income done" : "income open"}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel empirePanel">
            <div className="panelTitle">
              <Landmark size={18} />
              <h2>{viewer.name} Holdings</h2>
            </div>
            <SettlementRoster G={G} playerID={viewerId} />
          </section>
        </aside>

        <section className="mapColumn">
          <HexMap
            G={G}
            selectedTileId={selectedTileId}
            onTileAction={handleTileAction}
          />
          <div className="phaseStrip">
            <span>{phaseHint(ctx.phase)}</span>
            <span>{isActive ? "Your move" : `${currentPlayer.name}'s move`}</span>
          </div>
        </section>

        <aside className="panel actionPanel">
          <div className="panelTitle">
            <ScrollText size={18} />
            <h2>Actions</h2>
          </div>
          <ResourceGrid resources={viewer.resources} />

          <div className="actionStack">
            <button
              className="primaryButton"
              disabled={!isActive || ctx.phase !== "gameplay" || currentPlayer.collectedThisTurn}
              onClick={() => moves.collectIncome()}
            >
              Collect income
            </button>
            <button
              disabled={!isActive || ctx.phase !== "gameplay"}
              onClick={() => events.endTurn()}
            >
              End turn
            </button>
          </div>

          <TileInspector
            G={G}
            selectedTileId={selectedTileId}
            playerID={viewerId}
            isActive={isActive}
            phase={ctx.phase}
            moves={moves}
          />
        </aside>
      </section>

      {isLogOpen ? (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setIsLogOpen(false)}>
          <section
            aria-label="Action log"
            aria-modal="true"
            className="logModal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modalHeader">
              <h2>Action Log</h2>
              <button className="iconButton" onClick={() => setIsLogOpen(false)}>
                Close
              </button>
            </div>
            <div className="logList">
              {G.log
                .slice()
                .reverse()
                .map((entry) => (
                  <p key={entry.id}>
                    <span>S{entry.season}</span>
                    {entry.message}
                  </p>
                ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function HexMap({
  G,
  selectedTileId,
  onTileAction
}: {
  G: HegemonyState;
  selectedTileId: string | null;
  onTileAction: (tileId: string) => void;
}) {
  const size = 45;
  const centers = G.board.tiles.map((tile) => ({
    tile,
    x: size * Math.sqrt(3) * (tile.q + tile.r / 2),
    y: size * 1.5 * tile.r
  }));

  return (
    <svg className="hexMap" viewBox="-310 -270 620 540" role="img" aria-label="Hegemony hex map">
      {centers.map(({ tile, x, y }) => {
        const city = tile.settlements.find((settlement) => settlement.kind !== "colony");
        const colonies = tile.settlements.filter((settlement) => settlement.kind === "colony");
        return (
          <g key={tile.id} transform={`translate(${x} ${y})`}>
            <g
              aria-label={`Hex ${tile.id}, ${tile.terrain} tile, ${tile.resource.amount} ${tile.resource.type}`}
              className="svgButton"
              onClick={() => onTileAction(tile.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onTileAction(tile.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <polygon
                className={`hexTile terrain-${tile.terrain} ${
                  selectedTileId === tile.id ? "selected" : ""
                }`}
                points={hexPoints(size - 2)}
              />
            </g>
            <text className="tileLabel" y="-8">
              {tile.terrain}
            </text>
            <text className="tileYield" y="10">
              +{tile.resource.amount} {tile.resource.type}
            </text>
            {city ? (
              <g className={`settlementGlyph cityGlyph ${city.kind === "capital" ? "capitalGlyph" : ""}`}>
                <circle r="15" fill={PLAYER_COLORS[city.owner]} />
                <text y="4">{city.kind === "capital" ? "CAP" : "CITY"}</text>
              </g>
            ) : null}
            {colonies.map((colony, index) => (
              <g
                className="settlementGlyph colonyGlyph"
                transform={`translate(${index === 0 ? -13 : 13} 23)`}
                key={`${colony.owner}-${index}`}
              >
                <rect fill={PLAYER_COLORS[colony.owner]} height="14" rx="3" width="22" x="-11" y="-7" />
                <text y="3">COL</text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function hexPoints(size: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    return `${Math.cos(angle) * size},${Math.sin(angle) * size}`;
  }).join(" ");
}

function ResourceGrid({ resources }: { resources: Record<Resource, number> }) {
  return (
    <div className="resourceGrid">
      {(Object.keys(resources) as Resource[]).map((resource) => {
        const Icon = RESOURCE_ICONS[resource];
        return (
          <div className={`resourcePill resource-${resource}`} key={resource}>
            {Icon ? <Icon size={16} /> : <span className="dot" />}
            <span>{RESOURCE_LABELS[resource]}</span>
            <strong>{resources[resource]}</strong>
          </div>
        );
      })}
    </div>
  );
}

function TileInspector({
  G,
  selectedTileId,
  playerID,
  isActive,
  phase,
  moves
}: {
  G: HegemonyState;
  selectedTileId: string | null;
  playerID: PlayerId;
  isActive: boolean;
  phase?: string;
  moves: GameMoves;
}) {
  const selectedTile = G.board.tiles.find((tile) => tile.id === selectedTileId);
  const playerSettlement = selectedTile?.settlements.find((settlement) => settlement.owner === playerID);
  const canUseCityActions =
    isActive &&
    phase === "gameplay" &&
    selectedTile &&
    playerSettlement &&
    playerSettlement.kind !== "colony";

  if (!selectedTile) {
    return (
      <div className="inspector empty">
        <h3>No tile selected</h3>
        <p>Select a hex to inspect terrain, settlements, and legal early actions.</p>
      </div>
    );
  }

  return (
    <div className="inspector">
      <h3>{selectedTile.terrain}</h3>
      <p>
        {selectedTile.resource.amount} {selectedTile.resource.type} income, {selectedTile.buildingSlots} terrain
        slots.
      </p>
      <div className="settlementList">
        {selectedTile.settlements.length === 0 ? (
          <span>Empty tile</span>
        ) : (
          selectedTile.settlements.map((settlement) => (
            <span key={`${settlement.owner}-${settlement.kind}`}>
              {G.players[settlement.owner].name}: {settlement.kind}
            </span>
          ))
        )}
      </div>

      <div className="buildingButtons">
        {BUILDINGS.map((building) => (
          <button
            disabled={!canUseCityActions}
            key={building.id}
            onClick={() => moves.buildBuilding(selectedTile.id, building.id)}
            title={building.description}
          >
            {building.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettlementRoster({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const holdings = G.board.tiles
    .map((tile) => ({
      tile,
      settlement: tile.settlements.find((candidate) => candidate.owner === playerID)
    }))
    .filter((entry) => entry.settlement);

  if (holdings.length === 0) {
    return <p className="emptyState">No settlements yet.</p>;
  }

  return (
    <div className="settlementRoster">
      {holdings.map(({ tile, settlement }) => {
        if (!settlement) {
          return null;
        }

        const totalPops = settlement.pops.citizens + settlement.pops.freemen + settlement.pops.slaves;
        const buildings = settlement.buildings.map((buildingId) => buildingName(buildingId));
        const capacity = settlement.kind === "capital" ? 20 : settlement.kind === "city" ? 10 : 4;
        const slots =
          settlement.kind === "colony" ? 0 : tile.buildingSlots + (settlement.kind === "capital" ? 4 : 2);

        return (
          <article className="settlementCard" key={`${settlement.owner}-${tile.id}`}>
            <div className="settlementHeader">
              <strong>{settlement.kind}</strong>
              <span>{tile.terrain}</span>
            </div>
            <div className="settlementStats">
              <span>
                Pops <strong>{totalPops}</strong>/<strong>{capacity}</strong>
              </span>
              <span>
                Slots <strong>{settlement.buildings.length}</strong>/<strong>{slots}</strong>
              </span>
              <span>
                Yield <strong>{tile.resource.amount}</strong> {tile.resource.type}
              </span>
            </div>
            <div className="popGrid">
              <span>C {settlement.pops.citizens}</span>
              <span>F {settlement.pops.freemen}</span>
              <span>S {settlement.pops.slaves}</span>
            </div>
            <div className="buildingList">
              {buildings.length > 0 ? buildings.map((building) => <span key={building}>{building}</span>) : <em>No buildings</em>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function buildingName(buildingId: BuildingId) {
  return BUILDINGS.find((building) => building.id === buildingId)?.name ?? buildingId;
}

function phaseLabel(phase: Phase) {
  if (phase === "setupCapital") {
    return "Capital placement";
  }

  if (phase === "setupColony") {
    return "Colony placement";
  }

  return "Turn actions";
}

function phaseHint(phase: Phase) {
  if (phase === "setupCapital") {
    return "Place a capital on an open hex";
  }

  if (phase === "setupColony") {
    return "Place a colony next to your capital";
  }

  return "Collect income, build, then end turn";
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

export function App() {
  const [playerID, setPlayerID] = useState<PlayerId>("0");
  const [game, setGame] = useState<{ G: HegemonyState; ctx: LocalContext }>(() => ({
    G: createInitialState(),
    ctx: {
      currentPlayer: "0",
      phase: "setupCapital",
      turn: 1
    }
  }));

  useEffect(() => {
    setPlayerID(game.ctx.currentPlayer);
  }, [game.ctx.currentPlayer]);

  const moves: GameMoves = {
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

        return {
          G,
          ctx: advanceSetupTurn(G, previous.ctx, 2, "gameplay")
        };
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

  const events = {
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

  return (
    <>
      <HegemonyBoard
        G={game.G}
        ctx={game.ctx}
        events={events}
        isActive={playerID === game.ctx.currentPlayer}
        moves={moves}
        onPlayerIDChange={setPlayerID}
        playerID={playerID}
      />
    </>
  );
}
