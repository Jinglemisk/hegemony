import type { CSSProperties } from "react";
import { PLAYER_IDS } from "../../game/data";
import type { IncomeContribution } from "../../game/economy/income";
import type { HegemonyState, PlayerId, Resource, Resources } from "../../game/types";
import { presentYearCard } from "../../ui/effects";
import { RESOURCE_LABELS, toRoman } from "../../ui/formatters";
import { gaugeStops, publicCensus } from "../../ui/frameSelectors";
import type { HappinessDisplay } from "../../ui/frameSelectors";
import { CONSULT, RESOURCE_ICON, sign, tone } from "../../ui/frameFormat";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { settlementNames } from "../../ui/settlementNames";
import { EffectLine } from "../EffectLine";
import { Tooltip } from "../overlays/Tooltip";
import type { ConsultTab } from "../board/types";
import { Ico, Tip, TipLedger, TipWarn } from "./parts";

const PURSE: Resource[] = ["wood", "stone", "food", "gold", "influence"];

/** Pips the gauge has room for; the tooltip prints the true count. */
const MAX_TOKEN_PIPS = 6;

/** The year and its card: the clock at the bar's left end. */
function Clock({ G }: { G: HegemonyState }) {
  const year = G.year;
  const left = G.yearDrawPile.length;
  const totalYears = year + left;
  const card = G.activeYearCard;

  return (
    <div className="clock" data-c="clock">
      <Tooltip
        ariaLabel={`Year ${year} of ${totalYears}`}
        content={
          <Tip sub={`of ${toRoman(totalYears)}`} title={`Year ${toRoman(year)}`}>
            <p className="tip-body">
              A year is one turn for every seat. {left} {left === 1 ? "card is" : "cards are"} left
              in the year deck and the next one is hidden. The game ends when the deck is spent.
            </p>
          </Tip>
        }
        focusable
        triggerClassName="year"
      >
        <span className="year-n">Year {toRoman(year)}</span>
        <span className="year-of">of {toRoman(totalYears)}</span>
      </Tooltip>
      {card ? (
        <Tooltip
          ariaLabel={`This year's card: ${card.name}`}
          content={
            <Tip sub="This year's card" title={card.name}>
              <p className="tip-body">{card.text}</p>
              {card.flavor ? <p className="tip-body">{card.flavor}</p> : null}
            </Tip>
          }
          focusable
          triggerClassName="yearcard"
        >
          <span className="yearcard-name" data-truncates="summary">
            {card.name}
          </span>
          <span className="yearcard-rule" data-truncates="summary">
            <EffectLine effect={presentYearCard(card)} links={false} />
          </span>
        </Tooltip>
      ) : null}
    </div>
  );
}

function ResourceCell({
  resource,
  value,
  delta,
  lines,
}: {
  resource: Resource;
  value: number;
  delta: number;
  lines: Array<{ key: string; label: string; amount: number }>;
}) {
  const short = value + delta < 0;
  const label = RESOURCE_LABELS[resource];

  return (
    <Tooltip
      ariaLabel={`${label} ${value}, ${sign(delta)} next turn${short ? ", short" : ""}`}
      content={
        <Tip sub={`${value} in store · ${sign(delta)} next turn`} title={label}>
          {lines.length > 0 ? (
            <TipLedger
              rows={lines.map((line) => ({
                key: line.key,
                label: line.label,
                value: sign(line.amount),
              }))}
            />
          ) : (
            <p className="tip-body">No income or expense.</p>
          )}
          {short ? <TipWarn>Short next turn</TipWarn> : null}
        </Tip>
      }
      focusable
      triggerClassName={`res${short ? " is-short" : ""}`}
    >
      <Ico path={RESOURCE_ICON[resource]} size="ui" />
      <span className="res-val num">{value}</span>
      <span className={`res-delta ${tone(delta)}`}>{sign(delta)}</span>
    </Tooltip>
  );
}

/**
 * Happiness: the level, a gauge whose bands mark where riot and revolt start, and
 * one pip above the gauge for each Unrest token on the realm.
 */
export function HappinessGauge({ display }: { display: HappinessDisplay }) {
  const stops = gaugeStops(display);
  const atRevolt = display.value <= display.revoltAt;
  const atRiot = display.value <= display.riotAt;
  const noun = "Happiness";
  const tokens = `${display.tokens} Unrest ${display.tokens === 1 ? "token" : "tokens"}`;

  return (
    <Tooltip
      ariaLabel={`${noun} ${sign(display.value)}, ${tokens}; riot at ${sign(display.riotAt)}, revolt at ${sign(display.revoltAt)}`}
      content={
        <Tip
          sub={`Riot at ${sign(display.riotAt)} · revolt at ${sign(display.revoltAt)}`}
          title={`${noun} ${sign(display.value)}`}
        >
          <TipLedger
            rows={[
              ...display.lines.map((line) => ({
                key: line.label,
                label: line.label,
                value: sign(line.amount),
              })),
              { key: "total", label: noun, value: sign(display.value), total: true },
            ]}
          />
          <p className="tip-body">
            Read off the board each turn; nothing is saved up. Unrest tokens stay until a riot, a
            revolt or a card clears them.
          </p>
          {atRevolt ? (
            <TipWarn>Half your slaves leave at your next upkeep</TipWarn>
          ) : atRiot ? (
            <TipWarn>The riot table is rolled at your next upkeep</TipWarn>
          ) : null}
        </Tip>
      }
      focusable
      triggerClassName={`level${atRiot ? " is-riot" : ""}`}
    >
      <Ico path={RESOURCE_ICON.happiness} size="ui" />
      <span className={`res-val num ${tone(display.value)}`}>{sign(display.value)}</span>
      <span
        className="gauge"
        style={
          {
            "--g-value": stops.value,
            "--g-riot": stops.riot,
            "--g-revolt": stops.revolt,
          } as CSSProperties
        }
      >
        {display.tokens > 0 ? (
          <span className="gauge-tokens" data-tokens={display.tokens}>
            {Array.from({ length: Math.min(display.tokens, MAX_TOKEN_PIPS) }, (_, pip) => (
              <i className="gauge-token" key={pip} />
            ))}
          </span>
        ) : null}
      </span>
    </Tooltip>
  );
}

function Rival({
  G,
  id,
  acting,
  viewing,
  onSelect,
}: {
  G: HegemonyState;
  id: PlayerId;
  acting: boolean;
  viewing: boolean;
  onSelect: (id: PlayerId) => void;
}) {
  const glaze = PLAYER_GLAZES[id];
  const census = publicCensus(G, id);
  const status = [acting ? "acting" : null, viewing ? "your seat" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <Tooltip
      content={
        <Tip sub={`${glaze.glaze}${status ? ` · ${status}` : ""}`} title={glaze.name}>
          <TipLedger
            rows={[
              { key: "s", label: "Slaves", value: census.slaves, icon: "pops/slaves" },
              { key: "f", label: "Freemen", value: census.freemen, icon: "pops/freemen" },
              { key: "c", label: "Citizens", value: census.citizens, icon: "pops/citizens" },
              { key: "ci", label: "Cities", value: census.cities, icon: "settlements/city" },
              { key: "co", label: "Colonies", value: census.colonies, icon: "settlements/colony" },
            ]}
          />
        </Tip>
      }
      preferredPlacement="below"
    >
      <button
        aria-label={`${glaze.name}${acting ? ", acting" : ""}${viewing ? ", your seat" : ", take this seat"}`}
        aria-pressed={viewing}
        className={`rival${acting ? " is-acting" : ""}${viewing ? " is-viewing" : ""}`}
        data-c="rival"
        onClick={() => onSelect(id)}
        style={{ "--owner": glaze.color } as CSSProperties}
        type="button"
      >
        <span className={`rival-disc${id === "1" ? " ink-dark" : ""}`}>{glaze.blazon}</span>
      </button>
    </Tooltip>
  );
}

/** Income lines for one resource, merged by where they come from. */
function linesFor(
  resource: Resource,
  breakdown: readonly IncomeContribution[],
  names: Map<string, string>,
) {
  const merged = new Map<string, number>();

  for (const entry of breakdown) {
    if (entry.resource !== resource || entry.amount === 0) continue;
    const label = (entry.settlementId ? names.get(entry.settlementId) : null) ?? entry.source;
    merged.set(label, (merged.get(label) ?? 0) + entry.amount);
  }

  return [...merged].map(([label, amount]) => ({ key: label, label, amount }));
}

export function TopBar({
  G,
  viewerId,
  actingId,
  income,
  breakdown,
  happiness,
  consultOpen,
  onConsult,
  onSeat,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  actingId: PlayerId;
  income: Resources;
  breakdown: readonly IncomeContribution[];
  happiness: HappinessDisplay;
  consultOpen: ConsultTab | null;
  onConsult: (tab: ConsultTab) => void;
  onSeat: (id: PlayerId) => void;
}) {
  const store = G.players[viewerId].resources;
  const names = settlementNames(G.board.tiles);

  return (
    <header className="topbar" data-c="topbar" data-exclude data-gate-flex>
      <Clock G={G} />
      <div className="purse" data-c="purse">
        {PURSE.map((resource) => (
          <ResourceCell
            delta={income[resource]}
            key={resource}
            lines={linesFor(resource, breakdown, names)}
            resource={resource}
            value={store[resource]}
          />
        ))}
        <HappinessGauge display={happiness} />
      </div>
      <div className="court" data-c="court">
        <nav aria-label="Consult" className="consult" data-c="consult">
          {CONSULT.map(({ tab, label, icon, blurb }) => (
            <Tooltip
              content={
                // Once its page is open the icon has said what it is.
                consultOpen === tab ? null : (
                  <Tip sub="Consult" title={label}>
                    <p className="tip-body">{blurb}</p>
                  </Tip>
                )
              }
              key={tab}
            >
              <button
                aria-label={label}
                aria-pressed={consultOpen === tab}
                className={`consult-btn${consultOpen === tab ? " is-on" : ""}`}
                data-c="consult-btn"
                onClick={() => onConsult(tab)}
                type="button"
              >
                <Ico path={icon} size="ui" />
              </button>
            </Tooltip>
          ))}
        </nav>
        <div aria-label="Rulers" className="rivals" data-c="rivals" role="group">
          {PLAYER_IDS.map((id) => (
            <Rival
              G={G}
              acting={id === actingId}
              id={id}
              key={id}
              onSelect={onSeat}
              viewing={id === viewerId}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
