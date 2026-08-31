import { GLYPHS, type GlyphId, type GlyphShape } from "./glyphs";
import { glyphPlaceholder } from "./placeholders";

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
  /**
   * A raster to draw instead of the glyph. Callers pass one only where the glyph
   * set folds two ideas into one picture and a placeholder tells them apart
   * (`placeholders.ts`); the glyph stays the fallback and the meaning.
   */
  src?: string;
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

export function Icon({ glyph, size = "inline", className, label, src }: IconProps) {
  const classes = ["icon", SIZE_CLASS[size], className].filter(Boolean).join(" ");
  const raster = src ?? glyphPlaceholder(glyph);

  if (raster) {
    return (
      <img
        className={classes}
        src={raster}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        draggable={false}
      />
    );
  }

  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <GlyphMarks glyph={glyph} />
    </svg>
  );
}

/**
 * A glyph's marks with no `<svg>` around them, on the raw 24-unit grid.
 *
 * For the one case `Icon` cannot serve: an icon drawn INSIDE another drawing,
 * where the caller already owns a coordinate system (the season dial's wedges).
 * A nested `<svg>` sizes itself from geometry attributes rather than from the
 * `.icon` classes, so it arrives at 100% of its parent; the caller supplies its
 * own transform and stroke instead.
 */
export function GlyphMarks({ glyph }: { glyph: GlyphId }) {
  return <>{(GLYPHS[glyph] as readonly GlyphShape[]).map(renderShape)}</>;
}
