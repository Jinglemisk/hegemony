import type { ActiveEffectDescriptor } from "../../game/activeEffects";
import type { RealmAlarm } from "../../game/alarms";
import { VOTE_PAYMENTS } from "../../game/assembly";
import { getLuxuryGood } from "../../game/content";
import type { UnrestStatus } from "../../game/rules";
import type { HegemonyState, PlayerId } from "../../game/types";
import type { VictoryThreat } from "../../game/victory";
import { presentActiveEffect, presentUnrestOutcome } from "../../ui/effects";
import type { EffectTone } from "../../ui/effects";
import { ACTIVE_EFFECT_MECHANIC_RASTERS, UNREST_TIER_RASTERS } from "../../ui/iconRegistry";
import { formatNumber, formatResourceCost, listed, toRoman } from "../../ui/formatters";
import { sign } from "../../ui/frameFormat";
import { settlementNames } from "../../ui/settlementNames";
import { Prose } from "../AnnotatedText";
import { EffectLine } from "../EffectLine";
import { Tooltip } from "../overlays/Tooltip";
import { effectTurns, turnsLeftInYear, turnsUntilYear } from "../../ui/frameSelectors";
import type { HungerShortfall } from "../../ui/frameSelectors";
import { ThreatAlarm, YearDisc } from "./MomentDiscs";
import { OfferDisc } from "./trade/OfferDisc";
import { Ico, Tip, TipBody, Turns } from "./parts";

/**
 * The realm's alarms, after a Paradox title's alerts: one disc per entry of the
 * engine's alarm list (`realmAlarms`), hanging from the bar. A standing effect's disc
 * shows the resource it moves, tinted by which way it moves it; every tooltip says
 * what it is and how long it lasts.
 */

const UNREST_WORD: Record<Exclude<UnrestStatus["tier"], "calm">, string> = {
  discontent: "Discontent",
  unrest: "Unrest",
  revolt: "Revolt",
};

const TONE: Record<EffectTone, string> = {
  positive: "is-up",
  negative: "is-down",
  muted: "",
  neutral: "",
};

export function Alarms({
  G,
  viewerId,
  alarms,
  hunger,
  onOpenYear,
  threatOpen = false,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  alarms: readonly RealmAlarm[];
  /** Food short now: the hunger disc turns loud until the seat covers it. */
  hunger: HungerShortfall | null;
  onOpenYear: () => void;
  threatOpen?: boolean;
}) {
  if (alarms.length === 0) return null;
  return (
    <ul aria-label="Alarms" className="alarms" data-c="alarms" data-exclude>
      {alarms.map((alarm) => {
        switch (alarm.kind) {
          case "victoryThreat":
            return (
              <ThreatAlarm
                G={G}
                defaultOpen={threatOpen}
                key="threat"
                threats={alarm.threats}
                viewerId={viewerId}
              />
            );
          case "oneTitleShort":
            return <OneTitleShortDisc G={G} key="short" seats={alarm.seats} />;
          case "offer":
            return <OfferDisc key={alarm.offer.id} offer={alarm.offer} />;
          case "yearCard":
            return <YearDisc G={G} key="year" onOpen={onOpenYear} viewerId={viewerId} />;
          case "unrest":
            return <UnrestDisc G={G} key="unrest" unrest={alarm.status} viewerId={viewerId} />;
          case "effect":
            return (
              <EffectDisc
                descriptor={alarm.effect}
                G={G}
                hunger={hunger}
                key={alarm.effect.id}
                viewerId={viewerId}
              />
            );
          case "assemblyNextYear":
            return <AssemblyDisc G={G} key="assembly" viewerId={viewerId} year={alarm.year} />;
          case "portClaim":
            return <PortDisc G={G} key="port" sites={alarm.sites} />;
        }
      })}
    </ul>
  );
}

function UnrestDisc({
  G,
  unrest,
  viewerId,
}: {
  G: HegemonyState;
  unrest: UnrestStatus;
  viewerId: PlayerId;
}) {
  const tier = unrest.tier as Exclude<UnrestStatus["tier"], "calm">;
  const { tokens } = unrest.outcome;
  const { warning } = presentUnrestOutcome(G.ruleset, unrest.outcome.tier);
  return (
    <li>
      <Tooltip
        ariaLabel={`${UNREST_WORD[tier]}, happiness ${sign(unrest.happiness)}. ${warning}`}
        content={
          <Tip title={UNREST_WORD[tier]}>
            <TipBody>{warning}</TipBody>
            {tokens !== 0 ? (
              <TipBody>{`${formatNumber(tokens)} Unrest ${tokens === 1 ? "token" : "tokens"}.`}</TipBody>
            ) : null}
            {unrest.calmBonus !== 0 ? (
              <TipBody>
                {`${sign(unrest.calmBonus)} from calm`} <Turns n={turnsLeftInYear(G, viewerId)} />
              </TipBody>
            ) : null}
          </Tip>
        }
        focusable
        triggerClassName="alarm-disc is-down is-loud"
      >
        <Ico path={UNREST_TIER_RASTERS[tier]} size="ui" />
      </Tooltip>
    </li>
  );
}

function EffectDisc({
  G,
  descriptor,
  hunger,
  viewerId,
}: {
  G: HegemonyState;
  descriptor: ActiveEffectDescriptor;
  hunger: HungerShortfall | null;
  viewerId: PlayerId;
}) {
  if (descriptor.kind === "hunger" && hunger) {
    const leaving = hunger.unfed === 1 ? "one pop leaves" : `${hunger.unfed} pops leave`;
    return (
      <li>
        <Tooltip
          ariaLabel={`Hunger: ${hunger.short} food short at turn end. ${leaving} unless you buy food first.`}
          content={
            <Tip title="Hunger">
              <TipBody>
                {`${hunger.short} food short: at turn end ${leaving} unless you buy food first. You choose which.`}
              </TipBody>
              {hunger.fixes.map((fix) => (
                <p className="tip-fix" key={fix}>
                  <Prose links={false}>{fix}</Prose>
                </p>
              ))}
            </Tip>
          }
          focusable
          triggerClassName="alarm-disc is-down is-loud"
        >
          <Ico path="unrest/starvation" size="ui" />
        </Tooltip>
      </li>
    );
  }
  const effect = presentActiveEffect(descriptor, G.ruleset, G.definition.content);
  return (
    <li>
      <Tooltip
        ariaLabel={effect.accessibleText}
        content={
          <Tip title={effect.source} turns={effectTurns(G, viewerId, descriptor)}>
            <TipBody>
              <EffectLine effect={effect} links={false} />
            </TipBody>
          </Tip>
        }
        focusable
        triggerClassName={`alarm-disc ${TONE[effect.tone]}`}
      >
        <Ico
          path={ACTIVE_EFFECT_MECHANIC_RASTERS[descriptor.mechanics[0]?.type ?? "standingLaw"]}
          size="ui"
        />
      </Tooltip>
    </li>
  );
}

/** Rivals one title from the race: quieter than the threat, which is the race itself. */
function OneTitleShortDisc({ G, seats }: { G: HegemonyState; seats: VictoryThreat[] }) {
  const holds = seats.map(
    ({ seat, titles }) =>
      `${G.players[seat].name} holds ${listed(titles.map((title) => title.card.name))}.`,
  );
  const more = "One more title wins at the start of their turn.";
  return (
    <li>
      <Tooltip
        ariaLabel={`One title short: ${holds.join(" ")} ${more}`}
        content={
          <Tip title="One title short">
            {holds.map((line) => (
              <TipBody key={line}>{line}</TipBody>
            ))}
            <TipBody>{more}</TipBody>
          </Tip>
        }
        focusable
        triggerClassName="alarm-disc is-down"
      >
        <Ico path="victory/laurel" size="ui" />
      </Tooltip>
    </li>
  );
}

function AssemblyDisc({
  G,
  viewerId,
  year,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  year: number;
}) {
  const { drawCost, repealCost, briberyCost } = G.ruleset.assembly;
  const save = `Save influence for it: a draw costs ${drawCost} influence, a repeal ${repealCost} influence, a bought vote ${briberyCost} ${VOTE_PAYMENTS.join(" or ")}.`;
  return (
    <li>
      <Tooltip
        ariaLabel={`The Assembly sits next year, in Year ${toRoman(year)}. ${save}`}
        content={
          <Tip title="The Assembly" turns={turnsUntilYear(G, viewerId, year)}>
            <TipBody>{save}</TipBody>
          </Tip>
        }
        focusable
        triggerClassName="alarm-disc"
      >
        <Ico path="assembly/agora" size="ui" />
      </Tooltip>
    </li>
  );
}

/** A free luxury beside a settlement that could raise the Port to claim it. Loud once
 *  the realm can pay for that Port. */
function PortDisc({
  G,
  sites,
}: {
  G: HegemonyState;
  sites: Extract<RealmAlarm, { kind: "portClaim" }>["sites"];
}) {
  const names = settlementNames(G.board.tiles);
  const perGood = G.ruleset.economy.luxury.happinessPerGood;
  const ready = sites.some((site) => site.affordable);
  const lines = sites.map((site) => {
    const goods = site.luxuries
      .map((asset) => getLuxuryGood(G.definition.content, asset.goodId)?.name ?? "a luxury")
      .join(" or ");
    return `A Port at ${names.get(site.settlementId) ?? "your settlement"} claims ${goods} for +${perGood} happiness. It costs ${formatResourceCost(site.cost)}${site.affordable ? "" : ", more than you hold"}.`;
  });
  const title = "A free luxury";
  const state = ready ? "you can build the Port now" : "when you can pay for a Port";
  return (
    <li>
      <Tooltip
        ariaLabel={`${title}, ${state}. ${lines.join(" ")}`}
        content={
          <Tip title={title}>
            {lines.map((line) => (
              <TipBody key={line}>{line}</TipBody>
            ))}
          </Tip>
        }
        focusable
        triggerClassName={`alarm-disc is-up${ready ? " is-loud" : ""}`}
      >
        <Ico path="resources/luxury" size="ui" />
      </Tooltip>
    </li>
  );
}
