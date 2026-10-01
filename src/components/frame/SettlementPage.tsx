import { getBuilding } from "../../game/content";
import { popIncome } from "../../game/economy/income";
import {
  settlementBuildingSlots,
  settlementCapacity,
  settlementIdleSlaves,
  settlementOpenSlots,
  settlementSlots,
  settlementWorkingSlaves,
} from "../../game/settlement";
import type { HegemonyState, HexTile, PopType, Resource, Settlement } from "../../game/types";
import { BUILDING_ICON, RESOURCE_ICON, sign } from "../../ui/frameFormat";
import { getBuildingBenefitText } from "../board/helpers";
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
 * The subject settlement: a meta line, three pop columns (count and what the
 * class makes here), and a line per building plus the open slots, which the
 * slaves work. Every number comes from the engine's own formulas: the per-class
 * yield is `popIncome`, and the slots are the settlement selectors'.
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
  const capacity = settlementCapacity(settlement, G.ruleset, G.definition.content);
  const slots = settlementSlots(tile, settlement);
  const open = settlementOpenSlots(tile, settlement);
  const working = settlementWorkingSlaves(tile, settlement);
  const idle = settlementIdleSlaves(tile, settlement);
  const canRaise =
    settlementBuildingSlots(tile, settlement, G.ruleset) > settlement.buildings.length;

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
          const made = nonZero(
            popIncome(pop, count, primary, G.ruleset, pop === "slaves" ? working : count),
          );

          return (
            <div className="settle-col" data-c="settle-col" key={pop}>
              <span className="col-head caps">{label}</span>
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
          return (
            // v1 lets a settlement raise the same building twice.
            <li className="g-line" data-c="settle-line" key={`${id}-${index}`}>
              <Ico path={BUILDING_ICON[id] ?? "buildings/build"} size="ui" />
              {building?.name ?? id}
              {building ? (
                <span>{getBuildingBenefitText(G, settlement.owner, tile, building)}</span>
              ) : null}
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
