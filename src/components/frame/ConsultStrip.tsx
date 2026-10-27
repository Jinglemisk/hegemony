import { CONSULT } from "../../ui/frameFormat";
import type { ConsultTab } from "../board/types";
import { Ico } from "./parts";

/** The consult pages' names at the bar's right end. A page drops down under them;
 *  pressing its name again closes it. */
export function ConsultStrip({
  open,
  onConsult,
  onClose,
}: {
  open: ConsultTab | null;
  onConsult: (tab: ConsultTab) => void;
  onClose: () => void;
}) {
  return (
    <nav
      aria-label="Consult"
      className={`consult-strip${open ? " is-open" : ""}`}
      data-c="consult"
      data-exclude
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      {CONSULT.map(({ tab, label, icon }) => (
        <button
          aria-label={label}
          aria-pressed={open === tab}
          className={`consult-btn${open === tab ? " is-on" : ""}`}
          data-c="consult-btn"
          key={tab}
          onClick={() => onConsult(tab)}
          title={label}
          type="button"
        >
          <Ico path={icon} size="ui" />
          <span className="consult-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
