import { useMemo, useState } from "react";
import { POP_TYPES, getGrowPopStatus, previewGrowPopIncomeDelta } from "../../../game/rules";
import type { PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { MechanicsDetails } from "../../MechanicsDetails";
import { POP_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { ResourceDeltaList } from "../ResourceDeltaList";
import { ResourceChips } from "../ResourceChips";
import { actionRequirementText, gameplayActionDisabled, settlementPickerLabel } from "../helpers";
import { PopoverActions } from "../PopoverActions";
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
  onConfirm,
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
    [G, playerID, tileId, pop],
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
      <p className="placementSectionLabel placementTargetName">
        {settlementPickerLabel(G, tile, playerID)}
      </p>

      {/* growPopChoiceGrid, not foundColonyPopGrid: Found shows a bare pop count
          as its cost, Grow shows "9 Food, 2 Gold" — which needs the stacked rows
          and wrapping this variant already provides. */}
      <div
        className="popChoiceGrid growPopChoiceGrid popoverChoiceStack"
        role="group"
        aria-label="Pop type to grow"
      >
        {POP_TYPES.map((candidate) => {
          const candidateStatus = getGrowPopStatus(G, playerID, tileId, candidate);
          const reason = actionRequirementText(candidateStatus, phase, isActive);
          const blocked = gameplayActionDisabled(candidateStatus, phase, isActive);
          const label = `Grow ${formatPopLabel(candidate, 1)}`;

          return (
            <Tooltip
              content={
                <MechanicsDetails
                  blockedReason={blocked ? reason : undefined}
                  effectiveCost={candidateStatus.cost}
                  heading={label}
                >
                  {!blocked ? <p className="mechanicsExplanation">{reason}</p> : null}
                </MechanicsDetails>
              }
              key={candidate}
              triggerClassName="popoverChoiceTooltipTrigger"
            >
              <button
                className={candidate === pop ? "selectedChoice" : ""}
                onClick={() => setPop(candidate)}
                type="button"
              >
                <Icon glyph={POP_GLYPHS[candidate]} size="rail" className="miniIcon" />
                <span>{formatPopLabel(candidate, 1)}</span>
                <strong>
                  <ResourceChips
                    resources={candidateStatus.cost ?? {}}
                    variant="cost"
                    empty="Free"
                  />
                </strong>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="growPopBenefitPanel">
        <div>
          <strong>Projected Benefit</strong>
          <ResourceDeltaList resources={benefit} />
        </div>
      </div>

      <PopoverActions
        confirmLabel={`Grow ${formatPopLabel(pop, 1)}`}
        disabled={gameplayActionDisabled(status, phase, isActive)}
        title={actionRequirementText(status, phase, isActive)}
        onCancel={onCancel}
        onConfirm={() => onConfirm(tileId, pop)}
      />
    </TilePopover>
  );
}
