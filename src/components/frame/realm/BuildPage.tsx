import {
  buildingGround,
  claimableLuxuriesAt,
  getAdjustedActionCost,
  getBuildBuildingStatus,
  getBuildings,
  getLuxuryGood,
} from "../../../game/rules";
import type {
  BuildingDefinition,
  BuildingId,
  HegemonyState,
  HexTile,
  PlayerId,
} from "../../../game/types";
import { presentBuildingEffects } from "../../../ui/effects";
import { canPay } from "../../../ui/frameFormat";
import { BUILDING_RASTERS } from "../../../ui/iconRegistry";
import { formatResourceCost } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { ActionButton } from "../../ActionButton";
import { AnnotatedText } from "../../AnnotatedText";
import { useGameUi } from "../../board/GameUiContext";
import { getBuildingBenefitText } from "../../board/helpers";
import type { OwnedHolding } from "../../board/types";
import { Chips, Ico } from "../parts";

/** What a building does in this place, short enough for one line of a cell. */
function cellLine(
  G: HegemonyState,
  playerID: PlayerId,
  tile: HexTile,
  building: BuildingDefinition,
) {
  if (building.claimsLuxury) {
    const goods = claimableLuxuriesAt(G, tile.id).map(
      (asset) => getLuxuryGood(G.definition.content, asset.goodId)?.name ?? asset.goodId,
    );
    return goods.length > 0 ? `claims ${goods.join(" or ")}` : "no good adjoins";
  }
  return getBuildingBenefitText(G, playerID, tile, building);
}

/**
 * Build: the place you raise in, picked at the top, and every building as one
 * cell priced for that place. A cell says what the building does there, or why
 * it cannot be raised there; the rule and the arithmetic are in its tooltip.
 */
export function BuildPage({
  holdings,
  targetTileId,
  onTarget,
  onBuildBuildingRequest,
}: {
  holdings: OwnedHolding[];
  targetTileId: string | null;
  onTarget: (tileId: string) => void;
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  const { G, viewerId: playerID, turnBlocked } = useGameUi();
  const names = settlementNames(G.board.tiles);
  const store = G.players[playerID].resources;
  // A place to raise in is a city, or a colony whose site holds or would take a Port.
  const slotted = holdings.map((holding) => ({
    holding,
    ...buildingGround(G, holding.settlement.owner, holding.tile.id),
  }));
  const ground = slotted.filter(
    (entry) => entry.slots > 0 || entry.built > 0 || entry.raisable > 0,
  );
  const bare = slotted.filter(
    (entry) => entry.slots === 0 && entry.built === 0 && entry.raisable === 0,
  );
  const target =
    ground.find((entry) => entry.holding.tile.id === targetTileId) ??
    ground.find((entry) => entry.raisable > 0) ??
    ground[0];
  const bareNames = bare.map(({ holding }) => names.get(holding.settlement.id) ?? "POLIS");

  return (
    <>
      <div aria-label="Raise in" className="targets" data-c="targets" role="radiogroup">
        <span className="caps">Raise in</span>
        {ground.map(({ holding, open, raisable }) => (
          <button
            aria-checked={holding === target?.holding}
            className="target"
            key={holding.settlement.id}
            onClick={() => onTarget(holding.tile.id)}
            role="radio"
            type="button"
          >
            <span className="target-name">{names.get(holding.settlement.id)}</span>
            <span className="cap">
              {open > 0 ? `${open} open` : raisable > 0 ? "site available" : "full"}
            </span>
          </button>
        ))}
        {bare.length > 0 ? (
          <span
            className="target-none cap"
            title={`A colony raises nothing but a Port on the coast: ${bareNames.join(", ")}`}
          >
            {bare.length === 1 ? bareNames[0] : `${bare.length} colonies`} · no ground
          </span>
        ) : null}
      </div>
      <div className="bgrid" data-c="bgrid">
        {getBuildings(G.definition.content).map((building) => {
          if (!target) {
            const cost = getAdjustedActionCost(
              G,
              playerID,
              "buildBuilding",
              building.cost,
              building.id,
            );
            return (
              <div aria-disabled="true" className="bcell" key={building.id}>
                <Ico path={BUILDING_RASTERS[building.id]} size="ui" />
                <span className="bn">{building.name}</span>
                <Chips amounts={cost} short={!canPay(store, cost)} />
                <span className="bx">no ground</span>
              </div>
            );
          }
          const { holding } = target;
          const name = names.get(holding.settlement.id) ?? "POLIS";
          const status = getBuildBuildingStatus(G, playerID, holding.tile.id, building.id);
          const cost = status.cost ?? building.cost;
          const refused = turnBlocked ?? (status.can ? null : status.reasons.join(" "));
          // The cell's one caption line takes the first reason; the tooltip has them all.
          const line = refused
            ? (turnBlocked ?? status.reasons[0])
            : cellLine(G, playerID, holding.tile, building);

          return (
            <ActionButton
              aria-label={
                refused
                  ? `${building.name} in ${name}: ${refused}`
                  : `Raise ${building.name} in ${name}.`
              }
              blockedReason={refused}
              className="bcell"
              effectiveCost={cost}
              enabled={!refused}
              explanation={
                <>
                  <p className="mechanicsExplanation">
                    {presentBuildingEffects(building.effects).text || "—"}
                  </p>
                  <p className="mechanicsExplanation">
                    <AnnotatedText
                      links={false}
                      text={getBuildingBenefitText(G, playerID, holding.tile, building)}
                    />
                  </p>
                  <p className="mechanicsExplanation">
                    Base cost {formatResourceCost(building.cost)}.
                  </p>
                </>
              }
              heading={`${building.name} in ${name}`}
              key={building.id}
              onClick={() => onBuildBuildingRequest(holding.tile.id, building.id)}
              triggerClassName="bcell-trigger"
            >
              <Ico path={BUILDING_RASTERS[building.id]} size="ui" />
              <span className="bn">{building.name}</span>
              <Chips amounts={cost} short={!canPay(store, cost)} />
              <span className={`bx${refused ? " is-refused" : ""}`}>
                <AnnotatedText links={false} text={line} />
              </span>
            </ActionButton>
          );
        })}
      </div>
    </>
  );
}
