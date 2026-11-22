import type { ReactNode } from "react";
import type { Resources } from "../../../game/types";
import { Chips } from "../../frame/parts";

export function CostRow({ cost, note }: { cost: Partial<Resources>; note?: ReactNode }) {
  return (
    <div className="placementCostRow">
      <span className="placementSectionLabel">Cost</span>
      <Chips
        amounts={cost}
        empty={
          <span className="placementCostChips">
            <em>Free</em>
          </span>
        }
      />
      {note ? <span className="placementCostNote">{note}</span> : null}
    </div>
  );
}
