import { Fragment } from "react";
import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { RESOURCE_GLYPHS, VERB_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { formatNumber } from "../../../ui/formatters";
import type { Resources } from "../../../game/types";
import { isVerbEnabled, verbTitle } from "./verbs";
import type { VerbContext, VerbHandlers, VerbPriceClause, VerbSpec } from "./verbs";

/**
 * One verb on the bottom rail: glyph, name, price.
 *
 * The blocked state is the interesting part. A greyed-out button that tells you
 * nothing until you hover is the worst version of this control, so a blocked verb
 * dims to 38% — far enough that it reads as unavailable at a glance — **except**
 * the part of its price you cannot pay, which stays at full opacity in `--neg`.
 * The answer to "why can't I?" is therefore already on screen, in the one place
 * the eye is going anyway. The sentence is still in the tooltip for the detail.
 */
function VerbCostSlot({
  clauses,
  context,
  blocked,
}: {
  clauses: VerbPriceClause[];
  context: VerbContext;
  blocked: boolean;
}) {
  const held = context.G.players[context.playerID].resources;

  return (
    <span className="verbCost caption num">
      {clauses.map((clause, index) => (
        <Fragment key={clauseKey(clause)}>
          {/* Several clauses are ALTERNATIVES, never a total: Calm takes the
              influence or the gold, and the joiner has to say so. */}
          {index > 0 ? <em>or</em> : null}
          {clause.lead ? <em>{clause.lead}</em> : null}
          {clause.span ? (
            <span className="verbCostItem">
              <Icon glyph={RESOURCE_GLYPHS[clause.span.resource]} />
              {clause.span.min === clause.span.max
                ? formatNumber(clause.span.min)
                : `${formatNumber(clause.span.min)}–${formatNumber(clause.span.max)}`}
            </span>
          ) : null}
          {clause.amounts ? (
            <VerbPrice held={held} required={clause.amounts} showShortfall={blocked} />
          ) : null}
        </Fragment>
      ))}
    </span>
  );
}

const clauseKey = (clause: VerbPriceClause) =>
  [clause.lead, clause.span?.resource, ...Object.keys(clause.amounts ?? {})].join("-");

function VerbPrice({
  required,
  held,
  showShortfall,
}: {
  required: Partial<Resources>;
  held: Resources;
  showShortfall: boolean;
}) {
  return (
    <>
      {RESOURCE_ORDER.filter((resource) => (required[resource] ?? 0) > 0).map((resource) => {
        const amount = required[resource] ?? 0;
        // Only the unaffordable line is lit. Marking every line red when one
        // resource is short would say "you cannot pay for any of this", which is
        // both wrong and the reason the old dimmed-cost row was unreadable.
        const short = showShortfall && held[resource] < amount;

        return (
          <span className={`verbCostItem${short ? " verbCostShort" : ""}`} key={resource}>
            <Icon glyph={RESOURCE_GLYPHS[resource]} />
            {formatNumber(amount)}
          </span>
        );
      })}
    </>
  );
}

export function CommandVerb({
  verb,
  context,
  handlers,
}: {
  verb: VerbSpec;
  context: VerbContext;
  handlers: VerbHandlers;
}) {
  const pressed = verb.pressed?.(context) ?? false;
  const enabled = isVerbEnabled(verb, context);
  const explanation = verbTitle(verb, context);
  const clauses = verb.cost?.(context) ?? [];
  // "Effective cost" is a single exact figure. A floor, a range or a pair of
  // alternatives is none of those, so those verbs simply do not fill that slot
  // rather than filling it with something that reads as the price.
  const effectiveCost =
    clauses.length === 1 && !clauses[0].lead && !clauses[0].span ? clauses[0].amounts : undefined;

  const button = (
    <button
      aria-disabled={!enabled}
      aria-pressed={verb.pressed ? pressed : undefined}
      className={`railVerb${pressed ? " railVerbArmed" : ""}${enabled ? "" : " railVerbOff"}`}
      onClick={enabled ? () => verb.select(handlers) : undefined}
      type="button"
    >
      <Icon glyph={VERB_GLYPHS[verb.id]} size="verb" />
      <span className="verbLabel verb">{verb.label}</span>
      {verb.cost ? <VerbCostSlot blocked={!enabled} clauses={clauses} context={context} /> : null}
    </button>
  );

  // TGT-1. An ARMED verb's popover repeats what the map's own placement caption
  // already says, lands on top of it at 89% overlap at every width, and cuts the
  // caption mid-word. Of the two, the caption is the one in the right place: it
  // is the mode's persistent instruction, it carries role="status", and it sits
  // over the map the instruction is about. The popover is a hover explanation
  // for a verb you are still CONSIDERING — once the mode is armed the verb has
  // been chosen and the popover has nothing left to say, so it stands down.
  if (pressed) {
    return button;
  }

  return (
    <Tooltip
      content={
        <MechanicsDetails
          blockedReason={enabled ? undefined : explanation}
          effectiveCost={effectiveCost}
          heading={verb.label}
        >
          {enabled ? <p className="mechanicsExplanation">{explanation}</p> : null}
        </MechanicsDetails>
      }
      preferredPlacement="above"
      triggerClassName="verbTooltipTrigger"
    >
      {button}
    </Tooltip>
  );
}
