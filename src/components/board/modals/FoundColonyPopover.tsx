import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_POPS,
  POP_TYPES,
  formatPops,
  getFoundColonyStatus,
  getTile,
  settlementNetYield,
  totalPops,
} from "../../../game/rules";
import type { PopType, Settlement } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { SettlementSummaryCard } from "../../SettlementCard";
import { AtlasIcon } from "../../Sprites";
import { useGameUi } from "../GameUiContext";
import { TileListbox } from "../TileListbox";
import { firstAvailablePop, getSettlementEntries, settlementPickerLabel } from "../helpers";
import { PopoverActions } from "../PopoverActions";
import { TilePopover } from "../map/TilePopover";
import { CostRow } from "./PlacementModalShell";

/**
 * Map-anchored founding flow. The target tile is already chosen on the map; this
 * floating panel pops just above or below that tile (whichever fits the viewport)
 * so the board stays visible while the player picks a source pop and confirms.
 */
export function FoundColonyPopover({
  tileId,
  anchor,
  onCancel,
  onConfirm,
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
    [G, playerID],
  );

  const [sourceTileId, setSourceTileId] = useState(() => sources[0]?.tile.id ?? "");
  const source = sources.find((entry) => entry.tile.id === sourceTileId) ?? sources[0];
  const [pop, setPop] = useState<PopType>(() => firstAvailablePop(source?.pops));

  useEffect(() => {
    if (source && source.pops[pop] <= 0) {
      setPop(firstAvailablePop(source.pops));
    }
  }, [pop, source]);

  if (!targetTile) {
    return null;
  }

  const previewSettlement: Settlement = {
    owner: playerID,
    kind: "colony",
    buildings: [],
    pops: { ...EMPTY_POPS, [pop]: 1 },
  };
  const previewYield = settlementNetYield(
    targetTile,
    previewSettlement,
    G.ruleset,
    G.definition.content,
  );
  // Fall back to the LIVE ruleset, never the ACTION_COSTS default: the status cost
  // has season multipliers and discounts already applied, and the ruleset itself is
  // patchable (R7). This branch is defensive — the status always carries a cost.
  const cost =
    getFoundColonyStatus(G, playerID, targetTile.id).cost ?? G.ruleset.actionCosts.foundColony;
  const canConfirm = Boolean(source && source.pops[pop] > 0);

  return (
    <TilePopover
      anchor={anchor}
      label="Found colony"
      measureKey={`${sources.length}-${sourceTileId}-${pop}`}
      onCancel={onCancel}
      title="Found Colony"
    >
      {sources.length === 0 ? (
        <p className="placementEmptyState">No settlement has a pop to spare for a new colony.</p>
      ) : (
        <>
          <article className="placementPreviewCard settlement-colony foundColonyPreview">
            <SettlementSummaryCard
              content={G.definition.content}
              netYield={previewYield}
              ruleset={G.ruleset}
              settlement={previewSettlement}
              tile={targetTile}
            />
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
                icon: entry.tile.settlements.some(
                  (s) => s.owner === playerID && s.kind !== "colony",
                )
                  ? "city"
                  : "colony",
                title: settlementPickerLabel(G, entry.tile, playerID),
                detail: formatPops(entry.pops),
                label: `Send a pop from ${settlementPickerLabel(G, entry.tile, playerID)} — holds ${formatPops(entry.pops)}.`,
              }))}
              value={source?.tile.id ?? null}
            />
            {/* Stacked, not 3-up: in a 312px popover the columns clipped "Citizen" to
                  "C." — same squeeze the Grow popover hit. */}
            <div
              className="popChoiceGrid foundColonyPopGrid popoverChoiceStack"
              role="group"
              aria-label="Founding pop type"
            >
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

          <PopoverActions
            confirmLabel="Found Colony"
            disabled={!canConfirm}
            onCancel={onCancel}
            onConfirm={() => {
              if (source) {
                onConfirm(source.tile.id, pop);
              }
            }}
          />
        </>
      )}
    </TilePopover>
  );
}
