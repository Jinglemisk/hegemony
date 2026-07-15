import type { ReactNode } from "react";
import type { EventTableDefinition, TableRollRecord } from "../../../game/types";
import { AnnotatedText } from "../../AnnotatedText";
import { formatTableEffect } from "../events";
import { ModalShell } from "./ModalShell";

/**
 * The rows of a dice table — the one render path for table content, shared by the
 * rolling modal below and the compendium's read-only listings. Pass `result: null`
 * for a reference render with no landed row.
 */
export function EventTableRows({ table, result }: { table: EventTableDefinition; result: TableRollRecord | null }) {
  return (
    <ol className="eventTableRows">
      {table.rows.map((row) => {
        const landed = result?.tableId === table.id && result.modified === row.roll;

        return (
          <li className={landed ? "eventTableRow eventTableRowLanded" : "eventTableRow"} key={row.roll}>
            <span className="eventTableDie">{row.roll}</span>
            <span className="eventTableRowLabel">{row.label}</span>
            <span className="eventTableRowEffects">
              {row.effects.map((effect, index) => {
                const chip = formatTableEffect(effect);

                return (
                  <em className={`eventTableEffect ${chip.tone}`} key={index}>
                    <AnnotatedText text={chip.text} />
                  </em>
                );
              })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

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
  subtitle,
  onDismiss
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
  /**
   * Escape/backdrop route out. Omit for tables the player must resolve — the riot
   * mounts blocking on purpose (Q15), so it passes nothing.
   */
  onDismiss?: () => void;
}) {
  return (
    <ModalShell
      backdropClassName="eventModalBackdrop"
      className="eventTableModal"
      labelledBy="event-table-title"
      onDismiss={onDismiss}
    >
      <header className="eventTableHeader">
        <h2 id="event-table-title">{table.name}</h2>
        <p>{subtitle ?? table.flavor}</p>
      </header>

      <EventTableRows table={table} result={result} />

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
    </ModalShell>
  );
}
