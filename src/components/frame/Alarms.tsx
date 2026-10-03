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
 * The year card's own rule is left out (the year card prints it) and so are
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

function consequenceOf(tier: Exclude<UnrestStatus["tier"], "calm">, riotThreshold: number) {
  if (tier === "revolt")
    return "Half your slaves leave if you end your turn at this level, and your Unrest tokens clear.";
  if (tier === "unrest")
    return "Ending your turn at this level clears your Unrest tokens and starts the riot table.";
  return `A riot starts at ${formatNumber(riotThreshold)} happiness.`;
}

/** The resource a mechanic moves, as the disc's picture. */
function iconOf(mechanic: ActiveEffectMechanic | undefined): string {
  switch (mechanic?.type) {
    case "suppressIncome":
      return "market/income-suppressed";
    case "hunger":
      return RESOURCE_ICON.food;
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
  descriptor.kind !== "yearCard" &&
  descriptor.kind !== "standingLaw" &&
  descriptor.kind !== "standingIdea";

export function Alarms({
  effects,
  unrest,
  riotThreshold,
  content,
}: {
  effects: readonly ActiveEffectDescriptor[];
  unrest: UnrestStatus;
  riotThreshold: number;
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
            ariaLabel={`${UNREST_WORD[tier]}, happiness ${formatNumber(unrest.happiness)}. ${consequenceOf(tier, riotThreshold)}`}
            content={
              <Tip sub={`happiness ${formatNumber(unrest.happiness)}`} title={UNREST_WORD[tier]}>
                <p className="tip-body">{consequenceOf(tier, riotThreshold)}</p>
                {unrest.tokens !== 0 || unrest.calmBonus !== 0 ? (
                  <p className="tip-body">
                    {[
                      unrest.tokens !== 0
                        ? `${formatNumber(unrest.tokens)} Unrest ${unrest.tokens === 1 ? "token" : "tokens"}`
                        : null,
                      unrest.calmBonus !== 0
                        ? `${formatSignedNumber(unrest.calmBonus)} from calm this year`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
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
