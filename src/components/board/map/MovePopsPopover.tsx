import { useState } from "react";
import { EMPTY_POPS, clonePops, formatPops, getMovePopsStatus, totalPops } from "../../../game/rules";
import type { Pops } from "../../../game/types";
import { useGameUi } from "../GameUiContext";
import { actionRequirementText, settlementPickerLabel } from "../helpers";
import { PopulationStepper } from "../modals/PopulationStepper";
import { TilePopover } from "./TilePopover";

/**
 * Move Pops, map-first and two-step (refit scope 3): click the settlement they
 * leave from, then the one they travel to.
 *
 * The old modal asked for source, target AND travellers at once, behind two
 * dropdowns, on top of the board holding the answer. Splitting it in two matches
 * how the decision is actually made — you look at where they are, then at where
 * they're needed — and each step is a click on the thing itself.
 *
 * SOURCE step: name the settlement and confirm it's the one. The travellers are
 * chosen on the TARGET step, once both ends are known — a pop count only means
 * something when you can see what it leaves behind and what it joins.
 */
export function MovePopsSourcePopover({
  tileId,
  anchor,
  onCancel,
  onConfirm
}: {
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (sourceTileId: string) => void;
}) {
  const { G, viewerId: playerID } = useGameUi();
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const settlement = tile?.settlements.find((candidate) => candidate.owner === playerID);

  if (!tile || !settlement) {
    return null;
  }

  return (
    <TilePopover anchor={anchor} label="Move pops from" onCancel={onCancel} title="Move From">
      <p className="placementSectionLabel placementTargetName">{settlementPickerLabel(G, tile, playerID)}</p>
      <p className="placementCostNote">Holds {formatPops(settlement.pops)}.</p>

      <div className="foundColonyActions">
        <button className="placementCancelButton" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="primaryButton eventResolveButton"
          disabled={totalPops(settlement.pops) === 0}
          onClick={() => onConfirm(tileId)}
          type="button"
        >
          Move From Here
        </button>
      </div>
    </TilePopover>
  );
}

/** TARGET step: both ends are known, so now choose exactly who travels. */
export function MovePopsTargetPopover({
  sourceTileId,
  tileId,
  anchor,
  onCancel,
  onConfirm
}: {
  sourceTileId: string;
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const [pops, setPops] = useState<Pops>(() => clonePops(EMPTY_POPS));

  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);
  const sourceTile = G.board.tiles.find((candidate) => candidate.id === sourceTileId);
  const source = sourceTile?.settlements.find((candidate) => candidate.owner === playerID);
  const status = getMovePopsStatus(G, playerID, sourceTileId, tileId, pops);

  if (!tile || !sourceTile || !source) {
    return null;
  }

  return (
    <TilePopover
      anchor={anchor}
      // The pop stepper (label · available · − · n · +) does not fit the default
      // 312px and was clipping its own + buttons.
      className="widePopover"
      label="Move pops to"
      measureKey={totalPops(pops)}
      onCancel={onCancel}
      title="Move To"
    >
      <p className="placementSectionLabel placementTargetName">{settlementPickerLabel(G, tile, playerID)}</p>
      <p className="placementCostNote">
        From {settlementPickerLabel(G, sourceTile, playerID)} — they arrive next turn.
      </p>

      <section className="placementSection">
        <span className="placementSectionLabel">Travellers</span>
        <PopulationStepper maxByPop={source.pops} onChange={setPops} pops={pops} />
      </section>

      <div className="foundColonyActions">
        <button className="placementCancelButton" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="primaryButton eventResolveButton"
          disabled={!status.can || totalPops(pops) === 0 || !isActive || phase !== "gameplay"}
          onClick={() => onConfirm(sourceTileId, tileId, clonePops(pops))}
          title={actionRequirementText(status, phase, isActive)}
          type="button"
        >
          Send {totalPops(pops) > 0 ? formatPops(pops) : "Pops"}
        </button>
      </div>
    </TilePopover>
  );
}
