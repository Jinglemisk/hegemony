import type { ReactNode } from "react";
import { lawCanBeRemoved } from "../../../game/assembly";
import type { ActiveLaw, ResolutionCard } from "../../../game/assembly";
import type { GameContent } from "../../../game/content";
import type { Ruleset } from "../../../game/ruleset";
import type { HegemonyState } from "../../../game/types";
import { presentDirectiveEffect, presentLawEffect } from "../../../ui/effects";
import { Prose } from "../../AnnotatedText";
import { MechanicsDetails } from "../../MechanicsDetails";

export function ResolutionDetails({
  card,
  content,
  ruleset,
  children,
}: {
  card: ResolutionCard;
  content: GameContent;
  ruleset: Ruleset;
  children?: ReactNode;
}) {
  const effects =
    card.kind === "law"
      ? card.effects.map((effect) => presentLawEffect(effect, ruleset, content))
      : card.effects.map(presentDirectiveEffect);

  return (
    <MechanicsDetails effects={effects} heading={card.name}>
      <p className="mechanicsExplanation">
        <Prose links={false}>{card.text}</Prose>
      </p>
      {children}
    </MechanicsDetails>
  );
}

/** A standing Law: what it does, and whether it is safe from repeal. Its author and
 *  year stand beside it wherever it is shown. */
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
    <ResolutionDetails card={card} content={G.definition.content} ruleset={G.ruleset}>
      {lawCanBeRemoved(G, law.cardId) ? null : (
        <p className="mechanicsExplanation">
          <Prose links={false}>Protected: no repeal through the next sitting.</Prose>
        </p>
      )}
    </ResolutionDetails>
  );
}
