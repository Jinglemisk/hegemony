import type { ReactNode } from "react";
import type { EffectPresentation } from "../../../ui/effects";
import { AnnotatedText } from "../../AnnotatedText";
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
  iconSubject = false,
  links = true,
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
  /**
   * The subject names more than the glyph draws (a year card's "Plains food"), so its
   * words take their icons. A lone term beside its own glyph ("Gold") stays bare.
   */
  iconSubject?: boolean;
  /** Glossary links on the condition; off where a blocking ceremony leaves no codex. */
  links?: boolean;
}) {
  const { magnitude, subject, condition } = presentation;

  return (
    <div className={["blow", className].filter(Boolean).join(" ")}>
      {icon}
      {magnitude && subject ? (
        <>
          <span className={`blowFigure num ${figureRole}`}>{magnitude}</span>
          <span className="blowWhat">
            <b className="title">
              {iconSubject ? <AnnotatedText links={false} text={subject} /> : subject}
            </b>
            {condition ? (
              <AnnotatedText className="caption" links={links} text={condition} />
            ) : null}
          </span>
        </>
      ) : (
        <EffectLine className="blowLine body" effect={presentation} links={links} />
      )}
    </div>
  );
}
