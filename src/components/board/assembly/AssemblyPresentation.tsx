import type { ReactNode } from "react";
import { lawCanBeRemoved } from "../../../game/assembly";
import type { ActiveLaw, ResolutionCard } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { Ruleset } from "../../../game/ruleset";
import type { HegemonyState } from "../../../game/types";
import { presentDirectiveEffect, presentLawEffect } from "../../../ui/effects";
import { MechanicsDetails } from "../../MechanicsDetails";

export function ResolutionDetails({
  card,
  content,
  ruleset,
  source,
  duration,
}: {
  card: ResolutionCard;
  content: GameContent;
  ruleset: Ruleset;
  source?: ReactNode;
  duration?: ReactNode;
}) {
  const effects =
    card.kind === "law"
      ? card.effects.map((effect) => presentLawEffect(effect, ruleset, content))
      : card.effects.map(presentDirectiveEffect);

  return (
    <MechanicsDetails duration={duration} effects={effects} heading={card.name} source={source}>
      <p className="mechanicsExplanation">{card.text}</p>
    </MechanicsDetails>
  );
}

/** A standing Law: what it does, the seat that carried it, and how long it is safe. */
export function StandingLawDetails({
  G,
  card,
  law,
}: {
  G: HegemonyState;
  card: ResolutionCard;
  law: ActiveLaw;
}) {
  return (
    <ResolutionDetails
      card={card}
      content={G.definition.content}
      duration={
        lawCanBeRemoved(G, law.cardId) ? "Until repealed" : "Protected through the next sitting"
      }
      ruleset={G.ruleset}
      source={G.players[law.author].name}
    />
  );
}
