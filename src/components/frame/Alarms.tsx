import type { ActiveEffectDescriptor, ActiveEffectMechanic } from "../../game/activeEffects";
import type { UnrestStatus } from "../../game/rules";
import { presentActiveEffect } from "../../ui/effects";
import type { EffectTone } from "../../ui/effects";
import { RESOURCE_ICON } from "../../ui/frameFormat";
import { formatNumber, formatSignedNumber } from "../../ui/formatters";
import { EffectLine } from "../EffectLine";
import { Tooltip } from "../overlays/Tooltip";
import type { GameContent } from "../../game/content";
import { Ico, Tip } from "./parts";

/**
 * The realm's alarms, after a Paradox title's alerts: one disc per standing
 * effect beside the ticker tab, showing the resource it moves, tinted by which
 * way it moves it. The tooltip says what it is and how long it lasts.
 *
 * The season's own modifier is left out (the season card prints it) and so are
 * the standing Laws (the Agora lists them): a disc here is something happening
 * to you now, not the constitution.
 */

const UNREST_ICON: Record<Exclude<UnrestStatus["tier"], "calm">, string> = {
  discontent: "unrest/alarm",
  unrest: "unrest/unrest",
  revolt: "unrest/revolt",
};

const UNREST_WORD: Record<Exclude<UnrestStatus["tier"], "calm">, string> = {
  discontent: "Discontent",
  unrest: "Unrest",
  revolt: "Revolt",
};

function consequenceOf(tier: Exclude<UnrestStatus["tier"], "calm">, popLossThreshold: number) {
  if (tier === "revolt") return "Rolls the severe riot table every turn until happiness recovers.";
  if (tier === "unrest") return "Rolls the riot table every turn until happiness recovers.";
  return `Pops start dying at ${formatNumber(popLossThreshold)} happiness.`;
}

/** The resource a mechanic moves, as the disc's picture. */
function iconOf(mechanic: ActiveEffectMechanic | undefined): string {
  switch (mechanic?.type) {
    case "suppressIncome":
      return "market/income-suppressed";
    case "hunger":
      return RESOURCE_ICON.food;
    case "timedHappiness":
      return RESOURCE_ICON.happiness;
    case "resourceIncome":
      return RESOURCE_ICON[mechanic.resource];
    case "buildingCostMultiplier":
      return mechanic.multiplier > 1 ? "market/cost-up" : "market/cost-down";
    case "actionCostDiscount":
      return "market/cost-down";
    case "equalVotesNextAssembly":
      return "assembly/vote";
    default:
      return "assembly/law";
  }
}

const TONE: Record<EffectTone, string> = {
  positive: "is-up",
  negative: "is-down",
  muted: "",
  neutral: "",
};

const SHOWN = (descriptor: ActiveEffectDescriptor) =>
  descriptor.kind !== "seasonalModifier" && descriptor.kind !== "standingLaw";

export function Alarms({
  effects,
  unrest,
  popLossThreshold,
  content,
}: {
  effects: readonly ActiveEffectDescriptor[];
  unrest: UnrestStatus;
  popLossThreshold: number;
  content: GameContent;
}) {
  const shown = effects.filter(SHOWN);

  const tier = unrest.tier === "calm" ? null : unrest.tier;

  if (shown.length === 0 && !tier) {
    return null;
  }

  return (
    <ul aria-label="Alarms" className="alarms" data-c="alarms" data-exclude>
      {tier ? (
        <li>
          <Tooltip
            ariaLabel={`${UNREST_WORD[tier]}, happiness ${formatNumber(unrest.happiness)}. ${consequenceOf(tier, popLossThreshold)}`}
            content={
              <Tip sub={`happiness ${formatNumber(unrest.happiness)}`} title={UNREST_WORD[tier]}>
                <p className="tip-body">{consequenceOf(tier, popLossThreshold)}</p>
                {unrest.luxuryBonus !== 0 || unrest.calmBonus !== 0 ? (
                  <p className="tip-body">
                    {formatNumber(unrest.storedHappiness)} stored
                    {unrest.luxuryBonus !== 0
                      ? `, ${formatSignedNumber(unrest.luxuryBonus)} from luxuries`
                      : ""}
                    {unrest.calmBonus !== 0
                      ? `, ${formatSignedNumber(unrest.calmBonus)} from calm until your next turn`
                      : ""}
                    .
                  </p>
                ) : null}
              </Tip>
            }
            focusable
            triggerClassName="alarm-disc is-down is-loud"
          >
            <Ico path={UNREST_ICON[tier]} size="ui" />
          </Tooltip>
        </li>
      ) : null}
      {shown.map((descriptor) => {
        const effect = presentActiveEffect(descriptor, content);
        return (
          <li key={descriptor.id}>
            <Tooltip
              ariaLabel={effect.accessibleText}
              content={
                <Tip sub={effect.duration.toLowerCase()} title={effect.source}>
                  <p className="tip-body">
                    <EffectLine effect={effect} links={false} />
                  </p>
                </Tip>
              }
              focusable
              triggerClassName={`alarm-disc ${TONE[effect.tone]}`}
            >
              <Ico path={iconOf(descriptor.mechanics[0])} size="ui" />
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
