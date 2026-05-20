import { useState } from "react";
import type { HegemonyState, PlayerId } from "../game/types";
import type { GameEvents, GameMoves, LocalContext } from "../game/controller";
import { PLAYER_COLORS, PLAYER_IDS } from "../game/data";
import { calculateIncome, calculateIncomeBreakdown, toPlayerId } from "../game/rules";
import { phaseHint } from "../ui/formatters";
import { ActionLogModal } from "./ActionLogModal";
import { HexMap } from "./HexMap";
import { MapStatusOverlay } from "./MapStatusOverlay";
import { PlayerHoldingsSummary } from "./PlayerHoldingsSummary";
import { ResourceGrid } from "./ResourceGrid";
import { SettlementRoster } from "./SettlementRoster";
import { AtlasIcon, UiSprite } from "./Sprites";
import { TileInspector } from "./TileInspector";

type BoardProps = {
  G: HegemonyState;
  ctx: LocalContext;
  moves: GameMoves;
  events: GameEvents;
  playerID: PlayerId;
  onPlayerIDChange: (playerID: PlayerId) => void;
  isActive: boolean;
};

export function HegemonyBoard({
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
  const viewer = G.players[viewerId];
  const projectedIncome = calculateIncome(G, viewerId);
  const projectedIncomeBreakdown = calculateIncomeBreakdown(G, viewerId);
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
        <ResourceGrid
          breakdown={projectedIncomeBreakdown}
          className="topResourceGrid"
          deltas={projectedIncome}
          resetKey={viewerId}
          resources={viewer.resources}
        />
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

      {isLogOpen ? <ActionLogModal G={G} onClose={() => setIsLogOpen(false)} /> : null}
    </main>
  );
}
