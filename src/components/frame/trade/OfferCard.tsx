import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { PLAYER_IDS } from "../../../game/data";
import { totalPops } from "../../../game/core/pops";
import {
  counterOf,
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
import { Prose } from "../../AnnotatedText";
import { Delta, Ico } from "../parts";
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
  stocksAfter,
  withCount,
} from "./tradeView";
import type { Sides, TradeItem } from "./tradeView";
import { useTradePick } from "./tradePick";

/**
 * The compact offer card (docs/reference/design/showcases/trade-screens). One card
 * composes an offer and answers it; nothing takes over the screen. Its two columns are
 * what the acting seat wants and what it gives; a counter edits them
 * in place, each changed line showing what it was. Every "can I?" is the engine's
 * status for the command the button sends.
 */

/** A count the receiving side may ask for: the engine checks what is real. */
const ASK_CAP = 99;

const both = (sides: Sides) => [...itemsOf(sides.gives), ...itemsOf(sides.gets)];
const sameSides = (a: Sides, b: Sides) =>
  both(a).length === both(b).length &&
  (["gives", "gets"] as const).every((side) =>
    itemsOf(a[side]).every((item) => itemCount(a[side], item) === itemCount(b[side], item)),
  );

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
            aria-label={`Add to ${label}`}
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

/** The two columns, from the acting seat's view: what it wants on the left, what it
 *  gives on the right, with the arrows between. The seat composing or countering speaks
 *  as "I"; an open offer's terms are read in the offering seat's name. */
function Exchange({
  G,
  actor,
  named = false,
  others,
  sides,
  was,
  onChange,
}: {
  G: HegemonyState;
  actor: PlayerId;
  /** Label the columns with the seat's name rather than "I". */
  named?: boolean;
  /** The seats across the table, whose goods may be asked for. */
  others: readonly PlayerId[];
  sides: Sides;
  was?: Sides;
  onChange?: (sides: Sides) => void;
}) {
  const name = G.players[actor].name;
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
        label={named ? `${name} wants` : "I want"}
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
        label={named ? `${name} gives` : "I give"}
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
          <Delta from={change.from} to={change.to} />
          <span className="visuallyHidden">{change.label}</span>
        </span>
      ))}
    </span>
  );
}

/** The settlements a seat would name for its traded pops: the first that serves each
 *  end, or the ones already named while they still serve. The buttons ask the engine
 *  with these; the map pick names the real ones as the command goes. */
function firstPlaces(
  G: HegemonyState,
  seat: PlayerId,
  sides: Sides,
  named: TradePlaces = {},
): TradePlaces {
  const froms = totalPops(sides.gives.pops) > 0 ? tradePopSources(G, seat, sides.gives.pops) : [];
  const tos = totalPops(sides.gets.pops) > 0 ? tradePopTargets(G, seat, sides.gets.pops) : [];
  const from = named.from && froms.includes(named.from) ? named.from : froms[0];
  const to = named.to && tos.includes(named.to) ? named.to : tos[0];
  return { ...(from ? { from } : {}), ...(to ? { to } : {}) };
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
 *  two sides. Pops it trades are placed on the map as it offers. */
export function ComposeCard({ seat, onClose }: { seat: PlayerId; onClose: () => void }) {
  const { G, moves } = useGameUi();
  const pick = useTradePick();
  const rivals = PLAYER_IDS.filter((id) => id !== seat);
  const [to, setTo] = useState<PlayerId[]>([]);
  const [sides, setSides] = useState<Sides>({ gives: emptyBundle(), gets: emptyBundle() });
  const terms = { give: sides.gives, get: sides.gets };
  const status = getTradeOfferStatus(G, seat, to, terms, firstPlaces(G, seat, sides));
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
          <span className="caption trade-reason">
            <Prose links={false}>{status.reasons[0]}</Prose>
          </span>
        ) : null}
        <span className="trade-grow" />
        <ActionButton
          blockedReason={status.reasons.join(" ")}
          className="btn kicker is-primary"
          enabled={status.can}
          heading="Offer"
          onClick={() => {
            pick(
              {
                seat,
                partner: to.length === 1 ? to[0] : null,
                gives: sides.gives.pops,
                gets: sides.gets.pops,
              },
              (places) => moves.tradeOffer(seat, to, terms, places),
            );
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

/** A named seat's counter, edited on the card in place: its own view of the offer,
 *  each changed line showing what it was. */
function Counter({
  offer,
  seat,
  onBack,
}: {
  offer: TradeOffer;
  seat: PlayerId;
  onBack: () => void;
}) {
  const { G, moves, viewerId } = useGameUi();
  const pick = useTradePick();
  const base: Sides = { gives: offer.terms.get, gets: offer.terms.give };
  const [draft, setDraft] = useState<Sides>(base);
  const counterTerms = { give: draft.gets, get: draft.gives };
  const status = getTradeAnswerStatus(G, seat, offer.id, {
    kind: "counter",
    terms: counterTerms,
    places: firstPlaces(G, seat, draft),
  });
  const changed = !sameSides(draft, base);
  const who = seatName(G, seat, viewerId, true);

  return (
    <div className="trade-answer">
      <span className="kicker trade-next">{who === "You" ? "You counter" : `${who} counters`}</span>
      <Exchange
        G={G}
        actor={seat}
        onChange={setDraft}
        others={[offer.from]}
        sides={draft}
        was={base}
      />
      <footer className="trade-foot">
        <After G={G} seat={seat} sides={draft} />
        {changed && !status.can ? (
          <span className="caption trade-reason">
            <Prose links={false}>{status.reasons[0]}</Prose>
          </span>
        ) : null}
        <span className="trade-grow" />
        <button className="btn kicker" onClick={onBack} type="button">
          Back
        </button>
        <ActionButton
          blockedReason={changed ? status.reasons.join(" ") : "Change at least one number."}
          className="btn kicker is-primary"
          enabled={changed && status.can}
          heading="Send counter"
          onClick={() => {
            pick(
              { seat, partner: offer.from, gives: draft.gives.pops, gets: draft.gets.pops },
              (places) =>
                moves.tradeAnswer(seat, offer.id, { kind: "counter", terms: counterTerms, places }),
            );
            onBack();
          }}
        >
          Send counter
        </ActionButton>
      </footer>
    </div>
  );
}

/** "holds 4 stone, 2 gold": what a seat holds of the stocks the offer asks of it. */
function holdsWords(G: HegemonyState, seat: PlayerId, asked: TradeBundle) {
  const held = G.players[seat].resources;
  const lines = itemsOf(asked)
    .filter((item) => item.kind === "resource")
    .map((item) => `${Math.max(0, held[item.id as keyof typeof held])} ${itemName(G, item)}`);
  return lines.length ? `holds ${lines.join(", ")}` : "";
}

/** Every seat the offer names, at once: the first to accept trades. A seat may decline
 *  or counter instead; the offering seat takes a counter or withdraws. A bot's seat
 *  answers on its own, so its row only reads. */
function Answers({
  offer,
  onCounter,
  onClose,
}: {
  offer: TradeOffer;
  onCounter: (seat: PlayerId) => void;
  onClose: () => void;
}) {
  const { G, moves, viewerId, humans } = useGameUi();
  const pick = useTradePick();
  const owner = offer.from;
  const ownerPlays = humans.includes(owner);
  const theirs: Sides = { gives: offer.terms.get, gets: offer.terms.give };

  return (
    <div className="trade-answers">
      <span className="caps">The first to accept trades</span>
      {offer.to.map((seat) => {
        const mark = answerMark(G, offer, seat);
        const reply = offer.answers[seat];
        const counter = counterOf(offer, seat);
        const name = G.players[seat].name;
        const accept =
          reply || !humans.includes(seat)
            ? null
            : getTradeAnswerStatus(G, seat, offer.id, {
                kind: "accept",
                places: firstPlaces(G, seat, theirs),
              });
        const ownSides = counter ? { gives: counter.terms.give, gets: counter.terms.get } : null;
        const take =
          ownSides && ownerPlays
            ? getTradeSettleStatus(
                G,
                owner,
                offer.id,
                seat,
                firstPlaces(G, owner, ownSides, offer.places),
              )
            : null;
        const status = counter
          ? `${MARK_GLYPH.counter} Counters: ${seatName(G, owner, viewerId)} ${owner === viewerId ? "give" : "gives"} ${bundleWords(G, counter.terms.give)}, ${owner === viewerId ? "get" : "gets"} ${bundleWords(G, counter.terms.get)}`
          : reply
            ? `${MARK_GLYPH.decline} Declines`
            : accept && !accept.can
              ? `${MARK_GLYPH.cantPay} ${accept.reasons[0]}`
              : holdsWords(G, seat, offer.terms.get);
        return (
          <div className={`trade-row is-${mark}`} key={seat}>
            <Glaze seat={seat} size="sm" />
            <span className="body body-sm trade-row-words">
              <b className="name">{name}</b>
              {status ? (
                <span>
                  <Prose links={false}>{status}</Prose>
                </span>
              ) : null}
            </span>
            {accept ? (
              <span className="trade-row-acts">
                <button
                  aria-label={`${name} declines`}
                  className="btn kicker"
                  onClick={() => moves.tradeAnswer(seat, offer.id, { kind: "decline" })}
                  type="button"
                >
                  Decline
                </button>
                <button
                  aria-label={`${name} counters`}
                  className="btn kicker"
                  onClick={() => onCounter(seat)}
                  type="button"
                >
                  Counter
                </button>
                <ActionButton
                  aria-label={`${name} accepts`}
                  blockedReason={accept.reasons.join(" ")}
                  className="btn kicker is-primary"
                  enabled={accept.can}
                  heading={`${name} accepts`}
                  onClick={() => {
                    pick(
                      {
                        seat,
                        partner: owner,
                        gives: theirs.gives.pops,
                        gets: theirs.gets.pops,
                      },
                      (places) => moves.tradeAnswer(seat, offer.id, { kind: "accept", places }),
                    );
                    onClose();
                  }}
                >
                  Accept
                </ActionButton>
              </span>
            ) : null}
            {take && counter && ownSides ? (
              <ActionButton
                blockedReason={take.reasons.join(" ")}
                className="btn kicker"
                enabled={take.can}
                heading="Take counter"
                onClick={() => {
                  pick(
                    {
                      seat: owner,
                      partner: seat,
                      gives: ownSides.gives.pops,
                      gets: ownSides.gets.pops,
                      places: offer.places,
                    },
                    (places) => moves.tradeSettle(owner, offer.id, seat, places),
                  );
                  onClose();
                }}
              >
                Take counter
              </ActionButton>
            ) : null}
          </div>
        );
      })}
      {ownerPlays ? (
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
      ) : null}
    </div>
  );
}

/** An open offer: the terms from the offering seat's side, and every named seat's
 *  answer at once. A counter takes the card over, in place, until it is sent. */
export function OfferCard({ offer, onClose }: { offer: TradeOffer; onClose: () => void }) {
  const { G } = useGameUi();
  const [countering, setCountering] = useState<PlayerId | null>(null);
  const counterSeat =
    countering && offer.to.includes(countering) && !offer.answers[countering] ? countering : null;

  return (
    <section aria-label={offerTitle(G, offer)} className="trade-card">
      <CardHead
        caption="Every seat sees it"
        kicker={offer.toTable ? "On the table" : "To chosen seats"}
        onClose={onClose}
        seat={offer.from}
        title={offerTitle(G, offer)}
      />
      {counterSeat ? (
        <Counter
          key={counterSeat}
          offer={offer}
          onBack={() => setCountering(null)}
          seat={counterSeat}
        />
      ) : (
        <>
          <Exchange
            G={G}
            actor={offer.from}
            named
            others={offer.to}
            sides={{ gives: offer.terms.give, gets: offer.terms.get }}
          />
          <Answers offer={offer} onClose={onClose} onCounter={setCountering} />
        </>
      )}
    </section>
  );
}
