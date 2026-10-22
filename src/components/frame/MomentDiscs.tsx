import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { seatsBefore } from "../../game/turn";
import type { VictoryThreat } from "../../game/victory";
import type { HegemonyState, PlayerId, VictoryMetric } from "../../game/types";
import { capitalize } from "../../game/core/format";
import { listed, numberWord, seatName } from "../../ui/formatters";
import { titleValue } from "../../ui/frameFormat";
import { turnsLeftInYear } from "../../ui/frameSelectors";
import { yearCardIcon } from "../../ui/iconRegistry";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Prose } from "../AnnotatedText";
import { Popover } from "../overlays/Popover";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip, TipBody } from "./parts";

/**
 * The year card, closed: the first disc of the alarms row until the year turns. The
 * year icon carries the card's subject as a badge; a click reopens the face.
 */
export function YearDisc({
  G,
  viewerId,
  onOpen,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  onOpen: () => void;
}) {
  const card = G.activeYearCard;
  if (!card) return null;
  return (
    <li>
      <Tooltip
        content={
          <Tip title={card.name} turns={turnsLeftInYear(G, viewerId)}>
            <TipBody>{card.text}</TipBody>
            <p className="tip-act">Click to read the card</p>
          </Tip>
        }
      >
        <button
          aria-label={`This year’s card: ${card.name}. ${card.text}`}
          className="alarm-disc is-year"
          data-gate-hover="year-disc"
          onClick={onOpen}
          type="button"
        >
          <Ico path="events/year" size="ui" />
          <span className="alarm-badge">
            <Ico path={yearCardIcon(card)} size="chip" />
          </span>
        </button>
      </Tooltip>
    </li>
  );
}

/** "7 gold", "1 pop": how far a challenger is from a tie. */
function shortBy(metric: VictoryMetric, gap: number): string {
  return metric === "happiness" ? `${gap} happiness` : titleValue(metric, gap);
}

/**
 * The threat: a seat holds enough titles to win when its next turn starts. A loud
 * Threshold disc leads every seat's alarms row; a click opens the panel naming each
 * title it holds and the gap to the nearest challenger, since a tie breaks a title.
 */
export function ThreatAlarm({
  G,
  viewerId,
  threats,
  defaultOpen = false,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  threats: VictoryThreat[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const disc = useRef<HTMLButtonElement>(null);

  if (threats.length === 0) return null;
  const toWin = numberWord(G.ruleset.victory.cardsToWin);
  const headline = (seat: PlayerId) =>
    seat === viewerId
      ? "You win when your turn starts"
      : `${G.players[seat].name} wins when their turn starts`;

  return (
    <li className="threat">
      <button
        aria-expanded={open}
        aria-label={`${capitalize(toWin)} titles: ${threats.map((threat) => headline(threat.seat)).join("; ")}.`}
        className="alarm-disc is-down is-loud"
        data-c="threat"
        onClick={() => setOpen((value) => !value)}
        ref={disc}
        type="button"
      >
        <Ico path="unrest/threshold" size="ui" />
      </button>
      {open ? (
        <Popover
          align="start"
          anchor={disc}
          ariaLabel={`${capitalize(toWin)} titles`}
          className="threat-panel"
          dismissOnOutside
          onDismiss={() => setOpen(false)}
        >
          {threats.map((threat) => {
            const before = seatsBefore(G, threat.seat).map((seat) => seatName(G, seat, viewerId));
            const glaze = PLAYER_GLAZES[threat.seat];
            return (
              <section className="threat-seat" key={threat.seat}>
                <header className="threat-head">
                  <span
                    className="idea-seat threat-glaze"
                    style={{ "--owner": glaze.color } as CSSProperties}
                  >
                    {glaze.blazon}
                  </span>
                  <span className="threat-words">
                    <span className="kicker toast-kicker">{capitalize(toWin)} titles</span>
                    <b className="name threat-title">{headline(threat.seat)}</b>
                    <span className="caption">
                      {threat.seat === viewerId
                        ? `if you still hold them · after ${listed(before)}`
                        : `after ${listed(before)} · break one title before then`}
                    </span>
                  </span>
                </header>
                <ul className="threat-rows">
                  {threat.titles.map(({ card, value, runnerUp }) => {
                    const gap = runnerUp ? value - runnerUp.value : null;
                    const yours = runnerUp?.seat === viewerId;
                    return (
                      <li className={yours ? "is-yours" : undefined} key={card.id}>
                        <Ico path={`victory/${card.id}`} size="tile" />
                        <span className="threat-row-words">
                          <b className="name">{card.name}</b>
                          <span className="caption">
                            <Prose links={false}>
                              {`${G.players[threat.seat].name} ${titleValue(card.metric, value)}`}
                              {runnerUp
                                ? ` · next best ${seatName(G, runnerUp.seat, viewerId)} ${runnerUp.value}`
                                : ""}
                            </Prose>
                          </span>
                        </span>
                        <span className="threat-gap caption">
                          <Prose links={false}>
                            {gap === null
                              ? "no challenger"
                              : `${capitalize(yours ? "you are" : `${seatName(G, runnerUp!.seat, viewerId)} is`)} ${shortBy(card.metric, gap)} short of a tie`}
                          </Prose>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </Popover>
      ) : null}
    </li>
  );
}
