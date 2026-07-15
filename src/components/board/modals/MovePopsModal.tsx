import { useEffect, useMemo, useState } from "react";
import { EMPTY_POPS, clonePops, formatPops, getMovePopsStatus, totalPops } from "../../../game/rules";
import type { Pops } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { formatTileName, getSettlementEntries, settlementPickerLabel } from "../helpers";
import { ModalShell } from "./ModalShell";
import { PopulationStepper } from "./PopulationStepper";

export function MovePopsModal({
  onCancel,
  onConfirm
}: {
  onCancel: () => void;
  onConfirm: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
}) {
  const { G, viewerId: playerID } = useGameUi();
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
    <ModalShell className="populationModal" labelledBy="move-pops-title" onDismiss={onCancel}>
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
                      {settlementPickerLabel(G, entry.tile, playerID)} — {formatPops(entry.pops)}
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
                        {settlementPickerLabel(G, entry.tile, playerID)} — {formatPops(entry.pops)}
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
    </ModalShell>
  );
}
