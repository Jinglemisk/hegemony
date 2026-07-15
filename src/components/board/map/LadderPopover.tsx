import {
  demotionTarget,
  getDemotePopStatus,
  getPromotePopStatus,
  promotionTarget
} from "../../../game/rules";
import type { PopType } from "../../../game/types";
import { formatPopLabel, formatResourceCost } from "../../../ui/formatters";
import { AtlasIcon } from "../../Sprites";
import { useGameUi } from "../GameUiContext";
import { actionRequirementText, settlementPickerLabel } from "../helpers";
import { TilePopover } from "./TilePopover";

export type LadderRequest = { kind: "promote" | "demote"; from: PopType };

/**
 * The social ladder, map-first (refit scope 3 / D8). The player picks WHICH
 * settlement pays the move — a slave's yield depends on its tile, so the town is
 * the decision — and now they pick it by clicking the town rather than reading a
 * list of towns in a dialog laid over them. (Within a town, pops of a type are
 * identical; there is no "which slave".)
 */
export function LadderPopover({
  request,
  tileId,
  anchor,
  onCancel,
  onConfirm
}: {
  request: LadderRequest;
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (tileId: string, from: PopType, kind: "promote" | "demote") => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const { kind, from } = request;
  const status = kind === "promote" ? getPromotePopStatus(G, playerID, tileId, from) : getDemotePopStatus(G, playerID, tileId, from);
  const to = kind === "promote" ? promotionTarget(from) : demotionTarget(from);
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);

  if (!tile || !to) {
    return null;
  }

  return (
    <TilePopover
      anchor={anchor}
      label={`${kind === "promote" ? "Promote" : "Demote"} a pop`}
      onCancel={onCancel}
      title={kind === "promote" ? "Promote" : "Demote"}
    >
      <p className="placementSectionLabel placementTargetName">{settlementPickerLabel(G, tile, playerID)}</p>

      <div className="ladderMoveRow" aria-hidden="true">
        <AtlasIcon icon={from} className="miniIcon" />
        <span>{formatPopLabel(from, 1)}</span>
        <span className="meterSlash">→</span>
        <AtlasIcon icon={to} className="miniIcon" />
        <span>{formatPopLabel(to, 1)}</span>
      </div>

      <div className="placementCostRow">
        <span className="placementSectionLabel">Cost</span>
        <span>{formatResourceCost(status.cost ?? {}) || "Free"}</span>
      </div>

      <div className="foundColonyActions">
        <button className="placementCancelButton" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="primaryButton eventResolveButton"
          disabled={!status.can || !isActive || phase !== "gameplay"}
          onClick={() => onConfirm(tileId, from, kind)}
          title={actionRequirementText(status, phase, isActive)}
          type="button"
        >
          {kind === "promote" ? "Promote" : "Demote"}
        </button>
      </div>
    </TilePopover>
  );
}
