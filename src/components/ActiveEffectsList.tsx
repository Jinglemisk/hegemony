import { useMemo } from "react";
import { presentActiveEffects } from "../ui/effects";
import { EffectLine } from "./EffectLine";
import { useGameUi } from "./board/GameUiContext";

/**
 * The same active-status projection in two sibling surfaces: a compact board
 * summary with a keyboard-accessible tooltip, and the ledger's full explanation.
 */
export function ActiveEffectsList({ variant }: { variant: "board" | "ledger" }) {
  const { activeEffects } = useGameUi();
  const presentations = useMemo(() => presentActiveEffects(activeEffects), [activeEffects]);

  if (presentations.length === 0) {
    return null;
  }

  const accessibleSummary = presentations.map((effect) => effect.accessibleText).join(". ");

  if (variant === "board") {
    const first = presentations[0];
    return (
      <section
        aria-label={"Active effects. " + accessibleSummary}
        className="activeEffectsBoard"
        tabIndex={0}
      >
        <span className="activeEffectsCount" aria-hidden="true">
          {presentations.length}
        </span>
        <span className="activeEffectsBoardCopy" aria-hidden="true">
          <strong>Effects</strong>
          <span>{first.source}</span>
        </span>
        <div className="activeEffectsTooltip" role="tooltip">
          <ActiveEffectRows presentations={presentations} />
        </div>
      </section>
    );
  }

  return (
    <section aria-label={"Active effects. " + accessibleSummary} className="activeEffectsLedger">
      <h3>Active effects</h3>
      <ActiveEffectRows presentations={presentations} />
    </section>
  );
}

function ActiveEffectRows({
  presentations,
}: {
  presentations: ReturnType<typeof presentActiveEffects>;
}) {
  return (
    <ul className="activeEffectRows">
      {presentations.map((presentation) => (
        <li
          aria-label={presentation.accessibleText}
          className="activeEffectRow"
          key={presentation.id}
        >
          <strong className="activeEffectSource" aria-hidden="true">
            {presentation.source}
          </strong>
          <EffectLine effect={presentation} className="activeEffectMechanic" />
          <span className="activeEffectDuration" aria-hidden="true">
            {presentation.duration}
          </span>
        </li>
      ))}
    </ul>
  );
}
