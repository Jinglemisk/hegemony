import type { ReactNode } from "react";
import type { EventTableDefinition, TableRollRecord } from "../../../game/types";
import { presentTableEffect } from "../../../ui/effects";
import { EffectLine } from "../../EffectLine";
import { LacquerDie } from "./LacquerDie";
import { ModalShell } from "./ModalShell";

/**
 * The rows of a dice table — the one render path for table content, shared by the
 * rolling modal below and the compendium's read-only listings. Pass `result: null`
 * for a reference render with no landed row.
 */
export function EventTableRows({
  table,
  result,
}: {
  table: EventTableDefinition;
  result: TableRollRecord | null;
}) {
  return (
    <ol className="eventTableRows">
      {table.rows.map((row) => {
        const landed = result?.tableId === table.id && result.modified === row.roll;

        return (
          <li
            className={landed ? "eventTableRow eventTableRowLanded" : "eventTableRow"}
            key={row.roll}
          >
            <span className="eventTableDie">{row.roll}</span>
            <span className="eventTableRowLabel">{row.label}</span>
            <span className="eventTableRowEffects">
              {row.effects.map((effect, index) => {
                const chip = presentTableEffect(effect);

                return (
                  <em className={`eventTableEffect ${chip.tone}`} key={index}>
                    <EffectLine effect={chip} />
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
 * The one shared surface for every dice table (docs/archive/plans/event-tables.md): six rows,
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
  onDismiss,
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
  const landed = result && result.tableId === table.id ? result : null;
  const landedRow = landed ? table.rows.find((row) => row.roll === landed.modified) : null;
  // The mood is the table's own verdict, read off the row the die found. A wound
  // and a gift are the same dialog with different weather.
  const tone = landedRow?.effects.map((effect) => presentTableEffect(effect).tone) ?? [];
  const ceremony = !landed
    ? "rite"
    : tone.includes("negative") && !tone.includes("positive")
      ? "wound"
      : tone.includes("positive")
        ? "gift"
        : "rite";

  return (
    <ModalShell
      backdropClassName="eventModalBackdrop"
      ceremony={ceremony}
      className="eventTableModal"
      labelledBy="event-table-title"
      onDismiss={onDismiss}
    >
      <header className="eventTableHeader">
        <h2 className="display" id="event-table-title">
          {table.name}
        </h2>
        <p className="body-em">{subtitle ?? table.flavor}</p>
      </header>

      {/* The drama: the die on the left, what it found on the right. Before the
          roll there is nothing to show here, and the table below is the whole
          dialog — which is right, because that is the moment you are reading it. */}
      {landed ? (
        <div className="drama">
          <LacquerDie value={landed.modified} />
          <div className="dramaOutcome">
            <span className="label">The table speaks</span>
            <h3 className="display">{landedRow?.label ?? "The die is cast"}</h3>
            {landed.modifier !== 0 ? (
              <span className="caption num">
                rolled {landed.roll} {landed.modifier > 0 ? "+" : ""}
                {landed.modifier} → {landed.modified}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <EventTableRows table={table} result={result} />

      {landed ? (
        <div className="eventTableOutcome" role="status">
          {landed.outcomes.map((line, index) => (
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
