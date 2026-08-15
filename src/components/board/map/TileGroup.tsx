import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { settlementBuildingSlots } from "../../../game/rules";
import type { Ruleset } from "../../../game/ruleset";
import type { HexTile, PopType, Settlement } from "../../../game/types";
import { HEX_SIZE, getSideBySidePositions, hexPoints } from "../../../ui/hexGeometry";
import { SETTLEMENT_SEALS, TERRAIN_EMBLEMS } from "../../../ui/boardEmblems";
import { glazeOf } from "../../../ui/playerGlazes";

/**
 * One tile and everything standing on it.
 *
 * The board's grammar, and every choice below follows from it:
 *
 *   **shape says what · colour says whose · stroke says state**
 *
 * So terrain is an engraved emblem over an almost-flat bone ramp; a settlement is
 * a seal on its owner's glaze disc; and selection, targeting and pending are all
 * strokes, never fills. Nothing on the board is coloured to mean good or bad —
 * that vocabulary belongs to text, next to a sign.
 */

/** Where things sit inside a 45-unit hex, measured from its centre. */
const EMBLEM_Y = -14;
const YIELD_Y = 30;
const SEAL_Y = -6;
const SEAL_RADIUS = { capital: 20, city: 20, colony: 16 } as const;
const BEAD_SPREAD = 13;
const BEAD_RADIUS = 4;
/** Roughly a character's width in the name plate's display face. */
const NAME_CHAR_WIDTH = 7.6;

/** Pop beads in ladder order, so a settlement always reads the same way. */
const BEAD_ORDER: readonly PopType[] = ["citizens", "freemen", "slaves"];

/** At most two settlements are drawn side by side; the rest collapse into +n. */
const MAX_SHOWN_SETTLEMENTS = 2;

function beadsOf(settlement: Settlement): PopType[] {
  return BEAD_ORDER.flatMap((pop) => Array.from({ length: settlement.pops[pop] }, () => pop));
}

/**
 * One settlement: its owner's glazed seal, the people under it as beads, and its
 * name on an ivory plate.
 *
 * The beads are the reason a player can read a rival's whole position without
 * opening a panel — a solid bead is a citizen, a ring is a freeman, a black bead
 * is a slave, and the count is the population. Three shapes, no colour, so the
 * ladder survives beside four owner glazes.
 */
function SettlementToken({
  settlement,
  name,
  offsetX,
}: {
  settlement: Settlement;
  name: string;
  offsetX: number;
}) {
  const radius = SEAL_RADIUS[settlement.kind];
  const beads = beadsOf(settlement);
  const plateWidth = name.length * NAME_CHAR_WIDTH + 14;

  return (
    <g
      className="settlementToken"
      style={{ "--glaze": glazeOf(settlement.owner) } as CSSProperties}
      transform={`translate(${offsetX} 0)`}
    >
      <circle className="sealShadow" cy={SEAL_Y} r={radius + 1.5} />
      <circle className="sealDisc" cy={SEAL_Y} r={radius} />
      <path
        className="sealGlyph"
        d={SETTLEMENT_SEALS[settlement.kind]}
        transform={`translate(0 ${SEAL_Y})`}
      />

      {beads.map((pop, index) => (
        <circle
          className={`popBead popBead-${pop}`}
          cx={(index - (beads.length - 1) / 2) * BEAD_SPREAD}
          cy={SEAL_Y + radius + 12}
          key={`${pop}-${index}`}
          r={pop === "slaves" ? BEAD_RADIUS - 0.6 : BEAD_RADIUS}
        />
      ))}

      <rect
        className="namePlate"
        height={15}
        rx={2}
        width={plateWidth}
        x={-plateWidth / 2}
        y={SEAL_Y + radius + 18}
      />
      <text className="nameText" textAnchor="middle" y={SEAL_Y + radius + 29.5}>
        {name}
      </text>
    </g>
  );
}

type TileState = {
  isSelected: boolean;
  isPending: boolean;
  isPlacementCandidate: boolean;
  /** True while a mode is armed and this tile is not one of its answers. */
  isDimmed: boolean;
};

function stateClassOf({ isSelected, isPending, isPlacementCandidate, isDimmed }: TileState) {
  return [
    isSelected ? "isSelected" : "",
    isPending ? "isPending" : "",
    isPlacementCandidate ? "isTarget" : "",
    isDimmed ? "isDimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The tile itself: ground, emblem, numerals, owner rim.
 *
 * Drawn in its own pass, BEFORE any settlement token. A name plate hangs below
 * its hex and into the neighbour's, so a single pass had every plate half-buried
 * under the tile drawn after it — "OLYNTHOS" arriving as "OLYNTHO". SVG has no
 * z-index; paint order is the only lever, so the board draws all its ground and
 * then everything standing on it.
 */
export function TileGround({
  tile,
  x,
  y,
  ruleset,
  names,
  state,
  onTileAction,
  onTileClick,
}: {
  tile: HexTile;
  x: number;
  y: number;
  ruleset: Ruleset;
  /** settlement id → name, from ui/settlementNames. */
  names: Map<string, string>;
  state: TileState;
  onTileAction: (tileId: string) => void;
  onTileClick: (tileId: string, event: ReactMouseEvent<SVGGElement>) => void;
}) {
  const { isSelected, isPending, isPlacementCandidate } = state;
  // The primary settlement leads: a city outranks a colony for the centre slot,
  // because a city is the thing you look for when scanning the board.
  const ordered = [...tile.settlements].sort((left, right) =>
    left.kind === "colony" && right.kind !== "colony" ? 1 : right.kind === "colony" ? -1 : 0,
  );
  const leading = ordered[0];
  const city = tile.settlements.find((settlement) => settlement.kind !== "colony");
  const usedBuildingSlots = city?.buildings.length ?? 0;
  const totalBuildingSlots = city
    ? settlementBuildingSlots(tile, city, ruleset)
    : tile.buildingSlots;
  const yieldAmount = tile.resource?.amount ?? null;
  const yieldLabel = tile.resource ? `${tile.resource.amount} ${tile.resource.type}` : "no yield";
  // Slot pips are hidden at rest. They matter only when choosing where to build,
  // and a permanent "0/3" on forty tiles is forty numbers nobody is reading.
  const showSlots = (isSelected || isPending || isPlacementCandidate) && totalBuildingSlots > 0;

  return (
    <g className={`tile ${stateClassOf(state)}`} transform={`translate(${x} ${y})`}>
      <g
        aria-label={`Hex ${tile.id}, ${tile.terrain} tile, ${yieldLabel}${
          leading ? `, ${names.get(leading.id) ?? ""}` : ""
        }`}
        className="svgButton"
        data-tile-id={tile.id}
        onClick={(event) => onTileClick(tile.id, event)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onTileAction(tile.id);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <polygon className={`hexTile terrain-${tile.terrain}`} points={hexPoints(HEX_SIZE - 1)} />
      </g>

      <g className="tileMarks" aria-hidden="true">
        <path
          className="tileEmblem"
          d={TERRAIN_EMBLEMS[tile.terrain]}
          transform={`translate(0 ${EMBLEM_Y})`}
        />

        {yieldAmount !== null && tile.settlements.length === 0 ? (
          <text className="hexYield num" textAnchor="middle" y={YIELD_Y}>
            {yieldAmount}
          </text>
        ) : null}

        {showSlots ? (
          <text className="hexSlots num" textAnchor="middle" y={-24}>
            {usedBuildingSlots}/{totalBuildingSlots}
          </text>
        ) : null}

        {/* The owner's rim: an inner hex stroke in the seat's glaze. It says who
            holds a tile without putting a fifth colour into the fill. */}
        {leading ? (
          <polygon
            className="ownerRim"
            points={hexPoints(HEX_SIZE - 6)}
            style={{ "--glaze": glazeOf(leading.owner) } as CSSProperties}
          />
        ) : null}
      </g>
    </g>
  );
}

/** Everything standing on a tile, drawn in the second pass over the whole board. */
export function TileTokens({
  tile,
  x,
  y,
  names,
  state,
}: {
  tile: HexTile;
  x: number;
  y: number;
  names: Map<string, string>;
  state: TileState;
}) {
  if (tile.settlements.length === 0) {
    return null;
  }

  const ordered = [...tile.settlements].sort((left, right) =>
    left.kind === "colony" && right.kind !== "colony" ? 1 : right.kind === "colony" ? -1 : 0,
  );
  const shown = ordered.slice(0, MAX_SHOWN_SETTLEMENTS);
  const overflow = ordered.length - shown.length;
  const offsets = getSideBySidePositions(shown.length);

  return (
    <g className={`tile tileTokens ${stateClassOf(state)}`} transform={`translate(${x} ${y})`}>
      {shown.map((settlement, index) => (
        <SettlementToken
          key={settlement.id}
          name={names.get(settlement.id) ?? "POLIS"}
          offsetX={offsets[index]}
          settlement={settlement}
        />
      ))}

      {overflow > 0 ? (
        <g className="settlementOverflow" transform="translate(0 30)">
          <circle r={9} />
          <text className="num" fontSize={9} y={3.2}>
            +{overflow}
          </text>
        </g>
      ) : null}
    </g>
  );
}
