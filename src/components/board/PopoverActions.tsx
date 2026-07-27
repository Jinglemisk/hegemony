import type { ReactNode } from "react";
import { MechanicsDetails } from "../MechanicsDetails";
import { Tooltip } from "../overlays/Tooltip";

/** Cancel + confirm footer shared by map and placement popovers. */
export function PopoverActions({
  confirmLabel,
  disabled,
  title,
  onCancel,
  onConfirm,
}: {
  confirmLabel: ReactNode;
  disabled: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reason =
    title ?? (disabled ? "Choose a valid option before confirming." : "Ready to confirm.");
  const confirmButton = (
    <button
      className="primaryButton eventResolveButton"
      disabled={disabled}
      onClick={onConfirm}
      type="button"
    >
      {confirmLabel}
    </button>
  );

  return (
    <div className="foundColonyActions">
      <button className="placementCancelButton" onClick={onCancel} type="button">
        Cancel
      </button>
      <Tooltip
        ariaLabel={`${typeof confirmLabel === "string" ? confirmLabel : "Confirm"}. ${reason}`}
        content={
          <MechanicsDetails blockedReason={disabled ? reason : undefined} heading={confirmLabel}>
            {!disabled ? <p className="mechanicsExplanation">{reason}</p> : null}
          </MechanicsDetails>
        }
        disabled={disabled}
        preferredPlacement="above"
        triggerClassName="popoverActionTooltipTrigger"
      >
        {confirmButton}
      </Tooltip>
    </div>
  );
}
