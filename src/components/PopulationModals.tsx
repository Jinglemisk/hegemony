import { useEffect, useMemo, useState } from "react";
import type { HexTile, HegemonyState, PlayerId, PopType, Pops } from "../game/types";
import {
  EMPTY_POPS,
  POP_TYPES,
  clonePops,
  formatPops,
  getMovePopsStatus,
  totalPops
} from "../game/rules";
import { formatPopLabel } from "../ui/formatters";
import { AtlasIcon, TerrainSprite } from "./Sprites";

type SettlementEntry = {
  tile: HexTile;
  pops: Pops;
};

export function PopulationPickerModal({
  title,
  description,
  requiredTotal,
  initialPops,
  confirmLabel,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  requiredTotal: number;
  initialPops?: Pops;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (pops: Pops) => void;
}) {
  const [pops, setPops] = useState<Pops>(() =>
    initialPops ? clonePops(initialPops) : createDefaultSelection(requiredTotal)
  );
  const selectedTotal = totalPops(pops);
  const remaining = requiredTotal - selectedTotal;

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="logModal populationModal" role="dialog" aria-modal="true" aria-labelledby="population-picker-title">
        <div className="modalHeader">
          <div>
            <h2 id="population-picker-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        <PopulationStepper
          pops={pops}
          maxByPop={{ citizens: requiredTotal, freemen: requiredTotal, slaves: requiredTotal }}
          onChange={setPops}
          totalLimit={requiredTotal}
        />

        <div className="selectionSummary">
          <span>
            Selected <strong>{selectedTotal}</strong>/<strong>{requiredTotal}</strong>
          </span>
          <span className={remaining === 0 ? "positive" : "negative"}>
            {remaining === 0 ? "Ready" : `${Math.abs(remaining)} ${remaining > 0 ? "left" : "too many"}`}
          </span>
        </div>

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={remaining !== 0}
            onClick={() => onConfirm(clonePops(pops))}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function FoundColonyModal({
  G,
  playerID,
  targetTileId,
  onCancel,
  onConfirm
}: {
  G: HegemonyState;
  playerID: PlayerId;
  targetTileId: string;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, pop: PopType) => void;
}) {
  const holdings = useMemo(() => getSettlementEntries(G, playerID).filter((entry) => totalPops(entry.pops) > 0), [
    G,
    playerID
  ]);
  const targetTile = G.board.tiles.find((tile) => tile.id === targetTileId);
  const [sourceTileId, setSourceTileId] = useState(() => holdings[0]?.tile.id ?? "");
  const source = holdings.find((entry) => entry.tile.id === sourceTileId) ?? holdings[0];
  const availablePop = POP_TYPES.find((pop) => (source?.pops[pop] ?? 0) > 0) ?? "citizens";
  const [pop, setPop] = useState<PopType>(availablePop);

  useEffect(() => {
    if (!source) {
      return;
    }

    if (source.pops[pop] <= 0) {
      setPop(POP_TYPES.find((candidate) => source.pops[candidate] > 0) ?? "citizens");
    }
  }, [pop, source]);

  const canConfirm = Boolean(source && source.pops[pop] > 0);

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="logModal populationModal" role="dialog" aria-modal="true" aria-labelledby="found-colony-title">
        <div className="modalHeader">
          <div>
            <h2 id="found-colony-title">Found Colony</h2>
            <p>Choose one existing pop to travel to the new colony and arrive next turn.</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        {targetTile ? (
          <div className="targetTileSummary">
            <TerrainSprite terrain={targetTile.terrain} className="terrainChip" />
            <span>
              Target <strong>{targetTile.terrain}</strong>, {targetTile.resource.amount} {targetTile.resource.type}
            </span>
          </div>
        ) : null}

        {holdings.length > 0 ? (
          <>
            <label className="fieldGroup">
              <span>Source settlement</span>
              <select value={source?.tile.id ?? ""} onChange={(event) => setSourceTileId(event.target.value)}>
                {holdings.map((entry) => (
                  <option value={entry.tile.id} key={entry.tile.id}>
                    {entry.tile.terrain} {entry.tile.id} - {formatPops(entry.pops)}
                  </option>
                ))}
              </select>
            </label>

            <div className="popChoiceGrid" role="group" aria-label="Founding pop type">
              {POP_TYPES.map((candidate) => (
                <button
                  className={candidate === pop ? "selectedChoice" : ""}
                  disabled={(source?.pops[candidate] ?? 0) <= 0}
                  key={candidate}
                  onClick={() => setPop(candidate)}
                >
                  <AtlasIcon icon={candidate} className="miniIcon" />
                  <span>{formatPopLabel(candidate, 1)}</span>
                  <strong>{source?.pops[candidate] ?? 0}</strong>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="emptyState">No available pops can travel to seed a colony.</p>
        )}

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={!canConfirm}
            onClick={() => {
              if (source) {
                onConfirm(source.tile.id, pop);
              }
            }}
          >
            Confirm Colony
          </button>
        </div>
      </section>
    </div>
  );
}

export function MovePopsModal({
  G,
  playerID,
  onCancel,
  onConfirm
}: {
  G: HegemonyState;
  playerID: PlayerId;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
}) {
  const holdings = useMemo(() => getSettlementEntries(G, playerID), [G, playerID]);
  const [sourceTileId, setSourceTileId] = useState(() => holdings[0]?.tile.id ?? "");
  const [targetTileId, setTargetTileId] = useState(() => holdings.find((entry) => entry.tile.id !== holdings[0]?.tile.id)?.tile.id ?? "");
  const [pops, setPops] = useState<Pops>(() => clonePops(EMPTY_POPS));
  const source = holdings.find((entry) => entry.tile.id === sourceTileId);
  const status = getMovePopsStatus(G, playerID, sourceTileId, targetTileId, pops);
  const transfers = G.transfers.filter((transfer) => transfer.owner === playerID);

  useEffect(() => {
    setPops(clonePops(EMPTY_POPS));
  }, [sourceTileId]);

  useEffect(() => {
    if (targetTileId !== sourceTileId) {
      return;
    }

    setTargetTileId(holdings.find((entry) => entry.tile.id !== sourceTileId)?.tile.id ?? "");
  }, [holdings, sourceTileId, targetTileId]);

  return (
    <div className="modalBackdrop" role="presentation">
      <section className="logModal populationModal" role="dialog" aria-modal="true" aria-labelledby="move-pops-title">
        <div className="modalHeader">
          <div>
            <h2 id="move-pops-title">Move Pops</h2>
            <p>Select a source, target, and exact travelers. They arrive on your next turn.</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        {holdings.length >= 2 ? (
          <>
            <div className="moveFields">
              <label className="fieldGroup">
                <span>Source</span>
                <select value={sourceTileId} onChange={(event) => setSourceTileId(event.target.value)}>
                  {holdings.map((entry) => (
                    <option value={entry.tile.id} key={entry.tile.id}>
                      {entry.tile.terrain} {entry.tile.id} - {formatPops(entry.pops)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fieldGroup">
                <span>Target</span>
                <select value={targetTileId} onChange={(event) => setTargetTileId(event.target.value)}>
                  {holdings
                    .filter((entry) => entry.tile.id !== sourceTileId)
                    .map((entry) => (
                      <option value={entry.tile.id} key={entry.tile.id}>
                        {entry.tile.terrain} {entry.tile.id} - {formatPops(entry.pops)}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <PopulationStepper
              pops={pops}
              maxByPop={source?.pops ?? EMPTY_POPS}
              onChange={setPops}
            />

            {status.reasons.length > 0 ? (
              <div className="selectionSummary negative">
                <span>{status.reasons.join(" ")}</span>
              </div>
            ) : (
              <div className="selectionSummary positive">
                <span>Ready to move {formatPops(pops)}</span>
              </div>
            )}
          </>
        ) : (
          <p className="emptyState">You need at least two settlements before moving pops.</p>
        )}

        <div className="transferList">
          <h3>In Transit</h3>
          {transfers.length > 0 ? (
            transfers.map((transfer) => (
              <span key={transfer.id}>
                {formatPops(transfer.pops)} from {formatTileName(G, transfer.fromTileId)} to{" "}
                {formatTileName(G, transfer.toTileId)}
              </span>
            ))
          ) : (
            <em>No pops are in transit.</em>
          )}
        </div>

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={!status.can}
            onClick={() => onConfirm(sourceTileId, targetTileId, clonePops(pops))}
          >
            Send Pops
          </button>
        </div>
      </section>
    </div>
  );
}

function PopulationStepper({
  pops,
  maxByPop,
  totalLimit,
  onChange
}: {
  pops: Pops;
  maxByPop: Pops;
  totalLimit?: number;
  onChange: (pops: Pops) => void;
}) {
  const selectedTotal = totalPops(pops);

  function setAmount(pop: PopType, nextAmount: number) {
    const cappedByPop = Math.max(0, Math.min(nextAmount, maxByPop[pop]));
    const otherTotal = selectedTotal - pops[pop];
    const cappedByTotal = totalLimit === undefined ? cappedByPop : Math.min(cappedByPop, Math.max(0, totalLimit - otherTotal));
    onChange({ ...pops, [pop]: cappedByTotal });
  }

  return (
    <div className="populationStepper">
      {POP_TYPES.map((pop) => (
        <div className="popStepperRow" key={pop}>
          <span className="popStepperLabel">
            <AtlasIcon icon={pop} className="miniIcon" />
            <strong>{formatPopLabel(pop, 2)}</strong>
            <em>Available {maxByPop[pop]}</em>
          </span>
          <div className="stepperControls">
            <button disabled={pops[pop] <= 0} onClick={() => setAmount(pop, pops[pop] - 1)}>
              -
            </button>
            <input
              aria-label={`${formatPopLabel(pop, 2)} to select`}
              min={0}
              max={maxByPop[pop]}
              type="number"
              value={pops[pop]}
              onChange={(event) => setAmount(pop, Number(event.target.value))}
            />
            <button
              disabled={pops[pop] >= maxByPop[pop] || (totalLimit !== undefined && selectedTotal >= totalLimit)}
              onClick={() => setAmount(pop, pops[pop] + 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getSettlementEntries(G: HegemonyState, playerID: PlayerId): SettlementEntry[] {
  return G.board.tiles
    .map((tile) => {
      const settlement = tile.settlements.find((candidate) => candidate.owner === playerID);

      return settlement ? { tile, pops: settlement.pops } : null;
    })
    .filter((entry): entry is SettlementEntry => Boolean(entry));
}

function createDefaultSelection(requiredTotal: number): Pops {
  return {
    citizens: requiredTotal > 0 ? 1 : 0,
    freemen: Math.max(0, requiredTotal - 1),
    slaves: 0
  };
}

function formatTileName(G: HegemonyState, tileId: string) {
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);

  return tile ? `${tile.terrain} ${tile.id}` : tileId;
}
