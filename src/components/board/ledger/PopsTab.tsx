import {
  POP_TYPES,
  calculateEconomyProjection,
  getDemotePopStatus,
  getPromotePopStatus,
  settlementCapacity,
} from "../../../game/rules";
import type { PopType, Resources } from "../../../game/types";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { POP_GLYPHS, RESOURCE_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { formatPopLabel, formatSignedNumber } from "../../../ui/formatters";
import { settlementNames } from "../../../ui/settlementNames";
import { CodexTermLink } from "../../codexLink";
import { Tooltip } from "../../overlays/Tooltip";
import { MechanicsDetails } from "../../MechanicsDetails";
import { calculatePopEconomy, capitalize } from "../helpers";
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
 */
const GAPS: Array<{ upper: PopType; lower: PopType }> = [
  { upper: "citizens", lower: "freemen" },
  { upper: "freemen", lower: "slaves" },
];

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
    const verb = kind === "promote" ? "Raise" : "Sell";

    return (
      <div className="rung" key={`${kind}-${from}`}>
        <Tooltip
          content={
            <MechanicsDetails
              blockedReason={
                enabled ? undefined : "No legal move right now — one ladder step per turn."
              }
              heading={`${verb} a ${formatPopLabel(from, 1)}`}
            >
              <p className="mechanicsExplanation">
                Choose which settlement pays: a pop&rsquo;s worth depends on the ground it stands
                on.
              </p>
            </MechanicsDetails>
          }
          triggerClassName="rungTrigger"
        >
          <button
            aria-disabled={!enabled}
            className="rungButton"
            onClick={enabled ? () => onLadderRequest({ kind, from }) : undefined}
            type="button"
          >
            <Icon glyph={kind === "promote" ? "promote" : "demote"} />
            <span className="verb">
              {verb} to {formatPopLabel(to, 1)}
            </span>
          </button>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="ladderPage">
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
          reading a settlement here and finding it out there is one skill. */}
      <h3 className="ladderSection label">Where they live</h3>
      <div className="beadMap">
        {holdings.map(({ tile, settlement }) => {
          const capacity = settlementCapacity(settlement, G.ruleset, G.definition.content);
          const beads = POP_TYPES.flatMap((pop) =>
            Array.from({ length: settlement.pops[pop] }, () => pop),
          );

          return (
            <div className="beadRow" key={settlement.id}>
              <span className="beadPlace label">{names.get(settlement.id)}</span>
              <span className="beads" aria-hidden="true">
                {beads.map((pop, beadIndex) => (
                  <i className={`bead bead-${pop}`} key={`${pop}-${beadIndex}`} />
                ))}
                {Array.from({ length: Math.max(0, capacity - beads.length) }, (_, empty) => (
                  <i className="bead bead-empty" key={`empty-${empty}`} />
                ))}
              </span>
              <span className="beadCap caption num">
                {beads.length}/{capacity}
              </span>
              <span className="visuallyHidden">
                {beads.length} of {capacity} on {tile.terrain}
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
