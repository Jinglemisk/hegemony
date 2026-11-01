import type { EventTableDefinition, TableRollRecord } from "../../../game/types";
import { presentTableEffect } from "../../../ui/effects";
import { EffectLine } from "../../EffectLine";

/**
 * The rows of a dice table — the one render path for table content, shared by the
 * riot sheet and the compendium's read-only listings. Pass `result: null` for a
 * reference render with no landed row.
 *
 * The two registers do NOT share class names. A listing in the Codex is a table
 * of rules and wears `modals.css`; the odds under a rolled die are a ceremony and
 * wear `ceremony.css`. They used to share both sheets, which is why every row in
 * the ceremony carried an identical accent bar and nothing receded when the die
 * landed — the moment the table exists to have a focal point.
 */
export function EventTableRows({
  table,
  result,
  register = "reference",
  reach,
  links = true,
}: {
  table: EventTableDefinition;
  result: TableRollRecord | null;
  register?: "reference" | "ceremony";
  /** The rows a roll can still land on; the others are struck (the riot's insurance). */
  reach?: { lowest: number; highest: number };
  /** Glossary links on the effects; off where a blocking ceremony leaves no codex. */
  links?: boolean;
}) {
  const ceremony = register === "ceremony";
  const landedRoll = result?.tableId === table.id ? result.modified : null;
  const outOfReach = (roll: number) =>
    reach ? roll < reach.lowest || roll > reach.highest : false;

  return (
    <ol className={ceremony ? "oddsRows" : "eventTableRows"}>
      {table.rows.map((row) => {
        const landed = landedRoll === row.roll;
        const passedOver = landedRoll !== null && !landed;

        if (!ceremony) {
          return (
            <li
              className={landed ? "eventTableRow eventTableRowLanded" : "eventTableRow"}
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
          );
        }

        return (
          <li
            className={[
              "oddsRow",
              landed ? "oddsRowHit" : null,
              passedOver ? "oddsRowPast" : null,
              outOfReach(row.roll) ? "oddsRowOut" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            key={row.roll}
          >
            <span className={landed ? "oddsFace stat-lg num" : "oddsFace stat num"}>
              {row.roll}
            </span>
            <span className="oddsLabel body">{row.label}</span>
            <span className="oddsEffects">
              {row.effects.map((effect, index) => {
                const chip = presentTableEffect(effect);

                return (
                  <em className={`oddsEffect stat ${chip.tone}`} key={index}>
                    <EffectLine effect={chip} links={links} />
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
