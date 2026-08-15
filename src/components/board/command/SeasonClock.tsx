import { memo } from "react";
import { SEASONS, seasonName, yearOf } from "../../../game/rules";
import type { HegemonyState } from "../../../game/types";
import { toRoman } from "../../../ui/formatters";
import { SEASON_GLYPHS } from "../../../ui/iconRegistry";
import { GlyphMarks } from "../../../ui/icons/Icon";

/**
 * The season clock — the left of the two dials that protrude from the bottom
 * rail, mirrored by the END TURN seal on the right.
 *
 * It reads three ways at once, outside in:
 *
 *   · the **outer arc** is how much of the whole game is spent, drawn clockwise
 *     from twelve o'clock with a tick for each eighth
 *   · the **inner annulus** is the four seasons, each in its own quarter with
 *     its own emblem, and a needle that swings to the one you are in
 *   · the **hub** is the year in Roman numerals with the season named beneath
 *
 * The face used to turn under a needle fixed at the top right, which is what
 * made four unlabelled pastel wedges of it (QA-SHELL-4): if the current season
 * is always in the same place, position says nothing, and there was nothing else
 * in a wedge to read. A clock face is fixed and its hand moves. The wedges now
 * hold the four season glyphs the icon set already had and nothing was using, so
 * every quarter names itself and the needle is the only thing that travels.
 *
 * Everything here is derived from `G.season` (a 1-based counter) and the
 * seasonal draw pile. There is no clock state to keep in sync — the calendar
 * helpers own the arithmetic, exactly as they do for the engine.
 */

const SIZE = 128;
const CENTER = SIZE / 2;
const SEASON_COUNT = SEASONS.length;
const SEASON_SWEEP = 360 / SEASON_COUNT;
/** The middle of a season's quarter, clockwise from twelve. */
const seasonAngle = (index: number) => index * SEASON_SWEEP + SEASON_SWEEP / 2;
/** Where a wedge's emblem sits, and how big it is drawn in dial units. */
const EMBLEM_RADIUS = 35;
const EMBLEM_SIZE = 15;

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

/** One season's quarter of the annulus, drawn at twelve and rotated into place. */
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

function SeasonClockComponent({ G }: { G: HegemonyState }) {
  const year = yearOf(G.season);
  const season = seasonName(G.season);
  const seasonIndex = SEASONS.indexOf(season);
  const remaining = G.seasonalDrawPile.length;
  // The game runs until the seasonal deck is spent, so the deck IS the length of
  // the game: what is played plus what is left. No configured maximum to read.
  const total = Math.max(1, G.season + remaining);
  const spent = Math.min(G.season, total);

  const needleAngle = seasonAngle(seasonIndex);
  const needle = polar(60, needleAngle);
  const needleInner = polar(46, needleAngle);

  return (
    <div
      className="dial seasonClock"
      role="img"
      aria-label={`Year ${year}, ${season}. ${remaining} season${remaining === 1 ? "" : "s"} remain.`}
    >
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
            d={seasonSector(46, 24)}
            key={name}
            transform={`rotate(${index * SEASON_SWEEP} ${CENTER} ${CENTER})`}
          />
        ))}

        {/* The emblems are placed, never rotated: a leaf on its side is a
            different picture, and the whole reason the wedges are legible now is
            that each one shows its own season the right way up. */}
        {SEASONS.map((name, index) => {
          const at = polar(EMBLEM_RADIUS, seasonAngle(index));

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

        {/* The face is fixed. The needle swings to the season you are in. */}
        <path
          className="dialNeedle"
          d={`M ${needleInner.x.toFixed(2)} ${needleInner.y.toFixed(2)} L ${(needle.x + 5).toFixed(2)} ${(needle.y + 4).toFixed(2)} L ${(needle.x - 4).toFixed(2)} ${(needle.y - 5).toFixed(2)} Z`}
        />

        <circle className="dialHub" cx={CENTER} cy={CENTER} r={23} />
        <text className="dialYear" x={CENTER} y={CENTER + 3} fontSize={21} textAnchor="middle">
          {toRoman(year)}
        </text>
        <text
          className="dialSeasonName"
          x={CENTER}
          y={CENTER + 15}
          fontSize={7}
          textAnchor="middle"
        >
          {season.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

export const SeasonClock = memo(SeasonClockComponent);
