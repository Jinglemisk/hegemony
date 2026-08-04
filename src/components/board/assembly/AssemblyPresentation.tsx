import type { MouseEventHandler, ReactNode } from "react";
import type { ResolutionCard } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { Resources } from "../../../game/types";
import { presentDirectiveEffect, presentLawEffect } from "../../../ui/effects";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";

export function ResolutionDetails({
  card,
  content,
  source,
  duration,
}: {
  card: ResolutionCard;
  content: GameContent;
  source: ReactNode;
  duration: ReactNode;
}) {
  const effects =
    card.kind === "law"
      ? card.effects.map((effect) => presentLawEffect(effect, content))
      : card.effects.map(presentDirectiveEffect);

  return (
    <MechanicsDetails duration={duration} effects={effects} heading={card.name} source={source}>
      <p className="mechanicsExplanation">{card.text}</p>
      {card.kind === "law" ? (
        <p className="assemblyTradeOff">Political trade-off: {card.tradeOff}</p>
      ) : null}
    </MechanicsDetails>
  );
}

export function AssemblyAction({
  enabled,
  className,
  heading,
  explanation,
  blockedReason,
  effectiveCost,
  onClick,
  children,
  preferredPlacement = "above",
  triggerClassName,
}: {
  enabled: boolean;
  className: string;
  heading: ReactNode;
  explanation: ReactNode;
  blockedReason?: ReactNode;
  effectiveCost?: Partial<Resources>;
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  preferredPlacement?: "above" | "below";
  triggerClassName?: string;
}) {
  return (
    <Tooltip
      content={
        <MechanicsDetails
          blockedReason={enabled ? undefined : blockedReason}
          effectiveCost={effectiveCost}
          heading={heading}
        >
          <p className="mechanicsExplanation">{explanation}</p>
        </MechanicsDetails>
      }
      preferredPlacement={preferredPlacement}
      triggerClassName={["assemblyActionTooltipTrigger", triggerClassName]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        aria-disabled={!enabled}
        className={className}
        onClick={enabled ? onClick : undefined}
        type="button"
      >
        {children}
      </button>
    </Tooltip>
  );
}
