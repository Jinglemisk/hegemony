import { MechanicsDetails } from "../../MechanicsDetails";
import { AtlasIcon, UiSprite } from "../../Sprites";
import { Tooltip } from "../../overlays/Tooltip";
import { ResourceChips } from "../ResourceChips";
import { isVerbEnabled, verbTitle } from "./verbs";
import type { VerbContext, VerbCost, VerbHandlers, VerbIcon, VerbSpec } from "./verbs";

/** Split from verbs.tsx so editing components remains Fast-Refresh-safe. */
function VerbIconGlyph({ icon, className }: { icon: VerbIcon; className: string }) {
  return icon.kind === "ui" ? (
    <UiSprite item={icon.item} className={className} />
  ) : (
    <AtlasIcon icon={icon.icon} className={className} />
  );
}

function VerbCostSlot({ cost, context }: { cost: VerbCost; context: VerbContext }) {
  return (
    <span className="verbCost">
      {cost.lead ? <em>{cost.lead}</em> : null}
      {cost.cost ? (
        <ResourceChips
          resources={cost.cost(context)}
          variant="cost"
          chipClassName="verbCostItem"
          iconClassName="verbCostIcon"
        />
      ) : null}
    </span>
  );
}

/** One command-disc action with a keyboard/touch reachable explanation. */
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
        className={`verbDisc${pressed ? " verbDiscArmed" : ""}${enabled ? "" : " verbDiscOff"}`}
        onClick={enabled ? () => verb.select(handlers) : undefined}
        type="button"
      >
        <span className="verbKnob">
          <VerbIconGlyph
            icon={verb.icon}
            className={`verbIcon ${verb.iconClassName ?? ""}`.trim()}
          />
        </span>
        <span className="verbLabel">{verb.label}</span>
        {verb.cost ? <VerbCostSlot cost={verb.cost} context={context} /> : null}
      </button>
    </Tooltip>
  );
}
