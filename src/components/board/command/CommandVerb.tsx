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
 *
 * The mark is on the PRICE, not on the verb's blocked state. That distinction is
 * the whole of QA-DOCK-2's second half: Calm is always clickable — it is gated on
 * "once per turn", not on money — so keying the mark off "blocked" left its `4 or
 * 6` grey while the player held 1 influence. A figure you cannot pay is marked
 * whether or not the button beside it happens to be dimmed, and each alternative
 * is judged on its own, so `4 or 6` can mark the four and leave the six alone.
 */
function VerbCostSlot({ clauses, context }: { clauses: VerbPriceClause[]; context: VerbContext }) {
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
            // A range is unaffordable only when even its cheap end is out of
            // reach; between the ends some targets are payable and some are not,
            // and oxblood there would be a lie in the other direction.
            <span
              className={`verbCostItem${held[clause.span.resource] < clause.span.min ? " verbCostShort" : ""}`}
            >
              <Icon glyph={RESOURCE_GLYPHS[clause.span.resource]} />
              {clause.span.min === clause.span.max
                ? formatNumber(clause.span.min)
                : `${formatNumber(clause.span.min)}–${formatNumber(clause.span.max)}`}
            </span>
          ) : null}
          {clause.amounts ? <VerbPrice held={held} required={clause.amounts} /> : null}
        </Fragment>
      ))}
    </span>
  );
}

const clauseKey = (clause: VerbPriceClause) =>
  [clause.lead, clause.span?.resource, ...Object.keys(clause.amounts ?? {})].join("-");

function VerbPrice({ required, held }: { required: Partial<Resources>; held: Resources }) {
  return (
    <>
      {RESOURCE_ORDER.filter((resource) => (required[resource] ?? 0) > 0).map((resource) => {
        const amount = required[resource] ?? 0;
        // Only the unaffordable line is lit. Marking every line red when one
        // resource is short would say "you cannot pay for any of this", which is
        // both wrong and the reason the old dimmed-cost row was unreadable.
        const short = held[resource] < amount;

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
  // Armed state is read from the one field that holds it, never re-derived per
  // verb: that is what stopped Grow and Move from arming the map silently.
  const pressed = verb.arms === true && context.armedVerb === verb.id;
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
      aria-pressed={verb.arms ? pressed : undefined}
      className={`railVerb${pressed ? " railVerbArmed" : ""}${enabled ? "" : " railVerbOff"}`}
      onClick={enabled ? () => verb.select(handlers) : undefined}
      type="button"
    >
      {/* The knob is the disc, and it is a separate box from the button on
          purpose: the button is the whole 76px column — disc, name and price —
          while every state the verb has (rest, hover lift, armed clay, dimmed)
          belongs to the round part alone. Styling the button instead is what
          made the pre-disc version a flat highlighted rectangle. */}
      <span className="verbKnob">
        <Icon glyph={VERB_GLYPHS[verb.id]} size="rail" />
      </span>
      <span className="verbLabel verb">{verb.label}</span>
      {verb.cost ? <VerbCostSlot clauses={clauses} context={context} /> : null}
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
