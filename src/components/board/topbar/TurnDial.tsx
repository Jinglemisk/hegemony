import { useEffect, useRef, useState } from "react";
import { SEASONS, seasonName, yearOf } from "../../../game/rules";
import type { HegemonyState, PlayerId } from "../../../game/types";
import { toRoman } from "../../../ui/formatters";
import { SEASON_GLYPHS } from "../../../ui/iconRegistry";
import { GLYPHS } from "../../../ui/icons/glyphs";
import { GlyphMarks } from "../../../ui/icons/Icon";
import { PLAYER_GLAZES } from "../../../ui/playerGlazes";

/**
 * The turn dial: one large disc set into the middle of the resource spine, with
 * the stockpiles reading out to either side of it.
 *
 * It replaced the two discs that used to protrude from the bottom corners — a
 * season clock at bottom left and an END TURN seal at bottom right. Both were
 * right in spirit and wrong in position: they were the two biggest objects in
 * the chrome, they sat where the board's own corners want to be, and between
 * them they cost about 260px of sea to say two things that belong together
 * anyway. Whose turn it is and how far the year has run are the same question.
 *
 * It reads three ways at once, outside in:
 *
 *   · the **outer arc** is how much of the whole game is spent
 *   · the **season ring** is the four seasons, each in its own quarter with its
 *     own emblem, turned so the season you are in sits at the BOTTOM under a
 *     fixed needle
 *   · the **hub** is whose turn it is — the acting seat's blazon in its glaze,
 *     or, when that seat is yours, an hourglass you press and hold to commit
 *
 * The ring turns and the needle is fixed, which is the opposite of what a clock
 * does and the opposite of what this dial did in the corner. It is right HERE
 * because the dial hangs off the top of the screen: its upper half is against the
 * bar and its lower half is the half you actually look at, so the one moving part
 * has to live down there. The reason a turning face was wrong before
 * (QA-SHELL-4) was that a season in a fixed place says nothing and the wedges had
 * nothing else in them to read — they carry their own emblems now, so each
 * quarter names itself wherever it has been turned to.
 *
 * Nothing here is written out. The ring says which season without the word, the
 * arc says how late it is without a count, and the year is already printed on
 * the omen slip at the other end of the bar. The full sentence is in the
 * accessible name, where a reader that needs it will find it.
 */

const SIZE = 128;
const CENTER = SIZE / 2;
const SEASON_COUNT = SEASONS.length;
const SEASON_SWEEP = 360 / SEASON_COUNT;
/** The middle of a season's quarter, clockwise from twelve, before the ring is
 *  turned. */
const seasonAngle = (index: number) => index * SEASON_SWEEP + SEASON_SWEEP / 2;
/** Six o'clock: where the needle stands and where the ring brings the season you
 *  are in. */
const NEEDLE_ANGLE = 180;
/** Where a wedge's emblem sits, and how big it is drawn in dial units. */
const EMBLEM_RADIUS = 36;
const EMBLEM_SIZE = 14;
/** How long the commit has to be held. Long enough that a stray click cannot
 *  spend a turn, short enough that a deliberate press never feels stuck. */
const HOLD_MS = 620;

const HOURGLASS = GLYPHS.hourglass.map((shape) => (shape.kind === "path" ? shape.d : "")).join(" ");

/** A point on a circle, measured clockwise from twelve o'clock. */
function polar(radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;

  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

/** An arc from twelve o'clock clockwise through `degrees`. */
function progressArc(radius: number, degrees: number): string {
  // A full sweep cannot be drawn as one arc — 360° puts the end point back on the
  // start and the renderer draws nothing at all. Stop a hair short.
  const swept = Math.min(degrees, 359.9);
  const start = polar(radius, 0);
  const end = polar(radius, swept);
  const largeArc = swept > 180 ? 1 : 0;

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** One season's quarter of the ring, drawn at twelve and rotated into place. */
function seasonSector(outer: number, inner: number): string {
  const outerStart = polar(outer, 0);
  const outerEnd = polar(outer, 90);
  const innerEnd = polar(inner, 90);
  const innerStart = polar(inner, 0);

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 0 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/**
 * Press-and-hold, as a fraction of the way there.
 *
 * Ending a turn is the one move that cannot be taken back, and it used to be one
 * click on the largest target on screen. A hold is the cheapest confirmation
 * there is: it costs a deliberate half-second and it needs no dialog to dismiss.
 *
 * It runs off `requestAnimationFrame` rather than a timeout so the ring fills at
 * the real elapsed rate — a timeout would have to guess the frame budget, and a
 * fill that lags the finger reads as a control that is not listening.
 */
function useHoldToCommit(onCommit: () => void, enabled: boolean) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const held = useRef(false);

  const cancel = () => {
    held.current = false;

    if (frame.current !== null) {
      window.cancelAnimationFrame(frame.current);
      frame.current = null;
    }

    setProgress(0);
  };

  useEffect(() => cancel, []);

  // A press that survives while the control is being disabled out from under it
  // (the turn passes, an event lands) must not go on filling toward a commit
  // that is no longer legal.
  useEffect(() => {
    if (!enabled) {
      cancel();
    }
  }, [enabled]);

  const begin = () => {
    if (!enabled || held.current) {
      return;
    }

    held.current = true;
    const startedAt = performance.now();

    const step = () => {
      if (!held.current) {
        return;
      }

      const ratio = Math.min(1, (performance.now() - startedAt) / HOLD_MS);
      setProgress(ratio);

      if (ratio >= 1) {
        cancel();
        onCommit();
        return;
      }

      frame.current = window.requestAnimationFrame(step);
    };

    frame.current = window.requestAnimationFrame(step);
  };

  return { progress, begin, cancel };
}

export function TurnDial({
  G,
  actingPlayerId,
  canEndTurn,
  onEndTurn,
}: {
  G: HegemonyState;
  /** The seat whose turn it is — not necessarily the seat being viewed. */
  actingPlayerId: PlayerId;
  /** Whether the VIEWER may commit right now (seat, phase and pending events). */
  canEndTurn: boolean;
  onEndTurn: () => void;
}) {
  const year = yearOf(G.season);
  const season = seasonName(G.season);
  const seasonIndex = SEASONS.indexOf(season);
  const remaining = G.seasonalDrawPile.length;
  // The game runs until the seasonal deck is spent, so the deck IS the length of
  // the game: what is played plus what is left. No configured maximum to read.
  const total = Math.max(1, G.season + remaining);
  const spent = Math.min(G.season, total);
  const acting = PLAYER_GLAZES[actingPlayerId];

  const { progress, begin, cancel } = useHoldToCommit(onEndTurn, canEndTurn);

  // Turn the whole ring so the current season's quarter arrives under the needle.
  const wheelTurn = NEEDLE_ANGLE - seasonAngle(seasonIndex);
  const needle = polar(58, NEEDLE_ANGLE);
  const needleInner = polar(44, NEEDLE_ANGLE);
  const calendar = `Year ${toRoman(year)}, ${season}. ${remaining} season${remaining === 1 ? "" : "s"} remain.`;

  const face = (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <circle className="dialFace" cx={CENTER} cy={CENTER} r={60} />
      <circle className="dialTrack" cx={CENTER} cy={CENTER} r={52} />

      <g className="dialTicks">
        {Array.from({ length: 8 }, (_, index) => {
          const outer = polar(58, index * 45);
          const inner = polar(50, index * 45);

          return <line key={index} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} />;
        })}
      </g>

      <path className="dialProgress" d={progressArc(52, (spent / total) * 360)} />

      {SEASONS.map((name, index) => (
        <path
          className={`dialSeason dialSeason-${name}${index === seasonIndex ? " isNow" : ""}`}
          d={seasonSector(46, 30)}
          key={name}
          transform={`rotate(${index * SEASON_SWEEP + wheelTurn} ${CENTER} ${CENTER})`}
        />
      ))}

      {/* The emblems are placed, never rotated: a leaf on its side is a different
          picture, and the whole reason the quarters are legible is that each one
          shows its own season the right way up. */}
      {SEASONS.map((name, index) => {
        const at = polar(EMBLEM_RADIUS, seasonAngle(index) + wheelTurn);

        return (
          <g
            className={`dialSeasonMark${index === seasonIndex ? " isNow" : ""}`}
            key={name}
            transform={`translate(${(at.x - EMBLEM_SIZE / 2).toFixed(2)} ${(at.y - EMBLEM_SIZE / 2).toFixed(2)}) scale(${(EMBLEM_SIZE / 24).toFixed(4)})`}
          >
            <GlyphMarks glyph={SEASON_GLYPHS[name]} />
          </g>
        );
      })}

      {/* The needle is fixed at six o'clock; the ring brings the season to it. */}
      <path
        className="dialNeedle"
        d={`M ${needleInner.x.toFixed(2)} ${needleInner.y.toFixed(2)} L ${(needle.x + 5).toFixed(2)} ${(needle.y - 4).toFixed(2)} L ${(needle.x - 5).toFixed(2)} ${(needle.y - 4).toFixed(2)} Z`}
      />

      {canEndTurn ? (
        <>
          <circle className="dialHub dialHubLive" cx={CENTER} cy={CENTER} r={29} />
          <g className="dialHourglass" transform="translate(50 50) scale(1.16)">
            <path d={HOURGLASS} />
          </g>
          {/* The hold, drawn OUTSIDE the face so it reads as a rite being
              performed on the dial rather than as one more ring in it. */}
          {progress > 0 ? <path className="dialHold" d={progressArc(60, progress * 360)} /> : null}
        </>
      ) : (
        <>
          <circle
            className="dialHub dialHubSeat"
            cx={CENTER}
            cy={CENTER}
            r={29}
            style={{ fill: acting.color }}
          />
          <text className="dialBlazon" x={CENTER} y={CENTER + 11} fontSize={30}>
            {acting.blazon}
          </text>
        </>
      )}
    </svg>
  );

  if (!canEndTurn) {
    return (
      <div className="turnDial" role="img" aria-label={`${acting.name} is acting. ${calendar}`}>
        {face}
      </div>
    );
  }

  return (
    <button
      // The whole dial is drawn art with `aria-hidden` on the svg, so without a
      // label the one irreversible control in the game would have no accessible
      // name at all.
      aria-label={`End turn — press and hold. ${calendar}`}
      className={`turnDial turnDialLive${progress > 0 ? " isHeld" : ""}`}
      onBlur={cancel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          // The browser turns a plain Enter into a click on a <button>; that is
          // exactly the one-press commit the hold exists to prevent.
          event.preventDefault();
          begin();
        }
      }}
      onKeyUp={cancel}
      onPointerCancel={cancel}
      onPointerDown={(event) => {
        // Keep the pointer even if it slides off the disc mid-hold, so a finger
        // that drifts a few pixels does not silently abandon the commit.
        event.currentTarget.setPointerCapture(event.pointerId);
        begin();
      }}
      onPointerUp={cancel}
      type="button"
    >
      {face}
    </button>
  );
}
