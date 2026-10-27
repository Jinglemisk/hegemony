import type { CSSProperties, ReactNode } from "react";
import { unrestOutcome } from "../../game/unrest";
import type { UnrestOutcome } from "../../game/unrest";
import { lastYear } from "../../game/year";
import type { IncomeContribution } from "../../game/economy/income";
import type { Ruleset } from "../../game/ruleset";
import { getOwnedSettlement, popsInTransit } from "../../game/rules";
import type { HegemonyState, PlayerId, PopType, Resource, Resources } from "../../game/types";
import { presentUnrestOutcome } from "../../ui/effects";
import { RESOURCE_LABELS, toRoman } from "../../ui/formatters";
import { gaugeStops } from "../../ui/frameSelectors";
import type { HappinessDisplay } from "../../ui/frameSelectors";
import { sign, tone } from "../../ui/frameFormat";
import { POP_RASTERS, RESOURCE_RASTERS } from "../../ui/iconRegistry";
import { settlementNames } from "../../ui/settlementNames";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip, TipBody, TipLedger, TipWarn, Turns } from "./parts";

const PURSE: Resource[] = ["wood", "stone", "food", "gold", "influence"];
const PEOPLE: Array<{ pop: PopType; label: string }> = [
  { pop: "citizens", label: "Citizens" },
  { pop: "freemen", label: "Freemen" },
  { pop: "slaves", label: "Slaves" },
];

/** Pips the gauge has room for; the tooltip prints the true count. */
const MAX_TOKEN_PIPS = 6;

/** The year and the years left: the clock at the bar's left end. The year's card
 *  itself leads the alarms row. */
function Clock({ G }: { G: HegemonyState }) {
  const year = G.year;
  const totalYears = lastYear(G);
  const left = totalYears - year;

  return (
    <div className="clock" data-c="clock">
      <Tooltip
        ariaLabel={`Year ${year} of ${totalYears}, ${left} ${left === 1 ? "year" : "years"} left`}
        content={
          <Tip title={`Year ${toRoman(year)}`}>
            <TipBody>
              {`A year is one turn for every seat, and each turns a card from the year deck; the next card is hidden. ${left} ${left === 1 ? "year follows" : "years follow"} this one, then the game ends.`}
            </TipBody>
          </Tip>
        }
        focusable
        triggerClassName="year"
      >
        <span className="year-n">Year {toRoman(year)}</span>
        <span className="caps">of {toRoman(totalYears)}</span>
        <span className="year-left">
          <Ico path="events/year" size="chip" />
          {left} left
        </span>
      </Tooltip>
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
  // Only food goes below zero, and only until its owner's turn ends.
  const owed = Math.max(0, -value);
  const short = owed > 0 || value + delta < 0;
  const label = RESOURCE_LABELS[resource];
  const store = owed ? `${owed} short` : `${value} in store`;

  return (
    <Tooltip
      ariaLabel={`${label} ${owed ? store : value}, ${sign(delta)} next turn${short && !owed ? ", short" : ""}`}
      content={
        <Tip title={label}>
          {lines.length > 0 ? (
            <TipLedger
              rows={lines.map((line) => ({
                key: line.key,
                label: line.label,
                value: sign(line.amount),
              }))}
            />
          ) : (
            <TipBody>No income or expense.</TipBody>
          )}
          {owed ? (
            <TipWarn>
              {owed} short: a pop leaves for each when you end your turn. Buy food first.
            </TipWarn>
          ) : short ? (
            <TipWarn>Short next turn</TipWarn>
          ) : null}
        </Tip>
      }
      focusable
      triggerClassName={`res${short ? " is-short" : ""}`}
    >
      <Ico path={RESOURCE_RASTERS[resource]} size="ui" />
      <span className="res-val num">{owed ? sign(value) : value}</span>
      <span className={`res-delta ${tone(delta)}`}>{sign(delta)}</span>
    </Tooltip>
  );
}

/** One class of the realm's people: the count, and where they live in the tooltip. */
function PopCell({
  G,
  viewerId,
  pop,
  label,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  pop: PopType;
  label: string;
}) {
  const names = settlementNames(G.board.tiles);
  const rows = G.players[viewerId].settlements.flatMap((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, viewerId);
    const count = settlement?.pops[pop] ?? 0;
    return settlement && count > 0
      ? [{ key: settlement.id, label: names.get(settlement.id) ?? "Polis", value: count }]
      : [];
  });
  const atSea = popsInTransit(G, viewerId)[pop];
  if (atSea > 0) rows.push({ key: "sea", label: "At sea", value: atSea });
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Tooltip
      ariaLabel={`${label} ${total}`}
      content={
        <Tip title={label}>
          {rows.length > 0 ? (
            <TipLedger rows={[...rows, { key: "total", label, value: total, total: true }]} />
          ) : (
            <TipBody>None in the realm.</TipBody>
          )}
        </Tip>
      }
      focusable
      triggerClassName="res pop"
    >
      <Ico path={POP_RASTERS[pop]} size="ui" />
      <span className="res-val num">{total}</span>
    </Tooltip>
  );
}

/**
 * Happiness: the level, a gauge whose bands mark where riot and revolt start, and
 * one pip above the gauge for each Unrest token on the realm.
 */
export function HappinessGauge({
  display,
  outcome,
  ruleset,
}: {
  display: HappinessDisplay;
  /** What ending the turn at this level sets off. */
  outcome: UnrestOutcome;
  ruleset: Ruleset;
}) {
  const stops = gaugeStops(display);
  const atRiot = outcome.tier !== "none";
  const noun = "Happiness";
  const tokens = `${display.tokens} Unrest ${display.tokens === 1 ? "token" : "tokens"}`;

  return (
    <Tooltip
      ariaLabel={`${noun} ${sign(display.value)}, ${tokens}; riot at ${sign(display.riotAt)}, revolt at ${sign(display.revoltAt)}`}
      content={
        <Tip title={noun}>
          <TipLedger
            rows={[
              ...display.lines.map((line) => ({
                key: line.label,
                label:
                  line.turns === undefined ? (
                    line.label
                  ) : (
                    <>
                      {line.label} <Turns n={line.turns} />
                    </>
                  ),
                value: sign(line.amount),
              })),
              { key: "total", label: noun, value: sign(display.value), total: true },
            ]}
          />
          <TipLedger
            rows={[
              { key: "riot", label: "Riot at", value: sign(display.riotAt), icon: "unrest/riot" },
              {
                key: "revolt",
                label: "Revolt at",
                value: sign(display.revoltAt),
                icon: "unrest/revolt",
              },
            ]}
          />
          <TipBody>
            Read off the board each turn; nothing is saved up. Unrest tokens stay until a riot, a
            revolt or a card clears them.
          </TipBody>
          {atRiot ? <TipWarn>{presentUnrestOutcome(ruleset, outcome.tier).warning}</TipWarn> : null}
        </Tip>
      }
      focusable
      triggerClassName={`level${atRiot ? " is-riot" : ""}`}
    >
      <Ico path={RESOURCE_RASTERS.happiness} size="ui" />
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
  income,
  breakdown,
  happiness,
  children,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  income: Resources;
  breakdown: readonly IncomeContribution[];
  happiness: HappinessDisplay;
  /** The bar's right end: the consult pages' names. */
  children: ReactNode;
}) {
  const store = G.players[viewerId].resources;
  const names = settlementNames(G.board.tiles);

  return (
    <header className="topbar" data-c="topbar" data-exclude data-gate-flex>
      <Clock G={G} />
      <div className="purse" data-c="purse">
        <div aria-label="Goods" className="purse-seg" role="group">
          {PURSE.map((resource) => (
            <ResourceCell
              delta={income[resource]}
              key={resource}
              lines={linesFor(resource, breakdown, names)}
              resource={resource}
              value={store[resource]}
            />
          ))}
        </div>
        <div aria-label="People" className="purse-seg" role="group">
          {PEOPLE.map(({ pop, label }) => (
            <PopCell G={G} key={pop} label={label} pop={pop} viewerId={viewerId} />
          ))}
        </div>
        <div className="purse-seg">
          <HappinessGauge
            display={happiness}
            outcome={unrestOutcome(G, viewerId)}
            ruleset={G.ruleset}
          />
        </div>
      </div>
      <div className="court" data-c="court">
        {children}
      </div>
    </header>
  );
}
