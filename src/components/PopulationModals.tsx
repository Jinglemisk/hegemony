import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { HexTile, HegemonyState, PlayerId, PopType, Pops, Resource, Resources, Settlement } from "../game/types";
import {
  EMPTY_POPS,
  POP_TYPES,
  clonePops,
  formatPops,
  getFoundColonyStatus,
  getMovePopsStatus,
  getUpgradeColonyToCityStatus,
  previewUpgradeColonyToCity,
  settlementNetYield,
  settlementPopCapacity,
  totalPops
} from "../game/rules";
import { ACTION_COSTS } from "../game/data";
import { formatPopLabel, formatResourceDelta } from "../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../ui/resourceVisuals";
import { SettlementSummaryCard } from "./SettlementCard";
import { settlementPickerLabel } from "./board/helpers";
import { AtlasIcon, ResourceIcon } from "./Sprites";
import { ModalShell } from "./board/modals/ModalShell";

type SettlementEntry = {
  tile: HexTile;
  pops: Pops;
};

export function PopulationPickerModal({
  title,
  description,
  requiredTotal,
  initialPops,
  confirmLabel,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  requiredTotal: number;
  initialPops?: Pops;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (pops: Pops) => void;
}) {
  const [pops, setPops] = useState<Pops>(() =>
    initialPops ? clonePops(initialPops) : createDefaultSelection(requiredTotal)
  );
  const selectedTotal = totalPops(pops);
  const remaining = requiredTotal - selectedTotal;

  return (
    <ModalShell className="populationModal" labelledBy="population-picker-title" onDismiss={onCancel}>
        <div className="modalHeader">
          <div>
            <h2 id="population-picker-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        <PopulationStepper
          pops={pops}
          maxByPop={{ citizens: requiredTotal, freemen: requiredTotal, slaves: requiredTotal }}
          onChange={setPops}
          totalLimit={requiredTotal}
        />

        <div className="selectionSummary">
          <span>
            Selected <strong>{selectedTotal}</strong>/<strong>{requiredTotal}</strong>
          </span>
          <span className={remaining === 0 ? "positive" : "negative"}>
            {remaining === 0 ? "Ready" : `${Math.abs(remaining)} ${remaining > 0 ? "left" : "too many"}`}
          </span>
        </div>

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={remaining !== 0}
            onClick={() => onConfirm(clonePops(pops))}
          >
            {confirmLabel}
          </button>
        </div>
    </ModalShell>
  );
}

type PopoverPosition = { top: number; left: number; arrowLeft: number; placement: "above" | "below" };

/**
 * Map-anchored founding flow. The target tile is already chosen on the map; this
 * floating panel pops just above or below that tile (whichever fits the viewport)
 * so the board stays visible while the player picks a source pop and confirms.
 */
export function FoundColonyPopover({
  G,
  playerID,
  tileId,
  anchor,
  onCancel,
  onConfirm
}: {
  G: HegemonyState;
  playerID: PlayerId;
  tileId: string;
  anchor: DOMRect;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, pop: PopType) => void;
}) {
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

export function UpgradeCityModal({
  G,
  playerID,
  onCancel,
  onConfirm
}: {
  G: HegemonyState;
  playerID: PlayerId;
  onCancel: () => void;
  onConfirm: (tileId: string, pops: Pops) => void;
}) {
  const candidates = useMemo(() => {
    const entries: Array<{ tile: HexTile; settlement: Settlement }> = [];

    for (const tile of G.board.tiles) {
      const settlement = tile.settlements.find(
        (candidate) => candidate.owner === playerID && candidate.kind === "colony"
      );

      if (settlement && getUpgradeColonyToCityStatus(G, playerID, tile.id).can) {
        entries.push({ tile, settlement });
      }
    }

    return entries;
  }, [G, playerID]);

  const [tileId, setTileId] = useState(() => candidates[0]?.tile.id ?? "");
  const selected = candidates.find((entry) => entry.tile.id === tileId) ?? candidates[0];
  const [pops, setPops] = useState<Pops>(() => clonePops(selected?.settlement.pops ?? EMPTY_POPS));

  useEffect(() => {
    setPops(clonePops(selected?.settlement.pops ?? EMPTY_POPS));
  }, [selected?.tile.id]);

  const requiredTotal = selected ? totalPops(selected.settlement.pops) : 0;
  const selectedTotal = totalPops(pops);
  const remaining = requiredTotal - selectedTotal;
  const colonyYield = selected ? settlementNetYield(selected.tile, selected.settlement, G.ruleset) : null;
  const preview = selected ? previewUpgradeColonyToCity(G, playerID, selected.tile.id, pops) : null;
  const cost = (selected && getUpgradeColonyToCityStatus(G, playerID, selected.tile.id).cost) ?? ACTION_COSTS.upgradeColonyToCity;
  const canConfirm = Boolean(selected) && remaining === 0;

  return (
    <PlacementModalShell
      kicker="Upgrade to City"
      title={`Player ${G.players[playerID].name}`}
      labelledBy="upgrade-city-title"
      confirmLabel="Upgrade City"
      canConfirm={canConfirm}
      onCancel={onCancel}
      onConfirm={() => {
        if (selected) {
          onConfirm(selected.tile.id, clonePops(pops));
        }
      }}
    >
      {candidates.length === 0 ? (
        <p className="placementEmptyState">No colony can be upgraded into a city right now.</p>
      ) : (
        <>
          {candidates.length > 1 ? (
            <section className="placementSection">
              <span className="placementSectionLabel">Choose a colony</span>
              <div className="placementPickerGrid" role="group" aria-label="Colony to upgrade">
                {candidates.map(({ tile, settlement }) => {
                  const rivals = tile.settlements.filter((candidate) => candidate.owner !== playerID);

                  return (
                  <button
                    className={tile.id === selected?.tile.id ? "placementPickerChip selectedChoice" : "placementPickerChip"}
                    key={tile.id}
                    onClick={() => setTileId(tile.id)}
                    title={settlementPickerLabel(G, tile, playerID)}
                    type="button"
                  >
                    <AtlasIcon icon="colony" className="miniIcon" />
                    <span className="placementChipText">
                      <strong>
                        {capitalize(tile.terrain)} +{tile.resource.amount} {tile.resource.type}
                      </strong>
                      <em>
                        {tile.id} · {totalPops(settlement.pops)}/{settlementPopCapacity("colony", G.ruleset)}
                        {rivals.length > 0
                          ? ` · evicts ${rivals.map((candidate) => G.players[candidate.owner].name).join(", ")}`
                          : ""}
                      </em>
                    </span>
                  </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {selected && colonyYield ? (
            <article className="placementPreviewCard settlement-colony">
              <span className="placementPreviewTag">Upgrading this colony</span>
              <SettlementSummaryCard netYield={colonyYield} ruleset={G.ruleset} settlement={selected.settlement} tile={selected.tile} />
            </article>
          ) : null}

          <div className="placementUpgradeArrow" aria-hidden="true">
            <AtlasIcon icon="colony" className="miniIcon" />
            <span>becomes</span>
            <AtlasIcon icon="city" className="miniIcon" />
          </div>

          <div className="placementCityPreview">
            <span className="placementUpgradeStat">
              <em>Capacity</em>
              <strong>
                {settlementPopCapacity("colony", G.ruleset)} <span className="meterSlash">→</span> {settlementPopCapacity("city", G.ruleset)}
              </strong>
            </span>
            <span className="placementUpgradeStat">
              <em>Projected income</em>
              <strong>{preview ? formatResourceDelta(preview.incomeDelta) : "—"}</strong>
            </span>
          </div>

          <section className="placementSection">
            <span className="placementSectionLabel">City population</span>
            <PopulationStepper
              pops={pops}
              maxByPop={{ citizens: requiredTotal, freemen: requiredTotal, slaves: requiredTotal }}
              onChange={setPops}
              totalLimit={requiredTotal}
            />
            <div className="selectionSummary">
              <span>
                Allocated <strong>{selectedTotal}</strong>/<strong>{requiredTotal}</strong>
              </span>
              <span className={remaining === 0 ? "positive" : "negative"}>
                {remaining === 0 ? "Ready" : `${Math.abs(remaining)} ${remaining > 0 ? "left" : "too many"}`}
              </span>
            </div>
          </section>

          <CostRow cost={cost} />
        </>
      )}
    </PlacementModalShell>
  );
}

export function MovePopsModal({
  G,
  playerID,
  onCancel,
  onConfirm
}: {
  G: HegemonyState;
  playerID: PlayerId;
  onCancel: () => void;
  onConfirm: (sourceTileId: string, targetTileId: string, pops: Pops) => void;
}) {
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

/**
 * Shared event-card-grade shell for placement actions (found colony, upgrade city).
 * Mirrors the PendingPlayerEventModal surface but with auto height + scrollable body.
 */
function PlacementModalShell({
  kicker,
  title,
  labelledBy,
  confirmLabel,
  canConfirm,
  onCancel,
  onConfirm,
  children
}: {
  kicker: string;
  title: string;
  labelledBy: string;
  confirmLabel: string;
  canConfirm: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <ModalShell
      backdropClassName="eventModalBackdrop placementModalBackdrop"
      className="placementCardReveal"
      labelledBy={labelledBy}
      onDismiss={onCancel}
    >
      <div className="placementCardSurface">
        <div className="eventCardCrest">
          <span>{kicker}</span>
          <b>{title}</b>
        </div>

        <div className="placementCardBody" id={labelledBy}>
          {children}
        </div>

        <div className="placementCardFooter">
          <button className="placementCancelButton" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="primaryButton eventResolveButton"
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function CostRow({ cost, note }: { cost: Partial<Resources>; note?: string }) {
  const entries = RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) !== 0);

  return (
    <div className="placementCostRow">
      <span className="placementSectionLabel">Cost</span>
      <span className="placementCostChips">
        {entries.length > 0 ? (
          entries.map((resource) => (
            <span className="placementCostChip" key={resource} style={resourceCssVars(resource as Resource)}>
              <ResourceIcon resource={resource as Resource} className="miniResourceIcon" />
              <strong>{cost[resource]}</strong>
            </span>
          ))
        ) : (
          <em>Free</em>
        )}
      </span>
      {note ? <span className="placementCostNote">{note}</span> : null}
    </div>
  );
}

function PopulationStepper({
  pops,
  maxByPop,
  totalLimit,
  onChange
}: {
  pops: Pops;
  maxByPop: Pops;
  totalLimit?: number;
  onChange: (pops: Pops) => void;
}) {
  const selectedTotal = totalPops(pops);

  function setAmount(pop: PopType, nextAmount: number) {
    const cappedByPop = Math.max(0, Math.min(nextAmount, maxByPop[pop]));
    const otherTotal = selectedTotal - pops[pop];
    const cappedByTotal = totalLimit === undefined ? cappedByPop : Math.min(cappedByPop, Math.max(0, totalLimit - otherTotal));
    onChange({ ...pops, [pop]: cappedByTotal });
  }

  return (
    <div className="populationStepper">
      {POP_TYPES.map((pop) => (
        <div className="popStepperRow" key={pop}>
          <span className="popStepperLabel">
            <AtlasIcon icon={pop} className="miniIcon" />
            <strong>{formatPopLabel(pop, 2)}</strong>
            <em>Available {maxByPop[pop]}</em>
          </span>
          <div className="stepperControls">
            <button disabled={pops[pop] <= 0} onClick={() => setAmount(pop, pops[pop] - 1)}>
              -
            </button>
            <input
              aria-label={`${formatPopLabel(pop, 2)} to select`}
              min={0}
              max={maxByPop[pop]}
              type="number"
              value={pops[pop]}
              onChange={(event) => setAmount(pop, Number(event.target.value))}
            />
            <button
              disabled={pops[pop] >= maxByPop[pop] || (totalLimit !== undefined && selectedTotal >= totalLimit)}
              onClick={() => setAmount(pop, pops[pop] + 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getSettlementEntries(G: HegemonyState, playerID: PlayerId): SettlementEntry[] {
  return G.board.tiles
    .map((tile) => {
      const settlement = tile.settlements.find((candidate) => candidate.owner === playerID);

      return settlement ? { tile, pops: settlement.pops } : null;
    })
    .filter((entry): entry is SettlementEntry => Boolean(entry));
}

function firstAvailablePop(pops?: Pops): PopType {
  if (!pops) {
    return "citizens";
  }

  return POP_TYPES.find((candidate) => pops[candidate] > 0) ?? "citizens";
}

function createDefaultSelection(requiredTotal: number): Pops {
  return {
    citizens: requiredTotal > 0 ? 1 : 0,
    freemen: Math.max(0, requiredTotal - 1),
    slaves: 0
  };
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatTileName(G: HegemonyState, tileId: string) {
  const tile = G.board.tiles.find((candidate) => candidate.id === tileId);

  return tile ? `${tile.terrain} ${tile.id}` : tileId;
}
