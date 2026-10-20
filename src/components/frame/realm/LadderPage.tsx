import { Fragment } from "react";
import { POP_TYPES, getDemotePopStatus, getPromotePopStatus, realmPops } from "../../../game/rules";
import type { PopType, Resources } from "../../../game/types";
import { cheapestCost } from "../../../ui/frameFormat";
import { POP_RASTERS } from "../../../ui/iconRegistry";
import { formatPopLabel } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { ActionButton } from "../../ActionButton";
import { useGameUi } from "../../board/GameUiContext";
import { calculatePopEconomy, capitalize } from "../../board/helpers";
import type { OwnedHolding } from "../../board/types";
import { CodexTermLink } from "../../codexLink";
import { Tooltip } from "../../overlays/Tooltip";
import { Chips, Ico, Tip } from "../parts";
import { PlaceSeal } from "./PlaceSeal";

/** The two gaps in the ladder, top to bottom; each is a step either way. */
const GAPS: Array<{ upper: PopType; lower: PopType }> = [
  { upper: "citizens", lower: "freemen" },
  { upper: "freemen", lower: "slaves" },
];

/** The acts, not the direction: a slave is freed and a freeman is sold. */
const RUNG_VERBS: Record<"promote" | "demote", Partial<Record<PopType, string>>> = {
  promote: { slaves: "Free", freemen: "Raise" },
  demote: { citizens: "Demote", freemen: "Sell" },
};

/** Past this many places, "Live in" counts heads instead of drawing them. */
const DRAWN = 3;

/**
 * The Ladder: three tiers, top to bottom, with each gap's two steps drawn on
 * the rung between them; then where the people live and the net per turn.
 */
export function LadderPage({
  holdings,
  income,
  onLadderRequest,
}: {
  holdings: OwnedHolding[];
  income: Resources;
  onLadderRequest: (request: { kind: "promote" | "demote"; from: PopType }) => void;
}) {
  const { G, viewerId: playerID, turnBlocked } = useGameUi();
  const player = G.players[playerID];
  const economy = calculatePopEconomy(holdings, G);
  const names = settlementNames(G.board.tiles);
  // Each tier's count, those on the move included: they are still in the realm.
  const count = realmPops(G, playerID);
  const history = `${player.grownSettlementsThisTurn.length} grown this turn · ${player.popsGainedFromEvents} gained from events · ${player.popsLostToUnrest} lost to riots · ${player.popsLostToHunger} to hunger`;

  const step = (kind: "promote" | "demote", from: PopType, to: PopType) => {
    const status = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
    // Each settlement's status; with none, the engine's refusal and price for no place.
    const tileIds = holdings.length > 0 ? holdings.map(({ tile }) => tile.id) : [""];
    const statuses = tileIds.map((tileId) => status(G, playerID, tileId, from));
    const enabled = turnBlocked === null && statuses.some((each) => each.can);
    const verb = RUNG_VERBS[kind][from] ?? capitalize(kind);
    // The cheapest settlement's price: the number that decides whether you press.
    const cost = cheapestCost(statuses.map((each) => each.cost ?? {}));
    const what = `${verb} a ${formatPopLabel(from, 1)} to ${formatPopLabel(to, 1)}`;

    return (
      <ActionButton
        aria-label={`${what}.`}
        blockedReason={turnBlocked ?? statuses[0].reasons.join(" ")}
        className="rung-btn"
        effectiveCost={cost}
        enabled={enabled}
        explanation={
          <p className="mechanicsExplanation">
            Priced at the cheapest settlement. Choose which settlement pays: a pop&rsquo;s worth
            depends on the ground it stands on.
          </p>
        }
        heading={what}
        key={`${kind}-${from}`}
        onClick={() => onLadderRequest({ kind, from })}
      >
        <Ico path={kind === "promote" ? "pops/promote" : "pops/demote"} size="chip" />
        <span className="rung-v">{verb}</span>
        <span className="rung-t">
          {formatPopLabel(from, 1)} {kind === "promote" ? "↑" : "↓"}
        </span>
        <Chips amounts={cost} />
      </ActionButton>
    );
  };

  return (
    <>
      <div className="ladder" data-c="ladder">
        {POP_TYPES.map((pop) => {
          const gap = GAPS.find((candidate) => candidate.upper === pop);
          return (
            <Fragment key={pop}>
              <Tooltip
                content={
                  <Tip title={capitalize(formatPopLabel(pop, 2))}>
                    <p className="tip-body">{history}</p>
                  </Tip>
                }
                triggerAs="div"
                triggerClassName="tier-row"
              >
                <Ico path={POP_RASTERS[pop]} size="ui" />
                <span className="tier-name">
                  <CodexTermLink chapter="population">
                    {capitalize(formatPopLabel(pop, 2))}
                  </CodexTermLink>
                </span>
                <b className="tier-count num">{count[pop]}</b>
                <span className="tier-makes">
                  <Chips
                    amounts={economy[pop]}
                    signed
                    empty={<span className="cap">no income</span>}
                  />
                </span>
              </Tooltip>
              {gap ? (
                <div className="rung">
                  <span aria-hidden="true" className="rung-rail" />
                  {step("promote", gap.lower, gap.upper)}
                  {step("demote", gap.upper, gap.lower)}
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
      <div className="lad-foot">
        <div className="lad-line">
          <span className="caps">Live in</span>
          {holdings.map(({ settlement }) => {
            const name = names.get(settlement.id) ?? "POLIS";
            const heads = POP_TYPES.reduce((sum, pop) => sum + settlement.pops[pop], 0);
            return (
              <span className="where-g" key={settlement.id}>
                {holdings.length <= DRAWN ? (
                  <PlaceSeal kind={settlement.kind} owner={settlement.owner} />
                ) : null}
                <span className="caps">{name}</span>
                {holdings.length <= DRAWN ? (
                  <span className="beads">
                    {POP_TYPES.flatMap((pop) =>
                      Array.from({ length: settlement.pops[pop] }, (_, i) => (
                        <Ico
                          className="bead"
                          key={`${pop}-${i}`}
                          path={POP_RASTERS[pop]}
                          size="chip"
                        />
                      )),
                    )}
                  </span>
                ) : (
                  <b className="num">{heads}</b>
                )}
              </span>
            );
          })}
        </div>
        <div className="lad-line">
          <span className="caps">Net / turn</span>
          <span className="lad-net">
            <Chips amounts={income} signed empty={<span className="cap">nothing moves</span>} />
          </span>
        </div>
      </div>
    </>
  );
}
