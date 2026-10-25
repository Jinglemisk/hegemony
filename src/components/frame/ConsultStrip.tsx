import { CONSULT } from "../../ui/frameFormat";
import type { ConsultTab } from "../board/types";
import { Ico } from "./parts";

/** A tab hanging from the bar's right end, naming the consult pages. A page drops down
 *  out of it; pressing its name again closes it. */
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
          type="button"
        >
          <Ico path={icon} size="chip" />
          {label}
        </button>
      ))}
    </nav>
  );
}
