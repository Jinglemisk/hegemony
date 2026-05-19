import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type {
  BuildingEffect,
  BuildingId,
  HegemonyState,
  PlayerId,
  PopType,
  Resource,
  Resources,
  SettlementKind,
  Terrain
} from "./game/types";
import { BUILDINGS, PLAYER_COLORS, PLAYER_IDS } from "./game/data";
import {
  buildBuilding,
  calculateIncome,
  collectIncome,
  createInitialState,
  getPlayerName,
  INVALID_MOVE,
  placeCapital,
  placeColony,
  settlementBuildingSlots,
  settlementPopCapacity,
  startNewSeason,
  toPlayerId,
  totalPops
} from "./game/rules";

type Phase = "setupCapital" | "setupColony" | "gameplay";
type IconAtlasKey = Resource | PopType | BuildingId | SettlementKind;
type UiAtlasKey = "seal" | "primaryButton" | "secondaryButton" | "resourcePill" | "hexHalo" | "playerToken" | "meander" | "voteToken" | "seasonMarker";

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

const ICON_SPRITE_CLASSES: Record<IconAtlasKey, string> = {
  wood: "sprite-wood",
  stone: "sprite-stone",
  gold: "sprite-gold",
  food: "sprite-food",
  influence: "sprite-influence",
  unrest: "sprite-unrest",
  citizens: "sprite-citizens",
  freemen: "sprite-freemen",
  slaves: "sprite-slaves",
  marketplace: "sprite-marketplace",
  temple: "sprite-temple",
  workshop: "sprite-workshop",
  granary: "sprite-granary",
  capital: "sprite-capital",
  city: "sprite-city",
  colony: "sprite-colony"
};

const TERRAIN_SPRITE_CLASSES: Record<Terrain, string> = {
  mountain: "sprite-terrain-mountain",
  hill: "sprite-terrain-hill",
  forest: "sprite-terrain-forest",
  plains: "sprite-terrain-plains"
};

const UI_SPRITE_CLASSES: Record<UiAtlasKey, string> = {
  seal: "sprite-ui-seal",
  primaryButton: "sprite-ui-primary",
  secondaryButton: "sprite-ui-secondary",
  resourcePill: "sprite-ui-resource-pill",
  hexHalo: "sprite-ui-hex-halo",
  playerToken: "sprite-ui-player-token",
  meander: "sprite-ui-meander",
  voteToken: "sprite-ui-vote-token",
  seasonMarker: "sprite-ui-season-marker"
};

const POP_LABELS: Record<PopType, { singular: string; plural: string }> = {
  citizens: { singular: "citizen", plural: "citizens" },
  freemen: { singular: "freeman", plural: "freemen" },
  slaves: { singular: "slave", plural: "slaves" }
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
      <header className="topbar controlsBar">
        <div className="brandCluster">
          <UiSprite item="seal" className="brandSeal" />
          <div className="brandCopy">
            <strong>Hegemony</strong>
            <span>Red-Figure Agora</span>
          </div>
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
            <UiSprite item="meander" className="buttonIconSprite" />
            Log
          </button>
        </div>
      </header>

      <section className="workbench">
        <aside className="panel empirePanel">
          <div className="panelTitle">
            <AtlasIcon icon="capital" className="titleIcon" />
            <h2>{viewer.name} Holdings</h2>
          </div>
          <PlayerHoldingsSummary G={G} playerID={viewerId} />
          <SettlementRoster G={G} playerID={viewerId} />
        </aside>

        <section className="mapColumn">
          <div className="mapFrame">
            <MapStatusOverlay
              G={G}
              ctx={ctx}
              currentPlayerId={currentPlayerId}
              isActive={isActive}
            />
            <HexMap
              G={G}
              selectedTileId={selectedTileId}
              onTileAction={handleTileAction}
            />
          </div>
          <div className="phaseStrip">
            <span>{phaseHint(ctx.phase)}</span>
            <span>{isSetup ? "Settlement placement" : "Income and building actions"}</span>
          </div>
        </section>

        <aside className="panel actionPanel">
          <div className="panelTitle">
            <UiSprite item="voteToken" className="titleIcon" />
            <h2>Actions</h2>
          </div>

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

function MapStatusOverlay({
  G,
  ctx,
  currentPlayerId,
  isActive
}: {
  G: HegemonyState;
  ctx: LocalContext;
  currentPlayerId: PlayerId;
  isActive: boolean;
}) {
  return (
    <div className="mapHud" aria-label="Turn status">
      <div className="hudCard">
        <UiSprite item="seasonMarker" className="hudMedallion" />
        <div>
          <span>Season</span>
          <strong>{G.season}</strong>
        </div>
      </div>

      <div className="hudCard">
        <UiSprite item="meander" className="hudMedallion" />
        <div>
          <span>Turn {ctx.turn}</span>
          <strong>{phaseLabel(ctx.phase)}</strong>
        </div>
      </div>

      <div className="hudCard turnOwner" style={{ borderColor: PLAYER_COLORS[currentPlayerId] }}>
        <span className="playerSeal" style={{ background: PLAYER_COLORS[currentPlayerId] }} />
        <div>
          <span>{isActive ? "Your turn" : "Now acting"}</span>
          <strong>{getPlayerName(G, currentPlayerId)}'s turn</strong>
        </div>
      </div>
    </div>
  );
}

function PlayerHoldingsSummary({ G, playerID }: { G: HegemonyState; playerID: PlayerId }) {
  const player = G.players[playerID];
  const projectedIncome = calculateIncome(G, playerID);

  return (
    <section className="holdingsSummary" aria-label={`${player.name} resources and income`}>
      <div className="holdingsStats">
        <span>
          Sites <strong>{player.settlements.length}</strong>
        </span>
        <span>
          Income <strong>{player.collectedThisTurn ? "done" : "open"}</strong>
        </span>
      </div>
      <ResourceGrid resources={player.resources} />
      <div className="incomePreview">
        <span>Next income</span>
        <strong>{formatResourceDelta(projectedIncome)}</strong>
      </div>
    </section>
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
  const tileArtSize = 88;
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
        const isSelected = selectedTileId === tile.id;
        return (
          <g key={tile.id} transform={`translate(${x} ${y})`}>
            <foreignObject
              className="terrainObject"
              height={tileArtSize}
              width={tileArtSize}
              x={-tileArtSize / 2}
              y={-tileArtSize / 2}
            >
              <TerrainSprite terrain={tile.terrain} className="mapTerrain" />
            </foreignObject>
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
                className={`hexTile terrain-${tile.terrain} ${isSelected ? "selected" : ""}`}
                points={hexPoints(size - 2)}
              />
            </g>
            <g className="tilePlate" aria-hidden="true">
              <rect className="tilePlateBg" x={-29} y={1.5} width={58} height={18} rx={5} />
              <line className="tilePlateDivider" x1={0} y1={4} x2={0} y2={17} />
              <text className="tilePlateStat tilePlateYield" x={-14.5} y={14.5}>
                ◆{tile.resource.amount}
              </text>
              <text className="tilePlateStat tilePlateSlots" x={14.5} y={14.5}>
                ⌂{tile.buildingSlots}
              </text>
            </g>
            {city ? (
              <foreignObject className="settlementObject cityObject" height={38} width={38} x={-19} y={-19}>
                <div
                  className={`settlementToken ${city.kind === "capital" ? "capitalToken" : "cityToken"}`}
                  style={{ "--player-color": PLAYER_COLORS[city.owner] } as CSSProperties}
                >
                  <AtlasIcon icon={city.kind} className="settlementTokenIcon" />
                  <span>{city.kind === "capital" ? "CAP" : "CITY"}</span>
                </div>
              </foreignObject>
            ) : null}
            {colonies.map((colony, index) => (
              <g
                transform={`translate(${index === 0 ? -13 : 13} 23)`}
                key={`${colony.owner}-${index}`}
              >
                <foreignObject className="settlementObject colonyObject" height={30} width={34} x={-17} y={-15}>
                  <div
                    className="settlementToken colonyToken"
                    style={{ "--player-color": PLAYER_COLORS[colony.owner] } as CSSProperties}
                  >
                    <AtlasIcon icon="colony" className="settlementTokenIcon" />
                    <span>COL</span>
                  </div>
                </foreignObject>
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
        return (
          <div className={`resourcePill resource-${resource}`} key={resource}>
            <AtlasIcon icon={resource} className="resourceIcon" />
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
      <div className="inspectorTerrainHeader">
        <TerrainSprite terrain={selectedTile.terrain} className="terrainPreview" />
        <div>
          <h3>{selectedTile.terrain}</h3>
          <p>
            {selectedTile.resource.amount} {RESOURCE_LABELS[selectedTile.resource.type]} income,{" "}
            {selectedTile.buildingSlots} terrain slots.
          </p>
        </div>
      </div>
      <div className="settlementList">
        {selectedTile.settlements.length === 0 ? (
          <span>Empty tile</span>
        ) : (
          selectedTile.settlements.map((settlement) => (
            <span key={`${settlement.owner}-${settlement.kind}`}>
              <AtlasIcon icon={settlement.kind} className="miniIcon" />
              <b>{G.players[settlement.owner].name}</b>: {settlement.kind}
            </span>
          ))
        )}
      </div>

      <div className="buildingButtons">
        {BUILDINGS.map((building) => (
          <button
            className="buildingButton"
            disabled={!canUseCityActions}
            key={building.id}
            onClick={() => moves.buildBuilding(selectedTile.id, building.id)}
            title={`Cost: ${formatResourceCost(building.cost)}. Benefit: ${formatBuildingEffects(building.effects)}.`}
          >
            <AtlasIcon icon={building.id} className="buildingButtonIcon" />
            <span className="buildingButtonCopy">
              <strong>{building.name}</strong>
              <span>Cost: {formatResourceCost(building.cost)}</span>
              <span>Benefit: {formatBuildingEffects(building.effects)}</span>
            </span>
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

        const popTotal = totalPops(settlement.pops);
        const capacity = settlementPopCapacity(settlement.kind);
        const slots = settlementBuildingSlots(tile, settlement);

        return (
          <article className={`settlementCard settlement-${settlement.kind}`} key={`${settlement.owner}-${tile.id}`}>
            <div className="settlementHeader">
              <span className="settlementName">
                <AtlasIcon icon={settlement.kind} className="miniIcon" />
                <strong>{settlement.kind}</strong>
              </span>
              <span className="settlementTerrain">
                <TerrainSprite terrain={tile.terrain} className="terrainChip" />
                {tile.terrain}
              </span>
            </div>
            <div className="settlementStats">
              <span>
                Pops <strong>{popTotal}</strong>/<strong>{capacity}</strong>
              </span>
              <span>
                Slots <strong>{settlement.buildings.length}</strong>/<strong>{slots}</strong>
              </span>
              <span>
                Yield <strong>{tile.resource.amount}</strong> {tile.resource.type}
              </span>
            </div>
            <div className="popGrid">
              {(Object.entries(settlement.pops) as Array<[PopType, number]>).map(([pop, amount]) => (
                <span key={pop}>
                  <AtlasIcon icon={pop} className="miniIcon" />
                  {formatPopShort(pop)} {amount}
                </span>
              ))}
            </div>
            <div className="buildingList">
              {settlement.buildings.length > 0 ? (
                settlement.buildings.map((buildingId) => (
                  <span key={buildingId}>
                    <AtlasIcon icon={buildingId} className="miniIcon" />
                    {buildingName(buildingId)}
                  </span>
                ))
              ) : (
                <em>No buildings</em>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatResourceCost(cost: Partial<Resources>) {
  const entries = (Object.entries(cost) as Array<[Resource, number | undefined]>).filter(
    ([, amount]) => (amount ?? 0) > 0
  );

  if (entries.length === 0) {
    return "Free";
  }

  return entries
    .map(([resource, amount]) => `${amount ?? 0} ${RESOURCE_LABELS[resource]}`)
    .join(", ");
}

function formatResourceDelta(resources: Resources) {
  const entries = (Object.entries(resources) as Array<[Resource, number]>).filter(([, amount]) => amount !== 0);

  if (entries.length === 0) {
    return "none";
  }

  return entries
    .map(([resource, amount]) => `${amount > 0 ? "+" : ""}${amount} ${RESOURCE_LABELS[resource]}`)
    .join(", ");
}

function formatBuildingEffects(effects: BuildingEffect[]) {
  if (effects.length === 0) {
    return "No effect";
  }

  return effects
    .map((effect) => {
      if (effect.type === "addPop") {
        return `+${effect.amount} ${formatPopLabel(effect.pop, effect.amount)}`;
      }

      return `+${effect.amount} ${RESOURCE_LABELS[effect.resource]} income`;
    })
    .join(", ");
}

function formatPopLabel(pop: PopType, amount: number) {
  return amount === 1 ? POP_LABELS[pop].singular : POP_LABELS[pop].plural;
}

function formatPopShort(pop: PopType) {
  return POP_LABELS[pop].singular.slice(0, 1).toUpperCase();
}

function buildingName(buildingId: BuildingId) {
  return BUILDINGS.find((building) => building.id === buildingId)?.name ?? buildingId;
}

function AtlasIcon({ icon, className = "" }: { icon: IconAtlasKey; className?: string }) {
  return <span aria-hidden="true" className={`atlasSprite atlasIcon ${ICON_SPRITE_CLASSES[icon]} ${className}`} />;
}

function TerrainSprite({ terrain, className = "" }: { terrain: Terrain; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`atlasSprite atlasTerrain terrainTint-${terrain} ${TERRAIN_SPRITE_CLASSES[terrain]} ${className}`}
    />
  );
}

function UiSprite({ item, className = "" }: { item: UiAtlasKey; className?: string }) {
  return <span aria-hidden="true" className={`atlasSprite atlasUi ${UI_SPRITE_CLASSES[item]} ${className}`} />;
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
