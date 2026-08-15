import { MechanicsDetails } from "../../MechanicsDetails";
import { Tooltip } from "../../overlays/Tooltip";
import { RESOURCE_GLYPHS, VERB_GLYPHS } from "../../../ui/iconRegistry";
import { Icon } from "../../../ui/icons/Icon";
import { RESOURCE_ORDER } from "../../../ui/resourceVisuals";
import { formatNumber } from "../../../ui/formatters";
import type { Resources } from "../../../game/types";
import { isVerbEnabled, verbTitle } from "./verbs";
import type { VerbContext, VerbCost, VerbHandlers, VerbSpec } from "./verbs";

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
  cost,
  context,
  blocked,
}: {
  cost: VerbCost;
  context: VerbContext;
  blocked: boolean;
}) {
  const required = cost.cost?.(context);
  const held = context.G.players[context.playerID].resources;

  return (
    <span className="verbCost caption num">
      {cost.lead ? <em>{cost.lead}</em> : null}
      {required ? <VerbPrice held={held} required={required} showShortfall={blocked} /> : null}
    </span>
  );
}

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
  const effectiveCost = verb.cost?.cost?.(context);

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
      <button
        aria-disabled={!enabled}
        aria-pressed={verb.pressed ? pressed : undefined}
        className={`railVerb${pressed ? " railVerbArmed" : ""}${enabled ? "" : " railVerbOff"}`}
        onClick={enabled ? () => verb.select(handlers) : undefined}
        type="button"
      >
        <Icon glyph={VERB_GLYPHS[verb.id]} size="verb" />
        <span className="verbLabel verb">{verb.label}</span>
        {verb.cost ? <VerbCostSlot cost={verb.cost} context={context} blocked={!enabled} /> : null}
      </button>
    </Tooltip>
  );
}
