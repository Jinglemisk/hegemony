import type { CSSProperties } from "react";
import {
  POP_TYPES,
  settlementCapacity,
  settlementNetYield,
  settlementOverCapacity,
  totalPops,
} from "../../../game/rules";
import type { PopType } from "../../../game/types";
import { BUILDING_ICON, RESOURCE_ICON, sign, tone } from "../../../ui/frameFormat";
import { formatPopLabel } from "../../../ui/formatters";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import { slotsOf } from "../../board/ledger/slots";
import type { OwnedHolding } from "../../board/types";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Tip } from "../parts";
import { PlaceSeal } from "./PlaceSeal";

/** Up to this many places, every place gets its drawing line; past it, only the open one. */
const DRAWN = 3;

const POP_ICON: Record<PopType, string> = {
  citizens: "pops/citizens",
  freemen: "pops/freemen",
  slaves: "pops/slaves",
};

/**
 * Cities: a ledger, one numbers line per place (pops, ground, and what it nets
 * per resource under icons printed once in the head), and under it a drawing
 * line: its people as beads with the room left, its buildings as sockets, and
 * a link to raise one. Past three places only the open place keeps its drawing.
 */
export function CitiesPage({
  holdings,
  openTileId,
  onOpen,
  onRaise,
}: {
  holdings: OwnedHolding[];
  /** The place whose page is open, which keeps its drawing line. */
  openTileId: string | null;
  onOpen: (tileId: string) => void;
  onRaise: (tileId: string) => void;
}) {
  const { G } = useGameUi();
  const names = settlementNames(G.board.tiles);

  if (holdings.length === 0) {
    return <p className="page-empty">No walls have risen yet.</p>;
  }

  const rows = holdings.map((holding) => ({
    holding,
    net: settlementNetYield(holding.tile, holding.settlement, G.ruleset, G.definition.content),
  }));
  const moved = RESOURCE_ORDER.filter((resource) => rows.some(({ net }) => net[resource] !== 0));
  const grid = { "--nres": moved.length } as CSSProperties;

  return (
    <div className="roster" data-c="roster">
      <div className="r-grid r-head" style={grid}>
        <span className="caps">Place</span>
        <span title="Pops of capacity">
          <Ico path="pops/capacity" size="chip" />
        </span>
        <span title="Buildings raised of slots">
          <Ico path="settlements/slot" size="chip" />
        </span>
        {moved.map((resource) => (
          <span key={resource} title={`${resource} per turn`}>
            <Ico path={RESOURCE_ICON[resource]} size="chip" />
          </span>
        ))}
      </div>
      {rows.map(({ holding, net }) => {
        const { tile, settlement } = holding;
        const name = names.get(settlement.id) ?? "POLIS";
        const pops = totalPops(settlement.pops);
        const capacity = settlementCapacity(settlement, G.ruleset, G.definition.content);
        const over = settlementOverCapacity(settlement, G.ruleset, G.definition.content);
        const { slots, open } = slotsOf(holding, G.ruleset);
        const room = Math.max(0, capacity - pops);
        const census = POP_TYPES.map(
          (pop) => `${settlement.pops[pop]} ${formatPopLabel(pop, settlement.pops[pop])}`,
        ).join(", ");
        const state =
          pops === 0
            ? "stands empty"
            : over > 0
              ? `over its walls · −${over} happiness`
              : pops >= capacity
                ? "at capacity"
                : null;
        const drawn = holdings.length <= DRAWN || tile.id === openTileId;

        return (
          <div className="r-place-rows" key={settlement.id}>
            <div className="r-grid r-a" style={grid}>
              <span className="r-place">
                <PlaceSeal kind={settlement.kind} owner={settlement.owner} />
                <button className="r-name" onClick={() => onOpen(tile.id)} type="button">
                  {name}
                </button>
                <Ico path={`terrain/${tile.terrain}`} size="chip" />
              </span>
              <span className="cell" title={`Population ${pops} of ${capacity}: ${census}`}>
                {pops}
                <small>/{capacity}</small>
              </span>
              <span className="cell">
                {slots > 0 ? (
                  <>
                    {settlement.buildings.length}
                    <small>/{slots}</small>
                  </>
                ) : (
                  <small>—</small>
                )}
              </span>
              {moved.map((resource) => (
                <span className={`cell ${tone(net[resource])}`} key={resource}>
                  {net[resource] !== 0 ? sign(net[resource]) : "·"}
                </span>
              ))}
            </div>
            {drawn ? (
              <div className="r-b">
                <span aria-label={census} className="beads" role="img">
                  {POP_TYPES.flatMap((pop) =>
                    Array.from({ length: settlement.pops[pop] }, (_, i) => (
                      <Ico className="bead" key={`${pop}-${i}`} path={POP_ICON[pop]} size="chip" />
                    )),
                  )}
                  {Array.from({ length: room }, (_, i) => (
                    <i className="bead-room" key={`room-${i}`} />
                  ))}
                </span>
                {room > 0 ? <span className="cap">{room} room</span> : null}
                {slots === 0 ? (
                  <span className="cap">no ground to build on</span>
                ) : (
                  <>
                    <Tooltip
                      content={
                        <Tip sub={`${settlement.buildings.length} of ${slots} raised`} title={name}>
                          <p className="tip-body">
                            {settlement.buildings.length > 0
                              ? settlement.buildings.join(", ")
                              : "Nothing raised yet."}
                          </p>
                        </Tip>
                      }
                      triggerClassName="sockets"
                    >
                      {settlement.buildings.map((id, i) => (
                        <span className="sock is-built" key={`${id}-${i}`}>
                          <Ico path={BUILDING_ICON[id] ?? "buildings/build"} size="chip" />
                        </span>
                      ))}
                      {Array.from({ length: Math.max(0, open) }, (_, i) => (
                        <span className="sock" key={`open-${i}`} />
                      ))}
                    </Tooltip>
                    {open > 0 ? (
                      <button className="link cap" onClick={() => onRaise(tile.id)} type="button">
                        raise
                      </button>
                    ) : (
                      <span className="cap">all raised</span>
                    )}
                  </>
                )}
                {state ? <span className="r-state cap">{state}</span> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
