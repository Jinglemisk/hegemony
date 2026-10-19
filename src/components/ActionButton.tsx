import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Resources } from "../game/types";
import { MechanicsDetails } from "./MechanicsDetails";
import { Tooltip } from "./overlays/Tooltip";

/**
 * The one action button. A blocked act stays a focusable button marked
 * `aria-disabled`, its click guarded, and its tooltip says why on hover, focus and
 * first tap. The reason and the effective cost are the engine's status for the act;
 * `explanation` is extra `mechanicsExplanation` paragraphs, and `children` the face.
 */
export function ActionButton({
  enabled,
  heading,
  explanation,
  blockedReason,
  effectiveCost,
  onClick,
  triggerClassName,
  children,
  ...button
}: {
  enabled: boolean;
  heading: ReactNode;
  explanation?: ReactNode;
  blockedReason?: ReactNode;
  effectiveCost?: Partial<Resources>;
  onClick: () => void;
  triggerClassName?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "onClick" | "type">) {
  const reason = enabled ? undefined : blockedReason;
  return (
    <Tooltip
      content={
        // A heading alone repeats the face, so it shows no tooltip and costs no tap.
        reason || explanation || effectiveCost ? (
          <MechanicsDetails blockedReason={reason} effectiveCost={effectiveCost} heading={heading}>
            {explanation}
          </MechanicsDetails>
        ) : null
      }
      triggerClassName={triggerClassName}
    >
      <button
        {...button}
        aria-disabled={enabled ? undefined : true}
        onClick={enabled ? onClick : undefined}
        type="button"
      >
        {children}
      </button>
    </Tooltip>
  );
}
