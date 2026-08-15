import type { ReactNode } from "react";
import type { EventTableDefinition, TableRollRecord } from "../../../game/types";
import { presentTableEffect } from "../../../ui/effects";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { EffectLine } from "../../EffectLine";
import { ceremonyMood } from "./ceremonyMood";
import { LacquerDie } from "./LacquerDie";
import { ModalShell } from "./ModalShell";

/**
 * The rows of a dice table — the one render path for table content, shared by the
 * rolling modal below and the compendium's read-only listings. Pass `result: null`
 * for a reference render with no landed row.
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
}: {
  table: EventTableDefinition;
  result: TableRollRecord | null;
  register?: "reference" | "ceremony";
}) {
  const ceremony = register === "ceremony";
  const landedRoll = result?.tableId === table.id ? result.modified : null;

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
            className={["oddsRow", landed ? "oddsRowHit" : null, passedOver ? "oddsRowPast" : null]
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
 *
 * It is a TABLET, not a card: a fate is dealt to you and wears a lit mood ring; a
 * venture is a slab you read and lay back down, so it takes bone, chamfered top
 * corners and a carved bottom edge instead. The app used to generalise the card's
 * treatment over both.
 */
export function EventTableModal({
  table,
  modifier,
  result,
  children,
  footer,
  subtitle,
  kicker,
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
   * The line above the title, and the one thing on the tablet that must survive
   * the roll — what was staked. It used to live only in the picker buttons, which
   * unmount the instant the die flips, so after the roll what you risked was gone.
   */
  kicker?: ReactNode;
  /**
   * Escape/backdrop route out. Omit for tables the player must resolve — the riot
   * mounts blocking on purpose (Q15), so it passes nothing.
   */
  onDismiss?: () => void;
}) {
  const landed = result && result.tableId === table.id ? result : null;
  const landedRow = landed ? table.rows.find((row) => row.roll === landed.modified) : null;
  const landedEffects = landedRow?.effects.map((effect) => presentTableEffect(effect)) ?? [];
  // The mood is the table's own verdict, read off the row the die found. A wound
  // and a gift are the same dialog with different weather.
  const tone = landedEffects.map((effect) => effect.tone);
  const mood = !landed
    ? "rite"
    : ceremonyMood(
        tone.includes("negative") && !tone.includes("positive")
          ? "negative"
          : tone.includes("positive")
            ? "positive"
            : "neutral",
      );
  // The figure the whole dialog is about. Before the split this rendered as a
  // 12.5px sentence beside a die the size of a fist.
  const payoffIndex = landedEffects.findIndex((effect) => effect.magnitude);
  const payoff = payoffIndex === -1 ? null : landedEffects[payoffIndex];
  const payoffEffect = payoffIndex === -1 ? null : landedRow?.effects[payoffIndex];

  return (
    <ModalShell
      backdropClassName="tabletScrim"
      ceremony={mood}
      className="ceremonyTablet"
      labelledBy="event-table-title"
      onDismiss={onDismiss}
    >
      <header className="tabletHead">
        {kicker ? <span className="tabletKicker label">{kicker}</span> : null}
        <h2 className="display" id="event-table-title">
          {table.name}
        </h2>
        <p className="tabletVoice body-em">{subtitle ?? table.flavor}</p>
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
            {payoff ? (
              <span className={`dramaGain stat-lg stat-hero num ${payoff.tone}`}>
                {payoff.magnitude}
                {payoffEffect ? (
                  <EffectIcon effect={payoffEffect} family="table" size="rail" />
                ) : null}
              </span>
            ) : null}
            {landed.modifier !== 0 ? (
              <span className="caption num">
                rolled {landed.roll} {landed.modifier > 0 ? "+" : ""}
                {landed.modifier} → {landed.modified}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <EventTableRows table={table} result={result} register="ceremony" />

      {landed ? (
        <div className="tabletVerdict" role="status">
          {landed.outcomes.map((line, index) => (
            <span className="body-sm body" key={index}>
              {line}
            </span>
          ))}
        </div>
      ) : modifier !== 0 ? (
        <div className="tabletVerdict" role="status">
          <span className="body-sm body">
            Roll modifier: {modifier > 0 ? "+" : ""}
            {modifier}
          </span>
        </div>
      ) : null}

      {children}

      <footer className="tabletFoot">{footer}</footer>
    </ModalShell>
  );
}
