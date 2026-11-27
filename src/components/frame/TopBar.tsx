import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { unrestOutcome } from "../../game/unrest";
import type { UnrestOutcome } from "../../game/unrest";
import { forecastYearCard, lastYear } from "../../game/year";
import type { IncomeContribution } from "../../game/economy/income";
import type { Ruleset } from "../../game/ruleset";
import { getOwnedSettlement, popsInTransit, settlementCapacity, totalPops } from "../../game/rules";
import type { HegemonyState, PlayerId, PopType, Resource, Resources } from "../../game/types";
import { yearCardFace } from "../../ui/cardFace";
import { presentUnrestOutcome } from "../../ui/effects";
import { RESOURCE_LABELS, toRoman, formatSignedNumber } from "../../ui/formatters";
import { gaugeStops } from "../../ui/frameSelectors";
import type { HappinessDisplay } from "../../ui/frameSelectors";
import { tone } from "../../ui/frameFormat";
import { POP_RASTERS, RESOURCE_RASTERS } from "../../ui/iconRegistry";
import { settlementNames } from "../../ui/settlementNames";
import { yearCardArtUrl } from "../board/events";
import { GameCard } from "../cards/GameCard";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip, TipBody, TipLedger, TipWarn, Turns } from "./parts";
import { HappinessCard } from "./top/HappinessCard";

const GOODS: Resource[] = ["wood", "stone", "food", "gold"];
const PEOPLE: Array<{ pop: PopType; label: string }> = [
  { pop: "citizens", label: "Citizens" },
  { pop: "freemen", label: "Freemen" },
  { pop: "slaves", label: "Slaves" },
];

/** Pips the meter has room for; the tooltip prints the true count. */
const MAX_TOKEN_PIPS = 6;

/** The year and the years left: the clock at the bar's left end, past the seal. The
 *  year's card itself leads the alarms row; next year's card shows on the clock's
 *  hover, and the final year has none. */
function Clock({ G }: { G: HegemonyState }) {
  const year = G.year;
  const totalYears = lastYear(G);
  const left = totalYears - year;
  const next = forecastYearCard(G);

  return (
    <div className="clock" data-c="clock">
      <Tooltip
        ariaLabel={`Year ${year} of ${totalYears}, ${left} ${left === 1 ? "year" : "years"} left${next ? `. Next year’s card: ${next.name}. ${next.text}` : ""}`}
        content={
          next ? (
            <Tip title="Next year">
              <GameCard face={yearCardFace(next, year + 1, yearCardArtUrl(next))} size="hand" />
              <TipBody>{next.text}</TipBody>
            </Tip>
          ) : null
        }
        focusable
        triggerRole="img"
        triggerClassName="year"
      >
        <b className="year-n">Year {toRoman(year)}</b>
        <span className="year-left">
          of {toRoman(totalYears)} · {left} left
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
      ariaLabel={`${label} ${owed ? store : value}, ${formatSignedNumber(delta)} next turn${short && !owed ? ", short" : ""}`}
      content={
        <Tip title={label}>
          {lines.length > 0 ? (
            <TipLedger
              rows={lines.map((line) => ({
                key: line.key,
                label: line.label,
                value: formatSignedNumber(line.amount),
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
      triggerRole="img"
      triggerClassName={`bar-cell res${short ? " is-short" : ""}`}
    >
      <Ico path={RESOURCE_RASTERS[resource]} size="ui" />
      <span className="bar-cell-v">
        <b className="bar-cell-n">{owed ? formatSignedNumber(value) : value}</b>
        <i className={`bar-cell-d ${tone(delta)}`}>
          {delta === 0 ? "±0" : formatSignedNumber(delta)}
        </i>
      </span>
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
      triggerRole="img"
      triggerClassName="bar-cell res pop"
    >
      <Ico path={POP_RASTERS[pop]} size="ui" />
      <span className="bar-cell-v">
        <b className="bar-cell-n">{total}</b>
        <i className="bar-cell-d">{label.toLowerCase()}</i>
      </span>
    </Tooltip>
  );
}

/** Room: the realm's pops in its settlements against what they hold, place by place,
 *  and "(+1)" for those at sea, as the outliner's rows count them: the classes' counts
 *  include pops at sea, so the two add up. */
function RoomCell({ G, viewerId }: { G: HegemonyState; viewerId: PlayerId }) {
  const names = settlementNames(G.board.tiles);
  const rows = G.players[viewerId].settlements.flatMap((tileId) => {
    const settlement = getOwnedSettlement(G, tileId, viewerId);
    if (!settlement) return [];
    const pops = settlement.pops.citizens + settlement.pops.freemen + settlement.pops.slaves;
    return [
      {
        key: settlement.id,
        label: names.get(settlement.id) ?? "Polis",
        pops,
        room: settlementCapacity(settlement, G),
      },
    ];
  });
  const pops = rows.reduce((sum, row) => sum + row.pops, 0);
  const room = rows.reduce((sum, row) => sum + row.room, 0);
  const atSea = totalPops(popsInTransit(G, viewerId));

  return (
    <Tooltip
      ariaLabel={`Room: ${pops} pops of ${room}${atSea ? `, ${atSea} more at sea` : ""}`}
      content={
        <Tip title="Room">
          {rows.length > 0 ? (
            <TipLedger
              rows={[
                ...rows.map((row) => ({
                  key: row.key,
                  label: row.label,
                  value: `${row.pops} of ${row.room}`,
                })),
                ...(atSea
                  ? [{ key: "sea", label: "At sea, here next turn", value: `+${atSea}` }]
                  : []),
              ]}
            />
          ) : (
            <TipBody>No settlements yet.</TipBody>
          )}
        </Tip>
      }
      focusable
      triggerRole="img"
      triggerClassName="bar-cell res pop room"
    >
      <Ico path="pops/capacity" size="ui" />
      <span className="bar-cell-v">
        <b className="bar-cell-n">
          {pops}
          <small className="bar-cell-of">/{room}</small>
        </b>
        <i className="bar-cell-d">room{atSea ? <span className="pos"> (+{atSea})</span> : null}</i>
      </span>
    </Tooltip>
  );
}

/** The level's one word: content, discontent, or what ending the turn at it sets off. */
function moodWord(display: HappinessDisplay): string {
  return display.value <= display.revoltAt
    ? "revolt"
    : display.value <= display.riotAt
      ? "riot"
      : display.value < 0
        ? "discontent"
        : "content";
}

/**
 * Happiness: the level and its word, a meter whose bands mark where riot and revolt
 * start, and one pip on it for each Unrest token. A click drops the happiness card,
 * which holds Calm.
 */
function MoodCell({
  display,
  outcome,
  ruleset,
}: {
  display: HappinessDisplay;
  /** What ending the turn at this level sets off. */
  outcome: UnrestOutcome;
  ruleset: Ruleset;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const stops = gaugeStops(display);
  const atRiot = outcome.tier !== "none";
  const noun = "Happiness";
  const word = moodWord(display);
  const tokens = `${display.tokens} Unrest ${display.tokens === 1 ? "token" : "tokens"}`;

  return (
    <>
      <Tooltip
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
                  value: formatSignedNumber(line.amount),
                })),
                {
                  key: "total",
                  label: noun,
                  value: formatSignedNumber(display.value),
                  total: true,
                },
              ]}
            />
            <TipLedger
              rows={[
                {
                  key: "riot",
                  label: "Riot at",
                  value: formatSignedNumber(display.riotAt),
                  icon: "unrest/riot",
                },
                {
                  key: "revolt",
                  label: "Revolt at",
                  value: formatSignedNumber(display.revoltAt),
                  icon: "unrest/revolt",
                },
              ]}
            />
            <TipBody>
              Read off the board each turn; nothing is saved up. Unrest tokens stay until a riot, a
              revolt or a card clears them.
            </TipBody>
            {atRiot ? (
              <TipWarn>{presentUnrestOutcome(ruleset, outcome.tier).warning}</TipWarn>
            ) : null}
            <p className="tip-act">Click for Calm</p>
          </Tip>
        }
      >
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`${noun} ${formatSignedNumber(display.value)}, ${word}, ${tokens}; riot at ${formatSignedNumber(display.riotAt)}, revolt at ${formatSignedNumber(display.revoltAt)}. Open for Calm`}
          className={`bar-cell mood${atRiot ? " is-riot" : ""}`}
          data-c="mood"
          onClick={() => setOpen((value) => !value)}
          ref={button}
          type="button"
        >
          <Ico path={display.value < 0 ? "unrest/discontent" : "unrest/calm"} size="ui" />
          <span className="bar-cell-v">
            <b className={`bar-cell-n ${tone(display.value)}`}>
              {formatSignedNumber(display.value)}
            </b>
            <i className="bar-cell-d">{word}</i>
          </span>
          <span
            aria-hidden="true"
            className="mood-meter"
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
        </button>
      </Tooltip>
      {open ? (
        <HappinessCard
          anchor={button}
          display={display}
          onClose={() => setOpen(false)}
          word={word}
        />
      ) : null}
    </>
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

/**
 * The top bar, 50 high across the screen: the year, the five resources and the three
 * classes of people with the room they live in, each stock over its change, and the
 * mood, which opens the happiness card. The menu sits at its right end.
 */
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
  /** The bar's right end: the menu. */
  children: ReactNode;
}) {
  const store = G.players[viewerId].resources;
  const names = settlementNames(G.board.tiles);
  const cell = (resource: Resource) => (
    <ResourceCell
      delta={income[resource]}
      key={resource}
      lines={linesFor(resource, breakdown, names)}
      resource={resource}
      value={store[resource]}
    />
  );

  return (
    <header className="topbar" data-c="topbar" data-exclude data-gate-flex>
      <Clock G={G} />
      <div className="purse" data-c="purse">
        <div aria-label="Goods" className="bar-grp" role="group">
          {GOODS.map(cell)}
        </div>
        <div aria-label="Influence" className="bar-grp" role="group">
          {cell("influence")}
        </div>
        <div aria-label="People" className="bar-grp" role="group">
          {PEOPLE.map(({ pop, label }) => (
            <PopCell G={G} key={pop} label={label} pop={pop} viewerId={viewerId} />
          ))}
          <RoomCell G={G} viewerId={viewerId} />
        </div>
        <div className="bar-grp">
          <MoodCell display={happiness} outcome={unrestOutcome(G, viewerId)} ruleset={G.ruleset} />
        </div>
      </div>
      {children}
    </header>
  );
}
