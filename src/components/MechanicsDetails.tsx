import type { ReactNode } from "react";
import type { Resources } from "../game/types";
import type { EffectPresentation } from "../ui/effects";
import { EffectLine } from "./EffectLine";
import { ResourceChips } from "./board/ResourceChips";

/** Standard slots shared by gameplay explanations in tooltips and popovers. */
export function MechanicsDetails({
  heading,
  effects = [],
  effectiveCost,
  source,
  duration,
  blockedReason,
  children,
  className,
}: {
  heading?: ReactNode;
  effects?: readonly EffectPresentation[];
  effectiveCost?: Partial<Resources>;
  source?: ReactNode;
  duration?: ReactNode;
  blockedReason?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={["mechanicsDetails", className].filter(Boolean).join(" ")}>
      {heading ? <strong className="mechanicsHeading">{heading}</strong> : null}
      {effects.length > 0 ? (
        <ul className="mechanicsEffectRows" aria-label="Effects">
          {effects.map((effect, index) => (
            <li key={`${effect.text}-${index}`}>
              <EffectLine effect={effect} links={false} />
            </li>
          ))}
        </ul>
      ) : null}
      {effectiveCost ? (
        <div className="mechanicsSlot mechanicsCost">
          <span>Effective cost</span>
          <ResourceChips resources={effectiveCost} variant="cost" empty={<b>Free</b>} />
        </div>
      ) : null}
      {children}
      {source ? (
        <div className="mechanicsSlot mechanicsSource">
          <span>Source</span>
          <b>{source}</b>
        </div>
      ) : null}
      {duration ? (
        <div className="mechanicsSlot mechanicsDuration">
          <span>Duration</span>
          <b>{duration}</b>
        </div>
      ) : null}
      {blockedReason ? (
        <p className="mechanicsBlockedReason">
          <strong>Blocked</strong>
          <span>{blockedReason}</span>
        </p>
      ) : null}
    </section>
  );
}
