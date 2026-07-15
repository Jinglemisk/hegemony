import { useMemo, useState } from "react";
import { POP_TYPES, getGrowPopStatus, previewGrowPopIncomeDelta } from "../../../game/rules";
import type { PopType } from "../../../game/types";
import { formatPopLabel, formatResourceCost } from "../../../ui/formatters";
import { AtlasIcon } from "../../Sprites";
import { useGameUi } from "../GameUiContext";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { actionRequirementText, settlementPickerLabel } from "../helpers";
import { TilePopover } from "./TilePopover";

/**
 * Grow, map-first (refit scope 3). The settlement is already chosen — the player
 * clicked it — so this only asks which pop, shows what it costs and what it
 * earns, and confirms. The old GrowPopModal covered the board with a dialog whose
 * first control was a dropdown asking which tile; the tile was right there.
 */
export function GrowPopPopover({
  tileId,
  anchor,
  onCancel,
  onConfirm
}: {
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (tileId: string, pop: PopType) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const [pop, setPop] = useState<PopType>("citizens");

  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const status = getGrowPopStatus(G, playerID, tileId, pop);
  // From the engine (R7), and memoized because the preview clones state.
  const benefit = useMemo(
    () => previewGrowPopIncomeDelta(G, playerID, tileId, pop),
    [G, playerID, tileId, pop]
  );

  if (!tile) {
    return null;
  }

  return (
    <TilePopover
      anchor={anchor}
      label="Grow pop"
      measureKey={pop}
      onCancel={onCancel}
      title="Grow Pop"
    >
      <p className="placementSectionLabel placementTargetName">{settlementPickerLabel(G, tile, playerID)}</p>

      {/* growPopChoiceGrid, not foundColonyPopGrid: Found shows a bare pop count
          as its cost, Grow shows "9 Food, 2 Gold" — which needs the stacked rows
          and wrapping this variant already provides. */}
      <div className="popChoiceGrid growPopChoiceGrid popoverChoiceStack" role="group" aria-label="Pop type to grow">
        {POP_TYPES.map((candidate) => {
          const candidateStatus = getGrowPopStatus(G, playerID, tileId, candidate);

          return (
            <button
              className={candidate === pop ? "selectedChoice" : ""}
              key={candidate}
              onClick={() => setPop(candidate)}
              title={candidateStatus.reasons.join(" ") || `Grow 1 ${formatPopLabel(candidate, 1)}.`}
              type="button"
            >
              <AtlasIcon icon={candidate} className="miniIcon" />
              <span>{formatPopLabel(candidate, 1)}</span>
              <strong>{formatResourceCost(candidateStatus.cost ?? {})}</strong>
            </button>
          );
        })}
      </div>

      <div className="growPopBenefitPanel">
        <div>
          <strong>Projected Benefit</strong>
          <ResourceDeltaList resources={benefit} />
        </div>
      </div>

      <div className="foundColonyActions">
        <button className="placementCancelButton" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="primaryButton eventResolveButton"
          disabled={!status.can || !isActive || phase !== "gameplay"}
          onClick={() => onConfirm(tileId, pop)}
          title={actionRequirementText(status, phase, isActive)}
          type="button"
        >
          Grow {formatPopLabel(pop, 1)}
        </button>
      </div>
    </TilePopover>
  );
}
