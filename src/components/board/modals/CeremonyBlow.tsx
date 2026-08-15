import type { ReactNode } from "react";
import type { EffectPresentation } from "../../../ui/effects";
import { EffectLine } from "../../EffectLine";

/**
 * The blow — what a ceremony does to you, in one band across the surface's waist.
 *
 * Three ranks, and the order is the whole point: the effect's glyph, then the
 * carved numeral, then the subject over its condition. A player should be able
 * to read the figure from across the room and the condition only if they lean in.
 *
 * When the presenter has no single number to carve — two effects joined, a
 * multiplier, a choice — the band falls back to the flat sentence rather than
 * inventing a figure. That fallback is the reason `text` never went away.
 */
export function CeremonyBlow({
  presentation,
  icon,
  className,
  figureRole = "stat-lg stat-hero",
}: {
  presentation: EffectPresentation;
  icon?: ReactNode;
  /** `blowBand` for the full-bleed waist band; a choice row passes its own. */
  className?: string;
  /**
   * Which type role carves the figure. Only two are ever right: the hero size
   * when the band IS the scene, one step down when the same three ranks are
   * being used to label one of several options.
   */
  figureRole?: "stat-lg stat-hero" | "stat-lg";
}) {
  const { magnitude, subject, condition } = presentation;

  return (
    <div className={["blow", className].filter(Boolean).join(" ")}>
      {icon}
      {magnitude && subject ? (
        <>
          <span className={`blowFigure num ${figureRole}`}>{magnitude}</span>
          <span className="blowWhat">
            <b className="title">{subject}</b>
            {condition ? <span className="caption">{condition}</span> : null}
          </span>
        </>
      ) : (
        <EffectLine className="blowLine body" effect={presentation} />
      )}
    </div>
  );
}

const SPELLED = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/**
 * How long it stands, as bars rather than a clause. Duration was already in the
 * data (`timedHappinessDelta.turns`) and was being dissolved into prose; a row
 * of clay bars at falling opacity is countable at a glance, which "for 3 turns"
 * is not.
 */
export function DurationStrip({ turns }: { turns: number }) {
  return (
    <div className="turnStrip">
      {Array.from({ length: turns }, (_, index) => (
        <i aria-hidden="true" className="turnBar" key={index} />
      ))}
      <span className="turnCaption caption">
        {SPELLED[turns] ?? turns} {turns === 1 ? "turn" : "turns"}
      </span>
    </div>
  );
}
