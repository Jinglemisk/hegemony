import { useMemo, useState } from "react";
import { presentActiveEffects } from "../ui/effects";
import { EffectLine } from "./EffectLine";
import { MechanicsDetails } from "./MechanicsDetails";
import { useGameUi } from "./board/GameUiContext";
import { Tooltip } from "./overlays/Tooltip";

/**
 * How many slips the ledger shows before it starts counting the rest out loud.
 *
 * The list used to be capped by a `max-height` instead, which is the one thing a
 * ledger may not do: at four effects the box clipped the fourth to a 4px sliver
 * with no scrollbar and no count, so the modifier explaining your gold delta was
 * *gone* while the board's chip still said five. A height cannot know how many
 * rows it swallowed; a count can, so the cap is a count and the remainder is a
 * button that says how many it is holding.
 */
const LEDGER_SLIP_LIMIT = 4;

/**
 * The same active-status projection in two sibling surfaces: a compact board
 * summary with a keyboard-accessible tooltip, and the ledger's full explanation.
 */
export function ActiveEffectsList({ variant }: { variant: "board" | "ledger" }) {
  const { G, activeEffects } = useGameUi();
  const [showAll, setShowAll] = useState(false);
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
  const held = presentations.length - LEDGER_SLIP_LIMIT;
  const shown = showAll || held <= 0 ? presentations : presentations.slice(0, LEDGER_SLIP_LIMIT);

  return (
    <section
      aria-label={"Active effects. " + accessibleSummary}
      className={showAll && held > 0 ? "activeEffectsLedger isOpen" : "activeEffectsLedger"}
    >
      <ActiveEffectRows presentations={shown} />
      {held > 0 ? (
        <button
          aria-expanded={showAll}
          className="activeEffectsMore label"
          onClick={() => setShowAll((open) => !open)}
          type="button"
        >
          {showAll ? "Show fewer" : `+${held} more`}
        </button>
      ) : null}
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
