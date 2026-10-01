import { Fragment } from "react";
import { POP_TYPES, getDemotePopStatus, getPromotePopStatus } from "../../../game/rules";
import type { HegemonyState, PlayerId, PopType, Resources } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { useGameUi } from "../../board/GameUiContext";
import { calculatePopEconomy, capitalize } from "../../board/helpers";
import type { OwnedHolding } from "../../board/types";
import { CodexTermLink } from "../../codexLink";
import { Tooltip } from "../../overlays/Tooltip";
import { Chips, Ico, Price, Tip } from "../parts";
import { PlaceSeal } from "./PlaceSeal";

const POP_ICON: Record<PopType, string> = {
  citizens: "pops/citizens",
  freemen: "pops/freemen",
  slaves: "pops/slaves",
};

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

const units = (cost: Partial<Resources>) =>
  Object.values(cost).reduce((sum: number, n) => sum + (n ?? 0), 0);

/** The cheapest settlement's price for a step: the number that decides whether you press. */
function bestCost(
  G: HegemonyState,
  playerID: PlayerId,
  holdings: OwnedHolding[],
  kind: "promote" | "demote",
  from: PopType,
): Partial<Resources> {
  const status = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
  const costs = holdings.map(({ tile }) => status(G, playerID, tile.id, from).cost ?? {});
  const fallback =
    kind === "promote"
      ? (G.ruleset.ladder.promoteCosts[from as "slaves" | "freemen"] ?? {})
      : (G.ruleset.ladder.demoteCosts[from as "citizens" | "freemen"] ?? {});
  return costs.reduce((best, cost) => (units(cost) < units(best) ? cost : best), fallback);
}

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
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const player = G.players[playerID];
  const economy = calculatePopEconomy(holdings, G.ruleset);
  const names = settlementNames(G.board.tiles);
  const count = (pop: PopType) =>
    holdings.reduce((total, { settlement }) => total + settlement.pops[pop], 0);
  const history = `${player.grownSettlementsThisTurn.length} grown this turn · ${player.popsGainedFromEvents} gained from events · ${player.popsLostToUnrest} lost to riots · ${player.popsLostToHunger} to hunger`;

  const step = (kind: "promote" | "demote", from: PopType, to: PopType) => {
    const status = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
    const enabled =
      isActive &&
      phase === "gameplay" &&
      holdings.some(({ tile }) => status(G, playerID, tile.id, from).can);
    const verb = RUNG_VERBS[kind][from] ?? capitalize(kind);
    const cost = bestCost(G, playerID, holdings, kind, from);
    const what = `${verb} a ${formatPopLabel(from, 1)} to ${formatPopLabel(to, 1)}`;

    return (
      <Tooltip
        content={
          <Tip sub="the cheapest settlement's price" title={what}>
            <p className="tip-body">
              Choose which settlement pays: a pop&rsquo;s worth depends on the ground it stands on.
            </p>
            {enabled ? null : (
              <p className="tip-body">No legal move now; one ladder step a turn.</p>
            )}
          </Tip>
        }
        key={`${kind}-${from}`}
      >
        <button
          aria-disabled={enabled ? undefined : true}
          aria-label={`${what}.`}
          className="rung-btn"
          onClick={enabled ? () => onLadderRequest({ kind, from }) : undefined}
          type="button"
        >
          <Ico path={kind === "promote" ? "pops/promote" : "pops/demote"} size="chip" />
          <span className="rung-v">{verb}</span>
          <span className="rung-t">
            {formatPopLabel(from, 1)} {kind === "promote" ? "↑" : "↓"}
          </span>
          <Price amounts={cost} />
        </button>
      </Tooltip>
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
                <Ico path={POP_ICON[pop]} size="ui" />
                <span className="tier-name">
                  <CodexTermLink chapter="population">
                    {capitalize(formatPopLabel(pop, 2))}
                  </CodexTermLink>
                </span>
                <b className="tier-count num">{count(pop)}</b>
                <span className="tier-makes">
                  <Chips amounts={economy[pop]} empty={<span className="cap">no income</span>} />
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
                          path={POP_ICON[pop]}
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
            <Chips amounts={income} empty={<span className="cap">nothing moves</span>} />
          </span>
        </div>
      </div>
    </>
  );
}
