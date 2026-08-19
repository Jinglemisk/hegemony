import type { HegemonyState, HexTile, PlayerId } from "../../game/types";
import { RESOURCE_GLYPHS, SETTLEMENT_GLYPHS, TERRAIN_GLYPHS } from "../../ui/iconRegistry";
import { Icon } from "../../ui/icons/Icon";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { settlementNameOf } from "../../ui/settlementNames";
import { settlementPickerLabel } from "./helpers";

/**
 * WHICH TILE you are acting on, told in icons.
 *
 * Every targeting popover opens with this line, and it used to be a sentence:
 * "NAXOS · CITY · PLAINS +2 FOOD". Four of those five words are facts the icon
 * set already draws — the rank, the ground, the resource — and drawing them
 * costs a third of the width the words did, in a popover where width is the
 * scarcest thing there is. What is left in type is the only part no glyph can
 * carry: the place's name.
 *
 * The sentence itself is not thrown away. It is still what
 * {@link settlementPickerLabel} returns, and it is what this element is called
 * by a screen reader — the icons are `aria-hidden` and the line has one name.
 */
export function TileSubject({
  G,
  tile,
  playerID,
}: {
  G: HegemonyState;
  tile: HexTile;
  playerID: PlayerId;
}) {
  const own = tile.settlements.find((candidate) => candidate.owner === playerID);
  const name = own ? settlementNameOf(G.board.tiles, own.id) : "Open ground";
  const rivals = tile.settlements.filter((candidate) => candidate.owner !== playerID);

  return (
    <p
      aria-label={settlementPickerLabel(G, tile, playerID)}
      className="placementSectionLabel placementTargetName tileSubject"
      role="img"
    >
      <strong className="tileSubjectName">{name}</strong>

      <span aria-hidden="true" className="tileSubjectMarks">
        {own ? <Icon className="miniIcon" glyph={SETTLEMENT_GLYPHS[own.kind]} size="rail" /> : null}
        <Icon className="miniIcon" glyph={TERRAIN_GLYPHS[tile.terrain]} size="rail" />

        {tile.resource ? (
          <span className="tileSubjectYield">
            <Icon className="miniIcon" glyph={RESOURCE_GLYPHS[tile.resource.type]} size="rail" />
            <strong className="num">+{tile.resource.amount}</strong>
          </span>
        ) : null}

        {/* A rival on the same tile is the one fact here that changes what you
            would do, so it stays — as the seat's own glaze and blazon, which is
            how every other owner mark in the game is drawn. */}
        {rivals.map((rival) => (
          <span
            className="tileSubjectRival"
            key={rival.id}
            style={{ background: PLAYER_GLAZES[rival.owner].color }}
          >
            {PLAYER_GLAZES[rival.owner].blazon}
          </span>
        ))}
      </span>
    </p>
  );
}
