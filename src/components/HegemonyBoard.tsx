import { useEffect, useState } from "react";
import type { HegemonyState, PlayerId, SettlementKind } from "../game/types";
import type { GameEvents, GameMoves, LocalContext } from "../game/controller";
import { PLAYER_COLORS, PLAYER_IDS } from "../game/data";
import { PLACEMENT_POP_COUNTS, calculateIncome, calculateIncomeBreakdown, toPlayerId, totalPops } from "../game/rules";
import { phaseHint } from "../ui/formatters";
import { ActionLogModal } from "./ActionLogModal";
import { HexMap } from "./HexMap";
import { MapStatusOverlay } from "./MapStatusOverlay";
import { PlayerHoldingsSummary } from "./PlayerHoldingsSummary";
import { FoundColonyModal, MovePopsModal, PopulationPickerModal } from "./PopulationModals";
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

type PendingTileConfirmation = {
  action: "setupCapital" | "setupColony" | "foundColony" | "upgradeCity";
  label: string;
  tileId: string;
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
  const [tileConfirmation, setTileConfirmation] = useState<PendingTileConfirmation | null>(null);
  const [populationPrompt, setPopulationPrompt] = useState<{
    kind: Extract<SettlementKind, "capital" | "colony">;
    tileId: string;
  } | null>(null);
  const [foundingTileId, setFoundingTileId] = useState<string | null>(null);
  const [upgradeTileId, setUpgradeTileId] = useState<string | null>(null);
  const [isMovePopsOpen, setIsMovePopsOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const currentPlayerId = toPlayerId(ctx.currentPlayer);
  const viewerId = toPlayerId(playerID);
  const viewer = G.players[viewerId];
  const projectedIncome = calculateIncome(G, viewerId);
  const projectedIncomeBreakdown = calculateIncomeBreakdown(G, viewerId);
  const isSetup = ctx.phase === "setupCapital" || ctx.phase === "setupColony";
  const upgradeTile = upgradeTileId ? G.board.tiles.find((tile) => tile.id === upgradeTileId) : null;
  const upgradeSettlement = upgradeTile?.settlements.find(
    (settlement) => settlement.owner === viewerId && settlement.kind === "colony"
  );
  const pendingSetupCopy =
    tileConfirmation && isSetup
      ? "Confirm on the tile prompt"
      : isSetup
        ? "Select a tile, then confirm on the map"
        : "Income and building actions";

  useEffect(() => {
    setTileConfirmation(null);
    setPopulationPrompt(null);
    setFoundingTileId(null);
    setUpgradeTileId(null);
    setIsMovePopsOpen(false);
  }, [ctx.phase, ctx.currentPlayer]);

  const handleTileAction = (tileId: string) => {
    setSelectedTileId(tileId);

    if (!isActive) {
      return;
    }

    if (ctx.phase === "setupCapital") {
      setTileConfirmation({ action: "setupCapital", label: "Place Capital?", tileId });
      return;
    }

    if (ctx.phase === "setupColony") {
      setTileConfirmation({ action: "setupColony", label: "Place Colony?", tileId });
      return;
    }

    setTileConfirmation(null);
  };

  const confirmTileAction = () => {
    if (!tileConfirmation) {
      return;
    }

    if (tileConfirmation.action === "setupCapital") {
      setPopulationPrompt({ kind: "capital", tileId: tileConfirmation.tileId });
    } else if (tileConfirmation.action === "setupColony") {
      setPopulationPrompt({ kind: "colony", tileId: tileConfirmation.tileId });
    } else if (tileConfirmation.action === "foundColony") {
      setFoundingTileId(tileConfirmation.tileId);
    } else {
      setUpgradeTileId(tileConfirmation.tileId);
    }

    setTileConfirmation(null);
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
              confirmation={
                tileConfirmation
                  ? {
                      label: tileConfirmation.label,
                      tileId: tileConfirmation.tileId,
                      onCancel: () => setTileConfirmation(null),
                      onConfirm: confirmTileAction
                    }
                  : null
              }
              pendingTileId={tileConfirmation?.tileId ?? null}
              selectedTileId={selectedTileId}
              onTileAction={handleTileAction}
            />
          </div>
          <div className="phaseStrip">
            <span>{phaseHint(ctx.phase)}</span>
            <span>{pendingSetupCopy}</span>
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
            <button
              disabled={!isActive || ctx.phase !== "gameplay" || viewer.settlements.length < 2}
              onClick={() => setIsMovePopsOpen(true)}
            >
              <AtlasIcon icon="citizens" className="buttonInlineIcon" />
              Move Pops
            </button>
          </div>

          <TileInspector
            G={G}
            selectedTileId={selectedTileId}
            playerID={viewerId}
            isActive={isActive}
            phase={ctx.phase}
            moves={moves}
            onFoundColonyRequest={(tileId) => {
              setSelectedTileId(tileId);
              setTileConfirmation({ action: "foundColony", label: "Place Colony?", tileId });
            }}
            onUpgradeCityRequest={(tileId) => {
              setSelectedTileId(tileId);
              setTileConfirmation({ action: "upgradeCity", label: "Place City?", tileId });
            }}
          />
        </aside>
      </section>

      {isLogOpen ? <ActionLogModal G={G} onClose={() => setIsLogOpen(false)} /> : null}
      {populationPrompt ? (
        <PopulationPickerModal
          title={`Choose ${populationPrompt.kind} pops`}
          description={`Allocate exactly ${PLACEMENT_POP_COUNTS[populationPrompt.kind]} starting ${
            PLACEMENT_POP_COUNTS[populationPrompt.kind] === 1 ? "pop" : "pops"
          } before placing this ${populationPrompt.kind}.`}
          requiredTotal={PLACEMENT_POP_COUNTS[populationPrompt.kind]}
          confirmLabel={`Place ${populationPrompt.kind}`}
          onCancel={() => setPopulationPrompt(null)}
          onConfirm={(pops) => {
            if (populationPrompt.kind === "capital") {
              moves.placeCapital(populationPrompt.tileId, pops);
            } else {
              moves.placeColony(populationPrompt.tileId, pops);
            }

            setPopulationPrompt(null);
          }}
        />
      ) : null}
      {foundingTileId ? (
        <FoundColonyModal
          G={G}
          playerID={viewerId}
          targetTileId={foundingTileId}
          onCancel={() => setFoundingTileId(null)}
          onConfirm={(sourceTileId, pop) => {
            moves.foundColony(foundingTileId, sourceTileId, pop);
            setFoundingTileId(null);
          }}
        />
      ) : null}
      {upgradeTileId ? (
        <PopulationPickerModal
          title="Choose city pops"
          description={`Allocate exactly ${totalPops(upgradeSettlement?.pops ?? { citizens: 0, freemen: 0, slaves: 0 })} pops before upgrading this city.`}
          requiredTotal={totalPops(upgradeSettlement?.pops ?? { citizens: 0, freemen: 0, slaves: 0 })}
          initialPops={upgradeSettlement?.pops}
          confirmLabel="Upgrade City"
          onCancel={() => setUpgradeTileId(null)}
          onConfirm={(pops) => {
            moves.upgradeColonyToCity(upgradeTileId, pops);
            setUpgradeTileId(null);
          }}
        />
      ) : null}
      {isMovePopsOpen ? (
        <MovePopsModal
          G={G}
          playerID={viewerId}
          onCancel={() => setIsMovePopsOpen(false)}
          onConfirm={(sourceTileId, targetTileId, pops) => {
            moves.movePops(sourceTileId, targetTileId, pops);
            setIsMovePopsOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
