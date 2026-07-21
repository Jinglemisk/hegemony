import type { ReactNode } from "react";

/**
 * The Cancel + confirm footer shared by every map popover and the placement popover
 * (post-sprint-debt §5.4). The confirm button's `disabled`/`title` are passed in rather
 * than computed here, because the sites gate on different things — the status-based ones
 * use {@link gameplayActionDisabled}, the move-source and found-colony popovers on their
 * own conditions. Only the chrome is shared.
 */
export function PopoverActions({
  confirmLabel,
  disabled,
  title,
  onCancel,
  onConfirm
}: {
  confirmLabel: ReactNode;
  disabled: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="foundColonyActions">
      <button className="placementCancelButton" onClick={onCancel} type="button">
        Cancel
      </button>
      <button
        className="primaryButton eventResolveButton"
        disabled={disabled}
        onClick={onConfirm}
        title={title}
        type="button"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
