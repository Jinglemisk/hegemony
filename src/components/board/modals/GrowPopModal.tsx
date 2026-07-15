import { useEffect, useMemo, useState } from "react";
import type { Phase } from "../../../game/controller";
import { POP_TYPES, getGrowPopStatus, settlementCapacity, totalPops } from "../../../game/rules";
import type { HegemonyState, PlayerId, PopType } from "../../../game/types";
import { ModalShell } from "./ModalShell";
import { formatPopLabel, formatResourceCost } from "../../../ui/formatters";
import { AtlasIcon } from "../../Sprites";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { useGameUi } from "../GameUiContext";
import {
  actionRequirementText,
  actionTitle,
  createEmptyResources,
  estimateGrowPopIncomeDelta,
  getOwnedHoldings,
  holdingShortLabel,
  settlementPickerLabel
} from "../helpers";

export function GrowPopModal({
  initialTileId,
  onCancel,
  onConfirm
}: {
  initialTileId: string | null;
  onCancel: () => void;
  onConfirm: (tileId: string, pop: PopType) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const holdings = useMemo(() => getOwnedHoldings(G, playerID), [G, playerID]);
  const initialHolding = holdings.find(({ tile }) => tile.id === initialTileId) ?? holdings[0];
  const [tileId, setTileId] = useState(initialHolding?.tile.id ?? "");
  const [pop, setPop] = useState<PopType>("citizens");
  const holding = holdings.find(({ tile }) => tile.id === tileId) ?? holdings[0];
  const status = holding ? getGrowPopStatus(G, playerID, holding.tile.id, pop) : null;
  const disabled = !holding || !isActive || phase !== "gameplay" || !status?.can;
  const benefit = holding ? estimateGrowPopIncomeDelta(holding.tile, holding.settlement, pop) : createEmptyResources();

  useEffect(() => {
    if (!holding && holdings[0]) {
      setTileId(holdings[0].tile.id);
    }
  }, [holding, holdings]);

  return (
    <ModalShell className="populationModal growPopModal" labelledBy="grow-pop-title" onDismiss={onCancel}>
        <div className="modalHeader">
          <div>
            <h2 id="grow-pop-title">Grow Pop</h2>
            <p>Choose the holding and pop type, then confirm the cost and projected income change.</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        {holdings.length > 0 ? (
          <>
            <label className="fieldGroup">
              <span>Holding</span>
              <select value={holding?.tile.id ?? ""} onChange={(event) => setTileId(event.target.value)}>
                {holdings.map(({ tile, settlement }) => (
                  <option value={tile.id} key={tile.id}>
                    {settlementPickerLabel(G, tile, playerID)} · {totalPops(settlement.pops)}/{settlementCapacity(settlement, G.ruleset)} pops
                  </option>
                ))}
              </select>
            </label>

            <div className="popChoiceGrid growPopChoiceGrid" role="group" aria-label="Pop type to grow">
              {POP_TYPES.map((candidate) => {
                const candidateStatus = holding ? getGrowPopStatus(G, playerID, holding.tile.id, candidate) : null;

                return (
                  <button
                    className={candidate === pop ? "selectedChoice" : ""}
                    key={candidate}
                    onClick={() => setPop(candidate)}
                    title={actionTitle(`Grow ${formatPopLabel(candidate, 1)}`, candidateStatus, phase, isActive)}
                  >
                    <AtlasIcon icon={candidate} className="miniIcon" />
                    <span>{formatPopLabel(candidate, 1)}</span>
                    <strong>{formatResourceCost(candidateStatus?.cost ?? {})}</strong>
                  </button>
                );
              })}
            </div>

            <div className="growPopBenefitPanel">
              <div>
                <strong>Projected Benefit</strong>
                <ResourceDeltaList resources={benefit} />
              </div>
              <div>
                <strong>Cost</strong>
                <span>{formatResourceCost(status?.cost ?? {})}</span>
              </div>
            </div>

            {disabled ? (
              <div className="selectionSummary negative">
                <span>{actionRequirementText(status, phase, isActive)}</span>
              </div>
            ) : (
              <div className="selectionSummary positive">
                <span>
                  Ready to grow 1 {formatPopLabel(pop, 1)} in {holdingShortLabel(holding.tile, holding.settlement)}.
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="emptyState">No owned holdings can grow pops yet.</p>
        )}

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={disabled}
            onClick={() => {
              if (holding) {
                onConfirm(holding.tile.id, pop);
              }
            }}
          >
            Grow Pop
          </button>
        </div>
    </ModalShell>
  );
}
