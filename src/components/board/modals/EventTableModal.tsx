import type { ReactNode } from "react";
import type { EventTableDefinition, TableRollRecord } from "../../../game/types";

/**
 * The one shared surface for every dice table (docs/feat/event-tables.md): six rows,
 * the live modifier, and — after the die — the landed row highlighted with its
 * outcome lines. Riot mounts it blocking with insurance controls in `children`;
 * ventures mount it with the stake picker. No table gets a bespoke modal.
 */
export function EventTableModal({
  table,
  modifier,
  result,
  children,
  footer,
  subtitle
}: {
  table: EventTableDefinition;
  /** Net roll modifier already declared (insurance − tier), shown before the roll. */
  modifier: number;
  /** The landed roll, once it exists — switches the modal into outcome mode. */
  result: TableRollRecord | null;
  /** Table-specific controls (insurance slots, stake picker) rendered above the footer. */
  children?: ReactNode;
  footer: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="modalBackdrop eventModalBackdrop" role="presentation">
      <section className="eventTableModal" role="dialog" aria-modal="true" aria-labelledby="event-table-title">
        <header className="eventTableHeader">
          <h2 id="event-table-title">{table.name}</h2>
          <p>{subtitle ?? table.flavor}</p>
        </header>

        <ol className="eventTableRows">
          {table.rows.map((row) => {
            const landed = result?.tableId === table.id && result.modified === row.roll;

            return (
              <li className={landed ? "eventTableRow eventTableRowLanded" : "eventTableRow"} key={row.roll}>
                <span className="eventTableDie">{row.roll}</span>
                <span className="eventTableRowLabel">{row.label}</span>
              </li>
            );
          })}
        </ol>

        {result && result.tableId === table.id ? (
          <div className="eventTableOutcome" role="status">
            <strong>
              Rolled {result.roll}
              {result.modifier !== 0
                ? ` ${result.modifier > 0 ? "+" : ""}${result.modifier} → ${result.modified}`
                : ""}
            </strong>
            {result.outcomes.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        ) : modifier !== 0 ? (
          <div className="eventTableModifier" role="status">
            Roll modifier: {modifier > 0 ? "+" : ""}
            {modifier}
          </div>
        ) : null}

        {children}

        <footer className="eventTableFooter">{footer}</footer>
      </section>
    </div>
  );
}
