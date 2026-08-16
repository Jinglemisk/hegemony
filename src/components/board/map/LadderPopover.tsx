import {
  demotionTarget,
  getDemotePopStatus,
  getPromotePopStatus,
  promotionTarget,
} from "../../../game/rules";
import type { PopType } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { POP_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { useGameUi } from "../GameUiContext";
import { ResourceChips } from "../ResourceChips";
import { actionRequirementText, gameplayActionDisabled, settlementPickerLabel } from "../helpers";
import { PopoverActions } from "../PopoverActions";
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
  onConfirm,
}: {
  request: LadderRequest;
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (tileId: string, from: PopType, kind: "promote" | "demote") => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const { kind, from } = request;
  const status =
    kind === "promote"
      ? getPromotePopStatus(G, playerID, tileId, from)
      : getDemotePopStatus(G, playerID, tileId, from);
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
      <p className="placementSectionLabel placementTargetName">
        {settlementPickerLabel(G, tile, playerID)}
      </p>

      <div className="ladderMoveRow" aria-hidden="true">
        <Icon glyph={POP_GLYPHS[from]} size="rail" className="miniIcon" />
        <span>{formatPopLabel(from, 1)}</span>
        <span className="meterSlash">→</span>
        <Icon glyph={POP_GLYPHS[to]} size="rail" className="miniIcon" />
        <span>{formatPopLabel(to, 1)}</span>
      </div>

      <div className="placementCostRow">
        <span className="placementSectionLabel">Cost</span>
        <span>
          <ResourceChips resources={status.cost ?? {}} variant="cost" empty="Free" />
        </span>
      </div>

      <PopoverActions
        confirmLabel={kind === "promote" ? "Promote" : "Demote"}
        disabled={gameplayActionDisabled(status, phase, isActive)}
        title={actionRequirementText(status, phase, isActive)}
        onCancel={onCancel}
        onConfirm={() => onConfirm(tileId, from, kind)}
      />
    </TilePopover>
  );
}
