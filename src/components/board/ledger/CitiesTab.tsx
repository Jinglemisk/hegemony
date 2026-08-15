import {
  POP_TYPES,
  settlementCapacity,
  settlementNetYield,
  settlementOverCapacity,
  totalPops,
} from "../../../game/rules";
import type { BuildingId, Resources } from "../../../game/types";
import { formatPopLabel, formatSignedNumber } from "../../../ui/formatters";
import { RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { settlementNameOf } from "../../../ui/settlementNames";
import type { OwnedHolding } from "../types";
import { useGameUi } from "../GameUiContext";
import { BuildingSockets } from "./BuildingSockets";
import { slotsOf } from "./slots";
import { PopBeads } from "./PopBeads";
import { SealMark } from "./SealMark";

/**
 * Cities — one four-band block per settlement: **who it is, who lives there,
 * what stands on it, what it pays.** All four always visible.
 *
 * What was here before this rewrite was the pre-overhaul design, untouched by
 * the overhaul: a pop×building affinity matrix — nine chips in three columns,
 * one column per social class — behind a disclosure that booted closed. Two
 * things were wrong with it and neither was cosmetic.
 *
 * 1. **It hid the page.** Every fact the Cities page exists to give you sat
 *    behind a chevron, so the page opened as a list of names.
 * 2. **It answered a question nobody asks here.** Which class a building favours
 *    is a Build decision; it appears in neither prototype. Cities is the page
 *    that tells you the *state* of a place.
 *
 * So the matrix is gone, the disclosure with it, and the four bands say the four
 * things: the seal disc carries the same mark the board draws (find the place
 * out there), the beads carry the people with their empty room, the sockets
 * carry the buildings with their open ground, and the income row prints only
 * what actually moved.
 */

/** Only what moved, signed and coloured. The old strip printed all six resources
 *  on every settlement and dimmed four of them to dashes — five columns of "no"
 *  to find the one "yes". */
function CityIncome({ resources }: { resources: Resources }) {
  const moved = RESOURCE_ORDER.filter((resource) => resources[resource] !== 0);

  if (moved.length === 0) {
    return <p className="cityIncome caption">no net income</p>;
  }

  return (
    <p className="cityIncome num stat">
      {moved.map((resource) => (
        <span className={resources[resource] > 0 ? "pos" : "neg"} key={resource}>
          <Icon glyph={RESOURCE_GLYPHS[resource]} />
          {formatSignedNumber(resources[resource])}
        </span>
      ))}
    </p>
  );
}

export function CitiesTab({
  holdings,
}: {
  holdings: OwnedHolding[];
  /** Raising is the Build page's act now, not this one's. The prop stays on the
   *  type so the panel's call site is untouched. */
  onBuildBuildingRequest?: (tileId: string, buildingId: BuildingId) => void;
}) {
  const { G } = useGameUi();

  if (holdings.length === 0) {
    return <p className="emptyState">No walls have risen yet.</p>;
  }

  return (
    <div className="cityStack">
      {/* The bead vocabulary, named once. Four marks appear on every card below
          and nothing in the game has ever said what they are. */}
      <p className="beadLegend caption" aria-hidden="true">
        <span>
          <i className="bead bead-citizens" />
          citizens
        </span>
        <span>
          <i className="bead bead-freemen" />
          freemen
        </span>
        <span>
          <i className="bead bead-slaves" />
          slaves
        </span>
        <span>
          <i className="bead bead-empty" />
          room
        </span>
      </p>

      {holdings.map((holding) => {
        const { tile, settlement } = holding;
        const name = settlementNameOf(G.board.tiles, settlement.id);
        const popTotal = totalPops(settlement.pops);
        const capacity = settlementCapacity(settlement, G.ruleset, G.definition.content);
        const overCapacity = settlementOverCapacity(settlement, G.ruleset, G.definition.content);
        const netYield = settlementNetYield(tile, settlement, G.ruleset, G.definition.content);
        const { slots } = slotsOf(holding, G.ruleset);
        // A caption only where the beads alone would not tell you. Two settlements
        // sitting comfortably inside their walls get no line, and the silence is
        // the information.
        const state =
          popTotal === 0
            ? "stands empty"
            : overCapacity > 0
              ? `over its walls · −${overCapacity} happiness`
              : popTotal >= capacity
                ? "at capacity"
                : null;

        return (
          <article className="cityCard" key={`${settlement.owner}-${tile.id}`}>
            <div className="cityId">
              <SealMark kind={settlement.kind} owner={settlement.owner} />
              <span className="cityName">
                <strong className="title">{name}</strong>
                <em className="caption">
                  {settlement.kind} · {tile.terrain}
                </em>
              </span>
              <span className="cityPops stat num" title={`Population ${popTotal} of ${capacity}`}>
                {popTotal}
                <small>/{capacity}</small>
              </span>
            </div>

            <div className="cityBeads">
              <PopBeads capacity={capacity} pops={settlement.pops} />
              {state ? <span className="cityState caption">{state}</span> : null}
            </div>

            <BuildingSockets
              built={settlement.buildings}
              content={G.definition.content}
              slots={slots}
            />

            <CityIncome resources={netYield} />

            {/* The beads are shapes, and a shape says nothing out loud — so the
                census is spelled out by rank here rather than as one total. */}
            <span className="visuallyHidden">
              {name}, {settlement.kind} on {tile.terrain}. {popTotal} of {capacity} people:{" "}
              {POP_TYPES.map(
                (pop) => `${settlement.pops[pop]} ${formatPopLabel(pop, settlement.pops[pop])}`,
              ).join(", ")}
              .
            </span>
          </article>
        );
      })}
    </div>
  );
}
