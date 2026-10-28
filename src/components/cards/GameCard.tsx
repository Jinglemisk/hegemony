import type { ReactNode } from "react";
import type { CardFace, CardMark, CardSize, EqRow, EqToken } from "../../ui/cardFace";
import { rasterIcon } from "../../ui/icons/placeholders";

/**
 * Every card in the game, printed one way (`cardFace.ts` builds the face): the band in
 * its deck's colour with the kind and reach corners, the picture window, the name and
 * its voice, the black-glaze panel with the icon equation over the sentence, and the
 * timing and duration corners at the foot.
 *
 * Three sizes. `ceremony` shows everything; `hand` drops the voice and prints the
 * sentence for screen readers only (callers put it in the card's tooltip); `mini` is
 * the band's kind mark over the picture, a decoration beside a name printed elsewhere.
 *
 * A drawn card can arrive on its back (`back`) and turn over when `faceUp`, or be laid
 * down face up (`arrive="deal"`). With reduced motion it is the finished card on the
 * first frame.
 */
export function GameCard({
  face,
  size = "ceremony",
  titleId,
  className,
  back,
  faceUp = true,
  arrive,
  onTurn,
}: {
  face: CardFace;
  size?: CardSize;
  /** The name's id, for a dialog labelled by its card. */
  titleId?: string;
  /** A state around the face: `is-picked`, `is-dim`, `is-new`. The face never changes. */
  className?: string;
  /** The back's mark: the year's numeral. Without it the back wears the kind's icon. */
  back?: ReactNode;
  faceUp?: boolean;
  arrive?: "turn" | "deal";
  /** Turn a card still on its back. */
  onTurn?: () => void;
}) {
  const ceremony = size === "ceremony";
  const classes = [
    "gc",
    `gc-${size}`,
    `deck-${face.deck}`,
    arrive ? `arrive-${arrive}` : null,
    faceUp ? null : "is-back",
    className,
  ];
  const Name = ceremony ? "h2" : "span";

  return (
    <div
      aria-hidden={size === "mini" ? true : undefined}
      className={classes.filter(Boolean).join(" ")}
    >
      <div className="gc-flip">
        <div aria-hidden={faceUp ? undefined : true} className="gc-face">
          <div className="gc-band">
            <Corner mark={face.kind} />
            <span className="gc-word label">{face.band}</span>
            <Corner mark={face.reach} />
          </div>
          <div className="gc-window">
            {"painting" in face.art ? (
              <img alt="" className="gc-painting" src={face.art.painting} />
            ) : (
              <img alt="" className="gc-plate" src={rasterIcon(face.art.icon)} />
            )}
          </div>
          <div className="gc-words">
            <Name className={`gc-name ${ceremony ? "display" : "title"}`} id={titleId}>
              {face.name}
            </Name>
            {/* At ceremony size the voice's two lines are held even when a card has none,
                so every card's panel starts at the same place. */}
            {ceremony ? (
              <span aria-hidden={face.voice ? undefined : true} className="gc-voice body-em">
                {face.voice ? `“${face.voice}”` : null}
              </span>
            ) : null}
            <i className="gc-rule" />
          </div>
          <div className="gc-panel">
            <Equation equation={face.equation} size={size} />
            <span className={`gc-text body body-sm${ceremony ? "" : " visuallyHidden"}`}>
              {face.sentence}
            </span>
          </div>
          <div className="gc-foot">
            <Corner mark={face.timing} />
            <i className="gc-key" />
            <Corner mark={face.duration} />
          </div>
        </div>
        {back !== undefined || arrive === "turn" ? (
          <div aria-hidden="true" className="gc-back">
            <span className="gc-ring">
              {back ?? (face.kind.icon ? <img alt="" src={rasterIcon(face.kind.icon)} /> : null)}
            </span>
          </div>
        ) : null}
      </div>
      {faceUp ? null : (
        <button
          aria-label="Turn the card over"
          className="gc-turn"
          onClick={onTurn}
          type="button"
        />
      )}
    </div>
  );
}

/** A corner mark: its word is its accessible name and its hover title. */
function Corner({ mark }: { mark: CardMark }) {
  return (
    <span aria-label={mark.label} className="gc-corner" role="img" title={mark.label}>
      {mark.icon ? (
        <img alt="" src={rasterIcon(mark.icon)} />
      ) : (
        <span className="gc-corner-text stat">{mark.text}</span>
      )}
    </span>
  );
}

/** The effect in icons. Hidden from screen readers: the sentence under it is read. */
function Equation({ equation, size }: { equation: CardFace["equation"]; size: CardSize }) {
  const numeral = size === "ceremony" ? "stat-lg" : "stat";
  const row = (line: EqRow, index: number) => (
    <span className={`gc-row${line.tone ? ` is-${line.tone}` : ""}`} key={index}>
      {line.tokens.map((token, at) => (
        <Token key={at} numeral={numeral} token={token} />
      ))}
    </span>
  );
  return (
    <span aria-hidden="true" className="gc-eq">
      {equation.rows.map(row)}
      {equation.but.length ? (
        <>
          <span className="gc-but label">but</span>
          {equation.but.map(row)}
        </>
      ) : null}
    </span>
  );
}

function Token({ token, numeral }: { token: EqToken; numeral: string }) {
  if ("icon" in token)
    return (
      <span className={`gc-ic${token.struck ? " is-struck" : ""}`}>
        <img alt="" src={rasterIcon(token.icon)} />
      </span>
    );
  if ("n" in token) return <span className={`gc-n ${numeral}`}>{token.n}</span>;
  if ("op" in token) return <span className={`gc-op ${numeral}`}>{token.op}</span>;
  return <span className="gc-cond label">{token.cond}</span>;
}
