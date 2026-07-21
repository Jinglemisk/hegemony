import type { ReactNode } from "react";

/**
 * The shared title row for the two floating ledger cards — the act-side EmpireIntel and
 * the consult-side ConsultPanel. A page icon, the page title, and a close button: both
 * cards are titled by the page they show, not by the furniture (post-sprint-debt §5.5).
 */
export function LedgerPanelHeader({
  title,
  icon,
  onClose
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="panelTitle ledgerCardTitle">
      <span className="titleIcon" aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      <button
        className="ledgerCloseButton"
        onClick={onClose}
        aria-label={`Close the ${title} page`}
        title="Close"
        type="button"
      >
        ×
      </button>
    </div>
  );
}
