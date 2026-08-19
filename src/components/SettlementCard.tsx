import type { Ruleset } from "../game/ruleset";
import type { GameContent } from "../game/content";
import type { HexTile, Resources, Settlement } from "../game/types";
import {
  settlementBuildingSlots,
  settlementOverCapacity,
  settlementCapacity,
  settlementTileYield,
  totalPops,
} from "../game/rules";
import { RESOURCE_LABELS, formatResourceDelta, formatSignedNumber } from "../ui/formatters";
import { RESOURCE_ORDER, tileCssVars } from "../ui/resourceVisuals";
import { BUILDING_GLYPHS, POP_GLYPHS, SETTLEMENT_GLYPHS, TERRAIN_GLYPHS } from "../ui/iconRegistry";
import { Icon } from "../ui/icons/Icon";
import { ResourceChips } from "./board/ResourceChips";
import { capitalize } from "./board/helpers";

/**
 * Collapsed-summary view of a settlement, identical to the holding card shown in
 * the left-sidebar Ledger. Presentational only — the caller supplies the already
 * computed {@link Resources} net yield so the existing Cities tab math is untouched.
 */
export function SettlementSummaryCard({
  name,
  tile,
  settlement,
  netYield,
  ruleset,
  content,
}: {
  tile: HexTile;
  settlement: Settlement;
  /** The place's name, from ui/settlementNames. */
  name: string;
  netYield: Resources;
  ruleset: Ruleset;
  content: GameContent;
}) {
  const popTotal = totalPops(settlement.pops);
  const capacity = settlementCapacity(settlement, ruleset, content);
  const overCapacity = settlementOverCapacity(settlement, ruleset, content);
  const slots = settlementBuildingSlots(tile, settlement, ruleset);
  const tileYield = settlementTileYield(tile, settlement, ruleset);

  return (
    <span className="holdingSummaryRows">
      <span className="holdingIdentityCluster">
        {/* NAME only. The rank and the ground used to be spelled out under it —
            "city · mountain" — beside the rank's own glyph on the left and the
            terrain's own chip at the right of the same row. Two facts, drawn and
            written, twice each, in the narrowest column in the ledger. */}
        <span
          className="cityIdentity"
          title={`${capitalize(settlement.kind)} on ${capitalize(tile.terrain)}, at ${tile.id}`}
        >
          <Icon glyph={SETTLEMENT_GLYPHS[settlement.kind]} size="rail" className="miniIcon" />
          <span className="holdingTitleBlock">
            <strong className="title">{name}</strong>
          </span>
        </span>
      </span>

      <span className="holdingSummaryMetrics">
        <span
          className="cityMeter"
          title={`Building slots ${settlement.buildings.length} of ${slots}`}
        >
          <Icon glyph={BUILDING_GLYPHS.temple} size="rail" className="miniIcon" />
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
          <Icon glyph={POP_GLYPHS.citizens} size="rail" className="miniIcon" />
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
          <Icon className="terrainChip miniIcon" glyph={TERRAIN_GLYPHS[tile.terrain]} size="rail" />
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
      title={
        hasYield
          ? `Net income: ${formatResourceDelta(resources)}`
          : "No net income from this settlement"
      }
    />
  );
}
