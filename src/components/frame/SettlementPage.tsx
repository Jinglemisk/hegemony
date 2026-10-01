import { getBuilding } from "../../game/content";
import { settlementClassColumn } from "../../game/economy/income";
import {
  settlementBuildingSlots,
  settlementCapacity,
  settlementIdleSlaves,
  settlementOpenSlots,
  settlementSlots,
  settlementWorkingSlaves,
} from "../../game/settlement";
import { getBuildBuildingOptions } from "../../game/status";
import type { HegemonyState, HexTile, PopType, Resource, Settlement } from "../../game/types";
import { BUILDING_ICON, RESOURCE_ICON, sign } from "../../ui/frameFormat";
import { getLuxuryGood } from "../../game/content";
import { presentBuildingEffects } from "../../ui/effects";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Ico } from "./parts";
import { PlaceSeal } from "./realm/PlaceSeal";

const COLUMNS: Array<{ pop: PopType; label: string; icon: string }> = [
  { pop: "slaves", label: "Slaves", icon: "pops/slaves" },
  { pop: "freemen", label: "Freemen", icon: "pops/freemen" },
  { pop: "citizens", label: "Citizens", icon: "pops/citizens" },
];

const nonZero = (income: Record<Resource, number>) =>
  (Object.entries(income) as Array<[Resource, number]>).filter(([, n]) => n !== 0);

/**
 * The subject settlement: a meta line, three pop columns (count, what one pop of
 * the class makes here, and what the class makes in all), and a line per building
 * plus the open slots, which the slaves work. Every number comes from the engine:
 * the columns are `settlementClassColumn`, and the slots are the settlement
 * selectors'. A class building raises its column's "×" from 1 to 2.
 */
export function SettlementPage({
  G,
  tile,
  settlement,
  onRaise,
}: {
  G: HegemonyState;
  tile: HexTile;
  settlement: Settlement;
  /** Open Build on this place; absent for a rival's settlement, which is read-only. */
  onRaise?: (tileId: string) => void;
}) {
  const primary = tile.resource?.type ?? null;
  const pops = settlement.pops.slaves + settlement.pops.freemen + settlement.pops.citizens;
  const capacity = settlementCapacity(settlement, G.ruleset);
  const slots = settlementSlots(tile, settlement);
  const open = settlementOpenSlots(tile, settlement);
  const working = settlementWorkingSlaves(tile, settlement);
  const idle = settlementIdleSlaves(tile, settlement);
  // A city with an open slot, or a colony the engine would let raise its Port.
  const canRaise =
    settlementBuildingSlots(tile, settlement, G.ruleset) > settlement.buildings.length ||
    getBuildBuildingOptions(G, settlement.owner, tile.id).some(({ status }) => status.can);

  return (
    <>
      <p className="settle-meta caps" data-c="settle-meta">
        {onRaise ? null : (
          <span className="meta-i">
            <PlaceSeal kind={settlement.kind} owner={settlement.owner} />
            {PLAYER_GLAZES[settlement.owner].name}
          </span>
        )}
        <span className="meta-i">
          <Ico path={`settlements/${settlement.kind}`} size="chip" />
          {settlement.kind}
        </span>
        <span className="meta-i">
          <Ico path={`terrain/${tile.terrain}`} size="chip" />
          {tile.terrain}
        </span>
        <span className="meta-i">
          <Ico path="pops/capacity" size="chip" />
          <b>{pops}</b>of {capacity} pops
        </span>
        <span className="meta-i">
          <Ico path="settlements/slot" size="chip" />
          <b>{settlement.buildings.length + working}</b>of {slots} slots
        </span>
      </p>
      <div className="settle-cols" data-c="settle-cols">
        {COLUMNS.map(({ pop, label, icon }) => {
          const count = settlement.pops[pop];
          const column = settlementClassColumn(
            tile,
            settlement,
            pop,
            G.ruleset,
            G.definition.content,
          );
          const made = nonZero(column.income);

          return (
            <div className="settle-col" data-c="settle-col" key={pop}>
              <span className="col-head caps">
                {label}
                <b
                  className={column.raisedBy ? "is-raised" : undefined}
                  title={column.raisedBy ? `Raised by the ${column.raisedBy}` : undefined}
                >
                  ×{column.perPop}
                </b>
              </span>
              <Ico path={icon} size="tile" />
              <span className="col-count num">{count}</span>
              <span className="col-yield">
                {made.length === 0 ? (
                  <span>makes nothing</span>
                ) : (
                  made.map(([resource, n]) => (
                    <span className="col-yield-i" key={resource}>
                      <b>{sign(n)}</b>
                      <Ico path={RESOURCE_ICON[resource]} size="chip" />
                    </span>
                  ))
                )}
                {pop === "slaves" && idle > 0 ? (
                  <span className="col-yield-i" data-c="settle-idle">
                    <b>{idle}</b> idle
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="ground" data-c="settle-lines">
        {settlement.buildings.map((id, index) => {
          const building = getBuilding(G.definition.content, id);
          // A standing building states its one fact; the Port's is the good it claimed.
          const claimed = G.board.luxuries
            .filter((asset) => asset.claimedAtSettlementId === settlement.id)
            .map((asset) => getLuxuryGood(G.definition.content, asset.goodId)?.name ?? asset.goodId)
            .join(", ");
          const fact =
            id === "port"
              ? claimed
                ? `Claims ${claimed}`
                : "Its claim is gone"
              : building
                ? presentBuildingEffects(building.effects).text
                : "";
          return (
            <li className="g-line" data-c="settle-line" key={`${id}-${index}`}>
              <Ico path={BUILDING_ICON[id] ?? "buildings/build"} size="ui" />
              {building?.name ?? id}
              {fact ? <span>{fact}</span> : null}
            </li>
          );
        })}
        {/* The open slots are the land: a slave works each, or a building takes it. */}
        <li className="g-line" data-c="settle-line">
          <Ico path="settlements/slot" size="ui" />
          {onRaise && canRaise ? (
            <button className="link" onClick={() => onRaise(tile.id)} type="button">
              Raise a building
            </button>
          ) : (
            "Open slots"
          )}
          <span>
            {primary ? (
              <>
                <b>{working}</b> of {open} worked
              </>
            ) : (
              <>
                <b>{open}</b> open, none worked
              </>
            )}
          </span>
        </li>
      </ul>
    </>
  );
}
