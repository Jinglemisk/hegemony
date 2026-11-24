import type { EventTableDefinition, TableRollRecord } from "../../../game/types";
import { presentTableEffect } from "../../../ui/effects";
import { EffectLine } from "../../EffectLine";

/**
 * The rows of a dice table, for the compendium's read-only listings. Pass `result: null`
 * for a reference render with no landed row. The riot itself lays its table out as
 * cards (RiotModal).
 */
export function EventTableRows({
  table,
  result,
}: {
  table: EventTableDefinition;
  result: TableRollRecord | null;
}) {
  const landedRoll = result?.tableId === table.id ? result.modified : null;

  return (
    <ol className="eventTableRows">
      {table.rows.map((row) => (
        <li
          className={
            landedRoll === row.roll ? "eventTableRow eventTableRowLanded" : "eventTableRow"
          }
          key={row.roll}
        >
          <span className="eventTableDie">{row.roll}</span>
          <span className="eventTableRowLabel">{row.label}</span>
          <span className="eventTableRowEffects">
            {row.effects.map((effect, index) => (
              <em className={`eventTableEffect ${presentTableEffect(effect).tone}`} key={index}>
                <EffectLine effect={presentTableEffect(effect)} />
              </em>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}
