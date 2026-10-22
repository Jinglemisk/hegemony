import type { ReactNode } from "react";
import type { Resources } from "../../../game/types";
import { Chips } from "../../frame/parts";
import { ModalShell } from "./ModalShell";

export function PlacementModalShell({
  title,
  labelledBy,
  confirmLabel,
  canConfirm,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  labelledBy: string;
  confirmLabel: string;
  canConfirm: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <ModalShell
      backdropClassName="eventModalBackdrop placementModalBackdrop"
      className="placementCardReveal"
      labelledBy={labelledBy}
      onDismiss={onCancel}
    >
      <div className="placementCardSurface">
        <div className="eventCardCrest">
          <b id={labelledBy}>{title}</b>
        </div>

        <div className="placementCardBody">{children}</div>

        <div className="placementCardFooter">
          <button className="placementCancelButton" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="primaryButton eventResolveButton"
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

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
