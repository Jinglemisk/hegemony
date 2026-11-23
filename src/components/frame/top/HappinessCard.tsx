import type { RefObject } from "react";
import { getCivicCalmStatus, usesLeft } from "../../../game/rules";
import type { CivicCalmPayment } from "../../../game/rules";
import { unrestOutcome } from "../../../game/unrest";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { presentUnrestOutcome } from "../../../ui/effects";
import { formatResourceCost } from "../../../ui/formatters";
import { sign, tone } from "../../../ui/frameFormat";
import type { HappinessDisplay } from "../../../ui/frameSelectors";
import { Prose } from "../../AnnotatedText";
import { useGameUi } from "../../board/GameUiContext";
import { Panel, PanelHead } from "../../chrome/Panel";
import { Lacquer } from "../../chrome/controls";
import { useConfirm } from "../../chrome/confirmContext";
import { SpendDetail } from "../../chrome/confirmDetail";
import { Popover } from "../../overlays/Popover";
import { Tooltip } from "../../overlays/Tooltip";
import { Chips, Tip, TipBody, Turns } from "../parts";

/**
 * The happiness card, dropped from the bar's mood: what raises and lowers the level,
 * what ending the turn at it sets off, and Calm, paid in gold or influence. Both
 * Calm buttons ask first (the confirm bar).
 */
export function HappinessCard({
  anchor,
  display,
  word,
  onClose,
}: {
  anchor: RefObject<HTMLElement | null>;
  display: HappinessDisplay;
  /** The level's word: content, discontent, riot or revolt. */
  word: string;
  onClose: () => void;
}) {
  const { G, viewerId, turnBlocked } = useGameUi();
  const outcome = unrestOutcome(G, viewerId);
  const warning =
    outcome.tier === "none" ? null : presentUnrestOutcome(G.ruleset, outcome.tier).warning;
  const cap = G.ruleset.turnCaps.calm;
  const used = cap === null ? null : cap - (usesLeft(G, viewerId, "calm") ?? 0);
  const calmLine = `+${G.ruleset.civicCalm.happiness} happiness until the year turns${cap === null ? "." : `, up to ${cap} a turn.`}`;

  return (
    <Popover
      align="end"
      anchor={anchor}
      ariaLabel="Happiness"
      className="top-pop mood-pop"
      dismissOnOutside
      onDismiss={onClose}
    >
      <Panel className="mood-card ch-settle" corners={["bl", "br"]} data-c="mood-card">
        <PanelHead
          closeLabel="Close happiness"
          icon={display.value < 0 ? "unrest/discontent" : "unrest/calm"}
          onClose={onClose}
          sub={`${word[0]!.toUpperCase()}${word.slice(1)} · a Riot starts at ${sign(display.riotAt)}`}
          title={`Happiness ${sign(display.value)}`}
        />
        <div className="mood-body">
          <h3 className="mood-sec">
            What moves it<span className="num mood-total">{sign(display.value)}</span>
          </h3>
          <ul className="mood-lines">
            {display.lines.map((line) => {
              // "3 Slaves, 1 per 2": the count in its own column, so the terms line up.
              const split = /^(\d+) (.*)$/.exec(line.label);
              const count = split?.[1] ?? "";
              const words = split?.[2] ?? line.label;
              return (
                <li className="mood-line" key={line.label}>
                  <span className="num mood-line-n">{count}</span>
                  <span className="mood-line-k">
                    <span>
                      <Prose links={false}>{words}</Prose>
                    </span>
                    {line.turns === undefined ? null : <Turns n={line.turns} />}
                  </span>
                  <b className={`num ${tone(line.amount)}`}>{sign(line.amount)}</b>
                </li>
              );
            })}
          </ul>
          <h3 className="mood-sec">At turn end</h3>
          <p className="mood-note">
            <Prose links={false}>
              {warning ??
                `A Riot starts at ${sign(display.riotAt)} when you end your turn, a Revolt at ${sign(display.revoltAt)}.`}
            </Prose>
          </p>
          <h3 className="mood-sec">
            Calm{used === null ? null : <span>{`${used} of ${cap} used this turn`}</span>}
          </h3>
          <p className="mood-note">
            <Prose links={false}>{calmLine}</Prose>
          </p>
        </div>
        <div className="mood-acts">
          {(["gold", "influence"] as const).map((payment) => (
            <CalmButton
              blocked={turnBlocked}
              G={G}
              key={payment}
              payment={payment}
              viewerId={viewerId}
            />
          ))}
        </div>
      </Panel>
    </Popover>
  );
}

/** One Calm payment: its price from the engine, refused with the engine's reason. */
function CalmButton({
  G,
  viewerId,
  payment,
  blocked,
}: {
  G: HegemonyState;
  viewerId: PlayerId;
  payment: CivicCalmPayment;
  /** The turn's own gate: not this seat's turn, a decision waiting. */
  blocked: string | null;
}) {
  const { moves } = useGameUi();
  const ask = useConfirm();
  const status = getCivicCalmStatus(G, viewerId, payment);
  const cost = status.cost ?? {};
  const reason = blocked ?? status.reasons[0] ?? null;
  const label = payment === "gold" ? "Calm, paid in gold" : "Calm, paid in influence";

  const confirm = () =>
    ask({
      icon: "unrest/calm-verb",
      question: `Are you sure you want to buy Calm for ${formatResourceCost(cost).toLowerCase()}?`,
      detail: (
        <SpendDetail
          command={{ type: "civicCalm", payment }}
          cost={cost}
          G={G}
          viewerId={viewerId}
        />
      ),
      verb: "Calm",
      onYes: () => moves.civicCalm(payment),
    });

  return (
    <Tooltip
      content={
        <Tip title={label}>
          <TipBody>{reason ?? `${formatResourceCost(cost)}. Asks before it spends.`}</TipBody>
        </Tip>
      }
    >
      <Lacquer
        aria-label={`${label}, ${formatResourceCost(cost)}${reason ? `. ${reason}` : ""}`}
        className="mood-calm"
        data-c="calm"
        disabled={reason !== null}
        onClick={confirm}
      >
        <span>{label}</span>
        <Chips amounts={cost} />
      </Lacquer>
    </Tooltip>
  );
}
