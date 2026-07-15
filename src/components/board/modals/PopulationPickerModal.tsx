import { useState } from "react";
import { clonePops, totalPops } from "../../../game/rules";
import type { Pops } from "../../../game/types";
import { ModalShell } from "./ModalShell";
import { PopulationStepper } from "./PopulationStepper";

/**
 * "Which pops do you place?" — the setup draft's allocator. Takes no game state:
 * the caller already knows the required total, so this stays a pure picker.
 */
function createDefaultSelection(requiredTotal: number): Pops {
  return {
    citizens: requiredTotal > 0 ? 1 : 0,
    freemen: Math.max(0, requiredTotal - 1),
    slaves: 0
  };
}

export function PopulationPickerModal({
  title,
  description,
  requiredTotal,
  initialPops,
  confirmLabel,
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  requiredTotal: number;
  initialPops?: Pops;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (pops: Pops) => void;
}) {
  const [pops, setPops] = useState<Pops>(() =>
    initialPops ? clonePops(initialPops) : createDefaultSelection(requiredTotal)
  );
  const selectedTotal = totalPops(pops);
  const remaining = requiredTotal - selectedTotal;

  return (
    <ModalShell className="populationModal" labelledBy="population-picker-title" onDismiss={onCancel}>
        <div className="modalHeader">
          <div>
            <h2 id="population-picker-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className="iconButton" onClick={onCancel}>
            Close
          </button>
        </div>

        <PopulationStepper
          pops={pops}
          maxByPop={{ citizens: requiredTotal, freemen: requiredTotal, slaves: requiredTotal }}
          onChange={setPops}
          totalLimit={requiredTotal}
        />

        <div className="selectionSummary">
          <span>
            Selected <strong>{selectedTotal}</strong>/<strong>{requiredTotal}</strong>
          </span>
          <span className={remaining === 0 ? "positive" : "negative"}>
            {remaining === 0 ? "Ready" : `${Math.abs(remaining)} ${remaining > 0 ? "left" : "too many"}`}
          </span>
        </div>

        <div className="modalActions">
          <button onClick={onCancel}>Cancel</button>
          <button
            className="primaryButton"
            disabled={remaining !== 0}
            onClick={() => onConfirm(clonePops(pops))}
          >
            {confirmLabel}
          </button>
        </div>
    </ModalShell>
  );
}
