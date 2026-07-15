import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_POPS,
  clonePops,
  getUpgradeColonyToCityStatus,
  previewUpgradeColonyToCity,
  settlementNetYield,
  settlementPopCapacity,
  totalPops
} from "../../../game/rules";
import type { HexTile, Pops, Settlement } from "../../../game/types";
import { formatResourceDelta } from "../../../ui/formatters";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { SettlementSummaryCard } from "../../SettlementCard";
import { AtlasIcon } from "../../Sprites";
import { useGameUi } from "../GameUiContext";
import { capitalize, settlementPickerLabel } from "../helpers";
import { CostRow, PlacementModalShell } from "./PlacementModalShell";
import { PopulationStepper } from "./PopulationStepper";

export function UpgradeCityModal({
  onCancel,
  onConfirm
}: {
  onCancel: () => void;
  onConfirm: (tileId: string, pops: Pops) => void;
}) {
  const { G, viewerId: playerID } = useGameUi();
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
  // Live ruleset, not the ACTION_COSTS default — see FoundColonyPopover (R7).
  const cost =
    (selected && getUpgradeColonyToCityStatus(G, playerID, selected.tile.id).cost) ??
    G.ruleset.actionCosts.upgradeColonyToCity;
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
