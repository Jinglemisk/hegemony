import { useMemo } from "react";
import { presentActiveEffects } from "../ui/effects";
import { EffectLine } from "./EffectLine";
import { MechanicsDetails } from "./MechanicsDetails";
import { useGameUi } from "./board/GameUiContext";
import { Tooltip } from "./overlays/Tooltip";

/**
 * The same active-status projection in two sibling surfaces: a compact board
 * summary with a keyboard-accessible tooltip, and the ledger's full explanation.
 */
export function ActiveEffectsList({ variant }: { variant: "board" | "ledger" }) {
  const { G, activeEffects } = useGameUi();
  const presentations = useMemo(
    () => presentActiveEffects(activeEffects, G.definition.content),
    [G.definition.content, activeEffects],
  );

  if (presentations.length === 0) {
    return null;
  }

  const accessibleSummary = presentations.map((effect) => effect.accessibleText).join(". ");

  if (variant === "board") {
    const first = presentations[0];
    return (
      <Tooltip
        ariaLabel={"Active effects. " + accessibleSummary}
        content={
          <MechanicsDetails heading="Active effects">
            <ActiveEffectRows links={false} presentations={presentations} />
          </MechanicsDetails>
        }
        focusable
        triggerClassName="activeEffectsBoard"
        tooltipClassName="activeEffectsTooltip"
      >
        <span className="activeEffectsCount" aria-hidden="true">
          {presentations.length}
        </span>
        <span className="activeEffectsBoardCopy" aria-hidden="true">
          <strong>Effects</strong>
          <span>{first.source}</span>
        </span>
      </Tooltip>
    );
  }

  // No heading and no box: on the ledger each effect is a slip — a tone-coloured
  // left rule, what it is, and how long it lasts. A titled ochre panel around
  // them made a container out of what is really two or three short lines.
  return (
    <section aria-label={"Active effects. " + accessibleSummary} className="activeEffectsLedger">
      <ActiveEffectRows presentations={presentations} />
    </section>
  );
}

function ActiveEffectRows({
  presentations,
  links = true,
}: {
  presentations: ReturnType<typeof presentActiveEffects>;
  links?: boolean;
}) {
  return (
    <ul className="activeEffectRows">
      {presentations.map((presentation) => (
        <li
          aria-label={presentation.accessibleText}
          className={`activeEffectRow tone-${presentation.tone}`}
          key={presentation.id}
        >
          <strong className="activeEffectSource label" aria-hidden="true">
            {presentation.source}
          </strong>
          <span className="activeEffectBody caption" aria-hidden="true">
            <EffectLine effect={presentation} className="activeEffectMechanic" links={links} />
            {/* The clause the showcase trails the line with, not a third stacked
                row: how long this lasts is part of the same sentence. */}
            <span className="activeEffectDuration"> · {presentation.duration.toLowerCase()}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
