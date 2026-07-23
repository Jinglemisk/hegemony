import { AtlasIcon, UiSprite } from "../../Sprites";
import { ResourceChips } from "../ResourceChips";
import { isVerbEnabled, verbTitle } from "./verbs";
import type { VerbContext, VerbCost, VerbHandlers, VerbIcon, VerbSpec } from "./verbs";

/** Split from verbs.tsx (2026-07-22): the verb DATA/logic stays there as a Fast-Refresh-clean
 *  module; the components live here so editing them hot-reloads without invalidating the dock. */

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

/** One verb, as a disc threaded on the bottom spine (ui-refit Step 3): a round
 *  knob with the label and cost hung below it. The bar is `VERBS.map(...)` over
 *  this. Armed verbs (Found / Build arm a map mode) glow clay. */
export function CommandVerb({
  verb,
  context,
  handlers
}: {
  verb: VerbSpec;
  context: VerbContext;
  handlers: VerbHandlers;
}) {
  const pressed = verb.pressed?.(context) ?? false;
  const enabled = isVerbEnabled(verb, context);

  return (
    <button
      aria-pressed={verb.pressed ? pressed : undefined}
      className={`verbDisc${pressed ? " verbDiscArmed" : ""}${enabled ? "" : " verbDiscOff"}`}
      disabled={!enabled}
      onClick={() => verb.select(handlers)}
      title={verbTitle(verb, context)}
    >
      <span className="verbKnob">
        <VerbIconGlyph icon={verb.icon} className={`verbIcon ${verb.iconClassName ?? ""}`.trim()} />
      </span>
      <span className="verbLabel">{verb.label}</span>
      {verb.cost ? <VerbCostSlot cost={verb.cost} context={context} /> : null}
    </button>
  );
}
