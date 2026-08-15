import { GLYPHS } from "../../../ui/icons/glyphs";

/**
 * The END TURN seal — the right of the two dials, and the only clay disc on the
 * table. It replaces the dark-red square, which read as one more verb among
 * seven; a seal is a different KIND of object, which is what committing a turn
 * actually is.
 *
 * Vase-black and clay are reserved for objects like this one. The bars around it
 * are bone; nothing else down here is a filled mass, so the eye finds it without
 * being shouted at.
 */

const SIZE = 128;
const CENTER = SIZE / 2;

/** The hourglass, borrowed straight from the glyph table and scaled onto the
 *  seal, so the commit wears the same hand as every other icon in the game. */
const HOURGLASS = GLYPHS.hourglass.map((shape) => (shape.kind === "path" ? shape.d : "")).join(" ");

export function EndTurnSeal({
  actingName,
  disabled,
  onClick,
}: {
  actingName: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-disabled={disabled}
      className={`dial turnSeal${disabled ? " turnSealOff" : ""}`}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <defs>
          {/* The one gradient in the UI. A fired disc catches light at the top;
              flat clay here read as a sticker rather than a pressed seal. */}
          <linearGradient id="turnSealClay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="turnSealClayTop" />
            <stop offset="0.55" className="turnSealClayMid" />
            <stop offset="1" className="turnSealClayLow" />
          </linearGradient>
        </defs>

        <circle className="dialFace" cx={CENTER} cy={CENTER} r={60} />
        <circle className="turnSealBody" cx={CENTER} cy={CENTER} r={53} />
        {/* The beaded ring: a dashed stroke, which is what a seal's milled edge
            is, and it costs one attribute instead of forty little circles. */}
        <circle className="turnSealBeads" cx={CENTER} cy={CENTER} r={47} />
        <circle className="turnSealKeyline" cx={CENTER} cy={CENTER} r={40} />

        <g className="turnSealGlyph" transform="translate(52 30) scale(0.85)">
          <path d={HOURGLASS} />
        </g>

        <text
          className="turnSealLabel"
          x={CENTER}
          y={CENTER + 8}
          fontSize={12.5}
          textAnchor="middle"
        >
          END TURN
        </text>
        <text
          className="turnSealActor"
          x={CENTER}
          y={CENTER + 22}
          fontSize={6.5}
          textAnchor="middle"
        >
          {actingName.toUpperCase()} ACTS
        </text>
      </svg>
    </button>
  );
}
