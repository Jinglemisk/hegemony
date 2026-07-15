import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ACTION_COSTS } from "../../../game/data";
import {
  EMPTY_POPS,
  POP_TYPES,
  formatPops,
  getFoundColonyStatus,
  settlementNetYield,
  totalPops
} from "../../../game/rules";
import type { PopType, Settlement } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { SettlementSummaryCard } from "../../SettlementCard";
import { AtlasIcon } from "../../Sprites";
import { useGameUi } from "../GameUiContext";
import { firstAvailablePop, getSettlementEntries, settlementPickerLabel } from "../helpers";
import { CostRow } from "./PlacementModalShell";
import { PopulationStepper } from "./PopulationStepper";

type PopoverPosition = { top: number; left: number; arrowLeft: number; placement: "above" | "below" };

/**
 * Map-anchored founding flow. The target tile is already chosen on the map; this
 * floating panel pops just above or below that tile (whichever fits the viewport)
 * so the board stays visible while the player picks a source pop and confirms.
 */
export function FoundColonyPopover({
  tileId,
  anchor,
  onCancel,
  onConfirm
}: {
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, pop: PopType) => void;
}) {
  const { G, viewerId: playerID } = useGameUi();
  const targetTile = G.board.tiles.find((tile) => tile.id === tileId);
  const sources = useMemo(
    () => getSettlementEntries(G, playerID).filter((entry) => totalPops(entry.pops) > 0),
    [G, playerID]
  );

  const [sourceTileId, setSourceTileId] = useState(() => sources[0]?.tile.id ?? "");
  const source = sources.find((entry) => entry.tile.id === sourceTileId) ?? sources[0];
  const [pop, setPop] = useState<PopType>(() => firstAvailablePop(source?.pops));

  useEffect(() => {
    if (source && source.pops[pop] <= 0) {
      setPop(firstAvailablePop(source.pops));
    }
  }, [pop, source]);

  const ref = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const { width, height } = element.getBoundingClientRect();
    const margin = 12;
    const gap = 12;
    const viewportHeight = window.innerHeight;
    const centerX = anchor.left + anchor.width / 2;
    const left = Math.max(margin, Math.min(centerX - width / 2, window.innerWidth - width - margin));
    const spaceBelow = viewportHeight - anchor.bottom;
    const spaceAbove = anchor.top;
    const placement: "above" | "below" =
      spaceBelow >= height + gap + margin
        ? "below"
        : spaceAbove >= height + gap + margin
          ? "above"
          : spaceBelow >= spaceAbove
            ? "below"
            : "above";
    const rawTop = placement === "below" ? anchor.bottom + gap : anchor.top - height - gap;
    const top = Math.max(margin, Math.min(rawTop, viewportHeight - height - margin));
    const arrowLeft = Math.max(18, Math.min(centerX - left, width - 18));

    setPosition({ top, left, arrowLeft, placement });
  }, [anchor, sources.length, sourceTileId, pop]);

  if (!targetTile) {
    return null;
  }

  const previewSettlement: Settlement = {
    owner: playerID,
    kind: "colony",
    buildings: [],
    pops: { ...EMPTY_POPS, [pop]: 1 }
  };
  const previewYield = settlementNetYield(targetTile, previewSettlement, G.ruleset);
  const cost = getFoundColonyStatus(G, playerID, targetTile.id).cost ?? ACTION_COSTS.foundColony;
  const canConfirm = Boolean(source && source.pops[pop] > 0);

  const style: CSSProperties = position
    ? { top: position.top, left: position.left, opacity: 1 }
    : { top: anchor.bottom + 12, left: anchor.left, opacity: 0 };

  return (
    <div
      aria-label="Found colony"
      className={`foundColonyPopover${position ? ` placement-${position.placement}` : ""}`}
      ref={ref}
      role="dialog"
      style={style}
    >
      <span
        aria-hidden="true"
        className="foundColonyArrow"
        style={{ left: position ? position.arrowLeft : "50%" }}
      />

      <header className="foundColonyHeader">
        <span className="placementPreviewTag">Found Colony</span>
        <button aria-label="Cancel" className="foundColonyClose" onClick={onCancel} type="button">
          ×
        </button>
      </header>

      {sources.length === 0 ? (
        <p className="placementEmptyState">No settlement has a pop to spare for a new colony.</p>
      ) : (
        <>
          <article className="placementPreviewCard settlement-colony foundColonyPreview">
            <SettlementSummaryCard netYield={previewYield} ruleset={G.ruleset} settlement={previewSettlement} tile={targetTile} />
          </article>

          <section className="placementSection">
            <span className="placementSectionLabel">Send a pop from</span>
            <label className="fieldGroup placementField">
              <select value={source?.tile.id ?? ""} onChange={(event) => setSourceTileId(event.target.value)}>
                {sources.map((entry) => (
                  <option value={entry.tile.id} key={entry.tile.id}>
                    {settlementPickerLabel(G, entry.tile, playerID)} — {formatPops(entry.pops)}
                  </option>
                ))}
              </select>
            </label>
            <div className="popChoiceGrid foundColonyPopGrid" role="group" aria-label="Founding pop type">
              {POP_TYPES.map((candidate) => (
                <button
                  className={candidate === pop ? "selectedChoice" : ""}
                  disabled={(source?.pops[candidate] ?? 0) <= 0}
                  key={candidate}
                  onClick={() => setPop(candidate)}
                  type="button"
                >
                  <AtlasIcon icon={candidate} className="miniIcon" />
                  <span>{formatPopLabel(candidate, 1)}</span>
                  <strong>{source?.pops[candidate] ?? 0}</strong>
                </button>
              ))}
            </div>
          </section>

          <CostRow cost={cost} note="Arrives next turn." />

          <div className="foundColonyActions">
            <button className="placementCancelButton" onClick={onCancel} type="button">
              Cancel
            </button>
            <button
              className="primaryButton eventResolveButton"
              disabled={!canConfirm}
              onClick={() => {
                if (source) {
                  onConfirm(source.tile.id, pop);
                }
              }}
              type="button"
            >
              Found Colony
            </button>
          </div>
        </>
      )}
    </div>
  );
}
