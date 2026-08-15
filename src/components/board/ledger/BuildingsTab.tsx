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
import { slotsOf } from "./slots";

/**
 * Build — one card per building, and under it the places that could take it.
 *
 * Two things this page was getting wrong, and they are the same thing twice.
 *
 * **It never said where an open slot is.** The page opened straight into the
 * card list, so the first question a build decision asks — *have I got ground
 * to build on?* — had no answer anywhere on screen. It is the heading now, off
 * the same socket count the Cities page draws.
 *
 * **A target hid its own blocker.** Every card carried one full-width
 * `Raise in <city>` button per settlement, identical whether the place could
 * take the building or not, with the reason buried in a tooltip. Seven cards of
 * those needed ~1700px of column. A target names its refusal on its face now —
 * `SIKYON · NO SLOT` — and when the price is what stops you, that is a fact
 * about the card and not about any one settlement, so the card says it once.
 */

/** The part of a price you cannot pay, as a phrase: "needs 2 more stone". */
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
  const slotted = holdings.map((holding) => ({ holding, ...slotsOf(holding, G.ruleset) }));
  const withRoom = slotted.filter((entry) => entry.open > 0);
  const openTotal = withRoom.reduce((total, entry) => total + entry.open, 0);
  const openLine =
    openTotal === 0
      ? "no slot stands open"
      : withRoom.length === 1
        ? `${settlementNameOf(G.board.tiles, withRoom[0].holding.settlement.id)} has ${openTotal}`
        : `${openTotal} open across ${withRoom.length} places`;
  // One gate over the whole page: when it is not your turn nothing below can be
  // pressed, and saying so once beats stamping it on every target.
  const shut = !isActive ? "not your turn" : phase !== "gameplay" ? "not in this phase" : null;

  return (
    <div className="buildPage">
      <h3 className="pageSection label">Raise in an open slot · {openLine}</h3>

      {getBuildings(G.definition.content).map((building) => {
        const candidates = slotted.map((entry) => ({
          ...entry,
          status: getBuildBuildingStatus(G, playerID, entry.holding.tile.id, building.id),
        }));
        const open = candidates.filter(({ status }) => status.can);
        const blocked = open.length === 0 || shut !== null;
        // The cost shown is what the first willing settlement charges; discounts
        // and multipliers are already in it, and the arithmetic is in the tooltip.
        const shownCost = (open[0] ?? candidates[0])?.status.cost ?? building.cost;
        const shortfall = shortfallOf(shownCost, held);
        // A price you cannot pay, or a turn that is not yours, blocks every
        // target for the same reason — so the row collapses to one button
        // carrying it, instead of repeating it once per settlement.
        const wholeCard =
          shut ?? (shortfall && candidates.every(({ status }) => !status.can) ? shortfall : null);
        const shown = wholeCard ? candidates.slice(0, 1) : candidates;

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

            <div className="bcardTargets">
              {shown.map(({ holding, open: room, status }) => {
                const { tile, settlement } = holding;
                const name = settlementNameOf(G.board.tiles, settlement.id);
                const disabled = shut !== null || !status.can;
                // Why this place says no, as a phrase short enough to wear. The
                // facts come from state, never from parsing the engine's prose.
                const blocker = !disabled
                  ? null
                  : (wholeCard ??
                    (room <= 0
                      ? "no slot"
                      : settlement.buildings.includes(building.id)
                        ? "already raised"
                        : (shortfall ?? "cannot raise here")));
                // The heading already said the verb ("raise in an open slot"), so
                // a live target only has to name its place — which is also what
                // keeps two of them on one line inside a 306px tablet.
                const label = blocker ? (wholeCard ? blocker : `${name} · ${blocker}`) : name;

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
                          <AnnotatedText
                            links={false}
                            text={getBuildingBenefitText(G, playerID, tile, building)}
                          />
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
                      aria-label={
                        disabled
                          ? `${building.name} in ${name}: ${blocker}.`
                          : `Raise ${building.name} in ${name}.`
                      }
                      className={`bcardTarget${disabled ? " bcardTargetGhost" : ""}`}
                      onClick={
                        disabled ? undefined : () => onBuildBuildingRequest(tile.id, building.id)
                      }
                      type="button"
                    >
                      <span className="label">{label}</span>
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
