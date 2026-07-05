import type { Ruleset } from "../game/ruleset";
import type { HexTile, Resources, Settlement } from "../game/types";
import {
  settlementBuildingSlots,
  settlementOverCapacity,
  settlementPopCapacity,
  settlementTileYield,
  totalPops
} from "../game/rules";
import { RESOURCE_LABELS, formatResourceDelta, formatSignedNumber } from "../ui/formatters";
import { RESOURCE_ORDER, resourceCssVars } from "../ui/resourceVisuals";
import { AtlasIcon, ResourceIcon, TerrainSprite } from "./Sprites";

/**
 * Collapsed-summary view of a settlement, identical to the holding card shown in
 * the left-sidebar Ledger. Presentational only — the caller supplies the already
 * computed {@link Resources} net yield so the existing Cities tab math is untouched.
 */
export function SettlementSummaryCard({
  tile,
  settlement,
  netYield,
  ruleset
}: {
  tile: HexTile;
  settlement: Settlement;
  netYield: Resources;
  ruleset: Ruleset;
}) {
  const popTotal = totalPops(settlement.pops);
  const capacity = settlementPopCapacity(settlement.kind, ruleset);
  const overCapacity = settlementOverCapacity(settlement, ruleset);
  const slots = settlementBuildingSlots(tile, settlement, ruleset);
  const tileYield = settlementTileYield(tile, settlement, ruleset);

  return (
    <span className="holdingSummaryRows">
      <span className="holdingIdentityCluster">
        <span className="cityIdentity" title={`${capitalize(settlement.kind)} ${tile.id}`}>
          <AtlasIcon icon={settlement.kind} className="miniIcon settlementIdentityIcon" />
          <span className="holdingTitleBlock">
            <strong>{capitalize(settlement.kind)}</strong>
            <em>{formatTileCoordinates(tile)}</em>
          </span>
        </span>
      </span>

      <span className="holdingSummaryMetrics">
        <span className="cityMeter" title={`Building slots ${settlement.buildings.length} of ${slots}`}>
          <AtlasIcon icon="temple" className="miniIcon" />
          <span className="cityMeterText">
            <strong>
              {settlement.buildings.length}
              <span className="meterSlash">/</span>
              {slots}
            </strong>
          </span>
        </span>
        <span
          className={overCapacity > 0 ? "cityMeter overCapacityText" : "cityMeter"}
          title={`Population ${popTotal} of ${capacity}`}
        >
          <AtlasIcon icon="citizens" className="miniIcon" />
          <span className="cityMeterText">
            <strong>
              {popTotal}
              <span className="meterSlash">/</span>
              {capacity}
            </strong>
          </span>
        </span>
      </span>

      <span
        className="holdingTileBadge"
        style={resourceCssVars(tile.resource.type)}
        title={`${capitalize(tile.terrain)} tile yield ${formatSignedNumber(tileYield)} ${RESOURCE_LABELS[tile.resource.type]}`}
      >
        <span className="summaryTerrain" aria-hidden="true">
          <TerrainSprite terrain={tile.terrain} className="terrainChip" />
        </span>
      </span>

      <HoldingNetYields resources={netYield} />
    </span>
  );
}

export function HoldingNetYields({ resources }: { resources: Resources }) {
  const hasYield = RESOURCE_ORDER.some((resource) => resources[resource] !== 0);

  return (
    <span
      className="holdingNetYields"
      title={hasYield ? `Net income: ${formatResourceDelta(resources)}` : "No net income from this settlement"}
    >
      {RESOURCE_ORDER.map((resource) => {
        const value = resources[resource];

        if (value === 0) {
          return (
            <span className="holdingNetYield emptyNetYield" key={resource} aria-hidden="true">
              <span className="netYieldDash">–</span>
            </span>
          );
        }

        return (
          <span className="holdingNetYield" key={resource} style={resourceCssVars(resource)}>
            <ResourceIcon resource={resource} value={value} className="miniResourceIcon" />
            <strong>{formatSignedNumber(value)}</strong>
          </span>
        );
      })}
    </span>
  );
}

export function formatTileCoordinates(tile: HexTile) {
  return `${tile.q},${tile.r}`;
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
