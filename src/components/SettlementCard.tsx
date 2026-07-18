import type { Ruleset } from "../game/ruleset";
import type { HexTile, Resources, Settlement } from "../game/types";
import {
  settlementBuildingSlots,
  settlementOverCapacity,
  settlementCapacity,
  settlementTileYield,
  totalPops
} from "../game/rules";
import { RESOURCE_LABELS, formatResourceDelta, formatSignedNumber } from "../ui/formatters";
import { RESOURCE_ORDER, tileCssVars } from "../ui/resourceVisuals";
import { AtlasIcon, TerrainSprite } from "./Sprites";
import { ResourceChips } from "./board/ResourceChips";
import { capitalize } from "./board/helpers";

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
  const capacity = settlementCapacity(settlement, ruleset);
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
        style={tileCssVars(tile)}
        title={
          tile.resource
            ? `${capitalize(tile.terrain)} tile yield ${formatSignedNumber(tileYield)} ${RESOURCE_LABELS[tile.resource.type]}`
            : `${capitalize(tile.terrain)} — no tile yield`
        }
      >
        <span className="summaryTerrain" aria-hidden="true">
          <TerrainSprite terrain={tile.terrain} className="terrainChip" />
        </span>
      </span>

      <HoldingNetYields resources={netYield} />
    </span>
  );
}

/** Every resource always shown so the columns read as a fixed set — a zero dims to
 *  an icon + dash rather than vanishing (the `yield` variant's whole job). */
export function HoldingNetYields({ resources }: { resources: Resources }) {
  const hasYield = RESOURCE_ORDER.some((resource) => resources[resource] !== 0);

  return (
    <ResourceChips
      resources={resources}
      variant="yield"
      className="holdingNetYields"
      chipClassName="holdingNetYield"
      title={hasYield ? `Net income: ${formatResourceDelta(resources)}` : "No net income from this settlement"}
    />
  );
}

export function formatTileCoordinates(tile: HexTile) {
  return `${tile.q},${tile.r}`;
}

