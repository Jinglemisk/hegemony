import type { ReactNode } from "react";
import type { EventTableDefinition, TableEffect, TableRollRecord } from "../../../game/types";
import { presentTableEffect } from "../../../ui/effects";
import { EffectIcon } from "../../../ui/icons/EffectIcon";
import { EffectLine } from "../../EffectLine";
import { ceremonyMood } from "./ceremonyMood";
import { LacquerDie } from "./LacquerDie";
import { ModalShell } from "./ModalShell";

/**
 * What a row with NO effects MEANS on this particular table.
 *
 * `{ type: "none" }` is one engine token wearing two opposite meanings. On the
 * riot table it is mercy — the mob went home. On a venture table the stake was
 * spent to sail, so a row that pays nothing is a TOTAL LOSS, and the engine's
 * own outcome string for it ("No losses.") is then the exact opposite of what
 * just happened to you.
 *
 * The register that knows which one it is, is the caller: a venture modal knows
 * it is a venture. So the venture hands the tablet the truth about its own blank
 * rows and the riot hands it nothing, rather than the shared table trying to
 * guess from a token that cannot carry the difference.
 */
export type BlankRowMeaning = {
  /** The figure the drama carves — built from the stake the engine actually charged. */
  loss: TableEffect;
  /** How a paying-nothing row reads in the odds list, in place of the muted dash. */
  label: string;
  /** The verdict line, replacing the engine's — which is written for the other meaning. */
  verdict: string;
};

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
  blankLabel,
}: {
  table: EventTableDefinition;
  result: TableRollRecord | null;
  register?: "reference" | "ceremony";
  /**
   * What a row that pays nothing says on this table — "Stake lost" on a venture.
   * Words, not a figure: the stake left the purse when the die was funded, so a
   * second `-5` in this column would be the same coin counted twice. Ceremony
   * only; the Codex lists the table's own effects and has no stake in play.
   */
  blankLabel?: string;
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
              {blankLabel && row.effects.every((effect) => effect.type === "none") ? (
                <em className="oddsEffect stat negative">{blankLabel}</em>
              ) : (
                row.effects.map((effect, index) => {
                  const chip = presentTableEffect(effect);

                  return (
                    <em className={`oddsEffect stat ${chip.tone}`} key={index}>
                      <EffectLine effect={chip} />
                    </em>
                  );
                })
              )}
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
  blankRow,
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
   * What a row with no effects costs on THIS table. Omit and a blank row is
   * mercy; pass it and a blank row is the loss it really is. See
   * `BlankRowMeaning` for why the shared tablet cannot work this out alone.
   */
  blankRow?: BlankRowMeaning;
  /**
   * Escape/backdrop route out. Omit for tables the player must resolve — the riot
   * mounts blocking on purpose (Q15), so it passes nothing.
   */
  onDismiss?: () => void;
}) {
  const landed = result && result.tableId === table.id ? result : null;
  const landedRow = landed ? table.rows.find((row) => row.roll === landed.modified) : null;
  // A blank row on a table that charges up front is not an absence of an outcome
  // — it IS the outcome, and it is the number the moment is about. Substituting
  // it here is what gives the tablet its mood, its carved figure and its verb;
  // without it a total loss wore the same clay weather as an unrolled tablet.
  const blankLanded = Boolean(
    blankRow && landedRow && landedRow.effects.every((effect) => effect.type === "none"),
  );
  const rowEffects = blankLanded && blankRow ? [blankRow.loss] : (landedRow?.effects ?? []);
  const landedEffects = rowEffects.map((effect) => presentTableEffect(effect));
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
  const payoffEffect = payoffIndex === -1 ? null : rowEffects[payoffIndex];

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

      <EventTableRows
        blankLabel={blankRow?.label}
        table={table}
        result={result}
        register="ceremony"
      />

      {landed ? (
        <div className="tabletVerdict" role="status">
          {(blankLanded && blankRow ? [blankRow.verdict] : landed.outcomes).map((line, index) => (
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
