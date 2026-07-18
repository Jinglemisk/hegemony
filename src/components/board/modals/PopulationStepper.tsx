import { POP_TYPES, totalPops } from "../../../game/rules";
import type { PopType, Pops } from "../../../game/types";
import { formatPopLabel } from "../../../ui/formatters";
import { AtlasIcon } from "../../Sprites";

/**
 * The three-row pop allocator (citizens / freemen / slaves), shared by every
 * dialog that asks "which pops?" — setup placement, city upgrade, move pops.
 * Promoted out of PopulationModals by R5; it was private there, so each new
 * caller had to import from a 700-line file to reach it.
 *
 * `totalLimit` caps the whole selection (setup asks for exactly N pops);
 * `maxByPop` caps each row (you cannot move pops you do not have).
 */
export function PopulationStepper({
  pops,
  maxByPop,
  totalLimit,
  onChange
}: {
  pops: Pops;
  maxByPop: Pops;
  totalLimit?: number;
  onChange: (pops: Pops) => void;
}) {
  const selectedTotal = totalPops(pops);

  function setAmount(pop: PopType, nextAmount: number) {
    const cappedByPop = Math.max(0, Math.min(nextAmount, maxByPop[pop]));
    const otherTotal = selectedTotal - pops[pop];
    const cappedByTotal = totalLimit === undefined ? cappedByPop : Math.min(cappedByPop, Math.max(0, totalLimit - otherTotal));
    onChange({ ...pops, [pop]: cappedByTotal });
  }

  return (
    <div className="populationStepper">
      {POP_TYPES.map((pop) => (
        <div className="popStepperRow" key={pop}>
          <span className="popStepperLabel">
            <AtlasIcon icon={pop} className="miniIcon" />
            <strong>{formatPopLabel(pop, 2)}</strong>
            <em>Available {maxByPop[pop]}</em>
          </span>
          <div className="stepperControls">
            <button disabled={pops[pop] <= 0} onClick={() => setAmount(pop, pops[pop] - 1)}>
              -
            </button>
            <input
              aria-label={`${formatPopLabel(pop, 2)} to select`}
              min={0}
              max={maxByPop[pop]}
              type="number"
              value={pops[pop]}
              onChange={(event) => setAmount(pop, Number(event.target.value))}
            />
            <button
              disabled={pops[pop] >= maxByPop[pop] || (totalLimit !== undefined && selectedTotal >= totalLimit)}
              onClick={() => setAmount(pop, pops[pop] + 1)}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
