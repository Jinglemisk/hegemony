import type { ReactNode } from "react";
import type { ResolutionCard } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import { presentDirectiveEffect, presentLawEffect } from "../../../ui/effects";
import { MechanicsDetails } from "../../MechanicsDetails";

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
