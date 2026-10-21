import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PLAYER_IDS } from "../../../game/data";
import { totalPops } from "../../../game/core/pops";
import {
  answeredTerms,
  emptyBundle,
  getTradeAnswerStatus,
  getTradeOfferStatus,
  getTradeSettleStatus,
  tradePopSources,
  tradePopTargets,
} from "../../../game/trade";
import type {
  HegemonyState,
  PlayerId,
  TradeBundle,
  TradeOffer,
  TradePlaces,
} from "../../../game/types";
import { seatName } from "../../../ui/formatters";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";
import { ActionButton } from "../../ActionButton";
import { useGameUi } from "../../board/GameUiContext";
import { Ico } from "../parts";
import {
  MARK_GLYPH,
  answerMark,
  bundleWords,
  heldOf,
  itemCount,
  itemIcon,
  itemKey,
  itemName,
  itemsOf,
  offerTitle,
  pickable,
  settlementLabel,
  stocksAfter,
  withCount,
} from "./tradeView";
import type { Sides, TradeItem } from "./tradeView";

/**
 * The compact offer card (docs/reference/design/showcases/trade-screens). One card
 * composes an offer, answers it and settles it; nothing takes over the screen. Its two
 * columns are what the acting seat receives and what the other side receives; a
 * counter edits them in place, each changed line showing what it was. Every "can I?"
 * is the engine's status for the command the button sends.
 */

/** A count the receiving side may ask for: the engine checks what is real. */
const ASK_CAP = 99;

const both = (sides: Sides) => [...itemsOf(sides.gives), ...itemsOf(sides.gets)];
const sameSides = (a: Sides, b: Sides) =>
  both(a).length === both(b).length &&
  (["gives", "gets"] as const).every((side) =>
    itemsOf(a[side]).every((item) => itemCount(a[side], item) === itemCount(b[side], item)),
  );

/** "You receive", "Nikos receives", "They receive". */
function receives(name: string) {
  return name === "You" || name === "They" ? `${name} receive` : `${name} receives`;
}

function Glaze({ seat, size = "lg" }: { seat: PlayerId; size?: "lg" | "sm" }) {
  const glaze = PLAYER_GLAZES[seat];
  return (
    <span
      className={`name trade-glaze is-${size}${glaze.inkDark ? " ink-dark" : ""}`}
      style={{ "--owner": glaze.color } as CSSProperties}
      title={glaze.name}
    >
      {glaze.blazon}
    </span>
  );
}

/** One side's lines; editable with − n + steppers and a + picker for what is missing. */
function Column({
  G,
  label,
  bundle,
  was,
  edit,
}: {
  G: HegemonyState;
  label: string;
  bundle: TradeBundle;
  was?: TradeBundle;
  edit?: {
    cap: (item: TradeItem) => number;
    picks: TradeItem[];
    held?: (item: TradeItem) => number;
    onChange: (bundle: TradeBundle) => void;
  };
}) {
  const [picking, setPicking] = useState(false);
  // A counter keeps the lines it started with, at zero too, so each shows what it was.
  const items = [
    ...itemsOf(bundle),
    ...(was ? itemsOf(was).filter((item) => itemCount(bundle, item) === 0) : []),
  ];

  return (
    <div className="trade-col">
      <span className="caps trade-label">{label}</span>
      <div className="trade-chips">
        {items.map((item) => {
          const n = itemCount(bundle, item);
          const before = was ? itemCount(was, item) : n;
          const name = itemName(G, item, n);
          const cap = edit?.cap(item) ?? 0;
          return (
            <span
              className={`trade-chip${n === 0 ? " is-zero" : ""}${before !== n ? " is-changed" : ""}`}
              key={itemKey(item)}
            >
              <Ico path={itemIcon(item)} size="chip" />
              {edit && item.kind !== "good" ? (
                <button
                  aria-label={`One less ${itemName(G, item, 1)}`}
                  className="name trade-step"
                  onClick={() => edit.onChange(withCount(bundle, item, n - 1))}
                  type="button"
                >
                  −
                </button>
              ) : null}
              <b className="stat num trade-n">{item.kind === "good" ? name : n}</b>
              <span className="visuallyHidden">{item.kind === "good" ? "" : ` ${name}`}</span>
              {edit ? (
                item.kind === "good" ? (
                  <button
                    aria-label={`Take ${name} off`}
                    className="name trade-step"
                    onClick={() => edit.onChange(withCount(bundle, item, 0))}
                    type="button"
                  >
                    ×
                  </button>
                ) : (
                  <button
                    aria-disabled={n >= cap ? true : undefined}
                    aria-label={`One more ${itemName(G, item, 1)}`}
                    className="name trade-step"
                    onClick={() => n < cap && edit.onChange(withCount(bundle, item, n + 1))}
                    type="button"
                  >
                    +
                  </button>
                )
              ) : null}
              {before !== n ? (
                <span className="caption trade-was">
                  was <s>{before}</s>
                </span>
              ) : null}
            </span>
          );
        })}
        {edit && edit.picks.length > 0 ? (
          <button
            aria-expanded={picking}
            aria-label={`Add to ${label.toLowerCase()}`}
            className={`name trade-add${picking ? " is-open" : ""}`}
            onClick={() => setPicking((open) => !open)}
            type="button"
          >
            +
          </button>
        ) : null}
        {edit && picking ? (
          <span className="trade-picker">
            {edit.picks.map((item) => {
              const held = edit.held?.(item);
              const off = held === 0;
              return (
                <button
                  aria-disabled={off ? true : undefined}
                  aria-label={`${itemName(G, item, 1)}${held === undefined ? "" : `, you hold ${held}`}`}
                  className="trade-pick"
                  key={itemKey(item)}
                  onClick={() => {
                    if (off) return;
                    setPicking(false);
                    edit.onChange(withCount(bundle, item, 1));
                  }}
                  title={itemName(G, item, 1)}
                  type="button"
                >
                  <Ico path={itemIcon(item)} size="ui" />
                  {held === undefined ? null : <span className="caption trade-held">{held}</span>}
                </button>
              );
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The two columns, from the acting seat's view: what it receives on the left, what
 *  the other side receives on the right, with the arrows between. */
function Exchange({
  G,
  actor,
  other,
  others,
  sides,
  was,
  onChange,
}: {
  G: HegemonyState;
  actor: PlayerId;
  /** The other side's name: a seat, or "They" for the table. */
  other: string;
  /** The seats across the table, whose goods may be asked for. */
  others: readonly PlayerId[];
  sides: Sides;
  was?: Sides;
  onChange?: (sides: Sides) => void;
}) {
  const { viewerId } = useGameUi();
  const edit = (side: keyof Sides) =>
    onChange && {
      cap: (item: TradeItem) => (side === "gives" ? heldOf(G, actor, item) : ASK_CAP),
      picks: pickable(G, actor, sides, side, others),
      held: side === "gives" ? (item: TradeItem) => heldOf(G, actor, item) : undefined,
      onChange: (bundle: TradeBundle) => onChange({ ...sides, [side]: bundle }),
    };
  return (
    <div className="trade-xchg">
      <Column
        G={G}
        bundle={sides.gets}
        edit={edit("gets")}
        label={receives(seatName(G, actor, viewerId, true))}
        was={was?.gets}
      />
      <span aria-hidden="true" className="trade-flow">
        <span className="trade-arrow is-out" />
        <span className="trade-arrow is-in" />
      </span>
      <Column
        G={G}
        bundle={sides.gives}
        edit={edit("gives")}
        label={receives(other)}
        was={was?.gives}
      />
    </div>
  );
}

/** The acting seat's stocks after, each new value toned by whether it helps. */
function After({ G, seat, sides }: { G: HegemonyState; seat: PlayerId; sides: Sides }) {
  const changes = stocksAfter(G, seat, sides);
  if (changes.length === 0) return null;
  return (
    <span aria-label="Stocks after the trade" className="trade-after">
      {changes.map((change) => (
        <span className="body body-sm trade-delta" key={change.key}>
          <Ico path={change.icon} size="chip" />
          <span>{change.from}</span>
          <span className="trade-arr">→</span>
          <b className={change.to > change.from ? "is-up" : "is-down"}>{change.to}</b>
          <span className="visuallyHidden">{change.label}</span>
        </span>
      ))}
    </span>
  );
}

/** The settlements a seat names for its own traded pops: the one picked, if it still
 *  serves, else the first that does. */
function resolvePlaces(
  G: HegemonyState,
  seat: PlayerId,
  sides: Sides,
  picked: TradePlaces,
): TradePlaces {
  const froms = totalPops(sides.gives.pops) > 0 ? tradePopSources(G, seat, sides.gives.pops) : [];
  const tos = totalPops(sides.gets.pops) > 0 ? tradePopTargets(G, seat, sides.gets.pops) : [];
  const from = picked.from && froms.includes(picked.from) ? picked.from : froms[0];
  const to = picked.to && tos.includes(picked.to) ? picked.to : tos[0];
  return { ...(from ? { from } : {}), ...(to ? { to } : {}) };
}

/** Where the seat's traded pops leave and arrive, when pops trade. */
function Places({
  G,
  seat,
  sides,
  places,
  onChange,
}: {
  G: HegemonyState;
  seat: PlayerId;
  sides: Sides;
  places: TradePlaces;
  onChange: (places: TradePlaces) => void;
}) {
  const rows = [
    totalPops(sides.gives.pops) > 0
      ? {
          key: "from" as const,
          label: "Pops leave",
          options: tradePopSources(G, seat, sides.gives.pops),
          none: "no settlement holds them",
        }
      : null,
    totalPops(sides.gets.pops) > 0
      ? {
          key: "to" as const,
          label: "Pops go to",
          options: tradePopTargets(G, seat, sides.gets.pops),
          none: "no settlement has room",
        }
      : null,
  ].filter((row) => row !== null);
  if (rows.length === 0) return null;
  return (
    <div className="trade-places">
      {rows.map((row) => (
        <label className="trade-place" key={row.key}>
          <span className="caps">{row.label}</span>
          {row.options.length === 0 ? (
            <span className="caption trade-reason">{row.none}</span>
          ) : (
            <select
              className="caption"
              onChange={(event) => onChange({ ...places, [row.key]: event.target.value })}
              value={places[row.key] ?? ""}
            >
              {row.options.map((tileId) => (
                <option key={tileId} value={tileId}>
                  {settlementLabel(G, seat, tileId)}
                </option>
              ))}
            </select>
          )}
        </label>
      ))}
    </div>
  );
}

function CardHead({
  seat,
  kicker,
  title,
  caption,
  onClose,
  children,
}: {
  seat: PlayerId;
  kicker?: string;
  title: string;
  caption?: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="trade-head">
      <Glaze seat={seat} />
      <span className="trade-words">
        {kicker ? <span className="kicker">{kicker}</span> : null}
        <span className="name trade-title">{title}</span>
        {caption ? <span className="caption trade-caption">{caption}</span> : null}
        {children}
      </span>
      <button aria-label="Close" className="name trade-x" onClick={onClose} type="button">
        ×
      </button>
    </header>
  );
}

/** Compose an offer for `seat`: the seats it goes to, none meaning the table, and the
 *  two sides. */
export function ComposeCard({ seat, onClose }: { seat: PlayerId; onClose: () => void }) {
  const { G, moves } = useGameUi();
  const rivals = PLAYER_IDS.filter((id) => id !== seat);
  const [to, setTo] = useState<PlayerId[]>([]);
  const [sides, setSides] = useState<Sides>({ gives: emptyBundle(), gets: emptyBundle() });
  const terms = { give: sides.gives, get: sides.gets };
  const status = getTradeOfferStatus(G, seat, to, terms);
  const names = to.map((id) => G.players[id].name);
  const listed =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  const toggle = (id: PlayerId) => {
    const next = to.includes(id) ? to.filter((other) => other !== id) : [...to, id];
    setTo(next.length === rivals.length ? [] : PLAYER_IDS.filter((other) => next.includes(other)));
  };
  const filled = itemsOf(sides.gives).length > 0 && itemsOf(sides.gets).length > 0;

  return (
    <section aria-label="Offer a trade" className="trade-card">
      <CardHead onClose={onClose} seat={seat} title="Offer a trade">
        <span className="trade-to">
          {rivals.map((id) => {
            const glaze = PLAYER_GLAZES[id];
            const on = to.includes(id);
            return (
              <button
                aria-label={on ? `Take ${glaze.name} off the offer` : `Offer to ${glaze.name}`}
                aria-pressed={on}
                className={`name trade-seat${to.length === 0 ? "" : on ? " is-on" : " is-off"}${glaze.inkDark ? " ink-dark" : ""}`}
                key={id}
                onClick={() => toggle(id)}
                style={{ "--owner": glaze.color } as CSSProperties}
                type="button"
              >
                {glaze.blazon}
              </button>
            );
          })}
          <span className="caption trade-caption">
            {to.length ? `Only ${listed}` : "The table"}
          </span>
        </span>
      </CardHead>
      <Exchange
        G={G}
        actor={seat}
        onChange={setSides}
        other={to.length === 1 ? names[0] : "They"}
        others={to.length ? to : rivals}
        sides={sides}
      />
      <footer className="trade-foot">
        {filled ? (
          <After G={G} seat={seat} sides={sides} />
        ) : (
          <span className="caption trade-reason">Add something on each side.</span>
        )}
        {filled && !status.can ? (
          <span className="caption trade-reason">{status.reasons[0]}</span>
        ) : null}
        <span className="trade-grow" />
        <ActionButton
          blockedReason={status.reasons.join(" ")}
          className="btn kicker is-primary"
          enabled={status.can}
          heading="Offer"
          onClick={() => {
            moves.tradeOffer(seat, to, terms);
            onClose();
          }}
        >
          {to.length === 0
            ? "Offer to the table"
            : `Offer to ${to.length === 1 ? names[0] : `${to.length} seats`}`}
        </ActionButton>
      </footer>
    </section>
  );
}

/** The seat that answers next, in seat order: accept, decline, or counter by editing
 *  the card. Its columns are its own view of the offer. */
function Answer({ offer, seat }: { offer: TradeOffer; seat: PlayerId }) {
  const { G, moves, viewerId } = useGameUi();
  const base: Sides = { gives: offer.terms.get, gets: offer.terms.give };
  const [draft, setDraft] = useState<Sides | null>(null);
  const [picked, setPicked] = useState<TradePlaces>({});
  const sides = draft ?? base;
  const places = resolvePlaces(G, seat, sides, picked);
  const accept = getTradeAnswerStatus(G, seat, offer.id, { kind: "accept", places });
  const counterTerms = { give: sides.gets, get: sides.gives };
  const counter = getTradeAnswerStatus(G, seat, offer.id, {
    kind: "counter",
    terms: counterTerms,
    places,
  });
  const changed = draft !== null && !sameSides(draft, base);
  const who = seatName(G, seat, viewerId, true);
  const owner = G.players[offer.from].name;

  return (
    <div className="trade-answer">
      <span className="kicker trade-next">
        {who === "You" ? "You answer next" : `${who} answers next`} · holds{" "}
        {bundleWords(G, {
          resources: G.players[seat].resources,
          goods: [],
          pops: emptyBundle().pops,
        })}
      </span>
      <Exchange
        G={G}
        actor={seat}
        onChange={draft ? setDraft : undefined}
        other={owner}
        others={[offer.from]}
        sides={sides}
        was={draft ? base : undefined}
      />
      <Places G={G} onChange={setPicked} places={places} seat={seat} sides={sides} />
      <footer className="trade-foot">
        <After G={G} seat={seat} sides={sides} />
        {!draft && !accept.can ? (
          <span className="caption trade-reason">{accept.reasons[0]}</span>
        ) : null}
        {draft && changed && !counter.can ? (
          <span className="caption trade-reason">{counter.reasons[0]}</span>
        ) : null}
        <span className="trade-grow" />
        {draft ? (
          <>
            <button className="btn kicker" onClick={() => setDraft(null)} type="button">
              Back
            </button>
            <ActionButton
              blockedReason={changed ? counter.reasons.join(" ") : "Change at least one number."}
              className="btn kicker is-primary"
              enabled={changed && counter.can}
              heading="Send counter"
              onClick={() =>
                moves.tradeAnswer(seat, offer.id, { kind: "counter", terms: counterTerms, places })
              }
            >
              Send counter
            </ActionButton>
          </>
        ) : (
          <>
            <button
              className="btn kicker"
              onClick={() => moves.tradeAnswer(seat, offer.id, { kind: "decline" })}
              type="button"
            >
              Decline
            </button>
            <button className="btn kicker" onClick={() => setDraft(base)} type="button">
              Counter
            </button>
            <ActionButton
              blockedReason={accept.reasons.join(" ")}
              className="btn kicker is-primary"
              enabled={accept.can}
              heading="Accept"
              onClick={() => moves.tradeAnswer(seat, offer.id, { kind: "accept", places })}
            >
              Accept
            </ActionButton>
          </>
        )}
      </footer>
    </div>
  );
}

const MARK_WORDS = {
  accept: "Accepts",
  counter: "Counters",
  decline: "Declines",
  cantPay: "Can’t pay",
} as const;

/** The offering seat's side of the card: each answer, a settle for each acceptor or
 *  counter, and Withdraw. */
function Answers({ offer, next }: { offer: TradeOffer; next: PlayerId | null }) {
  const { G, moves, viewerId } = useGameUi();
  const [picked, setPicked] = useState<TradePlaces>({});
  const owner = offer.from;

  return (
    <div className="trade-answers">
      <span className="caps">Answers</span>
      {offer.to.map((seat) => {
        const mark = answerMark(G, offer, seat);
        const terms = answeredTerms(offer, seat);
        const sides = terms ? { gives: terms.give, gets: terms.get } : null;
        const places = sides ? resolvePlaces(G, owner, sides, picked) : {};
        const settle = sides ? getTradeSettleStatus(G, owner, offer.id, seat, places) : null;
        const answer = offer.answers[seat];
        const name = G.players[seat].name;
        const status =
          mark === "pending"
            ? seat === next
              ? "answers next"
              : "to answer"
            : answer?.kind === "counter" && mark === "counter"
              ? `${MARK_GLYPH.counter} Counters: ${seatName(G, owner, viewerId)} ${owner === viewerId ? "give" : "gives"} ${bundleWords(G, answer.terms.give)}, ${owner === viewerId ? "get" : "gets"} ${bundleWords(G, answer.terms.get)}`
              : `${MARK_GLYPH[mark]} ${MARK_WORDS[mark]}`;
        return (
          <div className={`trade-row is-${mark}`} key={seat}>
            <Glaze seat={seat} size="sm" />
            <span className="body body-sm trade-row-words">
              <b className="name">{name}</b>
              <span>{status}</span>
              {sides && settle ? (
                <Places G={G} onChange={setPicked} places={places} seat={owner} sides={sides} />
              ) : null}
            </span>
            {settle ? (
              <ActionButton
                blockedReason={settle.reasons.join(" ")}
                className={`btn kicker${answer?.kind === "accept" ? " is-primary" : ""}`}
                enabled={settle.can}
                heading={answer?.kind === "accept" ? `Trade with ${name}` : "Take counter"}
                onClick={() => moves.tradeSettle(owner, offer.id, seat, places)}
              >
                {answer?.kind === "accept" ? `Trade with ${name}` : "Take counter"}
              </ActionButton>
            ) : null}
          </div>
        );
      })}
      <footer className="trade-foot">
        <span className="trade-grow" />
        <button
          className="btn kicker"
          onClick={() => moves.tradeWithdraw(owner, offer.id)}
          type="button"
        >
          Withdraw
        </button>
      </footer>
    </div>
  );
}

/** An open offer: the seat that answers next answers on it, and the offering seat
 *  settles or withdraws from it. Once every seat has answered it shows the terms
 *  from the offering seat's side. */
export function OfferCard({ offer, onClose }: { offer: TradeOffer; onClose: () => void }) {
  const { G } = useGameUi();
  const next = offer.to.find((seat) => !offer.answers[seat]) ?? null;
  const answered = offer.to.length - offer.to.filter((seat) => !offer.answers[seat]).length;

  return (
    <section aria-label={offerTitle(G, offer)} className="trade-card">
      <CardHead
        caption={`Every seat sees it · ${answered} of ${offer.to.length} answered`}
        kicker={offer.toTable ? "On the table" : "To chosen seats"}
        onClose={onClose}
        seat={offer.from}
        title={offerTitle(G, offer)}
      />
      {next ? (
        <Answer key={next} offer={offer} seat={next} />
      ) : (
        <Exchange
          G={G}
          actor={offer.from}
          other="They"
          others={offer.to}
          sides={{ gives: offer.terms.give, gets: offer.terms.get }}
        />
      )}
      <Answers next={next} offer={offer} />
    </section>
  );
}
