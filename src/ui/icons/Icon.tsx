import { GLYPHS, type GlyphId, type GlyphShape } from "./glyphs";

/**
 * The one component that draws a glyph. Everything else in the UI asks for an
 * icon by name and gets a consistent line at a consistent weight.
 *
 * Three sizes, and they are the only three: inline beside text, on a verb, and
 * on a rail. A fourth size always turns out to be someone eyeballing a layout,
 * and it is how a set stops looking drawn by one hand.
 */
export type IconSize = "inline" | "verb" | "rail";

const SIZE_CLASS: Record<IconSize, string> = {
  inline: "icon-inline",
  verb: "icon-verb",
  rail: "icon-rail",
};

export type IconProps = {
  glyph: GlyphId;
  size?: IconSize;
  className?: string;
  /**
   * An icon is decoration by default — the text beside it already says what it
   * is, and a screen reader announcing both reads everything twice. Pass a label
   * only where the glyph is the ONLY carrier of meaning (a bare icon button).
   */
  label?: string;
};

function renderShape(shape: GlyphShape, index: number) {
  const solidProps = "solid" in shape && shape.solid ? { className: "icon-solid" } : {};

  switch (shape.kind) {
    case "path":
      return <path key={index} d={shape.d} {...solidProps} />;
    case "circle":
      return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} {...solidProps} />;
    case "rect":
      return <rect key={index} x={shape.x} y={shape.y} width={shape.w} height={shape.h} />;
  }
}

export function Icon({ glyph, size = "inline", className, label }: IconProps) {
  const classes = ["icon", SIZE_CLASS[size], className].filter(Boolean).join(" ");

  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {(GLYPHS[glyph] as readonly GlyphShape[]).map(renderShape)}
    </svg>
  );
}
