import {
  POP_TYPES,
  calculateEconomyProjection,
  getDemotePopStatus,
  getPromotePopStatus,
} from "../../../game/rules";
import type { HegemonyState, PlayerId, PopType, Resource, Resources } from "../../../game/types";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { POP_GLYPHS, RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { formatPopLabel, formatSignedNumber } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { CodexTermLink } from "../../codexLink";
import { Tooltip } from "../../overlays/Tooltip";
import { MechanicsDetails } from "../../MechanicsDetails";
import { calculatePopEconomy, capitalize } from "../helpers";
import { SealMark } from "./SealMark";
import type { OwnedHolding } from "../types";
import { useGameUi } from "../GameUiContext";

/**
 * The Ladder — three tiers with the two rungs BETWEEN them.
 *
 * The old tab was three rows with arrow buttons hanging off their right edge and
 * a four-cell GROWN / IN TRANSIT / GAINED / DEATHS grid underneath. Two problems,
 * and the rebuild is aimed squarely at both:
 *
 * 1. **The ladder is the subject, so it should look like one.** Promote and
 *    demote are steps between tiers, not properties of a tier, so they are drawn
 *    where they happen — on the rung, naming both ends.
 * 2. **The four-cell grid was bookkeeping.** Those are historical counters, not
 *    moves; they live in the tier tooltips now, and the anchor row at the bottom
 *    carries the one number that changes a decision: net income per turn.
 */

/**
 * The two gaps in the ladder, top to bottom. Each gap holds BOTH directions,
 * because a rung is a step you can take either way — the first pass hung one
 * arrow off each tier and the raise-to-citizen step went missing entirely, which
 * is exactly the class of bug that drawing a ladder as a ladder prevents.
 *
 * The verbs are the acts, not the direction: a slave is FREED and a freeman is
 * SOLD, and neither is "promote" to anyone who has played a turn.
 */
const GAPS: Array<{ upper: PopType; lower: PopType }> = [
  { upper: "citizens", lower: "freemen" },
  { upper: "freemen", lower: "slaves" },
];

const RUNG_VERBS: Record<"promote" | "demote", Record<string, string>> = {
  promote: { slaves: "Free", freemen: "Raise" },
  demote: { citizens: "Demote", freemen: "Sell" },
};

/**
 * What this move costs right now, at the cheapest settlement that can make it.
 *
 * A ladder step is priced per settlement — a Gymnasion discounts promotions, and
 * standing Laws cheapen or tax them — so there is no single number in the
 * ruleset to print. The engine's own status helper is asked for each holding and
 * the best price wins, which is the number that decides whether you press: the
 * arithmetic behind it (which settlement, which discount) stays in the tooltip.
 */
function bestRungCost(
  G: HegemonyState,
  playerID: PlayerId,
  holdings: OwnedHolding[],
  kind: "promote" | "demote",
  from: PopType,
): Partial<Resources> {
  const getStatus = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
  const fallback =
    kind === "promote"
      ? (G.ruleset.ladder.promoteCosts[from as "slaves" | "freemen"] ?? {})
      : (G.ruleset.ladder.demoteCosts[from as "citizens" | "freemen"] ?? {});
  const total = (cost: Partial<Resources>) =>
    Object.values(cost).reduce((sum, amount) => sum + amount, 0);

  return holdings.reduce<Partial<Resources>>((best, { tile }) => {
    const cost = getStatus(G, playerID, tile.id, from).cost ?? {};
    return total(cost) < total(best) ? cost : best;
  }, fallback);
}

/** A price, printed: the numeral and the glyph of what it costs. */
function Price({ cost }: { cost: Partial<Resources> }) {
  const parts = RESOURCE_ORDER.filter((resource) => (cost[resource] ?? 0) !== 0);

  if (parts.length === 0) {
    return <span className="rungPrice num">free</span>;
  }

  return (
    <span className="rungPrice num">
      {parts.map((resource) => (
        <span key={resource}>
          {cost[resource]}
          <Icon glyph={RESOURCE_GLYPHS[resource as Resource]} />
        </span>
      ))}
    </span>
  );
}

/** Income chips: only the resources this tier actually moves, signed and coloured. */
function IncomeChips({ resources }: { resources: Resources }) {
  const moved = RESOURCE_ORDER.filter((resource) => resources[resource] !== 0);

  if (moved.length === 0) {
    return <span className="tierIncome caption">no income</span>;
  }

  return (
    <span className="tierIncome num">
      {moved.map((resource) => (
        <span className={resources[resource] > 0 ? "pos" : "neg"} key={resource}>
          <Icon glyph={RESOURCE_GLYPHS[resource]} />
          {formatSignedNumber(resources[resource])}
        </span>
      ))}
    </span>
  );
}

export function PopsTab({
  holdings,
  onLadderRequest,
}: {
  holdings: OwnedHolding[];
  onLadderRequest: (request: { kind: "promote" | "demote"; from: PopType }) => void;
}) {
  const { G, viewerId: playerID, phase, isActive } = useGameUi();
  const player = G.players[playerID];
  const economyByPop = calculatePopEconomy(holdings, G.ruleset);
  const projection = calculateEconomyProjection(G, playerID, { resolveTransfers: true });
  const names = settlementNames(G.board.tiles);
  const totals = POP_TYPES.reduce(
    (counts, pop) => ({
      ...counts,
      [pop]: holdings.reduce((total, { settlement }) => total + settlement.pops[pop], 0),
    }),
    { citizens: 0, freemen: 0, slaves: 0 } as Record<PopType, number>,
  );

  const rung = (kind: "promote" | "demote", from: PopType, to: PopType) => {
    const getStatus = kind === "promote" ? getPromotePopStatus : getDemotePopStatus;
    const possible = holdings.some(({ tile }) => getStatus(G, playerID, tile.id, from).can);
    const enabled = isActive && phase === "gameplay" && possible;
    const verb = RUNG_VERBS[kind][from] ?? (kind === "promote" ? "Raise" : "Sell");
    const cost = bestRungCost(G, playerID, holdings, kind, from);

    return (
      <Tooltip
        content={
          <MechanicsDetails
            blockedReason={
              enabled ? undefined : "No legal move right now — one ladder step per turn."
            }
            heading={`${verb} a ${formatPopLabel(from, 1)} to ${formatPopLabel(to, 1)}`}
          >
            <p className="mechanicsExplanation">
              The price shown is the cheapest settlement&rsquo;s. Choose which one pays: a
              pop&rsquo;s worth depends on the ground it stands on.
            </p>
          </MechanicsDetails>
        }
        key={`${kind}-${from}`}
        triggerClassName="rungTrigger"
      >
        <button
          aria-disabled={!enabled}
          className="rungButton"
          onClick={enabled ? () => onLadderRequest({ kind, from }) : undefined}
          type="button"
        >
          <Icon glyph={kind === "promote" ? "promote" : "demote"} />
          <span className="verb">{verb}</span>
          <Price cost={cost} />
        </button>
      </Tooltip>
    );
  };

  return (
    <div className="ladderPage">
      <h3 className="pageSection label">Social order · top to bottom</h3>

      {POP_TYPES.map((pop) => {
        const gap = GAPS.find((step) => step.upper === pop);

        return (
          <div key={pop}>
            <Tooltip
              content={
                <MechanicsDetails heading={capitalize(formatPopLabel(pop, 2))}>
                  <p className="mechanicsExplanation">
                    {player.grownSettlementsThisTurn.length} grown this turn ·{" "}
                    {player.popsGainedFromEvents} gained from events · {player.popsLostToUnrest}{" "}
                    lost to unrest and starvation.
                  </p>
                </MechanicsDetails>
              }
              triggerClassName="tierTrigger"
            >
              <section className="tier">
                <span className="tierFigure">
                  <Icon glyph={POP_GLYPHS[pop]} size="rail" />
                </span>
                <span className="tierWho">
                  <b className="title">
                    <CodexTermLink chapter="population">
                      {capitalize(formatPopLabel(pop, 2))}
                    </CodexTermLink>
                  </b>
                  <IncomeChips resources={economyByPop[pop]} />
                </span>
                <b className="tierCount stat-lg stat-xl">{totals[pop]}</b>
              </section>
            </Tooltip>

            {gap ? (
              <div className="gap">
                {rung("promote", gap.lower, gap.upper)}
                {rung("demote", gap.upper, gap.lower)}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Where they live. The bead map speaks the board's vocabulary exactly, so
          reading a settlement here and finding it out there is one skill — which
          is why the row is led by the seal the board draws, not a bare icon.
          Only the beads that EXIST are drawn: room to grow is the Cities page's
          question, and printing it twice made this row a capacity meter instead
          of the census it is. */}
      <h3 className="pageSection label">Where they live</h3>
      <div className="beadMap">
        {holdings.map(({ tile, settlement }) => {
          const beads = POP_TYPES.flatMap((pop) =>
            Array.from({ length: settlement.pops[pop] }, () => pop),
          );

          return (
            <div className="beadRow" key={settlement.id}>
              <SealMark className="beadSeal" kind={settlement.kind} owner={playerID} />
              <span className="beadPlace label">{names.get(settlement.id)}</span>
              <span className="beads" aria-hidden="true">
                {beads.map((pop, beadIndex) => (
                  <i className={`bead bead-${pop}`} key={`${pop}-${beadIndex}`} />
                ))}
              </span>
              <span className="visuallyHidden">
                {beads.length} living on {tile.terrain}
              </span>
            </div>
          );
        })}
      </div>

      {/* The anchor: the one number on this page that changes a decision. */}
      <div className="anchorRow">
        <span className="anchorKey label">Net / turn</span>
        <IncomeChips resources={projection.income} />
      </div>
    </div>
  );
}
