import {
  claimableLuxuriesAt,
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
import { BUILDING_ICON, canPay } from "../../../ui/frameFormat";
import { formatResourceCost } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { AnnotatedText } from "../../AnnotatedText";
import { useGameUi } from "../../board/GameUiContext";
import { actionRequirementText, getBuildingBenefitText } from "../../board/helpers";
import { buildRefusal, shortfallOf } from "../../board/ledger/buildRefusal";
import { slotsOf } from "../../board/ledger/slots";
import type { OwnedHolding } from "../../board/types";
import { Tooltip } from "../../overlays/Tooltip";
import { Ico, Price, Tip } from "../parts";

/** What a building does in this place, short enough for one line of a cell. */
function cellLine(
  G: HegemonyState,
  playerID: PlayerId,
  tile: HexTile,
  building: BuildingDefinition,
) {
  if (building.id === "port") {
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
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const names = settlementNames(G.board.tiles);
  const store = G.players[playerID].resources;
  // A place to raise in is a city, or a colony whose site holds or would take a Port.
  const slotted = holdings.map((holding) => ({ holding, ...slotsOf(holding, G) }));
  const ground = slotted.filter((entry) => entry.slots > 0);
  const bare = slotted.filter((entry) => entry.slots === 0);
  const target =
    ground.find((entry) => entry.holding.tile.id === targetTileId) ??
    ground.find((entry) => entry.open > 0) ??
    ground[0];
  const shut = !isActive ? "not your turn" : phase !== "gameplay" ? "not in this phase" : null;
  const bareNames = bare.map(({ holding }) => names.get(holding.settlement.id) ?? "POLIS");

  return (
    <>
      <div aria-label="Raise in" className="targets" data-c="targets" role="radiogroup">
        <span className="caps">Raise in</span>
        {ground.map(({ holding, open }) => (
          <button
            aria-checked={holding === target?.holding}
            className="target"
            key={holding.settlement.id}
            onClick={() => onTarget(holding.tile.id)}
            role="radio"
            type="button"
          >
            <span className="target-name">{names.get(holding.settlement.id)}</span>
            <span className="cap">{open > 0 ? `${open} open` : "full"}</span>
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
            return (
              <div aria-disabled="true" className="bcell" key={building.id}>
                <Ico path={BUILDING_ICON[building.id] ?? "buildings/build"} size="ui" />
                <span className="bn">{building.name}</span>
                <Price amounts={building.cost} short={!canPay(store, building.cost)} />
                <span className="bx">no ground</span>
              </div>
            );
          }
          const { holding, open } = target;
          const name = names.get(holding.settlement.id) ?? "POLIS";
          const status = getBuildBuildingStatus(G, playerID, holding.tile.id, building.id);
          const cost = status.cost ?? building.cost;
          const refused =
            shut ??
            (status.can
              ? null
              : buildRefusal(holding.settlement, building, open, shortfallOf(cost, store)));
          const line = refused ?? cellLine(G, playerID, holding.tile, building);

          return (
            <Tooltip
              content={
                <Tip sub={name} title={building.name}>
                  <p className="tip-body">{presentBuildingEffects(building.effects).text || "—"}</p>
                  <p className="tip-body">
                    <AnnotatedText
                      links={false}
                      text={getBuildingBenefitText(G, playerID, holding.tile, building)}
                    />
                  </p>
                  <p className="tip-body">
                    Costs {formatResourceCost(cost)}; base {formatResourceCost(building.cost)}.
                  </p>
                  {refused ? (
                    <p className="tip-body">{actionRequirementText(status, phase, isActive)}</p>
                  ) : null}
                </Tip>
              }
              key={building.id}
              triggerClassName="bcell-trigger"
            >
              <button
                aria-disabled={refused ? true : undefined}
                aria-label={
                  refused
                    ? `${building.name} in ${name}: ${refused}.`
                    : `Raise ${building.name} in ${name}.`
                }
                className="bcell"
                onClick={
                  refused ? undefined : () => onBuildBuildingRequest(holding.tile.id, building.id)
                }
                type="button"
              >
                <Ico path={BUILDING_ICON[building.id] ?? "buildings/build"} size="ui" />
                <span className="bn">{building.name}</span>
                <Price amounts={cost} short={!canPay(store, cost)} />
                <span className={`bx${refused ? " is-refused" : ""}`}>
                  <AnnotatedText links={false} text={line} />
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </>
  );
}
