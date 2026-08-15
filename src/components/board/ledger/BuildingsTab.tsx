import { getBuildBuildingStatus, getBuildings } from "../../../game/rules";
import type { BuildingId, Resources } from "../../../game/types";
import { presentBuildingEffect } from "../../../ui/effects";
import { formatNumber, formatResourceCost } from "../../../ui/formatters";
import { BUILDING_GLYPHS, RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { settlementNameOf } from "../../../ui/settlementNames";
import { AnnotatedText } from "../../AnnotatedText";
import { MechanicsDetails } from "../../MechanicsDetails";
import { CodexTermLink } from "../../codexLink";
import { Tooltip } from "../../overlays/Tooltip";
import { useGameUi } from "../GameUiContext";
import { actionRequirementText, getBuildingBenefitText } from "../helpers";
import type { OwnedHolding } from "../types";

/**
 * Build — one card per building, with the places you could raise it underneath.
 *
 * The old tab put every building's name, effect and base cost in a row, then
 * repeated the whole cost line once per settlement below it. On four holdings
 * that is nine buildings × four repeated prices — and the price it printed is not
 * the one you pay anyway.
 *
 * So the card shows **one** cost: the effective one, what a settlement charges
 * you today. The base-versus-effective arithmetic moves to the tooltip, per the
 * presentation contract. When you cannot afford it, the card dims **except** the
 * part you are short on, which stays lit in `--neg` and says how much more.
 */

/** The part of a price you cannot pay, as a sentence: "needs 2 more stone". */
function shortfallOf(cost: Resources | Partial<Resources>, held: Resources): string | null {
  for (const resource of RESOURCE_ORDER) {
    const price = cost[resource] ?? 0;

    if (price > held[resource]) {
      return `needs ${formatNumber(price - held[resource])} more ${resource}`;
    }
  }

  return null;
}

function CostRow({
  cost,
  held,
  dim,
}: {
  cost: Resources | Partial<Resources>;
  held: Resources;
  dim: boolean;
}) {
  return (
    <span className="bcardCost num">
      {RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) > 0).map((resource) => {
        const price = cost[resource] ?? 0;
        const short = dim && price > held[resource];

        return (
          <span className={short ? "bcardCostItem bcardCostShort" : "bcardCostItem"} key={resource}>
            <Icon glyph={RESOURCE_GLYPHS[resource]} />
            {formatNumber(price)}
          </span>
        );
      })}
    </span>
  );
}

export function BuildingsTab({
  holdings,
  onBuildBuildingRequest,
}: {
  holdings: OwnedHolding[];
  onBuildBuildingRequest: (tileId: string, buildingId: BuildingId) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const held = G.players[playerID].resources;

  return (
    <div className="buildPage">
      {getBuildings(G.definition.content).map((building) => {
        // A building reads as blocked only when NO settlement can raise it; the
        // cost shown is the one the first willing settlement would charge.
        const candidates = holdings.map(({ tile, settlement }) => ({
          tile,
          settlement,
          status: getBuildBuildingStatus(G, playerID, tile.id, building.id),
        }));
        const open = candidates.filter(({ status }) => status.can);
        const blocked = open.length === 0 || !isActive || phase !== "gameplay";
        const shownCost = (open[0] ?? candidates[0])?.status.cost ?? building.cost;
        const shortfall = shortfallOf(shownCost, held);

        return (
          <article className={`bcard${blocked ? " bcardBlocked" : ""}`} key={building.id}>
            <div className="bcardTop">
              <span className="bcardTile">
                <Icon glyph={BUILDING_GLYPHS[building.id]} size="rail" />
              </span>

              <span className="bcardName">
                <b className="title">
                  <CodexTermLink chapter="buildings">{building.name}</CodexTermLink>
                </b>
                <span className="bcardEffects">
                  {building.effects.map((effect, index) => {
                    const presented = presentBuildingEffect(effect);

                    return (
                      <span
                        className={`effectRow ${presented.tone === "negative" ? "neg" : "pos"}`}
                        key={index}
                      >
                        <EffectIcon family="building" effect={effect} />
                        <span className="caption">{presented.text}</span>
                      </span>
                    );
                  })}
                </span>
              </span>

              <CostRow cost={shownCost} held={held} dim={Boolean(shortfall)} />
            </div>

            {shortfall ? <p className="bcardShortfall label neg">{shortfall}</p> : null}

            <div className="bcardTargets">
              {candidates.map(({ tile, settlement, status }) => {
                const disabled = !isActive || phase !== "gameplay" || !status.can;
                const name = settlementNameOf(G.board.tiles, settlement.id);
                const benefit = getBuildingBenefitText(G, playerID, tile, building);

                return (
                  <Tooltip
                    content={
                      <MechanicsDetails
                        blockedReason={
                          disabled ? actionRequirementText(status, phase, isActive) : undefined
                        }
                        effects={building.effects.map(presentBuildingEffect)}
                        effectiveCost={status.cost ?? building.cost}
                        heading={`${building.name} — ${name}`}
                      >
                        <p className="mechanicsExplanation">
                          <AnnotatedText links={false} text={benefit} />
                        </p>
                        <p className="mechanicsExplanation">
                          Base cost {formatResourceCost(building.cost)}.
                        </p>
                      </MechanicsDetails>
                    }
                    key={`${building.id}-${tile.id}`}
                    triggerClassName="bcardTargetTrigger"
                  >
                    <button
                      aria-disabled={disabled}
                      className={`bcardTarget${disabled ? " bcardTargetGhost" : ""}`}
                      onClick={
                        disabled ? undefined : () => onBuildBuildingRequest(tile.id, building.id)
                      }
                      type="button"
                    >
                      <span className="verb">Raise in {name}</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}
