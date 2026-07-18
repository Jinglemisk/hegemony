import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  EMPTY_POPS,
  POP_TYPES,
  formatPops,
  getFoundColonyStatus,
  getTile,
  settlementNetYield,
  totalPops
} from "../../../game/rules";
import type { PopType, Settlement } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { SettlementSummaryCard } from "../../SettlementCard";
import { AtlasIcon } from "../../Sprites";
import { ANCHOR_MARGIN, clampAnchoredLeft } from "../../../ui/anchoring";
import { useGameUi } from "../GameUiContext";
import { TileListbox } from "../TileListbox";
import { firstAvailablePop, getSettlementEntries, settlementPickerLabel } from "../helpers";
import { CostRow } from "./PlacementModalShell";
import { PopulationStepper } from "./PopulationStepper";

type PopoverPosition = { top: number; left: number; arrowLeft: number; placement: "above" | "below" };

/** Breathing room between the popover and the tile it points at. */
const POPOVER_GAP = 12;
/** Keeps the arrow inside the popover's rounded corners. */
const ARROW_INSET = 18;

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
  const targetTile = getTile(G, tileId);
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
    const margin = ANCHOR_MARGIN;
    const viewportHeight = window.innerHeight;
    const centerX = anchor.left + anchor.width / 2;
    const left = clampAnchoredLeft(centerX, width, margin);
    // Unlike the building tooltip, this measures itself and takes whichever side
    // actually has room for it.
    const spaceBelow = viewportHeight - anchor.bottom;
    const spaceAbove = anchor.top;
    const placement: "above" | "below" =
      spaceBelow >= height + POPOVER_GAP + margin
        ? "below"
        : spaceAbove >= height + POPOVER_GAP + margin
          ? "above"
          : spaceBelow >= spaceAbove
            ? "below"
            : "above";
    const rawTop = placement === "below" ? anchor.bottom + POPOVER_GAP : anchor.top - height - POPOVER_GAP;
    const top = Math.max(margin, Math.min(rawTop, viewportHeight - height - margin));
    const arrowLeft = Math.max(ARROW_INSET, Math.min(centerX - left, width - ARROW_INSET));

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
  // Fall back to the LIVE ruleset, never the ACTION_COSTS default: the status cost
  // has season multipliers and discounts already applied, and the ruleset itself is
  // patchable (R7). This branch is defensive — the status always carries a cost.
  const cost = getFoundColonyStatus(G, playerID, targetTile.id).cost ?? G.ruleset.actionCosts.foundColony;
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
            {/* The TARGET was picked on the map; the SOURCE is a list because the
                popover is already open over the board — a second map pick would
                fight the first. Scope 4's listbox, not a native select. */}
            <TileListbox
              ariaLabel="Settlement the pop leaves from"
              onChange={setSourceTileId}
              options={sources.map((entry) => ({
                value: entry.tile.id,
                icon: entry.tile.settlements.some((s) => s.owner === playerID && s.kind !== "colony") ? "city" : "colony",
                title: settlementPickerLabel(G, entry.tile, playerID),
                detail: formatPops(entry.pops),
                label: `Send a pop from ${settlementPickerLabel(G, entry.tile, playerID)} — holds ${formatPops(entry.pops)}.`
              }))}
              value={source?.tile.id ?? null}
            />
            {/* Stacked, not 3-up: in a 312px popover the columns clipped "Citizen" to
                  "C." — same squeeze the Grow popover hit. */}
              <div className="popChoiceGrid foundColonyPopGrid popoverChoiceStack" role="group" aria-label="Founding pop type">
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
