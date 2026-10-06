import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { seatsBefore } from "../../game/turn";
import type { VictoryThreat } from "../../game/victory";
import type { HegemonyState, PlayerId, VictoryMetric } from "../../game/types";
import { toRoman } from "../../ui/formatters";
import { numberWord, titleValue, yearCardIcon } from "../../ui/frameFormat";
import { PLAYER_GLAZES } from "../../ui/playerGlazes";
import { Tooltip } from "../overlays/Tooltip";
import { Ico, Tip } from "./parts";

/**
 * The year card, closed: the first disc of the alarms row until the year turns. The
 * year icon carries the card's subject as a badge; a click reopens the face.
 */
export function YearDisc({ G, onOpen }: { G: HegemonyState; onOpen: () => void }) {
  const card = G.activeYearCard;
  if (!card) return null;
  const until = G.yearDrawPile.length ? `until Year ${toRoman(G.year + 1)}` : "the final year";
  return (
    <li>
      <Tooltip
        content={
          <Tip sub={`This year’s card · ${until}`} title={card.name}>
            <p className="tip-body">{card.text}</p>
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

const listed = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

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
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (threats.length === 0) return null;
  const who = (seat: PlayerId) => (seat === viewerId ? "you" : G.players[seat].name);
  const toWin = numberWord(G.ruleset.victory.cardsToWin);
  const headline = (seat: PlayerId) =>
    seat === viewerId
      ? "You win when your turn starts"
      : `${G.players[seat].name} wins when their turn starts`;

  return (
    <li className="threat" ref={ref}>
      <button
        aria-expanded={open}
        aria-label={`${capital(toWin)} titles: ${threats.map((threat) => headline(threat.seat)).join("; ")}.`}
        className="alarm-disc is-down is-loud"
        data-c="threat"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Ico path="unrest/threshold" size="ui" />
      </button>
      {open ? (
        <div
          aria-label={`${capital(toWin)} titles`}
          className="threat-panel"
          data-c="threat-panel"
          role="dialog"
        >
          {threats.map((threat) => {
            const before = seatsBefore(G, threat.seat).map(who);
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
                    <span className="toast-kicker">{capital(toWin)} titles</span>
                    <b className="threat-title">{headline(threat.seat)}</b>
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
                          <b>{card.name}</b>
                          <span className="caption">
                            {G.players[threat.seat].name} {titleValue(card.metric, value)}
                            {runnerUp ? ` · next best ${who(runnerUp.seat)} ${runnerUp.value}` : ""}
                          </span>
                        </span>
                        <span className="threat-gap caption">
                          {gap === null
                            ? "no challenger"
                            : `${capital(yours ? "you are" : `${who(runnerUp!.seat)} is`)} ${shortBy(card.metric, gap)} short of a tie`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
